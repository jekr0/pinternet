/* --------------------------- Адаптивный текст (независимый компонент) ----------------------- */

class AdaptiveTextComponent {
    constructor() {
        this.elements = [];
    }

    init() {
        // Ищем все элементы с data-component="adaptive-text"
        this.elements = document.querySelectorAll('[data-component="adaptive-text"]');
        if (this.elements.length === 0) return;

        this.elements.forEach(el => {
            this.adjustFontSize(el);
        });
    }

    adjustFontSize(container) {
        const text = container.innerText;
        if (!text) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        let fontSize = parseInt(getComputedStyle(container).fontSize, 16) || 32;
        const maxFontSize = 32;
        const minFontSize = 16;

        // Создаём временный элемент для измерения
        const measureSpan = document.createElement('span');
        measureSpan.style.position = 'absolute';
        measureSpan.style.visibility = 'hidden';
        measureSpan.style.whiteSpace = 'nowrap';
        measureSpan.style.fontFamily = getComputedStyle(container).fontFamily;
        measureSpan.innerText = text;
        document.body.appendChild(measureSpan);

        // Бинарный поиск оптимального размера шрифта
        let low = minFontSize, high = maxFontSize;
        let bestSize = minFontSize;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            measureSpan.style.fontSize = mid + 'px';
            const textWidth = measureSpan.offsetWidth;
            if (textWidth <= containerWidth && mid <= containerHeight) {
                bestSize = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        document.body.removeChild(measureSpan);
        container.style.fontSize = bestSize + 'px';
    }
}

// Регистрация компонента
App.register('adaptive_text.js', AdaptiveTextComponent);