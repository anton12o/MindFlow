# MindFlow — Guia de Desenvolvimento Completo

> Guia completo para setup, desenvolvimento e manutenção do MindFlow em ambientes Windows, macOS e Linux.

## 🎯 Visão Geral

Este guia cobre todo o ciclo de vida de desenvolvimento do MindFlow, desde o primeiro setup até deploy em produção. O projeto segue arquitetura moderna com backend Python (FastAPI + SQLModel) e frontend TypeScript (React 19 + Vite).

**Stack Tecnológica:**
- **Backend**: Python 3.12+ + FastAPI + SQLModel + SQLite + Alembic
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite
- **Dev Tools**: ESLint, pre-commit, pytest, ruff

---

## 🚀 Setup Inicial

### Pré-requisitos

#### Sistema Operacional Suportado
- **Windows 10/11** ✅
- **macOS 12+** ✅  
- **Linux (Ubuntu 20.04+)** ✅

#### Dependências Essenciais
```bash
# Python 3.12+
python --version  # Deve ser 3.12.0 ou superior

# Node.js 18+ (apenas para primeiro build)
node --version     # Deve ser 18.0.0 ou superior
npm --version      # Deve ser 8.0.0 ou superior

# Git 2.x+
git --version
```

**⚠ Windows:** `npx tsc` pode falhar por Execution Policy. Use `node node_modules/typescript/bin/tsc --noEmit` diretamente.

### Estrutura do Projeto
```
mindflow/
├── backend/                 # Servidor FastAPI
│   ├── main.py             # Entry point do backend
│   ├── models.py           # Modelos SQLModel
│   ├── database.py         # Configuração do SQLite
│   ├── routers/            # Endpoints da API
│   ├── services/           # Lógica de negócio
│   ├── alembic/            # Migrations
│   ├── requirements.txt    # Dependências Python
│   └── seed.py             # Dados iniciais
├── frontend/               # Aplicação React
│   ├── src/                # Código fonte
│   ├── package.json        # Dependências Node.js
│   ├── index.html          # HTML entry point
│   └── vite.config.ts      # Configuração do Vite
├── start.py               # Script principal (cria venv, instala deps)
├── start.bat              # Inicialização Windows
├── MindFlow.bat           # Atalho Windows
├── README.md              # Documentação principal
└── docs/                  # Documentação técnica
```

---

## ⚙️ Configuração Multiplataforma

### Windows

#### Método 1: Script Automático (Recomendado)
```cmd
# Clone o repositório
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow

# Execute o script principal (cria venv, instala tudo)
python start.py

# O script abre automaticamente o navegador em http://localhost:8000
```

#### Método 2: Manual
```cmd
# 1. Criar ambiente virtual
python -m venv venv

# 2. Ativar ambiente
venv\Scripts\activate

# 3. Instalar dependências backend
cd backend
pip install -r requirements.txt

# 4. Instalar dependências frontend
cd ../frontend
npm install

# 5. Voltar ao root e iniciar
cd ..
python start.py
```

**Atalho para Windows:**
- Use `MindFlow.bat` na pasta raiz
- Script cria venv automaticamente se não existir
- Chama python do venv diretamente

### macOS / Linux

#### Método 1: Script Automático
```bash
# Clone o repositório
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow

# Execute o script principal
python start.py

# Abre navegador automaticamente
```

#### Método 2: Manual
```bash
# 1. Criar ambiente virtual
python3 -m venv venv

# 2. Ativar ambiente
source venv/bin/activate

# 3. Instalar dependências
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
cd ..

# 4. Iniciar
python start.py
```

### Docker (Opcional)
```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "start.py"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mindflow:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app/backend
      - ./frontend:/app/frontend
```

---

## 🛠️ Ambiente de Desenvolvimento

### Backend Development

#### Setup do Ambiente
```bash
# Ativar ambiente virtual
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Instalar dependências de desenvolvimento
cd backend
pip install -r requirements-dev.txt
```

#### Comandos de Desenvolvimento
```bash
# Rodar servidor com hot reload
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Rodar com porta específica
python start.py --port 3000

# Se a porta 8000 estiver ocupada, start.py tenta 8001, 8002... automaticamente

# Rodar testes
python -m pytest tests/ -q

# Rodar lint
python -m ruff check .

# Auto-fix lint
python -m ruff check --fix .

# Gerar migrations (se necessário)
cd backend
alembic revision --autogenerate -m "descricao"
alembic upgrade head
```

#### Estrutura do Backend
```
backend/
├── main.py              # FastAPI app + CORS + middleware
├── models.py            # Modelos SQLModel (363 linhas)
├── database.py          # Configuração SQLite + Alembic
├── logging_config.py    # Configuração de logging
├── routers/             # Endpoints da API
│   ├── inbox.py         # Captura rápida
│   ├── habitos.py       # Sistema de hábitos
│   ├── rotina.py        # Blocos de tempo + tarefas
│   ├── pomodoro.py      # Timer de foco
│   ├── notas.py         # Notas + wikilinks + FTS5
│   ├── flashcards.py    # Flashcards SM-2
│   ├── tipos.py         # Tipos customizáveis
│   ├── queries.py       # Visualizações dinâmicas
│   ├── export.py        # Exportação JSON
│   ├── import_data.py   # Importação dados
│   ├── logs.py          # Logs de erro
│   └── shutdown.py      # Shutdown do servidor
├── services/            # Lógica de negócio
│   ├── spaced_repetition.py  # Algoritmo SM-2
│   ├── notes.py              # Processamento de wikilinks
│   └── estatisticas.py       # Cálculos estatísticos
├── alembic/             # Migrations
├── tests/               # Testes unitários
├── requirements.txt     # Dependências principais
├── requirements-dev.txt # Dependências de dev
└── seed.py             # Dados iniciais
```

### Frontend Development

#### Setup do Ambiente
```bash
# Instalar dependências
cd frontend
npm install

# Rodar servidor de desenvolvimento (porta 5173)
npm run dev

# Rodar type checking
npm run type-check  # Alias para tsc --noEmit

# Rodar build para produção
npm run build

# Rodar testes
npm test
```

#### Comandos Vite
```bash
# Desenvolvimento com hot reload
npm run dev

# Build para produção
npm run build

# Preview build de produção
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

#### Estrutura do Frontend
```
frontend/
├── src/
│   ├── main.tsx         # Entry point React
│   ├── App.tsx          # Router + tema + atalhos
│   ├── types.ts         # Interfaces TypeScript
│   ├── api/             # Clientes HTTP
│   │   ├── client.ts    # Configuração fetch
│   │   ├── inbox.ts
│   │   ├── habitos.ts
│   │   └── ...          # Outros módulos
│   ├── hooks/           # Custom hooks
│   │   └── useDebounce.ts
│   ├── utils/           # Utilitários
│   │   └── date.ts      # Formatação de datas
│   ├── components/      # Componentes reutilizáveis
│   │   ├── Sidebar.tsx
│   │   ├── EditorMarkdown.tsx
│   │   ├── PomodoroTimer.tsx
│   │   └── ...          # Outros componentes
│   └── pages/           # Páginas
│       ├── Dashboard.tsx
│       ├── Rotina.tsx
│       ├── Habitos.tsx
│       ├── Ideias.tsx
│       ├── Flashcards.tsx
│       ├── Tipos.tsx
│       ├── Consultas.tsx
│       └── Insights.tsx
├── index.html           # HTML principal
├── vite.config.ts       # Configuração Vite
└── package.json         # Dependências
```

---

## 🔧 Configuração IDE

### Visual Studio Code (Recomendado)

#### Extensões Essenciais
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-python.python",      // Suporte Python
    "ms-vscode.vscode-typescript-next", // Suporte TypeScript
    "esbenp.prettier-vscode", // Formatação
    "bradlc.vscode-tailwindcss", // Tailwind
    "ms-vscode.vscode-json", // JSON
    "ms-vscode.vscode-yaml"  // YAML
  ]
}
```

#### Configuração do Workspace
```json
// .vscode/settings.json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.rEnabled": true,
  "python.testing.pytestEnabled": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

#### Configuração Python
```json
// .vscode/settings.json
{
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "python.analysis.diagnosticMode": "workspace"
}
```

### Configuração Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]
  - repo: https://github.com/pycqa/flake8
    rev: 6.1.0
    hooks:
      - id: flake8
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
```

```bash
# Instalar pre-commit
pip install pre-commit
pre-commit install
```

---

## 🧪 Testes

### Backend Tests

#### Estrutura de Testes
```
backend/tests/
├── test_inbox.py
├── test_habitos.py
├── test_rotina.py
├── test_notas.py
├── test_flashcards.py
├── test_pomodoro.py
├── test_queries.py
└── conftest.py          # Fixtures compartilhadas
```

#### Executar Testes
```bash
# Rodar todos os testes
cd backend && python -m pytest tests/ -q

# Rodar testes específicos
python -m pytest tests/test_notas.py -v

# Rodar com coverage
python -m pytest tests/ --cov=app --cov-report=html

# Rodar testes rápidos (sem output detalhado)
python -m pytest tests/ -x
```

#### Exemplo de Teste
```python
# tests/test_notas.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_criar_nota():
    response = client.post("/api/notas", json={
        "titulo": "Teste",
        "conteudo": "Conteúdo de teste"
    })
    assert response.status_code == 200
    assert response.json()["titulo"] == "Teste"

def test_buscar_notas():
    response = client.get("/api/notas?q=teste")
    assert response.status_code == 200
    assert len(response.json()) > 0
```

#### Fixtures Úteis
```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from main import app
from database import engine, Session

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def session():
    with Session(engine) as sess:
        yield sess
```

### Frontend Tests

#### Estrutura de Testes
```
frontend/src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   └── utils/
├── setupTests.ts         # Configuração global
└── jest.config.js        # Configuração Jest
```

#### Executar Testes
```bash
# Rodar testes do frontend
cd frontend && npm test

# Rodar testes em watch mode
npm run test:watch

# Rodar testes com coverage
npm run test:coverage
```

---

## 🔍 Debugging

### Backend Debugging

#### Logging Configurado
```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            RotatingFileHandler(
                "logs/mindflow.log",
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            ),
            logging.StreamHandler()
        ]
    )
```

#### Debug no VS Code
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000"
      ],
      "jinja": true,
      "justMyCode": false
    }
  ]
}
```

### Frontend Debugging

#### React DevTools
```bash
# Instalar extensão do navegador
# Chrome Web Store: "React Developer Tools"
```

#### Console Debugging
```typescript
// Em componentes React
console.log('[Componente]', props);

// Usar React DevTools para inspecionar state
```

#### Network Debugging
```typescript
// Em api/client.ts
// Adicionar logging para requests
console.log('Request:', {
  url,
  method,
  data
});

console.log('Response:', response);
```

#### Notificações para o Usuário
Use o hook `useNotify()` do `store/notification.tsx` para mostrar feedback visual em catch blocks:

```typescript
import { useNotify } from '../store/notification'

function MeuComponente() {
  const notify = useNotify()
  
  try {
    await operacao()
  } catch (e) {
    console.error('[contexto]', e)
    notify('Erro ao realizar operação')  // toast automático
  }
}
```

O provider `NotificationProvider` já está ativo em `App.tsx`. Toast aparece no canto inferior direito com auto-dismiss em 4s.

---

## 📦 Build e Deployment

### Frontend Build

#### Build para Produção
```bash
cd frontend
npm run build

# Resultado: pasta 'dist/' com arquivos otimizados
# - index.html
# - assets/*.js (chunks)
# - assets/*.css (estilos)
```

#### Configuração Vite para Produção
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@tanstack/react-query']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
```

### Backend Build

#### Build para Produção
```bash
# Backend é Python puro - não precisa build
# Mas pode ser empacotado com PyInstaller opcional
pip install pyinstaller

pyinstaller --onefile --windowed main.py
```

#### Docker Build
```bash
# Construir imagem
docker build -t mindflow .

# Rodar container
docker run -p 8000:8000 mindflow
```

---

## 🔄 CI/CD

### GitHub Actions (Configurado)

#### Workflow Principal
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.12]
        node-version: [18]

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install Python deps
      run: |
        cd backend && pip install -r requirements.txt
    
    - name: Install Node deps
      run: |
        cd frontend && npm install
    
    - name: Run tests
      run: |
        cd backend && python -m pytest tests/ -q
    
    - name: Run lint
      run: |
        cd backend && python -m ruff check .
        cd frontend && npm run lint
    
    - name: Type check
      run: |
        cd frontend && npm run type-check
    
    - name: Build frontend
      run: |
        cd frontend && npm run build
```

#### Release Workflow
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: 3.12
    
    - name: Build frontend
      run: |
        cd frontend && npm install && npm run build
    
    - name: Create Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        draft: false
        prerelease: false
```

---

## 🔧 Ambiente de Produção

### Servidor de Produção

#### Uvicorn com Gunicorn
```python
# backend/gunicorn.conf.py
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True
```

```bash
# Rodar em produção
gunicorn -c gunicorn.conf.py main:app
```

#### Nginx Reverse Proxy
```nginx
# nginx.conf
server {
    listen 80;
    server_name mindflow.local;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static {
        alias /app/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Environment Variables
```bash
# .env.production
VITE_API_URL=https://mindflow.com/api
DATABASE_URL=/app/mindflow.db
LOG_LEVEL=INFO
```

---

## 🚨 Troubleshooting Comum

### Problemas de Build

#### Backend
```bash
# Erro: ModuleNotFoundError
# Solução: Verificar se o venv está ativado
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Erro: SQLite3 not found
# Solução: SQLite vem com Python, mas pode ser necessário:
apt-get install sqlite3  # Ubuntu
brew install sqlite3      # macOS
```

#### Frontend
```bash
# Erro: Node.js version mismatch
# Solução: Usar versão correta
nvm use 18

# Erro: npm ERR! missing script
# Solução: Verificar package.json scripts
```

### Problemas de Execução

#### Porta em Uso
```bash
# Verificar porta em uso
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Matar processo
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

#### Database Issues
```bash
# Recriar banco (último recurso)
rm mindflow.db
python start.py  # Recria banco automaticamente

# Verificar integridade
sqlite3 mindflow.db "PRAGMA integrity_check;"
```

---

## 📚 Referências

### Documentação Oficial
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLModel](https://sqlmodel.tiangolo.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### Ferramentas Úteis
- [Python Virtual Environments](https://docs.python.org/3/library/venv.html)
- [Node Package Manager](https://docs.npmjs.com/)
- [Git Version Control](https://git-scm.com/)
- [Docker](https://docs.docker.com/)

---

*Última atualização: 19 de junho de 2026*
*Versão: v1.2.11*