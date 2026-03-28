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

    // Валидация на пустоту
    if (!$username || !$email || !$password) {
        redirectTo('/registration', 'Заполните все поля');
    }
    
    // Валидация имени пользователя: 3-12 символов, только латиница, цифры и _
    if (!preg_match('/^[A-Za-z0-9_]{3,12}$/', $username)) {
        redirectTo('/registration', 'Имя пользователя: 3–12 символов, только латинские буквы, цифры и _');
    }

    // Валидация формата почты
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        redirectTo('/registration', 'Некорректный формат почты');
    }

    // Минимальная длина пароля
    if (strlen($password) < 6) {
        redirectTo('/registration', 'Пароль должен быть не короче 6 символов');
    }

    // Проверяем, занята ли почта
    $stmt = $pdo->prepare('SELECT id FROM Users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        redirectTo('/registration', 'Эта почта уже зарегистрирована');
    }

    // Проверяем, занят ли никнейм
    $stmt = $pdo->prepare('SELECT id FROM Users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        redirectTo('/registration', 'Это имя пользователя уже занято');
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Создаём пользователя и доску по умолчанию в транзакции
    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('
            INSERT INTO Users (username, email, password_hash)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([$username, $email, $passwordHash]);
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
