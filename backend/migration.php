<?php
// backend/migration.php
// Script temporal para migrar los campos de la base de datos a DECIMAL(20,2) para soportar comas/decimales

require_once 'config.php';

$conn = getDB();

$queries = [
    "ALTER TABLE global_budgets MODIFY initial_budget DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE global_budgets MODIFY addition DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE global_budgets MODIFY superavit DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    
    "ALTER TABLE jacs MODIFY assigned DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE jacs MODIFY addition DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE jacs MODIFY paid DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    
    "ALTER TABLE payments MODIFY amount DECIMAL(20,2) NOT NULL",
    
    "ALTER TABLE projects MODIFY budget DECIMAL(20,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE projects MODIFY addition DECIMAL(20,2) NOT NULL DEFAULT 0.00"
];

echo "<h1>Ejecutando Migración a Decimales...</h1>";

foreach ($queries as $query) {
    if ($conn->query($query) === TRUE) {
        echo "<p style='color:green;'>Éxito: $query</p>";
    } else {
        echo "<p style='color:red;'>Error al ejecutar: $query <br> " . $conn->error . "</p>";
    }
}

echo "<h3>¡Migración Completada! Ahora puedes borrar este archivo (migration.php) por seguridad.</h3>";
$conn->close();
?>
