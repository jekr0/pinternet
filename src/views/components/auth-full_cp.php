<?php
// src/views/components/auth-full_cp.php

if (session_status() === PHP_SESSION_NONE) session_start();

// Если уже авторизован — на главную
if (!empty($_SESSION['user_id'])) {
    header('Location: /');
    exit;
}

// Забираем ошибку и режим формы из сессии, затем очищаем
$error = $_SESSION['auth_error'] ?? '';
$authMode = $_SESSION['auth_mode'] ?? 'login';
unset($_SESSION['auth_error'], $_SESSION['auth_mode']);

$isRegistrationMode = $authMode === 'registration';
?>

<div class="auth">
    <div class="auth__container">

        <span class="auth__logo">grinderest</span>

        <?php if ($error): ?>
            <div class="auth__server-error" data-auth-server-error="<?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>"></div>
        <?php endif; ?>

        <form
            class="auth__form<?= $isRegistrationMode ? ' auth__form--registration' : ''; ?>"
            action="/auth"
            method="POST"
            data-auth-mode="<?= $isRegistrationMode ? 'registration' : 'login'; ?>"
        >
            <input type="hidden" name="action" value="<?= $isRegistrationMode ? 'registration' : 'login'; ?>">

            <div class="auth__field auth__field--username">
                <input
                    class="auth__input ui-input"
                    type="text"
                    name="username"
                    placeholder="username"
                    autocomplete="username"
                    minlength="3"
                    maxlength="12"
                    pattern="[A-Za-zА-Яа-яЁё0-9_]{3,12}"
                    <?= $isRegistrationMode ? 'required' : 'disabled'; ?>
                >
            </div>

            <div class="auth__field auth__field--identity">
                <input
                    class="auth__input ui-input"
                    type="<?= $isRegistrationMode ? 'email' : 'text'; ?>"
                    name="<?= $isRegistrationMode ? 'email' : 'login'; ?>"
                    placeholder="example@gmail.com"
                    autocomplete="<?= $isRegistrationMode ? 'email' : 'username'; ?>"
                    required
                    data-component="auth-identity-input"
                >
            </div>

            <div class="auth__field auth__field--password auth__password-row">
                <input
                    class="auth__input auth__input--password ui-input"
                    type="password"
                    name="password"
                    placeholder="password123"
                    autocomplete="<?= $isRegistrationMode ? 'new-password' : 'current-password'; ?>"
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
                <a class="auth__button auth__button--back" href="/" data-component="auth-back">
                    <span>Назад</span>
                </a>
                <button class="auth__button auth__button--submit" type="submit" data-component="auth-submit-button">
                    <span class="auth__button--submit-text auth__button--submit-text-current"><?= $isRegistrationMode ? 'Создать аккаунт' : 'Войти'; ?></span>
                    <span class="auth__button--submit-text auth__button--submit-text-next" aria-hidden="true"></span>
                </button>
            </div>

            <p class="auth__footer" aria-label="Режим авторизации">
                <button
                    class="auth__link auth__mode-toggle<?= !$isRegistrationMode ? ' is-active' : ''; ?>"
                    type="button"
                    data-component="auth-mode-toggle"
                    data-auth-mode-target="login"
                >Вход</button>
                <span class="auth__footer-separator" aria-hidden="true">•</span>
                <button
                    class="auth__link auth__mode-toggle<?= $isRegistrationMode ? ' is-active' : ''; ?>"
                    type="button"
                    data-component="auth-mode-toggle"
                    data-auth-mode-target="registration"
                >Регистрация</button>
            </p>
        </form>

    </div>
</div>
