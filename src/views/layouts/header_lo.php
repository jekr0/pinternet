<!-- src/views/layouts/header.php -->
<div class="header-background" aria-hidden="true"></div>
<?php include '../src/views/layouts/blur_lo.php'; ?>
<header class="header">
    <a href="/" class="header__logo">grinderest</a>
    <label class="header__search-field" aria-label="Поиск">
        <input class="header__search-input ui-input" type="text" name="header-search" autocomplete="off" placeholder=" ">
        <span class="header__search-placeholder" aria-hidden="true">
            <span class="header__search-placeholder-icon"></span>
            <span class="header__search-placeholder-text">Поиск</span>
        </span>
        <?php include '../src/views/components/dropdown-search_cp.php'; ?>
    </label>

    <!-- Контейнер профиля (вынесен в отдельный компонент) -->
    <?php include '../src/views/components/profile-container_cp.php'; ?>

    <button class="header__dropdown-button" data-component="dropdown_button" data-svg-src="assets/images/icons/vertical-dots.svg">
    </button>

    <?php include '../src/views/components/dropdown-profile_cp.php'; ?>
</header>

<?php include '../src/views/components/post-modal_cp.php'; ?>
