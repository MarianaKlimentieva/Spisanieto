/*
 * СПИСАНИЕТО. — управление на съгласието за външно съдържание.
 * Не разрешава YouTube embeds преди избор в банера или клик върху конкретно видео.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'spisanieto-consent-v1';
  const CONSENT_VERSION = 1;
  const CONSENT_DAYS = 180;
  let activeSettings = false;

  function readConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || value.version !== CONSENT_VERSION || !value.expiresAt || value.expiresAt < Date.now()) {
        if (value) localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return { necessary: true, externalMedia: value.externalMedia === true };
    } catch (_) {
      return null;
    }
  }

  function externalMediaAllowed() {
    const consent = readConsent();
    return !!(consent && consent.externalMedia);
  }

  function saveConsent(externalMedia) {
    const now = Date.now();
    const value = {
      version: CONSENT_VERSION,
      necessary: true,
      externalMedia: externalMedia === true,
      updatedAt: new Date(now).toISOString(),
      expiresAt: now + CONSENT_DAYS * 24 * 60 * 60 * 1000
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn('Неуспешно запазване на избора за поверителност:', error);
    }
    renderState();
    window.dispatchEvent(new CustomEvent('spisanieto:consent-changed', {
      detail: { necessary: true, externalMedia: value.externalMedia }
    }));
  }

  function injectStyles() {
    if (document.getElementById('spisanieto-cookie-styles')) return;
    const style = document.createElement('style');
    style.id = 'spisanieto-cookie-styles';
    style.textContent = `
      #sp-cookie-banner, #sp-cookie-settings, #sp-cookie-reopen,
      .sp-cookie-video-prompt { font-family: 'Plus Jakarta Sans', Arial, sans-serif; }
      #sp-cookie-banner {
        position: fixed; z-index: 2147483000; left: 18px; bottom: 18px;
        width: min(520px, calc(100vw - 36px)); padding: 21px 22px 18px;
        background: #fff; color: #171717; border: 1px solid #e2e4e7;
        border-top: 4px solid #a21f5a; border-radius: 8px;
        box-shadow: 0 12px 40px rgba(0,0,0,.18); line-height: 1.55;
      }
      #sp-cookie-banner[hidden], #sp-cookie-settings[hidden], #sp-cookie-reopen[hidden] { display:none !important; }
      .sp-cookie-heading { display:flex; gap:10px; align-items:center; margin:0 0 8px; font:600 25px/1.1 'Cormorant Garamond', Georgia, serif; }
      .sp-cookie-symbol { color:#a21f5a; font-size:22px; }
      .sp-cookie-copy { margin:0; color:#4f4f4f; font-size:13px; line-height:1.65; }
      .sp-cookie-link { display:inline-block; margin-top:9px; color:#8c1d40; font-size:12px; text-decoration:underline; }
      .sp-cookie-actions { display:flex; flex-wrap:wrap; gap:9px; margin-top:16px; }
      .sp-cookie-button {
        appearance:none; min-height:40px; padding:10px 13px; flex:1 1 145px;
        border:1px solid #8c1d40; border-radius:4px; background:#fff; color:#681638;
        font:600 12px/1.25 'Plus Jakarta Sans', Arial, sans-serif; cursor:pointer;
      }
      .sp-cookie-button:hover, .sp-cookie-button:focus-visible { background:#f8edf2; outline:2px solid #a21f5a; outline-offset:2px; }
      /* Приемането и отказът са еднакво видими и лесни за избор. */
      .sp-cookie-button-primary { background:#8c1d40; color:#fff; }
      .sp-cookie-button-primary:hover, .sp-cookie-button-primary:focus-visible { background:#681638; color:#fff; }
      #sp-cookie-banner .sp-cookie-button:not(.sp-cookie-button-primary) { background:#fff; color:#681638; }
      #sp-cookie-banner .sp-cookie-button:not(.sp-cookie-button-primary):hover,
      #sp-cookie-banner .sp-cookie-button:not(.sp-cookie-button-primary):focus-visible { background:#f8edf2; }
      .sp-cookie-settings-link { margin-top:12px; padding:0; border:0; background:transparent; color:#8c1d40; text-decoration:underline; font:600 12px 'Plus Jakarta Sans', Arial, sans-serif; cursor:pointer; }
      #sp-cookie-reopen { position:fixed; z-index:2147482990; right:16px; bottom:16px; padding:10px 13px; border:1px solid #d9dce1; border-radius:22px; background:#fff; color:#681638; box-shadow:0 3px 14px rgba(0,0,0,.12); font:600 11px 'Plus Jakarta Sans',Arial,sans-serif; cursor:pointer; }
      #sp-cookie-settings { position:fixed; z-index:2147483640; inset:0; display:flex; align-items:center; justify-content:center; padding:18px; background:rgba(0,0,0,.55); }
      .sp-cookie-dialog { width:min(520px,100%); max-height:min(85vh,760px); overflow:auto; padding:24px; border-radius:8px; background:#fff; color:#171717; box-shadow:0 18px 60px rgba(0,0,0,.25); }
      .sp-cookie-dialog-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:12px; }
      .sp-cookie-dialog h2 { margin:0; font:600 30px/1.1 'Cormorant Garamond',Georgia,serif; }
      .sp-cookie-close { border:0; background:transparent; color:#555; font-size:28px; line-height:1; cursor:pointer; }
      .sp-cookie-setting-row { display:flex; gap:12px; align-items:flex-start; padding:15px 0; border-top:1px solid #e2e4e7; }
      .sp-cookie-setting-row input { width:19px; height:19px; margin:2px 0 0; accent-color:#8c1d40; flex-shrink:0; }
      .sp-cookie-setting-row label { display:block; margin:0; font-size:14px; font-weight:600; cursor:pointer; }
      .sp-cookie-setting-row p { margin:5px 0 0; color:#666; font-size:12px; line-height:1.55; }
      .sp-cookie-always-on { color:#287a3d; font-size:11px; font-weight:700; }
      .sp-cookie-video-prompt { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; width:100%; height:100%; min-height:180px; padding:24px; background:linear-gradient(135deg,#171717,#383038) !important; background-color:#171717 !important; color:#fff; text-align:center; }
      .sp-cookie-video-prompt p { max-width:420px; margin:0; color:#f1f1f1; font:13px/1.55 'Plus Jakarta Sans',Arial,sans-serif; }
      .sp-cookie-video-prompt button { border:1px solid #fff; border-radius:4px; padding:10px 14px; background:#8c1d40; color:#fff; font:600 13px 'Plus Jakarta Sans',Arial,sans-serif; cursor:pointer; }
      .sp-cookie-video-prompt button:hover { background:#a21f5a; }
      .sp-youtube-embed iframe { display:block; width:100%; height:100%; min-height:0; border:0; }
      @media(max-width:560px) {
        #sp-cookie-banner { left:10px; bottom:10px; width:calc(100vw - 20px); padding:17px 16px 15px; }
        .sp-cookie-heading { font-size:23px; }
        .sp-cookie-actions { gap:8px; }
        .sp-cookie-button { flex-basis:100%; }
        #sp-cookie-reopen { right:10px; bottom:10px; }
        .sp-cookie-dialog { padding:20px 17px; }
      }
    `;
    document.head.appendChild(style);
  }

  function makeElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function buildUI() {
    if (document.getElementById('sp-cookie-banner')) return;
    const banner = document.createElement('aside');
    banner.id = 'sp-cookie-banner';
    banner.setAttribute('aria-label', 'Избор за бисквитки и външно съдържание');
    banner.innerHTML = `
      <h2 class="sp-cookie-heading"><span class="sp-cookie-symbol" aria-hidden="true">🍪</span><span>Бисквитки и поверителност</span></h2>
      <p class="sp-cookie-copy">СПИСАНИЕТО. използва необходимите технологии за работата на сайта и запомня избора ви. Вградените видеа от YouTube се зареждат само ако ги разрешите. Можете да промените избора си по-късно.</p>
      <a class="sp-cookie-link" href="poveritelnost.html">Поверителност и бисквитки</a>
      <div class="sp-cookie-actions">
        <button type="button" class="sp-cookie-button" data-cookie-action="necessary">Само необходимите</button>
        <button type="button" class="sp-cookie-button sp-cookie-button-primary" data-cookie-action="allow">Приемам и разрешавам YouTube</button>
      </div>
      <button type="button" class="sp-cookie-settings-link" data-cookie-action="settings">Настройки на бисквитките</button>
    `;

    const reopen = makeElement('button', '', 'Настройки на поверителността');
    reopen.id = 'sp-cookie-reopen';
    reopen.type = 'button';
    reopen.hidden = true;
    reopen.setAttribute('aria-haspopup', 'dialog');
    reopen.addEventListener('click', openSettings);

    const modal = document.createElement('div');
    modal.id = 'sp-cookie-settings';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'sp-cookie-dialog-title');
    modal.innerHTML = `
      <section class="sp-cookie-dialog">
        <div class="sp-cookie-dialog-header">
          <h2 id="sp-cookie-dialog-title">Настройки на поверителността</h2>
          <button type="button" class="sp-cookie-close" data-cookie-action="close-settings" aria-label="Затвори настройките">×</button>
        </div>
        <p class="sp-cookie-copy">Избери дали сайтът да зарежда вградено съдържание от YouTube. Ако не разрешиш, видеата няма да се зареждат автоматично, но можеш да разрешиш отделно видео от самата публикация.</p>
        <div class="sp-cookie-setting-row">
          <input type="checkbox" id="sp-cookie-necessary" checked disabled>
          <div><label for="sp-cookie-necessary">Необходими технологии</label><p>Използват се за базовата работа на сайта и не могат да бъдат изключени от този панел.</p><span class="sp-cookie-always-on">ВИНАГИ АКТИВНИ</span></div>
        </div>
        <div class="sp-cookie-setting-row">
          <input type="checkbox" id="sp-cookie-youtube">
          <div><label for="sp-cookie-youtube">Външно съдържание — YouTube</label><p>Разрешава зареждането на вградени YouTube видеа. YouTube може да получи техническа информация за посещението ви.</p></div>
        </div>
        <div class="sp-cookie-actions">
          <button type="button" class="sp-cookie-button" data-cookie-action="necessary">Само необходимите</button>
          <button type="button" class="sp-cookie-button sp-cookie-button-primary" data-cookie-action="save-settings">Запази избора</button>
        </div>
        <a class="sp-cookie-link" href="poveritelnost.html">Прочети политиката за поверителност</a>
      </section>
    `;

    document.body.appendChild(banner);
    document.body.appendChild(reopen);
    document.body.appendChild(modal);

    banner.addEventListener('click', onActionClick);
    modal.addEventListener('click', onActionClick);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeSettings();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) closeSettings();
    });
    document.addEventListener('click', function (event) {
      const button = event.target.closest('.sp-cookie-video-button');
      if (!button) return;
      const wrapper = button.closest('.sp-youtube-embed');
      if (wrapper) loadYouTube(wrapper);
    });
  }

  function onActionClick(event) {
    const button = event.target.closest('[data-cookie-action]');
    if (!button) return;
    const action = button.getAttribute('data-cookie-action');
    if (action === 'necessary') saveConsent(false);
    else if (action === 'allow') saveConsent(true);
    else if (action === 'settings') openSettings();
    else if (action === 'close-settings') closeSettings();
    else if (action === 'save-settings') {
      const toggle = document.getElementById('sp-cookie-youtube');
      saveConsent(!!(toggle && toggle.checked));
    }
  }

  function openSettings() {
    const modal = document.getElementById('sp-cookie-settings');
    const toggle = document.getElementById('sp-cookie-youtube');
    if (!modal || !toggle) return;
    const consent = readConsent();
    toggle.checked = !!(consent && consent.externalMedia);
    modal.hidden = false;
    activeSettings = true;
    const closeButton = modal.querySelector('.sp-cookie-close');
    if (closeButton) closeButton.focus();
  }

  function closeSettings() {
    const modal = document.getElementById('sp-cookie-settings');
    if (modal) modal.hidden = true;
    activeSettings = false;
  }

  function renderState() {
    const consent = readConsent();
    const banner = document.getElementById('sp-cookie-banner');
    const reopen = document.getElementById('sp-cookie-reopen');
    if (banner) banner.hidden = !!consent;
    if (reopen) reopen.hidden = !consent;
    if (consent && activeSettings) closeSettings();
  }

  function makePrompt(wrapper) {
    wrapper.innerHTML = '';
    const prompt = makeElement('div', 'sp-cookie-video-prompt');
    prompt.appendChild(makeElement('p', '', 'Това видео е вградено от YouTube. При зареждането YouTube може да получи техническа информация за посещението ви.'));
    const button = makeElement('button', 'sp-cookie-video-button', 'Зареди YouTube видеото');
    button.type = 'button';
    prompt.appendChild(button);
    wrapper.appendChild(prompt);
  }

  function loadYouTube(wrapper) {
    const src = wrapper.getAttribute('data-youtube-src');
    if (!src) return;
    let parsed;
    try { parsed = new URL(src); } catch (_) { return; }
    if (parsed.protocol !== 'https:' || !['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(parsed.hostname) || !/^\/embed\/[A-Za-z0-9_-]{11}\/?$/.test(parsed.pathname)) return;
    wrapper.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.src = parsed.href;
    frame.title = 'YouTube видео';
    frame.loading = 'lazy';
    frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    wrapper.appendChild(frame);
    wrapper.dataset.loaded = 'true';
  }

  function unloadYouTube(wrapper) {
    if (!wrapper || !wrapper.classList.contains('sp-youtube-embed')) return;
    wrapper.dataset.loaded = 'false';
    makePrompt(wrapper);
  }

  function refreshYouTubeEmbeds(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const wrappers = [];
    if (scope.matches && scope.matches('.sp-youtube-embed')) wrappers.push(scope);
    scope.querySelectorAll('.sp-youtube-embed').forEach(wrapper => wrappers.push(wrapper));
    wrappers.forEach(wrapper => {
      if (externalMediaAllowed()) loadYouTube(wrapper);
      else makePrompt(wrapper);
    });
  }

  window.addEventListener('spisanieto:consent-changed', function (event) {
    const allow = !!(event.detail && event.detail.externalMedia);
    document.querySelectorAll('.sp-youtube-embed').forEach(wrapper => {
      if (allow) loadYouTube(wrapper);
      else unloadYouTube(wrapper);
    });
  });

  window.addEventListener('spisanieto:article-content-ready', function (event) {
    refreshYouTubeEmbeds(event.detail && event.detail.root);
  });

  function init() {
    injectStyles();
    buildUI();
    renderState();
    refreshYouTubeEmbeds(document);
    window.SpisanietoCookieConsent = {
      getConsent: readConsent,
      isExternalMediaAllowed: externalMediaAllowed,
      refreshYouTubeEmbeds: refreshYouTubeEmbeds,
      openSettings: openSettings
    };
    window.dispatchEvent(new Event('spisanieto:cookie-ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
