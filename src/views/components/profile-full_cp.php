<?php
// src/views/components/profile-full_cp.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$profileFullUser = null;
$profileFullHasAvatar = false;

if (!empty($_SESSION['user_id'])) {
    require_once __DIR__ . '/../../../src/config/database_conf.php';

    $stmt = $pdo->prepare('SELECT avatar FROM Users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $profileFullUser = $stmt->fetch();
    $profileFullHasAvatar = !empty($profileFullUser['avatar']);
}
?>

<section class="profile-full" data-component="profile-full" aria-label="Профиль пользователя">
    <button
        class="profile-full__avatar"
        type="button"
        data-component="profile_button"
        data-profile-img="<?= $profileFullHasAvatar ? 1 : 0 ?>"
        data-avatar-src="<?= htmlspecialchars($profileFullUser['avatar'] ?? '', ENT_QUOTES, 'UTF-8') ?>"
        data-avatar-class="profile-full__avatar-image"
        data-placeholder-class="profile-full__avatar-placeholder"
        data-placeholder-size="128"
        data-placeholder-alt="Аватар пользователя"
        data-profile-url="/profile"
        aria-label="Аватар пользователя"
    ></button>

    <div class="profile-full__info-card" aria-hidden="true"></div>
</section>
