# ToolOfTools

Centralized **Tool & Agent Platform**: register internal capabilities (REST APIs, workflows, agents) in a catalog, expose them over HTTP, and serve them to AI clients via **MCP** (Model Context Protocol).

## Features

- **Tool registry** — CRUD, search, categories, JSON Schema for inputs/outputs
- **Auth** — JWT bearer tokens and API keys (`X-API-Key`), roles: `admin`, `developer`, `consumer`
- **MCP server** — SSE transport mounted at `/mcp` (dynamic tool list from the database)
- **Invocation gateway** — Validates input, calls downstream HTTP endpoints, retries and metrics
- **Observability** — Structured logging (structlog), request IDs, Prometheus `/metrics`

## Requirements

- Python 3.11+
- Docker (for local PostgreSQL and Redis)

## Quick start

```bash
# Clone the repo, then:
cd tooloftools
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

# Start Postgres (and Redis)
docker compose up -d

# Copy env and edit if needed
cp .env.example .env

# Create tables (dev): run the seed script once, or use Alembic when migrations are added
python seed/seed_tools.py

# Run the API
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health: [http://localhost:8000/health](http://localhost:8000/health)
- Metrics: [http://localhost:8000/metrics](http://localhost:8000/metrics)

### Tests

```bash
pytest tests/ -v
```

## Sample tools

See [`seed/sample_tools.json`](seed/sample_tools.json) for five example tools and their downstream auth shapes (OAuth2, API key, Bearer, mTLS).

## License

Add a `LICENSE` file if you want to specify terms for others using this code.
