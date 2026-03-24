<?php
// src/views/components/dropdown-menu_cp.php

if (session_status() === PHP_SESSION_NONE) session_start();

$isLoggedIn = !empty($_SESSION['user_id']);
?>

<?php if ($isLoggedIn): ?>

    <?php
    require_once __DIR__ . '/../../../src/config/database_conf.php';

    $stmt = $pdo->prepare('SELECT email, exp, level FROM Users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    $expPerLevel = 100;
    $expCurrent  = $user['exp'] % $expPerLevel;
    ?>

    <div class="dropdown dropdown--hidden" id="header-dropdown-menu">
        <ul class="dropdown__list">

            <li class="dropdown__item dropdown__item--info">
                <?= htmlspecialchars($user['email']) ?>
            </li>

            <li class="dropdown__item dropdown__item--info">
                <?= $expCurrent ?>/<?= $expPerLevel ?> exp
            </li>

            <li class="dropdown__divider"></li>

            <li class="dropdown__item">
                <a href="/profile?tab=notifications" class="dropdown__link">Уведомления</a>
            </li>

            <li class="dropdown__item">
                <a href="/profile?tab=settings" class="dropdown__link">Настройки</a>
            </li>

            <li class="dropdown__item">
                <a href="/logout" class="dropdown__link dropdown__link--logout">Выйти из аккаунта</a>
            </li>

        </ul>
    </div>

<?php else: ?>

    <div class="dropdown dropdown--hidden dropdown--guest" id="header-dropdown-menu">
        <ul class="dropdown__list">
            <li class="dropdown__item dropdown__item--guest">
                Для доступа к функциям профиля необходимо авторизироваться
            </li>
        </ul>
    </div>

<?php endif; ?>