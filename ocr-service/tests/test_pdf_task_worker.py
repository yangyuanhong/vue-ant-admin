import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

from app.pdf_task_repository import PdfTaskRepository
from app.pdf_task_queue import PdfTaskQueue
from app.pdf_task_worker import process_one_task


class PdfTaskWorkerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.pdf_path = root / "source.pdf"
        document = pymupdf.open()
        document.new_page()
        document.new_page()
        document.save(self.pdf_path)
        document.close()

        self.repository = PdfTaskRepository(root / "tasks.sqlite3")
        self.repository.initialize()
        self.repository.create_task(
            task_id="task-1",
            pdf_path=str(self.pdf_path),
            filename="book.pdf",
            ocr_type="ancient",
        )
        self.repository.initialize_pages("task-1", 2)
        self.repository.claim_next_task()
        self.repository.mark_page_processing("task-1", 1)
        self.repository.complete_page("task-1", 1, "page 1", [])

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_worker_skips_completed_pages_after_restart(self) -> None:
        calls: list[int] = []

        async def recognize(
            page_number: int,
            image_path: str,
            ocr_type: str,
        ) -> dict:
            calls.append(page_number)
            self.assertTrue(Path(image_path).exists())
            self.assertEqual(ocr_type, "ancient")
            return {"text": f"page {page_number}", "items": []}

        asyncio.run(process_one_task(self.repository, "task-1", recognize))

        self.assertEqual(calls, [2])
        task = self.repository.get_task("task-1")
        self.assertEqual(task.status, "completed")
        self.assertIn("## 第 1 页", task.full_text)
        self.assertIn("## 第 2 页", task.full_text)

    def test_worker_persists_page_failure(self) -> None:
        async def recognize(
            page_number: int,
            image_path: str,
            ocr_type: str,
        ) -> dict:
            raise RuntimeError("model crashed")

        asyncio.run(process_one_task(self.repository, "task-1", recognize))

        task = self.repository.get_task("task-1")
        page = self.repository.list_pages("task-1")[1]
        self.assertEqual(task.status, "failed")
        self.assertEqual(page.status, "failed")
        self.assertIn("model crashed", task.error)

    def test_queue_start_recovers_interrupted_task(self) -> None:
        self.repository.mark_page_processing("task-1", 2)

        async def start_and_inspect() -> tuple[str, str]:
            async def idle_worker(repository, wake_event, stop_event) -> None:
                await stop_event.wait()

            with patch("app.pdf_task_queue.worker_loop", new=idle_worker):
                queue = PdfTaskQueue(self.repository)
                await queue.start()
                task = queue.repository.get_task("task-1")
                page = queue.repository.list_pages("task-1")[1]
                await queue.stop()
            return task.status, page.status

        task_status, page_status = asyncio.run(start_and_inspect())

        self.assertEqual(task_status, "queued")
        self.assertEqual(page_status, "pending")


if __name__ == "__main__":
    unittest.main()
