# MindFlow — Guia de Code Style e Performance

> Padrões de código, convenções e otimizações para manter a qualidade e performance.

## 🎯 Visão Geral

O MindFlow segue padrões de qualidade consistente para facilitar manutenção, colaboração e performance.

**Princípios:**
- **Clean Code**: Código legível e mantenível
- **Performance First**: Otimização consciente
- **Type Safety**: TypeScript e SQLModel
- **Maintainability**: Escalabilidade e documentação

---

## 📝 Code Style (Backend)

### Python Conventions

#### Naming Conventions
```python
# ✅ Classes and Types
class Nota(Base):
    pass

class NotaCreate(Base):
    pass

# ❌ Don't use snake_case for classes
class nota(Base):
    pass

# ✅ Functions and variables
def criar_nota(nota_data):
    pass

note_title = "Teste"

# ✅ Constants (UPPER_CASE)
MAX_NOTAS = 100
API_TIMEOUT = 10

# ❌ Don't use camelCase
def criarNota(noteData):
    pass
```

#### Import Order
```python
# ✅ Correct order
# 1. Standard library
import logging
from pathlib import Path

# 2. Third-party
from fastapi import FastAPI, HTTPException
from sqlmodel import Session, select

# 3. Local modules
from models import Nota, NotaCreate
from database import get_session
from services import processar_wikilinks

# ❌ Wrong order
from services import processar_wikilinks
import logging
```

#### Function Design
```python
# ✅ Single responsibility
def criar_nota(nota_data: NotaCreate, session: Session) -> Nota:
    # Create logic
    db_nota = Nota(**nota_data.dict())
    session.add(db_nota)
    session.commit()
    return db_nota

# ❌ Multiple responsibilities
def criar_e_atualizar_nota(data, session):
    # Create
    db_nota = Nota(**data)
    session.add(db_nota)
    # Update logic mixed in
    if data.get('titulo'):
        db_nota.titulo = data['titulo']
    session.commit()
```

#### Type Hints
```python
# ✅ Always use type hints
from typing import Optional, List
from datetime import date

def get_notas_ativas(
    session: Session,
    dias: int = 7
) -> List[Nota]:
    cutoff_date = date.today() - timedelta(days=dias)
    return session.exec(
        select(Nota).where(Nota.criado_em >= cutoff_date)
    ).all()

# ❌ No type hints
def get_notas():
    return session.exec(select(Nota)).all()
```

---

## 📝 Code Style (Frontend)

### TypeScript Conventions

#### Type Definitions
```typescript
// ✅ Clean interfaces
interface Nota {
  id: number;
  titulo: string;
  conteudo: string;
  pasta_id: number | null;
  tipo_id: number | null;
}

// ✅ Type aliases for functions
type FetchConfig = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
};

async function criar_nota(nota: Nota): Promise<Nota> {
  // Implementation
}

// ❌ Avoid 'any' types
async function criar_nota(data: any): Promise<Nota> {
  // Implementation
}
```

#### Component Design
```typescript
// ✅ Smart components with hooks
export default function Rotina({
  userId,
  onComplete
}: RotinaProps) {
  const tarefas = useQuery({
    queryKey: ['tarefas', userId],
    queryFn: () => api.getTarefas(userId)
  });

  const handleSubmit = useCallback(async (tarefa) => {
    await api.createTarefa(tarefa);
    onComplete();
  }, [onComplete]);

  return (
    <TarefasList tarefas={tarefas.data} onSubmit={handleSubmit} />
  );
}

// ❌ Dumb components without hooks
export default function Rotina() {
  // Should use hooks for data fetching
}
```

---

## ⚡ Performance Optimization

### Backend Performance

#### Database Queries
```python
# ✅ Use SELECT only needed columns
query = select(Nota.titulo, Nota.conteudo).where(Nota.id == id)

# ✅ Use index-friendly queries
query = select(Nota).where(Nota.pasta_id == pasta_id)  # Indexed

# ✅ Use batch operations
ids = [1, 2, 3, 4, 5]
session.exec(select(Nota).where(Nota.id.in_(ids)))

# ❌ N+1 query problem
notas = session.exec(select(Nota)).all()
for nota in notas:
    tags = session.exec(select(Tag).where(Tag.nota_id == nota.id)).all()  # N queries!

# ✅ Use relationships
notas = session.exec(select(Nota)).all()
for nota in notas:
    tags = [tag.tag for tag in nota.tags]  # Single query per nota
```

#### Cache Strategy
```python
from functools import lru_cache
from datetime import datetime

@lru_cache(maxsize=1000)
def get_config(key: str) -> str:
    """Cache configuration values"""
    return config_db.get(key)

def get_cached_stats(session: Session):
    """Get cached statistics"""
    cached = cache.get('stats')
    if cached:
        return cached
    stats = calcular_estatisticas(session)
    cache.set('stats', stats, timeout=300)
    return stats
```

#### Async Processing
```python
# ✅ Async operations
from asyncpg import connect

async def buscar_nota_assinc(
    id: int,
    db: asyncpg.Pool
) -> Nota:
    row = await db.fetchrow(
        "SELECT * FROM notas WHERE id = $1",
        id
    )
    return Nota(**row)

# For sync operations, use threading
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

def processar_nota_sincrono(nota_id: int):
    with executor:
        return processar_nota(nota_id)
```

### Frontend Performance

#### Memoization
```typescript
// ✅ React.memo for expensive components
export default React.memo(function NotaItem({
  nota,
  onSelect
}: NotaItemProps) {
  return <NoteCard nota={nota} onSelect={onSelect} />;
});

// ✅ useCallback for stable function references
const handleSave = useCallback((data) => {
  api.updateNota(data);
}, []); // Empty deps = stable

// ✅ useMemo for computed values
const sortedNotas = useMemo(() => {
  return notas.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}, [notas]);
```

#### Virtual Scrolling
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export default function NotasList({ notas }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            <NotaItem nota={notas[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Code Splitting
```typescript
// ✅ Lazy loading
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

export default function Dashboard() {
  return (
    <div>
      <LazyComponent />
    </div>
  );
}

// ✅ Route-based code splitting
const Dashboard = React.lazy(() => import('./Dashboard'));
const Settings = React.lazy(() => import('./Settings'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

---

## 🎨 Code Review Checklist

### Quality Checklist
```markdown
## Backend
- [ ] Type hints used
- [ ] Error handling present
- [ ] Logging configured
- [ ] No sensitive data in code
- [ ] Comments removed (unless explaining complex logic)
- [ ] Imports properly organized
- [ ] SQL queries use parameters (no string concatenation)
- [ ] SQLAlchemy/SQLModel used correctly
- [ ] Migration prepared

## Frontend
- [ ] TypeScript strict mode enabled
- [ ] No unused imports
- [ ] Components properly memoized
- [ ] Hooks called correctly
- [ ] Error boundaries present
- [ ] Loading states handled
- [ ] Dead code removed
- [ ] Props properly typed
```

### Security Checklist
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] CORS configured
- [ ] Rate limiting considered
- [ ] Sanitization of user input
- [ ] File upload validation

---

## 🔍 Code Analysis Tools

### Backend Analysis

#### Ruff Linter
```bash
# Check for issues
python -m ruff check .

# Auto-fix issues
python -m ruff check --fix .

# Specific rules
python -m ruff check --select F,E,W --ignore E501
```

#### Pytest Coverage
```bash
# Run with coverage
python -m pytest --cov=app --cov-report=html

# Check coverage threshold
python -m pytest --cov=. --cov-report=term-missing --cov-fail-under=80
```

### Frontend Analysis

#### ESLint
```bash
# Run lint
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Check for issues
npx eslint . --ext .ts,.tsx

# Format code
npm run format
```

#### TypeScript Checking
```bash
# Type checking only
npm run type-check

# Generate report
npx tsc --noEmit --reportFiles path/to/report.html
```

---

## 📦 Dependency Management

### Backend Dependencies
```bash
# Check for vulnerabilities
pip install safety
safety check

# Update dependencies
pip install --upgrade -r requirements.txt

# Pin versions for production
pip freeze > requirements.txt

# Check outdated packages
pip list --outdated
```

### Frontend Dependencies
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Pin versions for production
npm shrinkwrap
```

---

## 🧪 Testing Standards

### Test Coverage Goals
```python
# Coverage targets
# - Backend: 80% coverage
# - Frontend: 75% coverage

# Run coverage
python -m pytest --cov=. --cov-report=html
```

### Test Patterns
```python
# ✅ Test for happy path
def test_criar_nota_sucesso():
    response = client.post("/api/notas", json={
        "titulo": "Teste",
        "conteudo": "Conteúdo"
    })
    assert response.status_code == 200

# ✅ Test for error conditions
def test_criar_nota_sem_titulo():
    response = client.post("/api/notas", json={
        "conteudo": "Sem título"
    })
    assert response.status_code == 422  # Validation error

# ❌ Don't mock everything
def test_criar_nota_mocks_tudo():
    mock_db = Mock()
    mock_db.exec.return_value = [1]
    assert create_nota(data, mock_db) == [1]
```

---

## 📚 Learning Resources

### Style Guides
- [PEP 8 — Python Code Style](https://peps.python.org/pep-0008/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Performance Guides
- [FastAPI Performance](https://fastapi.tiangolo.com/advanced/async/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [SQLModel Best Practices](https://sqlmodel.tiangolo.com/)

---

*Última atualização: 16 de junho de 2026*
*Versão: v1.2.3*