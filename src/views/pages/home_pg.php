<?php
    require_once __DIR__ . '/../../config/database_conf.php';

    $postId = 0;
    $postImagePath = 'uploads/avatars/avatar.jpg';

    $stmt = $pdo->query('SELECT id, image_path FROM Posts ORDER BY created_at DESC, id DESC LIMIT 1');
    $latestPost = $stmt->fetch();

    if (is_array($latestPost)) {
        $postId = (int) ($latestPost['id'] ?? 0);
        $dbImagePath = (string) ($latestPost['image_path'] ?? '');

        if ($dbImagePath !== '') {
            $postImagePath = $dbImagePath;
        }
    }
?>

<section class="home-post-card-wrapper" aria-label="Превью модуля поста">
    <?php include '../src/views/components/post-card_cp.php'; ?>
</section>

<button class="create-post-open-button" data-component="create-post-open" aria-label="Создать пост">+</button>
