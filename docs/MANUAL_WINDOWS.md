# Manual do MindFlow — Windows

Bem-vindo ao MindFlow, seu segundo cérebro local-first. Este manual cobre desde a instalação até o uso de todas as funcionalidades.

---

## Índice

- [Parte I — Instalação](#parte-i--instalação)
- [Parte II — Primeiros Passos](#parte-ii--primeiros-passos)
- [Parte III — Funcionalidades](#parte-iii--funcionalidades)
- [Parte IV — Avançado](#parte-iv--avançado)
- [Parte V — Manutenção](#parte-v--manutenção)

---

# Parte I — Instalação

## 1. Requisitos mínimos

| Requisito | Especificação |
|---|---|
| **Sistema** | Windows 10 ou 11 |
| **RAM** | 2 GB (recomendado: 4 GB) |
| **Disco** | 200 MB livres |
| **Python** | 3.10 ou superior |
| **Node.js** | 18 ou superior (apenas para o build inicial) |
| **Git** | Opcional (recomendado para atualizações) |

## 2. Instalar Python 3.10+

**Método recomendado: Python Launcher (`py`)**

1. Acesse https://python.org/downloads/
2. Baixe a versão **3.10.x** ou superior (recomendado: 3.12+)
3. **ATENÇÃO:** Na primeira tela do instalador, **marque a opção:**
    ```
    ☑ Add Python 3.x to PATH
    ```
4. Clique em **"Install Now"**
5. Aguarde a instalação

**Verificar se funcionou:**

Abra o **PowerShell** (Menu Iniciar > digite "PowerShell" > Enter) e digite:

```powershell
python --version
```

Se aparecer `Python 3.10.x` ou superior, está pronto.

Se aparecer "não é reconhecido", tente:

```powershell
py --version
```

Se `py` funcionar, use `py` no lugar de `python` nos comandos seguintes.

Se nenhum funcionar, reinstale Python e **certifique-se de marcar "Add to PATH"**.

## 3. Instalar Node.js

Node.js só é necessário no primeiro uso (para compilar o frontend). Após o build, você pode até desinstalar.

1. Acesse https://nodejs.org/
2. Baixe a versão **LTS** (22.x)
3. Execute o instalador
4. Clique em "Next" em todas as telas (mantenha as opções padrão)
5. Ao final, marque "Automatically install the necessary tools" e clique em "Finish"

**Verificar:**

```powershell
node --version   # Deve mostrar v22.x
npm --version
```

## 4. Instalar Git (opcional)

1. Acesse https://git-scm.com/download/win
2. Baixe e execute o instalador
3. Nas telas de configuração:
   - **Choosing the default editor:** mantenha o padrão (Vim ou Nano)
   - **Adjusting your PATH environment:** escolha **"Git from the command line and also from 3rd-party software"**
   - **Configuring the line ending conversions:** escolha **"Checkout Windows-style, commit Unix-style line endings"**
4. Conclua a instalação

**Verificar:**

```powershell
git --version
```

O Git permite atualizar o MindFlow com um comando. Sem ele, você precisará baixar o ZIP manualmente.

## 5. Baixar o MindFlow

### Opção A — Git (recomendado)

Abra o **PowerShell** e digite:

```powershell
cd C:\
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow
```

### Opção B — ZIP (sem Git)

1. Acesse https://github.com/anton12o/MindFlow/releases
2. Baixe o arquivo **Source code (ZIP)** da versão mais recente
3. Extraia para uma pasta, por exemplo: `C:\MindFlow`
4. Abra o **PowerShell** e entre na pasta:
   ```powershell
   cd C:\MindFlow
   ```

## 6. Primeira execução

No **PowerShell**, dentro da pasta do MindFlow:

```powershell
python start.py
```

Ou, se `python` não funcionar:

```powershell
py -3.12 start.py
```

O que acontece automaticamente:

1. **Verifica** se Python e Node.js estão instalados
2. **Cria um ambiente virtual Python** isolado (pasta `venv/`)
3. **Instala as dependências** do backend (`pip install`)
4. **Detecta que o frontend precisa ser compilado** e executa:
   - `npm install` (baixa bibliotecas do frontend)
   - `npm run build` (compila o frontend)
5. **Executa migrações** do banco de dados (Alembic)
6. **Sobe o servidor** em `http://localhost:8000`
7. **Abre o navegador** automaticamente

> Na primeira vez, isso leva de 1 a 5 minutos (depende da sua internet). Nas execuções seguintes, leva cerca de 5 segundos.

Se o Windows Defender perguntar sobre o firewall, clique em **"Permitir acesso"**.

## 7. Usar no dia a dia

```powershell
cd C:\MindFlow
python start.py
```

O servidor sobe rapidamente e o navegador abre sozinho. Enquanto estiver rodando, **mantenha a janela do PowerShell aberta**. Para sair, pressione **Ctrl+C**.

> Para facilitar, crie um atalho na Área de Trabalho:
> - Clique com botão direito > Novo > Atalho
> - Local: `C:\caminho\para\Python312\python.exe start.py`
> - Pasta de trabalho: `C:\MindFlow`

## 8. Alternativa: executável portátil (.exe)

Se preferir um aplicativo que funciona sem precisar instalar Python nem Node.js:

```powershell
cd C:\MindFlow
python build_exe.py
```

Isso gera `dist/MindFlow.exe` (~40 MB).

**Como usar:** Copie a pasta `dist/` para qualquer lugar (pendrive, desktop, etc.) e execute `MindFlow.exe`. Zero dependências.

Você também pode baixar o .exe pronto na página de [releases](https://github.com/anton12o/MindFlow/releases).

## 9. Atualizar o MindFlow

De vez em quando (a cada 2-4 semanas), recebemos atualizações.

### Se usou Git

```powershell
cd C:\MindFlow
git pull
python start.py
```

O `start.py` pergunta "Atualizar do GitHub? (S/n)". Tecle **N** (já fez o pull manual) ou responda **S** se quiser que o script faça o pull.

Para pular a pergunta:

```powershell
python start.py --no-update
```

### Se baixou ZIP

Baixe o ZIP da nova versão e extraia por cima da pasta existente (substituindo os arquivos). Seu banco de dados (em `backend\mindflow.db`) não é afetado.

---

# Parte II — Primeiros Passos

## 1. Visão geral da interface

Quando o MindFlow abre no navegador, você vê:

```
┌─────────┬──────────────────────────────────────────┐
│ Sidebar │            Área principal                 │
│         │                                           │
│ 📊      │   Bem-vindo ao MindFlow!                  │
│   Dash  │                                           │
│ 📅      │   ● 12 notas criadas                      │
│   Rotina│   ● 5 tarefas pendentes                   │
│ ⏱️      │   ● 3 flashcards para revisar             │
│   Foco  │   ● 2 sessões hoje                        │
│ 💡      │                                           │
│   Notas │   [📓 Diário de hoje]                     │
│ 📚      │                                           │
│   Flash │   ┌─ Inbox ───────────────┐               │
│ ✅      │   │ 3 itens pendentes     │               │
│   Hábitos│  │ [Abrir inbox]         │               │
│ 📊      │   └──────────────────────┘               │
│   Insig │                                           │
│ 📋      │   ┌─ Tarefas de hoje ────┐               │
│   Cons. │   │ ☐ Revisar笔记        │               │
│         │   │ ☑ Comprar pão         │               │
│ ⚙️      │   └──────────────────────┘               │
│   Config│                                           │
└─────────┴──────────────────────────────────────────┘
```

### Barra lateral (sidebar)

A sidebar é seu **menu de navegação principal**. Cada ícone leva a uma seção do app:

| Ícone | Seção | O que faz |
|-------|-------|-----------|
| 📊 | **Dashboard** | Visão geral do seu dia |
| 📅 | **Rotina** | Planeje blocos de horário e tarefas |
| ⏱️ | **Foco** | Timer Pomodoro para concentração |
| 💡 | **Notas** | Editor de notas com Markdown |
| 📚 | **Flashcards** | Repetição espaçada (SM-2) |
| ✅ | **Hábitos** | Rastreie hábitos diários |
| 📈 | **Insights** | Estatísticas e heatmap |
| 📋 | **Consultas** | Visualizações personalizadas |
| ⚙️ | **Config** | Configurações do app |

**Dicas:**
- A sidebar pode ser **recolhida** clicando no ícone de menu (três linhas) no topo
- Você pode **redimensionar** a sidebar arrastando a borda direita
- Os itens da sidebar podem ser **ocultados** em Config > Sidebar

### Atalhos essenciais para começar

| Atalho | Ação |
|--------|------|
| `Ctrl+I` | Captura rápida — solte uma ideia sem sair da tela |
| `Ctrl+K` | Paleta de comandos — navegue para qualquer página |
| `[[` no editor | Cria wikilink para outra nota |

## 2. Seu primeiro registro

Vamos criar sua primeira nota:

1. Pressione **Ctrl+I** para abrir a **Captura Rápida**
2. Digite "Minha primeira ideia no MindFlow"
3. Clique em "Salvar" ou pressione **Enter**
4. Pronto! O item foi para sua caixa de entrada (Inbox)

Agora vamos transformar isso em uma nota:

1. Na sidebar, clique em **💡 Notas**
2. Clique no botão **"Nova nota"**
3. Um editor aparecerá. Digite:
   ```
   # Minha primeira nota

   Bem-vindo ao **MindFlow**!

   Aqui posso escrever com *Markdown*, criar [[links]] entre notas,
   e muito mais.
   ```
4. A nota é salva automaticamente (auto-save)

---

# Parte III — Funcionalidades

> As funcionalidades são **idênticas no Windows e no Linux**. Consulte o [MANUAL_LINUX.md](MANUAL_LINUX.md) para a descrição completa de cada seção.

Para referência rápida, as seções disponíveis são:

| Capítulo | Seção | Descrição concisa |
|---|---|---|
| 1 | **Dashboard** | Visão geral: métricas, inbox, tarefas, leitura, foco |
| 2 | **Notas** | Editor Markdown, wikilinks, pastas, tags, grafo, templates |
| 3 | **Rotina** | Blocos de horário, tarefas, calendário semanal |
| 4 | **Foco (Pomodoro)** | Timer foco/pausa, ciclos, auto-start, heartbeat |
| 5 | **Flashcards** | Repetição SM-2, revisão diária, simulado |
| 6 | **Hábitos** | Binário ou quantitativo, streak, calendário |
| 7 | **Insights** | Heatmap, score semanal, evolução, reflexão |
| 8 | **Inbox** | Captura rápida (Ctrl+I), arquivar em lote |
| 9 | **Consultas** | Grid, Kanban, Calendário, Gantt, Lista, Galeria |
| 10 | **Tipos** | Categorias com ícone e cor |
| 11 | **Config** | Tema, fonte, zoom, atalhos, backup, pomodoro |

**Leia o [MANUAL_LINUX.md](MANUAL_LINUX.md) para a descrição detalhada de cada funcionalidade.** O uso é idêntico no Windows.

---

# Parte IV — Avançado

## Grafo de notas

O grafo é uma visualização em rede de todas as suas notas. Cada `[[link]]` entre notas vira uma conexão visível.

**Como acessar:** Na página de Notas, clique no ícone de grafo (três círculos conectados).

**Interação:**
- **Clique** em um nó para navegar até a nota
- **Arraste** nós para reposicionar manualmente
- **Nós maiores** = mais conexões (notas mais "centrais")

## Renderização de conteúdo

O `RenderConteudo` processa Markdown com segurança:

- **Markdown padrão** — headings, listas, código, tabelas
- **Wikilinks** — `[[título]]` vira link clicável
- **LaTeX** — `$fórmula$` (inline) e `$$bloco$$` (display)
- **Checklists** — `[ ]` e `[x]` renderizados como checkboxes interativos
- **Sanitização** — DOMPullify remove scripts maliciosos (XSS)
- **Mermaid** — diagramas via bloco de código `mermaid`

## Atalhos de teclado avançados

### Globais (qualquer tela)

| Atalho | Ação |
|---|---|
| `Ctrl+K` | Paleta de comandos |
| `Ctrl+P` | Buscar notas rapidamente |
| `Ctrl+I` | Captura rápida (Inbox) |
| `Ctrl+Shift+F` | Modo zen (distração zero) |
| `Ctrl+Shift+I` | Capturar texto selecionado |

### No editor de notas

| Ação | Como fazer |
|---|---|
| Salvar | Ctrl+Enter |
| Negrito | `**texto**` |
| Itálico | `*texto*` |
| Link | `[[título]]` |
| Cabeçalho | `# texto` |
| Checklist | `- [ ] texto` |

### No Pomodoro (durante revisão de flashcards)

| Tecla | Ação |
|---|---|
| `Espaço` / `Enter` | Virar card |
| `1` a `5` | Avaliar dificuldade |
| `←` / `→` | Card anterior/próximo |

---

# Parte V — Manutenção

## Atualizar o MindFlow

### Se usou Git

```powershell
cd C:\MindFlow
git pull
python start.py --no-update
```

### Se usa o .exe portátil

Baixe a nova versão na página de [releases](https://github.com/anton12o/MindFlow/releases) e substitua o `.exe` antigo.

### Se baixou ZIP

Extraia o novo ZIP sobre a pasta existente. Seu banco de dados não será afetado.

## Fazer backup manual

Pelo app: vá em **Config > Backup > "Fazer backup agora"**

Pelo terminal:
```powershell
cd C:\MindFlow
python start.py --backup
```
Isso gera um arquivo JSON com todos os seus dados.

## Compactar banco

Com o tempo, o SQLite acumula espaço não utilizado. Para liberar:

Pelo app: **Config > Banco de dados > "Compactar banco"**

## Localização dos dados

| O que | Onde está |
|---|---|
| Banco de dados | `C:\MindFlow\backend\mindflow.db` |
| Backups automáticos | `C:\MindFlow\backend\data\backups\` |
| Logs de erro | `C:\MindFlow\logs\` |
| Configurações da interface | LocalStorage do navegador (não persistem se limpar dados) |

Para fazer backup manual completo, copie a pasta `C:\MindFlow\backend\`.

## Troubleshooting

### `python` não é reconhecido

Python não está no PATH. Soluções:

1. **Reinstale Python** e marque "Add Python to PATH" (opção na primeira tela do instalador)
2. Ou use o Python Launcher:
   ```powershell
   py -3.12 start.py
   ```
3. Ou chame pelo caminho completo:
   ```powershell
   C:\Users\SeuNome\AppData\Local\Programs\Python\Python312\python.exe start.py
   ```

### `node` ou `npm` não é reconhecido

Node.js não está no PATH. Reinstale Node.js e certifique-se de que a opção "Add to PATH" está marcada.

### O servidor não inicia

```powershell
# Verifique se a porta está livre no navegador
http://localhost:8000/api/health
# Deve mostrar: {"status":"ok"}
```

### "Porta 8000 já em uso"

Pode ser WSL, Docker ou outro programa. O script tenta 8001, 8002... automaticamente.

Para usar uma porta específica:

```powershell
python start.py --port 3000
```

### App não carrega no navegador (tela preta)

1. Digite `http://localhost:8000` manualmente no navegador
2. Verifique se o servidor está no ar (comando acima)
3. Pressione F12 > Console para ver se há erros
4. Tente limpar o cache: Ctrl+Shift+R

### Windows Defender / Antivírus bloqueia

Na primeira execução, pode aparecer "Windows protegeu seu PC". Clique em **"Executar assim mesmo"**.

Se o firewall perguntar sobre Python, clique em **"Permitir acesso"**.

### Build do frontend falhou

Pode ser falta de memória. Limite o Node e tente novamente:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=1024"
python start.py --force-rebuild
```

### Execution Policy bloqueia scripts do PowerShell

Se aparecer um erro sobre execução de scripts proibida, use `python start.py` no lugar de `start.bat`.

### Quer rodar em outra máquina da rede?

```powershell
python start.py --host 0.0.0.0
```

Acesse de outro dispositivo pelo **IP da máquina** (ex: `192.168.1.100:8000`). Para descobrir seu IP:

```powershell
ipconfig
```
Procure pelo **Endereço IPv4** (ex: 192.168.1.100).

### Quer instalar como PWA (aplicativo instalável)?

No navegador (Edge ou Chrome), ao acessar o MindFlow:

1. Clique no ícone de **instalar** na barra de endereços (⊕ ou computador com seta)
2. Confirme a instalação
3. O MindFlow vira um aplicativo na sua Área de Trabalho e Menu Iniciar
4. Abre em janela própria, sem a barra de endereço do navegador

## Desinstalar

1. Feche o servidor (Ctrl+C no PowerShell)
2. Delete a pasta do MindFlow:
   ```powershell
   rm -r -force C:\MindFlow
   ```
3. (Opcional) Remover dependências pesadas antes de deletar:
   ```powershell
   rm -r -force C:\MindFlow\frontend\node_modules
   rm -r -force C:\MindFlow\venv
   ```

**O banco de dados está em `C:\MindFlow\backend\mindflow.db`.** Se quiser guardar seus dados, copie esse arquivo antes de deletar a pasta.

---

**MindFlow** — Seu segundo cérebro, local-first.
