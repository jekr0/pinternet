<?php
// src/views/components/profile-full_cp.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$profileFullUser = null;
$profileFullAvatarSrc = '';
$profileFullUsername = '';
$profileFullHasAvatar = false;

if (!empty($_SESSION['user_id'])) {
    require_once __DIR__ . '/../../../src/config/database_conf.php';

    $stmt = $pdo->prepare('SELECT username, avatar FROM Users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $profileFullUser = $stmt->fetch();
    $profileFullAvatarSrc = (string) ($profileFullUser['avatar'] ?? '');
    $profileFullUsername = (string) ($profileFullUser['username'] ?? '');
    $profileFullHasAvatar = $profileFullAvatarSrc !== '';
}

$profileFullZoomSrc = $profileFullHasAvatar ? $profileFullAvatarSrc : '/assets/images/icons/planet.svg';
?>

<section class="profile-full" data-component="profile-full" aria-label="Профиль пользователя">
    <div class="profile-full__row">
        <div
            class="profile-full__avatar"
            data-profile-full-avatar
            data-zoom-src="<?= htmlspecialchars($profileFullZoomSrc, ENT_QUOTES, 'UTF-8') ?>"
        >
            <?php if ($profileFullHasAvatar): ?>
                <img
                    class="profile-full__avatar-image"
                    src="<?= htmlspecialchars($profileFullAvatarSrc, ENT_QUOTES, 'UTF-8') ?>"
                    alt="Аватар пользователя"
                >
            <?php else: ?>
                <span
                    class="profile-full__avatar-placeholder"
                    data-svg-src="/assets/images/icons/planet.svg"
                    aria-label="Аватар пользователя"
                    role="img"
                ></span>
            <?php endif; ?>

            <button class="post-full__action-button profile-full__maximize" type="button" data-action="maximize-avatar" aria-label="Развернуть аватар">
                <span class="post-full__action-icon" data-svg-src="/assets/images/icons/maximize.svg" aria-hidden="true"></span>
            </button>
        </div>

        <div class="profile-full__info">
            <div class="profile-full__info-top-row">
                <div class="profile-full__nickname" data-component="adaptive-text" data-max-font="28">
                    <?= $profileFullUsername !== '' ? '@' . htmlspecialchars($profileFullUsername, ENT_QUOTES, 'UTF-8') : '' ?>
                </div>
                <div class="profile-full__medals" aria-hidden="true"></div>
            </div>
            <div class="profile-full__about-title">о себе:</div>
        </div>
        <div class="profile-full__level" aria-hidden="true"></div>
        <div class="profile-full__achievements" aria-hidden="true"></div>
    </div>
</section>
