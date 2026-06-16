<?php
// src/controllers/profile_ctrl.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database_conf.php';
require_once __DIR__ . '/../config/level_helper.php';
require_once __DIR__ . '/notifications_ctrl.php';

function profileJsonResponse(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireProfilePostMethod(): void
{
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        profileJsonResponse(['success' => false, 'error' => 'Метод не поддерживается'], 405);
    }
}

function requireProfileViewerId(): int
{
    $viewerId = (int) ($_SESSION['user_id'] ?? 0);
    if ($viewerId <= 0) {
        profileJsonResponse(['success' => false, 'error' => 'Для этого действия требуется авторизация'], 401);
    }

    return $viewerId;
}

function findProfileTargetUser(PDO $pdo, int $targetUserId): array
{
    if ($targetUserId <= 0) {
        profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден'], 400);
    }

    $userStmt = $pdo->prepare('SELECT id, username FROM Users WHERE id = ? AND is_deleted = 0 LIMIT 1');
    $userStmt->execute([$targetUserId]);
    $targetUser = $userStmt->fetch();

    if (!$targetUser) {
        profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден'], 404);
    }

    return $targetUser;
}

function handleProfileFollow(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя подписаться на себя'], 400);
    }

    $targetUser = findProfileTargetUser($pdo, $targetUserId);

    try {
        $pdo->beginTransaction();

        $insertStmt = $pdo->prepare('INSERT IGNORE INTO User_Follows (follower_id, following_id) VALUES (?, ?)');
        $insertStmt->execute([$viewerId, $targetUserId]);
        $isFirstFollow = $insertStmt->rowCount() > 0;

        if ($isFirstFollow) {
            $insertAward = $pdo->prepare('INSERT IGNORE INTO User_Follows_Exp_Awards (subscriber_id, subscribed_user_id) VALUES (?, ?)');
            $insertAward->execute([$viewerId, $targetUserId]);

            if ($insertAward->rowCount() > 0) {
                addExpWithoutTransaction($pdo, $targetUserId, SUBSCRIBE_EXP_AMOUNT);
            }
        }

        $mutualStmt = $pdo->prepare('SELECT 1 FROM User_Follows WHERE follower_id = ? AND following_id = ? LIMIT 1');
        $mutualStmt->execute([$targetUserId, $viewerId]);
        $isMutual = $mutualStmt->fetchColumn() !== false;

        if ($isFirstFollow) {
            notifyUserFollowed($pdo, $targetUserId, $viewerId);
            if ($isMutual) {
                notifyMutualFollow($pdo, $viewerId, $targetUserId);
                notifyMutualFollow($pdo, $targetUserId, $viewerId);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Profile follow error: ' . $e->getMessage());
        profileJsonResponse(['success' => false, 'error' => 'Не удалось подписаться'], 500);
    }

    profileJsonResponse([
        'success' => true,
        'state' => $isMutual ? 'friends' : 'subscribed',
        'username' => (string) ($targetUser['username'] ?? ''),
    ]);
}

function handleProfileUnfollow(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя отписаться от себя'], 400);
    }

    $targetUser = findProfileTargetUser($pdo, $targetUserId);

    $deleteStmt = $pdo->prepare('DELETE FROM User_Follows WHERE follower_id = ? AND following_id = ?');
    $deleteStmt->execute([$viewerId, $targetUserId]);

    profileJsonResponse([
        'success' => true,
        'state' => 'default',
        'username' => (string) ($targetUser['username'] ?? ''),
    ]);
}

function handleProfileReport(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя пожаловаться на себя'], 400);
    }

    findProfileTargetUser($pdo, $targetUserId);

    try {
        $insertStmt = $pdo->prepare('INSERT IGNORE INTO User_Reports (user_id, reported_user_id) VALUES (?, ?)');
        $insertStmt->execute([$viewerId, $targetUserId]);
        $alreadyReported = $insertStmt->rowCount() === 0;
    } catch (Throwable $e) {
        error_log('User report error: ' . $e->getMessage());
        profileJsonResponse(['success' => false, 'error' => 'Не удалось отправить жалобу'], 500);
    }

    profileJsonResponse(['success' => true, 'already_reported' => $alreadyReported]);
}

function handleProfileNotifications(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя включить уведомления для себя'], 400);
    }

    findProfileTargetUser($pdo, $targetUserId);

    $enabled = filter_var($_POST['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $updateStmt = $pdo->prepare('UPDATE User_Follows SET notifications_switch = ? WHERE follower_id = ? AND following_id = ?');
    $updateStmt->execute([$enabled ? 1 : 0, $viewerId, $targetUserId]);

    if ($updateStmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT 1 FROM User_Follows WHERE follower_id = ? AND following_id = ? LIMIT 1');
        $existsStmt->execute([$viewerId, $targetUserId]);
        if ($existsStmt->fetchColumn() === false) {
            profileJsonResponse(['success' => false, 'error' => 'Сначала подпишитесь на пользователя'], 409);
        }
    }

    profileJsonResponse(['success' => true, 'enabled' => $enabled]);
}

function handleProfileBlock(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя заблокировать себя'], 400);
    }

    $targetUser = findProfileTargetUser($pdo, $targetUserId);
    $blocked = filter_var($_POST['blocked'] ?? false, FILTER_VALIDATE_BOOLEAN);

    if ($blocked) {
        $stmt = $pdo->prepare('INSERT IGNORE INTO User_Blocks (blocker_user_id, blocked_user_id) VALUES (?, ?)');
        $stmt->execute([$viewerId, $targetUserId]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM User_Blocks WHERE blocker_user_id = ? AND blocked_user_id = ?');
        $stmt->execute([$viewerId, $targetUserId]);
    }

    profileJsonResponse([
        'success' => true,
        'blocked' => $blocked,
        'username' => (string) ($targetUser['username'] ?? ''),
    ]);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
requireProfilePostMethod();
$viewerId = requireProfileViewerId();
$targetUserId = (int) ($_POST['user_id'] ?? 0);

match ($path) {
    '/profile/follow' => handleProfileFollow($pdo, $viewerId, $targetUserId),
    '/profile/unfollow' => handleProfileUnfollow($pdo, $viewerId, $targetUserId),
    '/profile/report' => handleProfileReport($pdo, $viewerId, $targetUserId),
    '/profile/notifications' => handleProfileNotifications($pdo, $viewerId, $targetUserId),
    '/profile/block' => handleProfileBlock($pdo, $viewerId, $targetUserId),
    default => profileJsonResponse(['success' => false, 'error' => 'Маршрут не найден'], 404),
};
