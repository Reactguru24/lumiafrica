# lumiafrica

Lumi Africa fashion marketplace — monorepo.

| Package | Stack | Production deploy |
|---------|-------|-------------------|
| [`frontend/`](frontend/) | Next.js 15 | [Netlify](https://lumiafricca.netlify.app) |
| [`backend/`](backend/) | Go + Gin + MySQL | [Railway](https://dazzling-smile-production-1014.up.railway.app) |
| [`ai-fitting-tool/`](ai-fitting-tool/) | FastAPI + MediaPipe | Railway or Render (optional) |

## Repository layout

```
lumiafrica/
├── frontend/           # Storefront, vendor & admin UI
├── backend/            # REST API, payments, orders
├── ai-fitting-tool/    # Virtual fitting ML microservice
├── docker-compose.yml  # Full local stack (MySQL, Redis, API, web, ML)
├── Dockerfile          # Backend image (Railway)
├── railway.toml        # Backend Railway config
├── netlify.toml        # Frontend Netlify config
├── render.yaml         # Optional ML deploy (Render blueprint)
└── deploy/             # Production env reference
```

## Local development

**Infra only (MySQL + Redis):**

```bash
docker compose up -d mysql redis
cd backend && cp .env.example .env && make dev
cd frontend && npm ci && npm run dev
```

**Full stack in Docker:**

```bash
cp .env.docker.example .env.docker
docker compose --profile app up -d
# API http://localhost:8080  web http://localhost:3000  ML http://localhost:8000
```

## Production deploy

| Service | Platform | Config |
|---------|----------|--------|
| Backend | Railway | Root `Dockerfile` + `railway.toml` |
| Frontend | Netlify | `netlify.toml` (`base = frontend`) |
| AI fitting | Railway or Render | `ai-fitting-tool/` + `BACKEND_API_URL` |

See [`deploy/railway.env.example`](deploy/railway.env.example) for all environment variables.

### AI fitting (optional)

1. Deploy `ai-fitting-tool/` as a separate Railway service (root directory: `ai-fitting-tool`) or use root `render.yaml` on Render.
2. On Netlify, set `ML_API_URL` and `NEXT_PUBLIC_VIRTUAL_FITTING_ENABLED=true`.
3. Redeploy Netlify.

## Live URLs

- Frontend: https://lumiafricca.netlify.app
- Backend: https://dazzling-smile-production-1014.up.railway.app
