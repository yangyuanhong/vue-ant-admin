# High-Accuracy Large-Page PDF OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Process arbitrarily large PDF pages at maximum practical OCR accuracy without allowing Paddle native crashes, CPU memory growth, or GPU OOM to take down the API.

**Architecture:** The API process keeps SQLite and HTTP responsive while a supervised child process handles one PDF page at a time. Each page uses bounded full-page and tiled detection, maps merged boxes back to PDF coordinates, renders high-resolution text-column crops on demand, and rechecks low-confidence crops with multiple preprocessing strategies.

**Tech Stack:** Python 3.11, FastAPI, asyncio, multiprocessing/subprocess, PyMuPDF, Pillow, NumPy, PaddlePaddle GPU 3.3.1 (CUDA 12.9 wheel), PaddleOCR 3.7.0, SQLite, unittest

---

## File map

- Create `ocr-service/app/ocr_config.py`: parse and validate all OCR resource/quality settings.
- Create `ocr-service/app/gpu_runtime.py`: CUDA build/device verification used by readiness and the page child.
- Create `ocr-service/scripts/install_gpu.ps1`: deterministic replacement of the CPU Paddle wheel.
- Create `ocr-service/app/page_geometry.py`: render budgeting, tiles, coordinate transforms, padding, and box fusion.
- Create `ocr-service/app/recognition_review.py`: preprocessing candidates and deterministic candidate scoring.
- Refactor `ocr-service/app/ancient_ocr_engine.py`: injectable device, separate detection and crop recognition APIs, no import-time singleton.
- Refactor `ocr-service/app/ocr_engine.py`: injectable device and lazy construction.
- Create `ocr-service/app/page_ocr_pipeline.py`: bounded detection plus high-resolution on-demand crop recognition.
- Create `ocr-service/app/page_ocr_child.py`: one-page command entry point and atomic JSON result protocol.
- Create `ocr-service/app/page_process_runner.py`: parent-side timeout, exit-code handling, heartbeat, retry, and cleanup.
- Modify `ocr-service/app/pdf_task_worker.py`: delegate every page to the supervised runner.
- Modify `ocr-service/app/pdf_task_repository.py`: support retrying a page without failing the task on the first attempt.
- Modify `ocr-service/app/main.py`, `ocr-service/app/routers/health.py`, and `ocr-service/app/schemas.py`: liveness/readiness and worker state.
- Modify `ocr-service/app/routers/ocr.py`: remove import-time model construction and use lazy engines for image endpoints.
- Modify `ocr-service/requirements.txt` and `ocr-service/README.md`: GPU installation and production launch contract.
- Add focused tests under `ocr-service/tests/` and a manual real-PDF acceptance script.

### Task 1: Validated OCR configuration

**Files:**
- Create: `ocr-service/app/ocr_config.py`
- Create: `ocr-service/tests/test_ocr_config.py`

- [ ] **Step 1: Write failing configuration tests**

```python
# tests/test_ocr_config.py
import os
import unittest
from unittest.mock import patch

from app.ocr_config import OcrConfig


class OcrConfigTests(unittest.TestCase):
    def test_defaults_match_accuracy_design(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            config = OcrConfig.from_env()
        self.assertEqual(config.device, "gpu:0")
        self.assertEqual(config.full_page_max_side, 3200)
        self.assertEqual(config.tile_size, 2048)
        self.assertEqual(config.tile_overlap, 0.20)
        self.assertEqual(config.source_max_pixels, 120_000_000)
        self.assertEqual(config.page_timeout_seconds, 900)
        self.assertEqual(config.page_max_attempts, 2)

    def test_invalid_overlap_fails_at_startup(self) -> None:
        with patch.dict(os.environ, {"OCR_DETECTION_TILE_OVERLAP": "1.0"}):
            with self.assertRaisesRegex(ValueError, "OCR_DETECTION_TILE_OVERLAP"):
                OcrConfig.from_env()
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_ocr_config -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'app.ocr_config'`.

- [ ] **Step 3: Implement immutable parsing and validation**

```python
# app/ocr_config.py
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class OcrConfig:
    device: str
    full_page_max_side: int
    tile_size: int
    retry_tile_size: int
    tile_overlap: float
    source_max_pixels: int
    crop_padding_ratio: float
    review_confidence: float
    page_timeout_seconds: float
    page_max_attempts: int

    @classmethod
    def from_env(cls) -> "OcrConfig":
        config = cls(
            device=os.getenv("OCR_DEVICE", "gpu:0"),
            full_page_max_side=int(os.getenv("OCR_FULL_PAGE_MAX_SIDE", "3200")),
            tile_size=int(os.getenv("OCR_DETECTION_TILE_SIZE", "2048")),
            retry_tile_size=int(os.getenv("OCR_RETRY_TILE_SIZE", "1536")),
            tile_overlap=float(os.getenv("OCR_DETECTION_TILE_OVERLAP", "0.20")),
            source_max_pixels=int(os.getenv("OCR_SOURCE_MAX_PIXELS", "120000000")),
            crop_padding_ratio=float(os.getenv("OCR_CROP_PADDING_RATIO", "0.08")),
            review_confidence=float(os.getenv("OCR_REVIEW_CONFIDENCE", "0.80")),
            page_timeout_seconds=float(os.getenv("PDF_PAGE_OCR_TIMEOUT_SECONDS", "900")),
            page_max_attempts=int(os.getenv("PDF_PAGE_MAX_ATTEMPTS", "2")),
        )
        checks = {
            "OCR_FULL_PAGE_MAX_SIDE": config.full_page_max_side >= 512,
            "OCR_DETECTION_TILE_SIZE": config.tile_size >= 512,
            "OCR_RETRY_TILE_SIZE": 512 <= config.retry_tile_size <= config.tile_size,
            "OCR_DETECTION_TILE_OVERLAP": 0 <= config.tile_overlap < 0.5,
            "OCR_SOURCE_MAX_PIXELS": config.source_max_pixels >= 1_000_000,
            "OCR_CROP_PADDING_RATIO": 0 <= config.crop_padding_ratio <= 0.5,
            "OCR_REVIEW_CONFIDENCE": 0 <= config.review_confidence <= 1,
            "PDF_PAGE_OCR_TIMEOUT_SECONDS": config.page_timeout_seconds > 0,
            "PDF_PAGE_MAX_ATTEMPTS": config.page_max_attempts in {1, 2},
        }
        invalid = [name for name, valid in checks.items() if not valid]
        if invalid:
            raise ValueError(f"非法 OCR 配置：{', '.join(invalid)}")
        if not config.device.startswith(("gpu", "cpu")):
            raise ValueError("OCR_DEVICE 必须是 gpu:<index> 或 cpu")
        return config
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `cd ocr-service; python -m unittest tests.test_ocr_config -v`

Expected: 2 tests PASS.

```powershell
git add ocr-service/app/ocr_config.py ocr-service/tests/test_ocr_config.py
git commit -m "feat(ocr): validate accuracy and resource settings"
```

### Task 2: GPU environment and runtime readiness

**Files:**
- Create: `ocr-service/app/gpu_runtime.py`
- Create: `ocr-service/scripts/install_gpu.ps1`
- Create: `ocr-service/tests/test_gpu_runtime.py`
- Modify: `ocr-service/requirements.txt`

- [ ] **Step 1: Write failing GPU validation tests**

```python
# tests/test_gpu_runtime.py
import unittest
from unittest.mock import Mock

from app.gpu_runtime import inspect_gpu_runtime


class GpuRuntimeTests(unittest.TestCase):
    def test_cpu_wheel_is_not_ready_for_gpu(self) -> None:
        paddle = Mock(__version__="3.3.1")
        paddle.device.is_compiled_with_cuda.return_value = False
        state = inspect_gpu_runtime("gpu:0", paddle)
        self.assertFalse(state.ready)
        self.assertIn("CUDA", state.error)

    def test_visible_gpu_is_ready(self) -> None:
        paddle = Mock(__version__="3.3.1")
        paddle.device.is_compiled_with_cuda.return_value = True
        paddle.device.cuda.device_count.return_value = 1
        state = inspect_gpu_runtime("gpu:0", paddle)
        self.assertTrue(state.ready)
        self.assertEqual(state.device, "gpu:0")
```

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_gpu_runtime -v`

Expected: FAIL because `app.gpu_runtime` does not exist.

- [ ] **Step 3: Implement runtime inspection without loading OCR models**

```python
# app/gpu_runtime.py
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GpuRuntimeState:
    ready: bool
    device: str
    paddle_version: str
    error: str | None = None


def inspect_gpu_runtime(device: str, paddle_module: Any) -> GpuRuntimeState:
    version = str(paddle_module.__version__)
    if device == "cpu":
        return GpuRuntimeState(True, device, version)
    if not paddle_module.device.is_compiled_with_cuda():
        return GpuRuntimeState(False, device, version, "Paddle 不是 CUDA 构建")
    index = int(device.split(":", 1)[1])
    if paddle_module.device.cuda.device_count() <= index:
        return GpuRuntimeState(False, device, version, f"GPU {index} 不可见")
    return GpuRuntimeState(True, device, version)
```

- [ ] **Step 4: Add a deterministic GPU install script**

```powershell
# scripts/install_gpu.ps1
$ErrorActionPreference = "Stop"
$PythonExe = if ($args.Count) { $args[0] } else { "python" }
& $PythonExe -m pip uninstall -y paddlepaddle paddlepaddle-gpu
& $PythonExe -m pip install "paddlepaddle-gpu==3.3.1" --index-url "https://www.paddlepaddle.org.cn/packages/stable/cu129/"
& $PythonExe -c "import paddle; assert paddle.device.is_compiled_with_cuda(); assert paddle.device.cuda.device_count() > 0; paddle.set_device('gpu:0'); print(paddle.__version__, paddle.device.get_device())"
```

Keep `paddleocr==3.7.0` in `requirements.txt`, but replace the unconditional `paddlepaddle==3.3.1` line with this comment so a later `pip install -r` cannot reinstall the CPU wheel:

```text
# Paddle is platform-specific. Run scripts/install_gpu.ps1 before installing this file.
paddleocr==3.7.0
```

- [ ] **Step 5: Verify tests, install the wheel, and record the hardware check**

Run:

```powershell
cd ocr-service
python -m unittest tests.test_gpu_runtime -v
powershell -ExecutionPolicy Bypass -File scripts/install_gpu.ps1 D:\ProgramData\anaconda3\envs\python11\python.exe
D:\ProgramData\anaconda3\envs\python11\python.exe -c "import paddle; print(paddle.device.is_compiled_with_cuda(), paddle.device.cuda.device_count(), paddle.device.get_device())"
```

Expected: tests PASS; final command prints `True`, a count of at least `1`, and a CUDA-capable device. If the cu129 wheel cannot execute on the RTX 5070 Ti, stop here and test the Paddle 3.4.0 cu129 wheel in an isolated conda environment; do not continue with a CPU fallback because the approved design requires GPU readiness.

- [ ] **Step 6: Commit**

```powershell
git add ocr-service/app/gpu_runtime.py ocr-service/scripts/install_gpu.ps1 ocr-service/tests/test_gpu_runtime.py ocr-service/requirements.txt
git commit -m "build(ocr): provision and validate Paddle GPU runtime"
```

### Task 3: Bounded page geometry and box fusion

**Files:**
- Create: `ocr-service/app/page_geometry.py`
- Create: `ocr-service/tests/test_page_geometry.py`

- [ ] **Step 1: Write failing geometry tests**

```python
# tests/test_page_geometry.py
import unittest

from app.page_geometry import Box, detection_scale, fuse_boxes, make_tiles


class PageGeometryTests(unittest.TestCase):
    def test_detection_scale_never_exceeds_max_side(self) -> None:
        self.assertAlmostEqual(detection_scale(3284, 4800, 3200), 2 / 3)

    def test_tiles_cover_edges_with_overlap(self) -> None:
        tiles = make_tiles(5000, 3000, size=2048, overlap=0.20)
        self.assertEqual(tiles[0], Box(0, 0, 2048, 2048))
        self.assertEqual(max(tile.x2 for tile in tiles), 5000)
        self.assertEqual(max(tile.y2 for tile in tiles), 3000)

    def test_fusion_prefers_complete_containing_column(self) -> None:
        complete = Box(100, 50, 220, 900, score=0.82, source="full")
        fragment = Box(105, 100, 215, 600, score=0.95, source="tile:0")
        self.assertEqual(fuse_boxes([fragment, complete]), [complete])
```

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_page_geometry -v`

Expected: FAIL because `app.page_geometry` does not exist.

- [ ] **Step 3: Implement pure geometry primitives**

Implement `Box` as a frozen dataclass with `width`, `height`, `area`, `intersection`, `iou`, `contains_ratio`, `translate`, `scale`, `clamp`, and `pad(ratio, min_pixels, bounds)`. Implement:

```python
def detection_scale(width: int, height: int, max_side: int) -> float:
    return min(1.0, max_side / max(width, height))


def axis_starts(length: int, size: int, overlap: float) -> list[int]:
    if length <= size:
        return [0]
    stride = max(1, int(round(size * (1 - overlap))))
    starts = list(range(0, length - size + 1, stride))
    if starts[-1] != length - size:
        starts.append(length - size)
    return starts


def make_tiles(width: int, height: int, *, size: int, overlap: float) -> list[Box]:
    return [Box(x, y, min(x + size, width), min(y + size, height), source=f"tile:{i}")
            for i, (y, x) in enumerate((y, x) for y in axis_starts(height, size, overlap)
                                      for x in axis_starts(width, size, overlap))]
```

`fuse_boxes()` must first remove boxes contained at least 90% by a larger box, then merge vertical fragments only when their horizontal-center difference is at most 25% of the larger width, horizontal overlap is at least 70%, and vertical gap is at most 15% of the larger height. Sort the result by horizontal center descending for ancient right-to-left order.

- [ ] **Step 4: Add round-trip and padding boundary tests, then verify GREEN**

Add tests proving tile-local → detection-page → PDF-page coordinates round-trip within `0.01`, and padding never produces negative/out-of-page coordinates.

Run: `cd ocr-service; python -m unittest tests.test_page_geometry -v`

Expected: all geometry tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add ocr-service/app/page_geometry.py ocr-service/tests/test_page_geometry.py
git commit -m "feat(ocr): bound page geometry and fuse tiled detections"
```

### Task 4: Candidate preprocessing and low-confidence review

**Files:**
- Modify: `ocr-service/app/ancient_image_processing.py`
- Create: `ocr-service/app/recognition_review.py`
- Create: `ocr-service/tests/test_recognition_review.py`

- [ ] **Step 1: Write failing review tests**

```python
from app.recognition_review import Candidate, choose_candidate, needs_review


def test_low_confidence_requests_three_strategies():
    assert needs_review(0.79, threshold=0.80)


def test_candidate_choice_penalizes_replacement_characters():
    bad = Candidate("原始", "天�地", 0.92)
    good = Candidate("autocontrast", "天地", 0.89)
    selected, manual = choose_candidate([bad, good])
    assert selected == good
    assert manual is False
```

Use `unittest.TestCase` assertions if pytest is unavailable.

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_recognition_review -v`

Expected: FAIL because `app.recognition_review` does not exist.

- [ ] **Step 3: Implement three preprocessing strategies and deterministic scoring**

Add `prepare_review_variants(image)` returning exactly `original`, `autocontrast`, and `local_contrast`. Use Pillow for the first two and `ImageFilter.UnsharpMask(radius=2, percent=120, threshold=3)` plus contrast `1.25` for the third; do not add OpenCV.

Implement immutable `Candidate(strategy, text, score)` and score it as:

```python
def candidate_rank(candidate: Candidate) -> float:
    text = normalize_ancient_text(candidate.text.strip())
    printable = sum(char.isprintable() and char != "�" for char in text)
    bad = text.count("�") + sum(ord(char) < 32 and char not in "\n\t" for char in text)
    return candidate.score + min(printable, 40) * 0.002 - bad * 0.25
```

`choose_candidate()` returns the best candidate and sets `needsReview=True` when the two best ranks differ by less than `0.03` but their normalized texts differ.

- [ ] **Step 4: Verify and commit**

Run: `cd ocr-service; python -m unittest tests.test_recognition_review -v`

Expected: all review tests PASS.

```powershell
git add ocr-service/app/ancient_image_processing.py ocr-service/app/recognition_review.py ocr-service/tests/test_recognition_review.py
git commit -m "feat(ocr): review low-confidence ancient text candidates"
```

### Task 5: Split ancient detection from crop recognition

**Files:**
- Modify: `ocr-service/app/ancient_ocr_engine.py`
- Modify: `ocr-service/app/ocr_engine.py`
- Modify: `ocr-service/app/routers/ocr.py`
- Create: `ocr-service/tests/test_ancient_ocr_engine_contract.py`

- [ ] **Step 1: Write a failing engine contract test with fake Paddle predictors**

```python
class FakeDetection:
    def predict(self, *, input, batch_size):
        return [FakeResult({"res": {"dt_polys": [[[1, 2], [8, 2], [8, 20], [1, 20]]],
                                            "dt_scores": [0.91]}})]


class FakeRecognition:
    def predict(self, *, input, batch_size):
        return [FakeResult({"res": {"rec_text": "天地", "rec_score": 0.93}})]


def test_engine_exposes_detection_and_crop_recognition(self):
    engine = AncientOcrEngine(detector=FakeDetection(), recognizer=FakeRecognition())
    boxes = engine.detect(np.zeros((30, 20, 3), dtype=np.uint8), source="full")
    result = engine.recognize_crop(np.zeros((30, 20, 3), dtype=np.uint8))
    self.assertEqual(boxes[0].source, "full")
    self.assertEqual(result, {"text": "天地", "score": 0.93})
```

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_ancient_ocr_engine_contract -v`

Expected: FAIL because the constructor cannot inject predictors and the methods do not exist.

- [ ] **Step 3: Refactor model construction and APIs**

Change `AncientOcrEngine.__init__` to accept `device="gpu:0"`, `detector=None`, and `recognizer=None`. Construct Paddle predictors only when the injected object is `None`. Use the configured device in both predictors. Move the existing detector parsing into `detect(image_bgr, source) -> list[Box]`; move one-crop recognition into `recognize_crop(crop_bgr) -> dict[str, object]`.

Remove the module-level `ancient_ocr_engine = AncientOcrEngine()` and the equivalent eager `ocr_engine = OcrEngine()`. In `routers/ocr.py`, add `@lru_cache(maxsize=1)` factory functions keyed by `OcrConfig.from_env().device`; image endpoints call the factories inside the request instead of importing initialized models.

- [ ] **Step 4: Preserve the existing image endpoint behavior**

Keep `AncientOcrEngine.recognize(image_path)` as a compatibility wrapper composed from `detect()` and `recognize_crop()`. Run:

`cd ocr-service; python -m unittest tests.test_ancient_ocr_engine_contract tests.test_ancient_text_postprocessing tests.test_pdf_task_api -v`

Expected: all tests PASS and importing `app.routers.ocr` does not print model initialization messages.

- [ ] **Step 5: Commit**

```powershell
git add ocr-service/app/ancient_ocr_engine.py ocr-service/app/ocr_engine.py ocr-service/app/routers/ocr.py ocr-service/tests/test_ancient_ocr_engine_contract.py
git commit -m "refactor(ocr): separate text detection from crop recognition"
```

### Task 6: Bounded high-accuracy page pipeline

**Files:**
- Create: `ocr-service/app/page_ocr_pipeline.py`
- Create: `ocr-service/tests/test_page_ocr_pipeline.py`

- [ ] **Step 1: Write a failing bounded-render test**

Build a synthetic `5000 × 9000` PDF page and inject a fake engine that records detector inputs and returns one known box. Assert:

```python
result = recognize_pdf_page(pdf_path, 0, config, engine=fake_engine)
self.assertLessEqual(max(max(shape[:2]) for shape in fake_engine.detect_shapes), 3200)
self.assertGreater(len(fake_engine.detect_shapes), 1)  # full page plus tiles
self.assertEqual(result["items"][0]["text"], "天地")
self.assertIn("sourceBox", result["items"][0])
self.assertIn("candidates", result["items"][0])
```

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_page_ocr_pipeline -v`

Expected: FAIL because `app.page_ocr_pipeline` does not exist.

- [ ] **Step 3: Implement the page pipeline with an explicit rendering seam**

Implement `recognize_pdf_page(pdf_path, page_index, config, engine=None, attempt=1)`. It must:

1. Open only the requested page.
2. Render an RGB detection image whose longest edge is `config.full_page_max_side`.
3. Run full-page detection and sequential `make_tiles()` detection; use `config.retry_tile_size` when `attempt > 1`.
4. Map all boxes to PDF coordinates and call `fuse_boxes()`.
5. If the estimated full source render is within `source_max_pixels`, render it once; otherwise render each padded PDF clip separately with PyMuPDF `clip=`.
6. Call `is_red_stamp()` before recognition.
7. Run the primary crop; below `review_confidence`, run exactly three variants and `choose_candidate()`.
8. Release each crop before the next box.
9. Return JSON-serializable `text`, `items`, and `metrics`.

Each item must retain compatible `text`, `score`, and `box` fields plus `sourceBox`, `strategy`, `candidates`, `needsReview`, and `detectionSource`.

- [ ] **Step 4: Add the extreme-pixel-budget test**

Patch the render helper and assert no call requests an entire bitmap above `source_max_pixels`; assert high-resolution `clip` calls are made for each fused box instead. Also assert one failed crop is reported with its box and does not retain a NumPy array in the returned object.

- [ ] **Step 5: Verify and commit**

Run: `cd ocr-service; python -m unittest tests.test_page_geometry tests.test_recognition_review tests.test_page_ocr_pipeline -v`

Expected: all tests PASS.

```powershell
git add ocr-service/app/page_ocr_pipeline.py ocr-service/tests/test_page_ocr_pipeline.py
git commit -m "feat(ocr): add bounded high-accuracy PDF page pipeline"
```

### Task 7: Isolate every page in a child process

**Files:**
- Create: `ocr-service/app/page_ocr_child.py`
- Create: `ocr-service/app/page_process_runner.py`
- Create: `ocr-service/tests/fixtures/page_child_fixture.py`
- Create: `ocr-service/tests/test_page_process_runner.py`

- [ ] **Step 1: Write failing runner tests for success, crash, timeout, and malformed output**

Use a fixture child selected by `PAGE_CHILD_MODE` that atomically writes success JSON, calls `os._exit(7)`, sleeps, or writes invalid JSON. Assert `run_page_process()` returns a typed success for the first and raises `PageProcessError` with codes `child_exit`, `timeout`, and `invalid_result` for the others. For timeout, assert the child PID no longer exists after the call.

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_page_process_runner -v`

Expected: FAIL because runner modules do not exist.

- [ ] **Step 3: Implement the child JSON protocol**

`page_ocr_child.py` accepts `--pdf`, `--page-index`, `--attempt`, `--result`, and `--heartbeat`. It loads `OcrConfig`, validates GPU runtime, updates the heartbeat file before model initialization and between pipeline stages, calls `recognize_pdf_page()`, writes JSON to `<result>.tmp`, flushes/fsyncs it, then `os.replace()` atomically. It never touches SQLite.

- [ ] **Step 4: Implement parent supervision**

Use `asyncio.create_subprocess_exec(sys.executable, "-m", "app.page_ocr_child", ...)`, not `multiprocessing`, so Windows native exit codes are observable. `run_page_process()` must capture the last 20 KB of stdout/stderr, enforce `config.page_timeout_seconds`, terminate then kill after a 5-second grace period, validate the result schema, and always delete the temporary result/heartbeat directory.

Return a `PageProcessResult(text, items, metrics, exit_code)` dataclass. Raise `PageProcessError(code, message, exit_code, stderr_tail, heartbeat_at)` with no Paddle objects crossing the process boundary.

- [ ] **Step 5: Verify and commit**

Run: `cd ocr-service; python -m unittest tests.test_page_process_runner -v`

Expected: all four modes PASS and no fixture process remains.

```powershell
git add ocr-service/app/page_ocr_child.py ocr-service/app/page_process_runner.py ocr-service/tests/fixtures/page_child_fixture.py ocr-service/tests/test_page_process_runner.py
git commit -m "feat(ocr): isolate PDF page inference in supervised processes"
```

### Task 8: Connect page retries and persistence

**Files:**
- Modify: `ocr-service/app/pdf_task_repository.py`
- Modify: `ocr-service/app/pdf_task_worker.py`
- Modify: `ocr-service/tests/test_pdf_task_repository.py`
- Modify: `ocr-service/tests/test_pdf_task_worker.py`

- [ ] **Step 1: Write failing automatic-retry tests**

Add a worker test whose injected runner raises `PageProcessError("child_exit", ...)` on attempt 1 and succeeds on attempt 2. Assert calls are `[1, 2]`, the page completes, and the task completes. Add another test that fails twice and asserts the page/task are failed with a message containing the error code and exit code.

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_pdf_task_worker -v`

Expected: FAIL because the worker has no page runner retry seam.

- [ ] **Step 3: Add page-attempt state without prematurely failing the task**

Add repository method:

```python
def reset_page_for_retry(self, task_id: str, page_number: int, error: str) -> None:
    now = self._utc_now()
    with self._connection() as connection:
        connection.execute(
            "UPDATE pdf_task_pages SET status='pending', error=?, completed_at=NULL "
            "WHERE task_id=? AND page_number=? AND status!='completed'",
            (error, task_id, page_number),
        )
        connection.execute(
            "UPDATE pdf_tasks SET heartbeat_at=?, updated_at=? WHERE task_id=?",
            (now, now, task_id),
        )
```

- [ ] **Step 4: Replace in-process page OCR with the runner**

Keep PDF page-count initialization in the parent. For each incomplete page, loop from its persisted `attempt_count + 1` through `config.page_max_attempts`, call `mark_page_processing()`, then `run_page_process()`. On a retryable error call `reset_page_for_retry()`; only the final error calls `fail_page_and_task()`. A successful result calls existing `complete_page()` and preserves extended item JSON.

Remove `asyncio.wait_for(recognizer(...))`; the subprocess timeout is now the only authoritative page timeout. Keep an injectable async runner argument so unit tests never load Paddle.

- [ ] **Step 5: Verify recovery and commit**

Run: `cd ocr-service; python -m unittest tests.test_pdf_task_repository tests.test_pdf_task_worker -v`

Expected: all persistence, resume, retry, and final-failure tests PASS.

```powershell
git add ocr-service/app/pdf_task_repository.py ocr-service/app/pdf_task_worker.py ocr-service/tests/test_pdf_task_repository.py ocr-service/tests/test_pdf_task_worker.py
git commit -m "feat(ocr): persist supervised page retries"
```

### Task 9: Liveness, readiness, documentation, and acceptance

**Files:**
- Modify: `ocr-service/app/main.py`
- Modify: `ocr-service/app/routers/health.py`
- Modify: `ocr-service/app/schemas.py`
- Modify: `ocr-service/tests/test_pdf_task_api.py`
- Create: `ocr-service/scripts/validate_real_pdf.py`
- Modify: `ocr-service/README.md`

- [ ] **Step 1: Write failing liveness/readiness API tests**

Patch `app.state.ocr_runtime` with ready and non-ready states. Assert `/health/live` always returns 200 while `/health/ready` returns 200 only when GPU validation passed and the queue worker task is alive; otherwise it returns 503 with the precise error. Preserve `/health` as a compatibility alias for liveness.

- [ ] **Step 2: Run and verify RED**

Run: `cd ocr-service; python -m unittest tests.test_pdf_task_api -v`

Expected: FAIL with 404 for the new endpoints.

- [ ] **Step 3: Implement health state without initializing models in the API process**

At lifespan startup, parse `OcrConfig`, call `inspect_gpu_runtime()`, store its result on `app.state.ocr_runtime`, then start the SQLite queue. Readiness checks both runtime state and `queue.worker_task is not None and not queue.worker_task.done()`. Do not perform model warmup in the API process; add a `--probe` option to `page_ocr_child` that constructs both models and performs a tiny synthetic inference, and run that probe once from lifespan with a bounded 120-second subprocess timeout. Store probe failure in readiness and do not accept task creation while not ready.

- [ ] **Step 4: Add a real-PDF acceptance script**

`scripts/validate_real_pdf.py` accepts a PDF path and optional page number, calls the same supervised runner, prints elapsed time, item count, review count, peak metrics, and writes a UTF-8 JSON report beside the input. It exits nonzero on crash, timeout, CUDA OOM, empty result, any detector input above 3200, or source render above the configured pixel budget.

Run against the known file:

```powershell
cd ocr-service
D:\ProgramData\anaconda3\envs\python11\python.exe scripts/validate_real_pdf.py data/pdf-tasks/9d7a6c17-a876-4bf1-baef-2b7042363f3a/source.pdf --page 1
```

Expected: exit code 0, nonempty text/items, no native process crash, detector max side at most 3200, and a JSON report containing candidate/strategy metadata.

- [ ] **Step 5: Document exact production commands and settings**

Document the GPU installer, all nine environment variables, `/health/live`, `/health/ready`, and this only supported long-task launch command:

```powershell
D:\ProgramData\anaconda3\envs\python11\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1
```

State explicitly that `--reload` and multiple workers are unsupported for long OCR tasks.

- [ ] **Step 6: Run the complete verification suite**

```powershell
cd ocr-service
D:\ProgramData\anaconda3\envs\python11\python.exe -m compileall -q app tests scripts
D:\ProgramData\anaconda3\envs\python11\python.exe -m unittest discover -s tests -v
```

Expected: compile command exits 0 and all tests PASS. While the real page runs, request `/health/live`, `/health/ready`, and the task status endpoint; each must respond within 2 seconds.

- [ ] **Step 7: Commit the operational contract**

```powershell
git add ocr-service/app/main.py ocr-service/app/routers/health.py ocr-service/app/schemas.py ocr-service/tests/test_pdf_task_api.py ocr-service/scripts/validate_real_pdf.py ocr-service/README.md
git commit -m "feat(ocr): expose GPU readiness and validate real PDF pages"
```

### Task 10: Final accuracy and resource baseline

**Files:**
- Create: `ocr-service/tests/fixtures/accuracy/manifest.json`
- Create: `ocr-service/scripts/accuracy_baseline.py`
- Create: `ocr-service/docs/accuracy-baseline.md`

- [ ] **Step 1: Create the reviewed fixture manifest**

Add entries for at least five representative pages covering small text, faded ink, red stamps, edge text, and a column crossing a tile boundary. Each entry contains `pdf`, `page`, `expectedText`, and `excludedStampText`. Use only manually verified transcriptions; do not use the current OCR output as ground truth.

- [ ] **Step 2: Implement deterministic accuracy reporting**

The script runs the supervised page process, calculates character error rate with a local Levenshtein implementation, checks excluded stamp text, counts duplicate normalized boxes, and records elapsed time plus peak CPU/GPU metrics. Compare it with a `--baseline-json` from the old 1.0-scale pipeline when supplied.

- [ ] **Step 3: Run and enforce acceptance thresholds**

Run:

```powershell
cd ocr-service
python scripts/accuracy_baseline.py tests/fixtures/accuracy/manifest.json --output docs/accuracy-baseline.md
```

Expected: every page completes; no excluded stamp text; zero duplicate columns; aggregate character accuracy is not below the recorded 1.0-scale baseline. Treat missing manually verified fixture pages as a release blocker, not as skipped tests.

- [ ] **Step 4: Commit the reproducible baseline**

```powershell
git add ocr-service/tests/fixtures/accuracy/manifest.json ocr-service/scripts/accuracy_baseline.py ocr-service/docs/accuracy-baseline.md
git commit -m "test(ocr): establish high-accuracy PDF baseline"
```

