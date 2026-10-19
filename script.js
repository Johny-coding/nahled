(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const header = document.getElementById('site-header');
  const menuButton = document.getElementById('nav-toggle');
  const menu = document.getElementById('main-nav');
  const mobileMenu = window.matchMedia('(max-width: 1000px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const setMenuOpen = (open) => {
    if (!menuButton || !menu) return;
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
  };

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenuOpen(false);
    });

    document.addEventListener('click', (event) => {
      if (!mobileMenu.matches || menuButton.getAttribute('aria-expanded') !== 'true') return;
      if (!menu.contains(event.target) && !menuButton.contains(event.target)) setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        menuButton.focus();
      }
    });

    mobileMenu.addEventListener('change', (event) => {
      if (!event.matches) setMenuOpen(false);
    });
  }

  // Keep every in-page link useful and account for the sticky header.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      // Only well-formed in-page anchors (#id) are handled; anything else
      // (e.g. a bare "#") falls through to the browser default safely.
      if (!href || !/^#[A-Za-z][\w:-]*$/.test(href)) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      if (menu && menu.contains(link)) setMenuOpen(false);
      target.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });

  const updateHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Move decorative artwork at a slightly different rate from the page scroll.
  const parallaxTargets = document.querySelectorAll(
    '.hero-visual img, .feature-card img, .service-detail-art img'
  );
  if (parallaxTargets.length && !reducedMotion.matches) {
    let parallaxFrame = 0;
    const updateParallax = () => {
      const viewportCenter = window.innerHeight / 2;
      const mobileScale = window.innerWidth <= 780 ? 0.72 : 1;

      parallaxTargets.forEach((target) => {
        const bounds = target.getBoundingClientRect();
        const elementCenter = bounds.top + bounds.height / 2;
        const isHeroArtwork = target.closest('.hero-visual');
        const isServiceArtwork = target.closest('.service-detail-art');
        const strength = isHeroArtwork ? 0.045 : isServiceArtwork ? 0.04 : 0.055;
        const limit = isHeroArtwork ? 26 : isServiceArtwork ? 22 : 16;
        const offset = (viewportCenter - elementCenter) * strength * mobileScale;
        const boundedOffset = Math.max(-limit, Math.min(limit, offset));
        target.style.setProperty('--parallax-offset-y', `${boundedOffset.toFixed(1)}px`);
      });

      parallaxFrame = 0;
    };

    const scheduleParallax = () => {
      if (parallaxFrame) return;
      parallaxFrame = window.requestAnimationFrame(updateParallax);
    };

    scheduleParallax();
    window.addEventListener('scroll', scheduleParallax, { passive: true });
    window.addEventListener('resize', scheduleParallax);
  }

  // Phone links call on mobile and copy on desktop; email links always copy.
  const userAgent = navigator.userAgent || '';
  const isMobileDevice = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|BlackBerry|Opera Mini/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);

  const copyNotice = document.createElement('div');
  copyNotice.className = 'copy-toast';
  copyNotice.setAttribute('role', 'status');
  copyNotice.setAttribute('aria-live', 'polite');
  copyNotice.hidden = true;
  document.body.append(copyNotice);

  let copyNoticeTimer = 0;
  let copyNoticeHideTimer = 0;
  const showCopyNotice = (message) => {
    window.clearTimeout(copyNoticeTimer);
    window.clearTimeout(copyNoticeHideTimer);
    copyNotice.textContent = message;
    copyNotice.hidden = false;
    window.requestAnimationFrame(() => copyNotice.classList.add('is-visible'));
    copyNoticeTimer = window.setTimeout(() => {
      copyNotice.classList.remove('is-visible');
      copyNoticeHideTimer = window.setTimeout(() => {
        copyNotice.hidden = true;
      }, 200);
    }, 2400);
  };

  const fallbackCopy = (text) => {
    const temporaryField = document.createElement('textarea');
    temporaryField.value = text;
    temporaryField.setAttribute('readonly', '');
    temporaryField.style.position = 'fixed';
    temporaryField.style.left = '-9999px';
    temporaryField.style.top = '0';
    document.body.append(temporaryField);
    temporaryField.focus();
    temporaryField.select();
    temporaryField.setSelectionRange(0, text.length);

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    temporaryField.remove();
    return copied;
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // Try the legacy copy method if clipboard permission is unavailable.
      }
    }
    return fallbackCopy(text);
  };

  document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      const isEmail = link.protocol === 'mailto:';
      const isPhone = link.protocol === 'tel:';
      if (!isEmail && !isPhone) return;
      if (isPhone && isMobileDevice) return;

      event.preventDefault();
      let value = link.textContent.trim();
      if (isEmail) {
        const address = link.getAttribute('href').slice(7).split('?')[0];
        try {
          value = decodeURIComponent(address);
        } catch (error) {
          value = address;
        }
      }

      const copied = await copyText(value);
      if (!copied) {
        showCopyNotice(`Kopírování se nepodařilo. Hodnota: ${value}`);
      } else if (isEmail) {
        showCopyNotice('E-mailová adresa zkopírována.');
      } else {
        showCopyNotice('Telefonní číslo zkopírováno.');
      }
    });
  });

  // Fade in content as it enters the viewport; stagger the three service cards.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submitButton = document.getElementById('submit-button');

  if (form && status && submitButton) {
    // HANDOVER TODO: Replace or explicitly approve the temporary FormSubmit endpoint before final handover.
    const fields = [
      { field: form.querySelector('#full-name'), error: form.querySelector('#full-name-error') },
      { field: form.querySelector('#email-address'), error: form.querySelector('#email-address-error') },
      { field: form.querySelector('#message'), error: form.querySelector('#message-error') },
      { field: form.querySelector('#consent'), error: form.querySelector('#consent-error') }
    ].filter(({ field, error }) => field && error);

    let validationAttempted = false;
    let sending = false;
    form.noValidate = true;

    const allowedNameCharacters = /^[\p{L}\p{M} .’'-]{1,120}$/u;
    const suspiciousMessageContent = /<\s*\/?\s*[a-z][^>]*>|<\?|\b(?:javascript|vbscript)\s*:|\b(?:eval|alert)\s*\(|\b(?:document\.write|document\.cookie)\b|\bnew\s+Function\b/i;
    const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

    const validateField = ({ field, error }) => {
      field.setCustomValidity('');
      let message = '';

      if (field.id === 'full-name') {
        const name = field.value.trim();
        if (!name) {
          message = 'Zadejte prosím jméno a příjmení.';
        } else if (!allowedNameCharacters.test(name)) {
          message = 'Jméno může obsahovat písmena, mezery, tečku, spojovník a apostrof.';
        }
      } else if (field.id === 'email-address') {
        if (!field.value.trim()) {
          message = 'Zadejte prosím e-mailovou adresu.';
        } else if (!field.checkValidity()) {
          message = 'Zadejte prosím platnou e-mailovou adresu.';
        }
      } else if (field.id === 'message') {
        const messageText = field.value.trim();
        if (!messageText) {
          message = 'Napište prosím zprávu.';
        } else if (suspiciousMessageContent.test(messageText) || controlCharacters.test(messageText)) {
          message = 'Zpráva nesmí obsahovat HTML značky ani skriptový kód. Napište ji prosím běžným textem.';
        }
      } else if (field.id === 'consent' && !field.checked) {
        message = 'Pro odeslání zaškrtněte souhlas se zpracováním osobních údajů.';
      }

      field.setCustomValidity(message);
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        error.textContent = message;
        error.hidden = false;
      } else {
        field.removeAttribute('aria-invalid');
        error.textContent = '';
        error.hidden = true;
      }
      return !message;
    };

    fields.forEach((config) => {
      const eventName = config.field.type === 'checkbox' ? 'change' : 'input';
      config.field.addEventListener(eventName, () => {
        if (validationAttempted || config.field.hasAttribute('aria-invalid')) {
          validateField(config);
        }
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending) return;

      validationAttempted = true;
      const isValid = fields.map(validateField).every(Boolean);
      if (!isValid) {
        form.reportValidity();
        return;
      }

      sending = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Odesílám…';
      status.dataset.state = 'pending';
      status.textContent = 'Odesílám zprávu…';
      status.hidden = false;

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload._replyto = String(formData.get('email') || '').trim();
      payload.name = String(formData.get('name') || '').trim();
      payload.email = String(formData.get('email') || '').trim();
      payload.message = String(formData.get('message') || '').trim();

      try {
        const ajaxEndpoint = form.action.replace(
          'https://formsubmit.co/',
          'https://formsubmit.co/ajax/'
        );
        const response = await fetch(ajaxEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || result?.success === false || result?.success === 'false') {
          throw new Error('FormSubmit did not accept the submission.');
        }

        status.dataset.state = 'success';
        status.textContent = 'Děkujeme, zpráva byla odeslána.';
        status.hidden = false;
        form.reset();
        fields.forEach(({ field, error }) => {
          field.setCustomValidity('');
          field.removeAttribute('aria-invalid');
          error.textContent = '';
          error.hidden = true;
        });
        validationAttempted = false;
        submitButton.textContent = 'Odesláno ✓';
        form.setAttribute('data-submitted', 'true');
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu, nebo nám zavolejte.';
        status.hidden = false;
        submitButton.textContent = 'Odeslat zprávu';
        submitButton.disabled = false;
      } finally {
        sending = false;
      }
    });
  }

  // Informativní lišta cookies: web používá jen nezbytné technické úložiště
  // pro zapamatování této volby (žádné reklamní ani analytické cookies).
  // Záznam platí 12 měsíců, poté se lišta znovu zobrazí.
  const COOKIE_NOTICE_KEY = 'ucetni-cookie-notice';
  const COOKIE_NOTICE_TTL = 365 * 24 * 60 * 60 * 1000;

  const readCookieNotice = () => {
    try {
      const rawValue = window.localStorage.getItem(COOKIE_NOTICE_KEY);
      if (!rawValue) return false;
      const parsedValue = JSON.parse(rawValue);
      const storedTime = Number(parsedValue?.t) || 0;
      if (Date.now() - storedTime > COOKIE_NOTICE_TTL) {
        window.localStorage.removeItem(COOKIE_NOTICE_KEY);
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const storeCookieNotice = () => {
    try {
      window.localStorage.setItem(COOKIE_NOTICE_KEY, JSON.stringify({ v: 1, t: Date.now() }));
    } catch (error) {
      // Úložiště není dostupné (např. soukromý režim) — lišta se jen zavře.
    }
  };

  const clearCookieNotice = () => {
    try {
      window.localStorage.removeItem(COOKIE_NOTICE_KEY);
    } catch (error) {
      // Úložiště není dostupné.
    }
  };

  const cookieBar = document.createElement('aside');
  cookieBar.className = 'cookie-bar';
  cookieBar.setAttribute('role', 'region');
  cookieBar.setAttribute('aria-label', 'Informace o cookies');
  cookieBar.hidden = true;
  cookieBar.innerHTML = `
    <p class="cookie-bar-text">
      <strong>Cookies:</strong> tento web používá pouze nezbytné technické úložiště, které si pamatuje tuto volbu.
      Žádné reklamní ani analytické cookies nepoužíváme. Více v <a href="cookies.html">zásadách cookies</a>.
    </p>
    <button class="button button-primary cookie-bar-accept" type="button" data-cookie-accept>Rozumím</button>
  `;
  document.body.append(cookieBar);

  const showCookieBar = () => {
    cookieBar.hidden = false;
    window.requestAnimationFrame(() => cookieBar.classList.add('is-visible'));
  };

  const hideCookieBar = () => {
    cookieBar.classList.remove('is-visible');
    window.setTimeout(() => {
      cookieBar.hidden = true;
    }, reducedMotion.matches ? 0 : 260);
  };

  cookieBar.querySelector('[data-cookie-accept]')?.addEventListener('click', () => {
    storeCookieNotice();
    hideCookieBar();
  });

  // Tlačítko „nastavení znovu“ na stránce se zásadami cookies.
  document.querySelectorAll('[data-cookie-settings]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      clearCookieNotice();
      showCookieBar();
      cookieBar.querySelector('[data-cookie-accept]')?.focus();
    });
  });

  if (!readCookieNotice()) {
    window.setTimeout(showCookieBar, reducedMotion.matches ? 0 : 900);
  }
})();
