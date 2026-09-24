"""Load project defaults before the API or OCR child imports its configuration."""

import json
import os
from pathlib import Path

_config_path = Path(__file__).resolve().parent.parent / "ocr-config.json"
if _config_path.is_file():
    with _config_path.open(encoding="utf-8") as _config_file:
        _settings = json.load(_config_file)
    if not isinstance(_settings, dict):
        raise ValueError("ocr-config.json must contain a JSON object")
    for _key, _value in _settings.items():
        if not _key.startswith(("OCR_", "PDF_PAGE_")) or not isinstance(_value, (str, int, float)):
            raise ValueError(f"Invalid OCR configuration entry: {_key}")
        os.environ.setdefault(_key, str(_value))
