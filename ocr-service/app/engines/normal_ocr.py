from typing import Any

from paddleocr import PaddleOCR


class OcrEngine:
    def __init__(self, device: str = "cpu") -> None:
        self.engine = PaddleOCR(
            lang="ch",
            # Paddle 3.3.x 在 Windows CPU 的 oneDNN 执行路径中，部分模型
            # 属性暂时无法从 PIR 转换，推理时会抛出 NotImplementedError。
            # 关闭 oneDNN，改用普通 Paddle CPU 推理路径以保证兼容性。
            enable_mkldnn=False,
            device=device,
        )

    def recognize(self, image_path: str) -> dict[str, Any]:
        results = self.engine.predict(image_path)

        items: list[dict[str, Any]] = []
        raw_results: list[dict[str, Any]] = []

        for result in results:
            data = result.json

            if callable(data):
                data = data()

            if isinstance(data, dict):
                raw_results.append(data)

            # PaddleOCR 3.7 的 result.json 会把识别结果放在 res 中；
            # 同时兼容旧版本直接返回识别字段的结构。
            recognition = data.get("res", data)

            texts = recognition.get("rec_texts", [])
            scores = recognition.get("rec_scores", [])
            boxes = recognition.get("rec_polys", [])

            for index, text in enumerate(texts):
                score = (
                    float(scores[index])
                    if index < len(scores)
                    else 0.0
                )

                box = (
                    boxes[index].tolist()
                    if index < len(boxes)
                    and hasattr(boxes[index], "tolist")
                    else boxes[index]
                    if index < len(boxes)
                    else []
                )

                items.append(
                    {
                        "text": str(text),
                        "score": score,
                        "box": box,
                    }
                )

        full_text = "\n".join(
            item["text"]
            for item in items
            if item["text"].strip()
        )

        return {
            "text": full_text,
            "items": items,
            "raw": {
                "results": raw_results,
            },
        }


import os

ocr_engine = OcrEngine(device=os.getenv("OCR_DEVICE", "cpu"))
