CREATE DATABASE IF NOT EXISTS presupuestos;
USE presupuestos;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS global_budgets (
    year INT PRIMARY KEY,
    initial_budget BIGINT NOT NULL DEFAUlT 0,
    addition BIGINT NOT NULL DEFAULT 0,
    superavit BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jacs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    year INT NOT NULL,
    assigned BIGINT NOT NULL DEFAULT 0,
    addition BIGINT NOT NULL DEFAULT 0,
    paid BIGINT NOT NULL DEFAULT 0,
    projects INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS directory_jacs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    zone VARCHAR(50) NOT NULL,
    president VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jac_id INT NOT NULL,
    year INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    budget BIGINT NOT NULL DEFAULT 0,
    has_addition BOOLEAN NOT NULL DEFAULT 0,
    addition BIGINT NOT NULL DEFAULT 0,
    documents_json TEXT,
    photos_json TEXT,
    notes_json TEXT
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jac_id INT NOT NULL,
    year INT NOT NULL,
    amount BIGINT NOT NULL,
    date DATE NOT NULL,
    description VARCHAR(255)
);

-- Insert demo users (contraseñas en texto plano por temas de simplificación rápida para este prototipo)
INSERT INTO users (username, password, name, role) VALUES ('admin', '123', 'Alcalde General', 'admin');
INSERT INTO users (username, password, name, role) VALUES ('gestor', '123', 'Gestor Operativo', 'gestor');
