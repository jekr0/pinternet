<?php
if (session_status() === PHP_SESSION_NONE) session_start();
$footerMenuViewerId = (int) ($_SESSION['user_id'] ?? 0);
$footerMenuIsAuthenticated = $footerMenuViewerId > 0;
$footerMenuUsername = (string) ($_SESSION['username'] ?? '');
?>
<footer class="footer" aria-label="Быстрые действия">
    <div class="footer-menu" data-component="footer-menu" data-state="closed" data-authenticated="<?= $footerMenuIsAuthenticated ? '1' : '0' ?>" data-viewer-id="<?= $footerMenuViewerId ?>" data-viewer-username="<?= htmlspecialchars($footerMenuUsername, ENT_QUOTES, 'UTF-8') ?>">
        <button class="footer-menu__toggle" type="button" aria-label="Открыть меню" aria-expanded="false">
            <span class="footer-menu__planet" data-svg-src="/assets/images/icons/planet.svg" aria-hidden="true"></span>
        </button>

        <div class="footer-menu__control" aria-label="Управление меню">
            <div class="footer-menu__left-controls">
                <button class="footer-menu__back is-hidden" type="button" aria-label="Назад" aria-hidden="true">
                    <span class="footer-menu__control-icon" data-svg-src="/assets/images/icons/L-arrow.svg" aria-hidden="true"></span>
                </button>
                <button class="footer-menu__pin" type="button" aria-label="Закрепить меню" aria-pressed="false">
                    <span class="footer-menu__control-icon" data-svg-src="/assets/images/icons/pin.svg" aria-hidden="true"></span>
                </button>
            </div>
            <span class="footer-menu__title" data-component="footer-menu-title">Меню</span>
            <button class="footer-menu__compress" type="button" aria-label="Свернуть меню">
                <span class="footer-menu__control-icon" data-svg-src="/assets/images/icons/compress.svg" aria-hidden="true"></span>
            </button>
        </div>
        <div class="footer-menu__line footer-menu__line--1" aria-hidden="true"></div>

        <div class="footer-menu__content" aria-label="Разделы меню">
            <button class="footer-menu__content-button" type="button" data-footer-menu-action="profile">Профиль</button>
            <button class="footer-menu__content-button" type="button" data-footer-menu-action="messages">Сообщения</button>
            <button class="footer-menu__content-button" type="button" data-footer-menu-action="notifications">Уведомления</button>
            <button class="footer-menu__content-button" type="button" data-footer-menu-action="friends">Друзья</button>
            <button class="footer-menu__content-button" type="button" data-footer-menu-action="collections">Коллекции</button>
            <button class="footer-menu__create-post" type="button" data-footer-menu-action="create-post">Создать пост</button>
        </div>
    </div>

    <button class="scroll-to-top-button" data-component="scroll-to-top" aria-label="Наверх">
        <span class="scroll-to-top-button__icon" data-svg-src="/assets/images/icons/S-arrow.svg" aria-hidden="true"></span>
    </button>
</footer>


<?php include '../src/views/components/dropdown-collections_cp.php'; ?>

<?php include '../src/views/components/collection-modul_cp.php'; ?>
<?php include '../src/views/components/profile-modal_cp.php'; ?>
