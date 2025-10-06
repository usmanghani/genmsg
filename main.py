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
        messages = []
        if request.conversation_history:
            for msg in request.conversation_history:
                messages.append({"role": "user", "content": msg})
        messages.append({"role": "user", "content": request.prompt})

        response = await client.chat.completions.create(
            model="gpt-5-nano",
            messages=messages,
            max_completion_tokens=40,
            temperature=0.7,
        )

        text_output = response.choices[0].message.content.strip()
        truncated = " ".join(text_output.split()[:10])
        return {"generated_text": truncated}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "GPT-5 Nano FastAPI is running!"}
