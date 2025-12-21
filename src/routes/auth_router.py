from fastapi import APIRouter, HTTPException, status
from dto.auth_dto import LoginRequest, LoginResponse, RegisterRequest, LogoutRequest
from user_models.auth_model import AuthModel

router = APIRouter()
auth_model = AuthModel()


@router.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Вход пользователя в свой аккаунт"""
    try:
        result = auth_model.login(request.login, request.password)
        
        # Если результат < 1000, это код ошибки
        if result < 1000:
            if result == 1:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Неверный логин или пароль"
                )
            elif result == 2:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Неверный логин или пароль"
                )
        
        return LoginResponse(access_token=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Регистрация пользователя"""
    try:
        result = auth_model.register(request.login, request.password, request.email)
        
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Пользователь с таким логином или email уже существует"
            )
        
        return {"message": "Пользователь создан", "access_token": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/auth/logout")
async def logout(request: LogoutRequest):
    """Выход пользователя из своего аккаунта"""
    # В текущей реализации токены не хранятся на сервере,
    # поэтому logout просто возвращает успех
    return {"success": True, "message": "Выход выполнен успешно"}
