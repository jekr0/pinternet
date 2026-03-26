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
                minlength="3"
                maxlength="12"
                pattern="[A-Za-z0-9_]{3,12}"
                title="Имя 3-12 символов: латинские буквы, цифры и _"
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
            <div class="auth__password-row">
                <input
                    class="auth__input auth__input--password"
                    type="password"
                    name="password"
                    placeholder="password123"
                    autocomplete="new-password"
                    required
                >
                <button
                    class="auth__password-toggle"
                    type="button"
                    aria-label="Показать пароль"
                    data-component="password_toggle"
                    data-svg-src="assets/images/icons/eye-closed.svg"
                    data-open-icon="assets/images/icons/eye-opened.svg"
                    data-closed-icon="assets/images/icons/eye-closed.svg"
                ></button>
            </div>

            <div class="auth__actions">
                <button class="auth__button auth__button--back" type="button" onclick="window.location.href='/home'">
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
