-- sudo -u postgres psql
-- create user plot_twister with password 'plot_twister'
-- create database plot_twister
-- ALTER DATABASE plot_twister OWNER TO aaa;
-- \c plot_twister

-- psql -U aaa -d plot_twister -f reset_db.sql


-- ILYAAAAAA
-- psql -U root -d plot_twister -f reset_db.sql



-- Удаляем существующие таблицы (если нужно пересоздать)
DROP TABLE IF EXISTS frame;
DROP TABLE IF EXISTS page;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS users;

-- Создаем таблицы с CASCADE для автоматического удаления связанных данных
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    owner INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE page (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    text TEXT,
    UNIQUE(project_id, number) -- Уникальный номер страницы в рамках проекта
);

CREATE TABLE frame (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    description TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    pic_path TEXT NOT NULL,
    connected_page INTEGER REFERENCES page(id) ON DELETE SET NULL,
    number INTEGER NOT NULL,
    UNIQUE(project_id, number), -- Уникальный номер кадра в рамках проекта
    CHECK (end_time >= start_time) -- Проверка корректности временных интервалов
);



-- Вставка тестовых данных для проверки
INSERT INTO users (login, password, role) VALUES 
    ('admin', 'admin123', 'admin'),
    ('user1', 'password1', 'user'),
    ('user2', 'password2', 'user');

INSERT INTO project (name, owner) VALUES 
    ('Первый проект', 1),
    ('Второй проект', 2),
    ('Тестовый проект', 1);

INSERT INTO page (project_id, number, text) VALUES 
    (1, 1, 'Текст первой страницы первого проекта'),
    (1, 2, 'Текст второй страницы первого проекта'),
    (2, 1, 'Текст страницы второго проекта'),
    (3, 1, 'Текст тестовой страницы');

INSERT INTO frame (project_id, description, start_time, end_time, pic_path, connected_page, number) VALUES 
    (1, 'Первый кадр проекта', 0, 10, '/uploads/frame1.jpg', 1, 1),
    (1, 'Второй кадр проекта', 10, 20, '/uploads/frame2.jpg', 2, 2),
    (2, 'Кадр второго проекта', 0, 15, '/uploads/frame3.jpg', 3, 1),
    (3, 'Тестовый кадр', 0, 5, '/uploads/test.jpg', 4, 1);

-- Даем необходимые привилегии пользователю aaa (если используете другого пользователя, замените имя)
-- GRANT ALL PRIVILEGES ON TABLE users TO aaa;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aaa;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aaa;