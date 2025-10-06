import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="GPT-5 Nano Text Generator", version="1.0")


class GenerationRequest(BaseModel):
    prompt: str
    conversation_history: list[str] | None = None


@app.post("/generate")
async def generate_text(request: GenerationRequest):
    try:
        # Build conversation context from history
        conversation_context = ""
        if request.conversation_history:
            for msg in request.conversation_history:
                conversation_context += f"{msg}\n"
        
        # Append the current prompt
        full_prompt = conversation_context + request.prompt

        response = await client.responses.create(
            model="gpt-5-nano",
            input=full_prompt,
        )

        # Handle response output - it's a list of content items
        text_output = ""
        if hasattr(response, 'output') and response.output:
            if isinstance(response.output, list):
                # Extract text from the first output item
                text_output = response.output[0] if response.output else ""
            else:
                text_output = str(response.output)
        
        text_output = text_output.strip() if text_output else ""
        truncated = " ".join(text_output.split()[:10]) if text_output else "No response generated"
        return {"generated_text": truncated}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "GPT-5 Nano FastAPI is running!"}
