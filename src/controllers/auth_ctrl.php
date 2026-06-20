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
    'login_validate' => handleLoginValidate($pdo),
    'registration_validate' => handleRegistrationValidate($pdo),
    'registration' => handleRegistration($pdo),
    default        => redirectTo('/auth/login')
};

// ---------------------------------------------------------------------

function handleLogin(PDO $pdo): void
{
    $login    = trim($_POST['login'] ?? $_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // Валидация на пустоту
    if (!$login || !$password) {
        redirectTo('/auth/login', 'Заполните все поля', 'login');
    }

    // Ищем пользователя по логину или почте
    $stmt = $pdo->prepare('SELECT id, username, password_hash, is_banned, role, exp, level, timeout_until FROM Users WHERE username = ? OR email = ?');
    $stmt->execute([$login, $login]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        redirectTo('/auth/login', 'Неверный логин или пароль', 'login');
    }

    if ($user['is_banned']) {
        redirectTo('/auth/login', 'Аккаунт заблокирован', 'login');
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
    if (!empty($user['timeout_until']) && strtotime((string) $user['timeout_until']) > time()) {
        $_SESSION['timeout_until'] = (string) $user['timeout_until'];
    } else {
        unset($_SESSION['timeout_until']);
    }
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
        redirectTo('/auth/register', $validationError, 'registration');
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
            INSERT INTO Collections (user_id, name)
            VALUES (?, ?)
        ');
        $stmt->execute([$userId, 'Profile']);

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Registration error: ' . $e->getMessage());
        redirectTo('/auth/register', 'Ошибка при регистрации. Попробуйте ещё раз', 'registration');
    }

    redirectTo('/auth/login', 'Аккаунт создан! Совершите повторный вход', 'login');
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

function handleLoginValidate(PDO $pdo): never
{
    $login    = trim($_POST['login'] ?? $_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    header('Content-Type: application/json; charset=utf-8');

    if (!$login || !$password) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Заполните все поля'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id, username, password_hash, is_banned, role, exp, level, timeout_until FROM Users WHERE username = ? OR email = ?');
    $stmt->execute([$login, $login]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Неверный логин или пароль'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($user['is_banned']) {
        http_response_code(423);
        echo json_encode(['success' => false, 'error' => 'Аккаунт заблокирован'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    require_once __DIR__ . '/../config/level_helper.php';
    $correctLevel = calcLevel((int) $user['exp']);
    if ($correctLevel !== (int) $user['level']) {
        $upd = $pdo->prepare('UPDATE Users SET level = ? WHERE id = ?');
        $upd->execute([$correctLevel, $user['id']]);
    }

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role']     = $user['role'];
    if (!empty($user['timeout_until']) && strtotime((string) $user['timeout_until']) > time()) {
        $_SESSION['timeout_until'] = (string) $user['timeout_until'];
    } else {
        unset($_SESSION['timeout_until']);
    }
    $_SESSION['exp']      = (int) $user['exp'];
    $_SESSION['level']    = $correctLevel;

    echo json_encode(['success' => true, 'redirect' => '/'], JSON_UNESCAPED_UNICODE);
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

function redirectTo(string $path, string $error = '', string $mode = ''): never
{
    if ($path === '/login' || $path === '/sign_up') {
        $path = '/auth/login';
        $mode = $mode !== '' ? $mode : 'login';
    } elseif ($path === '/registration') {
        $path = '/auth/register';
        $mode = $mode !== '' ? $mode : 'registration';
    }

    if ($error) {
        // Передаём ошибку через сессию, чтобы не светить в URL
        $_SESSION['auth_error'] = $error;
    }

    if ($mode !== '') {
        $_SESSION['auth_mode'] = $mode;
    }

    header('Location: ' . $path);
    exit;
}
