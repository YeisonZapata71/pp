<?php
// backend/testdb.php
// Script de prueba directa de conexión a la base de datos

require_once 'config.php';

echo "<h1>Prueba de Conexión a Base de Datos - Hostinger</h1>";
echo "<p>Intentando conectar...</p>";

try {
    mysqli_report(MYSQLI_REPORT_STRICT | MYSQLI_REPORT_ERROR);
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    echo "<h2 style='color:green;'>¡CONEXIÓN EXITOSA!</h2>";
    echo "<p>Host: " . DB_HOST . "</p>";
    echo "<p>Usuario: " . DB_USER . "</p>";
    echo "<p>Base de Datos: " . DB_NAME . "</p>";
    
    $conn->set_charset("utf8mb4");
    echo "<p>El charset fue configurado a utf8mb4 sin problemas.</p>";
    
} catch (\Throwable $e) {
    echo "<h2 style='color:red;'>ERROR DE CONEXIÓN</h2>";
    echo "<p><strong>Mensaje del servidor:</strong> " . $e->getMessage() . "</p>";
    echo "<p><strong>Código de error:</strong> " . $e->getCode() . "</p>";
}
echo "<hr><p>Fin de la prueba.</p>";
?>
