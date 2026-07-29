FROM python:3.11-slim

# Prevent python from buffering stdout and writing pyc files
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Container execution entrypoint
ENTRYPOINT ["python", "main.py"]
