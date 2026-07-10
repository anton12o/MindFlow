import logging
import time
from collections import defaultdict

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clients: dict[str, list[float]] = defaultdict(list)

    def _cleanup(self, client_key: str):
        now = time.time()
        cutoff = now - self.window_seconds
        self._clients[client_key] = [t for t in self._clients[client_key] if t > cutoff]

    def check(self, client_key: str):
        self._cleanup(client_key)
        if len(self._clients[client_key]) >= self.max_requests:
            logger.warning("[rate_limiter] %s excedeu limite (%d/%ds)", client_key, self.max_requests, self.window_seconds)
            raise HTTPException(status_code=429, detail=f"Limite de requisições excedido. Máximo: {self.max_requests} a cada {self.window_seconds}s.")
        self._clients[client_key].append(time.time())

    def __call__(self, request: Request):
        client_key = request.client.host if request.client else "unknown"
        self.check(client_key)


search_limiter = RateLimiter(max_requests=30, window_seconds=60)
import_limiter = RateLimiter(max_requests=5, window_seconds=60)
shutdown_limiter = RateLimiter(max_requests=3, window_seconds=60)
export_limiter = RateLimiter(max_requests=10, window_seconds=60)
