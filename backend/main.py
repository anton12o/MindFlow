from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, engine
from routers import inbox, habitos, rotina, pomodoro, notas, flashcards, tipos, queries
from models import TemplateNota, TipoObjeto
from sqlmodel import Session, select

app = FastAPI(title="MindFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inbox.router, prefix="/api/inbox", tags=["Inbox"])
app.include_router(habitos.router, prefix="/api/habitos", tags=["Hábitos"])
app.include_router(rotina.router, prefix="/api/rotina", tags=["Rotina"])
app.include_router(pomodoro.router, prefix="/api/pomodoro", tags=["Pomodoro"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(tipos.router, prefix="/api/tipos", tags=["Tipos"])
app.include_router(queries.router, prefix="/api/queries", tags=["Queries"])

TEMPLATES_PADRAO = [
    {"nome": "Resumo de Aula", "descricao": "Estrutura para resumir aulas e palestras",
     "conteudo": "# {{titulo}}\n\n**Data:** {{data}}\n\n## Pontos principais\n- \n\n## Dúvidas\n- \n\n## Ações\n- [ ] "},
    {"nome": "Reunião", "descricao": "Pauta, decisões e próximos passos",
     "conteudo": "# {{titulo}} — {{data}}\n\n**Presentes:**\n\n**Pauta:**\n1. \n\n**Decisões:**\n- \n\n**Próximos passos:**\n- [ ] "},
    {"nome": "Diário Rápido", "descricao": "Registro diário de atividades e aprendizados",
     "conteudo": "# {{data}}\n\n**Hoje:**\n- Feito:\n- Pendente:\n- Aprendido:\n\n**Humor:** 😊"},
    {"nome": "Flashcard", "descricao": "Criar um flashcard manualmente",
     "conteudo": "# {{titulo}}\n\n**Pergunta:**\n\n**Resposta:**"},
    {"nome": "Projeto", "descricao": "Estrutura básica de projeto",
     "conteudo": "# {{titulo}}\n\n**Objetivo:**\n\n**Status:** ✅\n\n**Checklist:**\n- [ ] \n\n**Notas:**"},
]

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(TemplateNota).limit(1)).first()
        if not existing:
            for t in TEMPLATES_PADRAO:
                session.add(TemplateNota(**t))
            session.commit()
        tipos_existing = session.exec(select(TipoObjeto).limit(1)).first()
        if not tipos_existing:
            tipos_padrao = [
                TipoObjeto(nome="Nota", icone="📄"),
                TipoObjeto(nome="Tarefa", icone="✅"),
                TipoObjeto(nome="Projeto", icone="📋"),
                TipoObjeto(nome="Pessoa", icone="👤"),
                TipoObjeto(nome="Recurso", icone="🔗"),
            ]
            for t in tipos_padrao:
                session.add(t)
            session.commit()

@app.get("/api/health")
def health():
    return {"status": "ok"}
