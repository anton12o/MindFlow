# MindFlow — Frontend

Interface web do MindFlow, um app de produtividade pessoal local-first.

## Pré-requisitos

- Node.js 18+
- npm 9+

## Setup

```bash
cp .env.example .env   # Ajuste VITE_API_URL se necessário
npm install
npm run dev
```

O servidor de desenvolvimento roda em `http://localhost:5173`.

## Build

```bash
npm run build
```

Gera os arquivos otimizados em `dist/`.

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_API_URL` | `http://localhost:8000/api` | URL base da API do backend |

## Estrutura

```
src/
  api/        # Clientes HTTP para cada domínio
  components/ # Componentes reutilizáveis
  hooks/      # Custom hooks
  pages/      # Páginas (uma por rota)
  store/      # Contextos globais (tema)
  types/      # Interfaces TypeScript
  utils/      # Utilitários
  App.tsx     # Layout + rotas
  main.tsx    # Entry point
```
