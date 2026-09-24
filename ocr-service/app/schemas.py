from typing import Any
from pydantic import BaseModel

class HealthResponse(BaseModel):
  ok: bool
  service: str
  paddle_version: str
  paddleocr_version: str

class OcrItem(BaseModel):
  text: str
  score: float
  box: list[list[float]]

class OcrResponse(BaseModel):
  ok: bool
  filename: str
  text: str
  items: list[OcrItem]
  raw: dict[str, Any] | None = None