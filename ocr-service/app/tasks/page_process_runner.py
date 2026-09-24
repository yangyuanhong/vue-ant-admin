import asyncio
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

from app.core.config import ocr_config


class PageProcessError(RuntimeError):
    pass


async def run_page_process(pdf_path: str, page_number: int, ocr_type: str) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="pdf-ocr-page-") as temp_dir:
        output = Path(temp_dir) / "result.json"
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            "-m",
            "app.tasks.page_ocr_child",
            "--pdf", pdf_path,
            "--page", str(page_number),
            "--ocr-type", ocr_type,
            "--output", str(output),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=ocr_config.page_timeout_seconds
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise PageProcessError(
                f"第 {page_number} 页 OCR 超时（{ocr_config.page_timeout_seconds:g} 秒）"
            )
        if process.returncode != 0:
            detail = stderr.decode("utf-8", errors="replace")[-4000:]
            raise PageProcessError(
                f"第 {page_number} 页 OCR 子进程异常退出（{process.returncode}）：{detail}"
            )
        if not output.is_file():
            raise PageProcessError(f"第 {page_number} 页 OCR 未生成结果")
        return json.loads(output.read_text(encoding="utf-8"))
