class AuthBgParallaxComponent {
    init() {
        const auth = document.querySelector('.auth');
        if (!auth) return;

        const update = (event) => {
            const x = event.clientX / window.innerWidth - 0.5;
            const y = event.clientY / window.innerHeight - 0.5;
            auth.style.setProperty('--aurora-shift-x', `${x * 28}px`);
            auth.style.setProperty('--aurora-shift-y', `${y * 24}px`);
        };

        window.addEventListener('mousemove', update);
    }
}

App.register('auth_bg_parallax.js', AuthBgParallaxComponent);
