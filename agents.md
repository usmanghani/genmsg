# agents.md

This file provides project-specific instructions for AI coding agents (Claude Code, Warp AI, Cursor, etc.) when working with this repository.

## Project Overview

FastAPI service that uses OpenAI's GPT models for text generation. The service provides an endpoint for generating short text responses (truncated to first 10 words) based on user prompts with optional conversation history.

## Important Commands to Run

### Development
```bash
# Install dependencies and run locally
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker Operations

**⚠️ CRITICAL: Always test all changes locally first before pushing to production!**

#### Local Development (use .env.local)
```bash
# Build image for local testing
docker build -t genmsg:test .

# Build for specific platform (e.g., on Apple Silicon for AMD64)
docker build --platform linux/amd64 -t genmsg:test .

# Run with .env.local (contains real secrets, gitignored)
docker run -d --name genmsg-test -p 8000:8000 --env-file .env.local genmsg:test

# View logs
docker logs -f genmsg-test

# Stop and remove container
docker stop genmsg-test && docker rm genmsg-test
```

**⚠️ NEVER use .env with Docker - it only contains dummy values!**

#### Production (Render.com)
- Render automatically builds from Dockerfile
- Environment variables set in Render Dashboard (NOT from .env files)
- Never commit .env.local to the repository
- Set `OPENAI_API_KEY` and `API_SECRET` in Render environment variables

### Testing API
```bash
# Test root endpoint (no authentication required)
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
- **Response formatting**: Return full text responses (no truncation)
- **Authentication**: All endpoints except `/` require secret validation
- **Testing**: Always test locally with Docker before pushing to production

## Key Files

- **main.py**: Core FastAPI application with `/` and `/generate` endpoints
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
4. Docker MUST use `.env.local`: `docker run --env-file .env.local`
5. **NEVER use .env with Docker** - it only contains dummy values!
6. **IMPORTANT**: Never commit `.env.local` - it's gitignored for security

### Production (Render.com)
- Render does NOT use .env or .env.local files
- Environment variables are set in Render Dashboard or via Render MCP CLI
- Required variables: `OPENAI_API_KEY`, `API_SECRET`
- Update via Dashboard or: `mcp__render__update_environment_variables`

## Architecture

### Core Components

- **main.py**: Single-file FastAPI application
  - `/` endpoint: GET endpoint for health checks (no authentication)
  - `/generate` endpoint: POST endpoint that accepts a prompt, optional conversation history, and secret
  - Uses OpenAI's AsyncOpenAI client for async API calls
  - Configured to use `gpt-4o-mini` model with max_completion_tokens=40
  - Response is truncated to first 10 words
  - **Authentication**: Validates `secret` parameter against `API_SECRET` environment variable

### Key Dependencies

- **uv**: Modern Python package manager (replaces pip/poetry)
- **FastAPI**: Web framework
- **OpenAI SDK**: OpenAI API client (requires version >=1.0.0)
- **python-dotenv**: Environment variable management

### Environment Variables

- `OPENAI_API_KEY`: Required for OpenAI API authentication
- `API_SECRET`: Required for API endpoint authentication (all endpoints except `/`)

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
- **Response format issues**: Check content extraction logic for ResponseReasoningItem objects
- **Authentication errors**: Verify `secret` parameter matches `API_SECRET` environment variable
- **Secrets in git**: Check `.env` only has dummy values, real secrets are in `.env.local`
- **Docker env errors**: Make sure you're using `--env-file .env.local` NOT `.env`
- **Platform issues on Apple Silicon**: Use `--platform linux/amd64` flag when building Docker images

## Testing Checklist

**⚠️ ALWAYS test locally before pushing to production!**

When making changes, verify:
- [ ] Changes tested locally with Docker using `.env.local`
- [ ] API endpoint responds correctly to test requests
- [ ] Error handling works for invalid inputs (wrong secret returns 401)
- [ ] Authentication is working properly
- [ ] Docker build succeeds without warnings
- [ ] Container runs and connects to OpenAI API
- [ ] Health check endpoint (`/`) works without authentication
- [ ] No real secrets committed in `.env` file

## iOS Shortcut Setup

The `Daily_Wife_Message.shortcut` file provides automated daily messaging:

1. **Install**: AirDrop to iPhone or upload to iCloud Drive
2. **Configure**:
   - Open Shortcuts app
   - Edit the shortcut
   - Verify the secret matches your `API_SECRET`
   - Add recipient phone number (or it will prompt)
3. **Automate**:
   - Go to Automation tab
   - Create Time of Day automation (e.g., 12:00 PM daily)
   - Link to "Daily Wife Message" shortcut
   - Turn OFF "Ask Before Running" for true automation

## Deployment (Render)

- Service URL: https://genmsg.onrender.com
- Auto-deploy enabled from `main` branch
- Environment variables set via Render MCP or Dashboard
- Monitor deploys via: `render list deploys`
- View logs via: `render show logs`
