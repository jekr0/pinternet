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

if ($path === '/collections/list') {
    handleCollectionsList($pdo, $userId);
}

if ($path === '/collections/create') {
    handleCollectionsCreate($pdo, $userId);
}

if ($path === '/posts/bookmark/collections') {
    handleBookmarkCollections($pdo, $userId);
}

if ($path === '/posts/bookmark/collection-create') {
    handleBookmarkCollectionCreate($pdo, $userId);
}

if ($path === '/hashtags/suggest') {
    handleHashtagsSuggest($pdo);
}

if ($path === '/posts/create') {
    handleCreatePost($pdo, $userId);
}

if ($path === '/posts/update') {
    handleUpdatePost($pdo, $userId);
}

if ($path === '/posts/delete') {
    handleDeletePost($pdo, $userId);
}

if ($path === '/posts/like') {
    handleToggleLike($pdo, $userId);
}

if ($path === '/posts/bookmark') {
    handleBookmarkPost($pdo, $userId);
}

if ($path === '/posts/bookmark/collection-toggle') {
    handleBookmarkCollectionToggle($pdo, $userId);
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

if ($path === '/comments/like') {
    handleToggleCommentLike($pdo, $userId);
}

if ($path === '/comments/report') {
    handleCommentReport($pdo, $userId);
}

if ($path === '/comments/update') {
    handleUpdateComment($pdo, $userId);
}

if ($path === '/comments/delete') {
    handleDeleteComment($pdo, $userId);
}

if ($path === '/posts/list') {
    handlePostsList($pdo);
}

jsonResponse(['success' => false, 'error' => 'Неизвестный метод.'], 404);

function handleCollectionsList(PDO $pdo, int $userId): never
{
    $stmt = $pdo->prepare('SELECT name FROM Collections WHERE user_id = ? ORDER BY created_at ASC');
    $stmt->execute([$userId]);
    $collections = array_map(static fn(array $row) => (string) $row['name'], $stmt->fetchAll());

    if (empty($collections)) {
        $collections = ['Профиль'];
    }

    jsonResponse(['success' => true, 'collections' => $collections]);
}

function handleCollectionsCreate(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $collectionName = trim((string) ($_POST['collection'] ?? ''));
    $collectionName = normalizeCollectionName($collectionName);

    $validatedCollectionName = validateAndNormalizeCollectionName($collectionName);
    if ($validatedCollectionName === null) {
        jsonResponse(['success' => false, 'error' => 'Название коллекции: до 32 символов, только латиница, кириллица, цифры, пробел и "_"'], 422);
    }

    try {
        $collectionId = findCollectionId($pdo, $userId, $validatedCollectionName);
        if ($collectionId === null) {
            createCollection($pdo, $userId, $validatedCollectionName);
        }
    } catch (Throwable $e) {
        error_log('Collection create error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось создать коллекцию.'], 500);
    }

    $responseCollectionName = $validatedCollectionName === 'Profile' ? 'Профиль' : $validatedCollectionName;
    jsonResponse(['success' => true, 'collection' => $responseCollectionName]);
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

        $collectionStmt = $pdo->prepare('SELECT id FROM Collections WHERE user_id = ? AND name = ? LIMIT 1');
        $collectionStmt->execute([$userId, 'Profile']);
        $collectionId = $collectionStmt->fetchColumn();

        if ($collectionId === false) {
            $createCollection = $pdo->prepare('INSERT INTO Collections (user_id, name) VALUES (?, ?)');
            $createCollection->execute([$userId, 'Profile']);
            $collectionId = (int) $pdo->lastInsertId();
        }

        $saveStmt = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, collection_id) VALUES (?, ?, ?)');
        $saveStmt->execute([$userId, $postId, (int) $collectionId]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Bookmark error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить пост.'], 500);
    }

    jsonResponse(['success' => true, 'bookmarked' => true]);
}

function handleBookmarkCollections(PDO $pdo, int $userId): never
{
    $postId = (int) ($_GET['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    $collectionsStmt = $pdo->prepare('
        SELECT b.name, CASE WHEN sp.id IS NULL THEN 0 ELSE 1 END AS is_saved
        FROM Collections b
        LEFT JOIN Saved_Posts sp ON sp.collection_id = b.id AND sp.user_id = b.user_id AND sp.post_id = ?
        WHERE b.user_id = ?
        ORDER BY b.created_at ASC
    ');
    $collectionsStmt->execute([$postId, $userId]);
    $rows = $collectionsStmt->fetchAll();

    if (empty($rows)) {
        createCollection($pdo, $userId, 'Profile');
        $rows = [['name' => 'Profile', 'is_saved' => 0]];
    }

    $collections = array_map(static fn(array $row) => [
        'name' => ((string) $row['name']) === 'Profile' ? 'Профиль' : (string) $row['name'],
        'is_saved' => ((int) $row['is_saved']) === 1,
    ], $rows);

    jsonResponse(['success' => true, 'collections' => $collections]);
}

function handleBookmarkCollectionToggle(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $collectionName = normalizeCollectionName(trim((string) ($_POST['collection'] ?? '')));

    if ($postId <= 0 || $collectionName === '') {
        jsonResponse(['success' => false, 'error' => 'Некорректные параметры.'], 422);
    }

    $isOwner = isPostOwner($pdo, $postId, $userId);
    if ($isOwner === null) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }
    if ($collectionName === 'Profile' && $isOwner) {
        jsonResponse(['success' => false, 'error' => 'Коллекцию "Профиль" нельзя изменять вручную.'], 403);
    }

    $collectionId = findCollectionId($pdo, $userId, $collectionName);
    if ($collectionId === null && $collectionName === 'Profile') {
        $collectionId = createCollection($pdo, $userId, 'Profile');
    }
    if ($collectionId === null) {
        jsonResponse(['success' => false, 'error' => 'Коллекция не найдена.'], 404);
    }

    try {
        $pdo->beginTransaction();

        $savedStmt = $pdo->prepare('SELECT id FROM Saved_Posts WHERE user_id = ? AND post_id = ? AND collection_id = ? LIMIT 1');
        $savedStmt->execute([$userId, $postId, $collectionId]);
        $savedId = $savedStmt->fetchColumn();

        $isSaved = false;
        if ($savedId !== false) {
            $deleteStmt = $pdo->prepare('DELETE FROM Saved_Posts WHERE id = ?');
            $deleteStmt->execute([(int) $savedId]);
        } else {
            $insertStmt = $pdo->prepare('INSERT INTO Saved_Posts (user_id, post_id, collection_id) VALUES (?, ?, ?)');
            $insertStmt->execute([$userId, $postId, $collectionId]);
            $isSaved = true;
        }

        $hasAnyStmt = $pdo->prepare('
            SELECT 1
            FROM Saved_Posts sp
            INNER JOIN Collections b ON b.id = sp.collection_id AND b.user_id = sp.user_id
            WHERE sp.user_id = ? AND sp.post_id = ?
            LIMIT 1
        ');
        $hasAnyStmt->execute([$userId, $postId]);
        $hasAny = $hasAnyStmt->fetchColumn() !== false;

        $hasNonProfileStmt = $pdo->prepare('
            SELECT 1
            FROM Saved_Posts sp
            INNER JOIN Collections b ON b.id = sp.collection_id AND b.user_id = sp.user_id
            WHERE sp.user_id = ?
              AND sp.post_id = ?
              AND LOWER(b.name) <> LOWER(?)
            LIMIT 1
        ');
        $hasNonProfileStmt->execute([$userId, $postId, 'Profile']);
        $hasNonProfile = $hasNonProfileStmt->fetchColumn() !== false;

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Bookmark collection toggle error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось обновить коллекцию.'], 500);
    }

    jsonResponse(['success' => true, 'saved' => $isSaved, 'has_any' => $hasAny, 'has_non_profile' => $hasNonProfile]);
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

    $isOwner = isPostOwner($pdo, $postId, $userId);
    if ($isOwner === null) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    try {
        if ($isOwner) {
            $deleteStmt = $pdo->prepare('
                DELETE sp
                FROM Saved_Posts sp
                INNER JOIN Collections b ON b.id = sp.collection_id
                WHERE sp.user_id = ? AND sp.post_id = ? AND LOWER(b.name) <> LOWER(?)
            ');
            $deleteStmt->execute([$userId, $postId, 'Profile']);
        } else {
            $deleteStmt = $pdo->prepare('DELETE FROM Saved_Posts WHERE user_id = ? AND post_id = ?');
            $deleteStmt->execute([$userId, $postId]);
        }

        $hasAnyStmt = $pdo->prepare('
            SELECT 1
            FROM Saved_Posts sp
            INNER JOIN Collections b ON b.id = sp.collection_id AND b.user_id = sp.user_id
            WHERE sp.user_id = ? AND sp.post_id = ?
            LIMIT 1
        ');
        $hasAnyStmt->execute([$userId, $postId]);
        $hasAny = $hasAnyStmt->fetchColumn() !== false;

        $hasNonProfileStmt = $pdo->prepare('
            SELECT 1
            FROM Saved_Posts sp
            INNER JOIN Collections b ON b.id = sp.collection_id AND b.user_id = sp.user_id
            WHERE sp.user_id = ?
              AND sp.post_id = ?
              AND LOWER(b.name) <> LOWER(?)
            LIMIT 1
        ');
        $hasNonProfileStmt->execute([$userId, $postId, 'Profile']);
        $hasNonProfile = $hasNonProfileStmt->fetchColumn() !== false;
    } catch (Throwable $e) {
        error_log('Bookmark clear error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось удалить пост из коллекций.'], 500);
    }

    jsonResponse(['success' => true, 'has_any' => $hasAny, 'has_non_profile' => $hasNonProfile]);
}

function handleBookmarkCollectionCreate(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $collectionName = validateAndNormalizeCollectionName(trim((string) ($_POST['collection'] ?? '')));
    if ($postId <= 0 || $collectionName === null || $collectionName === '') {
        jsonResponse(['success' => false, 'error' => 'Некорректные параметры.'], 422);
    }

    try {
        $pdo->beginTransaction();

        $collectionId = findCollectionId($pdo, $userId, $collectionName);
        if ($collectionId === null) {
            $collectionId = createCollection($pdo, $userId, $collectionName);
        }

        $existsStmt = $pdo->prepare('SELECT id FROM Saved_Posts WHERE user_id = ? AND post_id = ? AND collection_id = ? LIMIT 1');
        $existsStmt->execute([$userId, $postId, $collectionId]);
        $savedId = $existsStmt->fetchColumn();

        if ($savedId === false) {
            $insertStmt = $pdo->prepare('INSERT INTO Saved_Posts (user_id, post_id, collection_id) VALUES (?, ?, ?)');
            $insertStmt->execute([$userId, $postId, $collectionId]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Bookmark collection create error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось создать коллекцию.'], 500);
    }

    jsonResponse(['success' => true, 'collection' => $collectionName === 'Profile' ? 'Профиль' : $collectionName]);
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
    $parentCommentId = (int) ($_POST['parent_comment_id'] ?? 0);

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

    $resolvedParentCommentId = null;
    $rootCommentId = null;
    if ($parentCommentId > 0) {
        $parentStmt = $pdo->prepare('
            SELECT id, parent_comment_id
            FROM Comments
            WHERE id = ?
              AND post_id = ?
              AND is_deleted = 0
            LIMIT 1
        ');
        $parentStmt->execute([$parentCommentId, $postId]);
        $parentRow = $parentStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($parentRow === null) {
            jsonResponse(['success' => false, 'error' => 'Комментарий для ответа не найден.'], 404);
        }
        $resolvedParentCommentId = (int) ($parentRow['id'] ?? 0);
        $rootCommentId = resolveRootCommentId($pdo, $resolvedParentCommentId, $postId);
    }

    try {
        $insertStmt = $pdo->prepare('INSERT INTO Comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)');
        $insertStmt->execute([$postId, $userId, $content, $resolvedParentCommentId]);
        $commentId = (int) $pdo->lastInsertId();
    } catch (Throwable $e) {
        error_log('Create comment error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить комментарий.'], 500);
    }

    $createdAtTsStmt = $pdo->prepare('SELECT UNIX_TIMESTAMP(created_at) FROM Comments WHERE id = ? LIMIT 1');
    $createdAtTsStmt->execute([$commentId]);
    $createdAtTs = (int) $createdAtTsStmt->fetchColumn();
    if ($createdAtTs <= 0) {
        $createdAtTs = time();
    }

    jsonResponse([
        'success' => true,
        'comment_id' => $commentId,
        'parent_comment_id' => $resolvedParentCommentId,
        'root_comment_id' => $rootCommentId ?? $commentId,
        'created_at_ts' => $createdAtTs,
    ]);
}

function resolveRootCommentId(PDO $pdo, int $commentId, int $postId): int
{
    $cursorId = $commentId;
    $safety = 0;
    while ($cursorId > 0 && $safety < 32) {
        $parentStmt = $pdo->prepare('
            SELECT parent_comment_id
            FROM Comments
            WHERE id = ?
              AND post_id = ?
              AND is_deleted = 0
            LIMIT 1
        ');
        $parentStmt->execute([$cursorId, $postId]);
        $parentId = (int) $parentStmt->fetchColumn();
        if ($parentId <= 0) {
            return $cursorId;
        }
        $cursorId = $parentId;
        $safety++;
    }

    return $commentId;
}

function handleToggleCommentLike(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $commentId = (int) ($_POST['comment_id'] ?? 0);
    if ($commentId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный comment_id.'], 422);
    }

    $commentStmt = $pdo->prepare('SELECT id FROM Comments WHERE id = ? AND is_deleted = 0 LIMIT 1');
    $commentStmt->execute([$commentId]);
    if ($commentStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Комментарий не найден.'], 404);
    }

    try {
        $pdo->beginTransaction();

        $selectLike = $pdo->prepare('SELECT id FROM Comment_Likes WHERE user_id = ? AND comment_id = ? LIMIT 1');
        $selectLike->execute([$userId, $commentId]);
        $likeId = $selectLike->fetchColumn();

        $liked = true;
        if ($likeId !== false) {
            $deleteLike = $pdo->prepare('DELETE FROM Comment_Likes WHERE id = ?');
            $deleteLike->execute([(int) $likeId]);
            $liked = false;
        } else {
            $insertLike = $pdo->prepare('INSERT INTO Comment_Likes (user_id, comment_id) VALUES (?, ?)');
            $insertLike->execute([$userId, $commentId]);
        }

        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM Comment_Likes WHERE comment_id = ?');
        $countStmt->execute([$commentId]);
        $likesCount = (int) $countStmt->fetchColumn();

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Comment like toggle error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось обработать лайк комментария.'], 500);
    }

    jsonResponse(['success' => true, 'liked' => $liked, 'likes_count' => $likesCount]);
}

function handleCommentReport(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $commentId = (int) ($_POST['comment_id'] ?? 0);
    if ($commentId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный comment_id.'], 422);
    }

    $commentStmt = $pdo->prepare('SELECT id FROM Comments WHERE id = ? AND is_deleted = 0 LIMIT 1');
    $commentStmt->execute([$commentId]);
    if ($commentStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Комментарий не найден.'], 404);
    }

    try {
        $insertStmt = $pdo->prepare('INSERT IGNORE INTO Comment_Reports (user_id, comment_id) VALUES (?, ?)');
        $insertStmt->execute([$userId, $commentId]);
        $alreadyReported = $insertStmt->rowCount() === 0;
    } catch (Throwable $e) {
        error_log('Comment report error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось отправить жалобу.'], 500);
    }

    jsonResponse(['success' => true, 'already_reported' => $alreadyReported]);
}

function handleUpdateComment(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $commentId = (int) ($_POST['comment_id'] ?? 0);
    $content = trim((string) ($_POST['content'] ?? ''));

    if ($commentId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный comment_id.'], 422);
    }
    if ($content === '') {
        jsonResponse(['success' => false, 'error' => 'Комментарий не может быть пустым.'], 422);
    }
    if (mb_strlen($content) > 256) {
        jsonResponse(['success' => false, 'error' => 'Комментарий не должен превышать 256 символов.'], 422);
    }

    $commentStmt = $pdo->prepare('SELECT id FROM Comments WHERE id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1');
    $commentStmt->execute([$commentId, $userId]);
    if ($commentStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Комментарий не найден или недоступен для редактирования.'], 404);
    }

    try {
        $updateStmt = $pdo->prepare('UPDATE Comments SET content = ? WHERE id = ? AND user_id = ? LIMIT 1');
        $updateStmt->execute([$content, $commentId, $userId]);
    } catch (Throwable $e) {
        error_log('Comment update error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось обновить комментарий.'], 500);
    }

    jsonResponse(['success' => true, 'comment_id' => $commentId, 'content' => $content]);
}

function handleDeleteComment(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $commentId = (int) ($_POST['comment_id'] ?? 0);
    if ($commentId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный comment_id.'], 422);
    }

    $ownerStmt = $pdo->prepare('SELECT id FROM Comments WHERE id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1');
    $ownerStmt->execute([$commentId, $userId]);
    if ($ownerStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Комментарий не найден или недоступен для удаления.'], 404);
    }

    try {
        $pdo->beginTransaction();

        $idsToDelete = [$commentId];
        $cursor = 0;
        while ($cursor < count($idsToDelete)) {
            $parentId = $idsToDelete[$cursor++];
            $childrenStmt = $pdo->prepare('SELECT id FROM Comments WHERE parent_comment_id = ? AND is_deleted = 0');
            $childrenStmt->execute([$parentId]);
            $childIds = array_map(static fn(array $row): int => (int) $row['id'], $childrenStmt->fetchAll(PDO::FETCH_ASSOC));
            foreach ($childIds as $childId) {
                if (!in_array($childId, $idsToDelete, true)) {
                    $idsToDelete[] = $childId;
                }
            }
        }

        $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));
        $deleteLikes = $pdo->prepare("DELETE FROM Comment_Likes WHERE comment_id IN ($placeholders)");
        $deleteLikes->execute($idsToDelete);
        $deleteReports = $pdo->prepare("DELETE FROM Comment_Reports WHERE comment_id IN ($placeholders)");
        $deleteReports->execute($idsToDelete);
        for ($i = count($idsToDelete) - 1; $i >= 0; $i--) {
            $deleteComment = $pdo->prepare('DELETE FROM Comments WHERE id = ?');
            $deleteComment->execute([$idsToDelete[$i]]);
        }

        $pdo->commit();
        jsonResponse(['success' => true, 'deleted_ids' => $idsToDelete]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Comment delete error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось удалить комментарий.'], 500);
    }
}


function handleUpdatePost(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    $description = trim((string) ($_POST['description'] ?? ''));
    $collectionInput = trim((string) ($_POST['collection'] ?? ''));
    $tagsInput = trim((string) ($_POST['tags'] ?? ''));

    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    if (mb_strlen($description) > 512) {
        jsonResponse(['success' => false, 'error' => 'Описание не должно быть длиннее 512 символов.'], 422);
    }

    $postStmt = $pdo->prepare('SELECT id FROM Posts WHERE id = ? AND user_id = ? LIMIT 1');
    $postStmt->execute([$postId, $userId]);
    if ($postStmt->fetchColumn() === false) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    $collectionNames = parseCollectionNames($collectionInput);
    if ($collectionNames === null) {
        jsonResponse(['success' => false, 'error' => 'Название коллекции: до 32 символов, только латиница, кириллица, цифры, пробел и "_"'], 422);
    }

    $hashtags = parseHashtags($tagsInput);

    try {
        $pdo->beginTransaction();

        $updatePost = $pdo->prepare('UPDATE Posts SET description = ?, was_redacted = 1 WHERE id = ? AND user_id = ?');
        $updatePost->execute([$description !== '' ? $description : null, $postId, $userId]);

        $profileCollectionId = findCollectionId($pdo, $userId, 'Profile');
        if ($profileCollectionId === null) {
            $profileCollectionId = createCollection($pdo, $userId, 'Profile');
        }

        $deleteOwnSaves = $pdo->prepare('DELETE FROM Saved_Posts WHERE user_id = ? AND post_id = ?');
        $deleteOwnSaves->execute([$userId, $postId]);

        $savePost = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, collection_id) VALUES (?, ?, ?)');
        $savePost->execute([$userId, $postId, $profileCollectionId]);

        foreach ($collectionNames as $collectionName) {
            if ($collectionName === 'Profile') {
                continue;
            }

            $targetCollectionId = findCollectionId($pdo, $userId, $collectionName);
            if ($targetCollectionId === null) {
                $targetCollectionId = createCollection($pdo, $userId, $collectionName);
            }

            if ($targetCollectionId !== $profileCollectionId) {
                $savePost->execute([$userId, $postId, $targetCollectionId]);
            }
        }

        $deleteTags = $pdo->prepare('DELETE FROM Post_Hashtags WHERE post_id = ?');
        $deleteTags->execute([$postId]);

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
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Post update error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить изменения.'], 500);
    }

    jsonResponse([
        'success' => true,
        'post_id' => $postId,
        'description' => $description,
        'tags' => $hashtags,
        'collections' => array_values(array_filter($collectionNames, static fn(string $name): bool => $name !== 'Profile')),
    ]);
}

function handleDeletePost(PDO $pdo, int $userId): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод.'], 405);
    }

    $postId = (int) ($_POST['post_id'] ?? 0);
    if ($postId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Некорректный post_id.'], 422);
    }

    $postStmt = $pdo->prepare('SELECT image_path FROM Posts WHERE id = ? AND user_id = ? LIMIT 1');
    $postStmt->execute([$postId, $userId]);
    $imagePath = $postStmt->fetchColumn();
    if ($imagePath === false) {
        jsonResponse(['success' => false, 'error' => 'Пост не найден.'], 404);
    }

    try {
        $pdo->beginTransaction();

        $deleteCommentReports = $pdo->prepare('DELETE cr FROM Comment_Reports cr INNER JOIN Comments c ON c.id = cr.comment_id WHERE c.post_id = ?');
        $deleteCommentReports->execute([$postId]);

        $deleteCommentLikes = $pdo->prepare('DELETE cl FROM Comment_Likes cl INNER JOIN Comments c ON c.id = cl.comment_id WHERE c.post_id = ?');
        $deleteCommentLikes->execute([$postId]);

        $unlinkCommentParents = $pdo->prepare('UPDATE Comments SET parent_comment_id = NULL WHERE post_id = ?');
        $unlinkCommentParents->execute([$postId]);

        $deleteComments = $pdo->prepare('DELETE FROM Comments WHERE post_id = ?');
        $deleteComments->execute([$postId]);

        $pdo->prepare('DELETE FROM Post_Reports WHERE post_id = ?')->execute([$postId]);
        $pdo->prepare('DELETE FROM Post_Like_Exp_Awards WHERE post_id = ?')->execute([$postId]);
        $pdo->prepare('DELETE FROM Post_Likes WHERE post_id = ?')->execute([$postId]);
        $pdo->prepare('DELETE FROM Saved_Posts WHERE post_id = ?')->execute([$postId]);
        $pdo->prepare('DELETE FROM Post_Hashtags WHERE post_id = ?')->execute([$postId]);

        $deletePost = $pdo->prepare('DELETE FROM Posts WHERE id = ? AND user_id = ?');
        $deletePost->execute([$postId, $userId]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Post delete error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось удалить пост.'], 500);
    }

    deletePostImageFile((string) $imagePath);

    jsonResponse(['success' => true, 'post_id' => $postId]);
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

        $profileCollectionId = findCollectionId($pdo, $userId, 'Profile');
        if ($profileCollectionId === null) {
            $profileCollectionId = createCollection($pdo, $userId, 'Profile');
        }

        $savePost = $pdo->prepare('INSERT IGNORE INTO Saved_Posts (user_id, post_id, collection_id) VALUES (?, ?, ?)');
        $savePost->execute([$userId, $postId, $profileCollectionId]);

        foreach ($collectionNames as $collectionName) {
            if ($collectionName === 'Profile') {
                continue;
            }

            $targetCollectionId = findCollectionId($pdo, $userId, $collectionName);
            if ($targetCollectionId === null) {
                $targetCollectionId = createCollection($pdo, $userId, $collectionName);
            }

            if ($targetCollectionId !== $profileCollectionId) {
                $savePost->execute([$userId, $postId, $targetCollectionId]);
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


function isPostOwner(PDO $pdo, int $postId, int $userId): ?bool
{
    $postOwnerStmt = $pdo->prepare('SELECT user_id FROM Posts WHERE id = ? LIMIT 1');
    $postOwnerStmt->execute([$postId]);
    $postOwnerId = $postOwnerStmt->fetchColumn();

    if ($postOwnerId === false) {
        return null;
    }

    return (int) $postOwnerId === $userId;
}

function findCollectionId(PDO $pdo, int $userId, string $collectionName): ?int
{
    $select = $pdo->prepare('SELECT id FROM Collections WHERE user_id = ? AND LOWER(name) = LOWER(?) LIMIT 1');
    $select->execute([$userId, $collectionName]);
    $existingId = $select->fetchColumn();

    if ($existingId !== false) {
        return (int) $existingId;
    }

    return null;
}

function createCollection(PDO $pdo, int $userId, string $collectionName): int
{
    $insert = $pdo->prepare('INSERT INTO Collections (user_id, name) VALUES (?, ?)');
    $insert->execute([$userId, $collectionName]);

    return (int) $pdo->lastInsertId();
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


function deletePostImageFile(string $publicPath): void
{
    $relativePath = ltrim(parse_url($publicPath, PHP_URL_PATH) ?: $publicPath, '/');
    if ($relativePath === '' || str_contains($relativePath, '..')) {
        return;
    }

    $fullPath = dirname(__DIR__, 2) . '/htdocs/' . $relativePath;
    if (is_file($fullPath)) {
        @unlink($fullPath);
    }
}

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
