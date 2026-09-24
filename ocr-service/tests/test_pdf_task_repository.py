import tempfile
import unittest
from pathlib import Path

from app.pdf_task_repository import InvalidTaskStateError, PdfTaskRepository


class PdfTaskRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "tasks.sqlite3"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def make_repository(self) -> PdfTaskRepository:
        repository = PdfTaskRepository(self.db_path)
        repository.initialize()
        return repository

    def create_task(self, repository: PdfTaskRepository):
        return repository.create_task(
            task_id="task-1",
            pdf_path=str(Path(self.temp_dir.name) / "source.pdf"),
            filename="book.pdf",
            ocr_type="ancient",
        )

    def test_task_survives_repository_recreation(self) -> None:
        repository = self.make_repository()
        task = self.create_task(repository)

        reopened = PdfTaskRepository(self.db_path)
        reopened.initialize()
        restored = reopened.get_task(task.task_id)

        self.assertIsNotNone(restored)
        self.assertEqual(restored.status, "queued")
        self.assertEqual(restored.filename, "book.pdf")

    def test_completed_pages_survive_recovery(self) -> None:
        repository = self.make_repository()
        task = self.create_task(repository)
        repository.initialize_pages(task.task_id, 3)
        repository.claim_next_task()
        repository.mark_page_processing(task.task_id, 1)
        repository.complete_page(task.task_id, 1, "第一页", [{"text": "第一页"}])
        repository.mark_page_processing(task.task_id, 2)

        repository.recover_interrupted_tasks()

        pages = repository.list_pages(task.task_id)
        self.assertEqual(
            [page.status for page in pages],
            ["completed", "pending", "pending"],
        )
        restored = repository.get_task(task.task_id)
        self.assertEqual(restored.status, "queued")
        self.assertEqual(restored.processed_pages, 1)
        self.assertEqual(restored.progress, 33.33)

    def test_retry_keeps_completed_pages(self) -> None:
        repository = self.make_repository()
        task = self.create_task(repository)
        repository.initialize_pages(task.task_id, 3)
        repository.claim_next_task()
        repository.mark_page_processing(task.task_id, 1)
        repository.complete_page(task.task_id, 1, "第一页", [])
        repository.mark_page_processing(task.task_id, 2)
        repository.fail_page_and_task(task.task_id, 2, "recognition failed")

        retried = repository.retry_failed_task(task.task_id)

        pages = repository.list_pages(task.task_id)
        self.assertEqual(retried.status, "queued")
        self.assertEqual(retried.processed_pages, 1)
        self.assertEqual(
            [page.status for page in pages],
            ["completed", "pending", "pending"],
        )

    def test_retry_rejects_non_failed_task(self) -> None:
        repository = self.make_repository()
        task = self.create_task(repository)

        with self.assertRaises(InvalidTaskStateError):
            repository.retry_failed_task(task.task_id)

    def test_public_snapshot_does_not_expose_pdf_path(self) -> None:
        repository = self.make_repository()
        task = self.create_task(repository)

        snapshot = task.to_public_dict()

        self.assertNotIn("pdfPath", snapshot)
        self.assertEqual(snapshot["taskId"], "task-1")


if __name__ == "__main__":
    unittest.main()
