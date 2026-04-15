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

if ($path === '/boards/create') {
    handleBoardsCreate($pdo, $userId);
}

if ($path === '/posts/bookmark/boards') {
    handleBookmarkBoards($pdo, $userId);
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

if ($path === '/posts/bookmark/board-toggle') {
    handleBookmarkBoardToggle($pdo, $userId);
}

if ($path === '/posts/bookmark/clear') {
    handleBookmarkClear($pdo, $userId);
}

if ($path === '/posts/report') {
    handlePostReport($pdo, $userId);
}

if ($path === '/posts/comment') {
    handleCreateComment($pdo, $userId);
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

function handleBoardsCreate(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $boardName = trim((string) ($_POST['board'] ?? ''));
    $boardName = normalizeCollectionName($boardName);

    $validatedBoardName = validateAndNormalizeCollectionName($boardName);
    if ($validatedBoardName === null) {
        jsonResponse(['success' => false, 'error' => 'Название коллекции: до 32 символов, только латиница, кириллица, цифры, пробел и "_"'], 422);
    }

    try {
        $boardId = findBoardId($pdo, $userId, $validatedBoardName);
        if ($boardId === null) {
            createBoard($pdo, $userId, $validatedBoardName);
        }
    } catch (Throwable $e) {
        error_log('Board create error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось создать коллекцию.'], 500);
    }

    $responseBoardName = $validatedBoardName === 'Profile' ? 'Профиль' : $validatedBoardName;
    jsonResponse(['success' => true, 'board' => $responseBoardName]);
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

function handleBookmarkBoardToggle(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $boardName = trim((string) ($_POST['board'] ?? ''));

    if ($postId <= 0 || $boardName === '') {
        jsonResponse(['success' => false, 'error' => 'Некорректные параметры.'], 422);
    }

    $normalizedBoardName = normalizeCollectionName($boardName);
    if ($normalizedBoardName === 'Profile') {
        jsonResponse(['success' => false, 'error' => 'Коллекцию "Профиль" нельзя изменять вручную.'], 403);
    }
    $boardId = findBoardId($pdo, $userId, $normalizedBoardName);
    if ($boardId === null && $normalizedBoardName === 'Profile') {
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

        $hasAnyStmt = $pdo->prepare('
            SELECT 1
            FROM Saved_Posts sp
            INNER JOIN Boards b ON b.id = sp.board_id AND b.user_id = sp.user_id
            WHERE sp.user_id = ? AND sp.post_id = ?
            LIMIT 1
        ');
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
        $deleteStmt = $pdo->prepare('
            DELETE sp
            FROM Saved_Posts sp
            INNER JOIN Boards b ON b.id = sp.board_id
            WHERE sp.user_id = ? AND sp.post_id = ? AND LOWER(b.name) <> LOWER(?)
        ');
        $deleteStmt->execute([$userId, $postId, 'Profile']);

        $hasAnyStmt = $pdo->prepare('
            SELECT 1
            FROM Saved_Posts sp
            INNER JOIN Boards b ON b.id = sp.board_id AND b.user_id = sp.user_id
            WHERE sp.user_id = ? AND sp.post_id = ?
            LIMIT 1
        ');
        $hasAnyStmt->execute([$userId, $postId]);
        $hasAny = $hasAnyStmt->fetchColumn() !== false;
    } catch (Throwable $e) {
        error_log('Bookmark clear error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось удалить пост из коллекций.'], 500);
    }

    jsonResponse(['success' => true, 'has_any' => $hasAny]);
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

function handlePostReport(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    $postStmt = $pdo->prepare('SELECT id FROM Posts WHERE id = ? LIMIT 1');
    $postStmt->execute([$postId]);
    if ($postStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    try {
        $insertStmt = $pdo->prepare('INSERT IGNORE INTO Post_Reports (user_id, post_id) VALUES (?, ?)');
        $insertStmt->execute([$userId, $postId]);
        $alreadyReported = $insertStmt->rowCount() === 0;
    } catch (Throwable $e) {
        error_log('Report post error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось отправить жалобу.'], 500);
    }

    jsonResponse(['success' => true, 'already_reported' => $alreadyReported]);
}

function handleCreateComment(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $content = trim((string) ($_POST['content'] ?? ''));

    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    if ($content === '') {
        jsonResponse(['success' => false, 'error' => 'Комментарий не может быть пустым.'], 422);
    }

    if (mb_strlen($content) > 256) {
        jsonResponse(['success' => false, 'error' => 'Комментарий не должен превышать 256 символов.'], 422);
    }

    $postStmt = $pdo->prepare('SELECT id FROM Posts WHERE id = ? LIMIT 1');
    $postStmt->execute([$postId]);
    if ($postStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    try {
        ensurePostCommentsTable($pdo);
        $insertStmt = $pdo->prepare('INSERT INTO Post_Comments (post_id, user_id, content) VALUES (?, ?, ?)');
        $insertStmt->execute([$postId, $userId, $content]);
    } catch (Throwable $e) {
        error_log('Create comment error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить комментарий.'], 500);
    }

    jsonResponse(['success' => true]);
}

function handleCreatePost(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $description = trim((string) ($_POST['description'] ?? ''));
    $collectionInput = trim((string) ($_POST['collection'] ?? ''));
    $tagsInput = trim((string) ($_POST['tags'] ?? ''));

    if (mb_strlen($description) > 512) {
        jsonResponse(['success' => false, 'error' => 'Описание не должно превышать 512 символов.'], 422);
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

    $collectionNames = parseCollectionNames($collectionInput);
    if ($collectionNames === null) {
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

        $savePost = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, board_id) VALUES (?, ?, ?)');
        $savePost->execute([$userId, $postId, $profileBoardId]);

        foreach ($collectionNames as $collectionName) {
            if ($collectionName === 'Profile') {
                continue;
            }

            $targetBoardId = findBoardId($pdo, $userId, $collectionName);
            if ($targetBoardId === null) {
                $targetBoardId = createBoard($pdo, $userId, $collectionName);
            }

            if ($targetBoardId !== $profileBoardId) {
                $savePost->execute([$userId, $postId, $targetBoardId]);
            }
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
    $select = $pdo->prepare('SELECT id FROM Boards WHERE user_id = ? AND LOWER(name) = LOWER(?) LIMIT 1');
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

function ensurePostCommentsTable(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS Post_Comments (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            post_id INT UNSIGNED NOT NULL,
            user_id INT UNSIGNED NOT NULL,
            content VARCHAR(256) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_post_comments_post_id (post_id),
            INDEX idx_post_comments_user_id (user_id),
            CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
            CONSTRAINT fk_post_comments_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ');
}

function normalizeCollectionName(string $value): string
{
    $normalized = trim($value);
    if ($normalized === '' || mb_strtolower($normalized) === 'профиль' || mb_strtolower($normalized) === 'profile') {
        return 'Profile';
    }

    return $normalized;
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

function parseCollectionNames(string $collectionsInput): ?array
{
    $rawParts = preg_split('/\s*,\s*/u', $collectionsInput);
    if (!is_array($rawParts)) {
        return null;
    }

    $normalized = ['Profile'];
    foreach ($rawParts as $rawPart) {
        $name = trim($rawPart);
        if ($name === '') {
            continue;
        }

        $validatedName = validateAndNormalizeCollectionName($name);
        if ($validatedName === null) {
            return null;
        }

        if (!in_array($validatedName, $normalized, true)) {
            $normalized[] = $validatedName;
        }
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
