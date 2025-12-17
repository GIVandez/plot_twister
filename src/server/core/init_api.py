from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from server.routes import admin_router, frame_router, graphic_editor_router, page_router, project_router

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
app.mount("/static", StaticFiles(directory="D:/Code/five/plot_twister/src/static"), name="static")
app.include_router(admin_router.router)
app.include_router(frame_router.router)
app.include_router(graphic_editor_router.router)
app.include_router(page_router.router)
app.include_router(project_router.router)
