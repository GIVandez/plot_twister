import sqlalchemy as db

# Создание движка
engine = db.create_engine("postgresql://aaa:aaa@localhost:5432/plot_twister ")

conn = engine.connect()
metadata = db.MetaData()
