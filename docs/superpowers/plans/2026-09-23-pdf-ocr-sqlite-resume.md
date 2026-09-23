# PDF OCR SQLite Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist PDF OCR tasks and page results in local SQLite so interrupted tasks automatically resume without repeating completed pages.

**Architecture:** SQLite is the source of truth for task state and page results; a single application-lifespan worker claims queued jobs and updates one page per transaction. Uploaded PDFs live under a stable service data directory, while HTTP status and SSE endpoints read snapshots from SQLite independently of Paddle inference.

**Tech Stack:** Python 3.11, FastAPI lifespan, stdlib `sqlite3`, `asyncio`, PyMuPDF, unittest

---

## File map

- Create `ocr-service/app/pdf_task_models.py`: persistence-neutral task/page records and public serializers.
- Create `ocr-service/app/pdf_task_repository.py`: SQLite schema, transactions, recovery, task claiming, page completion and retry.
- Create `ocr-service/app/pdf_task_queue.py`: single-worker wake/stop coordination and process lifecycle.
- Rewrite `ocr-service/app/pdf_task_worker.py`: resumable page processor with injected repository and OCR callable.
- Modify `ocr-service/app/routers/ocr.py`: persistent upload, 202 create, GET status, retry and snapshot-based SSE.
- Modify `ocr-service/app/main.py`: lifespan initialization, recovery and worker shutdown.
- Modify `ocr-service/.gitignore`: exclude runtime SQLite and task files.
- Create repository, worker and API tests under `ocr-service/tests/`.

### Task 1: Persistent task records and SQLite schema

**Files:**
- Create: `ocr-service/app/pdf_task_models.py`
- Create: `ocr-service/app/pdf_task_repository.py`
- Create: `ocr-service/tests/test_pdf_task_repository.py`

- [ ] **Step 1: Write the failing persistence test**

```python
import tempfile
import unittest
from pathlib import Path

from app.pdf_task_repository import PdfTaskRepository


class PdfTaskRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "tasks.sqlite3"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_task_survives_repository_recreation(self) -> None:
        repository = PdfTaskRepository(self.db_path)
        repository.initialize()
        task = repository.create_task(
            task_id="task-1",
            pdf_path="C:/data/task-1/source.pdf",
            filename="book.pdf",
            ocr_type="ancient",
        )

        reopened = PdfTaskRepository(self.db_path)
        reopened.initialize()
        restored = reopened.get_task(task.task_id)

        self.assertIsNotNone(restored)
        self.assertEqual(restored.status, "queued")
        self.assertEqual(restored.filename, "book.pdf")
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_repository.PdfTaskRepositoryTests.test_task_survives_repository_recreation -v`

Expected: import failure because `app.pdf_task_repository` does not exist.

- [ ] **Step 3: Add immutable records and public serialization**

Implement `PdfTaskRecord` and `PdfPageRecord` dataclasses in `pdf_task_models.py`. Include all schema fields from the design. Add `to_public_dict(pages=())` that emits camelCase API keys, ISO timestamps, error/text, and page summaries but omits `pdf_path` and `items_json`.

```python
@dataclass(frozen=True)
class PdfTaskRecord:
    task_id: str
    filename: str
    ocr_type: str
    pdf_path: str
    status: str
    page_count: int
    processed_pages: int
    progress: float
    error: str | None
    full_text: str
    created_at: str
    updated_at: str
    started_at: str | None
    heartbeat_at: str | None
    completed_at: str | None
    attempt_count: int
```

- [ ] **Step 4: Implement the repository foundation**

Implement `PdfTaskRepository(db_path)` with `_connect()`, `initialize()`, `create_task()` and `get_task()`. `_connect()` must set `row_factory=sqlite3.Row`, `PRAGMA foreign_keys=ON`, `PRAGMA busy_timeout=5000`; `initialize()` must set WAL and create the exact two tables from the design plus indexes on task status/created time and page task/status.

All timestamps use timezone-aware UTC ISO strings from one `_utc_now()` helper. `create_task()` inserts a queued task and returns it. Do not keep a process-local task dictionary.

- [ ] **Step 5: Run repository tests and verify GREEN**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_repository -v`

Expected: PASS.

- [ ] **Step 6: Commit the repository foundation**

```powershell
git add ocr-service/app/pdf_task_models.py ocr-service/app/pdf_task_repository.py ocr-service/tests/test_pdf_task_repository.py
git commit -m "feat(ocr): persist PDF task metadata in SQLite"
```

### Task 2: Page transactions, recovery and retry

**Files:**
- Modify: `ocr-service/app/pdf_task_repository.py`
- Modify: `ocr-service/tests/test_pdf_task_repository.py`

- [ ] **Step 1: Write failing tests for page completion and restart recovery**

Add tests that call these wished-for methods:

```python
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
    self.assertEqual([page.status for page in pages], ["completed", "pending", "pending"])
    restored = repository.get_task(task.task_id)
    self.assertEqual(restored.status, "queued")
    self.assertEqual(restored.processed_pages, 1)


def test_retry_keeps_completed_pages(self) -> None:
    repository = self.make_failed_three_page_task()
    repository.retry_failed_task("task-1")
    pages = repository.list_pages("task-1")
    self.assertEqual([page.status for page in pages], ["completed", "pending", "pending"])
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_repository -v`

Expected: attribute failures for missing page/recovery methods.

- [ ] **Step 3: Implement transactional lifecycle methods**

Add:

- `initialize_pages(task_id, page_count)` using `INSERT OR IGNORE` for pages 1..N.
- `claim_next_task()` using `BEGIN IMMEDIATE`, selecting oldest queued task and atomically updating it to processing with `started_at`, `heartbeat_at`, `updated_at`, and incremented attempt count.
- `mark_page_processing(task_id, page_number)`.
- `complete_page(task_id, page_number, text, items)` writing JSON with `ensure_ascii=False`; in the same transaction recompute completed count/progress and heartbeat.
- `fail_page_and_task(task_id, page_number, error)`.
- `complete_task(task_id)` that rebuilds `full_text` from completed pages ordered by page number and marks the task completed.
- `list_pages(task_id)`, `next_incomplete_page(task_id)`.
- `recover_interrupted_tasks()` resetting task processing→queued and page processing→pending in one transaction.
- `retry_failed_task(task_id)` that rejects non-failed tasks with a domain `InvalidTaskStateError`, preserves completed pages, resets other pages, and queues the task.

- [ ] **Step 4: Verify all repository behavior**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_repository -v`

Expected: all repository tests PASS, including progress equal to `33.33` after one of three pages.

- [ ] **Step 5: Commit lifecycle transactions**

```powershell
git add ocr-service/app/pdf_task_repository.py ocr-service/tests/test_pdf_task_repository.py
git commit -m "feat(ocr): persist PDF page progress and recovery"
```

### Task 3: Resumable single-consumer worker

**Files:**
- Create: `ocr-service/app/pdf_task_queue.py`
- Rewrite: `ocr-service/app/pdf_task_worker.py`
- Create: `ocr-service/tests/test_pdf_task_worker.py`

- [ ] **Step 1: Write a failing resume test with fake OCR**

Create a two-page PDF with PyMuPDF in a temporary directory. Pre-complete page 1, then execute one task with an injected async recognizer that records page calls.

```python
def test_worker_skips_completed_pages_after_restart(self) -> None:
    calls: list[int] = []

    async def recognize(page_number: int, image_path: str, ocr_type: str):
        calls.append(page_number)
        return {"text": f"page {page_number}", "items": []}

    asyncio.run(process_one_task(self.repository, "task-1", recognize))

    self.assertEqual(calls, [2])
    task = self.repository.get_task("task-1")
    self.assertEqual(task.status, "completed")
    self.assertIn("## 第 1 页", task.full_text)
    self.assertIn("## 第 2 页", task.full_text)
```

- [ ] **Step 2: Run worker test and verify RED**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_worker -v`

Expected: missing `process_one_task` or incompatible current worker signature.

- [ ] **Step 3: Implement focused worker functions**

Rewrite the worker around these boundaries:

```python
Recognizer = Callable[[int, str, str], Awaitable[dict[str, Any]]]

async def default_recognizer(page_number: int, image_path: str, ocr_type: str) -> dict[str, Any]: ...
async def process_one_task(repository, task_id: str, recognizer=default_recognizer) -> None: ...
async def worker_loop(repository, wake_event, stop_event) -> None: ...
```

`process_one_task` opens the persisted source PDF, initializes pages idempotently, skips completed pages, renders only the current page, and calls the recognizer through `asyncio.wait_for` with `PDF_PAGE_OCR_TIMEOUT_SECONDS` (default 600). Always remove page PNGs in `finally`; persist page/task failure with an actionable message.

`worker_loop` repeatedly claims the oldest queued task. When none exists, clear and wait on `wake_event` with a short timeout so database jobs are eventually noticed even if a wake signal is lost.

- [ ] **Step 4: Implement queue lifecycle controller**

In `pdf_task_queue.py`, create `PdfTaskQueue` with `start()`, `wake()`, and `stop()`. `start()` performs repository initialization/recovery before creating one `asyncio.Task`; `stop()` sets the stop event, wakes the loop and waits for it. No OCR work runs in FastAPI `BackgroundTasks`.

- [ ] **Step 5: Run worker and repository tests**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_worker tests.test_pdf_task_repository -v`

Expected: PASS; fake recognizer called only for incomplete pages.

- [ ] **Step 6: Commit the resumable worker**

```powershell
git add ocr-service/app/pdf_task_queue.py ocr-service/app/pdf_task_worker.py ocr-service/tests/test_pdf_task_worker.py
git commit -m "feat(ocr): resume PDF OCR with a persistent worker"
```

### Task 4: Persistent create and status APIs

**Files:**
- Modify: `ocr-service/app/routers/ocr.py`
- Modify: `ocr-service/app/main.py`
- Create: `ocr-service/tests/test_pdf_task_api.py`

- [ ] **Step 1: Write failing API tests**

Use `fastapi.testclient.TestClient` with `OCR_DATA_DIR` pointing at a temporary directory and patch the queue wake method. Test:

```python
def test_create_returns_202_and_status_is_queryable(self) -> None:
    response = self.client.post(
        "/ocr/pdf/tasks?ocr_type=ancient",
        files={"file": ("book.pdf", self.pdf_bytes, "application/pdf")},
    )
    self.assertEqual(response.status_code, 202)
    task_id = response.json()["taskId"]

    status = self.client.get(f"/ocr/pdf/tasks/{task_id}")
    self.assertEqual(status.status_code, 200)
    self.assertEqual(status.json()["status"], "queued")
    self.assertNotIn("pdfPath", status.json())


def test_unknown_task_returns_404(self) -> None:
    self.assertEqual(self.client.get("/ocr/pdf/tasks/missing").status_code, 404)
```

- [ ] **Step 2: Run API tests and verify RED**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_api -v`

Expected: create returns 200/current in-memory behavior or GET returns 405/404.

- [ ] **Step 3: Add application lifespan dependencies**

In `main.py`, define a lifespan context that resolves `OCR_DATA_DIR` (default `ocr-service/data`), creates directories, initializes `PdfTaskRepository`, constructs/starts `PdfTaskQueue`, stores both on `app.state`, and stops the queue at shutdown. Routers obtain them through `Request.app.state` rather than importing mutable globals.

- [ ] **Step 4: Replace PDF creation and add GET status**

Change POST to accept `Request`, generate UUID first, stream into `<data>/pdf-tasks/<id>/source.pdf.uploading`, reject zero-byte uploads, atomically rename to `source.pdf`, insert repository row, wake the queue and return `JSONResponse(status_code=202, content=snapshot)`.

Add `GET /ocr/pdf/tasks/{task_id}` returning `task.to_public_dict(repository.list_pages(task_id))`; return 404 when absent. Do not acquire `inference_lock` or access Paddle.

- [ ] **Step 5: Run API tests and full suite**

Run: `cd ocr-service && python -m unittest discover -s tests -v`

Expected: API tests and all prior OCR tests PASS.

- [ ] **Step 6: Commit persistent endpoints**

```powershell
git add ocr-service/app/main.py ocr-service/app/routers/ocr.py ocr-service/tests/test_pdf_task_api.py
git commit -m "feat(ocr): expose persistent PDF task status"
```

### Task 5: Retry endpoint and reconnect-safe SSE

**Files:**
- Modify: `ocr-service/app/routers/ocr.py`
- Modify: `ocr-service/tests/test_pdf_task_api.py`

- [ ] **Step 1: Write failing retry and SSE snapshot tests**

```python
def test_retry_failed_task_preserves_completed_page(self) -> None:
    self.seed_failed_task_with_one_completed_page()
    response = self.client.post("/ocr/pdf/tasks/task-1/retry")
    self.assertEqual(response.status_code, 202)
    self.assertEqual(response.json()["status"], "queued")
    self.assertEqual(response.json()["processedPages"], 1)


def test_sse_starts_with_database_snapshot(self) -> None:
    self.seed_completed_task()
    with self.client.stream("GET", "/ocr/pdf/tasks/task-1/events") as response:
        body = "".join(response.iter_text())
    self.assertIn("event: snapshot", body)
    self.assertIn('"status": "completed"', body)
    self.assertIn("event: completed", body)
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd ocr-service && python -m unittest tests.test_pdf_task_api -v`

Expected: retry route missing and SSE still depends on removed memory queue.

- [ ] **Step 3: Implement retry route**

Add `POST /ocr/pdf/tasks/{task_id}/retry`. Return 404 if absent, 409 for `InvalidTaskStateError`, otherwise call repository retry, wake worker, and return 202 snapshot.

- [ ] **Step 4: Replace SSE queue consumption with SQLite snapshots**

On connection, load and emit `snapshot`. If terminal, immediately emit `completed` or `failed` and close. Otherwise poll the repository once per second, comparing `updated_at`; emit `progress` on changes and heartbeat comments every 15 seconds. If the task disappears, emit `failed` with a clear error and close. Never hold a SQLite connection across `yield`.

- [ ] **Step 5: Run API and full tests**

Run: `cd ocr-service && python -m unittest discover -s tests -v`

Expected: all tests PASS, including reconnect snapshot and retry state constraints.

- [ ] **Step 6: Commit retry and SSE**

```powershell
git add ocr-service/app/routers/ocr.py ocr-service/tests/test_pdf_task_api.py
git commit -m "feat(ocr): add PDF task retry and resumable events"
```

### Task 6: Runtime hygiene and end-to-end verification

**Files:**
- Modify: `ocr-service/.gitignore`
- Modify: `ocr-service/README.md`
- Test: all `ocr-service/tests/`

- [ ] **Step 1: Add runtime data exclusions**

Append:

```gitignore
data/
*.sqlite3
*.sqlite3-shm
*.sqlite3-wal
```

- [ ] **Step 2: Document production operation and API examples**

Document `OCR_DATA_DIR`, `PDF_PAGE_OCR_TIMEOUT_SECONDS`, creation/status/retry/SSE endpoints, automatic resume semantics, and the single-process constraint. Include the production command without reload:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

- [ ] **Step 3: Run static and complete automated verification**

Run:

```powershell
cd ocr-service
python -m compileall -q app tests
python -m unittest discover -s tests -v
```

Expected: compile exit 0 and zero failed/error tests.

- [ ] **Step 4: Perform a restart-resume smoke test**

Create a small multi-page PDF, submit it, wait until at least one page is completed via GET, stop the server cleanly, restart it without `--reload`, and poll GET until completed. Verify the first completed page's database `attempt_count` did not increase and the final text contains page headings in numeric order.

- [ ] **Step 5: Verify workspace scope**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only planned OCR-service/doc changes are staged for the final commit, while unrelated pre-existing edits remain untouched.

- [ ] **Step 6: Commit documentation and runtime configuration**

```powershell
git add ocr-service/.gitignore ocr-service/README.md
git commit -m "docs(ocr): document persistent PDF task operation"
```
