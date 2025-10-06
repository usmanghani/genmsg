import os
import logging
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.INFO)

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
API_SECRET = os.getenv("API_SECRET", "default_secret_change_me")

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="GPT-5 Nano Text Generator", version="1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class GenerationRequest(BaseModel):
    prompt: str
    conversation_history: list[str] | None = None
    secret: str


@app.post("/generate")
@limiter.limit("10/minute")  # 10 requests per minute per IP
async def generate_text(request: Request, body: GenerationRequest):
    # Verify secret
    if body.secret != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid authentication secret")

    try:
        messages = []
        if body.conversation_history:
            for msg in body.conversation_history:
                messages.append({"role": "user", "content": msg})
        messages.append({"role": "user", "content": body.prompt})

        response = await client.chat.completions.create(
            model="gpt-5-nano-2025-08-07",
            messages=messages,
        )

        # Extract content from response
        message = response.choices[0].message
        content = message.content
        
        # Log for debugging
        logging.info(f"Content type: {type(content)}")
        logging.info(f"Content value: {content}")
        if isinstance(content, list) and len(content) > 0:
            logging.info(f"First item type: {type(content[0])}")
            logging.info(f"First item value: {content[0]}")
            if hasattr(content[0], '__dict__'):
                logging.info(f"First item dict: {content[0].__dict__}")
        
        # Convert content to string
        if content is None:
            text_output = ""
        elif isinstance(content, str):
            text_output = content
        elif isinstance(content, list):
            # Handle list of content items
            parts = []
            for item in content:
                # Try different ways to extract text
                if isinstance(item, str):
                    parts.append(item)
                elif hasattr(item, 'text'):
                    parts.append(str(item.text))
                elif hasattr(item, 'content'):
                    parts.append(str(item.content))
                elif hasattr(item, '__dict__'):
                    # Try to get any text-like attribute
                    item_dict = item.__dict__
                    if 'text' in item_dict:
                        parts.append(str(item_dict['text']))
                    elif 'content' in item_dict:
                        parts.append(str(item_dict['content']))
                    else:
                        parts.append(str(item))
                else:
                    parts.append(str(item))
            text_output = " ".join(parts)
        else:
            text_output = str(content)
        
        # Return full text (no truncation)
        text_output = text_output.strip()
        if not text_output:
            return {"generated_text": "No content generated"}

        return {"generated_text": text_output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
@limiter.limit("60/minute")  # Higher limit for health checks
async def root(request: Request):
    return {"message": "GPT-5 Nano FastAPI is running!"}
