/**
 * Noor Theme - Main JavaScript File
 * Author: Noor Design Team
 * Version: 1.0.0
 */

(function() {
    'use strict';

    // Theme Configuration
    const CONFIG = {
        animationDuration: 300,
        debounceDelay: 250,
        apiTimeout: 5000,
        maxRetries: 3,
        lazyLoadOffset: 100,
        cartUpdateDelay: 1500
    };

    // DOM Elements Cache
    const DOM = {
        body: document.body,
        header: null,
        cart: null,
        searchForm: null,
        themeToggle: null,
        backToTop: null
    };

    // State Management
    const state = {
        currentTheme: localStorage.getItem('theme') || 'light',
        cartItems: JSON.parse(localStorage.getItem('cartItems')) || [],
        wishlistItems: JSON.parse(localStorage.getItem('wishlistItems')) || [],
        recentlyViewed: JSON.parse(localStorage.getItem('recentlyViewed')) || [],
        searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [],
        isLoading: false,
        scrollPosition: 0
    };

    // Utility Functions
    const utils = {
        // Debounce function
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Format currency
        formatCurrency(amount, currency = 'SAR') {
            return new Intl.NumberFormat('ar-SA', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0
            }).format(amount);
        },

        // Format date
        formatDate(date, options = {}) {
            const defaultOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return new Intl.DateTimeFormat('ar-SA', { ...defaultOptions, ...options }).format(new Date(date));
        },

        // Generate unique ID
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        // Cookie management
        setCookie(name, value, days = 30) {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
        },

        getCookie(name) {
            return document.cookie.split('; ').reduce((r, v) => {
                const parts = v.split('=');
                return parts[0] === name ? decodeURIComponent(parts[1]) : r;
            }, '');
        },

        // Local storage with error handling
        setStorage(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Local storage unavailable:', e);
                return false;
            }
        },

        getStorage(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Error reading from local storage:', e);
                return defaultValue;
            }
        },

        // Validate email
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Validate phone number (Saudi format)
        isValidPhone(phone) {
            const phoneRegex = /^(\+966|0)?[5-9]\d{8}$/;
            return phoneRegex.test(phone.replace(/\s+/g, ''));
        }
    };

    // Theme Management
    const themeManager = {
        init() {
            this.applyTheme(state.currentTheme);
            this.bindEvents();
            this.detectSystemTheme();
        },

        applyTheme(theme) {
            DOM.body.setAttribute('data-theme', theme);
            state.currentTheme = theme;
            utils.setStorage('theme', theme);
            
            // Update theme toggle button
            const toggleBtn = document.querySelector('[data-theme-toggle]');
            if (toggleBtn) {
                toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
                toggleBtn.title = theme === 'dark' ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي';
            }
        },

        toggleTheme() {
            const newTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
        },

        detectSystemTheme() {
            if (window.matchMedia && !utils.getStorage('theme')) {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.applyTheme(prefersDark ? 'dark' : 'light');
            }
        },

        bindEvents() {
            // Theme toggle button
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-theme-toggle]')) {
                    this.toggleTheme();
                }
            });

            // System theme change detection
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (!utils.getStorage('theme')) {
                        this.applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        }
    };

    // Cart Management
    const cartManager = {
        init() {
            this.updateCartUI();
            this.bindEvents();
        },

        addItem(product, quantity = 1) {
            const existingItem = state.cartItems.find(item => item.id === product.id);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                state.cartItems.push({
                    ...product,
                    quantity,
                    addedAt: Date.now()
                });
            }

            this.saveCart();
            this.updateCartUI();
            this.showNotification('تمت إضافة المنتج للسلة', 'success');
            
            // Analytics tracking
            analytics.trackEvent('add_to_cart', {
                product_id: product.id,
                product_name: product.name,
                quantity: quantity,
                price: product.price
            });
        },

        removeItem(productId) {
            state.cartItems = state.cartItems.filter(item => item.id !== productId);
            this.saveCart();
            this.updateCartUI();
            this.showNotification('تمت إزالة المنتج من السلة', 'info');
        },

        updateQuantity(productId, quantity) {
            const item = state.cartItems.find(item => item.id === productId);
            if (item) {
                if (quantity <= 0) {
                    this.removeItem(productId);
                } else {
                    item.quantity = quantity;
                    this.saveCart();
                    this.updateCartUI();
                }
            }
        },

        getTotal() {
            return state.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        },

        getItemCount() {
            return state.cartItems.reduce((count, item) => count + item.quantity, 0);
        },

        saveCart() {
            utils.setStorage('cartItems', state.cartItems);
        },

        updateCartUI() {
            const cartCountElements = document.querySelectorAll('[data-cart-count]');
            const cartTotalElements = document.querySelectorAll('[data-cart-total]');
            
            const itemCount = this.getItemCount();
            const total = this.getTotal();

            cartCountElements.forEach(el => {
                el.textContent = itemCount;
                el.style.display = itemCount > 0 ? 'inline' : 'none';
            });

            cartTotalElements.forEach(el => {
                el.textContent = utils.formatCurrency(total);
            });
        },

        showNotification(message, type = 'info') {
            notificationManager.show(message, type);
        },

        bindEvents() {
            // Add to cart buttons
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-add-to-cart]')) {
                    e.preventDefault();
                    const productData = JSON.parse(e.target.dataset.productData || '{}');
                    const quantity = parseInt(e.target.dataset.quantity || '1');
                    
                    if (productData.id) {
                        this.addItem(productData, quantity);
                    }
                }
            });
        }
    };

    // Wishlist Management
    const wishlistManager = {
        init() {
            this.updateWishlistUI();
            this.bindEvents();
        },

        addItem(product) {
            if (!this.hasItem(product.id)) {
                state.wishlistItems.push({
                    ...product,
                    addedAt: Date.now()
                });
                this.saveWishlist();
                this.updateWishlistUI();
                this.showNotification('تمت إضافة المنتج للمفضلة', 'success');
            }
        },

        removeItem(productId) {
            state.wishlistItems = state.wishlistItems.filter(item => item.id !== productId);
            this.saveWishlist();
            this.updateWishlistUI();
            this.showNotification('تمت إزالة المنتج من المفضلة', 'info');
        },

        toggleItem(product) {
            if (this.hasItem(product.id)) {
                this.removeItem(product.id);
                return false;
            } else {
                this.addItem(product);
                return true;
            }
        },

        hasItem(productId) {
            return state.wishlistItems.some(item => item.id === productId);
        },

        saveWishlist() {
            utils.setStorage('wishlistItems', state.wishlistItems);
        },

        updateWishlistUI() {
            const wishlistButtons = document.querySelectorAll('[data-wishlist-toggle]');
            
            wishlistButtons.forEach(button => {
                const productId = button.dataset.productId;
                const isInWishlist = this.hasItem(productId);
                
                button.classList.toggle('active', isInWishlist);
                button.querySelector('.wishlist-icon').textContent = isInWishlist ? '♥' : '♡';
            });
        },

        showNotification(message, type = 'info') {
            notificationManager.show(message, type);
        },

        bindEvents() {
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-wishlist-toggle]') || e.target.closest('[data-wishlist-toggle]')) {
                    e.preventDefault();
                    const button = e.target.closest('[data-wishlist-toggle]') || e.target;
                    const productData = JSON.parse(button.dataset.productData || '{}');
                    
                    if (productData.id) {
                        this.toggleItem(productData);
                    }
                }
            });
        }
    };

    // Search Functionality
    const searchManager = {
        init() {
            this.bindEvents();
            this.setupAutoComplete();
        },

        performSearch(query, filters = {}) {
            if (!query.trim()) return;

            // Add to search history
            this.addToHistory(query);

            // Show loading state
            this.showLoadingState();

            // Simulate API call (replace with actual API)
            setTimeout(() => {
                this.hideLoadingState();
                // Handle search results
                console.log('Search for:', query, 'with filters:', filters);
            }, 1000);
        },

        addToHistory(query) {
            if (!state.searchHistory.includes(query)) {
                state.searchHistory.unshift(query);
                state.searchHistory = state.searchHistory.slice(0, 10); // Keep last 10 searches
                utils.setStorage('searchHistory', state.searchHistory);
            }
        },

        showLoadingState() {
            const searchButtons = document.querySelectorAll('[data-search-submit]');
            searchButtons.forEach(btn => {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading"></span> جاري البحث...';
            });
        },

        hideLoadingState() {
            const searchButtons = document.querySelectorAll('[data-search-submit]');
            searchButtons.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = 'بحث';
            });
        },

        setupAutoComplete() {
            const searchInputs = document.querySelectorAll('[data-search-input]');
            
            searchInputs.forEach(input => {
                const dropdown = this.createAutoCompleteDropdown(input);
                
                input.addEventListener('input', utils.debounce((e) => {
                    const query = e.target.value.trim();
                    if (query.length >= 2) {
                        this.updateAutoComplete(dropdown, query);
                    } else {
                        dropdown.style.display = 'none';
                    }
                }, CONFIG.debounceDelay));
            });
        },

        createAutoCompleteDropdown(input) {
            const dropdown = document.createElement('div');
            dropdown.className = 'search-autocomplete';
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                display: none;
                max-height: 300px;
                overflow-y: auto;
            `;
            
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(dropdown);
            
            return dropdown;
        },

        updateAutoComplete(dropdown, query) {
            // Mock suggestions (replace with actual API call)
            const suggestions = [
                `${query} - منتجات`,
                `${query} - عطور`,
                `${query} - ساعات`,
                `${query} - إكسسوارات`
            ];

            dropdown.innerHTML = suggestions.map(suggestion => 
                `<div class="autocomplete-item" style="padding: 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                    ${suggestion}
                </div>`
            ).join('');

            dropdown.style.display = 'block';

            // Handle clicks
            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    const input = dropdown.parentNode.querySelector('[data-search-input]');
                    input.value = item.textContent.split(' - ')[0];
                    dropdown.style.display = 'none';
                    this.performSearch(input.value);
                });
            });
        },

        bindEvents() {
            // Search form submission
            document.addEventListener('submit', (e) => {
                if (e.target.matches('[data-search-form]')) {
                    e.preventDefault();
                    const query = e.target.querySelector('[data-search-input]').value;
                    this.performSearch(query);
                }
            });

            // Hide autocomplete on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-autocomplete')) {
                    document.querySelectorAll('.search-autocomplete').forEach(dropdown => {
                        dropdown.style.display = 'none';
                    });
                }
            });
        }
    };

    // Notification Manager
    const notificationManager = {
        show(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            
            // Styles
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 400px;
                word-wrap: break-word;
            `;

            // Type-specific colors
            const colors = {
                info: '#17A2B8',
                success: '#28A745',
                warning: '#FFC107',
                error: '#DC3545'
            };
            
            notification.style.backgroundColor = colors[type] || colors.info;

            document.body.appendChild(notification);

            // Animate in
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);

            // Remove after duration
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);

            return notification;
        }
    };

    // Lazy Loading
    const lazyLoadManager = {
        init() {
            this.setupIntersectionObserver();
            this.loadImagesInViewport();
        },

        setupIntersectionObserver() {
            if ('IntersectionObserver' in window) {
                this.observer = new IntersectionObserver(
                    this.handleIntersection.bind(this),
                    {
                        root: null,
                        rootMargin: `${CONFIG.lazyLoadOffset}px`,
                        threshold: 0.1
                    }
                );

                this.observeImages();
            } else {
                // Fallback for older browsers
                this.loadAllImages();
            }
        },

        handleIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        },

        observeImages() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => this.observer.observe(img));
        },

        loadImage(img) {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('loaded');
            }
        },

        loadImagesInViewport() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                const rect = img.getBoundingClientRect();
                if (rect.top < window.innerHeight + CONFIG.lazyLoadOffset) {
                    this.loadImage(img);
                }
            });
        },

        loadAllImages() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => this.loadImage(img));
        }
    };

    // Scroll Management
    const scrollManager = {
        init() {
            this.createBackToTopButton();
            this.bindEvents();
        },

        createBackToTopButton() {
            const button = document.createElement('button');
            button.innerHTML = '↑';
            button.className = 'back-to-top';
            button.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 30px;
                width: 50px;
                height: 50px;
                border: none;
                border-radius: 50%;
                background: var(--primary-color);
                color: white;
                font-size: 20px;
                cursor: pointer;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            `;

            button.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            document.body.appendChild(button);
            DOM.backToTop = button;
        },

        updateBackToTopButton() {
            const scrolled = window.pageYOffset;
            const shouldShow = scrolled > 300;

            if (DOM.backToTop) {
                DOM.backToTop.style.opacity = shouldShow ? '1' : '0';
                DOM.backToTop.style.visibility = shouldShow ? 'visible' : 'hidden';
            }
        },

        bindEvents() {
            window.addEventListener('scroll', utils.throttle(() => {
                state.scrollPosition = window.pageYOffset;
                this.updateBackToTopButton();
            }, 100));
        }
    };

    // Analytics
    const analytics = {
        init() {
            this.setupPageTracking();
            this.trackUserEngagement();
        },

        trackEvent(eventName, properties = {}) {
            // Replace with actual analytics service (Google Analytics, etc.)
            console.log('Analytics Event:', eventName, properties);
            
            // Send to analytics service
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, properties);
            }
        },

        trackPageView(page = window.location.pathname) {
            this.trackEvent('page_view', {
                page_location: window.location.href,
                page_title: document.title
            });
        },

        setupPageTracking() {
            // Track initial page load
            this.trackPageView();

            // Track page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.trackEvent('page_visible');
                } else {
                    this.trackEvent('page_hidden');
                }
            });
        },

        trackUserEngagement() {
            let timeOnPage = 0;
            const startTime = Date.now();

            setInterval(() => {
                timeOnPage += 1;
            }, 1000);

            window.addEventListener('beforeunload', () => {
                this.trackEvent('time_on_page', {
                    duration: Math.round((Date.now() - startTime) / 1000),
                    page: window.location.pathname
                });
            });
        }
    };

    // Form Validation
    const formValidator = {
        init() {
            this.bindEvents();
        },

        validateForm(form) {
            const fields = form.querySelectorAll('[required]');
            let isValid = true;
            const errors = [];

            fields.forEach(field => {
                const value = field.value.trim();
                const fieldName = field.name || field.id;
                
                // Required field validation
                if (!value) {
                    isValid = false;
                    errors.push(`${fieldName} مطلوب`);
                    this.showFieldError(field, `هذا الحقل مطلوب`);
                    return;
                }

                // Email validation
                if (field.type === 'email' && !utils.isValidEmail(value)) {
                    isValid = false;
                    errors.push(`${fieldName} غير صحيح`);
                    this.showFieldError(field, 'البريد الإلكتروني غير صحيح');
                }

                // Phone validation
                if (field.type === 'tel' && !utils.isValidPhone(value)) {
                    isValid = false;
                    errors.push(`${fieldName} غير صحيح`);
                    this.showFieldError(field, 'رقم الهاتف غير صحيح');
                }

                // Clear previous errors if field is valid
                if (isValid) {
                    this.clearFieldError(field);
                }
            });

            return { isValid, errors };
        },

        showFieldError(field, message) {
            this.clearFieldError(field);
            
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = message;
            errorElement.style.cssText = `
                color: var(--danger-color);
                font-size: 14px;
                margin-top: 4px;
            `;

            field.parentNode.appendChild(errorElement);
            field.style.borderColor = 'var(--danger-color)';
        },

        clearFieldError(field) {
            const errorElement = field.parentNode.querySelector('.field-error');
            if (errorElement) {
                errorElement.remove();
            }
            field.style.borderColor = '';
        },

        bindEvents() {
            document.addEventListener('submit', (e) => {
                const form = e.target;
                if (form.hasAttribute('data-validate')) {
                    e.preventDefault();
                    
                    const validation = this.validateForm(form);
                    if (validation.isValid) {
                        // Form is valid, proceed with submission
                        console.log('Form is valid, submitting...');
                        // Add your form submission logic here
                    } else {
                        notificationManager.show('يرجى تصحيح الأخطاء في النموذج', 'error');
                    }
                }
            });

            // Real-time validation
            document.addEventListener('blur', (e) => {
                if (e.target.hasAttribute('required')) {
                    const form = e.target.closest('form[data-validate]');
                    if (form) {
                        this.validateForm(form);
                    }
                }
            }, true);
        }
    };

    // Main Initialization
    function init() {
        // Cache DOM elements
        DOM.header = document.querySelector('header');
        DOM.cart = document.querySelector('[data-cart]');
        
        // Initialize managers
        themeManager.init();
        cartManager.init();
        wishlistManager.init();
        searchManager.init();
        lazyLoadManager.init();
        scrollManager.init();
        analytics.init();
        formValidator.init();

        // Set up global event listeners
        setupGlobalEvents();

        // Mark as initialized
        DOM.body.classList.add('noor-initialized');
        
        console.log('Noor Theme initialized successfully');
    }

    function setupGlobalEvents() {
        // Smooth scrolling for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        // Handle loading states
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-loading]')) {
                const button = e.target;
                const originalText = button.textContent;
                
                button.disabled = true;
                button.innerHTML = '<span class="loading"></span> جاري التحميل...';
                
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = originalText;
                }, CONFIG.cartUpdateDelay);
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API
    window.NoorTheme = {
        utils,
        cartManager,
        wishlistManager,
        searchManager,
        notificationManager,
        themeManager,
        analytics,
        CONFIG,
        state
    };

})();