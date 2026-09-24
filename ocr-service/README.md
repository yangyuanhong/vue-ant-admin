# OCR Service

FastAPI OCR 服务，支持普通图片、古籍竖排图片，以及可恢复的 PDF OCR 后台任务。

## 启动

安装依赖后，在本目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install_gpu.ps1 D:\ProgramData\anaconda3\envs\python11\python.exe
```

默认使用 `gpu:0`。如需临时使用 CPU，可设置 `$env:OCR_DEVICE="cpu"`。

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

执行长时间 PDF OCR 时不要添加 `--reload`。文件变化触发的工作进程重启会中断当前原生 Paddle 推理；任务状态虽然会在下次启动时恢复，但正在推理的这一页必须重新处理。

服务为单机、单应用进程设计。不要设置多个 Uvicorn worker，否则多个进程可能同时运行 OCR。

PDF 的每一页会在独立子进程中识别。页面会按最长边和总像素预算自适应渲染，检测输入最长边限制为 3200；Paddle 原生崩溃、超时或显存错误只会使当前页失败，不会拖死 API 服务。

## 配置

项目根目录的 `ocr-config.json` 会在服务和页面子进程启动时自动加载，无需每次输入 PowerShell 环境变量。修改后重启服务即可生效。已有的环境变量优先于此文件；如果之前在同一个终端设置过不同值，请清除对应环境变量或打开新终端。

当前项目配置：GPU 分配比例 `0.15`、源图像素预算 `12000000`、最长边 `3000`、每页最多尝试 `1` 次（不重试）。GPU 分配比例不是整个进程显存或系统内存的硬上限。

- `OCR_DATA_DIR`：SQLite 和 PDF 文件目录，默认是项目内的 `data/`。
- `PDF_PAGE_OCR_TIMEOUT_SECONDS`：单页 OCR 等待上限，默认 `600` 秒。
- `OCR_DEVICE`：默认 `gpu:0`。
- `OCR_DETECTION_MAX_SIDE`：检测输入最长边，默认 `3200`。
- `OCR_SOURCE_MAX_SIDE`：高精度源图最长边，默认 `6000`。
- `OCR_SOURCE_MAX_PIXELS`：高精度源图像素预算，默认 `30000000`。
- `OCR_GPU_MEMORY_FRACTION`：GPU 显存上限提示，默认 `0.35`；Paddle 子进程使用 `FLAGS_fraction_of_gpu_memory_to_use` 限制实际分配。
- `PDF_PAGE_MAX_ATTEMPTS`：单页子进程失败重试次数，默认 `2`。

默认目录结构：

```text
data/
  pdf_tasks.sqlite3
  pdf-tasks/
    <task-id>/
      source.pdf
```

## PDF OCR API

创建古籍 PDF OCR 任务：

```http
POST /ocr/pdf/tasks?ocr_type=ancient
Content-Type: multipart/form-data
```

成功返回 HTTP 202。`ocr_type` 可选 `ancient` 或 `normal`。

查询任务：

```http
GET /ocr/pdf/tasks/{taskId}
```

响应包含 `status`、`pageCount`、`processedPages`、`progress`、时间信息和每页摘要。完成时 `text` 包含按页码合并的全文。该接口只读取 SQLite，不等待 OCR 推理锁。

监听进度：

```http
GET /ocr/pdf/tasks/{taskId}/events
Accept: text/event-stream
```

SSE 建连后首先返回数据库快照，断线重连不会丢失当前进度。

重试失败任务：

```http
POST /ocr/pdf/tasks/{taskId}/retry
```

仅 `failed` 任务可重试。已完成页面会被保留，其余页面重新进入队列。

## 自动恢复

任务和每页结果写入 SQLite。服务启动时会把中断的 `processing` 任务恢复为 `queued`，把正在处理的页面恢复为 `pending`，随后自动从第一个未完成页面继续。已经完成的页面不会重复 OCR。

## 测试

请使用安装了项目依赖的 Python 3.11 环境：

```powershell
python -m compileall -q app tests
python -m unittest discover -s tests -v
```
