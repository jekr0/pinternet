<?php
// src/controllers/notifications_ctrl.php

function notificationSnippet(?string $value, int $limit = 32): string
{
    $text = trim(preg_replace('/\s+/u', ' ', (string) $value));
    if ($text === '') return '';
    if (mb_strlen($text) <= $limit) return $text;
    return mb_substr($text, 0, $limit) . '...';
}

function notificationActorUsername(PDO $pdo, int $actorUserId): string
{
    $stmt = $pdo->prepare('SELECT username FROM Users WHERE id = ? AND is_deleted = 0 LIMIT 1');
    $stmt->execute([$actorUserId]);
    return (string) ($stmt->fetchColumn() ?: 'user');
}

function createNotification(PDO $pdo, int $userId, string $title, string $text): void
{
    if ($userId <= 0 || trim($text) === '') return;

    $stmt = $pdo->prepare('INSERT INTO Notifications (user_id, title, text) VALUES (?, ?, ?)');
    $stmt->execute([
        $userId,
        mb_substr($title, 0, 64),
        mb_substr($text, 0, 256),
    ]);
}

function createActorNotification(PDO $pdo, int $recipientUserId, int $actorUserId, string $title, string $messageTemplate, ?string $snippetSource = null): void
{
    if ($recipientUserId <= 0 || $recipientUserId === $actorUserId) return;

    $username = notificationActorUsername($pdo, $actorUserId);
    $message = str_replace('@nickname', '@' . $username, $messageTemplate);
    $snippet = notificationSnippet($snippetSource);
    if ($snippet !== '') {
        $message .= ' "' . $snippet . '"';
    }

    createNotification($pdo, $recipientUserId, $title, $message);
}

function notifyPostLiked(PDO $pdo, int $postOwnerId, int $actorUserId, ?string $postText): void
{
    createActorNotification($pdo, $postOwnerId, $actorUserId, 'Новый лайк', '@nickname понравится ваш пост', $postText);
}

function notifyCommentLiked(PDO $pdo, int $commentOwnerId, int $actorUserId, ?string $commentText): void
{
    createActorNotification($pdo, $commentOwnerId, $actorUserId, 'Новый лайк', '@nickname понравится ваш комментарий', $commentText);
}

function notifyPostCommented(PDO $pdo, int $postOwnerId, int $actorUserId, ?string $postText): void
{
    createActorNotification($pdo, $postOwnerId, $actorUserId, 'Новый комментарий', '@nickname прокомментировал ваш пост', $postText);
}

function notifyCommentReplied(PDO $pdo, int $commentOwnerId, int $actorUserId, ?string $commentText): void
{
    createActorNotification($pdo, $commentOwnerId, $actorUserId, 'Новый ответ', '@nickname ответил на ваш комментарий', $commentText);
}

function notifyUserFollowed(PDO $pdo, int $followedUserId, int $actorUserId): void
{
    createActorNotification($pdo, $followedUserId, $actorUserId, 'Новая подписка', '@nickname подписался на вас');
}

function notifyMutualFollow(PDO $pdo, int $recipientUserId, int $actorUserId): void
{
    createActorNotification($pdo, $recipientUserId, $actorUserId, 'Новый друг', 'Теперь вы с @nickname друзья');
}

function notifyFollowedUserCreatedPost(PDO $pdo, int $authorUserId, int $postId, ?string $postText): void
{
    $followersStmt = $pdo->prepare('SELECT follower_id FROM User_Follows WHERE following_id = ? AND notifications_switch = 1');
    $followersStmt->execute([$authorUserId]);
    $followers = $followersStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    foreach ($followers as $followerId) {
        createActorNotification($pdo, (int) $followerId, $authorUserId, 'Новый пост', '@nickname выложил новый пост', $postText);
    }
}
