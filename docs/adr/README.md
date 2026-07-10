# Architecture Decision Records (ADR)

Este diretório documenta decisões arquiteturais do MindFlow.
Cada ADR é um registro permanente de **o que foi decidido, por que, e quais as consequências.**

## Como criar um ADR

1. Copie o template abaixo
2. Numere sequencialmente (`NNN-titulo.md`)
3. Preencha: Contexto → Decisão → Consequências
4. Marque o status: `Proposto` / `Aceito` / `Depreciado` / `Substituído por NNN`

## Template

```markdown
# ADR-NNN: Título da decisão

**Status:** Proposto | Aceito | Depreciado | Substituído por NNN

**Contexto:** Qual problema estamos resolvendo? Quais as opções consideradas?

**Decisão:** O que foi escolhido e por quê?

**Consequências:** O que ganhamos? O que perdemos? Quais cuidados tomar?
```

## Índice

| ADR | Título | Status |
|-----|--------|--------|
| 001 | [SQLModel sobre SQLAlchemy puro](001-sqlmodel-vs-sqlalchemy.md) | Aceito |
| 002 | [Local-first sobre cloud](002-local-first-vs-cloud.md) | Aceito |
| 003 | [Monolito start.py](003-startpy-monolito.md) | Aceito |
