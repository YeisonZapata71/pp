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
    
    // Auto-crear tabla de solicitudes de eliminación
    $conn->query("CREATE TABLE IF NOT EXISTS delete_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        requested_by_email VARCHAR(150),
        requested_by_name VARCHAR(150),
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    // Ignore migration errors (e.g. if another concurrent request already ran the ALTER TABLE)
}
// ----------------------------

$endpoint = $_GET['endpoint'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper para obtener arreglos rápido
function fetchAll($conn, $sql, $types = "", ...$params) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error . " | Query: " . $sql);
    }
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
                try {
                    $data = fetchAll($conn, "SELECT id, email, name, role FROM users WHERE email = ? AND password = ?", "ss", $user, $pass);
                } catch (Exception $e) {
                    $data = fetchAll($conn, "SELECT id, username as email, name, role FROM users WHERE username = ? AND password = ?", "ss", $user, $pass);
                }
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
                
                // 1. Fetch project to get documents_json
                $projData = fetchAll($conn, "SELECT documents_json FROM projects WHERE id=?", "i", $id);
                if (count($projData) > 0) {
                    $docsJson = $projData[0]['documents_json'] ?? '{}';
                    $docsObj = json_decode($docsJson, true);
                    if (is_array($docsObj)) {
                        // Recursively delete files
                        $deleteFiles = function($array) use (&$deleteFiles) {
                            foreach ($array as $key => $value) {
                                if (is_array($value)) {
                                    if (isset($value['path'])) {
                                        $fullPath = __DIR__ . "/../" . $value['path'];
                                        if (file_exists($fullPath) && strpos($value['path'], 'uploads/') !== false) {
                                            unlink($fullPath);
                                        }
                                    } else {
                                        $deleteFiles($value);
                                    }
                                }
                            }
                        };
                        $deleteFiles($docsObj);
                    }
                }
                
                // 2. Delete project from DB
                $stmt = $conn->prepare("DELETE FROM projects WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                
                // 3. Delete any associated delete requests
                $stmtReq = $conn->prepare("DELETE FROM delete_requests WHERE project_id=?");
                $stmtReq->bind_param("i", $id);
                $stmtReq->execute();
                
                echo json_encode(["status" => "success"]);
            }
            break;

        case 'delete_requests':
            if ($method === 'GET') {
                echo json_encode(fetchAll($conn, "SELECT dr.*, p.title as project_title FROM delete_requests dr JOIN projects p ON dr.project_id = p.id WHERE dr.status = 'pending'"));
            } elseif ($method === 'POST') {
                $projId = $input['project_id'];
                $email = $input['requested_by_email'];
                $name = $input['requested_by_name'];
                $reason = $input['reason'];
                
                // Check if already pending
                $check = fetchAll($conn, "SELECT id FROM delete_requests WHERE project_id=? AND status='pending'", "i", $projId);
                if (count($check) > 0) {
                    echo json_encode(["status" => "error", "message" => "Ya existe una solicitud pendiente para este proyecto."]);
                    exit;
                }
                
                $stmt = $conn->prepare("INSERT INTO delete_requests (project_id, requested_by_email, requested_by_name, reason) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("isss", $projId, $email, $name, $reason);
                $stmt->execute();
                echo json_encode(["status" => "success"]);
            } elseif ($method === 'PUT') {
                $reqId = $input['request_id'];
                $action = $input['action']; // 'approve' or 'reject'
                
                if ($action === 'reject') {
                    $stmt = $conn->prepare("UPDATE delete_requests SET status='rejected' WHERE id=?");
                    $stmt->bind_param("i", $reqId);
                    $stmt->execute();
                    echo json_encode(["status" => "success"]);
                } elseif ($action === 'approve') {
                    // Get project ID
                    $reqData = fetchAll($conn, "SELECT project_id FROM delete_requests WHERE id=?", "i", $reqId);
                    if (count($reqData) > 0) {
                        $projId = $reqData[0]['project_id'];
                        // Aprobación es procesada a través del DELETE regular enviando id del proyecto desde el frontend, pero marcamos el request como aprobado por si acaso.
                        $stmt = $conn->prepare("UPDATE delete_requests SET status='approved' WHERE id=?");
                        $stmt->bind_param("i", $reqId);
                        $stmt->execute();
                        echo json_encode(["status" => "success", "project_id" => $projId]);
                    }
                }
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
                } catch (Exception $e) {
                    // If it fails (e.g. email column doesn't exist yet because migration failed), fallback to username
                    try {
                        $oldUsers = fetchAll($conn, "SELECT id, username as email, name, role FROM users");
                        echo json_encode($oldUsers);
                    } catch (Exception $e2) {
                        echo json_encode(["status" => "error", "message" => $e2->getMessage()]);
                    }
                }
            } elseif ($method === 'POST') {
                try {
                    if (isset($input['id']) && $input['id']) {
                         $stmt = $conn->prepare("UPDATE users SET name=?, email=?, password=?, role=? WHERE id=?");
                         if (!$stmt) throw new Exception($conn->error);
                         $stmt->bind_param("ssssi", $input['name'], $input['email'], $input['password'], $input['role'], $input['id']);
                    } else {
                         $stmt = $conn->prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
                         if (!$stmt) throw new Exception($conn->error);
                         $stmt->bind_param("ssss", $input['email'], $input['password'], $input['name'], $input['role']);
                    }
                    $stmt->execute();
                    echo json_encode(["status" => "success"]);
                } catch (Exception $e) {
                    try {
                        // Fallback si la base de datos no tiene la columna email
                        if (isset($input['id']) && $input['id']) {
                             $stmt2 = $conn->prepare("UPDATE users SET name=?, username=?, password=?, role=? WHERE id=?");
                             if (!$stmt2) throw new Exception($conn->error);
                             $stmt2->bind_param("ssssi", $input['name'], $input['email'], $input['password'], $input['role'], $input['id']);
                        } else {
                             $stmt2 = $conn->prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)");
                             if (!$stmt2) throw new Exception($conn->error);
                             $stmt2->bind_param("ssss", $input['email'], $input['password'], $input['name'], $input['role']);
                        }
                        $stmt2->execute();
                        echo json_encode(["status" => "success"]);
                    } catch (Exception $e3) {
                        $safeMsg = $e3->getMessage();
                        $errorMsg = "Error al guardar el usuario: " . $safeMsg;
                        if (strpos($safeMsg, 'Duplicate entry') !== false || strpos($safeMsg, 'UNIQUE') !== false) {
                            $errorMsg = "El correo electrónico ya está registrado.";
                        }
                        $json = json_encode(["status" => "error", "message" => $errorMsg]);
                        echo $json !== false ? $json : json_encode(["status" => "error", "message" => "Error al guardar (codificacion invalida)"]);
                    }
                }
            }
            break;

        case 'recover_password':
            if ($method === 'POST') {
                $email = $input['email'] ?? '';
                try {
                    $data = fetchAll($conn, "SELECT id, name, email FROM users WHERE email = ?", "s", $email);
                } catch (Exception $e) {
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
                } catch (Exception $e) {
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

        case 'upload_document':
            if ($method === 'POST') {
                if (!isset($_FILES['file'])) {
                    echo json_encode(["status" => "error", "message" => "No se recibió ningún archivo"]);
                    exit;
                }
                
                $projId = $_POST['project_id'] ?? null;
                $folder = $_POST['folder'] ?? 'generales';
                $subfolder = $_POST['subfolder'] ?? null;
                $uploaderEmail = $_POST['uploader_email'] ?? 'desconocido';
                $uploaderName = $_POST['uploader_name'] ?? 'Usuario';
                
                if (!$projId) {
                    echo json_encode(["status" => "error", "message" => "Falta el ID del proyecto"]);
                    exit;
                }

                $file = $_FILES['file'];
                if ($file['error'] !== UPLOAD_ERR_OK) {
                    echo json_encode(["status" => "error", "message" => "Error de subida HTTP: " . $file['error']]);
                    exit;
                }
                
                if ($file['type'] !== 'application/pdf') {
                    echo json_encode(["status" => "error", "message" => "Solo se permiten archivos PDF"]);
                    exit;
                }
                
                if ($file['size'] > 2 * 1024 * 1024) {
                    echo json_encode(["status" => "error", "message" => "El archivo excede el límite de 2MB"]);
                    exit;
                }

                $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
                $docId = uniqid('doc_');
                $filename = "proj_{$projId}_{$folder}_{$docId}.{$ext}";
                $uploadPath = __DIR__ . "/uploads/" . $filename;
                
                if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                    echo json_encode(["status" => "error", "message" => "No se pudo mover el archivo al servidor"]);
                    exit;
                }
                
                $fileUrl = "backend/uploads/" . $filename;
                
                // Generar metadatos
                $newDoc = [
                    "id" => $docId,
                    "name" => $file['name'],
                    "path" => $fileUrl,
                    "size" => $file['size'],
                    "folder" => $folder,
                    "subfolder" => $subfolder,
                    "uploaded_by_email" => $uploaderEmail,
                    "uploaded_by_name" => $uploaderName,
                    "uploaded_at" => date("Y-m-d H:i:s")
                ];
                
                // Actualizar DB
                try {
                    $projData = fetchAll($conn, "SELECT documents_json FROM projects WHERE id=?", "i", $projId);
                    if (count($projData) > 0) {
                        $docsJson = $projData[0]['documents_json'] ?? '{}';
                        $docsObj = json_decode($docsJson, true);
                        if (!is_array($docsObj)) $docsObj = []; // Podría ser un array plano (legado) o objeto estructurado
                        
                        // Determinar si es legado
                        $isLegacy = isset($docsObj[0]) && !isset($docsObj[0]['folder']);
                        if ($isLegacy) {
                            $oldArr = $docsObj;
                            $docsObj = ["legacy" => $oldArr];
                        }
                        
                        if ($subfolder && $subfolder !== 'null' && $subfolder !== '') {
                            if (!isset($docsObj[$folder])) $docsObj[$folder] = [];
                            if (!isset($docsObj[$folder][$subfolder])) $docsObj[$folder][$subfolder] = [];
                            $docsObj[$folder][$subfolder][] = $newDoc;
                        } else {
                            if (!isset($docsObj[$folder])) $docsObj[$folder] = [];
                            $docsObj[$folder][] = $newDoc;
                        }
                        
                        $updatedDocsStr = json_encode($docsObj);
                        $stmt = $conn->prepare("UPDATE projects SET documents_json=? WHERE id=?");
                        $stmt->bind_param("si", $updatedDocsStr, $projId);
                        $stmt->execute();
                    }
                } catch (Exception $e) {
                    $json = json_encode(["status" => "error", "message" => "Archivo subido pero no se pudo actualizar BD: " . $e->getMessage()]);
                    echo $json !== false ? $json : json_encode(["status" => "error", "message" => "Archivo subido pero no se pudo actualizar BD (error de codificacion)"]);
                    exit;
                }

                echo json_encode(["status" => "success", "document" => $newDoc]);
            }
            break;

        case 'delete_document':
            if ($method === 'POST') {
                $projId = $input['project_id'] ?? null;
                $docId = $input['doc_id'] ?? null;
                $path = $input['path'] ?? null;
                
                if ($path) {
                    $fullPath = __DIR__ . "/../" . $path;
                    if (file_exists($fullPath) && strpos($path, 'uploads/') !== false) {
                        unlink($fullPath);
                    }
                }
                
                if ($projId && $docId) {
                    $projData = fetchAll($conn, "SELECT documents_json FROM projects WHERE id=?", "i", $projId);
                    if (count($projData) > 0) {
                        $docsJson = $projData[0]['documents_json'] ?? '{}';
                        $docsObj = json_decode($docsJson, true);
                        if (is_array($docsObj)) {
                            // Recursivamente borrar
                            $removeDoc = function(&$array) use (&$removeDoc, $docId) {
                                foreach ($array as $key => &$value) {
                                    if (is_array($value)) {
                                        if (isset($value['id']) && $value['id'] === $docId) {
                                            unset($array[$key]);
                                            $array = array_values($array); // Re-index
                                            return true;
                                        } else {
                                            if ($removeDoc($value)) return true;
                                        }
                                    }
                                }
                                return false;
                            };
                            $removeDoc($docsObj);
                            
                            $updatedDocsStr = json_encode($docsObj);
                            $stmt = $conn->prepare("UPDATE projects SET documents_json=? WHERE id=?");
                            $stmt->bind_param("si", $updatedDocsStr, $projId);
                            $stmt->execute();
                        }
                    }
                }
                echo json_encode(["status" => "success"]);
            }
            break;

        default:
            echo json_encode(["status" => "error", "message" => "Endpoint no válido"]);
    }
} catch (Exception $fatal) {
    $json = json_encode([
        "status" => "error", 
        "message" => "Excepción fatal en el backend (" . $endpoint . "): " . $fatal->getMessage(),
        "trace" => $fatal->getTraceAsString()
    ]);
    if ($json === false) {
        $json = json_encode(["status" => "error", "message" => "Excepción fatal en el backend (El mensaje original no se pudo codificar porque la base de datos no está en utf8). Revisa si te faltan tablas o columnas."]);
    }
    echo $json;
}
$conn->close();
?>
