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
    $stmt = $pdo->prepare('SELECT id, username, password_hash, is_banned, role FROM Users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Временная диагностика — убрать после решения проблемы
    error_log('Login attempt: email=' . $email);
    error_log('User found: ' . ($user ? 'yes' : 'no'));
    if ($user) {
        error_log('Password verify: ' . (password_verify($password, $user['password_hash']) ? 'ok' : 'fail'));
        error_log('Hash in DB: ' . $user['password_hash']);
    }

    if (!$user || !password_verify($password, $user['password_hash'])) {
        redirectTo('/login', 'Неверная почта или пароль');
    }

    if ($user['is_banned']) {
        redirectTo('/login', 'Аккаунт заблокирован!');
    }

    // Записываем данные в сессию
    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role']     = $user['role'];

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
        $stmt->execute([$userId, 'Сохранённое', 'Доска по умолчанию']);

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