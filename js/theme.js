/**
 * theme.js — Dark / Light Mode Toggle
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Manages the site's colour-scheme preference.
 *   - Reads the user's OS preference via prefers-color-scheme.
 *   - Persists the user's manual choice to localStorage.
 *   - Applies the theme by setting data-theme on <body>.
 *   - Updates the toggle button's icon and ARIA label.
 *   - Reacts to OS-level preference changes in real time.
 *
 * Exports (attached to global `Theme` namespace object):
 *   Theme.init()           — Bootstrap the theme system.
 *   Theme.toggle()         — Manually flip between light & dark.
 *   Theme.getCurrent()     — Returns 'light' | 'dark'.
 * ─────────────────────────────────────────────────────────────
 */

/* eslint-disable no-unused-vars */

'use strict';

const Theme = (() => {

  // ── Constants ───────────────────────────────────────────────
  const STORAGE_KEY       = 'etw-theme';      // localStorage key
  const ATTR_NAME         = 'data-theme';     // attribute on <body>
  const THEME_LIGHT       = 'light';
  const THEME_DARK        = 'dark';

  // Icon labels for the toggle button
  const ICON = {
    [THEME_LIGHT]: '🌙',   // shown in light mode → clicking switches to dark
    [THEME_DARK]:  '☀️',   // shown in dark mode  → clicking switches to light
  };

  const ARIA_LABEL = {
    [THEME_LIGHT]: 'Switch to dark mode',
    [THEME_DARK]:  'Switch to light mode',
  };

  // ── State ───────────────────────────────────────────────────
  let _current    = THEME_LIGHT;
  let _toggleBtn  = null;
  let _iconSpan   = null;

  // ── Private Helpers ─────────────────────────────────────────

  /**
   * Determine the initial theme in this priority order:
   *  1. User's saved preference (localStorage)
   *  2. OS / browser prefers-color-scheme media query
   *  3. Default: light
   *
   * @returns {'light'|'dark'}
   */
  function _resolveInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEME_LIGHT || saved === THEME_DARK) return saved;

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? THEME_DARK : THEME_LIGHT;
  }

  /**
   * Apply a theme: update <body> attribute, button icon, and ARIA label.
   * @param {'light'|'dark'} theme
   */
  function _applyTheme(theme) {
    document.body.setAttribute(ATTR_NAME, theme);
    document.documentElement.setAttribute(ATTR_NAME, theme);
    _current = theme;

    if (_toggleBtn) {
      _toggleBtn.setAttribute('aria-label', ARIA_LABEL[theme]);
      _toggleBtn.setAttribute('title', ARIA_LABEL[theme]);
    }

    if (_iconSpan) {
      _iconSpan.textContent = ICON[theme];
    }

    // Update the browser's native color-scheme so scrollbars, form
    // controls, and native UI elements also reflect the preference.
    document.documentElement.style.colorScheme =
      theme === THEME_DARK ? 'dark' : 'light';
  }

  /**
   * Persist the user's choice to localStorage.
   * @param {'light'|'dark'} theme
   */
  function _save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable in private browsing — fail silently.
    }
  }

  // ── Public Methods ──────────────────────────────────────────

  /**
   * Toggle between light and dark mode, then persist the choice.
   */
  function toggle() {
    const next = _current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    _applyTheme(next);
    _save(next);
  }

  /**
   * Returns the currently active theme string.
   * @returns {'light'|'dark'}
   */
  function getCurrent() {
    return _current;
  }

  /**
   * Initialise the theme system.
   * - Resolves the starting theme.
   * - Wires the toggle button click handler.
   * - Listens for OS-level preference changes.
   *
   * Must be called once after the DOM is ready.
   */
  function init() {
    _toggleBtn = document.getElementById('theme-toggle');
    _iconSpan  = _toggleBtn?.querySelector('.theme-toggle__icon') ?? null;

    if (!_toggleBtn) {
      console.warn('Theme.init: #theme-toggle element not found.');
    }

    // Apply the resolved initial theme (before first paint if possible)
    const initial = _resolveInitialTheme();
    _applyTheme(initial);

    // Wire the button
    if (_toggleBtn) {
      _toggleBtn.addEventListener('click', toggle);
    }

    // React to OS preference changes (e.g., macOS auto dark mode at sunset)
    // Only honour OS changes when the user has NOT saved a manual preference.
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      const hasManualPreference = localStorage.getItem(STORAGE_KEY) !== null;
      if (!hasManualPreference) {
        _applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────
  return { init, toggle, getCurrent };

})();

