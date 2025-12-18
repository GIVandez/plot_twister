from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

from main import app


# Pydantic модели
class LoginRequest(BaseModel):
    login: str
    password: str


class LoginResponse(BaseModel):
    access_token: str


class RegisterRequest(BaseModel):
    login: str
    password: str
    email: EmailStr


class UserProfile(BaseModel):
    user_id: int
    login: str
    email: str
    created_at: str


class AuthModel:
    def __init__(self, app: FastAPI):
        self.app = app
        self.setup_routes()
    
    def setup_routes(self):
        """Регистрация всех эндпоинтов авторизации"""
        
        @self.app.post("/api/auth/login", response_model=LoginResponse)
        async def login(request: LoginRequest):
            """Вход пользователя в аккаунт"""
            # Проверка логина и пароля
            if request.login == "admin" and request.password == "admin":
                return LoginResponse(access_token="fake-jwt-token-123")
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Неверный логин или пароль"
                )
        
        @self.app.post("/api/auth/register", status_code=201)
        async def register(request: RegisterRequest):
            """Регистрация пользователя"""
            # Проверка уникальности логина
            if request.login == "existing_user":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Логин уже занят"
                )
            
            # Создание пользователя
            return {"message": "Пользователь создан", "user_id": 1}
        
        @self.app.get("/api/auth/profile/{user_id}")
        async def get_profile(user_id: int):
            """Загрузка личного кабинета пользователя"""
            if user_id == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Пользователь не найден"
                )
            
            return UserProfile(
                user_id=user_id,
                login="test_user",
                email="test@example.com",
                created_at="2024-01-01"
            )


# Инициализация AuthModel
auth_model = AuthModel(app)


# Альтернативная регистрация через декораторы (для явности)
@app.post("/api/auth/login")
async def login(request: LoginRequest):
    return await auth_model.setup_routes.__wrapped__.__self__.login(request)


@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    return {"message": "Регистрация успешна"}


@app.get("/api/auth/profile/{user_id}")
async def get_profile(user_id: int):
    return {"user_id": user_id, "login": "test_user"}