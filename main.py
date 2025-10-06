import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="GPT-5 Nano Text Generator", version="1.0")


class GenerationRequest(BaseModel):
    prompt: str
    conversation_history: list[str] | None = None


@app.post("/generate")
async def generate_text(request: GenerationRequest):
    try:
        messages = []
        if request.conversation_history:
            for msg in request.conversation_history:
                messages.append({"role": "user", "content": msg})
        messages.append({"role": "user", "content": request.prompt})

        response = await client.chat.completions.create(
            model="gpt-5-nano",
            messages=messages,
            max_completion_tokens=40,
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
        
        # Truncate to first 10 words
        text_output = text_output.strip()
        if not text_output:
            return {"generated_text": "No content generated"}
        
        truncated = " ".join(text_output.split()[:10])
        return {"generated_text": truncated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "GPT-5 Nano FastAPI is running!"}
