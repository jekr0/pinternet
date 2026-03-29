<?php
    $demoPosts = [
        [
            'image' => 'uploads/avatars/avatar.jpg',
            'alt' => 'Ягодный десерт на деревянном столе',
            'title' => 'Идея оформления завтрака',
            'description' => 'Минималистичная сервировка с акцентом на цвет и текстуру.',
        ],
        [
            'image' => 'uploads/avatars/avatar.jpg',
            'alt' => 'Набор сочных ягод в миске',
            'title' => 'Референс для food-фото',
            'description' => 'Работа со светом и мягкими тенями для уютного настроения.',
        ],
        [
            'image' => 'uploads/avatars/avatar.jpg',
            'alt' => 'Декор стола в пастельных тонах',
            'title' => 'Визуал для Pinterest-ленты',
            'description' => 'Карточка с адаптивной высотой: текст увеличивает модуль без ломки сетки.',
        ],
    ];
?>

<section class="posts-feed" aria-label="Лента постов">
    <?php foreach ($demoPosts as $post): ?>
        <article class="post-card">
            <img class="post-card__image" src="<?php echo htmlspecialchars($post['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($post['alt'], ENT_QUOTES, 'UTF-8'); ?>">

            <div class="post-card__content">
                <h2 class="post-card__title"><?php echo htmlspecialchars($post['title'], ENT_QUOTES, 'UTF-8'); ?></h2>
                <p class="post-card__description"><?php echo htmlspecialchars($post['description'], ENT_QUOTES, 'UTF-8'); ?></p>
            </div>
        </article>
    <?php endforeach; ?>
</section>

<button class="create-post-open-button" data-component="create-post-open" aria-label="Создать пост">+</button>
