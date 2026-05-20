
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
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

-- Usuarios demo con correos institucionales (contraseñas en texto plano para prototipo)
INSERT INTO users (email, password, name, role) VALUES ('admin@girardota.gov.co', 'Admin2026*', 'Alcalde General', 'admin');
INSERT INTO users (email, password, name, role) VALUES ('gestor@girardota.gov.co', 'Gestor2026*', 'Gestor Operativo', 'gestor');
INSERT INTO users (email, password, name, role) VALUES ('auditor@girardota.gov.co', 'Auditor2026*', 'Auditor de Control', 'auditor');
INSERT INTO users (email, password, name, role) VALUES ('lector@girardota.gov.co', 'Lector2026*', 'Veedor Social', 'lector');
