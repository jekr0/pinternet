<!-- src/views/layouts/header.php -->
<header class="header">
    <a href="/" class="header__logo">grinderest</a>

    <!-- Контейнер профиля (вынесен в отдельный компонент) -->
    <?php include '../src/views/components/profile-container_cp.php'; ?>

    <button class="header__dropdown-button" data-component="dropdown_button" data-svg-src="assets/images/icons/vertical-dots.svg">
    </button>

    <?php include '../src/views/components/dropdown-menu_cp.php'; ?>
</header>