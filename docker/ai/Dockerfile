FROM python:3.11-slim
WORKDIR /app
COPY services/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/ai/ .
ENV USE_MOCK_EXTRACTOR=true
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
