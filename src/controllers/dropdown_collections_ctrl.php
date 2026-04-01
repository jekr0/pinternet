<?php

require_once __DIR__ . '/../config/database_conf.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'error' => 'Требуется авторизация.'], 401);
}

$userId = (int) $_SESSION['user_id'];
$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$path = rtrim($path, '/');

if ($path === '/posts/bookmark/boards') {
    handleBookmarkBoards($pdo, $userId);
}

if ($path === '/posts/bookmark/board-toggle') {
    handleBookmarkBoardToggle($pdo, $userId);
}

if ($path === '/posts/bookmark/board-create') {
    handleBookmarkBoardCreate($pdo, $userId);
}

if ($path === '/posts/bookmark/clear') {
    handleBookmarkClear($pdo, $userId);
}

jsonResponse(['success' => false, 'error' => 'Неизвестный метод.'], 404);

function handleBookmarkBoards(PDO $pdo, int $userId): never
{
    $postId = (int) ($_GET['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    $boardsStmt = $pdo->prepare('
        SELECT b.name, CASE WHEN sp.id IS NULL THEN 0 ELSE 1 END AS is_saved
        FROM Boards b
        LEFT JOIN Saved_Posts sp ON sp.board_id = b.id AND sp.user_id = b.user_id AND sp.post_id = ?
        WHERE b.user_id = ?
        ORDER BY b.created_at ASC
    ');
    $boardsStmt->execute([$postId, $userId]);
    $rows = $boardsStmt->fetchAll();

    if (empty($rows)) {
        createBoard($pdo, $userId, 'Profile');
        $rows = [['name' => 'Profile', 'is_saved' => 0]];
    }

    $boards = array_map(static fn(array $row) => [
        'name' => ((string) $row['name']) === 'Profile' ? 'Профиль' : (string) $row['name'],
        'is_saved' => ((int) $row['is_saved']) === 1,
    ], $rows);

    jsonResponse(['success' => true, 'boards' => $boards]);
}

function handleBookmarkBoardToggle(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $boardName = normalizeBoardName(trim((string) ($_POST['board'] ?? '')));

    if ($postId <= 0 || $boardName === '') {
        jsonResponse(['success' => false, 'error' => 'Некорректные параметры.'], 422);
    }

    $boardId = findBoardId($pdo, $userId, $boardName);
    if ($boardId === null && $boardName === 'Profile') {
        $boardId = createBoard($pdo, $userId, 'Profile');
    }
    if ($boardId === null) {
        jsonResponse(['success' => false, 'error' => 'Коллекция не найдена.'], 404);
    }

    try {
        $pdo->beginTransaction();

        $savedStmt = $pdo->prepare('SELECT id FROM Saved_Posts WHERE user_id = ? AND post_id = ? AND board_id = ? LIMIT 1');
        $savedStmt->execute([$userId, $postId, $boardId]);
        $savedId = $savedStmt->fetchColumn();

        $isSaved = false;
        if ($savedId !== false) {
            $deleteStmt = $pdo->prepare('DELETE FROM Saved_Posts WHERE id = ?');
            $deleteStmt->execute([(int) $savedId]);
        } else {
            $insertStmt = $pdo->prepare('INSERT INTO Saved_Posts (user_id, post_id, board_id) VALUES (?, ?, ?)');
            $insertStmt->execute([$userId, $postId, $boardId]);
            $isSaved = true;
        }

        $hasAnyStmt = $pdo->prepare('SELECT 1 FROM Saved_Posts WHERE user_id = ? AND post_id = ? LIMIT 1');
        $hasAnyStmt->execute([$userId, $postId]);
        $hasAny = $hasAnyStmt->fetchColumn() !== false;

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Bookmark board toggle error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось обновить коллекцию.'], 500);
    }

    jsonResponse(['success' => true, 'saved' => $isSaved, 'has_any' => $hasAny]);
}

function handleBookmarkClear(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    try {
        $deleteStmt = $pdo->prepare('DELETE FROM Saved_Posts WHERE user_id = ? AND post_id = ?');
        $deleteStmt->execute([$userId, $postId]);
    } catch (Throwable $e) {
        error_log('Bookmark clear error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось удалить пост из коллекций.'], 500);
    }

    jsonResponse(['success' => true]);
}

function handleBookmarkBoardCreate(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $boardName = normalizeBoardName(trim((string) ($_POST['board'] ?? '')));
    if ($postId <= 0 || $boardName === '') {
        jsonResponse(['success' => false, 'error' => 'Некорректные параметры.'], 422);
    }

    try {
        $pdo->beginTransaction();

        $boardId = findBoardId($pdo, $userId, $boardName);
        if ($boardId === null) {
            $boardId = createBoard($pdo, $userId, $boardName);
        }

        $existsStmt = $pdo->prepare('SELECT id FROM Saved_Posts WHERE user_id = ? AND post_id = ? AND board_id = ? LIMIT 1');
        $existsStmt->execute([$userId, $postId, $boardId]);
        $savedId = $existsStmt->fetchColumn();

        if ($savedId === false) {
            $insertStmt = $pdo->prepare('INSERT INTO Saved_Posts (user_id, post_id, board_id) VALUES (?, ?, ?)');
            $insertStmt->execute([$userId, $postId, $boardId]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Bookmark board create error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось создать коллекцию.'], 500);
    }

    jsonResponse(['success' => true, 'board' => $boardName]);
}

function normalizeBoardName(string $name): string
{
    if ($name === 'Профиль' || $name === 'Profile') {
        return 'Profile';
    }

    return $name;
}

function findBoardId(PDO $pdo, int $userId, string $boardName): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM Boards WHERE user_id = ? AND name = ? LIMIT 1');
    $stmt->execute([$userId, $boardName]);
    $id = $stmt->fetchColumn();

    return $id === false ? null : (int) $id;
}

function createBoard(PDO $pdo, int $userId, string $boardName): int
{
    $insert = $pdo->prepare('INSERT INTO Boards (user_id, name, description) VALUES (?, ?, ?)');
    $insert->execute([$userId, $boardName, 'Системная коллекция профиля']);

    return (int) $pdo->lastInsertId();
}

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
