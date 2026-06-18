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

function getProfileMessageAvailability(PDO $pdo, int $viewerId, int $friendId): array
{
    if ($friendId <= 0 || $friendId === $viewerId) {
        return ['can_message' => false, 'reason' => 'not_found'];
    }

    findProfileTargetUser($pdo, $friendId);

    $blockStmt = $pdo->prepare('SELECT blocker_user_id FROM User_Blocks WHERE (blocker_user_id = ? AND blocked_user_id = ?) OR (blocker_user_id = ? AND blocked_user_id = ?) LIMIT 1');
    $blockStmt->execute([$viewerId, $friendId, $friendId, $viewerId]);
    $blockerId = $blockStmt->fetchColumn();
    if ($blockerId !== false) {
        return [
            'can_message' => false,
            'reason' => (int) $blockerId === $viewerId ? 'blocked_by_viewer' : 'blocked_by_friend',
        ];
    }

    $friendStmt = $pdo->prepare('
        SELECT 1
        FROM User_Follows outgoing
        INNER JOIN User_Follows incoming
            ON incoming.follower_id = ? AND incoming.following_id = ?
        WHERE outgoing.follower_id = ? AND outgoing.following_id = ?
        LIMIT 1
    ');
    $friendStmt->execute([$friendId, $viewerId, $viewerId, $friendId]);
    if ($friendStmt->fetchColumn() === false) {
        return ['can_message' => false, 'reason' => 'not_friends'];
    }

    return ['can_message' => true, 'reason' => ''];
}

function requireProfileMessageAvailability(PDO $pdo, int $viewerId, int $friendId): void
{
    $availability = getProfileMessageAvailability($pdo, $viewerId, $friendId);
    if ($availability['can_message']) return;

    $messages = [
        'not_friends' => 'Похоже, вы больше не друзья',
        'blocked_by_viewer' => 'Для отправки сообщений разблокируйте пользователя',
        'blocked_by_friend' => 'Сожалеем, вы были заблокированы',
        'not_found' => 'Пользователь не найден',
    ];

    profileJsonResponse([
        'success' => false,
        'error' => $messages[$availability['reason']] ?? 'Нельзя отправить сообщение',
        'reason' => $availability['reason'],
    ], $availability['reason'] === 'not_found' ? 400 : 403);
}

function handleProfileMessagesList(PDO $pdo, int $viewerId, int $friendId): never
{
    $availability = getProfileMessageAvailability($pdo, $viewerId, $friendId);

    $stmt = $pdo->prepare('
        SELECT id, from_user_id, to_user_id, text, UNIX_TIMESTAMP(created_at) AS created_at_ts
        FROM Messages
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY created_at DESC, id DESC
        LIMIT 100
    ');
    $stmt->execute([$viewerId, $friendId, $friendId, $viewerId]);
    $messages = $stmt->fetchAll() ?: [];

    $readStmt = $pdo->prepare('UPDATE Messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0');
    $readStmt->execute([$friendId, $viewerId]);

    profileJsonResponse([
        'success' => true,
        'can_message' => $availability['can_message'],
        'reason' => $availability['reason'],
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
    requireProfileMessageAvailability($pdo, $viewerId, $friendId);

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

function handleProfileMessagesChats(PDO $pdo, int $viewerId): never
{
    $stmt = $pdo->prepare('
        SELECT
            u.id,
            u.username,
            SUM(CASE WHEN m.to_user_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread_count,
            MAX(m.created_at) AS last_message_at
        FROM Messages m
        INNER JOIN Users u
            ON u.id = CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END
        WHERE (m.from_user_id = ? OR m.to_user_id = ?) AND u.is_deleted = 0
        GROUP BY u.id, u.username
        ORDER BY last_message_at DESC, u.username ASC
        LIMIT 100
    ');
    $stmt->execute([$viewerId, $viewerId, $viewerId, $viewerId]);
    $chats = $stmt->fetchAll() ?: [];

    profileJsonResponse([
        'success' => true,
        'chats' => array_map(static fn (array $chat): array => [
            'id' => (int) ($chat['id'] ?? 0),
            'username' => (string) ($chat['username'] ?? ''),
            'unread_count' => (int) ($chat['unread_count'] ?? 0),
            'last_message_at' => (string) ($chat['last_message_at'] ?? ''),
        ], $chats),
    ]);
}


function handleProfileNotificationsList(PDO $pdo, int $viewerId): never
{
    $stmt = $pdo->prepare('
        SELECT n.id,
               n.title,
               n.text,
               n.is_read,
               n.actor_user_id,
               n.post_id,
               n.comment_id,
               UNIX_TIMESTAMP(n.created_at) AS created_at_ts,
               u.username AS actor_username
        FROM Notifications n
        LEFT JOIN Users u ON u.id = n.actor_user_id AND u.is_deleted = 0
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT 100
    ');
    $stmt->execute([$viewerId]);
    $notifications = $stmt->fetchAll() ?: [];

    profileJsonResponse([
        'success' => true,
        'notifications' => array_map(static function (array $notification): array {
            $postId = (int) ($notification['post_id'] ?? 0);
            $commentId = (int) ($notification['comment_id'] ?? 0);
            $actorUsername = (string) ($notification['actor_username'] ?? '');
            $targetUrl = '';
            if ($postId > 0) {
                $targetUrl = '/post?id=' . $postId . ($commentId > 0 ? '&comment_id=' . $commentId : '');
            } elseif ($actorUsername !== '') {
                $targetUrl = '/profile?username=' . rawurlencode($actorUsername);
            }

            return [
                'id' => (int) ($notification['id'] ?? 0),
                'title' => (string) ($notification['title'] ?? ''),
                'text' => $notification['text'] === null ? '' : (string) $notification['text'],
                'is_read' => (int) ($notification['is_read'] ?? 0) === 1,
                'created_at' => date('c', (int) ($notification['created_at_ts'] ?? time())),
                'actor_user_id' => (int) ($notification['actor_user_id'] ?? 0),
                'actor_username' => $actorUsername,
                'post_id' => $postId,
                'comment_id' => $commentId,
                'target_url' => $targetUrl,
            ];
        }, $notifications),
    ]);
}

function handleProfileNotificationsRead(PDO $pdo, int $viewerId): never
{
    $stmt = $pdo->prepare('UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0');
    $stmt->execute([$viewerId]);

    profileJsonResponse(['success' => true]);
}

function handleProfileNotificationsClear(PDO $pdo, int $viewerId): never
{
    $stmt = $pdo->prepare('DELETE FROM Notifications WHERE user_id = ?');
    $stmt->execute([$viewerId]);

    profileJsonResponse(['success' => true]);
}

function handleProfileFooterCounts(PDO $pdo, int $viewerId): never
{
    $messagesStmt = $pdo->prepare('SELECT COUNT(*) FROM Messages WHERE to_user_id = ? AND is_read = 0');
    $messagesStmt->execute([$viewerId]);
    $notificationsStmt = $pdo->prepare('SELECT COUNT(*) FROM Notifications WHERE user_id = ? AND is_read = 0');
    $notificationsStmt->execute([$viewerId]);

    $latestStmt = $pdo->prepare('
        SELECT u.username, COUNT(*) AS unread_count
        FROM Messages m
        INNER JOIN Users u ON u.id = m.from_user_id
        WHERE m.to_user_id = ? AND m.is_read = 0
        GROUP BY u.id, u.username
        ORDER BY MAX(m.created_at) DESC
        LIMIT 1
    ');
    $latestStmt->execute([$viewerId]);
    $latest = $latestStmt->fetch() ?: [];

    profileJsonResponse([
        'success' => true,
        'messages_unread' => (int) $messagesStmt->fetchColumn(),
        'notifications_unread' => (int) $notificationsStmt->fetchColumn(),
        'latest_unread' => [
            'username' => (string) ($latest['username'] ?? ''),
            'count' => (int) ($latest['unread_count'] ?? 0),
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
    '/profile/messages/chats' => handleProfileMessagesChats($pdo, $viewerId),
    '/profile/notifications/list' => handleProfileNotificationsList($pdo, $viewerId),
    '/profile/notifications/read' => handleProfileNotificationsRead($pdo, $viewerId),
    '/profile/notifications/clear' => handleProfileNotificationsClear($pdo, $viewerId),
    '/profile/footer-counts' => handleProfileFooterCounts($pdo, $viewerId),
    default => profileJsonResponse(['success' => false, 'error' => 'Маршрут не найден'], 404),
};
