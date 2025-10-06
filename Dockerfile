FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install uv

COPY . .

CMD ["uv", "run"]
