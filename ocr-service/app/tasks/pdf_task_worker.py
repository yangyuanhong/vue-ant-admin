import asyncio
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

import pymupdf

from app.core.config import ocr_config
from app.tasks.page_process_runner import PageProcessError, run_page_process
from app.tasks.pdf_task_repository import PdfTaskRepository


Recognizer = Callable[[int, str, str], Awaitable[dict[str, Any]]]


async def default_recognizer(
    page_number: int,
    pdf_path: str,
    ocr_type: str,
) -> dict[str, Any]:
    return await run_page_process(pdf_path, page_number, ocr_type)


async def process_one_task(
    repository: PdfTaskRepository,
    task_id: str,
    recognizer: Recognizer = default_recognizer,
) -> None:
    task = repository.get_task(task_id)
    if task is None:
        return

    pdf_path = Path(task.pdf_path)
    if not pdf_path.is_file():
        repository.fail_task(task_id, f"源 PDF 不存在：{pdf_path}")
        return

    document: pymupdf.Document | None = None
    current_page = 0
    try:
        document = pymupdf.open(pdf_path)
        if document.page_count == 0:
            raise ValueError("PDF 没有任何页面")
        repository.initialize_pages(task_id, document.page_count)

        while page_record := repository.next_incomplete_page(task_id):
            current_page = page_record.page_number
            last_error: Exception | None = None
            for _attempt in range(ocr_config.page_max_attempts):
                repository.mark_page_processing(task_id, current_page)
                try:
                    result = await recognizer(
                        current_page, str(pdf_path), task.ocr_type
                    )
                    repository.complete_page(
                        task_id,
                        current_page,
                        str(result.get("text", "")).strip(),
                        list(result.get("items", [])),
                    )
                    last_error = None
                    break
                except PageProcessError as error:
                    last_error = error
            if last_error is not None:
                raise last_error

        repository.complete_task(task_id)
    except Exception as error:
        message = f"第 {current_page} 页处理失败：{type(error).__name__}: {error}"
        if current_page:
            repository.fail_page_and_task(task_id, current_page, message)
        else:
            repository.fail_task(task_id, message)
    finally:
        if document is not None:
            document.close()


async def worker_loop(
    repository: PdfTaskRepository,
    wake_event: asyncio.Event,
    stop_event: asyncio.Event,
) -> None:
    while not stop_event.is_set():
        task = repository.claim_next_task()
        if task is not None:
            await process_one_task(repository, task.task_id)
            continue

        wake_event.clear()
        try:
            await asyncio.wait_for(wake_event.wait(), timeout=5)
        except asyncio.TimeoutError:
            pass
