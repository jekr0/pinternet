<!-- src/views/layouts/header.php -->
<div class="header-background" aria-hidden="true"></div>
<header class="header">
    <a href="/" class="header__logo">grinderest</a>

    <!-- Контейнер профиля (вынесен в отдельный компонент) -->
    <?php include '../src/views/components/profile-container_cp.php'; ?>

    <button class="header__dropdown-button" data-component="dropdown_button" data-svg-src="assets/images/icons/vertical-dots.svg">
    </button>

    <?php include '../src/views/components/dropdown-profile_cp.php'; ?>
</header>

<?php include '../src/views/components/create-post-modal_cp.php'; ?>
