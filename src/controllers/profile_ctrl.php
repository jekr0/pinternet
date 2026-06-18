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

function handleProfileFriends(PDO $pdo, int $viewerId): never
{
    $stmt = $pdo->prepare('
        SELECT u.id, u.username, u.level
        FROM Users u
        INNER JOIN User_Follows outgoing
            ON outgoing.following_id = u.id AND outgoing.follower_id = ?
        INNER JOIN User_Follows incoming
            ON incoming.follower_id = u.id AND incoming.following_id = ?
        WHERE u.is_deleted = 0
    ');
    $stmt->execute([$viewerId, $viewerId]);
    $friends = $stmt->fetchAll() ?: [];

    usort($friends, static function (array $left, array $right): int {
        return strnatcasecmp((string) ($left['username'] ?? ''), (string) ($right['username'] ?? ''));
    });

    profileJsonResponse([
        'success' => true,
        'friends' => array_map(static fn (array $friend): array => [
            'id' => (int) ($friend['id'] ?? 0),
            'username' => (string) ($friend['username'] ?? ''),
            'level' => (int) ($friend['level'] ?? 1),
        ], $friends),
    ]);
}

function assertProfileFriend(PDO $pdo, int $viewerId, int $friendId): void
{
    if ($friendId <= 0 || $friendId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден'], 400);
    }

    findProfileTargetUser($pdo, $friendId);
    $stmt = $pdo->prepare('
        SELECT 1
        FROM User_Follows outgoing
        INNER JOIN User_Follows incoming
            ON incoming.follower_id = ? AND incoming.following_id = ?
        WHERE outgoing.follower_id = ? AND outgoing.following_id = ?
        LIMIT 1
    ');
    $stmt->execute([$friendId, $viewerId, $viewerId, $friendId]);
    if ($stmt->fetchColumn() === false) {
        profileJsonResponse(['success' => false, 'error' => 'Писать можно только друзьям'], 403);
    }
}

function handleProfileMessagesList(PDO $pdo, int $viewerId, int $friendId): never
{
    assertProfileFriend($pdo, $viewerId, $friendId);

    $stmt = $pdo->prepare('
        SELECT id, from_user_id, to_user_id, text, UNIX_TIMESTAMP(created_at) AS created_at_ts
        FROM Messages
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY created_at DESC, id DESC
        LIMIT 100
    ');
    $stmt->execute([$viewerId, $friendId, $friendId, $viewerId]);
    $messages = $stmt->fetchAll() ?: [];

    profileJsonResponse([
        'success' => true,
        'messages' => array_map(static fn (array $message): array => [
            'id' => (int) ($message['id'] ?? 0),
            'type' => (int) ($message['from_user_id'] ?? 0) === $viewerId ? 'self' : 'friend',
            'text' => (string) ($message['text'] ?? ''),
            'sentAt' => date('c', (int) ($message['created_at_ts'] ?? time())),
        ], $messages),
    ]);
}

function handleProfileMessagesSend(PDO $pdo, int $viewerId, int $friendId): never
{
    assertProfileFriend($pdo, $viewerId, $friendId);

    $text = trim((string) ($_POST['text'] ?? ''));
    if ($text === '') {
        profileJsonResponse(['success' => false, 'error' => 'Введите сообщение'], 400);
    }
    if (mb_strlen($text, 'UTF-8') > 256) {
        profileJsonResponse(['success' => false, 'error' => 'Сообщение не должно превышать 256 символов'], 400);
    }

    $stmt = $pdo->prepare('INSERT INTO Messages (from_user_id, to_user_id, text) VALUES (?, ?, ?)');
    $stmt->execute([$viewerId, $friendId, $text]);
    $messageId = (int) $pdo->lastInsertId();

    $createdStmt = $pdo->prepare('SELECT UNIX_TIMESTAMP(created_at) FROM Messages WHERE id = ? LIMIT 1');
    $createdStmt->execute([$messageId]);
    $createdAtTs = (int) ($createdStmt->fetchColumn() ?: time());

    profileJsonResponse([
        'success' => true,
        'message' => [
            'id' => $messageId,
            'type' => 'self',
            'text' => $text,
            'sentAt' => date('c', $createdAtTs),
        ],
    ]);
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
    '/profile/friends' => handleProfileFriends($pdo, $viewerId),
    '/profile/messages/list' => handleProfileMessagesList($pdo, $viewerId, $targetUserId),
    '/profile/messages/send' => handleProfileMessagesSend($pdo, $viewerId, $targetUserId),
    default => profileJsonResponse(['success' => false, 'error' => 'Маршрут не найден'], 404),
};
