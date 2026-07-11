import csv
import io
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from database import get_session
from models import (
    BlocoRotina,
    ConexaoNota,
    Flashcard,
    Habito,
    InboxItem,
    Nota,
    NotaTag,
    Pasta,
    QuerySalva,
    RegistroHabito,
    SessaoPomodoro,
    Tag,
    Tarefa,
    TemplateNota,
    TipoObjeto,
)
from rate_limiter import export_limiter
from schemas.export import ExportResult

router = APIRouter()

ATTACHMENTS_DIR = Path.home() / '.mindflow' / 'attachments'

def _generate_portability_pack() -> str:
    import os as _os
    tmp_dir = Path(tempfile.mkdtemp(prefix='mindflow_portability_'))
    db_src = _os.getenv('DATABASE_URL', 'sqlite:///mindflow.db').replace('sqlite:///', '')
    db_dest = tmp_dir / 'mindflow.db'
    if _os.path.exists(db_src):
        shutil.copy2(db_src, db_dest)
    att_dest = tmp_dir / 'attachments'
    if ATTACHMENTS_DIR.exists():
        shutil.copytree(str(ATTACHMENTS_DIR), str(att_dest), dirs_exist_ok=True)
    else:
        att_dest.mkdir(parents=True, exist_ok=True)
    schema_dest = tmp_dir / 'schema.sql'
    try:
        conn = sqlite3.connect(str(db_dest))
        tables = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name").fetchall()
        schema_dest.write_text('\n'.join(r[0] for r in tables) + '\n', encoding='utf-8')
        conn.close()
    except (sqlite3.DatabaseError, OSError) as e:
        schema_dest.write_text(f'-- Erro ao extrair schema: {e}\n', encoding='utf-8')
    zip_path = tmp_dir.parent / f'mindflow-pack-{datetime.now().strftime("%Y%m%d-%H%M%S")}.zip'
    with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in tmp_dir.rglob('*'):
            if f.is_file():
                zf.write(str(f), str(f.relative_to(tmp_dir)))
    shutil.rmtree(str(tmp_dir))
    return str(zip_path)

LIMITE_EXPORT = 5000

def _dump(model, session: Session) -> tuple[list[dict], bool]:
    rows = session.exec(select(model).limit(LIMITE_EXPORT + 1)).all()
    truncated = len(rows) > LIMITE_EXPORT
    return [r.model_dump() for r in rows[:LIMITE_EXPORT]], truncated

@router.get("", response_model=ExportResult)
def export_all(_rl: None = Depends(export_limiter), session: Session = Depends(get_session)):
    inbox, t1 = _dump(InboxItem, session)
    habitos, t2 = _dump(Habito, session)
    registros_habito, t3 = _dump(RegistroHabito, session)
    blocos_rotina, t4 = _dump(BlocoRotina, session)
    tarefas, t5 = _dump(Tarefa, session)
    sessoes_pomodoro, t6 = _dump(SessaoPomodoro, session)
    notas, t7 = _dump(Nota, session)
    conexoes_notas, t8 = _dump(ConexaoNota, session)
    pastas, t9 = _dump(Pasta, session)
    tags, t10 = _dump(Tag, session)
    notas_tags, t11 = _dump(NotaTag, session)
    flashcards, t12 = _dump(Flashcard, session)
    templates, t13 = _dump(TemplateNota, session)
    tipos_objeto, t14 = _dump(TipoObjeto, session)
    queries_salvas, t15 = _dump(QuerySalva, session)
    return {
        "inbox": inbox,
        "habitos": habitos,
        "registros_habito": registros_habito,
        "blocos_rotina": blocos_rotina,
        "tarefas": tarefas,
        "sessoes_pomodoro": sessoes_pomodoro,
        "notas": notas,
        "conexoes_notas": conexoes_notas,
        "pastas": pastas,
        "tags": tags,
        "notas_tags": notas_tags,
        "flashcards": flashcards,
        "templates": templates,
        "tipos_objeto": tipos_objeto,
        "queries_salvas": queries_salvas,
        "truncated": t1 or t2 or t3 or t4 or t5 or t6 or t7 or t8 or t9 or t10 or t11 or t12 or t13 or t14 or t15,
        "exportado_em": datetime.now().isoformat(),
        "versao": "1.0",
    }

_TABELAS = [
    ("inbox", InboxItem),
    ("habitos", Habito),
    ("registros_habito", RegistroHabito),
    ("blocos_rotina", BlocoRotina),
    ("tarefas", Tarefa),
    ("sessoes_pomodoro", SessaoPomodoro),
    ("notas", Nota),
    ("conexoes_notas", ConexaoNota),
    ("pastas", Pasta),
    ("tags", Tag),
    ("notas_tags", NotaTag),
    ("flashcards", Flashcard),
    ("templates", TemplateNota),
    ("tipos_objeto", TipoObjeto),
    ("queries_salvas", QuerySalva),
]

@router.get("/csv")
def export_csv(_rl: None = Depends(export_limiter), session: Session = Depends(get_session)):
    output = io.StringIO()
    writer = None
    for nome_tabela, model in _TABELAS:
        rows = [r.model_dump() for r in session.exec(select(model).limit(LIMITE_EXPORT)).all()]
        for row in rows:
            row["_tabela"] = nome_tabela
        if not rows:
            continue
        fieldnames = ["_tabela"] + [k for k in rows[0].keys() if k != "_tabela"]
        if writer is None:
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=mindflow-export-{datetime.now().strftime('%Y-%m-%d')}.csv"},
    )

@router.get("/tarefas-feitas")
def export_tarefas_feitas(
    data_inicio: str | None = Query(default=None),
    data_fim: str | None = Query(default=None),
    session: Session = Depends(get_session),
):
    from datetime import date
    stmt = select(Tarefa).where(Tarefa.status == "feito")
    if data_inicio:
        stmt = stmt.where(Tarefa.criado_em >= data_inicio)
    if data_fim:
        stmt = stmt.where(Tarefa.criado_em <= data_fim)
    tarefas = session.exec(stmt.order_by(Tarefa.data.desc()).limit(2000)).all()
    output = io.StringIO()
    fieldnames = ["id", "titulo", "data", "prioridade", "criado_em", "tempo_estimado", "total_foco_min"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for t in tarefas:
        writer.writerow({f: getattr(t, f, '') for f in fieldnames})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tarefas-feitas-{date.today().isoformat()}.csv"},
    )
