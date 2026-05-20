<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
// backend/api.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$conn = getDB();

// --- AUTO-MIGRATION CHECK ---
try {
    $check = $conn->query("SHOW COLUMNS FROM users LIKE 'email'");
    if ($check && $check->num_rows == 0) {
        // Si la columna email no existe, ejecutamos la migración automáticamente
        $conn->query("ALTER TABLE users CHANGE username email VARCHAR(150) NOT NULL UNIQUE");
        $conn->query("UPDATE users SET email = 'admin@girardota.gov.co', password = 'Admin2026*' WHERE role = 'admin'");
        $conn->query("UPDATE users SET email = 'gestor@girardota.gov.co', password = 'Gestor2026*' WHERE role = 'gestor'");
        $conn->query("UPDATE users SET email = 'auditor@girardota.gov.co', password = 'Auditor2026*' WHERE role = 'auditor'");
        $conn->query("UPDATE users SET email = 'lector@girardota.gov.co', password = 'Lector2026*' WHERE role = 'lector'");
    }
} catch (Throwable $e) {
    // Ignore migration errors (e.g. if another concurrent request already ran the ALTER TABLE)
}
// ----------------------------

$endpoint = $_GET['endpoint'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper para obtener arreglos rápido
function fetchAll($conn, $sql, $types = "", ...$params) {
    $stmt = $conn->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while($row = $result->fetch_assoc()){
        $data[] = $row;
    }
    return $data;
}

// Router Principal
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($endpoint) {
        case 'login':
            if ($method === 'POST') {
                $user = trim($input['email'] ?? $input['username'] ?? '');
                $pass = $input['password'] ?? '';
                $data = fetchAll($conn, "SELECT id, email, name, role FROM users WHERE email = ? AND password = ?", "ss", $user, $pass);
                if (count($data) > 0) {
                    echo json_encode(["status" => "success", "user" => $data[0]]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Credenciales incorrectas"]);
                }
            }
            break;

        case 'global_budgets':
            if ($method === 'GET') {
                echo json_encode(fetchAll($conn, "SELECT year, initial_budget as initialBudget, addition, superavit FROM global_budgets"));
            } elseif ($method === 'POST') {
                $year = $input['year'];
                $initial = $input['initialBudget'] ?? 0;
                $addition = $input['addition'] ?? 0;
                $superavit = $input['superavit'] ?? 0;
                $sql = "INSERT INTO global_budgets (year, initial_budget, addition, superavit) VALUES (?, ?, ?, ?) 
                        ON DUPLICATE KEY UPDATE initial_budget=?, addition=?, superavit=?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("issssss", $year, $initial, $addition, $superavit, $initial, $addition, $superavit);
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            }
            break;

        case 'jacs':
            if ($method === 'GET') {
                echo json_encode(fetchAll($conn, "SELECT id, name, year, assigned, addition, paid, projects FROM jacs"));
            } elseif ($method === 'POST') {
                $id = $input['id'] ?? null;
                $name = $input['name'];
                $year = $input['year'];
                $assigned = $input['assigned'];
                $addition = $input['addition'] ?? 0;
                $projects = $input['projects'];
                
                if ($id) {
                    $stmt = $conn->prepare("UPDATE jacs SET name=?, assigned=?, addition=?, projects=? WHERE id=?");
                    $stmt->bind_param("sssii", $name, $assigned, $addition, $projects, $id);
                } else {
                    $stmt = $conn->prepare("INSERT INTO jacs (name, year, assigned, addition, projects) VALUES (?, ?, ?, ?, ?)");
                    $stmt->bind_param("sissi", $name, $year, $assigned, $addition, $projects);
                }
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            } elseif ($method === 'DELETE') {
                $id = $input['id'];
                $stmt = $conn->prepare("DELETE FROM jacs WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            }
            break;

        case 'directory_jacs':
            if ($method === 'GET') {
                echo json_encode(fetchAll($conn, "SELECT id, name, zone, president, phone FROM directory_jacs"));
            } elseif ($method === 'POST') {
                $id = $input['id'] ?? null;
                $name = $input['name'];
                $zone = $input['zone'];
                $president = $input['president'];
                $phone = $input['phone'];
                
                if ($id) {
                    $stmt = $conn->prepare("UPDATE directory_jacs SET name=?, zone=?, president=?, phone=? WHERE id=?");
                    $stmt->bind_param("ssssi", $name, $zone, $president, $phone, $id);
                } else {
                    $stmt = $conn->prepare("INSERT INTO directory_jacs (name, zone, president, phone) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param("ssss", $name, $zone, $president, $phone);
                }
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            } elseif ($method === 'DELETE') {
                $id = $input['id'];
                $stmt = $conn->prepare("DELETE FROM directory_jacs WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            }
            break;

        case 'projects':
            if ($method === 'GET') {
                echo json_encode(fetchAll($conn, "SELECT id, jac_id as jacId, year, title, description, status, budget, has_addition as hasAddition, addition, documents_json as documents, photos_json as photos, notes_json as notes FROM projects"));
            } elseif ($method === 'POST') {
                $id = $input['id'] ?? null;
                $jacId = $input['jacId'];
                $year = $input['year'];
                $title = $input['title'];
                $desc = $input['description'] ?? '';
                $status = $input['status'];
                $budget = $input['budget'];
                $hasAddition = $input['hasAddition'] ? 1 : 0;
                $addition = $input['addition'] ?? 0;
                $docs = json_encode($input['documents'] ?? []);
                $photos = json_encode($input['photos'] ?? []);
                $notes = json_encode($input['notes'] ?? []);

                if ($id) {
                    $stmt = $conn->prepare("UPDATE projects SET title=?, description=?, status=?, budget=?, has_addition=?, addition=?, documents_json=?, photos_json=?, notes_json=? WHERE id=?");
                    $stmt->bind_param("ssssissssi", $title, $desc, $status, $budget, $hasAddition, $addition, $docs, $photos, $notes, $id);
                } else {
                    $stmt = $conn->prepare("INSERT INTO projects (jac_id, year, title, description, status, budget, has_addition, addition, documents_json, photos_json, notes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->bind_param("iissssissss", $jacId, $year, $title, $desc, $status, $budget, $hasAddition, $addition, $docs, $photos, $notes);
                }
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            } elseif ($method === 'DELETE') {
                $id = $input['id'];
                $stmt = $conn->prepare("DELETE FROM projects WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            }
            break;

        case 'payments':
            if ($method === 'GET') {
                echo json_encode(fetchAll($conn, "SELECT id, jac_id as jacId, year, amount, date, description FROM payments"));
            } elseif ($method === 'POST') {
                $jacId = $input['jacId'];
                $year = $input['year'];
                $amount = $input['amount'];
                $date = $input['date'];
                $desc = $input['description'];
                
                $stmt = $conn->prepare("INSERT INTO payments (jac_id, year, amount, date, description) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("iisss", $jacId, $year, $amount, $date, $desc);
                $stmt->execute();
                
                // Actualizar 'paid' en la tabla jacs correspondiente
                $stmt2 = $conn->prepare("UPDATE jacs SET paid = paid + ? WHERE id = ?");
                $stmt2->bind_param("si", $input['amount'], $input['jacId']);
                $stmt2->execute();
                
                echo json_encode(["status" => "success"]);
            }
            break;

        case 'users':
            if ($method === 'GET') {
                try {
                    echo json_encode(fetchAll($conn, "SELECT id, email, name, role FROM users"));
                } catch (Throwable $e) {
                    // If it fails (e.g. email column doesn't exist yet because migration failed), fallback to username
                    try {
                        $oldUsers = fetchAll($conn, "SELECT id, username as email, name, role FROM users");
                        echo json_encode($oldUsers);
                    } catch (Throwable $e2) {
                        echo json_encode(["status" => "error", "message" => $e2->getMessage()]);
                    }
                }
            } elseif ($method === 'POST') {
                try {
                    if (isset($input['id']) && $input['id']) {
                         $stmt = $conn->prepare("UPDATE users SET name=?, email=?, password=?, role=? WHERE id=?");
                         $stmt->bind_param("ssssi", $input['name'], $input['email'], $input['password'], $input['role'], $input['id']);
                    } else {
                         $stmt = $conn->prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
                         $stmt->bind_param("ssss", $input['email'], $input['password'], $input['name'], $input['role']);
                    }
                    $stmt->execute();
                    echo json_encode(["status" => "success"]);
                } catch (Throwable $e) {
                    $errorMsg = "Error al guardar el usuario: " . $e->getMessage();
                    if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'UNIQUE') !== false) {
                        $errorMsg = "El correo electrónico ya está registrado.";
                    }
                    echo json_encode(["status" => "error", "message" => $errorMsg]);
                }
            }
            break;

        case 'recover_password':
            if ($method === 'POST') {
                $email = $input['email'] ?? '';
                try {
                    $data = fetchAll($conn, "SELECT id, name, email FROM users WHERE email = ?", "s", $email);
                } catch (Throwable $e) {
                    $data = fetchAll($conn, "SELECT id, name, username as email FROM users WHERE username = ?", "s", $email);
                }
                if (count($data) > 0) {
                    echo json_encode(["status" => "success", "user" => $data[0]]);
                } else {
                    echo json_encode(["status" => "error", "message" => "No existe una cuenta con este correo institucional."]);
                }
            }
            break;

        case 'change_password':
            if ($method === 'POST') {
                $email = $input['email'] ?? '';
                $newPass = $input['new_password'] ?? '';
                try {
                    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
                    $stmt->bind_param("ss", $newPass, $email);
                    $stmt->execute();
                } catch (Throwable $e) {
                    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE username = ?");
                    $stmt->bind_param("ss", $newPass, $email);
                    $stmt->execute();
                }
                if ($stmt->affected_rows > 0) {
                    echo json_encode(["status" => "success"]);
                } else {
                    echo json_encode(["status" => "error", "message" => "No se pudo actualizar la contraseña o el correo no existe."]);
                }
            }
            break;

        default:
            echo json_encode(["status" => "error", "message" => "Endpoint no válido"]);
    }
} catch (Throwable $fatal) {
    echo json_encode([
        "status" => "error", 
        "message" => "Excepción fatal en el backend (" . $endpoint . "): " . $fatal->getMessage(),
        "trace" => $fatal->getTraceAsString()
    ]);
}
$conn->close();
?>
