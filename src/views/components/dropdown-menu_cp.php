<?php
// src/views/components/dropdown-menu_cp.php

if (session_status() === PHP_SESSION_NONE) session_start();

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

    <div class="dropdown dropdown--hidden" id="header-dropdown-menu">
        <ul class="dropdown__list">

            <li class="dropdown__item dropdown__item--title">
                Текущий аккаунт:
            </li>

            <li class="dropdown__item dropdown__item--info">
                <?= htmlspecialchars($user['email']) ?>
            </li>

            <li class="dropdown__item dropdown__item--info">
                    <?= $progress['current'] ?>/<?= $progress['needed'] ?> exp до <?= $progress['next_level'] ?> уровня
            </li>

            <li class="dropdown__divider"></li>

            <li class="dropdown__item">
                <a href="/profile?tab=notifications" class="dropdown__link">
                    Уведомления
                    <span class="dropdown__badge <?= $unreadCount === 0 ? 'dropdown__badge--empty' : '' ?>">
                        <?= $unreadCount ?>
                    </span>
                </a>
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
                Для доступа к этим функциям необходимо авторизироваться
            </li>
        </ul>
    </div>

<?php endif; ?>