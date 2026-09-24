import asyncio

from app.tasks.pdf_task_repository import PdfTaskRepository
from app.tasks.pdf_task_worker import worker_loop


class PdfTaskQueue:
    def __init__(self, repository: PdfTaskRepository) -> None:
        self.repository = repository
        self.wake_event = asyncio.Event()
        self.stop_event = asyncio.Event()
        self.worker_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self.repository.initialize()
        recovered = self.repository.recover_interrupted_tasks()
        if recovered:
            print(f"[PDF OCR] 已恢复 {recovered} 个中断任务")
        self.worker_task = asyncio.create_task(
            worker_loop(self.repository, self.wake_event, self.stop_event),
            name="pdf-ocr-worker",
        )
        self.wake()

    def wake(self) -> None:
        self.wake_event.set()

    async def stop(self) -> None:
        self.stop_event.set()
        self.wake()
        if self.worker_task is not None:
            await self.worker_task
