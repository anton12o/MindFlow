import logging
import queue
from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener
from pathlib import Path

LOG_DIR = Path(__file__).parent / "data"
LOG_FILE = LOG_DIR / "mindflow.log"
MAX_BYTES = 1_048_576
BACKUP_COUNT = 3
LOG_FORMAT = "[%(asctime)s] [%(levelname)-8s] [%(name)s] %(message)s"
DATE_FORMAT = "%H:%M:%S"


def setup_logging():
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(
        str(LOG_FILE), maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT, encoding="utf-8",
    )
    file_handler.setLevel(logging.WARNING)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    root = logging.getLogger()
    log_queue = queue.Queue(-1)
    queue_handler = QueueHandler(log_queue)
    root.addHandler(queue_handler)
    listener = QueueListener(log_queue, file_handler, respect_handler_level=True)
    listener.start()
