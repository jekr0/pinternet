<?php
// src/controllers/profile_ctrl.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database_conf.php';

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
        profileJsonResponse(['success' => false, 'error' => 'Метод не поддерживается.'], 405);
    }
}

function requireProfileViewerId(): int
{
    $viewerId = (int) ($_SESSION['user_id'] ?? 0);
    if ($viewerId <= 0) {
        profileJsonResponse(['success' => false, 'error' => 'Сначала войдите в аккаунт.'], 401);
    }

    return $viewerId;
}

function findProfileTargetUser(PDO $pdo, int $targetUserId): array
{
    if ($targetUserId <= 0) {
        profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден.'], 400);
    }

    $userStmt = $pdo->prepare('SELECT id, username FROM Users WHERE id = ? AND is_deleted = 0 LIMIT 1');
    $userStmt->execute([$targetUserId]);
    $targetUser = $userStmt->fetch();

    if (!$targetUser) {
        profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден.'], 404);
    }

    return $targetUser;
}

function handleProfileFollow(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя подписаться на себя.'], 400);
    }

    $targetUser = findProfileTargetUser($pdo, $targetUserId);

    $insertStmt = $pdo->prepare('INSERT IGNORE INTO Follows (follower_id, following_id) VALUES (?, ?)');
    $insertStmt->execute([$viewerId, $targetUserId]);

    $mutualStmt = $pdo->prepare('SELECT 1 FROM Follows WHERE follower_id = ? AND following_id = ? LIMIT 1');
    $mutualStmt->execute([$targetUserId, $viewerId]);
    $isMutual = $mutualStmt->fetchColumn() !== false;

    profileJsonResponse([
        'success' => true,
        'state' => $isMutual ? 'friends' : 'subscribed',
        'username' => (string) ($targetUser['username'] ?? ''),
    ]);
}

function handleProfileUnfollow(PDO $pdo, int $viewerId, int $targetUserId): never
{
    if ($targetUserId === $viewerId) {
        profileJsonResponse(['success' => false, 'error' => 'Нельзя отписаться от себя.'], 400);
    }

    $targetUser = findProfileTargetUser($pdo, $targetUserId);

    $deleteStmt = $pdo->prepare('DELETE FROM Follows WHERE follower_id = ? AND following_id = ?');
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
        profileJsonResponse(['success' => false, 'error' => 'Нельзя пожаловаться на себя.'], 400);
    }

    findProfileTargetUser($pdo, $targetUserId);

    try {
        $insertStmt = $pdo->prepare('INSERT IGNORE INTO User_Reports (user_id, reported_user_id) VALUES (?, ?)');
        $insertStmt->execute([$viewerId, $targetUserId]);
        $alreadyReported = $insertStmt->rowCount() === 0;
    } catch (Throwable $e) {
        error_log('User report error: ' . $e->getMessage());
        profileJsonResponse(['success' => false, 'error' => 'Не удалось отправить жалобу.'], 500);
    }

    profileJsonResponse(['success' => true, 'already_reported' => $alreadyReported]);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
requireProfilePostMethod();
$viewerId = requireProfileViewerId();
$targetUserId = (int) ($_POST['user_id'] ?? 0);

match ($path) {
    '/profile/follow' => handleProfileFollow($pdo, $viewerId, $targetUserId),
    '/profile/unfollow' => handleProfileUnfollow($pdo, $viewerId, $targetUserId),
    '/profile/report' => handleProfileReport($pdo, $viewerId, $targetUserId),
    default => profileJsonResponse(['success' => false, 'error' => 'Маршрут не найден.'], 404),
};
