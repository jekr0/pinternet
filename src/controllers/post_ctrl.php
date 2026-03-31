<?php

require_once __DIR__ . '/../config/database_conf.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$path = rtrim($path, '/');

$isPublicEndpoint = $path === '/posts/list';

if (!$isPublicEndpoint && empty($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'error' => 'Требуется авторизация.'], 401);
}

$userId = (int) ($_SESSION['user_id'] ?? 0);

if ($path === '/boards/list') {
    handleBoardsList($pdo, $userId);
}

if ($path === '/hashtags/suggest') {
    handleHashtagsSuggest($pdo);
}

if ($path === '/posts/create') {
    handleCreatePost($pdo, $userId);
}

if ($path === '/posts/like') {
    handleToggleLike($pdo, $userId);
}

if ($path === '/posts/bookmark') {
    handleBookmarkPost($pdo, $userId);
}

if ($path === '/posts/list') {
    handlePostsList($pdo);
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

function handleHashtagsSuggest(PDO $pdo): never
{
    $query = mb_strtolower(trim((string) ($_GET['q'] ?? '')));
    $query = preg_replace('/[^A-Za-zА-Яа-яЁё0-9_]/u', '', $query) ?: '';

    if ($query === '') {
        jsonResponse(['success' => true, 'tags' => []]);
    }

    $stmt = $pdo->prepare('
        SELECT h.name, COUNT(ph.post_id) AS post_count
        FROM Hashtags h
        LEFT JOIN Post_Hashtags ph ON ph.hashtag_id = h.id
        WHERE h.name LIKE ?
        GROUP BY h.id, h.name
        ORDER BY post_count DESC, h.name ASC
        LIMIT 10
    ');
    $stmt->execute([$query . '%']);
    $tags = array_map(static fn(array $row) => (string) $row['name'], $stmt->fetchAll());

    jsonResponse(['success' => true, 'tags' => $tags]);
}

function handleToggleLike(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    $selectPost = $pdo->prepare('SELECT id, user_id FROM Posts WHERE id = ? LIMIT 1');
    $selectPost->execute([$postId]);
    $post = $selectPost->fetch();
    if (!$post) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    $postOwnerId = (int) $post['user_id'];

    try {
        $pdo->beginTransaction();

        $selectLike = $pdo->prepare('SELECT id FROM Post_Likes WHERE user_id = ? AND post_id = ? LIMIT 1');
        $selectLike->execute([$userId, $postId]);
        $likeId = $selectLike->fetchColumn();

        if ($likeId !== false) {
            $deleteLike = $pdo->prepare('DELETE FROM Post_Likes WHERE id = ?');
            $deleteLike->execute([(int) $likeId]);
            $pdo->commit();
            jsonResponse(['success' => true, 'liked' => false]);
        }

        $insertLike = $pdo->prepare('INSERT INTO Post_Likes (user_id, post_id) VALUES (?, ?)');
        $insertLike->execute([$userId, $postId]);

        if ($userId !== $postOwnerId) {
            $insertAward = $pdo->prepare('INSERT IGNORE INTO Post_Like_Exp_Awards (liker_user_id, post_id, post_owner_id) VALUES (?, ?, ?)');
            $insertAward->execute([$userId, $postId, $postOwnerId]);

            if ($insertAward->rowCount() > 0) {
                $addExp = $pdo->prepare('UPDATE Users SET exp = exp + 5 WHERE id = ?');
                $addExp->execute([$postOwnerId]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Like toggle error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось обработать лайк.'], 500);
    }

    jsonResponse(['success' => true, 'liked' => true]);
}


function handleBookmarkPost(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    $postStmt = $pdo->prepare('SELECT user_id FROM Posts WHERE id = ? LIMIT 1');
    $postStmt->execute([$postId]);
    $postOwnerId = $postStmt->fetchColumn();

    if ($postOwnerId === false) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    if ((int) $postOwnerId === $userId) {
        jsonResponse(['success' => true, 'bookmarked' => false, 'is_owner' => true]);
    }

    try {
        $pdo->beginTransaction();

        $boardStmt = $pdo->prepare('SELECT id FROM Boards WHERE user_id = ? AND name = ? LIMIT 1');
        $boardStmt->execute([$userId, 'Profile']);
        $boardId = $boardStmt->fetchColumn();

        if ($boardId === false) {
            $createBoard = $pdo->prepare('INSERT INTO Boards (user_id, name, description) VALUES (?, ?, ?)');
            $createBoard->execute([$userId, 'Profile', 'Системная коллекция профиля']);
            $boardId = (int) $pdo->lastInsertId();
        }

        $saveStmt = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, board_id) VALUES (?, ?, ?)');
        $saveStmt->execute([$userId, $postId, (int) $boardId]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Bookmark error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить пост.'], 500);
    }

    jsonResponse(['success' => true, 'bookmarked' => true]);
}

function handlePostsList(PDO $pdo): never
{
    $stmt = $pdo->query('SELECT id, image_path, created_at FROM Posts ORDER BY created_at DESC, id DESC LIMIT 50');
    $posts = array_map(static fn(array $row) => [
        'id' => (int) $row['id'],
        'image_path' => (string) $row['image_path'],
        'created_at' => (string) $row['created_at'],
    ], $stmt->fetchAll());

    jsonResponse(['success' => true, 'posts' => $posts]);
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

    if (mb_strlen($description) > 256) {
        jsonResponse(['success' => false, 'error' => 'Описание не должно превышать 256 символов.'], 422);
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
        jsonResponse(['success' => false, 'error' => 'Название коллекции: до 32 символов, только латиница, кириллица, цифры, пробел и "_"'], 422);
    }

    try {
        $pdo->beginTransaction();

        $insertPost = $pdo->prepare('INSERT INTO Posts (user_id, image_path, description) VALUES (?, ?, ?)');
        $insertPost->execute([$userId, $publicPath, $description !== '' ? $description : null]);
        $postId = (int) $pdo->lastInsertId();

        $profileBoardId = findBoardId($pdo, $userId, 'Profile');
        if ($profileBoardId === null) {
            $profileBoardId = createBoard($pdo, $userId, 'Profile');
        }

        $targetBoardId = findBoardId($pdo, $userId, $collectionName);
        if ($targetBoardId === null) {
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

            $targetBoardId = createBoard($pdo, $userId, $collectionName);
        }

        $savePost = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, board_id) VALUES (?, ?, ?)');
        $savePost->execute([$userId, $postId, $profileBoardId]);
        if ($targetBoardId !== $profileBoardId) {
            $savePost->execute([$userId, $postId, $targetBoardId]);
        }

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

        if (mb_strlen($tag) > 20) {
            $tag = mb_substr($tag, 0, 20);
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
