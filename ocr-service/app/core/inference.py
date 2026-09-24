import asyncio
from collections.abc import Callable
from typing import Any, TypeVar

from starlette.concurrency import run_in_threadpool


T = TypeVar("T")

# Paddle 模型实例是全局复用的，不让多个请求同时进入同一个模型。
inference_lock = asyncio.Lock()


async def run_locked_inference(
    operation: Callable[..., T],
    *args: Any,
) -> T:
    """在线程池中执行同步 OCR，并串行保护 Paddle 模型。"""
    async with inference_lock:
        return await run_in_threadpool(operation, *args)
