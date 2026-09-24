import asyncio
import json
import os
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import JSONResponse, StreamingResponse
from app.engines.ancient_ocr import ancient_ocr_engine
from app.core.inference import run_locked_inference
from app.engines.normal_ocr import ocr_engine
from app.tasks.pdf_task_repository import InvalidTaskStateError, PdfTaskRepository
from app.schemas import OcrItem, OcrResponse


router = APIRouter(prefix="/ocr", tags=["ocr"])

IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
}

ANCIENT_IMAGE_TYPES = IMAGE_TYPES | {"image/tiff"}


async def _save_upload(file: UploadFile, suffix: str) -> str:
    """分块保存上传文件，返回临时文件路径。"""
    with tempfile.NamedTemporaryFile(
        suffix=suffix,
        delete=False,
    ) as temp_file:
        temp_path = temp_file.name

        while chunk := await file.read(1024 * 1024):
            temp_file.write(chunk)

    return temp_path


def _remove_temp_file(temp_path: str | None) -> None:
    if temp_path and os.path.exists(temp_path):
        os.remove(temp_path)


@router.post("/image", response_model=OcrResponse)
async def recognize_image(file: UploadFile = File(...)) -> OcrResponse:
    if file.content_type not in IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="只支持 JPG、PNG、WEBP 和 BMP 图片",
        )

    temp_path: str | None = None

    try:
        suffix = Path(file.filename or "").suffix.lower() or ".png"
        temp_path = await _save_upload(file, suffix)
        result = await run_locked_inference(
            ocr_engine.recognize,
            temp_path,
        )

        return OcrResponse(
            ok=True,
            filename=file.filename or "unknown",
            text=result["text"],
            items=[OcrItem(**item) for item in result["items"]],
            raw=result["raw"],
        )
    except Exception as error:
        print(f"OCR 识别失败：{type(error).__name__}: {error}")
        raise HTTPException(
            status_code=500,
            detail="OCR 识别失败",
        ) from error
    finally:
        _remove_temp_file(temp_path)
        await file.close()


@router.post("/ancient-image")
async def recognize_ancient_image(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    if file.content_type not in ANCIENT_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="古籍 OCR 只支持 JPG、PNG、WEBP、BMP 和 TIFF 图片",
        )

    original_filename = file.filename or "unknown"
    suffix = Path(original_filename).suffix.lower() or ".png"
    temp_path: str | None = None

    try:
        temp_path = await _save_upload(file, suffix)
        print(f"[AncientOCR] 开始处理上传文件：{original_filename}")

        result = await run_locked_inference(
            ancient_ocr_engine.recognize,
            temp_path,
        )

        return {
            "ok": True,
            "filename": original_filename,
            "engine": result["engine"],
            "strategy": result["strategy"],
            "text": result["text"],
            "items": result["items"],
        }
    except Exception as error:
        print(
            "[AncientOCR] 识别失败："
            f"{type(error).__name__}: {error}"
        )
        raise HTTPException(
            status_code=500,
            detail="古籍 OCR 识别失败",
        ) from error
    finally:
        _remove_temp_file(temp_path)
        await file.close()


@router.post("/pdf/tasks")
async def create_pdf_ocr_task(
    request: Request,
    file: UploadFile = File(...),
    ocr_type: str = "ancient",
) -> JSONResponse:
    """
    创建 PDF OCR 后台任务。

    接口不会等待整份 PDF OCR 完成，
    只负责保存PDF、创建任务并立即返回taskId。
    """

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="只支持 PDF 文件",
        )

    if ocr_type not in {"normal", "ancient"}:
        raise HTTPException(
            status_code=400,
            detail="ocr_type 只能是 normal 或 ancient",
        )

    repository: PdfTaskRepository = request.app.state.pdf_task_repository
    queue = request.app.state.pdf_task_queue
    task_id = str(uuid.uuid4())
    task_dir = request.app.state.pdf_task_files_dir / task_id
    uploading_path = task_dir / "source.pdf.uploading"
    pdf_path = task_dir / "source.pdf"
    size = 0

    try:
        task_dir.mkdir(parents=True, exist_ok=False)
        with uploading_path.open("wb") as pdf_file:
            while chunk := await file.read(1024 * 1024):
                pdf_file.write(chunk)
                size += len(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="PDF 文件不能为空")
        os.replace(uploading_path, pdf_path)
        task = repository.create_task(
            task_id=task_id,
            pdf_path=str(pdf_path),
            filename=file.filename or "unknown.pdf",
            ocr_type=ocr_type,
        )
        snapshot = task.to_public_dict()
        queue.wake()
        return JSONResponse(status_code=202, content=snapshot)
    except HTTPException:
        shutil.rmtree(task_dir, ignore_errors=True)
        raise
    except Exception as error:
        shutil.rmtree(task_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail=f"创建 PDF OCR 任务失败：{error}",
        ) from error
    finally:
        await file.close()


def _task_snapshot(repository: PdfTaskRepository, task_id: str) -> dict[str, Any]:
    task = repository.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="PDF OCR 任务不存在")
    return task.to_public_dict(repository.list_pages(task_id))


@router.get("/pdf/tasks/{task_id}")
async def get_pdf_ocr_task(task_id: str, request: Request) -> dict[str, Any]:
    repository: PdfTaskRepository = request.app.state.pdf_task_repository
    return _task_snapshot(repository, task_id)


@router.post("/pdf/tasks/{task_id}/retry")
async def retry_pdf_ocr_task(task_id: str, request: Request) -> JSONResponse:
    repository: PdfTaskRepository = request.app.state.pdf_task_repository
    if repository.get_task(task_id) is None:
        raise HTTPException(status_code=404, detail="PDF OCR 任务不存在")
    try:
        task = repository.retry_failed_task(task_id)
    except InvalidTaskStateError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    snapshot = task.to_public_dict(repository.list_pages(task_id))
    request.app.state.pdf_task_queue.wake()
    return JSONResponse(status_code=202, content=snapshot)


def format_sse_event(
    event: str,
    data: dict[str, Any],
) -> str:
    """
    把 Python 字典格式化成 SSE 格式。
    """

    return (
        f"event: {event}\n"
        f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
    )


@router.get("/pdf/tasks/{task_id}/events")
async def stream_pdf_task_events(
    task_id: str,
    request: Request,
) -> StreamingResponse:
    """
    通过 SSE 推送 PDF OCR 进度。
    """

    repository: PdfTaskRepository = request.app.state.pdf_task_repository
    if repository.get_task(task_id) is None:
        raise HTTPException(status_code=404, detail="PDF OCR 任务不存在")

    async def event_generator():
        snapshot = _task_snapshot(repository, task_id)
        yield format_sse_event("snapshot", snapshot)
        if snapshot["status"] in {"completed", "failed"}:
            yield format_sse_event(snapshot["status"], snapshot)
            return

        last_updated = snapshot["updatedAt"]
        last_heartbeat = time.monotonic()
        while True:
            await asyncio.sleep(1)
            task = repository.get_task(task_id)
            if task is None:
                yield format_sse_event(
                    "failed",
                    {"taskId": task_id, "error": "PDF OCR 任务不存在"},
                )
                return
            if task.updated_at != last_updated:
                snapshot = task.to_public_dict(repository.list_pages(task_id))
                last_updated = task.updated_at
                yield format_sse_event("progress", snapshot)
                if task.status in {"completed", "failed"}:
                    yield format_sse_event(task.status, snapshot)
                    return
            if time.monotonic() - last_heartbeat >= 15:
                yield ": heartbeat\n\n"
                last_heartbeat = time.monotonic()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
