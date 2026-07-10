# ADR-002: Arquitetura Local-First

**Status:** Aceito

**Contexto:** MindFlow é um app de produtividade pessoal. Os dados do
usuário (notas, hábitos, flashcards, sessões pomodoro) são sensíveis e
não devem depender de servidor externo para funcionar. Opções consideradas:
Firebase (cloud), SQLite sincronizado, e SQLite puro local.

**Decisão:** SQLite local-first 100%. Zero dependência de nuvem. O backend
FastAPI roda localmente e serve o frontend React como static file.

**Consequências:**
- + Privacidade total — dados nunca saem da máquina do usuário
- + Funciona offline por definição
- + Latência zero (localhost)
- + Deploy é copiar uma pasta (start.py + mindflow.db)
- - Sem sync entre dispositivos (trade-off aceito para uso pessoal)
- - Backup manual via export ou cold copy (start.py faz `shutil.copy2` do .db)
- - WAL journal mode é incompatível com cloud sync (OneDrive/Dropbox).
  Detectado no startup e trocado para DELETE se necessário.
