class AuthBgParallaxComponent {
    init() {
        const auth = document.querySelector('.auth');
        if (!auth) return;
        const randomPercent = (min, max) => `${Math.round(min + Math.random() * (max - min))}%`;

        const randomizeAuroras = () => {
            auth.style.setProperty('--aurora-1-x', randomPercent(10, 90));
            auth.style.setProperty('--aurora-1-y', randomPercent(12, 88));
            auth.style.setProperty('--aurora-2-x', randomPercent(10, 90));
            auth.style.setProperty('--aurora-2-y', randomPercent(12, 88));
            auth.style.setProperty('--aurora-3-x', randomPercent(10, 90));
            auth.style.setProperty('--aurora-3-y', randomPercent(12, 88));
        };

        const update = (event) => {
            const x = event.clientX / window.innerWidth - 0.5;
            const y = event.clientY / window.innerHeight - 0.5;
            auth.style.setProperty('--aurora-shift-x', `${x * 28}px`);
            auth.style.setProperty('--aurora-shift-y', `${y * 24}px`);
        };

        randomizeAuroras();
        window.setInterval(randomizeAuroras, 7000);
        window.addEventListener('mousemove', update);
    }
}

App.register('auth_bg_parallax.js', AuthBgParallaxComponent);
