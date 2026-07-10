import logging
from collections import defaultdict
from typing import Any

from sqlmodel import Session, select

from models import ConexaoNota, Nota, NotaTag, Pasta, Tag

logger = logging.getLogger(__name__)


class MetadataIndex:
    def __init__(self):
        self.id_to_meta: dict[int, dict[str, Any]] = {}
        self.tag_to_ids: dict[str, set[int]] = defaultdict(set)
        self.pasta_to_ids: dict[int, set[int]] = defaultdict(set)
        self.link_to_ids: dict[int, set[int]] = defaultdict(set)
        self.link_from_ids: dict[int, set[int]] = defaultdict(set)
        self._ready = False

    @property
    def ready(self) -> bool:
        return self._ready

    def build(self, session: Session) -> None:
        notas = session.exec(select(Nota)).all()
        tag_rows = session.exec(
            select(Tag.nome, NotaTag.nota_id).join(NotaTag, Tag.id == NotaTag.tag_id)
        ).all()
        pasta_rows = session.exec(select(Pasta)).all()
        pasta_map = {p.id: p.nome for p in pasta_rows}

        for n in notas:
            self.id_to_meta[n.id] = {
                'titulo': n.titulo,
                'pasta_id': n.pasta_id,
                'propriedades': n.propriedades or {},
                'tags': set(),
                'pasta_nome': pasta_map.get(n.pasta_id) if n.pasta_id else None,
            }

        for tag_nome, nota_id in tag_rows:
            self.id_to_meta.setdefault(nota_id, {}).setdefault('tags', set()).add(tag_nome)
            self.tag_to_ids[tag_nome].add(nota_id)

        for n in notas:
            if n.pasta_id:
                self.pasta_to_ids[n.pasta_id].add(n.id)

        conns = session.exec(select(ConexaoNota)).all()
        for c in conns:
            self.link_to_ids[c.nota_destino_id].add(c.nota_origem_id)
            self.link_from_ids[c.nota_origem_id].add(c.nota_destino_id)

        self._ready = True
        logger.info('metadata_index construído: %d notas, %d tags, %d pastas, %d conexões',
                     len(self.id_to_meta), len(self.tag_to_ids), len(self.pasta_to_ids), len(conns))

    def invalidate(self, nota_id: int) -> None:
        old = self.id_to_meta.pop(nota_id, None)
        if old:
            for tag in old.get('tags', set()):
                self.tag_to_ids[tag].discard(nota_id)
            pasta_id = old.get('pasta_id')
            if pasta_id:
                self.pasta_to_ids[pasta_id].discard(nota_id)
        self.link_to_ids.pop(nota_id, None)
        self.link_from_ids.pop(nota_id, None)
        for src, targets in list(self.link_from_ids.items()):
            targets.discard(nota_id)
        for dst, sources in list(self.link_to_ids.items()):
            sources.discard(nota_id)

    def refresh_nota(self, nota_id: int, session: Session) -> None:
        self.invalidate(nota_id)
        n = session.get(Nota, nota_id)
        if not n:
            return
        self.id_to_meta[nota_id] = {
            'titulo': n.titulo,
            'pasta_id': n.pasta_id,
            'propriedades': n.propriedades or {},
            'tags': set(),
            'pasta_nome': None,
        }
        tag_rows = session.exec(
            select(Tag.nome).join(NotaTag, Tag.id == NotaTag.tag_id).where(NotaTag.nota_id == nota_id)
        ).all()
        for tag_nome in tag_rows:
            self.id_to_meta[nota_id]['tags'].add(tag_nome)
            self.tag_to_ids[tag_nome].add(nota_id)
        if n.pasta_id:
            self.pasta_to_ids[n.pasta_id].add(nota_id)
        conns = session.exec(
            select(ConexaoNota).where(
                (ConexaoNota.nota_origem_id == nota_id) | (ConexaoNota.nota_destino_id == nota_id)
            )
        ).all()
        for c in conns:
            self.link_to_ids[c.nota_destino_id].add(c.nota_origem_id)
            self.link_from_ids[c.nota_origem_id].add(c.nota_destino_id)

    def get_tags_by_nota(self, nota_id: int) -> set[str]:
        meta = self.id_to_meta.get(nota_id)
        return set(meta.get('tags', set())) if meta else set()

    def get_notas_by_tag(self, tag: str) -> set[int]:
        return set(self.tag_to_ids.get(tag, set()))

    def get_links_to(self, nota_id: int) -> set[int]:
        return set(self.link_to_ids.get(nota_id, set()))

    def get_links_from(self, nota_id: int) -> set[int]:
        return set(self.link_from_ids.get(nota_id, set()))

    def get_pasta_by_nota(self, nota_id: int) -> str | None:
        meta = self.id_to_meta.get(nota_id)
        return meta.get('pasta_nome') if meta else None

    def get_propriedades(self, nota_id: int) -> dict:
        meta = self.id_to_meta.get(nota_id)
        return dict(meta.get('propriedades', {})) if meta else {}

    def search_titulo(self, q: str) -> list[int]:
        ql = q.lower()
        return [nid for nid, meta in self.id_to_meta.items()
                if ql in meta.get('titulo', '').lower()]

    def flush(self) -> None:
        self.id_to_meta.clear()
        self.tag_to_ids.clear()
        self.pasta_to_ids.clear()
        self.link_to_ids.clear()
        self.link_from_ids.clear()
        self._ready = False


metadata_index = MetadataIndex()
