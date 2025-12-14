import sys
import os
#from pydantic import BaseModel
from fastapi import FastAPI
from fastapi import FastAPI, Body, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles


# запуск сервера
# uv run uvicorn main:app --reload
# sudo systemctl start postgresql
#
# http://127.0.0.1:8000
#
#
# 
# 
# uv python install 3.11
# uv venv --python 3.11
# uv sync
app = FastAPI()
# Монтируем папку стилей и скриптов
# Используем абсолютные пути относительно расположения main.py
base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")

app.mount("/static", StaticFiles(directory=os.path.join(base_dir, "static")), name="static")
@app.get("/")
async def get_index():
    return FileResponse("static/account/index.html")

