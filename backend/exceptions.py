import logging

from fastapi import HTTPException

logger = logging.getLogger(__name__)


class AppException(HTTPException):
    def __init__(self, status_code: int, detail: str, context: str = ""):
        super().__init__(status_code=status_code, detail=detail)
        self.context = context
        if context:
            logger.warning("[%s] %s", context, detail)


class NotFoundException(AppException):
    def __init__(self, entidade: str, context: str = ""):
        super().__init__(status_code=404, detail=f"{entidade} não encontrado(a)", context=context)


class ConflictException(AppException):
    def __init__(self, detail: str, context: str = ""):
        super().__init__(status_code=409, detail=detail, context=context)


class BadRequestException(AppException):
    def __init__(self, detail: str, context: str = ""):
        super().__init__(status_code=400, detail=detail, context=context)
