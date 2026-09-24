from typing import Any

import numpy as np
from PIL import Image, ImageFilter


def prepare_for_ocr(image: Image.Image) -> Image.Image:
    """去除朱印、校正纸张底色，温和抑制浅色透字并过滤外围长边框。"""
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8).copy()
    red, green, blue = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    stamp = ((red >= 105) & (red - green >= 35) & (red - blue >= 35)
             & (green * 100 <= red * 72))
    rgb[stamp] = 255
    gray_image = Image.fromarray(rgb).convert("L")
    gray = np.asarray(gray_image, dtype=np.float32)
    # 在小图上估计背景，避免全尺寸模糊额外占用大量内存。
    small = gray_image.copy()
    small.thumbnail((256, 256))
    background = small.filter(ImageFilter.GaussianBlur(8)).resize(gray_image.size)
    level = np.asarray(background, dtype=np.float32)
    normalized = np.clip(gray * 245.0 / np.maximum(level, 1), 0, 255)
    # 保持灰度，不用硬二值化，以免把淡墨正文一起删除。
    normalized = 255.0 * np.power(normalized / 255.0, 0.85)
    dark = normalized < 100
    height, width = dark.shape
    # 仅去除外围贯穿大部分页面的细线；不删除整块文字区域。
    for axis, size in ((0, width), (1, height)):
        coverage = dark.mean(axis=axis)
        positions = np.arange(size)
        edge = (positions < size * 0.10) | (positions > size * 0.90)
        candidates = np.flatnonzero((coverage > 0.85) & edge)
        for group in np.split(candidates, np.flatnonzero(np.diff(candidates) > 1) + 1):
            if 0 < len(group) <= max(3, int(size * 0.008)):
                if axis == 0:
                    normalized[:, group] = 255
                else:
                    normalized[group, :] = 255
    return Image.fromarray(normalized.astype(np.uint8)).convert("RGB")


def crop_polygon_with_padding(
    image_array: np.ndarray,
    polygon: Any,
    *,
    padding_ratio: float = 0.06,
    min_padding: int = 4,
) -> np.ndarray | None:
    """按检测框裁剪，并保留少量边缘，避免切掉古籍字的外沿笔画。"""
    points = np.asarray(polygon, dtype=np.float32)
    if points.ndim != 2 or points.shape[0] < 3 or points.shape[1] < 2:
        return None

    box_width = float(points[:, 0].max() - points[:, 0].min())
    box_height = float(points[:, 1].max() - points[:, 1].min())
    padding = max(
        int(round(min(box_width, box_height) * padding_ratio)),
        min_padding,
    )

    min_x = max(int(np.floor(points[:, 0].min())) - padding, 0)
    max_x = min(int(np.ceil(points[:, 0].max())) + padding, image_array.shape[1])
    min_y = max(int(np.floor(points[:, 1].min())) - padding, 0)
    max_y = min(int(np.ceil(points[:, 1].max())) + padding, image_array.shape[0])

    if max_x <= min_x or max_y <= min_y:
        return None

    crop = image_array[min_y:max_y, min_x:max_x]
    return crop if crop.size else None


def is_red_stamp(
    crop_bgr: np.ndarray,
    *,
    min_red_ratio: float = 0.08,
) -> bool:
    """判断检测区域是否主要来自红色藏书印，而不是黑色正文。"""
    if crop_bgr.size == 0 or crop_bgr.ndim != 3 or crop_bgr.shape[2] < 3:
        return False

    blue = crop_bgr[:, :, 0].astype(np.int16)
    green = crop_bgr[:, :, 1].astype(np.int16)
    red = crop_bgr[:, :, 2].astype(np.int16)

    red_pixels = (
        (red >= 105)
        & (red - green >= 35)
        & (red - blue >= 35)
        # 泛黄纸张同样会呈现 R > G > B；真正的朱印中绿色占比
        # 明显更低。这个比例条件用于排除黄纸背景。
        & (green * 100 <= red * 72)
    )
    return float(red_pixels.mean()) >= min_red_ratio
