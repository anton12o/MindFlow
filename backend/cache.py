import time

from services.metadata_index import metadata_index

_cache: dict[str, tuple[float, object]] = {}

def cache_get(key: str, ttl: int = 60):
    if metadata_index.ready:
        if key.startswith('meta:'):
            parts = key.split(':', 2)
            if len(parts) == 3:
                qtype, _, arg = parts
                if qtype == 'tag' and arg.isdigit():
                    tags = metadata_index.get_tags_by_nota(int(arg))
                    return list(tags) if tags else None
                if qtype == 'tag-list' and arg:
                    ids = metadata_index.get_notas_by_tag(arg)
                    return list(ids) if ids else None
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry[0] < ttl:
        return entry[1]
    return None

def cache_set(key: str, value: object):
    _cache[key] = (time.time(), value)

def cache_clear(pattern: str = ""):
    global _cache
    if not pattern:
        _cache.clear()
    else:
        _cache = {k: v for k, v in _cache.items() if pattern not in k}
