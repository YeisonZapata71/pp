<?php
// backend/config.php

define('DB_HOST', 'localhost');
define('DB_USER', 'u738685852_userpp'); 
define('DB_PASS', 'u738685852_ppGira2026**');     
define('DB_NAME', 'u738685852_pp'); 

function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die(json_encode(["error" => "Error de conexión a la base de datos: " . $conn->connect_error]));
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}
?>
