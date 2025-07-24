# syntax=docker/dockerfile:1.4
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && apt-get clean

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s ~/.local/bin/poetry /usr/local/bin/poetry

# Set work directory
WORKDIR /app

# Copy only dependency files first
COPY ./backend/pyproject.toml ./backend/poetry.lock /app/

# Disable Poetry's virtualenv creation
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-root

# Copy all app files (production code)
#COPY ./backend/ /app/
# Default command: run Flask
CMD ["flask", "run", "--host=0.0.0.0", "--port=8000"]


# for dev?
CMD ["sleep", "infinity"]
