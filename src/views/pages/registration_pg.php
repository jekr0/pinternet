<?php
// src/views/pages/registration_pg.php

if (session_status() === PHP_SESSION_NONE) session_start();

// Если уже авторизован — на главную
if (!empty($_SESSION['user_id'])) {
    header('Location: /');
    exit;
}

$error = $_SESSION['auth_error'] ?? '';
unset($_SESSION['auth_error']);
?>

<div class="auth">
    <div class="auth__container">

        <span class="auth__logo">grinderest</span>

        <?php if ($error): ?>
            <p class="auth__error"><?= $error ?></p>
        <?php endif; ?>

        <form class="auth__form" action="/auth" method="POST">
            <input type="hidden" name="action" value="registration">

            <input
                class="auth__input"
                type="text"
                name="username"
                placeholder="username"
                autocomplete="username"
                required
            >
            <input
                class="auth__input"
                type="email"
                name="email"
                placeholder="example@gmail.com"
                autocomplete="email"
                required
            >
            <input
                class="auth__input"
                type="password"
                name="password"
                placeholder="password123"
                autocomplete="new-password"
                required
            >

            <div class="auth__actions">
                <button class="auth__button auth__button--back" type="button" onclick="history.back()">
                    Назад
                </button>
                <button class="auth__button auth__button--submit" type="submit">
                    Создать аккаунт
                </button>
            </div>

            <p class="auth__footer">
                Уже есть аккаунт?
                <a class="auth__link" href="/login">Войти</a>
            </p>
        </form>

    </div>
</div>