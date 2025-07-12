/**
 * Chat Widget - Production Ready
 * Modern, accessible chat widget with multi-line input, theming, and error handling
 */
(function() {
    'use strict';

    // ============================================================================
    // BROWSER COMPATIBILITY & POLYFILLS
    // ============================================================================
    
    const browserSupport = {
        optionalChaining: typeof ({}?.test) !== 'undefined',
        abortController: typeof AbortController !== 'undefined',
        documentFragment: typeof document.createDocumentFragment !== 'undefined',
        
        safeGet: function(obj, path, defaultValue) {
            try {
                return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
            } catch {
                return defaultValue;
            }
        },
        
        createAbortController: function() {
            if (this.abortController) {
                return new AbortController();
            }
            return {
                signal: { aborted: false },
                abort: function() { this.signal.aborted = true; }
            };
        }
    };

    // Prevent duplicate widget initialization
    if (document.getElementById('chat-widget-container')) {
        console.warn('[ChatWidget] Widget already exists, skipping initialization');
        return;
    }

    // ============================================================================
    // CONFIGURATION & CONSTANTS
    // ============================================================================
    
    const CONSTANTS = {
        WIDGET: {
            CONTAINER_ID: 'chat-widget-container',
            WIDTH: 25,        // 400px in rem (400/16)
            HEIGHT: 38.75,    // 620px in rem (620/16)
            Z_INDEX: 2147483647
        },
        TOGGLE: {
            SIZE: 3.5,        // 56px in rem (56/16)
            LOGO_SIZE: 2      // 32px in rem (32/16)
        },
        AVATAR: {
            SIZE: 2.5,        // 40px in rem (40/16)
            BOT_SIZE: 2,      // 32px in rem (32/16)
            BOT_ICON_SIZE: 1.25  // 20px in rem (20/16)
        },
        TIMEOUTS: {
            NETWORK_REQUEST: 30000,
            ANIMATION: 200
        },
        RETRY: {
            MAX_ATTEMPTS: 3,
            BASE_DELAY: 1000,
            MAX_DELAY: 10000
        },
        FONTS: {
            TITLE: 1,            // 16px
            SUBTITLE: 0.875,     // 14px
            MESSAGE: 1,          // 16px
            DESCRIPTION: 0.875,  // 14px
            BOT_NAME: 0.875,     // 14px
            TIMESTAMP: 0.75,     // 12px
            INPUT: 1,            // 16px
            ICON_SM: 1.25,       // 20px
            ICON_LG: 1.5         // 24px
        },
        INPUT: {
            MIN_HEIGHT: 22.4,
            MAX_HEIGHT: 140,
            TOLERANCE: 4
        },
        STATUS: {
            INDICATOR_SIZE: 0.625,    // 10px in rem
            BORDER_WIDTH: 0.125,      // 2px in rem
            OFFSET: 0.125             // 2px in rem
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    const getPreferredTheme = () => {
        try {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    };

    const parseConfig = () => {
        const script = document.currentScript || document.querySelector('script[data-client-id]');
        if (!script) {
            console.error('[ChatWidget] Configuration script not found');
            return null;
        }

        const config = {
            clientId: script.getAttribute('data-client-id') || 'default',
            clientName: script.getAttribute('data-client-name') || 'Support',
            subtitle: script.getAttribute('data-subtitle') || 'How can we help you today?',
            description: script.getAttribute('data-description') || 'Ask us anything and we will get back to you right away.',
            placeholder: script.getAttribute('data-placeholder') || 'Type your message here...',
            primaryColor: script.getAttribute('data-primary-color') || '#3b82f6',
            secondaryColor: script.getAttribute('data-secondary-color') || '#1e40af',
            position: script.getAttribute('data-position') || 'bottom-right',
            theme: script.getAttribute('data-theme') || getPreferredTheme(),
            profileIcon: script.getAttribute('data-profile-icon') || null,
            companyLogo: script.getAttribute('data-company-logo') || null,
            useLogoAsToggle: script.getAttribute('data-use-logo-as-toggle') === 'true',
            useLogoAsProfile: script.getAttribute('data-use-logo-as-profile') === 'true',
            showRefresh: script.getAttribute('data-show-refresh-button') !== 'false',
            showStatus: script.getAttribute('data-show-status') !== 'false',
            status: script.getAttribute('data-status') || 'online',
            demoMode: script.getAttribute('data-demo-mode') || null,
            autoOpen: script.getAttribute('data-auto-open') === 'true',
            webhookUrl: script.getAttribute('data-webhook-url') || 'https://n8n.bynari.ai/webhook/c7c06a4d-fa60-4f58-a8cc-63a5b5cdcdee/chat'
        };

        // Validate required fields
        if (!config.clientId || config.clientId === 'default') {
            console.error('[ChatWidget] data-client-id is required');
            return null;
        }

        return config;
    };

    const config = parseConfig();
    if (!config) return;

    console.log('[ChatWidget] Initializing with config:', config.clientId);

    // ============================================================================
    // STYLES
    // ============================================================================
    
    const createStyles = () => {
        return `
            /* Google Fonts */
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/icon?family=Material+Icons');

            /* CSS Variables */
            #chat-widget-container {
                position: fixed;
                z-index: ${CONSTANTS.WIDGET.Z_INDEX};
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                --primary: ${config.primaryColor || '#3b82f6'};
                --secondary: ${config.secondaryColor || '#1e40af'};
                --bg: ${config.theme === 'dark' ? '#1f2937' : '#ffffff'};
                --text: ${config.theme === 'dark' ? '#f9fafb' : '#0f172a'};
                --border: ${config.theme === 'dark' ? '#374151' : '#e2e8f0'};
                --light-bg: ${config.theme === 'dark' ? '#374151' : '#f1f5f9'};
                --input: ${config.theme === 'dark' ? '#374151' : '#f8fafc'};
                --placeholder: #94a3b8;
                --timestamp: #94a3b8;
                --button-hover: rgba(59,130,246,0.1);
                --shadow: rgba(15,23,42,0.15);
                --status-online: #10b981;
                --status-away: #f59e0b;
                --status-offline: #6b7280;
                --status-border: white;
            }

            /* Demo Mode Styles */
            #chat-widget-container.demo-centered {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                bottom: auto;
                right: auto;
            }

            #chat-widget-container.demo-embedded .chat-toggle {
                display: none !important;
            }

            #chat-widget-container.demo-embedded {
                position: static !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                bottom: auto !important;
                margin: 0 auto;
                display: flex;
                justify-content: center;
                align-items: center;
                width: auto !important;
                height: auto !important;
            }

            #chat-widget-container.demo-embedded .chat-container {
                opacity: 1 !important;
                visibility: visible !important;
                transform: translateY(0) !important;
                position: static !important;
                bottom: auto !important;
                right: auto !important;
                top: auto !important;
                left: auto !important;
                margin: 0;
                width: ${CONSTANTS.WIDGET.WIDTH}rem;
                height: ${CONSTANTS.WIDGET.HEIGHT}rem !important;
            }

            #chat-widget-container.demo-embedded .chat-messages {
                flex: 1;
                overflow-y: auto;
            }

            /* Position Variants */
            #chat-widget-container.pos-bottom-right {
                bottom: 20px;
                right: 20px;
            }

            #chat-widget-container.pos-bottom-left {
                bottom: 20px;
                left: 20px;
            }

            #chat-widget-container.pos-top-right {
                top: 20px;
                right: 20px;
            }

            #chat-widget-container.pos-top-left {
                top: 20px;
                left: 20px;
            }

            /* Toggle Button */
            .chat-toggle {
                width: ${CONSTANTS.TOGGLE.SIZE}rem;
                height: ${CONSTANTS.TOGGLE.SIZE}rem;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                border: none;
                color: white;
                cursor: pointer;
                box-shadow: 0 0.25rem 0.75rem var(--shadow);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${CONSTANTS.FONTS.ICON_LG}rem;
                transform: scale(1);
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
            }

            .chat-toggle.fonts-loaded {
                opacity: 1;
                visibility: visible;
            }

            .chat-toggle:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }

            .chat-toggle img {
                width: ${CONSTANTS.TOGGLE.LOGO_SIZE}rem;
                height: ${CONSTANTS.TOGGLE.LOGO_SIZE}rem;
                border-radius: 50%;
                object-fit: cover;
            }

            /* Chat Container */
            .chat-container {
                position: absolute;
                bottom: calc(${CONSTANTS.TOGGLE.SIZE}rem + 1.25rem);
                right: 0;
                width: ${CONSTANTS.WIDGET.WIDTH}rem;
                height: ${CONSTANTS.WIDGET.HEIGHT}rem;
                background: var(--bg);
                border-radius: 0.75rem;
                box-shadow: 0 0.625rem 1.5625rem var(--shadow);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transform: translateY(1.25rem);
                transition: all 0.3s ease;
            }

            .chat-container.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            /* Header */
            .chat-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 1.25rem 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                min-height: 3.75rem;
                overflow: visible;
            }

            .chat-header-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }

            .chat-avatar {
                width: ${CONSTANTS.AVATAR.SIZE}rem;
                height: ${CONSTANTS.AVATAR.SIZE}rem;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${CONSTANTS.FONTS.ICON_SM}rem;
                flex-shrink: 0;
                overflow: visible;
                position: relative;
            }

            .chat-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            #chat-widget-container .chat-avatar .material-icons {
                font-size: ${CONSTANTS.FONTS.ICON_SM}rem;
            }

            /* Status Indicator */
            .status-indicator {
                position: absolute;
                bottom: ${CONSTANTS.STATUS.OFFSET}rem;
                right: ${CONSTANTS.STATUS.OFFSET}rem;
                width: ${CONSTANTS.STATUS.INDICATOR_SIZE}rem;
                height: ${CONSTANTS.STATUS.INDICATOR_SIZE}rem;
                border: ${CONSTANTS.STATUS.BORDER_WIDTH}rem solid var(--status-border);
                border-radius: 50%;
                box-shadow: 0 0.0625rem 0.1875rem var(--shadow);
                z-index: 10;
            }

            .status-indicator.online {
                background: var(--status-online);
                border: none;
            }

            .status-indicator.online::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 50%;
                background: var(--status-online);
                opacity: 0.3;
                animation: statusPulse 2s infinite;
            }

            .status-indicator.away {
                background: var(--status-away);
            }

            .status-indicator.offline {
                background: var(--status-offline);
            }

            .chat-header-text {
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }

            .chat-title {
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: ${CONSTANTS.FONTS.TITLE}rem;
                margin: 0 0 4px 0;
                line-height: 1.2;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }

            .chat-subtitle {
                font-family: 'Inter', sans-serif;
                font-weight: 400;
                font-size: ${CONSTANTS.FONTS.SUBTITLE}rem;
                opacity: 0.9;
                margin: 0;
                line-height: 1.3;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }

            .chat-actions {
                display: flex;
                gap: 0.5rem;
                flex-shrink: 0;
            }

            .chat-action-btn {
                width: 2rem;
                height: 2rem;
                border: none;
                background: rgba(255,255,255,0.1);
                color: white;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${CONSTANTS.FONTS.ICON_SM}rem;
                transition: background 0.2s ease;
            }

            #chat-widget-container .chat-action-btn .material-icons {
                font-size: ${CONSTANTS.FONTS.ICON_SM}rem;
            }

            .chat-action-btn:hover {
                background: rgba(255,255,255,0.2);
            }

            /* Description */
            .chat-description {
                background: var(--light-bg);
                color: var(--text);
                padding: 1.25rem;
                font-size: ${CONSTANTS.FONTS.DESCRIPTION}rem;
                text-align: left;
                border-bottom: 1px solid var(--border);
                opacity: 0.8;
                display: block;
            }

            .chat-description.hidden {
                display: none;
            }

            /* Messages */
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            /* Custom scrollbar styling */
            .chat-messages::-webkit-scrollbar {
                width: 0.25rem;
            }

            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }

            .chat-messages::-webkit-scrollbar-thumb {
                background: ${config.theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
                border-radius: 0.125rem;
                transition: background 0.2s ease;
            }

            .chat-messages::-webkit-scrollbar-thumb:hover {
                background: ${config.theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'};
            }

            /* Firefox scrollbar */
            .chat-messages {
                scrollbar-width: thin;
                scrollbar-color: ${config.theme === 'dark' ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.2) transparent'};
            }

            .message {
                padding: 0.75rem 1rem;
                border-radius: 1.125rem;
                font-size: ${CONSTANTS.FONTS.MESSAGE}rem;
                line-height: 1.4;
                word-wrap: break-word;
                animation: slideIn 0.3s ease;
            }

            .message.user {
                align-self: flex-end;
                background: var(--primary);
                color: white;
                border-bottom-right-radius: 4px;
                max-width: 80%;
            }

            .message.bot {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                background: transparent;
                padding: 0;
                border-radius: 0;
            }

            /* Bot avatar in messages */
            .bot-avatar {
                width: ${CONSTANTS.AVATAR.BOT_SIZE}rem;
                height: ${CONSTANTS.AVATAR.BOT_SIZE}rem;
                border-radius: 50%;
                background: var(--light-bg);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${CONSTANTS.AVATAR.BOT_ICON_SIZE}rem;
                flex-shrink: 0;
                overflow: hidden;
                border: 1px solid var(--border);
            }

            .bot-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }

            .bot-avatar .material-icons {
                font-size: ${CONSTANTS.AVATAR.BOT_ICON_SIZE}rem;
                color: var(--text);
                opacity: 0.7;
            }

            /* Bot message content */
            .bot-message-content {
                background: var(--light-bg);
                color: var(--text);
                padding: 0.75rem 1rem;
                border-radius: 1.125rem;
                border-top-left-radius: 0.25rem;
                max-width: 80%;
                word-wrap: break-word;
                line-height: 1.4;
                white-space: pre-line;  
                font-size: ${CONSTANTS.FONTS.MESSAGE}rem;
            }

            .message a {
                color: var(--primary) !important;
                text-decoration: underline !important;
                font-weight: 500 !important;
                word-break: break-all;
            }

            .message a:hover {
                color: var(--secondary) !important;
                text-decoration: underline !important;
            }

            .message.typing .typing-content {
                opacity: 0.7;
                font-style: italic;
            }

            /* Input Area */
            .chat-input-area {
                background: var(--bg);
                padding: 0.75rem;
                border-top: 1px solid var(--border);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .chat-input {
                flex: 1;
                height: auto;
                min-height: ${CONSTANTS.INPUT.MIN_HEIGHT}px;
                max-height: ${CONSTANTS.INPUT.MAX_HEIGHT}px;
                padding: 0.5rem;
                border: none;
                outline: none;
                font-size: ${CONSTANTS.FONTS.INPUT}rem;
                font-family: inherit;
                background: transparent;
                color: var(--text);
                resize: none;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-y: hidden;
                box-sizing: border-box;
            }

            .chat-input::placeholder {
                color: var(--placeholder);
            }

            .chat-send-btn {
                width: 2.5rem;
                height: 2.5rem;
                min-width: 2.5rem;
                border-radius: 50%;
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
                flex-grow: 0;
            }

            .chat-send-btn .material-icons {
                width: 1.5rem;
                height: 1.5rem;
                font-size: 1.5rem;
                display: inline-block;
            }

            .chat-send-btn.active {
                color: var(--primary);
                cursor: pointer;
            }

            .chat-send-btn.active:hover {
                color: var(--secondary);
                transform: scale(1.05);
            }

            .chat-send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            /* Timestamp */
            .timestamp {
                text-align: center;
                color: var(--timestamp);
                font-size: ${CONSTANTS.FONTS.TIMESTAMP}rem;
                margin: 10px 0;
                position: relative;
            }

            .timestamp::before,
            .timestamp::after {
                content: '';
                position: absolute;
                top: 50%;
                width: 30%;
                height: 1px;
                background: var(--border);
            }

            .timestamp::before {
                left: 0;
            }

            .timestamp::after {
                right: 0;
            }

            /* Animations */
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 0.5;
                    transform: scale(1);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                }
            }

            @keyframes statusPulse {
                0%, 100% {
                    opacity: 0.3;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.6;
                    transform: scale(1.2);
                }
            }

            /* Mobile Responsive */
            @media (max-width: 768px), (max-width: 30rem) {
                /* Check if widget is in iframe/embed */
                #chat-widget-container:not(.demo-embedded) {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 2147483647 !important;
                }

                #chat-widget-container:not(.demo-embedded) .chat-toggle {
                    position: fixed !important;
                    bottom: 1.25rem !important;
                    right: 1.25rem !important;
                    top: auto !important;
                    left: auto !important;
                    z-index: 2147483648 !important;
                }

                #chat-widget-container:not(.demo-embedded) .chat-container {
                    position: fixed !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    border-radius: 0 !important;
                    transform: translateY(100%) !important;
                    transition: transform 0.3s ease !important;
                }

                #chat-widget-container:not(.demo-embedded) .chat-container.open {
                    transform: translateY(0) !important;
                }

                /* Hide toggle when chat is open on mobile - basic UX */
                #chat-widget-container.chat-open .chat-toggle {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                /* Embedded mode mobile responsiveness */
                #chat-widget-container.demo-embedded {
                    width: 100% !important;
                    margin: 0 !important;
                }

                #chat-widget-container.demo-embedded .chat-container {
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    border-radius: 0.5rem !important;
                }

                .chat-input-area {
                    padding: 0.75rem;
                    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
                    background: var(--bg);
                    border-top: 1px solid var(--border);
                    position: sticky;
                    bottom: 0;
                }

                .chat-input {
                    min-height: 2.75rem;
                    font-size: 1rem;
                    padding: 0.75rem 0;
                }

                .chat-send-btn {
                    width: 2.75rem;
                    height: 2.75rem;
                    min-width: 2.75rem;
                }
            }

            /* Focus Styles */
            .chat-toggle:focus {
                outline: none;
            }

            .chat-toggle:focus-visible {
                outline: 2px solid rgba(255,255,255,0.5);
                outline-offset: 2px;
            }

            .chat-action-btn:focus,
            .chat-send-btn:focus {
                outline: none;
            }

            .chat-input:focus {
                outline: none;
            }

            /* Reduced Motion */
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }

            /* Box Sizing */
            #chat-widget-container *, 
            #chat-widget-container *::before, 
            #chat-widget-container *::after {
                box-sizing: border-box;
            }
        `;
    };

    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.textContent = createStyles();
    document.head.appendChild(styleElement);

    // ============================================================================
    // DOM CREATION
    // ============================================================================
    
    const createImageWithFallback = (src, alt, fallbackSrc = null) => {
        const img = document.createElement('img');
        img.alt = alt || '';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        
        img.onerror = () => {
            if (fallbackSrc && img.src !== fallbackSrc) {
                img.src = fallbackSrc;
            } else {
                img.style.display = 'none';
                const fallbackIcon = document.createElement('span');
                fallbackIcon.className = 'material-icons';
                fallbackIcon.textContent = 'person';
                img.parentNode?.appendChild(fallbackIcon);
            }
        };
        
        img.src = src;
        return img;
    };

    const createAvatar = (className, showStatus = false, statusValue = 'online') => {
        const avatar = document.createElement('div');
        avatar.className = className;

        if (config.profileIcon) {
            const img = createImageWithFallback(
                config.profileIcon,
                config.clientName,
                config.useLogoAsProfile && config.companyLogo ? config.companyLogo : null
            );
            avatar.appendChild(img);
        } else {
            avatar.innerHTML = '<span class="material-icons">person</span>';
        }

        // Add status indicator if enabled
        if (showStatus && config.showStatus) {
            const statusIndicator = document.createElement('div');
            statusIndicator.className = `status-indicator ${statusValue}`;
            statusIndicator.setAttribute('aria-label', `Status: ${statusValue}`);
            avatar.appendChild(statusIndicator);
        }

        return avatar;
    };

    const createChatWidget = () => {
        const container = document.createElement('div');
        container.id = CONSTANTS.WIDGET.CONTAINER_ID;
        
        if (config.demoMode) {
            container.classList.add(`demo-${config.demoMode}`);
        } else {
            container.className = `pos-${config.position}`;
        }

        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'chat-toggle';
        toggleBtn.setAttribute('aria-label', 'Open chat');
        toggleBtn.setAttribute('aria-expanded', 'false');

        if (config.useLogoAsToggle && config.companyLogo) {
            const logoImg = createImageWithFallback(config.companyLogo, config.clientName);
            toggleBtn.appendChild(logoImg);
        } else {
            toggleBtn.innerHTML = '<span class="material-icons">forum</span>';
        }

        // Chat Container
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';

        // Header
        const header = document.createElement('div');
        header.className = 'chat-header';

        const headerInfo = document.createElement('div');
        headerInfo.className = 'chat-header-info';

        const avatar = createAvatar('chat-avatar', true, config.status);

        const textInfo = document.createElement('div');
        textInfo.className = 'chat-header-text';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        titleDiv.textContent = config.clientName;

        const subtitleDiv = document.createElement('div');
        subtitleDiv.className = 'chat-subtitle';
        subtitleDiv.textContent = config.subtitle;

        textInfo.appendChild(titleDiv);
        textInfo.appendChild(subtitleDiv);

        headerInfo.appendChild(avatar);
        headerInfo.appendChild(textInfo);

        const actions = document.createElement('div');
        actions.className = 'chat-actions';

        if (config.showRefresh) {
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'chat-action-btn';
            refreshBtn.innerHTML = '<span class="material-icons">refresh</span>';
            refreshBtn.setAttribute('aria-label', 'Refresh chat');
            refreshBtn.onclick = () => refreshChat();
            actions.appendChild(refreshBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'chat-action-btn';
        closeBtn.innerHTML = '<span class="material-icons">close</span>';
        closeBtn.setAttribute('aria-label', 'Close chat');
        closeBtn.onclick = () => toggleChat();
        actions.appendChild(closeBtn);

        header.appendChild(headerInfo);
        header.appendChild(actions);

        // Description
        const description = document.createElement('div');
        description.className = 'chat-description';
        description.id = 'chat-description';
        description.textContent = config.description;

        // Messages Area
        const messagesArea = document.createElement('div');
        messagesArea.className = 'chat-messages';
        messagesArea.id = 'chat-messages';

        // Input Area
        const inputArea = document.createElement('div');
        inputArea.className = 'chat-input-area';

        const input = document.createElement('textarea');
        input.className = 'chat-input';
        input.placeholder = config.placeholder;
        input.rows = 1;
        input.id = 'chat-input';

        const sendBtn = document.createElement('button');
        sendBtn.className = 'chat-send-btn';
        sendBtn.innerHTML = '<span class="material-icons">send_outlined</span>';
        sendBtn.setAttribute('aria-label', 'Send message');
        sendBtn.id = 'chat-send-btn';

        inputArea.appendChild(input);
        inputArea.appendChild(sendBtn);

        // Assemble widget
        const chatFragment = document.createDocumentFragment();
        chatFragment.appendChild(header);
        chatFragment.appendChild(description);
        chatFragment.appendChild(messagesArea);
        chatFragment.appendChild(inputArea);

        chatContainer.appendChild(chatFragment);
        container.appendChild(toggleBtn);
        container.appendChild(chatContainer);

        return { container, toggleBtn, chatContainer, messagesArea, input, sendBtn, description };
    };

    // ============================================================================
    // WIDGET FUNCTIONALITY
    // ============================================================================
    
    const { container, toggleBtn, chatContainer, messagesArea, input, sendBtn, description } = createChatWidget();
    
    let isOpen = false;
    let sessionId = null;
    let abortController = null;

    // Generate session ID
    const generateSessionId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${config.clientId}_session_${timestamp}_${random}`;
    };

    // Auto-resize input
    const autoResizeInput = (textarea) => {
        const originalHeight = textarea.offsetHeight;
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        const minHeight = lineHeight + paddingTop + paddingBottom;
        
        if (scrollHeight > minHeight + CONSTANTS.INPUT.TOLERANCE) {
            const newHeight = Math.min(scrollHeight, CONSTANTS.INPUT.MAX_HEIGHT);
            textarea.style.height = newHeight + 'px';
            textarea.style.overflowY = newHeight >= 140 ? 'auto' : 'hidden';
        } else {
            textarea.style.height = minHeight + 'px';
            textarea.style.overflowY = 'hidden';
        }
    };

    // Update send button state
    const updateSendButtonState = () => {
        const iconSpan = sendBtn.querySelector('.material-icons');
        if (input.value.trim()) {
            sendBtn.classList.add('active');
            iconSpan.textContent = 'send';
        } else {
            sendBtn.classList.remove('active');
            iconSpan.textContent = 'send_outlined';
        }
    };

    // Hide/show description
    const updateDescriptionVisibility = () => {
        const hasMessages = messagesArea.children.length > 0;
        description.classList.toggle('hidden', hasMessages);
    };

    // Add message
    const addMessage = (text, isUser = false) => {
        if (isUser) {
            // User message - simple bubble aligned right
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.textContent = text;
            messagesArea.appendChild(messageDiv);
        } else {
            // Bot message - avatar + message bubble layout
            const messageWrapper = document.createElement('div');
            messageWrapper.className = 'message bot';
            
            // Create bot avatar
            const botAvatar = createAvatar('bot-avatar');
            
            // Create message content
            const messageContent = document.createElement('div');
            messageContent.className = 'bot-message-content';
            
            // Auto-detect and convert URLs to clickable links
            messageContent.innerHTML = linkifyText(text);
            
            // Assemble bot message structure
            messageWrapper.appendChild(botAvatar);
            messageWrapper.appendChild(messageContent);
            messagesArea.appendChild(messageWrapper);
        }
        
        messagesArea.scrollTop = messagesArea.scrollHeight;
        updateDescriptionVisibility();
        
        return messagesArea.lastChild;
    };

    // ============================================================================
    // MESSAGE SENDING HELPERS
    // ============================================================================

    const prepareMessage = () => {
        const message = input.value.trim();
        if (!message) return null;

        if (!sessionId) {
            sessionId = generateSessionId();
            addTimestamp();
        }
        return message;
    };

    const displayUserMessage = (message) => {
        addMessage(message, true);
        input.value = '';
        updateSendButtonState();
        autoResizeInput(input);
    };

    const createTypingIndicator = () => {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        
        const typingAvatar = createAvatar('bot-avatar');
        
        const typingContent = document.createElement('div');
        typingContent.className = 'bot-message-content typing-content';
        typingContent.textContent = 'Typing...';
        
        typingDiv.appendChild(typingAvatar);
        typingDiv.appendChild(typingContent);
        messagesArea.appendChild(typingDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        
        return typingDiv;
    };

    const sendRequest = async (message) => {
        abortController = browserSupport.createAbortController();
        
        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-ID': config.clientId,
                'X-Session-ID': sessionId
            },
            body: JSON.stringify({
                message: message,
                client_id: config.clientId,
                session_id: sessionId
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ChatWidget] HTTP ${response.status}: ${response.statusText}`, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    };

    const linkifyText = (text) => {
        return text; // No processing - backend handles all formatting
    };

    const handleSuccessResponse = (data, typingDiv) => {
        // Handle various response formats
        if (data.message && data.message.includes('Error in workflow')) {
            throw new Error('Workflow configuration error');
        }
        
        const botMessage = data.output || data.response || data.message || 
            'I apologize, but I encountered an issue processing your message. Please try again.';
        
        // Convert existing typing indicator to actual message (smooth transition)
        const typingContent = typingDiv.querySelector('.typing-content');
        if (typingContent) {
            const linkifiedText = linkifyText(botMessage);
            
            // Update content and remove typing styles
            typingContent.innerHTML = linkifiedText;
            typingContent.classList.remove('typing-content');
            typingDiv.classList.remove('typing');
        } else {
            // Fallback: remove typing indicator and add new message
            messagesArea.removeChild(typingDiv);
            addMessage(botMessage, false);
        }
    };

    const handleSendError = (error, typingDiv) => {
        if (messagesArea.contains(typingDiv)) {
            messagesArea.removeChild(typingDiv);
        }
        
        if (error.name === 'AbortError') {
            console.log('[ChatWidget] Request was cancelled');
            return;
        }
        
        console.error('[ChatWidget] Error sending message:', error);
        
        let errorMessage = 'I apologize, but I encountered an issue processing your message. Please try again.';
        if (error.message.includes('Workflow configuration error')) {
            errorMessage = 'The chat service is temporarily unavailable. Please contact support directly or try again later.';
        } else if (error.message.includes('HTTP 500')) {
            errorMessage = 'The chat service is experiencing technical difficulties. Please try again in a moment.';
        }
        
        addMessage(errorMessage, false);
    };

    // Send message - Simplified main function
    const sendMessage = async () => {
        const message = prepareMessage();
        if (!message) return;
        
        displayUserMessage(message);
        const typingIndicator = createTypingIndicator();
        
        try {
            const data = await sendRequest(message);
            handleSuccessResponse(data, typingIndicator);
        } catch (error) {
            handleSendError(error, typingIndicator);
        }
    };

    // Add timestamp
    const addTimestamp = () => {
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = 'Today';
        messagesArea.appendChild(timestamp);
    };

    // Toggle chat
    const toggleChat = () => {
        isOpen = !isOpen;
        chatContainer.classList.toggle('open', isOpen);
        container.classList.toggle('chat-open', isOpen);
        toggleBtn.setAttribute('aria-expanded', isOpen.toString());
        
        // Smooth content transition - avoid jarring recreation
        const currentIcon = toggleBtn.querySelector('.material-icons');
        const currentImg = toggleBtn.querySelector('img');
        
        if (isOpen) {
            // Animate to close icon
            if (currentIcon) {
                currentIcon.textContent = 'close';
            } else if (currentImg) {
                // Replace logo with close icon
                toggleBtn.innerHTML = '<span class="material-icons">close</span>';
            }
            toggleBtn.setAttribute('aria-label', 'Close chat');
            
            // Focus input after transition completes
            setTimeout(() => {
                if (isOpen) input.focus();
            }, 200);
        } else {
            // Animate back to original state
            if (config.useLogoAsToggle && config.companyLogo) {
                if (currentIcon) {
                    // Replace close icon with logo
                    const logoImg = createImageWithFallback(config.companyLogo, config.clientName);
                    toggleBtn.innerHTML = '';
                    toggleBtn.appendChild(logoImg);
                }
            } else {
                if (currentIcon) {
                    currentIcon.textContent = 'forum';
                }
            }
            toggleBtn.setAttribute('aria-label', 'Open chat');
            toggleBtn.focus();
        }
    };

    // Refresh chat
    const refreshChat = () => {
        messagesArea.innerHTML = '';
        sessionId = null;
        updateDescriptionVisibility();
        input.focus();
    };

    // Update status indicator
    const updateStatus = (newStatus) => {
        if (!config.showStatus) return;
        
        const statusIndicator = container.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${newStatus}`;
            statusIndicator.setAttribute('aria-label', `Status: ${newStatus}`);
            config.status = newStatus;
        }
    };

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================
    
    toggleBtn.addEventListener('click', toggleChat);
    
    sendBtn.addEventListener('click', sendMessage);
    
    input.addEventListener('input', () => {
        autoResizeInput(input);
        updateSendButtonState();
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        if (e.key === 'Escape') {
            if (isOpen) toggleChat();
        }
    });

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    // Wait for fonts to load
    document.fonts.ready.then(() => {
        toggleBtn.classList.add('fonts-loaded');
    });

    // Auto-open if configured
    if (config.demoMode === 'embedded') {
        // Embedded mode: show immediately without toggle
        chatContainer.classList.add('open');
        container.classList.add('chat-open');
        isOpen = true;
        // Focus input after a short delay to ensure DOM is ready
        setTimeout(() => {
            input.focus();
        }, 100);
    } else if (config.autoOpen) {
        setTimeout(() => {
            toggleChat();
        }, 500);
    }

    // Detect if we're in an iframe/embed environment
    const isInIframe = window !== window.top;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // For mobile in iframe, try to break out to parent if possible
    if (isInIframe && isMobile && config.demoMode !== 'embedded') {
        try {
            // Try to append to parent window's body (if same origin)
            if (window.parent && window.parent.document && window.parent.document.body) {
                window.parent.document.body.appendChild(container);
                console.log('[ChatWidget] Attached to parent window for mobile');
            } else {
                document.body.appendChild(container);
                console.log('[ChatWidget] Could not access parent, using iframe body');
            }
        } catch (e) {
            // Cross-origin restriction, fallback to iframe body
            document.body.appendChild(container);
            console.log('[ChatWidget] Cross-origin iframe, using iframe body');
        }
    } else if (config.demoMode === 'embedded') {
        // For embedded mode, append to the script's parent element
        const script = document.currentScript || document.querySelector('script[data-client-id]');
        const parentContainer = script?.parentElement;
        if (parentContainer) {
            parentContainer.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    } else {
        document.body.appendChild(container);
    }
    console.log('[ChatWidget] Initialization complete');

})();