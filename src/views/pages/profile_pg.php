<?php include '../src/views/components/profile-full_cp.php'; ?>
<?php
require_once __DIR__ . '/../../config/database_conf.php';

$profileCollections = [];
$profileFeedPosts = [];
$selectedProfileCollection = trim((string) ($_GET['collection'] ?? ''));
$selectedProfilePublications = array_key_exists('publications', $_GET);
$profileFeedUsername = ltrim((string) ($profileFullUsername ?? ''), '@');
$profileFeedUserId = (int) ($profileFullUserId ?? 0);
$profileFeedViewerId = (int) ($_SESSION['user_id'] ?? 0);

if ($profileFeedUserId > 0) {
    $collectionsStmt = $pdo->prepare('
        SELECT c.name, COUNT(DISTINCT cp.post_id) AS posts_count
        FROM Collections c
        INNER JOIN Collection_Posts cp ON cp.collection_id = c.id AND cp.user_id = c.user_id
        WHERE c.user_id = ?
        GROUP BY c.id, c.name
        HAVING posts_count > 0
        ORDER BY c.created_at ASC, c.id ASC
    ');
    $collectionsStmt->execute([$profileFeedUserId]);
    $profileCollections = $collectionsStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $postsStmt = $pdo->prepare('
        SELECT p.id,
               p.image_path,
               p.created_at,
               UNIX_TIMESTAMP(p.created_at) AS created_at_ts,
               u.username,
               (pl.id IS NOT NULL) AS is_liked,
               EXISTS(
                   SELECT 1
                   FROM Collection_Posts viewer_cp
                   INNER JOIN Collections viewer_c ON viewer_c.id = viewer_cp.collection_id AND viewer_c.user_id = viewer_cp.user_id
                   WHERE viewer_cp.post_id = p.id AND viewer_cp.user_id = ?
               ) AS has_any_bookmark,
               EXISTS(
                   SELECT 1
                   FROM Collection_Posts viewer_cp
                   INNER JOIN Collections viewer_c ON viewer_c.id = viewer_cp.collection_id AND viewer_c.user_id = viewer_cp.user_id
                   WHERE viewer_cp.post_id = p.id
                     AND viewer_cp.user_id = ?
                     AND LOWER(viewer_c.name) <> LOWER(?)
               ) AS has_non_profile_bookmark,
               (p.user_id = ?) AS is_owner,
               GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR "\n") AS collection_names
        FROM Collection_Posts cp
        INNER JOIN Collections c ON c.id = cp.collection_id AND c.user_id = cp.user_id
        INNER JOIN Posts p ON p.id = cp.post_id
        INNER JOIN Users u ON u.id = p.user_id AND u.is_deleted = 0
        LEFT JOIN Post_Likes pl ON pl.post_id = p.id AND pl.user_id = ?
        WHERE cp.user_id = ?
        GROUP BY p.id, p.image_path, p.created_at, created_at_ts, u.username, is_liked, has_any_bookmark, has_non_profile_bookmark, is_owner
        ORDER BY MAX(cp.id) DESC, p.created_at DESC, p.id DESC
    ');
    $postsStmt->execute([$profileFeedViewerId, $profileFeedViewerId, 'Profile', $profileFeedViewerId, $profileFeedViewerId, $profileFeedUserId]);
    $profileFeedPosts = $postsStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

$normalizeProfilePublicPath = static function (string $path): string {
    if ($path === '') return '/uploads/avatars/avatar.jpg';
    if (preg_match('#^(https?:)?//#', $path) === 1) return $path;
    return '/' . ltrim($path, '/');
};

$isProfileCollectionName = static function (string $collectionName): bool {
    $normalized = mb_strtolower(trim($collectionName));
    return $normalized === 'profile' || $normalized === 'профиль';
};
?>

<section
    class="home-post-masonry profile-post-masonry"
    data-component="masonry-feed"
    data-top-offset="0"
    data-profile-feed="1"
    aria-label="Посты из коллекций профиля"
>
    <?php foreach ($profileFeedPosts as $row): ?>
        <?php
            $postId = (int) ($row['id'] ?? 0);
            $postImagePath = $normalizeProfilePublicPath((string) ($row['image_path'] ?? ''));
            $authorUsername = (string) ($row['username'] ?? 'unknown');
            $isLiked = !empty($row['is_liked']);
            $isOwner = !empty($row['is_owner']);
            $hasAnyBookmark = !empty($row['has_any_bookmark']);
            $hasNonProfileBookmark = !empty($row['has_non_profile_bookmark']);
            $isBookmarked = $isOwner ? $hasNonProfileBookmark : $hasAnyBookmark;
            $isPostFullActive = false;
            $postCollectionsRaw = array_filter(array_map('trim', explode("\n", (string) ($row['collection_names'] ?? ''))));
            $postCollectionsAttr = htmlspecialchars(json_encode(array_values($postCollectionsRaw), JSON_UNESCAPED_UNICODE), ENT_QUOTES, 'UTF-8');
        ?>
        <?php include '../src/views/components/post-card_cp.php'; ?>
    <?php endforeach; ?>
</section>
