# ADR-001: SQLModel sobre SQLAlchemy puro

**Status:** Aceito

**Contexto:** Precisávamos de um ORM para SQLite com suporte a FastAPI.
SQLAlchemy puro exigiria modelos separados para ORM e para Pydantic
(request/response), duplicando definições de schema.

**Decisão:** Usar SQLModel 0.0.38. Ele integra SQLAlchemy + Pydantic num
modelo único — o mesmo modelo serve para banco e para validação de API.
O `response_model` do FastAPI funciona direto sem conversão manual.

**Consequências:**
- `Literal` do Python não funciona com SQLModel 0.0.38 (`issubclass()` falha).
  Workaround: `@field_validator` na camada Pydantic com checagem manual.
- Alembic Migration: `target_metadata = SQLModel.metadata` no `env.py`.
- FKS ativas via PRAGMA: `foreign_keys = ON` em `database.py` + `migrations/env.py`.
- `exclude_unset=True` no PATCH para permitir `min_length=1` sem quebrar updates parciais.
