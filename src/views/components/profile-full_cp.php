<?php
// src/views/components/profile-full_cp.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$profileFullUser = null;
$profileFullViewerId = (int) ($_SESSION['user_id'] ?? 0);
$profileFullUserId = 0;
$profileFullAvatarSrc = '';
$profileFullUsername = '';
$profileFullBio = '';
$profileFullSubscriptionsCount = 0;
$profileFullSubscribersCount = 0;
$profileFullTotalLikes = 0;
$profileFullHasAvatar = false;
$profileFullActionState = 'default';
$profileFullNotificationsEnabled = false;
$profileFullBlocked = false;
$profileFullStatus = '';

$profileFullRequestedUsername = trim(ltrim((string) ($_GET['username'] ?? ''), '@'));

if ($profileFullViewerId > 0 || $profileFullRequestedUsername !== '') {
    require_once __DIR__ . '/../../../src/config/database_conf.php';

    if ($profileFullRequestedUsername !== '') {
        $stmt = $pdo->prepare('
            SELECT u.id,
                   u.username,
                   u.avatar,
                   u.bio,
                   u.total_likes,
                   (SELECT COUNT(*) FROM User_Follows f WHERE f.follower_id = u.id) AS subscriptions_count,
                   (SELECT COUNT(*) FROM User_Follows f WHERE f.following_id = u.id) AS subscribers_count
            FROM Users u
            WHERE u.username = ? AND u.is_deleted = 0
            LIMIT 1
        ');
        $stmt->execute([$profileFullRequestedUsername]);
    } else {
        $stmt = $pdo->prepare('
            SELECT u.id,
                   u.username,
                   u.avatar,
                   u.bio,
                   u.total_likes,
                   (SELECT COUNT(*) FROM User_Follows f WHERE f.follower_id = u.id) AS subscriptions_count,
                   (SELECT COUNT(*) FROM User_Follows f WHERE f.following_id = u.id) AS subscribers_count
            FROM Users u
            WHERE u.id = ? AND u.is_deleted = 0
            LIMIT 1
        ');
        $stmt->execute([$profileFullViewerId]);
    }

    $profileFullUser = $stmt->fetch();
    $profileFullUserId = (int) ($profileFullUser['id'] ?? 0);
    $profileFullAvatarSrc = (string) ($profileFullUser['avatar'] ?? '');
    $profileFullUsername = (string) ($profileFullUser['username'] ?? '');
    $profileFullBio = trim((string) ($profileFullUser['bio'] ?? ''));
    $profileFullSubscriptionsCount = (int) ($profileFullUser['subscriptions_count'] ?? 0);
    $profileFullSubscribersCount = (int) ($profileFullUser['subscribers_count'] ?? 0);
    $profileFullTotalLikes = (int) ($profileFullUser['total_likes'] ?? 0);
    $profileFullHasAvatar = $profileFullAvatarSrc !== '';

    if ($profileFullViewerId > 0 && $profileFullUserId > 0) {
        if ($profileFullViewerId === $profileFullUserId) {
            $profileFullActionState = 'yourself';
            $profileFullStatus = 'Вы';
        } else {
            $followStmt = $pdo->prepare('
                SELECT
                    EXISTS(SELECT 1 FROM User_Follows WHERE follower_id = ? AND following_id = ?) AS viewer_follows,
                    EXISTS(SELECT 1 FROM User_Follows WHERE follower_id = ? AND following_id = ?) AS target_follows,
                    COALESCE((SELECT notifications_switch FROM User_Follows WHERE follower_id = ? AND following_id = ? LIMIT 1), 0) AS notifications_switch,
                    EXISTS(SELECT 1 FROM User_Blocks WHERE blocker_user_id = ? AND blocked_user_id = ?) AS viewer_blocks
            ');
            $followStmt->execute([
                $profileFullViewerId,
                $profileFullUserId,
                $profileFullUserId,
                $profileFullViewerId,
                $profileFullViewerId,
                $profileFullUserId,
                $profileFullViewerId,
                $profileFullUserId,
            ]);
            $followState = $followStmt->fetch();
            $viewerFollows = !empty($followState['viewer_follows']);
            $targetFollows = !empty($followState['target_follows']);
            $profileFullNotificationsEnabled = !empty($followState['notifications_switch']);
            $profileFullBlocked = !empty($followState['viewer_blocks']);

            if ($viewerFollows && $targetFollows) {
                $profileFullActionState = 'friends';
                $profileFullStatus = 'Друзья';
            } elseif ($viewerFollows) {
                $profileFullActionState = 'subscribed';
            } elseif ($targetFollows) {
                $profileFullStatus = 'Подписан';
            }
        }
    }
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

            <button class="post-full__action-button post-full__action-button--back" type="button" data-action="back" aria-label="Назад">
                <span class="post-full__action-icon" data-svg-src="/assets/images/icons/L-arrow.svg" aria-hidden="true"></span>
            </button>

            <button class="post-full__action-button profile-full__maximize" type="button" data-action="maximize-avatar" aria-label="Развернуть аватар">
                <span class="post-full__action-icon" data-svg-src="/assets/images/icons/maximize.svg" aria-hidden="true"></span>
            </button>
        </div>

        <div class="profile-full__info">
            <div class="profile-full__info-top-row">
                <div class="profile-full__nickname" data-component="adaptive-text" data-max-font="40">
                    <?= $profileFullUsername !== '' ? '@' . htmlspecialchars($profileFullUsername, ENT_QUOTES, 'UTF-8') : '' ?>
                </div>
                <?php if ($profileFullStatus !== ''): ?>
                    <span class="profile-full__status-separator" aria-hidden="true"></span>
                    <span class="profile-full__status"><?= htmlspecialchars($profileFullStatus, ENT_QUOTES, 'UTF-8') ?></span>
                <?php endif; ?>
            </div>
            <div class="profile-full__about<?= $profileFullBio === '' ? ' profile-full__about--empty' : ''; ?>">
                <?= htmlspecialchars($profileFullBio !== '' ? $profileFullBio : 'Описание пользователя отсутствует', ENT_QUOTES, 'UTF-8') ?>
            </div>
            <div class="profile-full__line profile-full__line--stats" aria-hidden="true"></div>
            <div class="profile-full__stats-row">
                <div class="profile-full__stat">Подписки: <?= $profileFullSubscriptionsCount ?></div>
                <div class="profile-full__stat">Подписчики: <?= $profileFullSubscribersCount ?></div>
                <div class="profile-full__stat">Собрано лайков: <?= $profileFullTotalLikes ?></div>
            </div>
        </div>
        <div
            class="profile-full__actions"
            aria-label="Действия с пользователем"
            data-action-state="<?= htmlspecialchars($profileFullActionState, ENT_QUOTES, 'UTF-8') ?>"
            data-profile-user-id="<?= $profileFullUserId ?>"
            data-profile-username="<?= htmlspecialchars($profileFullUsername, ENT_QUOTES, 'UTF-8') ?>"
            data-notifications-enabled="<?= $profileFullNotificationsEnabled ? 'true' : 'false' ?>"
            data-profile-blocked="<?= $profileFullBlocked ? 'true' : 'false' ?>"
            data-viewer-authorized="<?= $profileFullViewerId > 0 ? 'true' : 'false' ?>"
        ></div>
        <div class="profile-full__medals" aria-hidden="true"></div>
        <div class="profile-full__achievements" aria-hidden="true"></div>
    </div>
</section>
