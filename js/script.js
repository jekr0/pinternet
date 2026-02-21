// Ждём загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    const profileButton = document.getElementById('profile-button');
    
    // Создаём элемент изображения
    const avatarImg = new Image();
    avatarImg.src = 'images/avatar.png'; // путь к аватару
    
    // Если изображение загрузилось успешно
    avatarImg.onload = function() {
        // Очищаем содержимое кнопки (удаляем SVG-заглушку)
        profileButton.innerHTML = '';
        // Вставляем загруженное изображение
        profileButton.appendChild(avatarImg);
    };
    
    // Если ошибка загрузки — ничего не делаем, 
    // так как в кнопке уже есть SVG-иконка (заглушка)
    avatarImg.onerror = function() {
        console.log('Аватар не загружен, используется иконка @');
        // Можно оставить как есть, можно добавить класс для стилизации ошибки
    };
});