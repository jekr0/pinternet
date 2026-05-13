class AuthPatternComponent {
    init() {
        const authRoot = document.querySelector('.auth');
        const container = document.querySelector('.auth__container');
        if (!authRoot || !container) return;

        const update = (event) => {
            authRoot.style.setProperty('--auth-mouse-x', `${event.clientX}px`);
            authRoot.style.setProperty('--auth-mouse-y', `${event.clientY}px`);

            const bounds = container.getBoundingClientRect();
            const inside = event.clientX >= bounds.left
                && event.clientX <= bounds.right
                && event.clientY >= bounds.top
                && event.clientY <= bounds.bottom;

            authRoot.classList.toggle('auth--pattern-hidden', inside);
        };

        window.addEventListener('mousemove', update);
    }
}

App.register('auth_pattern.js', AuthPatternComponent);
