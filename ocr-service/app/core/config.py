import os
from dataclasses import dataclass


@dataclass(frozen=True)
class OcrConfig:
    device: str = os.getenv("OCR_DEVICE", "gpu:0")
    detection_max_side: int = int(os.getenv("OCR_DETECTION_MAX_SIDE", "3200"))
    source_max_side: int = int(os.getenv("OCR_SOURCE_MAX_SIDE", "4500"))
    source_max_pixels: int = int(os.getenv("OCR_SOURCE_MAX_PIXELS", "30000000"))
    page_timeout_seconds: float = float(os.getenv("PDF_PAGE_OCR_TIMEOUT_SECONDS", "900"))
    page_max_attempts: int = int(os.getenv("PDF_PAGE_MAX_ATTEMPTS", "2"))


ocr_config = OcrConfig()
