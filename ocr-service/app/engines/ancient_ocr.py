import os
from typing import Any

import numpy as np
from PIL import Image
from paddleocr import TextDetection, TextRecognition

from app.processing.ancient_image import (
    crop_polygon_with_padding,
    is_red_stamp,
    prepare_for_ocr,
)
from app.processing.ancient_text import (
    normalize_ancient_page_text,
    normalize_ancient_text,
)


DETECTION_THRESHOLD = 0.35 # 提高后，会减少非常淡的透印和背景噪声
DETECTION_BOX_THRESHOLD = 0.50 # 提高后，会减少边框、印章、页码等低质量检测框
DETECTION_UNCLIP_RATIO = 1.20 # 从 1.30 降到 1.20，可以减少检测框向周围膨胀、粘连其他区域。
MIN_RECOGNITION_SCORE = 0.45

CROP_PADDING_RATIO = 0.06
MIN_CROP_PADDING = 4


class AncientOcrEngine:
    """
    古籍竖排 OCR 引擎。

    处理流程：

    1. 读取原始图片
    2. 图片逆时针旋转 90 度
    3. 使用 PaddleOCR 检测和识别
    4. 把识别框坐标映射回原图
    5. 按古籍从右到左的顺序排序
    """

    def __init__(self, device: str = "cpu") -> None:
        print("[AncientOCR] 正在初始化古籍 OCR 模型...")

        self.detector = TextDetection(
            model_name="PP-OCRv5_server_det",
            limit_side_len=64,
            limit_type="min",
            thresh=DETECTION_THRESHOLD,
            box_thresh=DETECTION_BOX_THRESHOLD,
            unclip_ratio=DETECTION_UNCLIP_RATIO,
            device=device,
            # Windows CPU 下关闭 oneDNN，规避 Paddle PIR 属性转换兼容问题。
            enable_mkldnn=False,
        )

        self.recognizer = TextRecognition(
            model_name="PP-OCRv5_server_rec",
            device=device,
            # 识别模型也必须关闭 oneDNN，否则会在 predict 阶段报错。
            enable_mkldnn=False,
        )

        print("[AncientOCR] 古籍 OCR 模型初始化完成")

    def crop_rotated_box(
        self,
        image_array: np.ndarray,
        polygon: Any,
    ) -> np.ndarray | None:
        """
        从旋转后的图片中裁剪一个文字框。

        因为古籍已经旋转成横排，
        所以这里的文字框通常是横向长条。
        """

        return crop_polygon_with_padding(
            image_array,
            polygon,
            padding_ratio=CROP_PADDING_RATIO,
            min_padding=MIN_CROP_PADDING,
        )

    def rotate_image(self, image: Image.Image) -> Image.Image:
        """
        逆时针旋转 90 度。

        PIL 中 ROTATE_90 表示逆时针 90 度。
        """
        return image.transpose(Image.Transpose.ROTATE_90)

    def map_point_back(
        self,
        x_rotated: float,
        y_rotated: float,
        original_width: int,
        original_height: int,
    ) -> list[float]:
        """
        把逆时针旋转后的图片坐标映射回原始图片坐标。

        旋转后的点：
            (x_rotated, y_rotated)

        原图中的点：
            (original_width - 1 - y_rotated, x_rotated)
        """
        return [
            float(original_width - 1 - y_rotated),
            float(x_rotated),
        ]

    def map_polygon_back(
        self,
        polygon: Any,
        original_width: int,
        original_height: int,
    ) -> list[list[float]]:
        """
        把一个文字框的四个点映射回原图。
        """
        mapped_points = [
            self.map_point_back(
                float(point[0]),
                float(point[1]),
                original_width,
                original_height,
            )
            for point in polygon
        ]

        # 重新整理成左上、右上、右下、左下
        xs = [point[0] for point in mapped_points]
        ys = [point[1] for point in mapped_points]

        min_x = min(xs)
        max_x = max(xs)
        min_y = min(ys)
        max_y = max(ys)

        return [
            [min_x, min_y],
            [max_x, min_y],
            [max_x, max_y],
            [min_x, max_y],
        ]

    def get_x_center(self, item: dict[str, Any]) -> float:
        """
        计算文字框的横向中心点。
        """
        points = item["box"]
        return sum(point[0] for point in points) / len(points)

    def get_y_top(self, item: dict[str, Any]) -> float:
        """
        计算文字框顶部坐标。
        """
        points = item["box"]
        return min(point[1] for point in points)

    def sort_from_right_to_left(
        self,
        items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        古籍通常从右列读到左列。

        排序规则：

        1. 先按照 x 坐标从右到左排列
        2. 同一列内部按照 y 坐标从上到下排列
        """
        if not items:
            return items

        # 先按照中心点从右到左排序
        sorted_items = sorted(
            items,
            key=lambda item: self.get_x_center(item),
            reverse=True,
        )

        return sorted_items

    def _recognize_single(self, original_image: Image.Image) -> dict[str, Any]:
        """
        识别一张古籍图片。
        """
        original_image = original_image.convert("RGB")
        original_width, original_height = original_image.size

        print(
            "[AncientOCR] 原图尺寸："
            f"{original_width} x {original_height}"
        )

        # 保留彩色图用于识别红色馆藏印；增强图用于检测和文字识别。
        prepared_image = prepare_for_ocr(original_image)
        rotated_color_image = self.rotate_image(original_image)
        rotated_image = self.rotate_image(prepared_image)

        # PaddleOCR 接收 numpy 图片。检测图限制最长边，避免把超大整页
        # 直接送入检测模型；识别裁剪仍来自未缩小的源图。
        rotated_array = np.array(rotated_image)
        rotated_color_array = np.array(rotated_color_image)

        # PIL 是 RGB，PaddleOCR 这里转换成 BGR
        rotated_bgr = rotated_array[:, :, ::-1]
        rotated_color_bgr = rotated_color_array[:, :, ::-1]

        detection_max_side = 3200
        source_height, source_width = rotated_bgr.shape[:2]
        detection_scale = min(
            1.0,
            detection_max_side / max(source_width, source_height),
        )
        if detection_scale < 1.0:
            detection_width = max(1, round(source_width * detection_scale))
            detection_height = max(1, round(source_height * detection_scale))
            detection_image = rotated_image.resize(
                (detection_width, detection_height),
                Image.Resampling.LANCZOS,
            )
            detection_bgr = np.array(detection_image)[:, :, ::-1]
        else:
            detection_bgr = rotated_bgr

        items: list[dict[str, Any]] = []
        raw_results: list[dict[str, Any]] = []
        recognition_crops: list[np.ndarray] = []
        recognition_polygons: list[np.ndarray] = []
        
        # 第一步：只使用检测模型
        detection_results = self.detector.predict(
          input=detection_bgr,
          batch_size=1,
        )

        for detection_result in detection_results:
          data = detection_result.json

          if callable(data):
              data = data()

          if not isinstance(data, dict):
              continue

          raw_results.append(data)

          detection = data.get("res", data)

          polygons = (
              detection.get("dt_polys")
              or detection.get("rec_polys")
              or []
          )

          # 第二步：收集文字列，稍后批量识别，避免每个文字框单独调用模型。
          for detected_polygon in polygons:
              polygon = np.asarray(detected_polygon, dtype=np.float32)
              if detection_scale < 1.0:
                  polygon = polygon / detection_scale
              color_crop = self.crop_rotated_box(
                  rotated_color_bgr,
                  polygon,
              )

              # 红色馆藏印单独排除，不让“哈佛大学汉和图书馆珍藏印”
              # 混入古籍正文。
              if color_crop is not None and is_red_stamp(color_crop):
                  continue

              crop = self.crop_rotated_box(
                  rotated_bgr,
                  polygon,
              )

              if crop is None:
                  continue

              recognition_crops.append(crop)
              recognition_polygons.append(polygon)

        # 第三步：批量识别文字列；Paddle 会在一次 predict 中复用模型。
        if recognition_crops:
            recognition_results = self.recognizer.predict(
                input=recognition_crops,
                batch_size=min(8, len(recognition_crops)),
            )
            for polygon, recognition_result in zip(recognition_polygons, recognition_results):
                recognition_data = recognition_result.json
                if callable(recognition_data):
                    recognition_data = recognition_data()
                recognition = recognition_data.get("res", recognition_data) if isinstance(recognition_data, dict) else {}
                recognized_text = normalize_ancient_text(
                    str(recognition.get("rec_text", ""))
                )

                recognized_score = float(
                    recognition.get("rec_score", 0.0)
                )

                if recognized_score < MIN_RECOGNITION_SCORE:
                    continue

                if not recognized_text.strip():
                    continue
                items.append({
                    "text": recognized_text,
                    "score": recognized_score,
                    "box": self.map_polygon_back(
                        polygon,
                        original_width,
                        original_height,
                    ),
                })

        # 古籍从右到左排序
        items = self.sort_from_right_to_left(items)

        # 过滤空文本，再拼成完整内容
        text_lines = [
            item["text"]
            for item in items
            if item["text"].strip()
        ]

        full_text = normalize_ancient_page_text("\n".join(text_lines))

        print(
            f"[AncientOCR] 识别完成，共检测到 {len(items)} 个文字区域"
        )

        return {
            "text": full_text,
            "items": items,
            "strategy": "rotate90",
            "engine": "PP-OCRv5_server_det + PP-OCRv5_server_rec",
            "raw": {
                "results": raw_results,
            },
        }

    def _detect_gutter(self, image: Image.Image) -> int | None:
        """检测连续的中缝；普通单页返回 None。"""
        gray = np.asarray(image.convert("L"), dtype=np.float32)
        height, width = gray.shape
        if width < 900 or width / max(height, 1) < 1.12:
            return None
        center = width // 2
        radius = max(10, int(width * 0.08))
        start, end = max(1, center - radius), min(width - 1, center + radius)
        # 中缝通常是贯穿大部分页面高度的深色/高梯度窄带。
        dark = (gray < np.percentile(gray, 28)).mean(axis=0)
        gradient = np.abs(np.diff(gray, axis=1)).mean(axis=0)
        baseline = float(np.median(dark[max(0, center - radius):center - 8]))
        baseline = max(baseline, float(np.median(dark[center + 8:center + radius])))
        candidates = np.arange(start, end)
        score = dark[candidates] + 0.002 * gradient[candidates]
        best = int(candidates[int(np.argmax(score))])
        # 连续性和强度门槛，避免把正文竖栏误当成中缝。
        band = gray[:, max(0, best - 3):min(width, best + 4)]
        continuity = (band < np.percentile(gray, 35)).mean(axis=1)
        if float(dark[best]) < max(0.16, baseline * 1.45):
            return None
        if float((continuity > 0.35).mean()) < 0.45:
            return None
        return best

    def recognize(self, image_path: str) -> dict[str, Any]:
        """识别单页或自动拆分的合页扫描图。"""
        image = Image.open(image_path).convert("RGB")
        gutter = self._detect_gutter(image)
        if gutter is None:
            result = self._recognize_single(image)
            result["layout"] = "single-page"
            return result

        # 不丢弃中缝附近的像素，避免裁掉靠近书缝的正文。
        left = image.crop((0, 0, gutter, image.height))
        right = image.crop((gutter, 0, image.width, image.height))
        # 古籍阅读顺序为右页在前、左页在后。
        right_result = self._recognize_single(right)
        left_result = self._recognize_single(left)
        for item in right_result.get("items", []):
            item["box"] = [[x + gutter, y] for x, y in item["box"]]
        text = normalize_ancient_page_text(
            "\n".join(x for x in (right_result.get("text", ""), left_result.get("text", "")) if x)
        )
        items = right_result.get("items", []) + left_result.get("items", [])
        return {
            "text": text,
            "items": items,
            "strategy": "auto-gutter-split",
            "layout": "double-page",
            "gutter": gutter,
            "engine": "PP-OCRv5_server_det + PP-OCRv5_server_rec",
            "raw": {"right": right_result.get("raw", {}), "left": left_result.get("raw", {})},
        }


# 全局只初始化一次模型。
# FastAPI 每次请求直接复用这个对象。
ancient_ocr_engine = AncientOcrEngine(
    device=os.getenv("OCR_DEVICE", "cpu"),
)
