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

    // Считаем непрочитанные уведомления
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM Notifications WHERE user_id = ? AND is_read = 0');
    $stmt->execute([$_SESSION['user_id']]);
    $unreadCount = (int) $stmt->fetchColumn();
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

            <li class="dropdown-profile__divider"></li>

            <li class="dropdown-profile__item">
                <a href="/profile?tab=notifications" class="dropdown-profile__link">
                    Уведомления
                    <span class="dropdown-profile__badge <?= $unreadCount === 0 ? 'dropdown-profile__badge--empty' : '' ?>">
                        <?= $unreadCount ?>
                    </span>
                </a>
            </li>

            <li class="dropdown-profile__item">
                <a href="/profile?tab=settings" class="dropdown-profile__link">Настройки</a>
            </li>

            <li class="dropdown-profile__item">
                <a href="/logout" class="dropdown-profile__link dropdown-profile__link--logout">Выйти из аккаунта</a>
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
