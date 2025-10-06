# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

FastAPI service that uses OpenAI's GPT-5-nano model for text generation. The service provides an endpoint for generating short text responses (truncated to first 10 words) based on user prompts with optional conversation history.

## Development Commands

### Running the Application

```bash
# Install dependencies and run using uv
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker

#### Building the Image

```bash
# Build with latest tag
docker build -t gpt5-nano-fastapi:latest .

# Build with specific version tag
docker build -t gpt5-nano-fastapi:1.0.0 -t gpt5-nano-fastapi:latest .

# Build for specific platform (e.g., on Apple Silicon for AMD64)
docker build --platform linux/amd64 -t gpt5-nano-fastapi:latest .
```

#### Running the Container

**Using environment file (.env):**
```bash
docker run --name gpt5-nano-fastapi -p 8000:8000 --env-file .env gpt5-nano-fastapi:latest
```

**Passing API key directly:**
```bash
docker run --name gpt5-nano-fastapi -p 8000:8000 -e OPENAI_API_KEY=your-api-key-here gpt5-nano-fastapi:latest
```

**Running in detached mode:**
```bash
docker run -d --name gpt5-nano-fastapi -p 8000:8000 --env-file .env gpt5-nano-fastapi:latest
```

**Using a different host port:**
```bash
# Map host port 8080 to container port 8000
docker run --name gpt5-nano-fastapi -p 8080:8000 --env-file .env gpt5-nano-fastapi:latest
# Access at http://localhost:8080
```

#### Managing the Container

```bash
# View logs (follow mode)
docker logs -f gpt5-nano-fastapi

# Stop the container
docker stop gpt5-nano-fastapi

# Remove the container
docker rm gpt5-nano-fastapi

# Stop and remove in one command
docker stop gpt5-nano-fastapi && docker rm gpt5-nano-fastapi

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
