<?php
// src/views/components/profile-container_cp.php

if (session_status() === PHP_SESSION_NONE) session_start();

$isLoggedIn = !empty($_SESSION['user_id']);
?>

<?php if ($isLoggedIn): ?>

    <?php
    // Получаем данные пользователя из БД
    require_once __DIR__ . '/../../../src/config/database_conf.php';

    $stmt = $pdo->prepare('SELECT username, avatar, exp, level FROM Users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    // Считаем exp до следующего уровня (100 exp на уровень)
    $expPerLevel  = 100;
    $expCurrent   = $user['exp'] % $expPerLevel;
    $expBarWidth  = round($expCurrent / $expPerLevel * 100);

    $hasAvatar    = !empty($user['avatar']);
    $avatarPath   = $hasAvatar ? $user['avatar'] : '';
    ?>

    <div class="header__profile-container">
        <div class="header__nickname" data-component="adaptive-text">
            @<?= htmlspecialchars($user['username']) ?>
        </div>

        <div class="header__experience-bar">
            <div class="header__experience-fill" style="width: <?= $expBarWidth ?>%;"></div>
        </div>

        <button
            class="header__profile-button"
            data-component="profile_button"
            data-profile-img="<?= $hasAvatar ? 1 : 0 ?>"
            data-avatar-src="<?= htmlspecialchars($avatarPath) ?>"
            data-profile-url="/profile"
        ></button>
    </div>

<?php else: ?>

    <div class="header__profile-container header__profile-container--guest">
        <a href="/login" class="header__login-link">войти</a>
    </div>

<?php endif; ?>