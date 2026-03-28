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

if ($path === '/boards/list') {
    handleBoardsList($pdo, $userId);
}

if ($path === '/posts/create') {
    handleCreatePost($pdo, $userId);
}

jsonResponse(['success' => false, 'error' => 'Неизвестный метод.'], 404);

function handleBoardsList(PDO $pdo, int $userId): never
{
    $stmt = $pdo->prepare('SELECT name FROM Boards WHERE user_id = ? ORDER BY created_at ASC');
    $stmt->execute([$userId]);
    $boards = array_map(static fn(array $row) => (string) $row['name'], $stmt->fetchAll());

    if (empty($boards)) {
        $boards = ['Профиль'];
    }

    jsonResponse(['success' => true, 'boards' => $boards]);
}

function handleCreatePost(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $description = trim((string) ($_POST['description'] ?? ''));
    $collectionInput = trim((string) ($_POST['collection'] ?? 'Профиль'));
    $tagsInput = trim((string) ($_POST['tags'] ?? ''));
    $confirmCreateCollection = (string) ($_POST['confirm_create_collection'] ?? '') === '1';

    if (mb_strlen($description) > 255) {
        jsonResponse(['success' => false, 'error' => 'Описание не должно превышать 255 символов.'], 422);
    }

    if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
        jsonResponse(['success' => false, 'error' => 'Изображение обязательно.'], 422);
    }

    $image = $_FILES['image'];
    if (($image['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonResponse(['success' => false, 'error' => 'Ошибка при загрузке изображения.'], 422);
    }

    $tmpPath = (string) ($image['tmp_name'] ?? '');
    $mimeType = (string) (mime_content_type($tmpPath) ?: '');
    $allowedTypes = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/gif' => 'gif',
    ];

    if (!isset($allowedTypes[$mimeType])) {
        jsonResponse(['success' => false, 'error' => 'Допустимы только PNG, JPEG и GIF.'], 422);
    }

    $uploadDir = dirname(__DIR__, 2) . '/htdocs/uploads/posts';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
        jsonResponse(['success' => false, 'error' => 'Не удалось подготовить директорию для загрузки.'], 500);
    }

    $fileName = sprintf('post_%d_%s.%s', $userId, bin2hex(random_bytes(8)), $allowedTypes[$mimeType]);
    $fullPath = $uploadDir . '/' . $fileName;
    $publicPath = 'uploads/posts/' . $fileName;

    if (!move_uploaded_file($tmpPath, $fullPath)) {
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить изображение.'], 500);
    }

    $collectionName = validateAndNormalizeCollectionName($collectionInput);
    if ($collectionName === null) {
        jsonResponse(['success' => false, 'error' => 'Название коллекции: до 32 символов, только латиница, кириллица, цифры, пробел и _.'], 422);
    }

    try {
        $pdo->beginTransaction();

        $insertPost = $pdo->prepare('INSERT INTO Posts (user_id, image_path, description) VALUES (?, ?, ?)');
        $insertPost->execute([$userId, $publicPath, $description !== '' ? $description : null]);
        $postId = (int) $pdo->lastInsertId();

        $boardId = findBoardId($pdo, $userId, $collectionName);
        if ($boardId === null) {
            if (!$confirmCreateCollection) {
                $pdo->rollBack();
                if (is_file($fullPath)) {
                    @unlink($fullPath);
                }
                jsonResponse([
                    'success' => false,
                    'requires_collection_creation' => true,
                    'collection_name' => $collectionName,
                    'error' => sprintf('Коллекции "%s" не существует.', $collectionName),
                ], 409);
            }

            $boardId = createBoard($pdo, $userId, $collectionName);
        }

        $savePost = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, board_id) VALUES (?, ?, ?)');
        $savePost->execute([$userId, $postId, $boardId]);

        $hashtags = parseHashtags($tagsInput);
        if (!empty($hashtags)) {
            $insertHashtag = $pdo->prepare('INSERT INTO Hashtags (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)');
            $linkHashtag = $pdo->prepare('INSERT IGNORE INTO Post_Hashtags (post_id, hashtag_id) VALUES (?, ?)');

            foreach ($hashtags as $hashtag) {
                $insertHashtag->execute([$hashtag]);
                $hashtagId = (int) $pdo->lastInsertId();
                $linkHashtag->execute([$postId, $hashtagId]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
        error_log('Post creation error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось создать пост.'], 500);
    }

    jsonResponse(['success' => true, 'post_id' => $postId, 'image_path' => $publicPath]);
}

function findBoardId(PDO $pdo, int $userId, string $collectionName): ?int
{
    $select = $pdo->prepare('SELECT id FROM Boards WHERE user_id = ? AND name = ? LIMIT 1');
    $select->execute([$userId, $collectionName]);
    $existingId = $select->fetchColumn();

    if ($existingId !== false) {
        return (int) $existingId;
    }

    return null;
}

function createBoard(PDO $pdo, int $userId, string $collectionName): int
{
    $insert = $pdo->prepare('INSERT INTO Boards (user_id, name, description) VALUES (?, ?, ?)');
    $insert->execute([$userId, $collectionName, 'Создано автоматически при публикации поста']);

    return (int) $pdo->lastInsertId();
}

function normalizeCollectionName(string $value): string
{
    if ($value === '' || mb_strtolower($value) === 'профиль' || mb_strtolower($value) === 'profile') {
        return 'Profile';
    }

    return $value;
}

function validateAndNormalizeCollectionName(string $value): ?string
{
    $normalized = trim(normalizeCollectionName($value));

    if ($normalized === '') {
        return 'Profile';
    }

    if (mb_strlen($normalized) > 32) {
        return null;
    }

    if (!preg_match('/^[A-Za-zА-Яа-яЁё0-9_ ]+$/u', $normalized)) {
        return null;
    }

    return $normalized;
}

function parseHashtags(string $tagsInput): array
{
    if ($tagsInput === '') {
        return [];
    }

    $parts = preg_split('/[\s,]+/u', $tagsInput);
    if (!is_array($parts)) {
        return [];
    }

    $normalized = [];
    foreach ($parts as $part) {
        $tag = trim($part);
        if ($tag === '') {
            continue;
        }

        $tag = ltrim($tag, '#');
        if ($tag === '') {
            continue;
        }

        $tag = mb_strtolower($tag);

        if ($tag === '') {
            continue;
        }

        if (mb_strlen($tag) > 16) {
            $tag = mb_substr($tag, 0, 16);
        }

        if (!preg_match('/^[A-Za-zА-Яа-яЁё0-9_]+$/u', $tag)) {
            continue;
        }

        $normalized[$tag] = $tag;
        if (count($normalized) >= 24) {
            break;
        }
    }

    return array_values($normalized);
}

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
