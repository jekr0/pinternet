<?php
if (session_status() === PHP_SESSION_NONE) session_start();
require_once __DIR__ . '/../../config/database_conf.php';

$profileModalUser = null;
$profileModalUserId = (int) ($_SESSION['user_id'] ?? 0);
if ($profileModalUserId > 0) {
    $stmt = $pdo->prepare('SELECT username, avatar, bio, username_changed_at FROM Users WHERE id = ? LIMIT 1');
    $stmt->execute([$profileModalUserId]);
    $profileModalUser = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}
$profileModalUsername = (string) ($profileModalUser['username'] ?? '');
$profileModalAvatar = (string) ($profileModalUser['avatar'] ?? '');
$profileModalBio = (string) ($profileModalUser['bio'] ?? '');
$profileModalUsernameChangedAt = (string) ($profileModalUser['username_changed_at'] ?? '');
$profileModalAvatarSrc = $profileModalAvatar !== '' ? '/' . ltrim($profileModalAvatar, '/') : '';
?>
<div
    class="profile-modal profile-modal--hidden"
    id="profile-modal"
    aria-hidden="true"
    data-current-username="<?= htmlspecialchars($profileModalUsername, ENT_QUOTES, 'UTF-8') ?>"
    data-current-avatar="<?= htmlspecialchars($profileModalAvatarSrc, ENT_QUOTES, 'UTF-8') ?>"
    data-current-bio="<?= htmlspecialchars($profileModalBio, ENT_QUOTES, 'UTF-8') ?>"
    data-username-changed-at="<?= htmlspecialchars($profileModalUsernameChangedAt, ENT_QUOTES, 'UTF-8') ?>"
>
    <div class="profile-modal__panel" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div class="profile-modal__avatar-column">
            <div class="profile-modal__avatar-dropzone" data-component="profile-avatar-dropzone" role="button" tabindex="0" aria-label="Загрузить аватар">
                <input class="profile-modal__file-input" type="file" accept="image/png,image/jpeg,image/gif" data-component="profile-avatar-input">
                <div class="profile-modal__avatar-placeholder<?= $profileModalAvatarSrc !== '' ? ' profile-modal__avatar-placeholder--hidden' : '' ?>" data-component="profile-avatar-placeholder">
                    <span class="profile-modal__upload-icon" data-svg-src="/assets/images/icons/upload.svg" aria-hidden="true"></span>
                    <span class="profile-modal__upload-label">Загрузить</span>
                </div>
                <img class="profile-modal__avatar-preview<?= $profileModalAvatarSrc === '' ? ' profile-modal__avatar-preview--hidden' : '' ?>" data-component="profile-avatar-preview" src="<?= htmlspecialchars($profileModalAvatarSrc, ENT_QUOTES, 'UTF-8') ?>" alt="Предпросмотр аватара">
            </div>
        </div>
        <div class="profile-modal__meta-column">
            <h2 class="profile-modal__title" id="profile-modal-title">Изменение профиля</h2>
            <p class="profile-modal__alert profile-modal__alert--hidden" data-component="profile-modal-alert"></p>
            <input class="profile-modal__input profile-modal__input--nickname ui-input" type="text" maxlength="12" placeholder="Никнейм" data-component="profile-nickname" autocomplete="off">
            <div class="profile-modal__about-wrap">
                <textarea class="profile-modal__input profile-modal__input--about ui-textarea" maxlength="256" placeholder="Описание пользователя" data-component="profile-about"></textarea>
                <span class="profile-modal__about-counter" data-component="profile-about-counter">0/256</span>
            </div>
            <div class="profile-modal__actions">
                <button class="profile-modal__button profile-modal__button--submit" type="button" data-component="profile-modal-save">Сохранить</button>
                <button class="profile-modal__button profile-modal__button--cancel" type="button" data-component="profile-modal-cancel">Назад</button>
            </div>
        </div>
    </div>
</div>
