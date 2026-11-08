/**
 * favorites.js — Favorites & Wishlist Management
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Manages the user's saved / bookmarked countries (wishlist).
 *   - Persists favorite country codes in localStorage ('etw_favorites').
 *   - Prevents duplicate entries and handles storage errors gracefully.
 *   - Synchronises favorite heart state across country cards and modals.
 *   - Provides a "Favorites Only" filter toggle integrated with the
 *     navigation and filter toolbar.
 *   - Displays non-intrusive animated toast notifications on add/remove.
 *   - Updates live count badges in header and filter toolbar.
 *
 * Exports (attached to global `Favorites` namespace object):
 *   Favorites.init()
 *   Favorites.getAll()
 *   Favorites.getCount()
 *   Favorites.isFavorite(countryOrCode)
 *   Favorites.toggle(countryOrCode)
 *   Favorites.add(countryOrCode)
 *   Favorites.remove(countryOrCode)
 *   Favorites.isOnlyFavoritesActive()
 *   Favorites.setOnlyFavorites(active)
 *   Favorites.toggleOnlyFavorites()
 *   Favorites.showToast(message, duration)
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const Favorites = (() => {

  // ── Constants ───────────────────────────────────────────────
  const STORAGE_KEY = 'etw_favorites';
  const TOAST_DURATION_MS = 2600;

  // ── State ───────────────────────────────────────────────────
  let _favorites = [];            // Array of unique uppercase country codes
  let _onlyFavoritesFilter = false; // Whether the "Favorites Only" view is active
  let _isInitialized = false;

  // ── Storage Helpers ─────────────────────────────────────────

  /**
   * Safely retrieve the favorites array from localStorage.
   * Handles disabled storage, JSON corruption, and private-mode exceptions.
   * @returns {string[]}
   */
  function _loadFavorites() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Clean, trim, uppercase and deduplicate
      return [...new Set(parsed.map(code => String(code || '').trim().toUpperCase()).filter(Boolean))];
    } catch (err) {
      console.warn('[Favorites] Failed to read from localStorage:', err);
      return [];
    }
  }

  /**
   * Safely write the favorites array to localStorage.
   * @param {string[]} list
   */
  function _saveFavorites(list) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[Favorites] Failed to write to localStorage:', err);
    }
  }

  // ── Normalization Helpers ───────────────────────────────────

  /**
   * Extract a canonical uppercase code from a country object or string.
   * Priority: cca3 -> cca2 -> common name -> string.
   * @param {Object|string} countryOrCode
   * @returns {string}
   */
  function _resolveCode(countryOrCode) {
    if (!countryOrCode) return '';
    if (typeof countryOrCode === 'string') {
      return countryOrCode.trim().toUpperCase();
    }
    const code = countryOrCode.cca3 ||
                 countryOrCode.cca2 ||
                 countryOrCode.name?.common ||
                 countryOrCode.name ||
                 '';
    return String(code).trim().toUpperCase();
  }

  /**
   * Extract a human-friendly common name for toast announcements.
   * @param {Object|string} countryOrCode
   * @returns {string}
   */
  function _resolveName(countryOrCode) {
    if (!countryOrCode) return 'Country';
    if (typeof countryOrCode === 'object') {
      return countryOrCode.name?.common ||
             countryOrCode.name?.official ||
             countryOrCode.name ||
             countryOrCode.cca3 ||
             'Country';
    }
    const str = String(countryOrCode).trim();
    const upper = str.toUpperCase();
    const all = (typeof App !== 'undefined' && typeof App.getCountries === 'function')
      ? App.getCountries()
      : (typeof window !== 'undefined' && Array.isArray(window.SAMPLE_COUNTRIES) ? window.SAMPLE_COUNTRIES : []);

    if (Array.isArray(all) && all.length > 0) {
      const match = all.find(c =>
        c.cca3 === upper || c.cca2 === upper || (c.name?.common && c.name.common.toUpperCase() === upper)
      );
      if (match?.name?.common) return match.name.common;
    }
    return str;
  }

  // ── Toast Notification System ───────────────────────────────

  /**
   * Display a lightweight, accessible toast notification.
   * Auto-dismisses after `duration` ms with smooth entry/exit animations.
   *
   * @param {string} message - Toast text (e.g. "❤️ Added India to favorites")
   * @param {number} [duration=TOAST_DURATION_MS] - Time in ms before auto-dismiss
   */
  function showToast(message, duration = TOAST_DURATION_MS) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    container.appendChild(toast);

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      _dismissToast(toast);
    }, duration);

    // Click to dismiss early
    toast.addEventListener('click', () => {
      clearTimeout(dismissTimer);
      _dismissToast(toast);
    });
  }

  /**
   * Trigger exit animation and remove toast element from DOM.
   * @param {HTMLElement} toast
   */
  function _dismissToast(toast) {
    if (!toast || toast.classList.contains('is-leaving')) return;
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => {
      toast.remove();
    }, { once: true });
    // Fallback removal if animationend doesn't fire
    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 400);
  }

  // ── UI Synchronisation ──────────────────────────────────────

  /**
   * Update count badges across header, mobile drawer, and filter toolbar.
   */
  function _updateBadges() {
    const count = _favorites.length;

    // Desktop nav badge
    const navBadge = document.getElementById('nav-fav-badge');
    if (navBadge) {
      navBadge.textContent = String(count);
      navBadge.setAttribute('aria-label', `${count} favorite ${count === 1 ? 'country' : 'countries'}`);
      navBadge.classList.toggle('has-items', count > 0);
    }

    // Mobile nav badge
    const mobileBadge = document.getElementById('mobile-fav-badge');
    if (mobileBadge) {
      mobileBadge.textContent = String(count);
      mobileBadge.setAttribute('aria-label', `${count} favorite ${count === 1 ? 'country' : 'countries'}`);
      mobileBadge.classList.toggle('has-items', count > 0);
    }

    // Filter toolbar count
    const filterCount = document.getElementById('filter-fav-count');
    if (filterCount) {
      filterCount.textContent = `(${count})`;
    }

    // Filter toolbar button active state
    const filterBtn = document.getElementById('filter-fav-btn');
    if (filterBtn) {
      filterBtn.classList.toggle('is-active', _onlyFavoritesFilter);
      filterBtn.setAttribute('aria-pressed', String(_onlyFavoritesFilter));
    }

    // Nav favorite button active state
    const navFavBtn = document.getElementById('nav-fav-btn');
    if (navFavBtn) {
      navFavBtn.classList.toggle('active', _onlyFavoritesFilter);
    }
  }

  /**
   * Synchronise all rendered card heart buttons currently on screen.
   */
  function _syncCardHeartStates() {
    const cardButtons = document.querySelectorAll('.country-card__fav-btn');
    cardButtons.forEach(btn => {
      const code = btn.getAttribute('data-country-code') || '';
      const isFav = isFavorite(code);
      btn.classList.toggle('is-favorite', isFav);
      const name = btn.getAttribute('data-country-name') || 'Country';
      const label = isFav ? `Remove ${name} from favorites` : `Add ${name} to favorites`;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  // ── Public Query & Mutation Methods ─────────────────────────

  /**
   * Returns a copy of the list of favorite country codes.
   * @returns {string[]}
   */
  function getAll() {
    return [..._favorites];
  }

  /**
   * Returns the count of favorite countries.
   * @returns {number}
   */
  function getCount() {
    return _favorites.length;
  }

  /**
   * Check whether a country or code is saved in favorites.
   * Supports checking against cca3, cca2, or common name.
   *
   * @param {Object|string} countryOrCode
   * @returns {boolean}
   */
  function isFavorite(countryOrCode) {
    if (!countryOrCode) return false;
    if (typeof countryOrCode === 'string') {
      const code = countryOrCode.trim().toUpperCase();
      if (_favorites.includes(code)) return true;

      // Look up in loaded dataset to see if this code/name matches a favorited country
      const all = (typeof App !== 'undefined' && typeof App.getCountries === 'function')
        ? App.getCountries()
        : (typeof window !== 'undefined' && Array.isArray(window.SAMPLE_COUNTRIES) ? window.SAMPLE_COUNTRIES : []);

      if (Array.isArray(all) && all.length > 0) {
        const found = all.find(c => {
          const c3 = String(c.cca3 || '').trim().toUpperCase();
          const c2 = String(c.cca2 || '').trim().toUpperCase();
          const nm = String(c.name?.common || c.name || '').trim().toUpperCase();
          return c3 === code || c2 === code || nm === code;
        });
        if (found) {
          const f3 = String(found.cca3 || '').trim().toUpperCase();
          const f2 = String(found.cca2 || '').trim().toUpperCase();
          const fnm = String(found.name?.common || found.name || '').trim().toUpperCase();
          return (f3 && _favorites.includes(f3)) ||
                 (f2 && _favorites.includes(f2)) ||
                 (fnm && _favorites.includes(fnm));
        }
      }
      return false;
    }
    const c3 = String(countryOrCode.cca3 || '').trim().toUpperCase();
    const c2 = String(countryOrCode.cca2 || '').trim().toUpperCase();
    const name = String(countryOrCode.name?.common || countryOrCode.name || '').trim().toUpperCase();

    return (c3 && _favorites.includes(c3)) ||
           (c2 && _favorites.includes(c2)) ||
           (name && _favorites.includes(name));
  }

  /**
   * Add a country to favorites.
   * @param {Object|string} countryOrCode
   * @returns {boolean} True if added, false if already existed
   */
  function add(countryOrCode) {
    const code = _resolveCode(countryOrCode);
    const name = _resolveName(countryOrCode);
    if (!code) return false;

    if (!isFavorite(code)) {
      _favorites.push(code);
      _saveFavorites(_favorites);
      _updateBadges();
      _syncCardHeartStates();
      showToast(`❤️ Added ${name} to favorites`);
      return true;
    }
    return false;
  }

  /**
   * Remove a country from favorites.
   * @param {Object|string} countryOrCode
   * @returns {boolean} True if removed, false if not found
   */
  function remove(countryOrCode) {
    const code = _resolveCode(countryOrCode);
    const name = _resolveName(countryOrCode);
    if (!code) return false;

    const initialLen = _favorites.length;
    // Also remove any alias (cca2/cca3/name) if object passed
    const toRemove = new Set([code]);
    if (typeof countryOrCode === 'object') {
      if (countryOrCode.cca2) toRemove.add(countryOrCode.cca2.trim().toUpperCase());
      if (countryOrCode.cca3) toRemove.add(countryOrCode.cca3.trim().toUpperCase());
      if (countryOrCode.name?.common) toRemove.add(countryOrCode.name.common.trim().toUpperCase());
    }

    _favorites = _favorites.filter(c => !toRemove.has(c));

    if (_favorites.length !== initialLen) {
      _saveFavorites(_favorites);
      _updateBadges();
      _syncCardHeartStates();
      showToast(`🤍 Removed ${name} from favorites`);

      // If viewing only favorites, re-render immediately
      if (_onlyFavoritesFilter && typeof App !== 'undefined' && typeof App.render === 'function') {
        App.render();
      }
      return true;
    }
    return false;
  }

  /**
   * Toggle a country's favorite status.
   * @param {Object|string} countryOrCode
   * @returns {boolean} True if newly added, false if removed
   */
  function toggle(countryOrCode) {
    if (isFavorite(countryOrCode)) {
      remove(countryOrCode);
      return false;
    } else {
      add(countryOrCode);
      return true;
    }
  }

  // ── Favorites-Only Filter Management ────────────────────────

  /**
   * Returns whether the "Favorites Only" filter is currently active.
   * @returns {boolean}
   */
  function isOnlyFavoritesActive() {
    return _onlyFavoritesFilter;
  }

  /**
   * Enable or disable the "Favorites Only" view.
   * Updates toolbar/nav states and triggers an App re-render.
   *
   * @param {boolean} active
   */
  function setOnlyFavorites(active) {
    _onlyFavoritesFilter = Boolean(active);
    _updateBadges();

    if (typeof App !== 'undefined' && typeof App.render === 'function') {
      App.render();
    }
  }

  /**
   * Toggle the "Favorites Only" view on/off.
   * @returns {boolean} New filter state
   */
  function toggleOnlyFavorites() {
    setOnlyFavorites(!_onlyFavoritesFilter);
    return _onlyFavoritesFilter;
  }

  // ── Initialization ──────────────────────────────────────────

  /**
   * Bootstrap the favorites module.
   * Loads saved favorites and binds navigation/filter toolbar buttons.
   */
  function init() {
    if (_isInitialized) return;
    _isInitialized = true;

    _favorites = _loadFavorites();
    _updateBadges();

    // ── 1. Desktop Nav Favorites Button ───────────────────────
    const navFavBtn = document.getElementById('nav-fav-btn');
    if (navFavBtn) {
      navFavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setOnlyFavorites(true);
        const section = document.getElementById('countries') || document.getElementById('explore');
        section?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // ── 2. Mobile Nav Favorites Button ────────────────────────
    const mobileFavBtn = document.getElementById('mobile-fav-btn');
    if (mobileFavBtn) {
      mobileFavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setOnlyFavorites(true);

        // Close mobile drawer
        const menu = document.getElementById('mobile-menu');
        const toggle = document.getElementById('nav-toggle');
        if (menu && toggle) {
          menu.classList.remove('is-open');
          toggle.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          menu.setAttribute('aria-hidden', 'true');
        }

        const section = document.getElementById('countries') || document.getElementById('explore');
        section?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // ── 3. Filter Toolbar Favorites Button ────────────────────
    const filterFavBtn = document.getElementById('filter-fav-btn');
    if (filterFavBtn) {
      filterFavBtn.addEventListener('click', () => {
        toggleOnlyFavorites();
      });
    }
  }

  // ── Public Surface ──────────────────────────────────────────
  return {
    init,
    getAll,
    getCount,
    isFavorite,
    add,
    remove,
    toggle,
    isOnlyFavoritesActive,
    setOnlyFavorites,
    toggleOnlyFavorites,
    showToast,
  };

})();

if (typeof window !== 'undefined') {
  window.Favorites = Favorites;
}

