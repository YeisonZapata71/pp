<?php
// restaurar.php
// Herramienta de recuperación y cambio de contraseñas para Presupuesto Participativo Girardota.

require_once 'backend/config.php';

$message = '';
$messageType = '';

// Conectar a la base de datos
try {
    $conn = getDB();
} catch (\Throwable $e) {
    die("<div style='font-family:sans-serif; padding:2rem; text-align:center; color:#ef4444;'>
            <h2>Error Crítico de Conexión</h2>
            <p>" . htmlspecialchars($e->getMessage()) . "</p>
         </div>");
}

// Acción: Auto-eliminación por seguridad
if (isset($_POST['action']) && $_POST['action'] === 'self_delete') {
    $filePath = __FILE__;
    if (unlink($filePath)) {
        echo "<!DOCTYPE html>
        <html lang='es'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Herramienta de Recuperación Eliminada</title>
            <link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' rel='stylesheet'>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, #e8f0eb 0%, #F3F4F6 100%);
                    color: #1F2937;
                    height: 100vh;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .card {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 20px;
                    padding: 3rem;
                    text-align: center;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
                    max-width: 480px;
                    width: 90%;
                }
                .icon-container {
                    background: rgba(22, 65, 51, 0.08);
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                }
                .icon-container svg {
                    width: 35px;
                    height: 35px;
                    color: #164133;
                }
                h2 { color: #164133; margin-top: 0; margin-bottom: 1rem; font-weight: 700; }
                p { color: #4B5563; line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem; }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #164133;
                    color: white;
                    padding: 0.875rem 1.75rem;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 6px -1px rgba(22, 65, 51, 0.2);
                }
                .btn:hover { 
                    background: #0e3025; 
                    transform: translateY(-2px); 
                    box-shadow: 0 6px 12px -2px rgba(22, 65, 51, 0.3);
                }
            </style>
        </head>
        <body>
            <div class='card'>
                <div class='icon-container'>
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor'>
                        <path stroke-linecap='round' stroke-linejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                </div>
                <h2>¡Archivo Eliminado!</h2>
                <p>Por seguridad, el archivo <strong>restaurar.php</strong> ha sido removido exitosamente de tu servidor y disco local. Nadie más podrá utilizarlo para acceder o modificar tus contraseñas.</p>
                <a href='index.html' class='btn'>Volver a la Aplicación</a>
            </div>
        </body>
        </html>";
        exit;
    } else {
        $message = "No se pudo eliminar el archivo automáticamente por permisos del servidor. Por favor, elimínalo manualmente de la raíz del proyecto.";
        $messageType = "error";
    }
}

// Acción: Cambiar contraseña
if (isset($_POST['action']) && $_POST['action'] === 'change_password') {
    $userId = intval($_POST['user_id'] ?? 0);
    $newPass = trim($_POST['new_password'] ?? '');

    if ($userId > 0 && !empty($newPass)) {
        $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->bind_param("si", $newPass, $userId);
        if ($stmt->execute()) {
            $message = "¡Contraseña actualizada exitosamente!";
            $messageType = "success";
        } else {
            $message = "Error al actualizar la contraseña: " . $conn->error;
            $messageType = "error";
        }
        $stmt->close();
    } else {
        $message = "Por favor, ingresa una contraseña válida.";
        $messageType = "error";
    }
}

// Consultar usuarios actuales
$users = [];
$result = $conn->query("SELECT id, email, password, name, role FROM users");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
}
$conn->close();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseñas - Presupuesto Participativo</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #164133;
            --primary-hover: #0e3025;
            --secondary: #C9DA2C;
            --danger: #ef4444;
            --success: #10B981;
            --text-main: #1F2937;
            --text-muted: #6B7280;
            --bg-gradient: linear-gradient(135deg, #e2ebd5 0%, #eef3eb 50%, #f3f4f6 100%);
            --glass-bg: rgba(255, 255, 255, 0.8);
            --glass-border: rgba(255, 255, 255, 0.6);
            --radius: 16px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-gradient);
            background-attachment: fixed;
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2.5rem 1rem;
        }

        .container {
            width: 100%;
            max-width: 900px;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        header {
            text-align: center;
            margin-bottom: 0.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }

        .logo-container {
            background: rgba(22, 65, 51, 0.05);
            width: 90px;
            height: 90px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .logo-container img {
            max-height: 70px;
            max-width: 70px;
            object-fit: contain;
        }

        h1 {
            color: var(--primary);
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.025em;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 1rem;
            margin-top: 0.25rem;
        }

        /* Alert styling */
        .alert {
            padding: 1rem 1.25rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 500;
            font-size: 0.95rem;
            border: 1px solid transparent;
            animation: slideIn 0.3s ease;
        }

        .alert-success {
            background-color: #ECFDF5;
            color: #065F46;
            border-color: #A7F3D0;
        }

        .alert-error {
            background-color: #FEF2F2;
            color: #991B1B;
            border-color: #FCA5A5;
        }

        @keyframes slideIn {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* Notice Panel */
        .notice-card {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: var(--radius);
            padding: 1.5rem;
            display: flex;
            gap: 1rem;
            align-items: flex-start;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .notice-icon {
            color: #D97706;
            flex-shrink: 0;
        }

        .notice-content h3 {
            color: #92400E;
            font-size: 1.05rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .notice-content p {
            color: #B45309;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 1rem;
        }

        /* Main Card Section */
        .glass-panel {
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius);
            padding: 2rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }

        .section-header {
            margin-bottom: 1.5rem;
            border-bottom: 1px solid rgba(0,0,0,0.06);
            padding-bottom: 1rem;
        }

        .section-header h2 {
            color: var(--primary);
            font-size: 1.35rem;
            font-weight: 600;
        }

        /* Users Grid */
        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 1.5rem;
        }

        @media (max-width: 640px) {
            .users-grid {
                grid-template-columns: 1fr;
            }
        }

        .user-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #E5E7EB;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .user-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 12px -1px rgba(0, 0, 0, 0.05);
        }

        .user-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .user-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .user-name {
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--primary);
        }

        .user-username {
            font-family: monospace;
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .role-badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.6rem;
            border-radius: 9999px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .role-admin {
            background-color: rgba(22, 65, 51, 0.1);
            color: var(--primary);
        }

        .role-gestor {
            background-color: #E2E8F0;
            color: #475569;
        }

        /* Password and forms */
        .password-display-box {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .pass-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
        }

        .pass-value-wrapper {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .pass-value {
            font-family: monospace;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-main);
        }

        .toggle-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
            padding: 0.25rem;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }

        .toggle-btn:hover {
            color: var(--primary);
        }

        .change-pass-form {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 0.5rem;
            border-top: 1px solid #F3F4F6;
            padding-top: 1rem;
        }

        .form-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-main);
        }

        .input-group {
            display: flex;
            gap: 0.5rem;
        }

        .form-control {
            flex-grow: 1;
            padding: 0.5rem 0.75rem;
            border: 1px solid #D1D5DB;
            border-radius: 6px;
            font-size: 0.9rem;
            font-family: inherit;
            transition: border-color 0.2s;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            gap: 0.5rem;
        }

        .btn-primary {
            background-color: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background-color: var(--primary-hover);
        }

        .btn-danger {
            background-color: var(--danger);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
        }

        .btn-danger:hover {
            background-color: #dc2626;
            transform: translateY(-1px);
            box-shadow: 0 6px 8px -1px rgba(239, 68, 68, 0.3);
        }

        .btn-outline-danger {
            background-color: transparent;
            color: var(--danger);
            border: 1px solid #FCA5A5;
        }

        .btn-outline-danger:hover {
            background-color: #FEF2F2;
        }

        /* Footer self-delete */
        .footer-action {
            display: flex;
            justify-content: center;
            margin-top: 1rem;
        }

        /* SVGs inline */
        .icon {
            width: 18px;
            height: 18px;
            stroke-width: 2;
            fill: none;
            stroke: currentColor;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
    </style>
</head>
<body>

<div class="container">
    <header>
        <div class="logo-container">
            <img src="PP_Logo-01.png" alt="Girardota PP" onerror="this.style.display='none'">
        </div>
        <div>
            <h1>Recuperación de Contraseñas</h1>
            <p class="subtitle">Herramienta Temporal para el Gestor del Sistema - Presupuesto Participativo Girardota</p>
        </div>
    </header>

    <?php if (!empty($message)): ?>
        <div class="alert alert-<?php echo $messageType; ?>">
            <?php if ($messageType === 'success'): ?>
                <svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <?php else: ?>
                <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <?php endif; ?>
            <span><?php echo htmlspecialchars($message); ?></span>
        </div>
    <?php endif; ?>

    <!-- Notice Panel -->
    <div class="notice-card">
        <div class="notice-icon">
            <svg class="icon" style="width: 28px; height: 28px;" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        </div>
        <div class="notice-content">
            <h3>¡Acción de Seguridad Requerida!</h3>
            <p>
                Esta página te permite visualizar y cambiar las contraseñas de todos los usuarios registrados en el sistema. 
                Una vez que hayas recuperado tu contraseña o configurado una nueva, es <strong>obligatorio e indispensable</strong> 
                eliminar este archivo para evitar accesos no autorizados. 
            </p>
            <form method="POST" style="margin: 0;">
                <input type="hidden" name="action" value="self_delete">
                <button type="submit" class="btn btn-danger" onclick="return confirm('¿Estás seguro de que deseas eliminar este archivo de forma permanente? Esta acción borrará el archivo restaurar.php físicamente de tu sistema.')">
                    <svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    Eliminar Esta Herramienta Ahora (Recomendado)
                </button>
            </form>
        </div>
    </div>

    <!-- Main Glass Panel with list of users -->
    <div class="glass-panel">
        <div class="section-header">
            <h2>Cuentas del Sistema Registradas</h2>
        </div>

        <div class="users-grid">
            <?php if (empty($users)): ?>
                <p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron usuarios en la base de datos.</p>
            <?php else: ?>
                <?php foreach ($users as $user): ?>
                    <div class="user-card">
                        <div class="user-header">
                            <div class="user-info">
                                <span class="user-name"><?php echo htmlspecialchars($user['name']); ?></span>
                                <span class="user-username"><?php echo htmlspecialchars($user['email']); ?></span>
                            </div>
                            <span class="role-badge role-<?php echo htmlspecialchars($user['role']); ?>">
                                <?php if ($user['role'] === 'admin'): ?>
                                    <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    Admin
                                <?php else: ?>
                                    <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    Gestor
                                <?php endif; ?>
                            </span>
                        </div>

                        <!-- Current plain password display -->
                        <div class="password-display-box">
                            <div>
                                <div class="pass-label">Contraseña Actual</div>
                                <div class="pass-value-wrapper">
                                    <span class="pass-value" id="pass-val-<?php echo $user['id']; ?>">••••••••</span>
                                </div>
                            </div>
                            <button type="button" class="toggle-btn" onclick="togglePassword(<?php echo $user['id']; ?>, '<?php echo htmlspecialchars(addslashes($user['password'])); ?>')" title="Mostrar/Ocultar contraseña">
                                <svg class="icon" id="eye-icon-<?php echo $user['id']; ?>" viewBox="0 0 24 24">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>

                        <!-- Change password form -->
                        <form method="POST" class="change-pass-form">
                            <input type="hidden" name="action" value="change_password">
                            <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                            
                            <label class="form-label" for="new_password_<?php echo $user['id']; ?>">Asignar Nueva Contraseña:</label>
                            <div class="input-group">
                                <input type="text" 
                                       class="form-control" 
                                       name="new_password" 
                                       id="new_password_<?php echo $user['id']; ?>" 
                                       placeholder="Escribe la nueva contraseña..." 
                                       required>
                                <button type="submit" class="btn btn-primary">
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</div>

<script>
function togglePassword(userId, actualPassword) {
    const passSpan = document.getElementById('pass-val-' + userId);
    const eyeIcon = document.getElementById('eye-icon-' + userId);
    
    if (passSpan.textContent === '••••••••') {
        // Show plain password
        passSpan.textContent = actualPassword;
        // Switch to "eye-off" icon
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        // Hide password
        passSpan.textContent = '••••••••';
        // Switch to regular "eye" icon
        eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}
</script>
</body>
</html>
