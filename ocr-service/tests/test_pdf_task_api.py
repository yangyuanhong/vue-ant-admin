import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf
from fastapi.testclient import TestClient


class PdfTaskApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        patcher = patch.dict(
            os.environ,
            {"OCR_DATA_DIR": self.temp_dir.name},
        )
        patcher.start()
        self.addCleanup(patcher.stop)

        from app.main import app

        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()
        self.addCleanup(self.client_context.__exit__, None, None, None)

        document = pymupdf.open()
        document.new_page()
        buffer = io.BytesIO()
        document.save(buffer)
        document.close()
        self.pdf_bytes = buffer.getvalue()

    def test_create_returns_202_and_status_is_queryable(self) -> None:
        response = self.client.post(
            "/ocr/pdf/tasks?ocr_type=ancient",
            files={"file": ("book.pdf", self.pdf_bytes, "application/pdf")},
        )

        self.assertEqual(response.status_code, 202)
        task_id = response.json()["taskId"]
        status = self.client.get(f"/ocr/pdf/tasks/{task_id}")
        self.assertEqual(status.status_code, 200)
        self.assertIn(status.json()["status"], {"queued", "processing", "completed"})
        self.assertNotIn("pdfPath", status.json())
        source = Path(self.temp_dir.name) / "pdf-tasks" / task_id / "source.pdf"
        self.assertTrue(source.is_file())

    def test_unknown_task_returns_404(self) -> None:
        response = self.client.get("/ocr/pdf/tasks/missing")
        self.assertEqual(response.status_code, 404)

    def test_empty_pdf_is_rejected_and_directory_is_cleaned(self) -> None:
        response = self.client.post(
            "/ocr/pdf/tasks",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)

    def test_retry_failed_task_preserves_completed_page(self) -> None:
        repository = self.client.app.state.pdf_task_repository
        task_root = Path(self.temp_dir.name) / "pdf-tasks" / "failed-task"
        task_root.mkdir(parents=True)
        pdf_path = task_root / "source.pdf"
        pdf_path.write_bytes(self.pdf_bytes)
        repository.create_task(
            task_id="failed-task",
            pdf_path=str(pdf_path),
            filename="failed.pdf",
            ocr_type="ancient",
        )
        repository.initialize_pages("failed-task", 2)
        repository.claim_next_task()
        repository.mark_page_processing("failed-task", 1)
        repository.complete_page("failed-task", 1, "done", [])
        repository.mark_page_processing("failed-task", 2)
        repository.fail_page_and_task("failed-task", 2, "boom")

        response = self.client.post("/ocr/pdf/tasks/failed-task/retry")

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["status"], "queued")
        self.assertEqual(response.json()["processedPages"], 1)

    def test_sse_starts_with_completed_database_snapshot(self) -> None:
        repository = self.client.app.state.pdf_task_repository
        task_root = Path(self.temp_dir.name) / "pdf-tasks" / "done-task"
        task_root.mkdir(parents=True)
        pdf_path = task_root / "source.pdf"
        pdf_path.write_bytes(self.pdf_bytes)
        repository.create_task(
            task_id="done-task",
            pdf_path=str(pdf_path),
            filename="done.pdf",
            ocr_type="ancient",
        )
        repository.initialize_pages("done-task", 1)
        repository.claim_next_task()
        repository.mark_page_processing("done-task", 1)
        repository.complete_page("done-task", 1, "done", [])
        repository.complete_task("done-task")

        with self.client.stream(
            "GET",
            "/ocr/pdf/tasks/done-task/events",
        ) as response:
            body = "".join(response.iter_text())

        self.assertIn("event: snapshot", body)
        self.assertIn('"status": "completed"', body)
        self.assertIn("event: completed", body)


if __name__ == "__main__":
    unittest.main()
