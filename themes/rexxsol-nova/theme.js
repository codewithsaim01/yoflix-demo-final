document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const desktop = window.matchMedia('(min-width: 1025px)');
    const previewTheme = document.body.dataset.previewTheme;

    // Keep admins inside the theme they are previewing.
    if (previewTheme) {
        document.querySelectorAll('a[href]').forEach((link) => {
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.hash || url.pathname.startsWith('/admin')) return;
            if (!url.searchParams.has('theme')) url.searchParams.set('theme', previewTheme);
            link.href = url.toString();
        });
    }

    /* ---------- Auto reveal: animate blocks that the templates did not mark ---------- */
    // Inner-page heroes get the word-by-word heading; cards, lists and footer columns
    // fade up on scroll, staggered across siblings. The home hero has its own entrance.
    document.querySelectorAll('.nova-page-hero h1:not([data-split])').forEach((title) => { title.dataset.split = ''; });
    const autoReveal = [
        '.nova-page-hero-inner > :not(h1):not(.nova-enter)',
        '.nova-sd-card', '.nova-sd-aside', '.nova-so-grid > li',
        '.nova-faq-group-title', '.nova-faq', '.nova-faq-support-head', '.nova-faq-support-grid > *',
        '.nova-offices-grid > *', '.nova-founder-copy', '.nova-mv', '.nova-values-intro', '.nova-vision-head', '.nova-vision-statement',
        '.nova-article', '.nova-plan-included',
        '.nova-footer-brand', '.nova-footer section', '.nova-footer-bottom',
    ].join(', ');
    const staggerIndex = new Map();
    document.querySelectorAll(autoReveal).forEach((element) => {
        if (element.hasAttribute('data-reveal') || element.parentElement?.closest('[data-reveal], .nova-mh')) return;
        const parent = element.parentElement;
        const index = staggerIndex.get(parent) || 0;
        staggerIndex.set(parent, index + 1);
        element.dataset.reveal = '';
        if (!element.style.getPropertyValue('--delay')) element.style.setProperty('--delay', `${Math.min(index, 5) * 80}ms`);
    });

    /* ---------- Split headings into masked words ---------- */
    const splitWords = (root) => {
        let index = 0;
        const walk = (node) => {
            [...node.childNodes].forEach((child) => {
                if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return; }
                if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) return;
                const fragment = document.createDocumentFragment();
                child.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(' ')); return; }
                    const outer = document.createElement('span');
                    const inner = document.createElement('span');
                    outer.className = 'nova-w';
                    inner.style.setProperty('--i', String(index++));
                    inner.textContent = part;
                    outer.append(inner);
                    fragment.append(outer);
                });
                child.replaceWith(fragment);
            });
        };
        root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
        walk(root);
        [...root.children].forEach((child) => child.setAttribute('aria-hidden', 'true'));
    };
    if (!reduceMotion) {
        document.querySelectorAll('[data-split]').forEach(splitWords);
        document.querySelector('.nova-mh-title, .nova-page-hero h1')?.style.setProperty('--split-delay', '250ms');
    }

    /* ---------- Reveal on scroll ---------- */
    const revealTargets = [...document.querySelectorAll('[data-reveal], [data-split]')];
    const reveal = (target) => target.classList.add('is-visible');
    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealTargets.forEach(reveal);
    } else {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
                reveal(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
        revealTargets.forEach((target) => observer.observe(target));
    }

    /* ---------- Pricing: Monthly / Yearly switch ---------- */
    document.querySelectorAll('[data-plan-billing]').forEach((section) => {
        const buttons = [...section.querySelectorAll('[data-plan-period]')];
        buttons.forEach((button) => button.addEventListener('click', () => {
            const period = button.dataset.planPeriod;
            section.dataset.planBilling = period;
            buttons.forEach((other) => {
                other.classList.toggle('is-active', other === button);
                other.setAttribute('aria-pressed', String(other === button));
            });
            // Plans without a yearly price keep showing their monthly price.
            section.querySelectorAll('.nova-plan-amount').forEach((amount) => {
                const hasPeriod = amount.querySelector(`[data-plan-price="${period}"]`);
                amount.querySelectorAll('[data-plan-price]').forEach((price) => {
                    price.hidden = hasPeriod ? price.dataset.planPrice !== period : price.dataset.planPrice !== 'monthly';
                });
            });
        }));
    });

    /* ---------- Count up headline figures once they scroll into view ---------- */
    // Only plain numbers with an optional suffix ("28+", "3,135+", "100%", "3×") animate; anything else
    // ("24/7") is left alone, and the final text is always restored exactly as authored.
    const counters = [...document.querySelectorAll('.nova-why-stat, .nova-gl-stats b')]
        .map((element) => ({ element, text: element.textContent.trim(), match: element.textContent.trim().match(/^(\d{1,3}(?:,\d{3})*|\d+)(\D{0,2})$/) }))
        .filter((counter) => counter.match);
    if (!reduceMotion && counters.length && 'IntersectionObserver' in window) {
        const run = ({ element, text, match }) => {
            const target = Number(match[1].replace(/,/g, ''));
            const grouped = match[1].includes(',');
            const started = performance.now();
            const tick = (now) => {
                const progress = Math.min(1, (now - started) / 1400);
                const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
                element.textContent = progress < 1 ? (grouped ? value.toLocaleString('en-US') : value) + match[2] : text;
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        const countObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                countObserver.unobserve(entry.target);
                run(counters.find((counter) => counter.element === entry.target));
            });
        }, { threshold: 0.6 });
        counters.forEach((counter) => countObserver.observe(counter.element));
    }

    /* ---------- Header: elevation, hide on scroll down, menus ---------- */
    const header = document.querySelector('.theme-rexxsol-nova [data-nova-header]');
    const mobileMenu = header?.querySelector('[data-nova-menu]');
    const groups = header ? [...header.querySelectorAll('.nova-nav-group')] : [];
    const parallaxItems = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax]')];
    let lastY = window.scrollY;
    let frame = 0;

    const onFrame = () => {
        frame = 0;
        const y = window.scrollY;
        if (header) {
            header.classList.toggle('is-scrolled', y > 8);
            const menuOpen = mobileMenu?.open || groups.some((group) => group.open);
            if (!menuOpen && y > 240 && y > lastY + 4) header.classList.add('is-hidden');
            else if (y < lastY - 4 || y <= 240) header.classList.remove('is-hidden');
        }
        lastY = y;
        if (parallaxItems.length && desktop.matches) {
            const middle = window.innerHeight / 2;
            parallaxItems.forEach((item) => {
                const box = (item.parentElement || item).getBoundingClientRect();
                if (box.bottom < -200 || box.top > window.innerHeight + 200) return;
                const offset = (box.top + box.height / 2 - middle) * parseFloat(item.dataset.parallax || '0');
                item.style.translate = `0 ${offset.toFixed(1)}px`;
            });
        }
    };
    const requestFrame = () => { if (!frame) frame = window.requestAnimationFrame(onFrame); };
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', requestFrame, { passive: true });
    desktop.addEventListener('change', () => {
        if (!desktop.matches) parallaxItems.forEach((item) => { item.style.translate = ''; });
        if (desktop.matches && mobileMenu) mobileMenu.open = false;
        requestFrame();
    });
    onFrame();

    groups.forEach((group) => {
        const summary = group.querySelector(':scope > summary');
        const sync = () => summary?.setAttribute('aria-expanded', String(group.open));
        group.addEventListener('toggle', sync);
        group.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse' && desktop.matches) group.open = true; });
        group.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse' && desktop.matches && !group.contains(document.activeElement)) group.open = false; });
        group.addEventListener('focusout', (event) => { if (!group.contains(event.relatedTarget)) group.open = false; });
        sync();
    });

    if (mobileMenu) {
        const summary = mobileMenu.querySelector(':scope > summary');
        const sync = () => {
            summary?.setAttribute('aria-expanded', String(mobileMenu.open));
            summary?.setAttribute('aria-label', mobileMenu.open ? 'Close navigation menu' : 'Open navigation menu');
            document.documentElement.style.overflow = mobileMenu.open ? 'hidden' : '';
            header.classList.remove('is-hidden');
        };
        mobileMenu.addEventListener('toggle', sync);
        sync();
    }

    document.addEventListener('click', (event) => {
        groups.forEach((group) => { if (!group.contains(event.target)) group.open = false; });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const open = groups.find((group) => group.open) || (mobileMenu?.open ? mobileMenu : null);
        if (!open) return;
        open.open = false;
        open.querySelector(':scope > summary')?.focus();
    });

    /* ---------- Smooth (inertia) scrolling ---------- */
    // Wheel input eases toward its target instead of jumping. Mouse/trackpad on desktop only;
    // touch, keyboard, scrollbar dragging and pinch-zoom stay native.
    const smooth = (() => {
        const enabled = !reduceMotion && finePointer;
        let target = window.scrollY;
        let current = window.scrollY;
        let running = false;
        let ease = 0.1;
        const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
        const stop = () => { running = false; };
        const step = () => {
            if (!running) return;
            current += (target - current) * ease;
            if (Math.abs(target - current) < 0.5) { current = target; running = false; }
            window.scrollTo({ top: current, behavior: 'instant' });
            if (running) window.requestAnimationFrame(step);
        };
        const to = (top, speed = 0.1) => {
            if (!enabled) { window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
            if (!running) current = window.scrollY;
            target = Math.max(0, Math.min(top, maxScroll()));
            ease = speed;
            if (!running) { running = true; window.requestAnimationFrame(step); }
        };
        // Let inner scroll areas (menus, textareas, overflow panels) keep the wheel.
        const scrollsItself = (node, deltaY) => {
            for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
                if (!(el instanceof Element)) continue;
                const { overflowY } = getComputedStyle(el);
                if (!/(auto|scroll)/.test(overflowY) || el.scrollHeight <= el.clientHeight) continue;
                if ((deltaY < 0 && el.scrollTop > 0) || (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight)) return true;
            }
            return false;
        };
        if (enabled) {
            window.addEventListener('wheel', (event) => {
                if (event.ctrlKey || event.defaultPrevented || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
                if (document.documentElement.style.overflow === 'hidden' || scrollsItself(event.target, event.deltaY)) return;
                const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerHeight : 1;
                event.preventDefault();
                to((running ? target : window.scrollY) + event.deltaY * unit, 0.1);
            }, { passive: false });
            ['pointerdown', 'keydown', 'touchstart'].forEach((type) => window.addEventListener(type, stop, { passive: true }));
        }
        return { to };
    })();

    // Same-page anchor links glide to their section, clear of the fixed header.
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href*="#"]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        const url = new URL(link.href, window.location.href);
        if (url.pathname !== window.location.pathname || !url.hash || url.hash === '#') return;
        const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!section) return;
        event.preventDefault();
        const offset = header ? header.getBoundingClientRect().height + 16 : 16;
        smooth.to(section.getBoundingClientRect().top + window.scrollY - offset, 0.08);
        history.pushState(null, '', url.hash);
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-nova-back-to-top]')) return;
        smooth.to(0, 0.08);
    });

    /* ---------- Hero card: gentle 3D tilt toward the cursor ---------- */
    const hubVisual = document.querySelector('.nova-mh-visual');
    const hub = hubVisual?.querySelector('.nova-hub');
    if (hub && finePointer && !reduceMotion) {
        hubVisual.addEventListener('pointermove', (event) => {
            if (!desktop.matches) return;
            const box = hubVisual.getBoundingClientRect();
            const x = ((event.clientX - box.left) / box.width) * 2 - 1;
            const y = ((event.clientY - box.top) / box.height) * 2 - 1;
            const angle = Math.min(Math.hypot(x, y), 1) * 6;
            hub.style.rotate = `${(-y).toFixed(3)} ${x.toFixed(3)} 0 ${angle.toFixed(2)}deg`;
        });
        hubVisual.addEventListener('pointerleave', () => { hub.style.rotate = ''; });
    }

    /* ---------- Page transitions ---------- */
    const curtain = document.querySelector('.nova-curtain');
    if (curtain && !reduceMotion) {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (link.target && link.target !== '_self') return;
            if (link.hasAttribute('download')) return;
            const url = new URL(link.href, window.location.href);
            // Pages opened from disk (a static copy) report different "origins" for the same folder; treat them as one site.
            const sameSite = url.protocol === 'file:' ? window.location.protocol === 'file:' : url.origin === window.location.origin;
            if (!sameSite || url.pathname.startsWith('/admin') || /^(mailto|tel):/.test(link.getAttribute('href') || '')) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;
            event.preventDefault();
            if (mobileMenu) mobileMenu.open = false;
            curtain.classList.add('is-active');
            window.setTimeout(() => { window.location.href = url.href; }, 360);
        });
        window.addEventListener('pageshow', (event) => { if (event.persisted) curtain.classList.remove('is-active'); });
    }

    /* ---------- Magnetic buttons & project cursor (fine pointers only) ---------- */
    if (finePointer && !reduceMotion) {
        document.querySelectorAll('[data-magnetic]').forEach((element) => {
            element.style.transition = 'translate .6s cubic-bezier(.22, 1, .36, 1)';
            element.addEventListener('pointermove', (event) => {
                const box = element.getBoundingClientRect();
                const x = (event.clientX - box.left - box.width / 2) * 0.18;
                const y = (event.clientY - box.top - box.height / 2) * 0.3;
                element.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
            });
            element.addEventListener('pointerleave', () => { element.style.translate = ''; });
        });

        const cursor = document.querySelector('[data-nova-cursor]');
        const label = cursor?.querySelector('span');
        if (cursor && document.querySelector('[data-cursor]')) {
            let x = 0; let y = 0; let cx = 0; let cy = 0; let running = false;
            const follow = () => {
                cx += (x - cx) * 0.2;
                cy += (y - cy) * 0.2;
                cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
                running = Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1;
                if (running) window.requestAnimationFrame(follow);
            };
            window.addEventListener('pointermove', (event) => {
                x = event.clientX; y = event.clientY;
                if (!running) { running = true; window.requestAnimationFrame(follow); }
            }, { passive: true });
            document.addEventListener('pointerover', (event) => {
                const target = event.target.closest('[data-cursor]');
                cursor.classList.toggle('is-active', Boolean(target));
                if (target && label) label.textContent = target.dataset.cursor;
            });
        }
    }

    /* ---------- Services page filter tabs ---------- */
    const serviceFilter = document.querySelector('[data-service-filter]');
    const serviceGrid = document.querySelector('[data-service-grid]');
    if (serviceFilter && serviceGrid) {
        const cards = [...serviceGrid.children];
        const empty = document.querySelector('[data-service-empty]');
        const descriptions = [...document.querySelectorAll('[data-category-description]')];
        // "All Services" shows one card per category; a category tab shows that category's service cards.
        const categoryGrid = document.querySelector('[data-category-grid]');
        const tabFor = (slug) => [...serviceFilter.querySelectorAll('button[data-filter]')].find((tab) => tab.dataset.filter === slug);
        const applyFilter = (button, { updateUrl = true } = {}) => {
            const filter = button.dataset.filter;
            // The selected category's CMS description shows under the tabs.
            descriptions.forEach((text) => { text.hidden = text.dataset.categoryDescription !== filter; });
            // Each category has its own link (/services?category=slug), so a tab can be shared or bookmarked.
            if (updateUrl && window.history?.replaceState) {
                const url = new URL(window.location.href);
                if (filter === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', filter);
                // Some browsers refuse this on pages opened from disk; the tab still switches.
                try { window.history.replaceState(window.history.state, '', url); } catch { /* address stays as it is */ }
            }
            serviceFilter.querySelectorAll('button[data-filter]').forEach((tab) => {
                const active = tab === button;
                tab.classList.toggle('is-active', active);
                tab.setAttribute('aria-pressed', String(active));
            });
            const showAll = filter === 'all';
            const revealIn = (card) => {
                card.classList.remove('is-filtered-in');
                card.classList.add('is-visible');
                if (!reduceMotion) { void card.offsetWidth; card.classList.add('is-filtered-in'); }
            };
            if (categoryGrid) {
                categoryGrid.hidden = !showAll;
                if (showAll) [...categoryGrid.children].forEach(revealIn);
            }
            let shown = 0;
            cards.forEach((card) => {
                // Under "All Services" only services without a category tab show (after the category cards).
                const match = showAll ? !card.dataset.filter : card.dataset.filter === filter;
                card.hidden = !match;
                card.classList.remove('is-filtered-in');
                if (match) {
                    shown += 1;
                    revealIn(card);
                }
            });
            serviceGrid.hidden = shown === 0;
            if (empty) empty.hidden = showAll || shown > 0;
        };
        serviceFilter.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-filter]');
            if (button) applyFilter(button);
        });
        // /services?category=slug opens on that tab even when the page was not rendered for it (e.g. a static copy).
        const requestedTab = tabFor(new URLSearchParams(window.location.search).get('category') || '');
        if (requestedTab && !requestedTab.classList.contains('is-active')) applyFilter(requestedTab, { updateUrl: false });
        // A category card opens that category's tab (its link, /services?category=slug, is the no-JavaScript fallback).
        categoryGrid?.addEventListener('click', (event) => {
            const link = event.target.closest('[data-category-open]');
            const tab = link && tabFor(link.dataset.categoryOpen);
            if (!tab || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
            event.preventDefault();
            applyFilter(tab);
            tab.focus({ preventScroll: true });
            serviceFilter.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        });
    }

    /* ---------- Forms ---------- */
    // Phone fields accept digits, spaces and common phone punctuation only.
    document.addEventListener('input', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.matches('[data-phone-number-only]')) return;
        const sanitize = (value) => (value.startsWith('+') ? '+' : '') + value.replace(/[^\d().\s-]/g, '');
        const cursorAt = input.selectionStart ?? input.value.length;
        const sanitizedCursor = sanitize(input.value.slice(0, cursorAt)).length;
        const sanitizedValue = sanitize(input.value);
        if (sanitizedValue !== input.value) {
            input.value = sanitizedValue;
            input.setSelectionRange(sanitizedCursor, sanitizedCursor);
        }
    });

    document.querySelectorAll('.theme-rexxsol-nova [data-contact-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            if (form.dataset.contactSubmitting === 'true') {
                event.preventDefault();
                return;
            }
            form.dataset.contactSubmitting = 'true';
            const button = form.querySelector('[data-contact-submit]');
            if (!button) return;
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            const submitLabel = button.querySelector('[data-contact-submit-label]');
            if (submitLabel) submitLabel.textContent = 'Sending...';
            button.querySelector('[data-contact-submit-icon]')?.setAttribute('hidden', '');
            button.querySelector('[data-contact-submit-spinner]')?.removeAttribute('hidden');
        });
        // Bring server-side feedback into view after a submit round-trip.
        form.querySelector('.nova-alert')?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
});
