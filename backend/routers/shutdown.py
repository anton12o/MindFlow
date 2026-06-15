import os
import signal
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/shutdown")
def shutdown():
    logger.info("Recebido pedido de encerramento via API")
    os.kill(os.getpid(), signal.SIGTERM)
    return {"ok": True}
