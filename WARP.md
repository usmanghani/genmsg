# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

FastAPI service that uses OpenAI's GPT models for text generation. The service provides an endpoint for generating short text responses (truncated to first 10 words) based on user prompts with optional conversation history.

## Development Commands

### Running the Application

```bash
# Install dependencies and run using uv
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker

**⚠️ CRITICAL: Always test all changes locally first before pushing to production!**

#### Building the Image

**Local Development:**
```bash
# Build with test tag for local testing
docker build -t genmsg:test .

# Build for specific platform (e.g., on Apple Silicon for AMD64)
docker build --platform linux/amd64 -t genmsg:test .
```

#### Running the Container

**Local Development (ALWAYS use .env.local):**
```bash
# Run with .env.local (contains real secrets, gitignored)
docker run -d --name genmsg-test -p 8000:8000 --env-file .env.local genmsg:test

# View logs
docker logs -f genmsg-test

# Stop and remove
docker stop genmsg-test && docker rm genmsg-test
```

**⚠️ NEVER run with .env file - it only contains dummy values!**

**Production (Render.com):**
- Render automatically builds from Dockerfile
- Environment variables set in Render Dashboard (NOT from .env files)
- Never commit .env.local to the repository
- Set `OPENAI_API_KEY` and `API_SECRET` in Render Dashboard

#### Managing the Container

```bash
# View logs (follow mode)
docker logs -f genmsg-test

# Stop the container
docker stop genmsg-test

# Remove the container
docker rm genmsg-test

# Stop and remove in one command
docker stop genmsg-test && docker rm genmsg-test

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a
```

#### Dockerfile Notes

- The Dockerfile CMD is currently: `uv run`
- This needs a proper script configuration in `pyproject.toml` or should be updated to:
  ```dockerfile
  CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```

#### Troubleshooting

- **Connection refused**: Ensure container is running (`docker ps`) and port is not in use
- **Missing OPENAI_API_KEY**: Verify the key is set via `--env-file` or `-e`
- **Cannot reach OpenAI API**: Check network connectivity from container
- **Platform issues on Apple Silicon**: Use `--platform linux/amd64` flag when building
- **Port already in use**: Use a different host port with `-p <different-port>:8000`
- **Authentication errors**: Verify `API_SECRET` environment variable is set

### API Usage

```bash
# Test root endpoint (no authentication required)
curl http://localhost:8000/

# Generate text (with authentication)
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your prompt here", "conversation_history": [], "secret": "your-secret-key-here"}'
```

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
4. Docker MUST use `.env.local` for local testing: `docker run --env-file .env.local`
5. **NEVER use .env with Docker** - it only contains dummy values!

### Production (Render.com)
- Render does NOT use .env or .env.local files
- Environment variables are set in Render Dashboard or via Render MCP CLI
- Required variables: `OPENAI_API_KEY`, `API_SECRET`
- Update via Dashboard or: `mcp__render__update_environment_variables`

## Project Structure

- `main.py`: FastAPI application with endpoints
- `pyproject.toml`: uv project configuration and dependencies
- `Dockerfile`: Container definition using Python 3.11-slim
- `.env`: Template with dummy values (committed to repo)
- `.env.local`: Local development secrets with real API keys (never commit - gitignored)
- `Daily_Wife_Message.shortcut`: iOS Shortcut for automated daily messages

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

## Testing Checklist

**⚠️ ALWAYS test locally before pushing to production!**

When making changes, verify:
- [ ] Changes tested locally with Docker using `.env.local`
- [ ] API endpoint responds correctly to test requests
- [ ] Error handling works for invalid inputs (wrong secret returns 401)
- [ ] Docker build succeeds without warnings
- [ ] Container runs and connects to OpenAI API
- [ ] Authentication is working properly
- [ ] No real secrets committed in `.env` file
