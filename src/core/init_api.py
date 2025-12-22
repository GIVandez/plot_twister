from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routes import admin_router, frame_router, graphic_editor_router, page_router, project_router, user_router, auth_router

import os
from pathlib import Path

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

# Получаем путь к текущему файлу
current_dir = Path(__file__).parent.parent
static_path = current_dir / "static" / "account"

# Монтируем папку стилей и скриптов
app.mount("/account", StaticFiles(directory=f"{current_dir}/static/account"), name="account")
app.mount("/admin", StaticFiles(directory=f"{current_dir}/static/admin"), name="admin")
app.mount("/script", StaticFiles(directory=f"{current_dir}/static/script"), name="script")
app.mount("/storyboard", StaticFiles(directory=f"{current_dir}/static/storyboard"), name="storyboard")
app.mount("/auth", StaticFiles(directory=f"{current_dir}/static/auth"), name="auth")
app.mount("/project", StaticFiles(directory=f"{current_dir}/static/project"), name="project")
app.mount("/static", StaticFiles(directory=f"{current_dir}/static"), name="static")



app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(frame_router.router)
app.include_router(graphic_editor_router.router)
app.include_router(page_router.router)
app.include_router(project_router.router)
app.include_router(user_router.router)
