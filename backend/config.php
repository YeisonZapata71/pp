<?php
// backend/config.php

define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // Cuando lo subas a Hostinger, pones aquí tu usuario de BD
define('DB_PASS', '');     // Aquí va la contraseña de la BD en Hostinger
define('DB_NAME', 'presupuestos'); // Aquí el nombre de tu base de datos

function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die(json_encode(["error" => "Error de conexión a la base de datos: " . $conn->connect_error]));
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}
?>
