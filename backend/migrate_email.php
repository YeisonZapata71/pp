<?php
// backend/migrate_email.php
require_once 'config.php';
$conn = getDB();

echo "Iniciando migración...<br>";

// 1. Cambiar nombre de la columna username a email si no existe ya
$check = $conn->query("SHOW COLUMNS FROM users LIKE 'username'");
if ($check->num_rows > 0) {
    $sql1 = "ALTER TABLE users CHANGE username email VARCHAR(150) NOT NULL UNIQUE";
    if ($conn->query($sql1) === TRUE) {
        echo "Columna 'username' cambiada a 'email' exitosamente.<br>";
    } else {
        echo "Error al cambiar la columna: " . $conn->error . "<br>";
    }
} else {
    echo "La columna 'email' ya existe.<br>";
}

// 2. Actualizar las cuentas a correos corporativos y contraseñas profesionales
$updates = [
    ['email' => 'admin@girardota.gov.co', 'password' => 'Admin2026*', 'old_user' => 'admin', 'role' => 'admin', 'name' => 'Alcalde General'],
    ['email' => 'gestor@girardota.gov.co', 'password' => 'Gestor2026*', 'old_user' => 'gestor', 'role' => 'gestor', 'name' => 'Gestor Operativo'],
    ['email' => 'auditor@girardota.gov.co', 'password' => 'Auditor2026*', 'old_user' => 'auditor', 'role' => 'auditor', 'name' => 'Auditor de Control'],
    ['email' => 'lector@girardota.gov.co', 'password' => 'Lector2026*', 'old_user' => 'lector', 'role' => 'lector', 'name' => 'Veedor Social']
];

foreach ($updates as $u) {
    // Intentamos actualizar por old_user primero
    $stmt = $conn->prepare("UPDATE users SET email = ?, password = ? WHERE email = ?");
    $stmt->bind_param("sss", $u['email'], $u['password'], $u['old_user']);
    $stmt->execute();
    
    if ($stmt->affected_rows > 0) {
        echo "Usuario " . $u['old_user'] . " actualizado a " . $u['email'] . "<br>";
    } else {
        // Verificar si el usuario ya está migrado o necesitamos crearlo
        $checkEmail = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $checkEmail->bind_param("s", $u['email']);
        $checkEmail->execute();
        $res = $checkEmail->get_result();
        
        if ($res->num_rows > 0) {
            $stmt2 = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
            $stmt2->bind_param("ss", $u['password'], $u['email']);
            $stmt2->execute();
            echo "Contraseña actualizada para " . $u['email'] . "<br>";
        } else {
            $stmt3 = $conn->prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
            $stmt3->bind_param("ssss", $u['email'], $u['password'], $u['name'], $u['role']);
            $stmt3->execute();
            echo "Usuario creado: " . $u['email'] . "<br>";
        }
    }
}

echo "<br>Migración completada exitosamente.";
$conn->close();
?>
