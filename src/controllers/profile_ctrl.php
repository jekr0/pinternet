<?php
// src/controllers/profile_ctrl.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database_conf.php';

function profileJsonResponse(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($path !== '/profile/follow') {
    profileJsonResponse(['success' => false, 'error' => 'Маршрут не найден.'], 404);
}

if ($method !== 'POST') {
    profileJsonResponse(['success' => false, 'error' => 'Метод не поддерживается.'], 405);
}

$viewerId = (int) ($_SESSION['user_id'] ?? 0);
if ($viewerId <= 0) {
    profileJsonResponse(['success' => false, 'error' => 'Сначала войдите в аккаунт.'], 401);
}

$targetUserId = (int) ($_POST['user_id'] ?? 0);
if ($targetUserId <= 0) {
    profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден.'], 400);
}

if ($targetUserId === $viewerId) {
    profileJsonResponse(['success' => false, 'error' => 'Нельзя подписаться на себя.'], 400);
}

$userStmt = $pdo->prepare('SELECT id, username FROM Users WHERE id = ? AND is_deleted = 0 LIMIT 1');
$userStmt->execute([$targetUserId]);
$targetUser = $userStmt->fetch();

if (!$targetUser) {
    profileJsonResponse(['success' => false, 'error' => 'Пользователь не найден.'], 404);
}

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
