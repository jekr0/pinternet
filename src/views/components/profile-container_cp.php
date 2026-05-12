<?php
// src/views/components/profile-container_cp.php

if (session_status() === PHP_SESSION_NONE) session_start();

$isLoggedIn = !empty($_SESSION['user_id']);
?>

<?php if ($isLoggedIn): ?>

    <?php
    require_once __DIR__ . '/../../../src/config/database_conf.php';
    require_once __DIR__ . '/../../../src/config/level_helper.php';

    $stmt = $pdo->prepare('SELECT username, avatar, exp, level FROM Users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    // Синхронизируем сессию если ключей нет (например после обновления кода)
    if (!isset($_SESSION['exp'], $_SESSION['level'])) {
        $_SESSION['exp']   = (int) $user['exp'];
        $_SESSION['level'] = calcLevel((int) $user['exp']);
        $pdo->prepare('UPDATE Users SET level = ? WHERE id = ?')
            ->execute([$_SESSION['level'], $_SESSION['user_id']]);
    }

    $progress  = getExpProgress((int) $_SESSION['exp'], (int) $_SESSION['level']);
    $hasAvatar = !empty($user['avatar']);
    ?>

    <div class="header__profile-container">

    <div class="header__level" data-component="adaptive-text">
        <?= $_SESSION['level'] ?>
    </div>

        <span class="header__nickname" data-component="adaptive-text">
            @<?= htmlspecialchars($user['username']) ?>
        </span>

        <div class="header__experience-bar">
            <div class="header__experience-fill" style="width: <?= $progress['bar_width'] ?>%;"></div>
        </div>

        <button
            class="header__profile-button"
            data-component="profile_button"
            data-profile-img="<?= $hasAvatar ? 1 : 0 ?>"
            data-avatar-src="<?= htmlspecialchars($user['avatar'] ?? '') ?>"
            data-placeholder-size="36"
            data-profile-url="/profile"
        ></button>

    </div>

<?php else: ?>

    <div class="header__profile-container header__profile-container--guest">
        <a href="/sign_up" class="header__login-link">Войти</a>
    </div>

<?php endif; ?>
