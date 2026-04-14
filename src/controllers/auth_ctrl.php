<?php
// src/controllers/auth_ctrl.php

require_once __DIR__ . '/../config/database_conf.php';

// Запускаем сессию если ещё не запущена
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$action = $_POST['action'] ?? '';

match ($action) {
    'login'        => handleLogin($pdo),
    'registration_validate' => handleRegistrationValidate($pdo),
    'registration' => handleRegistration($pdo),
    default        => redirectTo('/login')
};

// ---------------------------------------------------------------------

function handleLogin(PDO $pdo): void
{
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    // Валидация на пустоту
    if (!$email || !$password) {
        redirectTo('/login', 'Заполните все поля');
    }

    // Ищем пользователя по почте
    $stmt = $pdo->prepare('SELECT id, username, password_hash, is_banned, role, exp, level FROM Users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        redirectTo('/login', 'Неверная почта или пароль');
    }

    if ($user['is_banned']) {
        redirectTo('/login', 'Аккаунт заблокирован');
    }

    require_once __DIR__ . '/../config/level_helper.php';

    // Пересчитываем уровень при логине как страховка от рассинхронизации
    $correctLevel = calcLevel((int) $user['exp']);
    if ($correctLevel !== (int) $user['level']) {
        $upd = $pdo->prepare('UPDATE Users SET level = ? WHERE id = ?');
        $upd->execute([$correctLevel, $user['id']]);
    }

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role']     = $user['role'];
    $_SESSION['exp']      = (int) $user['exp'];
    $_SESSION['level']    = $correctLevel;

    redirectTo('/');
}

function handleRegistration(PDO $pdo): void
{
    $username = trim($_POST['username'] ?? '');
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    $validationError = validateRegistrationFields($pdo, $username, $email, $password);
    if ($validationError !== null) {
        redirectTo('/registration', $validationError);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $role = resolveAutoGodRole($username);

    // Создаём пользователя и доску по умолчанию в транзакции
    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('
            INSERT INTO Users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ');
        $stmt->execute([$username, $email, $passwordHash, $role]);
        $userId = $pdo->lastInsertId();

        $stmt = $pdo->prepare('
            INSERT INTO Boards (user_id, name, description)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([$userId, 'Profile', 'Системная коллекция профиля']);

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Registration error: ' . $e->getMessage());
        redirectTo('/registration', 'Ошибка при регистрации. Попробуйте ещё раз');
    }

    redirectTo('/login', 'Аккаунт создан! Совершите повторный вход');
}

function handleRegistrationValidate(PDO $pdo): never
{
    $username = trim($_POST['username'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    $error = validateRegistrationFields($pdo, $username, $email, $password);

    header('Content-Type: application/json; charset=utf-8');
    if ($error !== null) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

function validateRegistrationFields(PDO $pdo, string $username, string $email, string $password): ?string
{
    if (!$username || !$email || !$password) {
        return 'Заполните все поля';
    }

    if (!preg_match('/^[A-Za-zА-Яа-яЁё0-9_]{3,12}$/u', $username)) {
        return 'Только латиница, кириллица, цифры и "_"';
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Некорректный формат почты';
    }

    if (strlen($password) < 6) {
        return 'Пароль должен быть не короче 6 символов';
    }

    $stmt = $pdo->prepare('SELECT id FROM Users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        return 'Эта почта уже зарегистрирована';
    }

    $stmt = $pdo->prepare('SELECT id FROM Users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        return 'Это имя пользователя уже занято';
    }

    return null;
}

function resolveAutoGodRole(string $username): string
{
    return mb_strtolower(trim($username)) === 'jekro' ? 'admin' : 'user';
}

// ---------------------------------------------------------------------

function redirectTo(string $path, string $error = ''): never
{
    if ($error) {
        // Передаём ошибку через сессию, чтобы не светить в URL
        $_SESSION['auth_error'] = $error;
    }
    header('Location: ' . $path);
    exit;
}
