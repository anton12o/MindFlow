# MindFlow — Guia de Configuração e Deployment

> Guia completo para configuração em produção, deployment em servidores e manutenção do ambiente.

## 🎯 Visão Geral

Este guia cobre todo o processo de configuração e deploy do MindFlow em ambientes de produção, incluindo servidores web, configuração de banco de dados, SSL e monitoramento.

**Arquitetura de Produção:**
- **Servidor**: Uvicorn + Gunicorn (Python)
- **Frontend**: Vite buildado + Nginx
- **Database**: SQLite com WAL mode
- **Proxy**: Nginx (SSL + cache estático)
- **Monitoramento**: Logging + health checks

---

## ⚙️ Configuração de Ambiente

### Environment Variables

#### Variáveis Essenciais
```bash
# .env.production
# Backend Configuration
VITE_API_URL=https://seu-domain.com/api
DATABASE_URL=/var/lib/mindflow/mindflow.db
LOG_LEVEL=INFO
CORS_ORIGINS=https://seu-domain.com

# Frontend Configuration (build time)
NODE_ENV=production
VITE_APP_VERSION=1.2.3
```

#### Variáveis Opcionais
```bash
# .env.production (opcional)
# Performance
UVICORN_WORKERS=4
UVICORN_MAX_REQUESTS=1000

# Database
SQLITE_TIMEOUT=30
WAL_MODE=ON

# Security
SECRET_KEY=your-secret-key-here
API_RATE_LIMIT=100
```

#### Exemplo de Configuração Completa
```bash
# backend/.env.production
# Database
DATABASE_PATH=/var/lib/mindflow/mindflow.db
DATABASE_BACKUP_DIR=/var/backups/mindflow

# Server Configuration
HOST=0.0.0.0
PORT=8000
UVICORN_WORKERS=4
UVICORN_MAX_REQUESTS=1000
UVICORN_MAX_REQUESTS_JITTER=50

# Security
CORS_ORIGINS=https://mindflow.local,https://localhost:3000
ALLOWED_HOSTS=*

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/mindflow/app.log
LOG_MAX_SIZE=10485760  # 10MB
LOG_BACKUP_COUNT=5

# Performance
CACHE_TTL=300  # 5 minutos
```

---

## 🚀 Deployment em Servidores

### Servidor Ubuntu/Debian

#### Pré-requisitos do Servidor
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências essenciais
sudo apt install -y python3.12 python3.12-venv python3-pip nginx git

# Criar usuário para o app
sudo useradd -m -s /bin/bash mindflow
sudo usermod -aG sudo mindflow
```

#### Estrutura de Diretórios
```bash
# Estrutura recomendada
/var/lib/mindflow/          # App e dados
├── backend/                # Código backend
├── frontend/               # Código frontend buildado
├── venv/                   # Ambiente virtual
├── mindflow.db             # Banco de dados
├── backups/               # Backups do banco
├── logs/                  # Logs do aplicativo
└── tmp/                   # Arquivos temporários

/etc/systemd/system/       # Serviços systemd
└── mindflow.service       # Serviço principal

/etc/nginx/sites-available/  # Configuração Nginx
└── mindflow.conf          # Configuração do site

/home/mindflow/            # Home do usuário
├── .env                   # Variáveis de ambiente
└── scripts/               # Scripts de manutenção
```

#### Passo a Paso de Deployment

##### 1. Deploy do Código
```bash
# Como usuário mindflow
sudo -u mindflow bash

# Clonar repositório
git clone https://github.com/anton12o/MindFlow.git /var/lib/mindflow
cd /var/lib/mindflow

# Configurar ambiente
python3 -m venv venv
source venv/bin/activate

# Instalar dependências backend
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Para lint/testes
cd ..

# Instalar dependências frontend
cd frontend
npm install
npm run build
cd ..

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Editar conforme necessário
```

##### 2. Configuração do Banco de Dados
```bash
# Criar diretórios necessários
sudo mkdir -p /var/lib/mindflow/backups
sudo mkdir -p /var/log/mindflow
sudo chown -R mindflow:mindflow /var/lib/mindflow
sudo chown -R mindflow:mindflow /var/log/mindflow

# Iniciar o app para criar o banco
cd /var/lib/mindflow
source venv/bin/activate
python start.py

# Verificar se o banco foi criado
ls -la /var/lib/mindflow/backend/mindflow.db

# Fazer primeiro backup
sudo cp /var/lib/mindflow/backend/mindflow.db /var/lib/mindflow/backups/mindflow-$(date +%Y%m%d-%H%M%S).db
```

##### 3. Configuração do Systemd
```bash
# Criar serviço systemd
sudo nano /etc/systemd/system/mindflow.service
```

```ini
[Unit]
Description=MindFlow API Server
After=network.target

[Service]
Type=exec
User=mindflow
Group=mindflow
WorkingDirectory=/var/lib/mindflow
Environment=PATH=/var/lib/mindflow/venv/bin
ExecStart=/var/lib/mindflow/venv/bin/gunicorn -c gunicorn.conf.py main:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables
EnvironmentFile=/var/lib/mindflow/.env

# Security
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/mindflow
ReadWritePaths=/var/log/mindflow

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar serviço
sudo systemctl daemon-reload
sudo systemctl enable mindflow
sudo systemctl start mindflow

# Verificar status
sudo systemctl status mindflow
journalctl -u mindflow -f
```

##### 4. Configuração do Nginx
```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/mindflow.conf
```

```nginx
# /etc/nginx/sites-available/mindflow.conf
server {
    listen 80;
    server_name mindflow.local www.mindflow.local;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=mindflow:10m rate=10r/s;
    limit_req zone=mindflow burst=20 nodelay;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend static files
    location / {
        root /var/lib/mindflow/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Static assets
    location /static/ {
        root /var/lib/mindflow/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "OK\n";
    }
    
    # Disable access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(py|db|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Redirect www to non-www
server {
    listen 80;
    server_name www.mindflow.local;
    return 301 $scheme://mindflow.local$request_uri;
}
```

```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/mindflow.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

##### 5. Configuração SSL (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d mindflow.local -d www.mindflow.local

# Configuração automática será adicionada pelo Certbot
# O Nginx será automaticamente configurado para HTTPS
```

### Servidor macOS

#### Usando Homebrew
```bash
# Instalar dependências
brew install python@3.12 nginx git

# Criar estrutura de diretórios
mkdir -p ~/MindFlow/{backend,frontend,venv,backups,logs}

# Clonar repositório
git clone https://github.com/anton12o/MindFlow.git ~/MindFlow

# Configurar ambiente
cd ~/MindFlow
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
cd backend && pip install -r requirements.txt
cd ../frontend && npm install && npm run build

# Configurar Nginx (macOS)
sudo brew services start nginx
sudo nano /usr/local/etc/nginx/servers/mindflow.conf
```

#### Configuração Nginx macOS
```nginx
# /usr/local/etc/nginx/servers/mindflow.conf
server {
    listen 8080;
    server_name localhost;
    
    location / {
        root /Users/$(whoami)/MindFlow/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔧 Docker Deployment

### Docker Compose Production
```yaml
# docker-compose.yml
version: '3.8'

services:
  mindflow:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mindflow_app
    restart: unless-stopped
    environment:
      - DATABASE_URL=/app/data/mindflow.db
      - VITE_API_URL=https://mindflow.local/api
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: mindflow_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mindflow
```

### Dockerfile Production
```dockerfile
# Dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app
USER app

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY --chown=app:app backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=app:app backend/ /app/backend
COPY --chown=app:app frontend/dist/ /app/frontend/dist
COPY --chown=app:app start.py .

# Create directories
RUN mkdir -p /app/data /app/logs /app/backups

# Switch to app user
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["python", "start.py"]
```

### Docker Compose Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app/backend
      - ./venv:/app/venv
    ports:
      - "8000:8000"
    environment:
      - PYTHONPATH=/app/backend
    command: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    volumes:
      - ./frontend:/app/frontend
      - /app/frontend/node_modules
    ports:
      - "5173:5173"
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:8000/api
    command: npm run dev

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.dev.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend
```

---

## 🔒 Configuração de Segurança

### Security Headers
```nginx
# Nginx security configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http: https:; frame-src 'none';" always;
```

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### SSL/TLS Configuration
```nginx
# SSL configuration
server {
    listen 443 ssl http2;
    server_name mindflow.local;
    
    ssl_certificate /etc/letsencrypt/live/mindflow.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mindflow.local/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rest of configuration...
}
```

---

## 📊 Backup e Recovery

### Backup Strategy

#### Automated Backup Script
```bash
#!/bin/bash
# /var/lib/mindflow/scripts/backup.sh

BACKUP_DIR="/var/lib/mindflow/backups"
DB_PATH="/var/lib/mindflow/backend/mindflow.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mindflow-$TIMESTAMP.db"
RETENTION_DAYS=30

# Create backup
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Compress backup
gzip -f "$BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "mindflow-*.db.gz" -mtime +$RETENTION_DAYS -delete

# Log backup
echo "$(date): Backup created: $BACKUP_FILE.gz" >> /var/log/mindflow/backup.log
```

#### Cron Job for Backups
```bash
# Add to crontab
sudo crontab -e

# Backup daily at 2 AM
0 2 * * * /var/lib/mindflow/scripts/backup.sh

# Health check every 5 minutes
*/5 * * * * curl -f http://localhost:8000/health > /dev/null 2>&1 || echo "Health check failed" | mail -s "MindFlow Health Check Failed" admin@mindflow.local
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop the application
sudo systemctl stop mindflow

# Restore from backup
gunzip -c /var/lib/mindflow/backups/mindflow-20240616-020000.db.gz > /var/lib/mindflow/backend/mindflow.db

# Verify database integrity
sqlite3 /var/lib/mindflow/backend/mindflow.db "PRAGMA integrity_check;"

# Start the application
sudo systemctl start mindflow
```

#### Full System Recovery
```bash
# 1. Backup current system
sudo systemctl stop mindflow
rsync -av /var/lib/mindflow/ /mnt/backup/mindflow/

# 2. Restore to new server
rsync -av /mnt/backup/mindflow/ /var/lib/mindflow/
sudo chown -R mindflow:mindflow /var/lib/mindflow

# 3. Start services
sudo systemctl start mindflow
sudo systemctl reload nginx
```

---

## 📈 Monitoramento e Logging

### Application Logging

#### Logging Configuration
```python
# logging_config.py
import logging
import logging.handlers
from pathlib import Path

def setup_logging():
    # Create logs directory
    log_dir = Path("/var/log/mindflow")
    log_dir.mkdir(exist_ok=True)
    
    # Configure rotating file handler
    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    
    # Configure console handler
    console_handler = logging.StreamHandler()
    
    # Configure formatters
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger
```

#### Log Rotation
```bash
# /etc/logrotate.d/mindflow
/var/log/mindflow/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mindflow mindflow
    postrotate
        systemctl reload mindflow
    endscript
}
```

### Health Checks

#### Application Health Check
```python
# main.py
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        with Session(engine) as session:
            result = session.execute(text("SELECT 1")).scalar()
            if result != 1:
                raise HTTPException(status_code=503, detail="Database unhealthy")
        
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")
```

#### System Monitoring Script
```bash
#!/bin/bash
# /var/lib/mindflow/scripts/monitor.sh

# Check application health
if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "$(date): Application health check failed" >> /var/log/mindflow/monitor.log
    # Restart application
    systemctl restart mindflow
fi

# Check disk space
DISK_USAGE=$(df /var/lib/mindflow | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date): Disk space critical: ${DISK_USAGE}%" >> /var/log/mindflow/monitor.log
    # Send alert
    echo "MindFlow: Disk space critical (${DISK_USAGE}%)" | mail -s "MindFlow Alert" admin@mindflow.local
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    echo "$(date): Memory usage critical: ${MEMORY_USAGE}%" >> /var/log/mindflow/monitor.log
fi
```

### Metrics Collection

#### Prometheus Integration
```python
# monitoring.py
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import FastAPI

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

app = FastAPI()

@app.middleware("http")
async def metrics_middleware(request, call_next):
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    REQUEST_DURATION.observe(duration)
    
    return response

@app.get("/metrics")
async def metrics():
    return generate_latest()
```

---

## 🚦 Performance Optimization

### Uvicorn Configuration
```python
# gunicorn.conf.py
bind = "0.0.0.0:8000"
workers = 4  # 4 * CPU cores
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True
keepalive = 2
timeout = 30
```

### Nginx Optimization
```nginx
# nginx.conf
http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache settings
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

### Database Optimization
```python
# database.py optimization
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={
        "check_same_thread": False,
        "timeout": 30,
        "connect_timeout": 10
    },
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)
```

---

## 🔧 Maintenance Scripts

### Deployment Script
```bash
#!/bin/bash
# /var/lib/mindflow/scripts/deploy.sh

set -e

# Variables
APP_DIR="/var/lib/mindflow"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup
echo "Creating backup..."
sqlite3 "$APP_DIR/backend/mindflow.db" ".backup $BACKUP_DIR/mindflow-$TIMESTAMP.db"

# Stop application
echo "Stopping application..."
sudo systemctl stop mindflow

# Update code
echo "Updating code..."
cd "$APP_DIR"
git pull origin main

# Update dependencies
echo "Updating dependencies..."
cd backend
source "$APP_DIR/venv/bin/activate"
pip install -r requirements.txt

# Build frontend
echo "Building frontend..."
cd ../frontend
npm install
npm run build

# Start application
echo "Starting application..."
cd ..
sudo systemctl start mindflow

# Verify health
echo "Verifying health..."
sleep 5
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "Deployment successful!"
else
    echo "Deployment failed! Rolling back..."
    sudo systemctl stop mindflow
    # Restore from backup (implement rollback logic)
    exit 1
fi
```

### Database Maintenance
```bash
#!/bin/bash
# /var/lib/mindflow/scripts/maintenance.sh

# Database maintenance
DB_PATH="/var/lib/mindflow/backend/mindflow.db"

# Analyze database
sqlite3 "$DB_PATH" "ANALYZE;"

# Optimize database
sqlite3 "$DB_PATH" "VACUUM;"

# Check integrity
sqlite3 "$DB_PATH" "PRAGMA integrity_check;"

# Clean up old sessions
sqlite3 "$DB_PATH" "DELETE FROM sessoes_pomodoro WHERE finalizado_em IS NOT NULL AND datetime(finalizado_em) < datetime('now', '-7 days');"

echo "Database maintenance completed"
```

---

## 📚 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check port usage
lsof -i :8000
netstat -tlnp | grep 8000

# Kill process
kill -9 <PID>
```

#### Database Locked
```bash
# Check database locks
lsof /var/lib/mindflow/backend/mindflow.db

# Restart application
systemctl restart mindflow
```

#### Memory Issues
```bash
# Check memory usage
free -h
top -p $(pgrep -f mindflow)

# Increase swap (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Log Analysis
```bash
# Application logs
journalctl -u mindflow -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Database logs
tail -f /var/log/mindflow/app.log
```

---

## 📚 References

### Official Documentation
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [SQLite Best Practices](https://www.sqlite.org/optfaq.html)
- [Docker Documentation](https://docs.docker.com/)

### Security Resources
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Nginx Security](https://github.com/h5bp/server-configs-nginx)

---

*Última atualização: 16 de junho de 2026*
*Versão: v1.2.3*