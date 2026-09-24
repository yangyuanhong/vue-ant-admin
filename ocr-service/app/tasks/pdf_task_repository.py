import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from app.tasks.pdf_task_models import PdfPageRecord, PdfTaskRecord


class InvalidTaskStateError(ValueError):
    pass


class PdfTaskRepository:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)

    @staticmethod
    def _utc_now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path, timeout=5)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 5000")
        return connection

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        connection = self._connect()
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def initialize(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS pdf_tasks (
                    task_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    ocr_type TEXT NOT NULL CHECK (ocr_type IN ('normal', 'ancient')),
                    pdf_path TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (
                        status IN ('queued', 'processing', 'completed', 'failed')
                    ),
                    page_count INTEGER NOT NULL DEFAULT 0,
                    processed_pages INTEGER NOT NULL DEFAULT 0,
                    progress REAL NOT NULL DEFAULT 0,
                    error TEXT,
                    full_text TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    heartbeat_at TEXT,
                    completed_at TEXT,
                    attempt_count INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS pdf_task_pages (
                    task_id TEXT NOT NULL REFERENCES pdf_tasks(task_id) ON DELETE CASCADE,
                    page_number INTEGER NOT NULL,
                    status TEXT NOT NULL CHECK (
                        status IN ('pending', 'processing', 'completed', 'failed')
                    ),
                    text TEXT NOT NULL DEFAULT '',
                    items_json TEXT NOT NULL DEFAULT '[]',
                    error TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (task_id, page_number)
                );

                CREATE INDEX IF NOT EXISTS idx_pdf_tasks_queue
                ON pdf_tasks(status, created_at);

                CREATE INDEX IF NOT EXISTS idx_pdf_task_pages_status
                ON pdf_task_pages(task_id, status, page_number);
                """
            )

    @staticmethod
    def _task_from_row(row: sqlite3.Row | None) -> PdfTaskRecord | None:
        return PdfTaskRecord(**dict(row)) if row is not None else None

    @staticmethod
    def _page_from_row(row: sqlite3.Row) -> PdfPageRecord:
        return PdfPageRecord(**dict(row))

    def create_task(
        self,
        *,
        task_id: str,
        pdf_path: str,
        filename: str,
        ocr_type: str,
    ) -> PdfTaskRecord:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute(
                """
                INSERT INTO pdf_tasks (
                    task_id, filename, ocr_type, pdf_path, status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'queued', ?, ?)
                """,
                (task_id, filename, ocr_type, pdf_path, now, now),
            )
        task = self.get_task(task_id)
        assert task is not None
        return task

    def get_task(self, task_id: str) -> PdfTaskRecord | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT * FROM pdf_tasks WHERE task_id = ?",
                (task_id,),
            ).fetchone()
        return self._task_from_row(row)

    def initialize_pages(self, task_id: str, page_count: int) -> None:
        now = self._utc_now()
        with self._connection() as connection:
            connection.executemany(
                """
                INSERT OR IGNORE INTO pdf_task_pages (
                    task_id, page_number, status
                ) VALUES (?, ?, 'pending')
                """,
                ((task_id, page_number) for page_number in range(1, page_count + 1)),
            )
            connection.execute(
                """
                UPDATE pdf_tasks
                SET page_count = ?, updated_at = ?
                WHERE task_id = ?
                """,
                (page_count, now, task_id),
            )

    def list_pages(self, task_id: str) -> list[PdfPageRecord]:
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM pdf_task_pages
                WHERE task_id = ? ORDER BY page_number
                """,
                (task_id,),
            ).fetchall()
        return [self._page_from_row(row) for row in rows]

    def claim_next_task(self) -> PdfTaskRecord | None:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                """
                SELECT task_id FROM pdf_tasks
                WHERE status = 'queued'
                ORDER BY created_at, task_id LIMIT 1
                """
            ).fetchone()
            if row is None:
                return None
            task_id = str(row["task_id"])
            connection.execute(
                """
                UPDATE pdf_tasks
                SET status = 'processing', error = NULL,
                    started_at = COALESCE(started_at, ?),
                    heartbeat_at = ?, updated_at = ?,
                    attempt_count = attempt_count + 1
                WHERE task_id = ? AND status = 'queued'
                """,
                (now, now, now, task_id),
            )
        return self.get_task(task_id)

    def mark_page_processing(self, task_id: str, page_number: int) -> None:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE pdf_task_pages
                SET status = 'processing', error = NULL, started_at = ?,
                    completed_at = NULL, attempt_count = attempt_count + 1
                WHERE task_id = ? AND page_number = ?
                  AND status != 'completed'
                """,
                (now, task_id, page_number),
            )
            connection.execute(
                """
                UPDATE pdf_tasks SET heartbeat_at = ?, updated_at = ?
                WHERE task_id = ?
                """,
                (now, now, task_id),
            )

    def _update_progress(self, connection: sqlite3.Connection, task_id: str, now: str) -> None:
        completed = int(
            connection.execute(
                """
                SELECT COUNT(*) FROM pdf_task_pages
                WHERE task_id = ? AND status = 'completed'
                """,
                (task_id,),
            ).fetchone()[0]
        )
        page_count = int(
            connection.execute(
                "SELECT page_count FROM pdf_tasks WHERE task_id = ?",
                (task_id,),
            ).fetchone()[0]
        )
        progress = round(completed / page_count * 100, 2) if page_count else 0.0
        connection.execute(
            """
            UPDATE pdf_tasks
            SET processed_pages = ?, progress = ?,
                heartbeat_at = ?, updated_at = ?
            WHERE task_id = ?
            """,
            (completed, progress, now, now, task_id),
        )

    def complete_page(
        self,
        task_id: str,
        page_number: int,
        text: str,
        items: list[dict[str, Any]],
    ) -> None:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE pdf_task_pages
                SET status = 'completed', text = ?, items_json = ?, error = NULL,
                    completed_at = ?
                WHERE task_id = ? AND page_number = ?
                """,
                (text, json.dumps(items, ensure_ascii=False), now, task_id, page_number),
            )
            self._update_progress(connection, task_id, now)

    def fail_page_and_task(self, task_id: str, page_number: int, error: str) -> None:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE pdf_task_pages
                SET status = 'failed', error = ?, completed_at = ?
                WHERE task_id = ? AND page_number = ?
                  AND status != 'completed'
                """,
                (error, now, task_id, page_number),
            )
            connection.execute(
                """
                UPDATE pdf_tasks
                SET status = 'failed', error = ?, heartbeat_at = ?, updated_at = ?
                WHERE task_id = ?
                """,
                (error, now, now, task_id),
            )

    def fail_task(self, task_id: str, error: str) -> None:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE pdf_tasks
                SET status = 'failed', error = ?, heartbeat_at = ?, updated_at = ?
                WHERE task_id = ?
                """,
                (error, now, now, task_id),
            )

    def next_incomplete_page(self, task_id: str) -> PdfPageRecord | None:
        with self._connection() as connection:
            row = connection.execute(
                """
                SELECT * FROM pdf_task_pages
                WHERE task_id = ? AND status != 'completed'
                ORDER BY page_number LIMIT 1
                """,
                (task_id,),
            ).fetchone()
        return self._page_from_row(row) if row is not None else None

    def complete_task(self, task_id: str) -> PdfTaskRecord:
        now = self._utc_now()
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT page_number, text FROM pdf_task_pages
                WHERE task_id = ? AND status = 'completed'
                ORDER BY page_number
                """,
                (task_id,),
            ).fetchall()
            full_text = "\n\n".join(
                f"## 第 {row['page_number']} 页\n\n{str(row['text']).strip()}"
                for row in rows
                if str(row["text"]).strip()
            )
            connection.execute(
                """
                UPDATE pdf_tasks
                SET status = 'completed', progress = 100,
                    processed_pages = page_count, full_text = ?, error = NULL,
                    heartbeat_at = ?, completed_at = ?, updated_at = ?
                WHERE task_id = ?
                """,
                (full_text, now, now, now, task_id),
            )
        task = self.get_task(task_id)
        assert task is not None
        return task

    def recover_interrupted_tasks(self) -> int:
        now = self._utc_now()
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            task_ids = [
                str(row[0])
                for row in connection.execute(
                    "SELECT task_id FROM pdf_tasks WHERE status = 'processing'"
                ).fetchall()
            ]
            for task_id in task_ids:
                connection.execute(
                    """
                    UPDATE pdf_task_pages
                    SET status = 'pending', error = NULL, started_at = NULL,
                        completed_at = NULL
                    WHERE task_id = ? AND status = 'processing'
                    """,
                    (task_id,),
                )
                connection.execute(
                    """
                    UPDATE pdf_tasks
                    SET status = 'queued', error = NULL,
                        heartbeat_at = NULL, updated_at = ?
                    WHERE task_id = ?
                    """,
                    (now, task_id),
                )
        return len(task_ids)

    def retry_failed_task(self, task_id: str) -> PdfTaskRecord:
        task = self.get_task(task_id)
        if task is None:
            raise KeyError(task_id)
        if task.status != "failed":
            raise InvalidTaskStateError("只有 failed 任务可以重试")

        now = self._utc_now()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE pdf_task_pages
                SET status = 'pending', error = NULL,
                    started_at = NULL, completed_at = NULL
                WHERE task_id = ? AND status != 'completed'
                """,
                (task_id,),
            )
            self._update_progress(connection, task_id, now)
            connection.execute(
                """
                UPDATE pdf_tasks
                SET status = 'queued', error = NULL, completed_at = NULL,
                    heartbeat_at = NULL, updated_at = ?
                WHERE task_id = ?
                """,
                (now, task_id),
            )
        retried = self.get_task(task_id)
        assert retried is not None
        return retried
