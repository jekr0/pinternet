<?php

require_once __DIR__ . '/../config/database_conf.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'error' => 'Для этого действия требуется авторизация'], 401);
}

$userId = (int) $_SESSION['user_id'];
$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$path = rtrim($path, '/');

if ($path === '/search/history') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        handleSearchHistoryGet($pdo, $userId);
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        handleSearchHistorySave($pdo, $userId);
    }
    jsonResponse(['success' => false, 'error' => 'Неподдерживаемый метод'], 405);
}

if ($path === '/search/suggest') {
    handleSearchSuggest($pdo, $userId);
}

jsonResponse(['success' => false, 'error' => 'Неизвестный метод'], 404);

function handleSearchHistoryGet(PDO $pdo, int $userId): never
{
    $limit = (int) ($_GET['limit'] ?? 10);
    $limit = max(1, min(10, $limit));

    $stmt = $pdo->prepare('
        SELECT query_text
        FROM (
            SELECT query_text, searched_at
            FROM User_Search
            WHERE user_id = ?
            UNION ALL
            SELECT query_text, searched_at
            FROM Search
            WHERE user_id = ?
        ) recent_queries
        ORDER BY searched_at DESC
        LIMIT ?
    ');
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $userId, PDO::PARAM_INT);
    $stmt->bindValue(3, $limit * 2, PDO::PARAM_INT);
    $stmt->execute();

    $queries = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $queryText = trim((string) ($row['query_text'] ?? ''));
        $queryKey = mb_strtolower($queryText);
        if ($queryText === '' || isset($queries[$queryKey])) {
            continue;
        }
        $queries[$queryKey] = $queryText;
        if (count($queries) >= $limit) {
            break;
        }
    }
    $queries = array_values($queries);

    jsonResponse(['success' => true, 'queries' => $queries]);
}

function handleSearchHistorySave(PDO $pdo, int $userId): never
{
    $query = normalizeSearchQuery((string) ($_POST['query'] ?? ''));
    if ($query === '') {
        jsonResponse(['success' => false, 'error' => 'Пустой поисковый запрос'], 422);
    }

    try {
        $pdo->beginTransaction();

        $existingStmt = $pdo->prepare('
            SELECT slot_index
            FROM User_Search
            WHERE user_id = ? AND query_text = ?
            LIMIT 1
        ');
        $existingStmt->execute([$userId, $query]);
        $existingSlot = $existingStmt->fetchColumn();

        if ($existingSlot !== false) {
            $touchStmt = $pdo->prepare('
                UPDATE User_Search
                SET searched_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND slot_index = ?
            ');
            $touchStmt->execute([$userId, (int) $existingSlot]);
        } else {
            $countStmt = $pdo->prepare('SELECT COUNT(*) FROM User_Search WHERE user_id = ?');
            $countStmt->execute([$userId]);
            $currentCount = (int) $countStmt->fetchColumn();

            if ($currentCount < 10) {
                $slotStmt = $pdo->prepare('
                    SELECT slot_index
                    FROM User_Search
                    WHERE user_id = ?
                    ORDER BY slot_index ASC
                ');
                $slotStmt->execute([$userId]);
                $occupied = array_map(static fn(array $row): int => (int) $row['slot_index'], $slotStmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
                $slotIndex = 0;
                while (in_array($slotIndex, $occupied, true) && $slotIndex < 10) {
                    $slotIndex++;
                }
            } else {
                $oldestStmt = $pdo->prepare('
                    SELECT slot_index
                    FROM User_Search
                    WHERE user_id = ?
                    ORDER BY searched_at ASC
                    LIMIT 1
                ');
                $oldestStmt->execute([$userId]);
                $slotIndex = (int) $oldestStmt->fetchColumn();
            }

            $upsertStmt = $pdo->prepare('
                INSERT INTO User_Search (user_id, slot_index, query_text, searched_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    query_text = VALUES(query_text),
                    searched_at = VALUES(searched_at)
            ');
            $upsertStmt->execute([$userId, $slotIndex, $query]);
        }

        $insertGlobalStmt = $pdo->prepare('
            INSERT INTO Search (user_id, query_text)
            VALUES (?, ?)
        ');
        $insertGlobalStmt->execute([$userId, $query]);

        $trimGlobalStmt = $pdo->prepare('
            DELETE FROM Search
            WHERE id NOT IN (
                SELECT id
                FROM (
                    SELECT id
                    FROM Search
                    ORDER BY id DESC
                    LIMIT 100
                ) AS latest
            )
        ');
        $trimGlobalStmt->execute();

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Search history save error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'error' => 'Не удалось сохранить поисковый запрос'], 500);
    }

    jsonResponse(['success' => true]);
}

function handleSearchSuggest(PDO $pdo, int $userId): never
{
    $query = normalizeSearchQuery((string) ($_GET['q'] ?? ''));
    if ($query === '') {
        jsonResponse(['success' => true, 'posts' => [], 'tags' => []]);
    }

    $like = '%' . $query . '%';

    $postStmt = $pdo->prepare('
        SELECT p.id, p.description,
               (CASE WHEN p.description LIKE ? THEN 3 ELSE 0 END) +
               (CASE WHEN p.description LIKE ? THEN 2 ELSE 0 END) AS score
        FROM Posts p
        WHERE p.description LIKE ?
        ORDER BY score DESC, p.created_at DESC
        LIMIT 20
    ');
    $postStmt->execute([$query . '%', $like, $like]);
    $posts = array_map(static fn(array $row) => [
        'id' => (int) ($row['id'] ?? 0),
        'description' => (string) ($row['description'] ?? ''),
    ], $postStmt->fetchAll(PDO::FETCH_ASSOC) ?: []);

    $tagStmt = $pdo->prepare('
        SELECT h.name, COUNT(*) AS hits
        FROM Hashtags h
        INNER JOIN Post_Hashtags ph ON ph.hashtag_id = h.id
        WHERE h.name LIKE ?
        GROUP BY h.id, h.name
        ORDER BY hits DESC, h.name ASC
        LIMIT 20
    ');
    $tagStmt->execute([$query . '%']);
    $tags = array_map(static fn(array $row): string => (string) ($row['name'] ?? ''), $tagStmt->fetchAll(PDO::FETCH_ASSOC) ?: []);

    jsonResponse(['success' => true, 'posts' => $posts, 'tags' => $tags]);
}

function normalizeSearchQuery(string $query): string
{
    $normalized = preg_replace('/\s+/u', ' ', trim($query)) ?: '';
    if ($normalized === '') {
        return '';
    }

    if (mb_strlen($normalized) > 128) {
        $normalized = mb_substr($normalized, 0, 128);
    }

    return $normalized;
}

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
