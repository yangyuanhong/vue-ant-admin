import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from app.tasks.pdf_task_queue import PdfTaskQueue
from app.tasks.pdf_task_repository import PdfTaskRepository
from app.routers.health import router as health_router
from app.routers.ocr import router as ocr_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    default_data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir = Path(os.getenv("OCR_DATA_DIR", str(default_data_dir))).resolve()
    task_files_dir = data_dir / "pdf-tasks"
    task_files_dir.mkdir(parents=True, exist_ok=True)

    repository = PdfTaskRepository(data_dir / "pdf_tasks.sqlite3")
    queue = PdfTaskQueue(repository)
    app.state.pdf_task_repository = repository
    app.state.pdf_task_queue = queue
    app.state.pdf_task_files_dir = task_files_dir
    await queue.start()
    try:
        yield
    finally:
        await queue.stop()


app = FastAPI(
    title="Technical Retrospective OCR Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(ocr_router)
