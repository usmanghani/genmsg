"""Pytest configuration and fixtures for FastAPI app testing."""
import os
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import AsyncClient, ASGITransport
from openai.types.chat.chat_completion import ChatCompletion, ChatCompletionMessage, Choice

# Import the app
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from main import app, client as openai_client


@pytest.fixture
def api_secret():
    """Return a test API secret."""
    return "test_secret_12345"


@pytest.fixture(autouse=True)
def set_api_secret(monkeypatch, api_secret):
    """Set API_SECRET environment variable for all tests."""
    monkeypatch.setenv("API_SECRET", api_secret)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key-fake")
    # Reload the main module to pick up new env vars
    import main
    import importlib
    importlib.reload(main)


@pytest.fixture
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI chat completion response."""
    # Create a properly structured mock response
    choice = Choice(
        finish_reason="stop",
        index=0,
        message=ChatCompletionMessage(
            content="This is a test response from OpenAI",
            role="assistant"
        )
    )
    
    response = ChatCompletion(
        id="chatcmpl-test123",
        choices=[choice],
        created=1234567890,
        model="gpt-5-nano-2025-08-07",
        object="chat.completion"
    )
    
    return response


@pytest.fixture
def mock_openai_client(monkeypatch, mock_openai_response):
    """Mock the OpenAI client to avoid real API calls."""
    # Create a mock AsyncOpenAI client
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_openai_response)
    
    # Patch the client in the main module
    monkeypatch.setattr("main.client", mock_client)
    
    return mock_client
