# PDF OCR SQLite 持久化与自动续跑设计

## 背景

当前 PDF OCR 任务保存在 `PdfTaskStore.tasks` 内存字典中，PDF 与页面图片位于系统临时目录，任务通过 FastAPI `BackgroundTasks` 在 Web 工作进程内执行。该实现产生三个直接问题：

1. Uvicorn reload、服务崩溃或机器重启后，任务状态与结果全部丢失。
2. 已完成页面没有独立持久化，任务只能整份重新执行。
3. 客户端只能消费 SSE 事件，无法可靠查询当前状态；SSE 断线后历史事件也无法重放。

本设计将任务元数据与逐页结果持久化到本地 SQLite，并用单后台消费者串行执行任务。服务启动时自动恢复未完成任务，从首个未成功页面继续。

## 目标

- PDF 任务在服务重启后仍可查询。
- `queued` 或中断于 `processing` 的任务在启动后自动续跑。
- 每页成功后立即提交结果，已成功页面不重复 OCR。
- 提供普通 HTTP 状态查询接口，不依赖 SSE 判断任务状态。
- SSE 断线重连后可立即获得数据库中的最新快照，并继续接收进度。
- 同一时间只允许一个 PDF 页面进入 OCR，避免争用全局 PaddleOCR 模型。
- PDF 文件存放在服务管理的固定目录，不依赖系统临时文件生命周期。

## 非目标

- 不引入 Redis、Celery 或外部数据库。
- 不支持多台 OCR 服务共享一个任务队列。
- 本阶段不实现任务取消、优先级、定时清理 UI 或多进程并发执行。
- 本阶段不改变单页 OCR 的识别算法与文本后处理规则。

## 总体架构

新增四个清晰边界：

1. `PdfTaskRepository`：SQLite 数据访问，负责事务、任务状态和逐页结果。
2. `PdfTaskQueue`：进程内唤醒机制。数据库是真实队列，`asyncio.Event` 仅用于减少轮询延迟。
3. `PdfTaskWorker`：单消费者循环，从数据库领取任务并逐页处理。
4. PDF 任务路由：创建、查询、重试与 SSE 展示，不直接执行长任务。

数据流：

```text
POST /ocr/pdf/tasks
  -> 保存 PDF 到 data/pdf-tasks/<task-id>/source.pdf
  -> SQLite 插入 queued 任务及页面占位记录
  -> 唤醒 worker
  -> 202 返回任务快照

worker
  -> 原子领取 queued 任务，置 processing
  -> 找到首个非 completed 页面
  -> 渲染该页并执行 OCR
  -> 单事务保存页面文本/项目并更新 processed_pages、heartbeat_at
  -> 下一页
  -> 汇总页面文本，置 completed

服务启动
  -> processing 任务重置为 queued
  -> 启动单 worker
  -> 自动继续所有 queued 任务
```

## 文件与数据库位置

默认数据根目录为 `ocr-service/data`，可通过 `OCR_DATA_DIR` 覆盖：

```text
ocr-service/data/
  pdf_tasks.sqlite3
  pdf-tasks/
    <task-id>/
      source.pdf
```

页面 PNG 仍使用短生命周期临时文件，并在每页成功或失败后删除。源 PDF 在任务完成后保留，以支持审计与手动重试；清理策略留给后续功能。

## SQLite 模型

### `pdf_tasks`

- `task_id TEXT PRIMARY KEY`
- `filename TEXT NOT NULL`
- `ocr_type TEXT NOT NULL CHECK (ocr_type IN ('normal', 'ancient'))`
- `pdf_path TEXT NOT NULL`
- `status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed'))`
- `page_count INTEGER NOT NULL DEFAULT 0`
- `processed_pages INTEGER NOT NULL DEFAULT 0`
- `progress REAL NOT NULL DEFAULT 0`
- `error TEXT`
- `full_text TEXT NOT NULL DEFAULT ''`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `started_at TEXT`
- `heartbeat_at TEXT`
- `completed_at TEXT`
- `attempt_count INTEGER NOT NULL DEFAULT 0`

### `pdf_task_pages`

- `task_id TEXT NOT NULL REFERENCES pdf_tasks(task_id) ON DELETE CASCADE`
- `page_number INTEGER NOT NULL`
- `status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed'))`
- `text TEXT NOT NULL DEFAULT ''`
- `items_json TEXT NOT NULL DEFAULT '[]'`
- `error TEXT`
- `started_at TEXT`
- `completed_at TEXT`
- `attempt_count INTEGER NOT NULL DEFAULT 0`
- 主键：`(task_id, page_number)`

SQLite 连接启用 WAL、foreign keys 和合理的 busy timeout。每次数据库操作使用短连接或受控连接，不让长时间 OCR 持有事务。任何任务状态、进度或错误变化都同步刷新 `updated_at`，供查询接口与 SSE 检测变化。

## 状态与恢复语义

任务状态迁移：

```text
queued -> processing -> completed
                   \-> failed
failed -> queued（显式重试）
processing -> queued（服务启动恢复）
```

页面状态迁移：

```text
pending -> processing -> completed
                    \-> failed
processing -> pending（服务启动恢复）
failed -> pending（显式重试）
```

启动恢复在同一事务中完成：所有任务 `processing -> queued`，其页面 `processing -> pending`。已为 `completed` 的页面保持不变。Worker 按 `created_at` 领取最早的 queued 任务，从最小的非 completed 页继续。

“首个未完成页继续”不意味着要求页面连续。Worker 跳过所有 completed 页面并处理其余页面，避免异常数据导致重复执行。

## API 设计

### 创建任务

`POST /ocr/pdf/tasks?ocr_type=ancient`

- 验证 MIME、OCR 类型与非空 PDF。
- 先生成 task ID 和任务目录，再流式写入 `source.pdf`。
- 成功写盘后创建数据库记录并唤醒 worker。
- 返回 HTTP `202 Accepted` 和任务快照。
- 写盘或入库失败时清理已创建的任务目录。

### 查询任务

`GET /ocr/pdf/tasks/{task_id}`

返回：

- task ID、文件名、OCR 类型与状态
- 页数、已完成页数、百分比
- created/started/heartbeat/completed 时间
- error
- completed 时返回 `text`
- 页面摘要列表，包括页码、状态、错误；默认不在状态响应中返回庞大的 items

任务不存在返回 404。该接口只访问 SQLite，不等待 OCR 推理锁。

### 重试任务

`POST /ocr/pdf/tasks/{task_id}/retry`

- 仅允许 `failed` 任务。
- 保留 completed 页面，将 failed/processing 页面重置为 pending。
- 清空任务错误，置 queued，唤醒 worker。
- 返回 HTTP 202。

### SSE

`GET /ocr/pdf/tasks/{task_id}/events`

- 建连后首先发送 `snapshot`，内容来自 SQLite。
- 此后定时读取任务 `updated_at`/状态；变化时发送 `progress` 快照。
- completed 或 failed 时发送终态事件并关闭。
- 无变化时每 15 秒发送 heartbeat。
- SSE 不再消费一次性内存队列，因此多客户端和重连不会丢状态。

## Worker 与超时

应用 lifespan 启动一个 worker task，关闭时设置 stop event 并等待当前协程安全退出。Worker 每次只处理一个任务。

每页流程：

1. 页面置 processing，并刷新任务 heartbeat。
2. PyMuPDF 渲染到临时 PNG。
3. 在线程池运行相应 OCR 引擎。
4. 识别成功后，用一个事务写入页面结果并更新任务进度。
5. 删除临时 PNG。

每页等待超时由 `PDF_PAGE_OCR_TIMEOUT_SECONDS` 配置，默认 600 秒。鉴于 Python 线程中的原生 Paddle 推理不能被可靠强制终止，`asyncio.wait_for` 只能使等待方超时，不能杀掉底层推理线程。因此本阶段记录超时并将任务失败，但“原生推理永久卡死”仍需进程级隔离才能彻底解决。为避免把状态接口一起拖死，HTTP 状态查询只做 SQLite I/O；生产启动禁止 `--reload`。后续若仍出现 Paddle 原生卡死，应将每页 OCR 移入独立子进程并在超时后终止子进程。

## 一致性与错误处理

- 任务创建使用“文件原子落盘后入库”。上传先写 `.uploading`，完成后 `os.replace` 为 `source.pdf`。
- 页面结果和任务计数同事务提交，避免页面成功但进度未更新。
- `processed_pages` 始终由 completed 页面计数计算，不盲目递增。
- 完成全文按页码从数据库重新汇总，避免重启前后的内存列表不一致。
- 找不到源 PDF 时任务置 failed，并记录明确错误。
- PDF 无页面、损坏或加密不可读时任务置 failed。
- 服务启动时不自动重试 failed 任务，避免错误文件无限循环。

## 测试策略

单元测试使用临时目录和临时 SQLite：

- 创建任务可在新 repository 实例中重新读取。
- processing 任务和页面经过 recovery 后正确回到 queued/pending。
- completed 页面在恢复和重试时不被重置。
- 页面完成事务正确更新 processed_pages、progress 与全文排序。
- worker 从首个未完成页继续，已完成页不调用 OCR。
- 任务失败保存错误；retry 只允许 failed。
- 状态序列化不泄漏本地 PDF 路径。

API 测试覆盖创建返回 202、查询、404、重试约束和 SSE 首个 snapshot。OCR 引擎在 worker 测试中使用注入的轻量假实现，不加载 Paddle 模型。

## 运维约束

- 开发中可使用 reload 调整普通接口，但运行长 PDF 任务时必须关闭 reload。
- SQLite 和 `pdf-tasks` 目录应纳入备份，但不提交 Git。
- 单机只启动一个应用 worker；若启动多个 Uvicorn worker，需要增加数据库领取租约与跨进程并发控制，本设计暂不支持。
- 健康检查后续应区分 `live` 与 `ready`；本次保证任务查询不依赖 OCR 锁，但不扩展健康接口协议。

## 验收标准

1. 创建多页 PDF 任务，完成至少一页后重启服务，任务自动从未完成页继续。
2. 重启前已完成页面的 OCR 调用次数不增加。
3. 任意时刻可通过 GET 状态接口读取进度，SSE 断线不影响任务。
4. 完成结果按页码正确合并，并在重启后仍可查询。
5. failed 任务可显式重试，成功页面不重复处理。
6. 全量测试和 Python 编译检查通过。
