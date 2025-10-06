# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

FastAPI service that uses OpenAI's GPT-5-nano model for text generation. The service provides an endpoint for generating short text responses (truncated to first 10 words) based on user prompts with optional conversation history.

## Development Commands

### Running the Application

```bash
# Install dependencies and run using uv
uv run

# This runs: uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker

```bash
# Build Docker image
docker build -t gpt5-nano-fastapi .

# Run container (requires OPENAI_API_KEY environment variable)
docker run -p 8000:8000 --env-file .env gpt5-nano-fastapi
```

### API Usage

```bash
# Test root endpoint
curl http://localhost:8000/

# Generate text
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your prompt here", "conversation_history": []}'
```

## Architecture

### Core Components

- **main.py**: Single-file FastAPI application
  - `/generate` endpoint: POST endpoint that accepts a prompt and optional conversation history
  - Uses OpenAI's AsyncOpenAI client for async API calls
  - Configured to use `gpt-5-nano` model with max_tokens=40, temperature=0.7
  - Response is truncated to first 10 words
  
### Key Dependencies

- **uv**: Modern Python package manager (replaces pip/poetry)
- **FastAPI**: Web framework
- **OpenAI SDK**: OpenAI API client (requires version >=1.0.0)
- **python-dotenv**: Environment variable management

### Environment Variables

- `OPENAI_API_KEY`: Required for OpenAI API authentication (stored in `.env` file)

## Project Structure

- `main.py`: FastAPI application with endpoints
- `pyproject.toml`: uv project configuration and dependencies
- `Dockerfile`: Container definition using Python 3.11-slim
- `.env`: Environment variables (contains OPENAI_API_KEY)
