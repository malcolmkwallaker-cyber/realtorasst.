#!/bin/bash
# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
