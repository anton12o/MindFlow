# MindFlow — Guia de Troubleshooting

> Solução de problemas comuns, diagnostic tools e procedimentos de recuperação.

## 🚨 Troubleshooting Geral

### Comandos de Diagnóstico

#### Health Check
```bash
# Verificar integridade do banco
sqlite3 /var/lib/mindflow/backend/mindflow.db "PRAGMA integrity_check;"

# Verificar integridade do health check
curl http://localhost:8000/health

# Verificar status do serviço
systemctl status mindflow

# Verificar logs
journalctl -u mindflow -f
```

#### Logs
```bash
# Application logs
tail -f /var/log/mindflow/app.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log

# Frontend console (browser)
# F12 → Console tab
```

### Problemas Comuns

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :8000              # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>              # Linux/macOS
taskkill /PID <PID> /F     # Windows

# Or change the port
python start.py --port 3000

# O script start.py já tem fallback automático:
# se 8000 estiver ocupado, tenta 8001, 8002... até achar livre
# (com --port explícito, NÃO faz fallback — falha se ocupado)
```

#### 2. Database Locked
```bash
# Check database locks
lsof /var/lib/mindflow/backend/mindflow.db

# Kill all SQLite processes
pkill -9 sqlite3

# Restart application
systemctl restart mindflow
```

#### 3. Import Errors
```bash
# Backend import errors
cd backend
source venv/bin/activate
pip install -r requirements.txt --force-reinstall

# Frontend import errors
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
```

#### 4. CORS Errors
```python
# Backend CORS configuration
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
]

# Update frontend API URL
# .env.development
VITE_API_URL=http://localhost:8000/api
```

#### 5. Module Not Found
```bash
# Backend module errors
python -m pip install <module-name>

# Check Python path
python -c "import sys; print('\n'.join(sys.path))"

# Verify venv is activated
which python  # Should point to venv
```

---

## 📊 Database Troubleshooting

### Database Issues

#### Database Corrupted
```bash
# Check integrity
sqlite3 mindflow.db "PRAGMA integrity_check;"

# Rebuild database
sqlite3 mindflow.db "REINDEX;"
sqlite3 mindflow.db "VACUUM;"

# Restore from backup
gunzip -c /var/lib/mindflow/backups/mindflow-20240616-020000.db.gz > mindflow.db
```

#### Database Too Large
```bash
# Compress database
sqlite3 mindflow.db "VACUUM;"

# Check database size
ls -lh /var/lib/mindflow/backend/mindflow.db

# Archive old data
sqlite3 mindflow.db ".backup /var/lib/mindflow/backups/mindflow-archive.db"
```

#### FTS5 Search Not Working
```bash
# Rebuild FTS5 index
sqlite3 mindflow.db "INSERT INTO notas_fts(notas_fts) VALUES('rebuild');"

# Check FTS5 configuration
sqlite3 mindflow.db ".tables" | grep fts

# Test search
sqlite3 mindflow.db "SELECT * FROM notas_fts WHERE titulo MATCH 'test';"
```

### Migration Issues
```bash
# Check migration status
cd backend
alembic current

# View migration history
alembic history

# Revert migration
alembic downgrade -1

# Reapply migration
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

---

## 🔌 API Troubleshooting

### API Connection Issues

#### Network Timeout
```typescript
// Frontend client.ts
const client = {
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return JSON.parse(await response.text());
    } catch (error) {
      console.error('[API]', error);
      throw error;
    }
  }
};
```

#### 401/403 Errors
```python
# Check authentication
# MindFlow doesn't use authentication, so check CORS
# Frontend: Check VITE_API_URL
# Backend: Check CORS_ORIGINS
```

#### 500 Errors
```bash
# Check backend logs
journalctl -u mindflow -n 100

# Test endpoint manually
curl -v http://localhost:8000/api/notas

# Check database connection
python -c "from database import engine; print(engine.connect().execute('SELECT 1'))"
```

---

## 💻 Frontend Troubleshooting

### Build Issues

#### TypeScript Errors
```bash
# Frontend type checking
cd frontend
npm run type-check

# Clear cache and rebuild
rm -rf node_modules/.vite
npm run build
```

#### Build Failures
```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version  # Should be 9+

# Clear node_modules
rm -rf node_modules
rm package-lock.json
npm install

# Build with verbose output
npm run build --verbose
```

#### Module Resolution Errors
```bash
# Update dependencies
npm update

# Check package.json
cat package.json

# Reinstall exact versions
npm install
```

### Runtime Issues

#### React Errors
```typescript
// Check for:
// 1. Undefined references
// 2. Missing props
// 3. Infinite loops in useEffect
// 4. Memory leaks

// Check React DevTools
// F12 → React tab
```

#### Hot Reload Not Working
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    host: true,
    hot: true,  // Ensure this is enabled
    watch: {
      usePolling: false,
      interval: 1000
    }
  }
});
```

---

## 🐌 Performance Issues

### Slow Database Queries

#### Identify Slow Queries
```bash
# Enable query logging
sqlite3 mindflow.db "PRAGMA journal_mode=WAL;"
sqlite3 mindflow.db "PRAGMA temp_store=MEMORY;"

# Check query plan
sqlite3 mindflow.db "EXPLAIN QUERY PLAN SELECT * FROM notas;"

# Analyze database
sqlite3 mindflow.db "ANALYZE;"
```

#### Optimize Queries
```python
# Use indexed columns
query = select(Nota).where(Nota.pasta_id == pasta_id)  # Indexed

# Avoid OR conditions
query = select(Nota).where(Nota.pasta_id == pasta_id)
query = query.union(select(Nota).where(Nota.tag_id == tag_id))

# Use EXISTS instead of IN for large datasets
query = select(Nota).where(
    exists(NotaTag).where(NotaTag.nota_id == Nota.id)
)
```

### Frontend Performance

#### Bundle Size Issues
```bash
# Check bundle size
npm run build

# Analyze bundle
npx vite-bundle-visualizer

# Reduce bundle size
// code-splitting
const HeavyComponent = () => import('./HeavyComponent');

// Lazy load
const LazyComponent = React.lazy(() => import('./LazyComponent'));
```

#### Slow First Load
```typescript
// Defer non-critical loading
const [data, setData] = useState(null);

// Lazy load routes
const Dashboard = React.lazy(() => import('./Dashboard'));
```

---

## 🛠️ Tooling Troubleshooting

### Docker Issues

#### Docker Not Starting
```bash
# Check Docker status
systemctl status docker

# Restart Docker
systemctl restart docker

# Check Docker logs
journalctl -u docker

# Rebuild containers
docker-compose down
docker-compose up --build -d
```

#### Container Won't Start
```bash
# Check container logs
docker logs <container-id>

# Check port conflicts
docker ps -a

# Remove stuck container
docker rm -f <container-id>
```

### Git Issues

#### Merge Conflicts
```bash
# View conflicts
git status

# Resolve conflicts
nano file.tsx

# Mark as resolved
git add file.tsx

# Continue merge
git commit
```

#### Git Stuck
```bash
# Abort current operation
git fetch --all
git reset --hard origin/main
```

---

## 🔧 Recovery Procedures

### Complete Recovery
```bash
# 1. Stop services
systemctl stop mindflow
nginx -s stop

# 2. Backup current state
tar -czf /tmp/mindflow-backup-$(date +%Y%m%d-%H%M%S).tar.gz /var/lib/mindflow/

# 3. Restore from backup
cd /tmp
tar -xzf mindflow-backup-*.tar.gz
cp -r mindflow-backup/* /var/lib/mindflow/

# 4. Fix permissions
chown -R mindflow:mindflow /var/lib/mindflow
chown -R mindflow:mindflow /var/log/mindflow

# 5. Restart services
systemctl start mindflow
nginx -s start
```

### Data Recovery from SQLite
```bash
# Export data
sqlite3 mindflow.db ".dump" > mindflow-backup.sql

# Import data
sqlite3 new-mindflow.db < mindflow-backup.sql

# Extract specific table
sqlite3 mindflow.db "SELECT * FROM notas;" > notas.csv
```

---

## 📞 Getting Help

### Debug Information Collection
```bash
# Create debug package
cd ~
tar -czf mindflow-debug-$(date +%Y%m%d-%H%M%S).tar.gz \
  /var/lib/mindflow/backend/mindflow.db \
  /var/lib/mindflow/logs/ \
  /var/log/nginx/error.log

# Collect version info
cat /var/lib/mindflow/.env | grep VERSION
python --version
npm --version
```

### Reporting Issues
```markdown
**Issue Template:**
1. Environment (OS, Version)
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Error messages
6. Logs
7. Debug information
```

---

*Última atualização: 19 de junho de 2026*
*Versão: v1.2.11*