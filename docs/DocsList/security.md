# MindFlow — Guia de Segurança

> Práticas de segurança e configurações de proteção do MindFlow.

## 🎯 Visão Geral

O MindFlow é um aplicativo **local-first** com foco em privacidade, mas ainda requer configurações adequadas para proteger contra vulnerabilidades comuns.

**Princípios de Segurança:**
- **Defense in Depth**: Múltiplas camadas de proteção
- **Principle of Least Privilege**: Permissões mínimas necessárias
- **Fail Secure**: Em falhas, prefira segurança
- **Secure Defaults**: Configurações padrão seguras

---

## 🔒 Configuração de Segurança

### Security Headers (Nginx)
```nginx
# Security headers obrigatórias
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### CORS Configuration
```python
# backefd/routers/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:8000",   # API dev server
        "https://mindflow.local"   # Production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
```

### Rate Limiting
```python
# backend/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter

@app.get("/")
@limiter.limit("100/minute")
async def root(request: Request):
    return {"status": "ok"}
```

---

## 🔐 Input Validation

### Pydantic Models
```python
# backend/models.py
class NotaCreate(SQLModel):
    titulo: str = Field(min_length=1, max_length=500)
    conteudo: str = Field(max_length=50000)
    pasta_id: Optional[int] = Field(default=None)
    
    @field_validator('conteudo')
    def validate_conteudo(cls, v):
        if len(v) > 50000:
            raise ValueError('Conteúdo muito longo')
        return v
```

### SQL Injection Prevention
```python
# ❌ MÁ PRÁTICA
query = f"SELECT * FROM notas WHERE titulo = '{titulo}'"

# ✅ CORRETO — SQLModel ORM
query = select(Nota).where(Nota.titulo == titulo)
result = session.exec(query).all()

# ✅ CORRETO — Parameterized queries
query = text("SELECT * FROM notas WHERE titulo = :titulo")
result = session.exec(query, {"titulo": titulo}).all()
```

### File Upload Security
```python
# backend/routers/notas.py
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif'}

@app.post("/notas")
async def criar_nota(
    arquivo: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    # Validate extension
    if not any(arquivo.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(400, "Extensão de arquivo não permitida")
    
    # Validate size
    content = await arquivo.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(400, "Arquivo muito grande")
```

---

## 🗄️ Database Security

### Foreign Keys Enforcement
```python
# backend/database.py
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

### Sensitive Data Protection
```python
# Never store sensitive data in plaintext
# Use encryption for user data if needed

from cryptography.fernet import Fernet

# Only if encryption is required
# For now, local-first means data stays local
```

### Backup Security
```bash
# .env.production
# .gitignore the backup files!
.gitignore
*.db
*.db.gz
*.db-shm
*.db-wal
```

---

## 🚦 Network Security

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### HTTPS Configuration (Let's Encrypt)
```bash
# Certbot setup
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mindflow.local -d www.mindflow.local
```

### SSL/TLS Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name mindflow.local;
    
    ssl_certificate /etc/letsencrypt/live/mindflow.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mindflow.local/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

---

## 📝 Logging Security

### Sensitive Data Masking
```python
# backend/logging_config.py
def mask_sensitive_data(record):
    if record.getMessage() and ('password' in record.getMessage().lower() or 'token' in record.getMessage().lower()):
        # Mask sensitive data
        parts = record.getMessage().split()
        masked_parts = []
        for part in parts:
            if any(keyword in part.lower() for keyword in ['password', 'token']):
                masked_parts.append('***')
            else:
                masked_parts.append(part)
        record.msg = ' '.join(masked_parts)
    return record
```

### Log Security Headers
```nginx
# Nginx log security
access_log /var/log/nginx/access.log combined;
error_log /var/log/nginx/error.log warn;

# Don't log sensitive data
location /health {
    access_log off;
}
```

---

## 🔧 Configuration Security

### Environment Variables
```bash
# .env.production - No commits to Git!
VITE_API_URL=https://mindflow.local/api
DATABASE_URL=/var/lib/mindflow/mindflow.db
LOG_LEVEL=INFO

# File permissions
chmod 600 .env
chown app:app .env
```

### Secret Management
```bash
# ❌ NEVER commit secrets to Git
# DO commit .env.example as template

# Use secrets manager for production
# AWS Secrets Manager, HashiCorp Vault, etc.
```

---

## 🧪 Security Testing

### Dependence Vulnerability Scanning
```bash
# Backend
pip install safety
safety check

# Frontend
npm audit
npm audit fix

# Docker
docker scan image
```

### OWASP ZAP Scan
```bash
# Install ZAP
sudo snap install zap-desktop

# Run scan
zap-cli quick-scan --self-contained https://mindflow.local
```

### SQL Injection Test
```python
# Manually test for SQL injection
import pytest
from main import app

def test_sql_injection():
    response = client.get("/api/notas?q=' OR '1'='1")
    # Should return empty results, not error
    assert response.status_code == 200
```

---

## 🚨 Incident Response

### Detection Patterns
```python
# Monitor suspicious activity
@app.middleware("http")
async def log_requests(request, call_next):
    # Rate limiting triggers
    if request.headers.get("X-RateLimit-Exceeded"):
        logger.warning("Rate limit exceeded for IP: %s", get_remote_address(request))
    
    # High volume of requests
    if request.method == "POST" and not request.headers.get("Content-Type"):
        logger.warning("Suspicious POST without Content-Type")
    
    return await call_next(request)
```

### Response Procedures
```bash
# Emergency Stop
systemctl stop mindflow
nginx -s stop

# Database Freeze
sqlite3 mindflow.db "PRAGMA journal_mode=OFF;"

# Data Preservation
cp mindflow.db /mnt/backup/emergency/
```

---

## 📊 Compliance

### GDPR Considerations
```python
# Data erasure
@router.delete("/notas/{id}")
async def deletar_nota(id: int, session: Session = Depends(get_session)):
    db_nota = session.get(Nota, id)
    session.delete(db_nota)
    session.commit()
    return {"status": "deleted"}

# Data portability
@router.get("/exportar-dados")
async def exportar_dados(session: Session = Depends(get_session)):
    return session.exec(select(Nota)).all()
```

---

## 🔍 Code Security Checks

### Automated Scanning
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Safety Check
        run: pip install safety && safety check
      - name: Run Bandit
        run: pip install bandit && bandit -r backend/
      - name: Run Gitleaks
        run: gitleaks detect --source ./ --config .gitleaks.toml
```

---

## 📚 Security Resources

### OWASP Top 10
- [Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection/)
- [Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

### Security Headers
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Security Headers](https://infosec.mozilla.org/guidelines/web_security)

---

*Última atualização: 16 de junho de 2026*
*Versão: v1.2.3*