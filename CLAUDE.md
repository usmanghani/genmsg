# CLAUDE.md

This file provides project-specific instructions for Claude Code when working with this repository.

## Project Overview

FastAPI service that uses OpenAI's GPT models for text generation. The service provides an endpoint for generating short text responses (truncated to first 10 words) based on user prompts with optional conversation history.

## Important Commands to Run

### Development
```bash
# Install dependencies and run locally
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker Operations

**IMPORTANT: Always test locally first before pushing to production!**

#### Local Development (use .env.local)
```bash
# Build image
docker build -t genmsg:test .

# Run container with .env.local (contains real secrets, gitignored)
docker run -d --name genmsg-test -p 8000:8000 --env-file .env.local genmsg:test

# View logs
docker logs -f genmsg-test

# Stop and remove container
docker stop genmsg-test && docker rm genmsg-test
```

#### Production (Render.com)
- Render automatically builds from Dockerfile
- Environment variables set in Render Dashboard (not from .env file)
- Never commit .env.local to the repository
- Set `OPENAI_API_KEY` and `API_SECRET` in Render environment variables

### Testing API
```bash
# Test root endpoint
curl http://localhost:8000/

# Generate text (with authentication)
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your prompt here", "conversation_history": [], "secret": "your-secret-key-here"}'
```

## Code Style and Conventions

- **Single-file architecture**: Keep all FastAPI logic in `main.py`
- **Async/await**: Use async patterns for OpenAI API calls
- **Error handling**: Always handle OpenAI API errors gracefully
- **Environment variables**: Use python-dotenv for configuration
- **Response formatting**: Truncate generated text to first 10 words

## Key Files

- **main.py**: Core FastAPI application with `/generate` endpoint
- **pyproject.toml**: Project dependencies managed by uv
- **Dockerfile**: Container configuration using Python 3.11-slim
- **.env**: Template with dummy values (committed to repo)
- **.env.local**: Local development secrets with real API keys (never commit - gitignored)
- **Daily_Wife_Message.shortcut**: iOS Shortcut for automated daily messages

## Environment Configuration

### ⚠️ CRITICAL RULES
1. **ALWAYS test all changes locally first** before pushing to production
2. **NEVER put real secrets in .env** - it's committed to git and only contains dummy values
3. **Real secrets go in .env.local** - this file is gitignored and never committed

### Local Development
1. Copy `.env` to `.env.local`: `cp .env .env.local`
2. Edit `.env.local` with your real secrets:
   ```
   OPENAI_API_KEY=sk-your-actual-openai-key
   API_SECRET=your-secret-key-here
   ```
3. The app automatically loads `.env.local` if it exists (takes precedence over `.env`)
4. Docker uses `.env.local` for local testing: `docker run --env-file .env.local`

### Production (Render.com)
- Render does NOT use .env or .env.local files
- Environment variables are set in Render Dashboard or via Render MCP CLI
- Required variables: `OPENAI_API_KEY`, `API_SECRET`

#### Render CLI Examples

**List all services and find service ID:**
```bash
# Using Claude Code's Render MCP
mcp__render__list_services

# Output will show service details including id: "srv-d3hn37ili9vc7393rbn0"
```

**Update environment variables:**
```bash
# Update API_SECRET using MCP
mcp__render__update_environment_variables \
  --service-id srv-d3hn37ili9vc7393rbn0 \
  --env-vars '[{"key": "API_SECRET", "value": "7139248544"}]'

# This triggers a new deployment automatically
```

**Check deployment status:**
```bash
# List recent deployments
mcp__render__list_deploys --service-id srv-d3hn37ili9vc7393rbn0 --limit 5

# Get specific deployment details
mcp__render__get_deploy \
  --service-id srv-d3hn37ili9vc7393rbn0 \
  --deploy-id dep-xxxxxxxxxxxxx
```

**View service details:**
```bash
# Get full service configuration
mcp__render__get_service --service-id srv-d3hn37ili9vc7393rbn0
```

**View logs:**
```bash
# View recent logs
mcp__render__list_logs \
  --resource '["srv-d3hn37ili9vc7393rbn0"]' \
  --limit 50 \
  --direction backward
```

#### Render CLI (native render command)

**Install Render CLI:**
```bash
# Install via Homebrew (macOS)
brew install render

# Or download from: https://render.com/docs/cli
```

**Login to Render:**
```bash
render login
```

**List services and find service ID:**
```bash
# List all services
render services list

# Output format:
# ID                        NAME      TYPE    STATUS
# srv-d3hn37ili9vc7393rbn0  genmsg    web     live
```

**Get service details:**
```bash
# View specific service
render services get srv-d3hn37ili9vc7393rbn0

# View environment variables
render env-vars list --service srv-d3hn37ili9vc7393rbn0
```

**Update environment variables:**
```bash
# Set a single environment variable (triggers deployment)
render env-vars set API_SECRET=7139248544 --service srv-d3hn37ili9vc7393rbn0

# Set multiple environment variables
render env-vars set \
  OPENAI_API_KEY=sk-your-key \
  API_SECRET=7139248544 \
  --service srv-d3hn37ili9vc7393rbn0

# Delete an environment variable
render env-vars delete API_SECRET --service srv-d3hn37ili9vc7393rbn0
```

**List and monitor deployments:**
```bash
# List deployments for service
render deploys list --service srv-d3hn37ili9vc7393rbn0

# Get details of specific deployment
render deploys get dep-xxxxxxxxxxxxx --service srv-d3hn37ili9vc7393rbn0

# Trigger manual deploy
render deploy --service srv-d3hn37ili9vc7393rbn0
```

**View logs:**
```bash
# Tail live logs
render logs --service srv-d3hn37ili9vc7393rbn0 --tail

# View recent logs
render logs --service srv-d3hn37ili9vc7393rbn0 --num 100

# Filter logs by type
render logs --service srv-d3hn37ili9vc7393rbn0 --type app
```

**Complete workflow with Render CLI:**
```bash
# 1. List services to find ID
render services list

# 2. Update environment variable
render env-vars set API_SECRET=7139248544 --service srv-d3hn37ili9vc7393rbn0

# 3. Monitor deployment
render deploys list --service srv-d3hn37ili9vc7393rbn0

# 4. Watch logs
render logs --service srv-d3hn37ili9vc7393rbn0 --tail
```

## Development Notes

- Currently using `gpt-5-nano-2025-08-07` model
- Returns full text responses (no truncation)
- No max_completion_tokens limit
- Uses FastAPI's automatic OpenAPI documentation at `/docs`
- **Authentication**: All endpoints except `/` require `secret` parameter matching `API_SECRET` env var

## Common Issues and Solutions

- **Empty responses**: Check if model name is correct (use `gpt-5-nano-2025-08-07`)
- **Connection refused**: Ensure container is running and port 8000 is available
- **API key errors**: Verify `OPENAI_API_KEY` is set in `.env.local` file (local) or Render Dashboard (production)
- **Authentication errors**: Verify `secret` parameter matches `API_SECRET` environment variable
- **Secrets in git**: Check `.env` only has dummy values, real secrets are in `.env.local`

## Testing Checklist

**ALWAYS test locally before pushing to production!**

When making changes, verify:
- [ ] Changes tested locally with Docker using `.env.local`
- [ ] API endpoint responds correctly to test requests
- [ ] Error handling works for invalid inputs (wrong secret returns 401)
- [ ] Docker build succeeds without warnings
- [ ] Container runs and connects to OpenAI API
- [ ] No real secrets committed in `.env` file