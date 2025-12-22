import sqlalchemy as db

#engine = db.create_engine("postgresql://aaa:aaa@localhost:5432/plot_twister")
engine = db.create_engine("postgresql://root:root@localhost:5432/plot_twister")

#conn = engine.connect()
# metadata = db.MetaData() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!



# 
# # Пример использования
# if __name__ == "__main__":
#     # Создаем экземпляр модели
#     db = DatabaseController()
#     
#     # Тестируем методы
#     # Создание пользователя
#     db.create_user("test_user", "test_password", "test@example.com")
#     
#     # Проверка существования пользователя
#     exists = db.user_exist("test_user")
#     print(f"User exists: {exists}")
#     
#     # Получение информации о пользователе
#     user_info = db.read_user_info("test_user")
#     print(f"User info: {user_info}")
#     
#     # Создание проекта
#     # Нужно получить ID пользователя
#     # В реальном приложении можно добавить метод для получения ID по логину