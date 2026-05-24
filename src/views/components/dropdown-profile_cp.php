<?php
// src/views/components/dropdown-profile_cp.php

if (session_status() === PHP_SESSION_NONE && !headers_sent()) session_start();

$isLoggedIn = !empty($_SESSION['user_id']);
?>

<?php if ($isLoggedIn): ?>

    <?php
    require_once __DIR__ . '/../../../src/config/database_conf.php';
    require_once __DIR__ . '/../../../src/config/level_helper.php';

    $stmt = $pdo->prepare('SELECT email, exp, level FROM Users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!isset($_SESSION['exp'], $_SESSION['level'])) {
        $_SESSION['exp']   = (int) $user['exp'];
        $_SESSION['level'] = calcLevel((int) $user['exp']);
    }

    $progress = getExpProgress((int) $_SESSION['exp'], (int) $_SESSION['level']);

    ?>

    <div class="dropdown-profile dropdown-profile--hidden" id="header-dropdown-profile">
        <ul class="dropdown-profile__list">

            <li class="dropdown-profile__item dropdown-profile__item--title">
                Текущий аккаунт:
            </li>

            <li class="dropdown-profile__item dropdown-profile__item--info">
                <?= htmlspecialchars($user['email']) ?>
            </li>

            <li class="dropdown-profile__item dropdown-profile__item--info">
                    <?= $progress['current'] ?>/<?= $progress['needed'] ?> exp до <?= $progress['next_level'] ?> уровня
            </li>

        </ul>
    </div>

<?php else: ?>

    <div class="dropdown-profile dropdown-profile--hidden dropdown-profile--guest" id="header-dropdown-profile">
        <ul class="dropdown-profile__list">
            <li class="dropdown-profile__item dropdown-profile__item--guest">
                <div class="dropdown-profile__guest-message">
                    Для доступа к этим функциям необходимо авторизироваться
                </div>
            </li>
        </ul>
    </div>

<?php endif; ?>
