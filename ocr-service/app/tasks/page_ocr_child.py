import argparse
import json
import os
from pathlib import Path

# 限制 Paddle CUDA allocator，避免 OCR 抢占整张显卡导致桌面卡死。
# 必须在导入 Paddle/PaddleOCR 前设置。
os.environ.setdefault(
    "FLAGS_fraction_of_gpu_memory_to_use",
    os.getenv("OCR_GPU_MEMORY_FRACTION", "0.35"),
)
os.environ.setdefault("FLAGS_allocator_strategy", "auto_growth")
os.environ.setdefault("FLAGS_eager_delete_tensor_gb", "0.5")

import pymupdf

from app.core.config import ocr_config


def render_scale(page: pymupdf.Page) -> float:
    width = float(page.rect.width)
    height = float(page.rect.height)
    preferred = 2.0
    by_side = ocr_config.source_max_side / max(width, height)
    by_pixels = (ocr_config.source_max_pixels / (width * height)) ** 0.5
    return max(0.5, min(preferred, by_side, by_pixels))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--page", required=True, type=int)
    parser.add_argument("--ocr-type", required=True, choices=("ancient", "normal"))
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    document = pymupdf.open(args.pdf)
    try:
        page = document.load_page(args.page - 1)
        scale = render_scale(page)
        pixmap = page.get_pixmap(
            matrix=pymupdf.Matrix(scale, scale),
            alpha=False,
            colorspace=pymupdf.csRGB,
        )
        image_path = Path(args.output).with_suffix(".png")
        pixmap.save(image_path)
        try:
            if args.ocr_type == "ancient":
                from app.engines.ancient_ocr import ancient_ocr_engine
                result = ancient_ocr_engine.recognize(str(image_path))
            else:
                from app.engines.normal_ocr import ocr_engine
                result = ocr_engine.recognize(str(image_path))
            result["renderScale"] = scale
            temp_output = Path(args.output + ".tmp")
            temp_output.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
            os.replace(temp_output, args.output)
        finally:
            image_path.unlink(missing_ok=True)
    finally:
        document.close()


if __name__ == "__main__":
    main()
