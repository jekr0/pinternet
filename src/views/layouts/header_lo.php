<!-- src/views/layouts/header.php -->
<header class="header">
    <a href="/" class="header__logo">grinderest</a>
    <img src="assets/images/icons/strawberry2.svg" class="header__strawberry-icon">

    <!-- Контейнер профиля (вынесен в отдельный компонент) -->
    <?php include '../src/views/components/profile-container_cp.php'; ?>

    <button class="header__dropdown-button" data-component="dropdown_button">
        <svg class="header__dropdown-icon">
            <img src="assets/images/icons/vertical-dots.svg" class="header__dropdown-icon">
        </svg>
    </button>

    <?php include '../src/views/components/dropdown-menu_cp.php'; ?>
</header>