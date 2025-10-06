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
```bash
# Build image
docker build -t gpt5-nano-fastapi:latest .

# Run container with env file
docker run --name gpt5-nano-fastapi -p 8000:8000 --env-file .env gpt5-nano-fastapi:latest

# View logs
docker logs -f gpt5-nano-fastapi

# Stop and remove container
docker stop gpt5-nano-fastapi && docker rm gpt5-nano-fastapi
```

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

### Local Development
1. Copy `.env` to `.env.local`: `cp .env .env.local`
2. Edit `.env.local` with your real secrets:
   ```
   OPENAI_API_KEY=sk-your-actual-openai-key
   API_SECRET=your-secret-key-here
   ```
3. The app automatically loads `.env.local` if it exists (takes precedence over `.env`)

### Production (Render)
- Set environment variables in Render Dashboard or via CLI
- Required: `OPENAI_API_KEY`, `API_SECRET`

## Development Notes

- Currently using `gpt-4o-mini` model (was `gpt-5-nano` which returns empty responses)
- Max tokens set to 40, temperature 0.7
- Response truncation happens after generation
- Uses FastAPI's automatic OpenAPI documentation at `/docs`
- **Authentication**: All endpoints except `/` require `secret` parameter matching `API_SECRET` env var

## Common Issues and Solutions

- **Empty responses**: Check if model name is correct (use `gpt-4o-mini` not `gpt-5-nano`)
- **Connection refused**: Ensure container is running and port 8000 is available
- **API key errors**: Verify `OPENAI_API_KEY` is set in `.env` file
- **Response format issues**: Check content extraction logic for ResponseReasoningItem objects

## Testing Checklist

When making changes, always verify:
- [ ] API endpoint responds correctly to test requests
- [ ] Error handling works for invalid inputs
- [ ] Docker build succeeds without warnings
- [ ] Container runs and connects to OpenAI API
- [ ] Response truncation works as expected (10 words max)