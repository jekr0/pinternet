class FooterLayout {
    init() {
        this.menu = document.querySelector('[data-component="footer-menu"]');
        if (!this.menu || this.menu.dataset.bound === '1') return;

        this.menu.dataset.bound = '1';
        this.isPinned = this.shouldRestorePinnedState();
        this.substate = 'home_state';
        this.stateTransitionTimer = null;
        this.stateTransitionFrame = null;
        this.collections = [];
        this.friends = [];
        this.activeChatFriend = null;
        this.chatMessages = {};
        this.chatList = [];
        this.notifications = [];
        this.currentUserId = Number(this.menu.dataset.viewerId || 0);
        this.currentUsername = String(this.menu.dataset.viewerUsername || '').replace(/^@+/, '').trim();
        if (this.menu.dataset.authenticated !== '1') {
            this.isPinned = false;
            this.persistPinnedState();
        }
        this.footerCounts = { messages: 0, notifications: 0 };
        this.countsPollTimer = null;
        this.toggleButton = this.menu.querySelector('.footer-menu__toggle');
        this.compressButton = this.menu.querySelector('.footer-menu__compress');
        this.backButton = this.menu.querySelector('.footer-menu__back');
        this.pinButton = this.menu.querySelector('.footer-menu__pin');
        this.pinIcon = this.pinButton?.querySelector('[data-svg-src]') || null;
        this.backIcon = this.backButton?.querySelector('[data-svg-src]') || null;
        this.titleNode = this.menu.querySelector('[data-component="footer-menu-title"]');
        this.content = this.menu.querySelector('.footer-menu__content');
        this.authShakeTimer = null;

        this.renderState('home_state', { animate: false });
        this.loadIcons();
        this.bindHandlers();
        if (this.isPinned && this.menu.dataset.authenticated === '1') {
            this.openMenu();
        } else {
            this.closeMenu({ force: true });
        }
        void this.loadFooterCounts({ notify: false });
        this.countsPollTimer = setInterval(() => this.loadFooterCounts({ notify: true }), 15000);
    }

    loadIcons() {
        if (!this.menu) return;
        this.menu.querySelectorAll('[data-svg-src]').forEach((icon) => this.loadIcon(icon));
    }

    loadIcon(icon) {
        const src = icon?.getAttribute('data-svg-src');
        if (src) {
            App.utils.loadSVG(src, icon);
        }
    }

    bindHandlers() {
        this.openHandler = (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            this.openMenu();
        };
        this.closeHandler = (event) => {
            event.stopPropagation();
            this.closeMenu();
        };
        this.backHandler = (event) => {
            event.stopPropagation();
            this.renderState('home_state');
        };
        this.pinHandler = (event) => {
            event.stopPropagation();
            this.togglePinned();
        };
        this.contentClickHandler = (event) => {
            const button = event.target?.closest?.('[data-footer-menu-action], [data-footer-collection], [data-footer-friend-id], [data-footer-chat-id], [data-footer-notification-id]');
            if (!button || !this.content?.contains(button)) return;
            event.stopPropagation();
            this.handleContentAction(button.dataset.footerMenuAction || '', button, event);
        };
        this.outsideClickHandler = (event) => {
            if (!this.menu || this.menu.dataset.state !== 'opened' || this.isPinned) return;
            if (this.menu.contains(event.target)) return;
            this.closeMenu();
        };

        this.toggleButton?.addEventListener('click', this.openHandler);
        this.compressButton?.addEventListener('click', this.closeHandler);
        this.backButton?.addEventListener('click', this.backHandler);
        this.pinButton?.addEventListener('click', this.pinHandler);
        this.content?.addEventListener('click', this.contentClickHandler);
        document.addEventListener('click', this.outsideClickHandler);
    }

    openMenu() {
        if (!this.menu) return;
        if (this.menu.dataset.authenticated !== '1') {
            this.showAuthRequired();
            return;
        }

        this.menu.dataset.state = 'opened';
        this.toggleButton?.setAttribute('aria-expanded', 'true');
        this.renderState(this.substate || 'home_state', { animate: false });
    }

    showAuthRequired() {
        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message: 'Для этого действия требуется авторизация' }
        }));

        clearTimeout(this.authShakeTimer);
        this.menu.classList.remove('is-auth-required-shake');
        void this.menu.offsetWidth;
        this.menu.classList.add('is-auth-required-shake');
        this.authShakeTimer = setTimeout(() => {
            this.menu.classList.remove('is-auth-required-shake');
            this.authShakeTimer = null;
        }, 1000);
    }

    closeMenu(options = {}) {
        if (!this.menu) return;
        const { force = false } = options;
        if (this.isPinned && !force) {
            this.openMenu();
            return;
        }
        if (this.substate === 'notifications_state') {
            void this.markNotificationsRead();
        }
        this.menu.dataset.state = 'closed';
        this.toggleButton?.setAttribute('aria-expanded', 'false');
    }

    closeAfterAction() {
        if (!this.isPinned) {
            this.closeMenu();
        }
    }

    handleContentAction(action, button, event = null) {
        if (action === 'profile') {
            this.navigateToOwnProfile();
            return;
        }

        if (action === 'messages') {
            this.renderState('message_state');
            return;
        }

        if (['notifications', 'friends', 'collections'].includes(action)) {
            this.renderState(`${action}_state`);
            return;
        }

        if (action === 'collections-create') {
            document.dispatchEvent(new CustomEvent('collection-modal:open'));
            return;
        }

        if (button?.dataset.footerCollection) {
            this.navigateToCollection(button.dataset.footerCollection);
            return;
        }

        if (action === 'notifications-clean') {
            void this.clearNotifications();
            return;
        }

        if (action === 'friend-message') {
            const friendItem = button?.closest?.('[data-footer-friend-id]');
            this.openChatWithFriend(friendItem?.dataset.footerFriendId);
            return;
        }

        if (button?.dataset.footerChatId) {
            this.openChatById(button.dataset.footerChatId);
            return;
        }

        if (button?.dataset.footerNotificationId) {
            this.openNotificationTarget(button.dataset.footerNotificationId);
            return;
        }

        if (button?.dataset.footerFriendId) {
            if (event?.target?.closest?.('[data-footer-menu-action="friend-message"]')) return;
            this.openFriendProfile(button.dataset.footerFriendId);
            return;
        }

        if (button?.dataset.footerCollection) {
            return;
        }

        if (action === 'create-post') {
            this.closeAfterAction();
            document.dispatchEvent(new CustomEvent('post-modal:open'));
        }
    }

    renderState(nextState, options = {}) {
        const { animate = true } = options;
        const normalizedState = this.getKnownState(nextState);
        if (!this.menu || !this.content || !this.titleNode) return;

        if (!animate || normalizedState === this.substate) {
            this.applyState(normalizedState);
            return;
        }

        clearTimeout(this.stateTransitionTimer);
        cancelAnimationFrame(this.stateTransitionFrame);
        this.menu.classList.remove('is-substate-transitioning-in');
        this.menu.classList.add('is-substate-transitioning-out');
        this.stateTransitionTimer = setTimeout(() => {
            this.applyState(normalizedState);
            this.menu.classList.remove('is-substate-transitioning-out');
            this.menu.classList.add('is-substate-transitioning-in');
            void this.menu.offsetWidth;
            this.stateTransitionFrame = requestAnimationFrame(() => {
                this.menu?.classList.remove('is-substate-transitioning-in');
                this.stateTransitionFrame = null;
            });
            this.stateTransitionTimer = setTimeout(() => {
                this.menu?.classList.remove('is-substate-transitioning-in');
                this.stateTransitionTimer = null;
            }, 200);
        }, 200);
    }

    getKnownState(state) {
        return ['home_state', 'chat_state', 'message_state', 'notifications_state', 'friends_state', 'collections_state'].includes(state)
            ? state
            : 'home_state';
    }

    applyState(state) {
        const previousState = this.substate;
        if (previousState === 'notifications_state' && state !== 'notifications_state') {
            void this.markNotificationsRead();
        }
        this.substate = state;
        this.menu.dataset.substate = state;
        this.titleNode.textContent = this.getStateTitle(state);
        this.content.innerHTML = this.getStateContent(state);
        this.updateBackControlForState(state);
        this.updatePinControlForState(state);
        this.loadIcons();

        if (state === 'collections_state') {
            void this.loadCollectionsState();
        }


        if (state === 'friends_state') {
            this.bindFriendsSearch();
            void this.loadFriendsState();
        }

        if (state === 'message_state') {
            void this.loadChatList();
        }

        if (state === 'notifications_state') {
            void this.loadNotificationsState();
        }

        if (state === 'chat_state') {
            this.bindChatState();
            this.renderChatMessages();
        }

        this.renderFooterBadges();
    }

    getStateTitle(state) {
        return {
            home_state: 'Меню',
            chat_state: this.activeChatFriend?.username ? `@${this.activeChatFriend.username}` : 'Сообщения',
            message_state: 'Сообщения',
            notifications_state: 'Уведомления',
            friends_state: 'Друзья',
            collections_state: 'Коллекции'
        }[state] || 'Меню';
    }

    getStateContent(state) {
        if (state === 'home_state') {
            return `
                <div class="footer-menu__content-main">
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="profile">Профиль</button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="messages"><span>Сообщения</span><span class="footer-menu__badge" data-component="footer-menu-messages-count"></span></button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="notifications"><span>Уведомления</span><span class="footer-menu__badge" data-component="footer-menu-notifications-count"></span></button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="friends">Друзья</button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="collections">Коллекции</button>
                </div>
                <button class="footer-menu__create-post" type="button" data-footer-menu-action="create-post">Создать пост</button>
            `;
        }

        if (state === 'collections_state') {
            return '<ul class="footer-menu__collections-list" data-component="footer-menu-collections-list"><li class="footer-menu__collections-placeholder">Загрузка...</li></ul>';
        }

        if (state === 'message_state') {
            return '<div class="footer-menu__chat-list-wrap"><ul class="footer-menu__chat-list" data-component="footer-menu-chat-list"><li class="footer-menu__friends-placeholder">Загрузка...</li></ul></div>';
        }

        if (state === 'notifications_state') {
            return `
                <div class="footer-menu__chat-list-wrap footer-menu__notif-list-wrap"><ul class="footer-menu__chat-list footer-menu__notif-list" data-component="footer-menu-notif-list"><li class="footer-menu__friends-placeholder">Загрузка...</li></ul></div>
                <button class="footer-menu__clean-button" type="button" data-footer-menu-action="notifications-clean" aria-label="Очистить уведомления">
                    <span class="footer-menu__clean-icon" data-svg-src="/assets/images/icons/clean.svg" aria-hidden="true"></span>
                </button>
            `;
        }

        if (state === 'chat_state') {
            return `
                <div class="footer-menu__chat" data-component="footer-menu-chat">
                    <div class="footer-menu__message-list" data-component="footer-menu-message-list"></div>
                    <div class="footer-menu__message-input-wrap">
                        <textarea class="footer-menu__message-input" data-component="footer-menu-message-input" placeholder="Сообщение" maxlength="256" aria-label="Сообщение"></textarea>
                    </div>
                </div>
            `;
        }

        if (state === 'friends_state') {
            return `
                <label class="footer-menu__friends-search" aria-label="Поиск друзей">
                    <input class="footer-menu__friends-search-input" type="text" autocomplete="off" placeholder=" " data-component="footer-menu-friends-search">
                    <span class="footer-menu__friends-search-placeholder" aria-hidden="true">
                        <span class="footer-menu__friends-search-icon"></span>
                        <span>Поиск</span>
                    </span>
                </label>
                <ul class="footer-menu__friends-list" data-component="footer-menu-friends-list"><li class="footer-menu__friends-placeholder">Загрузка...</li></ul>
            `;
        }

        return '<div class="footer-menu__state-placeholder">Скоро здесь появится содержимое</div>';
    }


    bindFriendsSearch() {
        const searchInput = this.content?.querySelector('[data-component="footer-menu-friends-search"]');
        if (!searchInput) return;

        searchInput.addEventListener('input', () => this.renderFriendsList());
    }

    async loadFriendsState() {
        const list = this.content?.querySelector('[data-component="footer-menu-friends-list"]');
        if (!list) return;

        try {
            const response = await fetch('/profile/friends', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.friends)) {
                throw new Error(payload?.error || 'Не удалось загрузить друзей');
            }
            this.friends = payload.friends
                .map((friend) => ({
                    id: Number(friend?.id || 0),
                    username: String(friend?.username || '').trim(),
                    level: Number(friend?.level || 1)
                }))
                .filter((friend) => friend.id > 0 && friend.username !== '')
                .sort((left, right) => left.username.localeCompare(right.username, undefined, { numeric: true, sensitivity: 'base' }));
            this.renderFriendsList();
        } catch (error) {
            console.warn('Unable to load footer friends', error);
            list.innerHTML = '<li class="footer-menu__friends-placeholder">Не удалось загрузить друзей</li>';
        }
    }

    renderFriendsList() {
        const list = this.content?.querySelector('[data-component="footer-menu-friends-list"]');
        if (!list) return;

        const query = String(this.content?.querySelector('[data-component="footer-menu-friends-search"]')?.value || '').trim().toLowerCase();
        const filteredFriends = this.friends.filter((friend) => friend.username.toLowerCase().includes(query));

        if (filteredFriends.length === 0) {
            list.innerHTML = '<li class="footer-menu__friends-placeholder">Ничего не найдено</li>';
            return;
        }

        list.innerHTML = filteredFriends.map((friend) => `
            <li>
                <div class="footer-menu__friend-item" data-footer-friend-id="${friend.id}">
                    <span class="footer-menu__friend-label"><span class="footer-menu__friend-name">@${this.escapeHtml(friend.username)}</span><span class="footer-menu__friend-level">${this.escapeHtml(friend.level || 1)}</span></span>
                    <button class="footer-menu__friend-message" type="button" data-footer-menu-action="friend-message" aria-label="Написать @${this.escapeHtml(friend.username)}">
                        <span class="footer-menu__friend-message-icon" data-svg-src="/assets/images/icons/message.svg" aria-hidden="true"></span>
                    </button>
                </div>
            </li>
        `).join('');
        this.loadIcons();
    }

    openFriendProfile(friendId) {
        const friend = this.friends.find((item) => item.id === Number(friendId));
        if (!friend?.username) return;
        this.closeAfterAction();
        const url = `/profile?username=${encodeURIComponent(friend.username)}`;
        if (App.nav?.navigate) {
            App.nav.navigate(url);
            return;
        }
        window.location.href = url;
    }

    getKnownUserById(userId) {
        const normalizedId = Number(userId);
        return this.friends.find((item) => item.id === normalizedId)
            || this.chatList.find((item) => item.id === normalizedId)
            || null;
    }

    openChatById(userId) {
        const user = this.getKnownUserById(userId);
        if (!user) return;
        this.openChatWithUser(user);
    }

    openChatWithFriend(friendId) {
        const friend = this.getKnownUserById(friendId);
        if (!friend) return;
        this.openChatWithUser(friend);
    }

    openChatWithUser(friend) {
        this.openMenu();
        this.activeChatFriend = friend;
        if (!this.chatMessages[friend.id]) {
            this.chatMessages[friend.id] = [];
        }
        this.renderState('chat_state');
        void this.loadChatMessages();
    }

    async loadChatMessages() {
        const friend = this.activeChatFriend;
        if (!friend) return;
        try {
            const formData = new FormData();
            formData.append('user_id', String(friend.id));
            const response = await fetch('/profile/messages/list', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.messages)) {
                throw new Error(payload?.error || 'Не удалось загрузить сообщения');
            }
            friend.canMessage = payload.can_message !== false;
            friend.messageBlockReason = payload.reason || '';
            this.chatMessages[friend.id] = payload.messages.map((message) => ({
                ...message,
                text: this.decryptMessage(message.text || '', friend.id)
            }));
            this.renderChatMessages();
            this.updateMessageInputState();
            void this.loadFooterCounts({ notify: false });
        } catch (error) {
            console.warn('Unable to load footer chat messages', error);
            document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error?.message || 'Не удалось загрузить сообщения' } }));
        }
    }

    bindChatState() {
        const input = this.content?.querySelector('[data-component="footer-menu-message-input"]');
        if (!input) return;

        input.addEventListener('input', () => this.autoResizeMessageInput(input));
        input.addEventListener('pointerdown', (event) => {
            if (this.activeChatFriend?.canMessage !== false) return;
            event.preventDefault();
            this.showMessageBlockToast(this.activeChatFriend.messageBlockReason);
        });
        input.addEventListener('keydown', (event) => {
            if (this.activeChatFriend?.canMessage === false) {
                event.preventDefault();
                this.showMessageBlockToast(this.activeChatFriend.messageBlockReason);
                return;
            }
            if (event.key === 'Tab' && event.ctrlKey) {
                event.preventDefault();
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                const currentValue = input.value;
                input.value = `${currentValue.slice(0, start)}\n${currentValue.slice(end)}`;
                input.selectionStart = input.selectionEnd = start + 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            void this.submitChatMessage(input);
        });
        this.autoResizeMessageInput(input);
        this.updateMessageInputState();
    }

    updateMessageInputState() {
        const input = this.content?.querySelector('[data-component="footer-menu-message-input"]');
        if (!input || !this.activeChatFriend) return;
        input.readOnly = this.activeChatFriend.canMessage === false;
        input.classList.toggle('is-blocked', this.activeChatFriend.canMessage === false);
    }

    autoResizeMessageInput(input) {
        if (!input) return;
        if (input.value.trim() === '') {
            input.style.height = '40px';
            this.content?.style.setProperty('--footer-message-input-height', '40px');
            return;
        }
        input.style.height = 'auto';
        input.style.height = `${Math.min(140, Math.max(40, input.scrollHeight))}px`;
        this.content?.style.setProperty('--footer-message-input-height', input.style.height);
    }

    async submitChatMessage(input) {
        const text = String(input?.value || '').trim();
        const friend = this.activeChatFriend;
        if (!friend || !text) return;
        if (text.length > 256) {
            document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Сообщение не должно превышать 256 символов' } }));
            return;
        }

        input.disabled = true;
        try {
            const formData = new FormData();
            formData.append('user_id', String(friend.id));
            formData.append('text', this.encryptMessage(text, friend.id));
            const response = await fetch('/profile/messages/send', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !payload.message) {
                if (payload?.reason) {
                    this.showMessageBlockToast(payload.reason);
                    return;
                }
                throw new Error(payload?.error || 'Не удалось отправить сообщение');
            }
            if (!this.chatMessages[friend.id]) this.chatMessages[friend.id] = [];
            this.chatMessages[friend.id].unshift({ ...payload.message, text });
            input.value = '';
            this.autoResizeMessageInput(input);
            this.renderChatMessages();
            void this.loadFooterCounts({ notify: false });
            if (this.substate === 'message_state') void this.loadChatList();
        } catch (error) {
            console.warn('Unable to send footer chat message', error);
            document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error?.message || 'Не удалось отправить сообщение' } }));
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    renderChatMessages() {
        const list = this.content?.querySelector('[data-component="footer-menu-message-list"]');
        if (!list || !this.activeChatFriend) return;
        const messages = this.chatMessages[this.activeChatFriend.id] || [];
        list.innerHTML = messages.length ? messages.map((message) => this.getMessageItemHtml(message)).join('') : '<div class="footer-menu__message-placeholder">Сообщений пока нет</div>';
    }

    getMessageItemHtml(message) {
        const type = message?.type === 'friend' ? 'friend' : 'self';
        return `
            <div class="footer-menu__message-row footer-menu__message-row--${type}">
                <div class="footer-menu__message-time">${this.escapeHtml(this.formatMessageTime(message?.sentAt))}</div>
                <div class="footer-menu__message-item footer-menu__message-item--${type}">${this.escapeHtml(message?.text || '')}</div>
            </div>
        `;
    }

    formatMessageTime(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        const pad = (number) => String(number).padStart(2, '0');
        if (Date.now() - date.getTime() >= 24 * 60 * 60 * 1000) {
            return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
        }
        return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    async loadChatList() {
        const list = this.content?.querySelector('[data-component="footer-menu-chat-list"]');
        if (!list) return;
        try {
            const response = await fetch('/profile/messages/chats', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.chats)) {
                throw new Error(payload?.error || 'Не удалось загрузить чаты');
            }
            this.chatList = payload.chats.map((chat) => ({
                id: Number(chat?.id || 0),
                username: String(chat?.username || '').trim(),
                unread_count: Number(chat?.unread_count || 0),
                lastMessageAt: String(chat?.last_message_at || '')
            }))
                .filter((chat) => chat.id > 0 && chat.username !== '')
                .sort((left, right) => {
                    const rightTime = Date.parse(right.lastMessageAt) || 0;
                    const leftTime = Date.parse(left.lastMessageAt) || 0;
                    if (rightTime !== leftTime) return rightTime - leftTime;
                    return left.username.localeCompare(right.username, undefined, { numeric: true, sensitivity: 'base' });
                });
            this.renderChatList(list);
        } catch (error) {
            console.warn('Unable to load footer chat list', error);
            list.innerHTML = '<li class="footer-menu__friends-placeholder">Не удалось загрузить чаты</li>';
        }
    }

    renderChatList(list) {
        if (this.chatList.length === 0) {
            list.innerHTML = '<li class="footer-menu__friends-placeholder">Сообщений пока нет</li>';
            return;
        }
        list.innerHTML = this.chatList.map((chat) => `
            <li>
                <div class="footer-menu__chat-item" data-footer-chat-id="${chat.id}">
                    <span class="footer-menu__friend-name">@${this.escapeHtml(chat.username)}</span>
                    <span class="footer-menu__badge">${chat.unread_count > 0 ? this.escapeHtml(chat.unread_count) : ''}</span>
                </div>
            </li>
        `).join('');
    }


    async loadNotificationsState() {
        const list = this.content?.querySelector('[data-component="footer-menu-notif-list"]');
        if (!list) return;
        try {
            const response = await fetch('/profile/notifications/list', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.notifications)) {
                throw new Error(payload?.error || 'Не удалось загрузить уведомления');
            }
            this.notifications = payload.notifications.map((notification) => ({
                id: Number(notification?.id || 0),
                title: String(notification?.title || '').trim(),
                text: String(notification?.text || '').trim(),
                isRead: Boolean(notification?.is_read),
                createdAt: String(notification?.created_at || ''),
                actorUsername: String(notification?.actor_username || '').trim(),
                targetUrl: String(notification?.target_url || '').trim(),
                postId: Number(notification?.post_id || 0),
                commentId: Number(notification?.comment_id || 0)
            })).filter((notification) => notification.id > 0 && notification.title !== '')
                .sort((left, right) => {
                    const rightTime = Date.parse(right.createdAt) || 0;
                    const leftTime = Date.parse(left.createdAt) || 0;
                    if (rightTime !== leftTime) return rightTime - leftTime;
                    return right.id - left.id;
                });
            this.renderNotificationsList(list);
        } catch (error) {
            console.warn('Unable to load footer notifications', error);
            list.innerHTML = '<li class="footer-menu__friends-placeholder">Не удалось загрузить уведомления</li>';
        }
    }

    renderNotificationsList(list) {
        if (this.notifications.length === 0) {
            list.innerHTML = '<li class="footer-menu__friends-placeholder">Уведомлений пока нет</li>';
            return;
        }
        list.innerHTML = this.notifications.map((notification) => `
            <li>
                <div class="footer-menu__notif-item${notification.isRead ? '' : ' footer-menu__notif-item--unread'}" data-footer-notification-id="${notification.id}">
                    <div class="footer-menu__notif-title">${this.formatNotificationTitle(notification.title)}</div>
                    ${notification.text ? `<div class="footer-menu__notif-text">${this.escapeHtml(notification.text)}</div>` : ''}
                    <div class="footer-menu__notif-date-time">${this.escapeHtml(this.formatMessageTime(notification.createdAt))}</div>
                </div>
            </li>
        `).join('');
    }



    formatNotificationTitle(title) {
        return this.escapeHtml(title).replace(/(@[\p{L}\p{N}_.-]+)/gu, '<span class="footer-menu__notif-nickname">$1</span>');
    }

    openNotificationTarget(notificationId) {
        const notification = this.notifications.find((item) => item.id === Number(notificationId));
        if (!notification?.targetUrl) return;
        void this.markNotificationsRead();
        this.closeAfterAction();
        if (App.nav?.navigate) {
            App.nav.navigate(notification.targetUrl);
            return;
        }
        window.location.href = notification.targetUrl;
    }


    async clearNotifications() {
        try {
            const response = await fetch('/profile/notifications/clear', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload?.error || 'Не удалось очистить уведомления');
            this.notifications = [];
            this.footerCounts.notifications = 0;
            const list = this.content?.querySelector('[data-component="footer-menu-notif-list"]');
            if (list) this.renderNotificationsList(list);
            this.renderFooterBadges();
        } catch (error) {
            console.warn('Unable to clear footer notifications', error);
            document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error?.message || 'Не удалось очистить уведомления' } }));
        }
    }

    async markNotificationsRead() {
        if (!this.notifications.some((notification) => !notification.isRead)) return;
        try {
            const response = await fetch('/profile/notifications/read', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload?.error || 'Не удалось отметить уведомления');
            this.notifications = this.notifications.map((notification) => ({ ...notification, isRead: true }));
            this.footerCounts.notifications = 0;
            this.renderFooterBadges();
        } catch (error) {
            console.warn('Unable to mark footer notifications as read', error);
        }
    }

    async loadFooterCounts(options = {}) {
        const { notify = false } = options;
        if (this.menu?.dataset.authenticated !== '1') return;
        try {
            const previousMessages = this.footerCounts.messages || 0;
            const response = await fetch('/profile/footer-counts', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload?.error || 'Не удалось загрузить счётчики');
            this.footerCounts = {
                messages: Number(payload.messages_unread || 0),
                notifications: Number(payload.notifications_unread || 0)
            };
            if (notify && this.footerCounts.messages > previousMessages && payload.latest_unread?.username) {
                const username = this.escapeHtml(payload.latest_unread.username);
                document.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { html: `Новое сообщение от <span style="color: rgb(100, 100, 200);">@${username}</span>` }
                }));
            }
            this.renderFooterBadges();
        } catch (error) {
            console.warn('Unable to load footer counts', error);
        }
    }

    renderFooterBadges() {
        const messagesNode = this.content?.querySelector('[data-component="footer-menu-messages-count"]');
        const notificationsNode = this.content?.querySelector('[data-component="footer-menu-notifications-count"]');
        if (messagesNode) messagesNode.textContent = this.footerCounts.messages > 0 ? String(this.footerCounts.messages) : '';
        if (notificationsNode) notificationsNode.textContent = this.footerCounts.notifications > 0 ? String(this.footerCounts.notifications) : '';
    }

    getMessageCipherKey(friendId) {
        const firstId = Number(friendId) || 0;
        const secondId = Number(this.currentUserId) || 0;
        const low = Math.min(firstId, secondId);
        const high = Math.max(firstId, secondId);
        return (low * 131 + high * 257 + 97) % 65535;
    }

    cryptMessageSameLength(text, friendId, direction) {
        const key = this.getMessageCipherKey(friendId);
        return String(text).split('').map((char, index) => {
            const code = char.charCodeAt(0);
            const delta = (key + index * 17) % 65535;
            const nextCode = direction > 0 ? (code + delta) % 65535 : (code - delta + 65535) % 65535;
            return String.fromCharCode(nextCode || 32);
        }).join('');
    }

    encryptMessage(text, friendId) {
        return this.cryptMessageSameLength(text, friendId, 1);
    }

    decryptMessage(text, friendId) {
        return this.cryptMessageSameLength(text, friendId, -1);
    }

    showMessageBlockToast(reason) {
        const messages = {
            not_friends: 'Похоже, вы больше не друзья',
            blocked_by_viewer: 'Для отправки сообщений разблокируйте пользователя',
            blocked_by_friend: 'Сожалеем, вы были заблокированы'
        };
        document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: messages[reason] || 'Нельзя отправить сообщение' } }));
    }

    async loadCollectionsState() {
        const list = this.content?.querySelector('[data-component="footer-menu-collections-list"]');
        if (!list) return;

        try {
            const response = await fetch('/collections/list', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.collections)) {
                throw new Error(payload?.error || 'Не удалось загрузить коллекции');
            }
            this.collections = payload.collections;
            this.renderCollectionsList(list, this.collections);
        } catch (error) {
            console.warn('Unable to load footer collections', error);
            list.innerHTML = '<li class="footer-menu__collections-placeholder">Не удалось загрузить коллекции</li>';
        }
    }

    navigateToOwnProfile() {
        this.closeAfterAction();
        const url = this.currentUsername ? `/profile?username=${encodeURIComponent(`@${this.currentUsername}`)}` : '/profile';
        if (App.nav?.navigate) {
            App.nav.navigate(url, { pushUrl: true });
            return;
        }
        window.location.href = url;
    }

    navigateToCollection(collection) {
        const normalizedCollection = String(collection || '').trim();
        if (this.isProfileCollectionName(normalizedCollection)) {
            this.navigateToOwnProfile();
            return;
        }
        this.closeAfterAction();
        const usernamePart = this.currentUsername ? `username=${encodeURIComponent(`@${this.currentUsername}`)}` : '';
        const collectionPart = `collection=${encodeURIComponent(normalizedCollection)}`;
        const query = [usernamePart, collectionPart].filter(Boolean).join('&');
        const url = `/profile?${query}`;
        if (App.nav?.navigate) {
            App.nav.navigate(url, { pushUrl: true });
            return;
        }
        window.location.href = url;
    }

    renderCollectionsList(list, collections) {
        const normalizedCollections = collections
            .map((collection) => String(collection || '').trim())
            .filter(Boolean)
            .map((collection) => this.isProfileCollectionName(collection) ? 'Профиль' : collection);

        if (normalizedCollections.length === 0) {
            normalizedCollections.push('Профиль');
        }

        list.innerHTML = `${normalizedCollections.map((collection) => `
            <li>
                <button class="footer-menu__collection-item" type="button" data-footer-collection="${this.escapeHtml(collection)}">
                    ${this.escapeHtml(collection)}
                </button>
            </li>
        `).join('')}
            <li>
                <button class="footer-menu__collection-item footer-menu__collection-item--add" type="button" data-footer-menu-action="collections-create" aria-label="Редактировать коллекции">
                    <span class="footer-menu__collection-edit-icon" data-svg-src="/assets/images/icons/L-edit.svg" aria-hidden="true"></span>
                </button>
            </li>`;
        this.loadIcons();
    }

    isProfileCollectionName(collectionName) {
        const normalized = String(collectionName || '').trim().toLowerCase();
        return normalized === 'profile' || normalized === 'профиль';
    }

    updateBackControlForState(state) {
        if (!this.backButton || !this.backIcon) return;

        const isHomeState = state === 'home_state';
        this.backButton.classList.toggle('is-hidden', isHomeState);
        this.backButton.setAttribute('aria-hidden', isHomeState ? 'true' : 'false');
        this.loadIcon(this.backIcon);
    }

    updatePinControlForState(state) {
        if (!this.pinButton || !this.pinIcon) return;

        const isHomeState = state === 'home_state';
        this.pinButton.classList.toggle('is-hidden', !isHomeState);
        this.pinButton.classList.toggle('is-active', isHomeState && this.isPinned);
        this.pinButton.setAttribute('aria-label', this.isPinned ? 'Открепить меню' : 'Закрепить меню');
        this.pinButton.setAttribute('aria-pressed', this.isPinned ? 'true' : 'false');
        this.pinIcon.setAttribute('data-svg-src', this.isPinned ? '/assets/images/icons/pin-fill.svg' : '/assets/images/icons/pin.svg');
        this.loadIcon(this.pinIcon);
    }

    togglePinned() {
        this.isPinned = !this.isPinned;
        this.persistPinnedState();
        if (this.isPinned) {
            this.openMenu();
        }
        this.updatePinControlForState(this.substate || 'home_state');
    }

    shouldRestorePinnedState() {
        try {
            return window.sessionStorage?.getItem('footer-menu-pinned') === '1';
        } catch (error) {
            return false;
        }
    }

    persistPinnedState() {
        try {
            window.sessionStorage?.setItem('footer-menu-pinned', this.isPinned ? '1' : '0');
        } catch (error) {
            // Ignore storage failures; pinning still works for the current instance.
        }
    }

    escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[char]));
    }


    openChatFromProfile(user) {
        const normalizedUser = {
            id: Number(user?.id || 0),
            username: String(user?.username || '').replace(/^@+/, '').trim(),
            level: Number(user?.level || 1)
        };
        if (!normalizedUser.id || !normalizedUser.username) return;
        this.openChatWithUser(normalizedUser);
    }

    refresh() {
        const currentMenu = document.querySelector('[data-component="footer-menu"]');
        if (!currentMenu) {
            this.unbindHandlers();
            this.menu = null;
            return;
        }

        if (currentMenu === this.menu) {
            this.loadIcons();
            this.renderFooterBadges();
            return;
        }

        this.unbindHandlers();
        currentMenu.dataset.bound = '0';
        this.menu = currentMenu;
        this.init();
    }

    unbindHandlers() {
        this.toggleButton?.removeEventListener('click', this.openHandler);
        this.compressButton?.removeEventListener('click', this.closeHandler);
        this.backButton?.removeEventListener('click', this.backHandler);
        this.pinButton?.removeEventListener('click', this.pinHandler);
        this.content?.removeEventListener('click', this.contentClickHandler);
        document.removeEventListener('click', this.outsideClickHandler);
        clearTimeout(this.stateTransitionTimer);
        clearTimeout(this.authShakeTimer);
        clearInterval(this.countsPollTimer);
    }
}

App.register('footer_lo.js', FooterLayout);
