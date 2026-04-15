<?php
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

switch ($endpoint) {
    case 'login':
        if ($method === 'POST') {
            $user = $input['username'] ?? '';
            $pass = $input['password'] ?? '';
            $data = fetchAll($conn, "SELECT id, username, name, role FROM users WHERE username = ? AND password = ?", "ss", $user, $pass);
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
            $sql = "INSERT INTO global_budgets (year, initial_budget, addition, superavit) VALUES (?, ?, ?, 0) 
                    ON DUPLICATE KEY UPDATE initial_budget=?, addition=?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("iiiii", $year, $initial, $addition, $initial, $addition);
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
                $stmt->bind_param("siiii", $name, $assigned, $addition, $projects, $id);
            } else {
                $stmt = $conn->prepare("INSERT INTO jacs (name, year, assigned, addition, projects) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("siiii", $name, $year, $assigned, $addition, $projects);
            }
            $stmt->execute();
            echo json_encode(["status" => "success"]);
        } elseif ($method === 'DELETE') {
            $id = $input['id'];
            $conn->query("DELETE FROM jacs WHERE id = " . intval($id));
            echo json_encode(["status" => "success"]);
        }
        break;

    case 'directory_jacs':
        if ($method === 'GET') {
            echo json_encode(fetchAll($conn, "SELECT * FROM directory_jacs"));
        } elseif ($method === 'POST') {
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("UPDATE directory_jacs SET name=?, zone=?, president=?, phone=? WHERE id=?");
                $stmt->bind_param("ssssi", $input['name'], $input['zone'], $input['president'], $input['phone'], $id);
            } else {
                $stmt = $conn->prepare("INSERT INTO directory_jacs (name, zone, president, phone) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("ssss", $input['name'], $input['zone'], $input['president'], $input['phone']);
            }
            $stmt->execute();
            echo json_encode(["status" => "success"]);
        } elseif ($method === 'DELETE') {
            $id = $input['id'];
            $conn->query("DELETE FROM directory_jacs WHERE id = " . intval($id));
            echo json_encode(["status" => "success"]);
        }
        break;

    case 'projects':
        if ($method === 'GET') {
            // Decodificar los JSON al leer para el frontend
            $projs = fetchAll($conn, "SELECT id, jac_id as jacId, year, title, description, status, budget, has_addition as hasAddition, addition, documents_json, photos_json, notes_json FROM projects");
            foreach ($projs as &$p) {
                $p['documents'] = json_decode($p['documents_json'] ?? '[]');
                $p['photos'] = json_decode($p['photos_json'] ?? '[]');
                $p['notes'] = json_decode($p['notes_json'] ?? '[]');
                $p['hasAddition'] = $p['hasAddition'] == 1; // bool
                unset($p['documents_json'], $p['photos_json'], $p['notes_json']);
            }
            echo json_encode($projs);
        } elseif ($method === 'POST') {
            $id = $input['id'] ?? null;
            $has_add = $input['hasAddition'] ? 1 : 0;
            $docs = isset($input['documents']) ? json_encode($input['documents']) : '[]';
            $photos = isset($input['photos']) ? json_encode($input['photos']) : '[]';
            $notes = isset($input['notes']) ? json_encode($input['notes']) : '[]';
            
            if ($id) {
                $stmt = $conn->prepare("UPDATE projects SET jac_id=?, year=?, title=?, description=?, status=?, budget=?, has_addition=?, addition=?, documents_json=?, photos_json=?, notes_json=? WHERE id=?");
                $stmt->bind_param("iissssiiissi", $input['jacId'], $input['year'], $input['title'], $input['description'], $input['status'], $input['budget'], $has_add, $input['addition'], $docs, $photos, $notes, $id);
            } else {
                $stmt = $conn->prepare("INSERT INTO projects (jac_id, year, title, description, status, budget, has_addition, addition, documents_json, photos_json, notes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iissssiiiss", $input['jacId'], $input['year'], $input['title'], $input['description'], $input['status'], $input['budget'], $has_add, $input['addition'], $docs, $photos, $notes);
            }
            $stmt->execute();
            echo json_encode(["status" => "success", "id" => $id ?? $conn->insert_id]);
        } elseif ($method === 'DELETE') {
            $id = $input['id'];
            $conn->query("DELETE FROM projects WHERE id = " . intval($id));
            echo json_encode(["status" => "success"]);
        }
        break;

    case 'payments':
        if ($method === 'GET') {
            echo json_encode(fetchAll($conn, "SELECT id, jac_id as jacId, year, amount, date, description FROM payments"));
        } elseif ($method === 'POST') {
            $stmt = $conn->prepare("INSERT INTO payments (jac_id, amount, date, description, year) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("iissi", $input['jacId'], $input['amount'], $input['date'], $input['description'], $input['year']);
            $stmt->execute();
            
            // Actualizar 'paid' en la tabla jacs correspondiente
            $stmt2 = $conn->prepare("UPDATE jacs SET paid = paid + ? WHERE id = ?");
            $stmt2->bind_param("ii", $input['amount'], $input['jacId']);
            $stmt2->execute();
            
            echo json_encode(["status" => "success"]);
        }
        break;

    case 'users':
        if ($method === 'GET') {
            echo json_encode(fetchAll($conn, "SELECT id, username, name, role FROM users"));
        } elseif ($method === 'POST') {
            if (isset($input['id']) && $input['id']) {
                 // Por simplicidad, editamos de manera basica
                 $stmt = $conn->prepare("UPDATE users SET name=?, username=?, password=?, role=? WHERE id=?");
                 $stmt->bind_param("ssssi", $input['name'], $input['username'], $input['password'], $input['role'], $input['id']);
            } else {
                 $stmt = $conn->prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)");
                 $stmt->bind_param("ssss", $input['username'], $input['password'], $input['name'], $input['role']);
            }
            $stmt->execute();
            echo json_encode(["status" => "success"]);
        }
        break;

    default:
        echo json_encode(["error" => "Endpoint no válido"]);
        break;
}
$conn->close();
?>
