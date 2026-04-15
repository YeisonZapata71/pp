<?php
// backend/config.php

define('DB_HOST', 'localhost');
define('DB_USER', 'u738685852_userpp'); 
define('DB_PASS', 'u738685852_ppGira2026**');     
define('DB_NAME', 'u738685852_pp'); 

function getDB() {
    try {
        mysqli_report(MYSQLI_REPORT_STRICT | MYSQLI_REPORT_ERROR);
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $conn->set_charset("utf8mb4");
        return $conn;
    } catch (\Throwable $e) {
        die(json_encode([
            "status" => "error", 
            "message" => "Error crítico de Base de Datos Hostinger: Verifica el usuario/contraseña. (" . $e->getMessage() . ")"
        ]));
    }
}
?>
