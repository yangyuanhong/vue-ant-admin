from fastapi import APIRouter

from app.schemas import HealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        service="ocr-service",
        paddle_version=__import__("paddle").__version__,
        paddleocr_version=__import__("paddleocr").__version__,
    )
