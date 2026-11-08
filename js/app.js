/**
 * app.js — Main Orchestrator
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   This is the entry point that ties all modules together.
 *   It owns the application lifecycle:
 *     1. Init all modules (Theme, Search, Details).
 *     2. Fetch all countries via API (Phase 5: live REST Countries API).
 *     3. Render country cards + region cards.
 *     4. Handle filter/sort changes by re-rendering the grid.
 *     5. Manage UI state (loading, error, empty-state, results count).
 *     6. Handle "Load More" pagination.
 *     7. Set up global UI helpers (back-to-top, footer year, nav active link).
 *
 * Depends on (all loaded before app.js via <script defer>):
 *   - api.js     → global `API`
 *   - search.js  → global `Search`
 *   - details.js → global `Details`
 *   - theme.js   → global `Theme`
 *
 * Exports (attached to global `App` namespace object):
 *   App.render()          — Re-filter, sort, and redraw the grid.
 *   App.getCountries()    — Return the full raw country array.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const App = (() => {

  // ── State ───────────────────────────────────────────────────
  let _allCountries   = [];   // Full dataset from the API
  let _displayCount   = 20;   // How many cards to show at once
  const PAGE_SIZE     = 20;   // Cards added per "Load More" click

  // ── DOM References ──────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const els = {
    grid:          () => $('countries-grid'),
    regionsGrid:   () => document.querySelector('.regions-grid'),
    spinner:       () => $('loading-spinner'),
    errorBox:      () => $('error-message'),
    emptyState:    () => $('empty-state'),
    resultsCount:  () => $('results-count'),
    loadMoreWrap:  () => $('load-more-wrapper'),
    loadMoreBtn:   () => $('load-more-btn'),
    retryBtn:      () => $('retry-btn'),
    backToTop:     () => $('back-to-top'),
    footerYear:    () => $('footer-year'),
    navLinks:      () => document.querySelectorAll('.nav__link'),
    navToggle:     () => $('nav-toggle'),
    mobileMenu:    () => $('mobile-menu'),
  };

  // ── Region metadata ─────────────────────────────────────────
  const REGIONS = [
    { name: 'Africa',   icon: '🌍' },
    { name: 'Americas', icon: '🌎' },
    { name: 'Asia',     icon: '🌏' },
    { name: 'Europe',   icon: '🏰' },
    { name: 'Oceania',  icon: '🏝️' },
    { name: 'Antarctic',icon: '🧊' },
  ];

  // ── UI State Helpers ────────────────────────────────────────

  /** Show or hide an element via the `hidden` attribute. */
  function _setVisible(el, visible) {
    if (!el) return;
    if (visible) {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  }

  /** Set aria-busy on the countries grid. */
  function _setGridBusy(busy) {
    const grid = els.grid();
    if (grid) grid.setAttribute('aria-busy', String(busy));
  }

  /** Switch the page into loading state. */
  function _showLoading() {
    _setVisible(els.spinner(), true);
    _setVisible(els.errorBox(), false);
    _setVisible(els.emptyState(), false);
    _setVisible(els.loadMoreWrap(), false);
    _setGridBusy(true);
    if (els.resultsCount()) els.resultsCount().textContent = 'Loading countries…';
  }

  /** Switch the page into error state. */
  function _showError(message) {
    _setVisible(els.spinner(), false);
    _setVisible(els.errorBox(), true);
    _setGridBusy(false);
    // Update the visible error message text in the DOM
    const errorBox = els.errorBox();
    if (errorBox) {
      const msgEl = errorBox.querySelector('p');
      if (msgEl) msgEl.textContent = message || '⚠️ Something went wrong. Please try again.';
    }
    console.error('[App] Error state:', message);
  }

  /** Switch the page into empty-results state. */
  function _showEmpty() {
    _setVisible(els.spinner(), false);
    _setVisible(els.errorBox(), false);
    _setVisible(els.emptyState(), true);
    _setVisible(els.loadMoreWrap(), false);
    _setGridBusy(false);

    const emptyBox = els.emptyState();
    const isFavMode = typeof Favorites !== 'undefined' && Favorites.isOnlyFavoritesActive();
    const favCount = typeof Favorites !== 'undefined' ? Favorites.getCount() : 0;

    if (emptyBox) {
      const titleEl = emptyBox.querySelector('.empty-state__title');
      const descEl  = emptyBox.querySelector('.empty-state__desc');
      const btnEl   = emptyBox.querySelector('.empty-state__btn span');

      if (isFavMode && favCount === 0) {
        if (titleEl) titleEl.textContent = 'No favorite countries yet';
        if (descEl)  descEl.textContent = 'Click the heart icon on any country card to save your favorites.';
        if (btnEl)   btnEl.textContent = 'Browse All Countries';
        if (els.resultsCount()) els.resultsCount().textContent = 'No favorite countries';
      } else if (isFavMode && favCount > 0) {
        if (titleEl) titleEl.textContent = 'No matching favorites found';
        if (descEl)  descEl.textContent = 'None of your saved favorites matched the search or region filter.';
        if (btnEl)   btnEl.textContent = 'Clear Filters';
        if (els.resultsCount()) els.resultsCount().textContent = '0 matching favorites';
      } else {
        if (titleEl) titleEl.textContent = 'No countries found';
        if (descEl)  descEl.textContent = 'No countries found. Try another search or clear your filters.';
        if (btnEl)   btnEl.textContent = 'Clear Filters';
        if (els.resultsCount()) els.resultsCount().textContent = 'No countries found';
      }
    } else if (els.resultsCount()) {
      els.resultsCount().textContent = isFavMode ? 'No favorite countries' : 'No countries found';
    }
  }

  /** Switch the page into normal results state. */
  function _showResults(total, displayed) {
    _setVisible(els.spinner(), false);
    _setVisible(els.errorBox(), false);
    _setVisible(els.emptyState(), false);
    _setGridBusy(false);

    const isFavMode = typeof Favorites !== 'undefined' && Favorites.isOnlyFavoritesActive();

    if (els.resultsCount()) {
      if (isFavMode) {
        els.resultsCount().textContent =
          displayed < total
            ? `Showing ${displayed} of ${total} favorite ${total === 1 ? 'country' : 'countries'}`
            : `Showing ${total} favorite ${total === 1 ? 'country' : 'countries'}`;
      } else {
        els.resultsCount().textContent =
          displayed < total
            ? `Showing ${displayed} of ${total} countries`
            : `Showing ${total} ${total === 1 ? 'country' : 'countries'}`;
      }
    }
  }

  // ── Card Builders ───────────────────────────────────────────

  /**
   * Build a reusable country card DOM element using safe DOM methods
   * (document.createElement and textContent).
   *
   * Displays:
   *   - Country flag (with descriptive alt text & loading="lazy")
   *   - Common country name
   *   - Official country name (with fallback)
   *   - Capital (array or string, with fallback)
   *   - Region badge
   *   - Population (formatted with toLocaleString())
   *   - Area (formatted with toLocaleString() km²)
   *   - View Details button with data-country identifier
   *
   * @param {Object} country - Country data object (REST Countries schema compatible)
   * @returns {HTMLElement}
   */
  function _buildCountryCard(country) {
    const name       = country.name?.common || 'Unknown';
    const official   = country.name?.official || country.name?.common || country.description || 'N/A';
    const flagSrc    = country.flags?.svg || country.flags?.png || '';
    const flagAlt    = country.flags?.alt || `Flag of ${name}`;
    const capital    = Array.isArray(country.capital) && country.capital.length > 0
      ? country.capital.join(', ')
      : (country.capital || 'N/A');
    const population = typeof country.population === 'number'
      ? country.population.toLocaleString()
      : (country.population || 'N/A');
    const area       = typeof country.area === 'number'
      ? `${country.area.toLocaleString()} km²`
      : (country.area || 'N/A');
    const region     = country.region || 'N/A';
    const code       = country.cca2 || country.cca3 || name.toLowerCase();

    // <article class="country-card" role="listitem" tabindex="0" ...>
    const article = document.createElement('article');
    article.className = 'country-card';
    article.setAttribute('role', 'listitem');
    article.tabIndex  = 0;
    article.setAttribute('aria-label', `${name} — ${region}`);
    article.setAttribute('data-country-code', code);

    // 1. Flag Wrapper + Region Badge
    const flagWrap = document.createElement('div');
    flagWrap.className = 'country-card__flag-wrap';

    const img = document.createElement('img');
    img.className = 'country-card__flag';
    img.src = flagSrc;
    img.alt = flagAlt;
    img.loading = 'lazy';
    img.decoding = 'async';
    flagWrap.appendChild(img);

    const badge = document.createElement('span');
    badge.className = 'country-card__badge';
    badge.textContent = region;
    flagWrap.appendChild(badge);

    // Favorite Button (Phase 8)
    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'country-card__fav-btn';
    favBtn.setAttribute('data-country-code', code);
    favBtn.setAttribute('data-country-name', name);

    const isFav = typeof Favorites !== 'undefined' && Favorites.isFavorite(country);
    if (isFav) {
      favBtn.classList.add('is-favorite');
      favBtn.setAttribute('aria-label', `Remove ${name} from favorites`);
      favBtn.setAttribute('title', `Remove ${name} from favorites`);
    } else {
      favBtn.setAttribute('aria-label', `Add ${name} to favorites`);
      favBtn.setAttribute('title', `Add ${name} to favorites`);
    }

    favBtn.innerHTML = `
      <svg class="country-card__fav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    `;

    favBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent opening modal dialog!
      favBtn.classList.add('anim-pop');
      setTimeout(() => favBtn.classList.remove('anim-pop'), 400);

      if (typeof Favorites !== 'undefined') {
        const nowFav = Favorites.toggle(country);
        favBtn.classList.toggle('is-favorite', nowFav);
        const label = nowFav ? `Remove ${name} from favorites` : `Add ${name} to favorites`;
        favBtn.setAttribute('aria-label', label);
        favBtn.setAttribute('title', label);
      }
    });

    flagWrap.appendChild(favBtn);

    article.appendChild(flagWrap);

    // 2. Card Body
    const body = document.createElement('div');
    body.className = 'country-card__body';

    // 2a. Header: Common Name & Official Name
    const header = document.createElement('div');
    header.className = 'country-card__header';

    const h3 = document.createElement('h3');
    h3.className = 'country-card__name';
    h3.title = name;
    h3.textContent = name;
    header.appendChild(h3);

    const pOfficial = document.createElement('p');
    pOfficial.className = 'country-card__official';
    pOfficial.title = official;
    pOfficial.textContent = official;
    header.appendChild(pOfficial);

    body.appendChild(header);

    // 2b. Meta: Capital, Population, Area
    const meta = document.createElement('div');
    meta.className = 'country-card__meta';

    const metaItems = [
      { label: 'Capital', value: capital },
      { label: 'Population', value: population },
      { label: 'Area', value: area }
    ];

    metaItems.forEach(({ label, value }) => {
      const item = document.createElement('div');
      item.className = 'country-card__meta-item';

      const lbl = document.createElement('span');
      lbl.className = 'country-card__meta-label';
      lbl.textContent = label;

      const val = document.createElement('span');
      val.className = 'country-card__meta-val';
      val.textContent = value;

      item.appendChild(lbl);
      item.appendChild(val);
      meta.appendChild(item);
    });

    body.appendChild(meta);

    // 2c. Footer: View Details Button
    const footer = document.createElement('div');
    footer.className = 'country-card__footer';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--details country-card__btn';
    btn.setAttribute('data-country', code);
    btn.setAttribute('aria-label', `View details for ${name}`);

    const btnText = document.createElement('span');
    btnText.textContent = 'View Details';
    btn.appendChild(btnText);

    const btnArrow = document.createElement('span');
    btnArrow.className = 'btn-arrow';
    btnArrow.setAttribute('aria-hidden', 'true');
    btnArrow.textContent = '→';
    btn.appendChild(btnArrow);

    // Hook up View Details button & card interaction (Phase 7 Details modal)
    const openDetails = () => {
      if (typeof Details !== 'undefined' && typeof Details.open === 'function') {
        Details.open(country);
      }
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetails();
    });

    article.addEventListener('click', openDetails);

    article.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetails();
      }
    });

    footer.appendChild(btn);
    body.appendChild(footer);
    article.appendChild(body);

    return article;
  }

  /**
   * Build a region card DOM element.
   * Uses safe DOM node creation to avoid innerHTML string parsing.
   * @param {string} name  - Region name.
   * @param {string} icon  - Emoji icon.
   * @param {number} count - Number of countries in that region.
   * @returns {HTMLElement}
   */
  function _buildRegionCard(name, icon, count) {
    const card = document.createElement('article');
    card.className  = 'region-card';
    card.role       = 'listitem';
    card.tabIndex   = 0;
    card.setAttribute('aria-label', `${name}: ${count} countries`);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'region-card__icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = icon;

    const h3 = document.createElement('h3');
    h3.className = 'region-card__name';
    h3.textContent = name;

    const p = document.createElement('p');
    p.className = 'region-card__count';
    p.textContent = `${count} countries`;

    card.appendChild(iconSpan);
    card.appendChild(h3);
    card.appendChild(p);

    // Clicking a region card applies that region filter
    const filter = () => {
      const regionSelect = document.getElementById('region-filter');
      if (regionSelect) {
        regionSelect.value = name;
        regionSelect.dispatchEvent(new Event('change'));
      }
      // Smooth scroll to the explore section
      document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
    };

    card.addEventListener('click', filter);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        filter();
      }
    });

    return card;
  }

  // ── Render ──────────────────────────────────────────────────

  /**
   * Re-apply filters/sort and redraw the countries grid.
   * Called by Search module on any filter change, and directly after load.
   */
  function render() {
    const grid = els.grid();
    if (!grid) return;

    // 1. Filter and sort
    const filtered = Search.filterCountries(_allCountries);
    const sorted   = Search.sortCountries(filtered);

    // 2. Guard: empty results
    if (sorted.length === 0) {
      grid.innerHTML = '';
      _showEmpty();
      _setVisible(els.loadMoreWrap(), false);
      return;
    }

    // 3. Paginate — only render up to _displayCount cards
    const slice     = sorted.slice(0, _displayCount);
    const hasMore   = sorted.length > _displayCount;

    // 4. Build fragment for performance (single DOM write)
    const fragment  = document.createDocumentFragment();
    slice.forEach(country => fragment.appendChild(_buildCountryCard(country)));

    grid.innerHTML = '';
    grid.appendChild(fragment);

    // 5. Update state indicators
    _showResults(sorted.length, slice.length);
    _setVisible(els.loadMoreWrap(), hasMore);
  }

  /**
   * Render the static Regions section.
   * Run once after the full country list is loaded.
   */
  function _renderRegions() {
    const grid = els.regionsGrid();
    if (!grid) return;

    const fragment = document.createDocumentFragment();

    REGIONS.forEach(({ name, icon }) => {
      const count = _allCountries.filter(c =>
        (c.region || '').toLowerCase() === name.toLowerCase() ||
        (c.continents || []).some(ct => ct.toLowerCase() === name.toLowerCase())
      ).length;

      if (count > 0) {
        fragment.appendChild(_buildRegionCard(name, icon, count));
      }
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  // ── Data Loading ────────────────────────────────────────────

  /**
   * Fetch all country data from the REST Countries API and trigger the
   * first render.
   *
   * Phase 5 behaviour:
   *   - Calls API.fetchAllCountries() / API.getAllCountries() (live request, cached).
   *   - Deduplicates country records to avoid duplicate cards.
   *   - Sorts the full dataset alphabetically by common name so the initial
   *     display is consistent regardless of API response order.
   *   - Falls back to SAMPLE_COUNTRIES (Phase 4 demo data) only when the
   *     network is unavailable and sample data is defined — prevents a
   *     completely blank page in offline/development environments.
   *   - Shows an error state with a Retry button on unrecoverable failures.
   *
   * Called once at startup via init(), and again when the user clicks Retry.
   */
  async function _loadCountries() {
    _showLoading();

    // Guard: prevent concurrent duplicate fetches (e.g. rapid Retry clicks).
    // The API layer handles in-flight deduplication at the network level, but
    // this guards the render pipeline from being entered twice simultaneously.
    if (_loadCountries._running) return;
    _loadCountries._running = true;

    try {
      // ── Live API fetch ─────────────────────────────────────
      const fetchFn = (typeof API !== 'undefined' && API.fetchAllCountries)
        ? API.fetchAllCountries
        : (typeof API !== 'undefined' && API.getAllCountries ? API.getAllCountries : null);

      if (!fetchFn) {
        throw new Error('API fetch method is not available.');
      }

      const data = await fetchFn();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('The API returned an empty country list.');
      }

      // Deduplicate country records by cca2 / cca3 / name to prevent duplicate cards
      const seen = new Set();
      const uniqueCountries = data.filter(c => {
        const id = c.cca2 || c.cca3 || c.name?.common;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Sort alphabetically by common name (locale-aware) for consistent display.
      _allCountries = uniqueCountries.sort((a, b) =>
        (a.name?.common || '').localeCompare(b.name?.common || '')
      );

      // Reset to first page whenever fresh data arrives.
      _displayCount = PAGE_SIZE;

      render();
      _renderRegions();

    } catch (err) {
      // Log the technical details to the console for debugging.
      console.error('[App] _loadCountries failed:', err);

      // ── Offline fallback ───────────────────────────────────
      // If the network is unavailable but sample data exists (e.g. during
      // local development without internet), show it with a soft warning
      // rather than a hard error screen.
      if (typeof SAMPLE_COUNTRIES !== 'undefined' && Array.isArray(SAMPLE_COUNTRIES) && SAMPLE_COUNTRIES.length > 0) {
        console.warn('[App] Network unavailable — falling back to SAMPLE_COUNTRIES demo data.');
        _allCountries = [...SAMPLE_COUNTRIES].sort((a, b) =>
          (a.name?.common || '').localeCompare(b.name?.common || '')
        );
        _displayCount = PAGE_SIZE;
        render();
        _renderRegions();

        // Show a soft "offline" notice inside the results count element
        const countEl = els.resultsCount();
        if (countEl) {
          countEl.textContent = `Demo data — ${_allCountries.length} countries (offline mode)`;
        }
      } else {
        // No fallback available — show the full error state with Retry.
        _showError(
          (typeof API !== 'undefined' && err instanceof API.ApiError)
            ? err.message
            : (err.message || 'Failed to load country data. Please check your connection and try again.')
        );
      }

    } finally {
      _loadCountries._running = false;
    }
  }
  // Sentinel flag for concurrent fetch guard (attached to the function object)
  _loadCountries._running = false;

  // ── Global UI Helpers ───────────────────────────────────────

  /** View All Countries button — clears filters and scrolls to the countries grid. */
  function _initViewAllBtn() {
    const btn = document.getElementById('view-all-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (typeof Search !== 'undefined' && typeof Search.reset === 'function') {
        Search.reset();
      }
      const grid = els.grid();
      grid?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /** Update the footer copyright year dynamically. */
  function _initFooterYear() {
    const el = els.footerYear();
    if (el) el.textContent = new Date().getFullYear();
  }

  /** Add .is-scrolled to header when user scrolls down (triggers glassmorphism). */
  function _initScrolledHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    const handler = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler(); // run once on load
  }

  /** Back-to-top button: show after scrolling 300px. */
  function _initBackToTop() {
    const btn = els.backToTop();
    if (!btn) return;

    const toggle = () => {
      _setVisible(btn, window.scrollY > 300);
    };

    // Use passive listener for scroll performance
    window.addEventListener('scroll', toggle, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /**
   * Wire the hero search button click → trigger filter.
   * The input itself (#search-input) is handled by Search.init().
   * This adds the Search button click action and keyboard interaction.
   */
  function _initHeroSearch() {
    const btn = document.querySelector('.hero__search-btn');
    const input = document.getElementById('search-input');
    const targetSection = document.getElementById('countries') || document.getElementById('explore');

    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof App !== 'undefined' && typeof App.render === 'function') {
          App.render();
        }
        targetSection?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const activeSuggestion = document.querySelector('.search-suggestion-item[aria-selected="true"]');
          if (!activeSuggestion) {
            e.preventDefault();
            if (typeof App !== 'undefined' && typeof App.render === 'function') {
              App.render();
            }
            targetSection?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }
  }

  /** Highlight the active nav link based on the visible section. */
  function _initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const links    = els.navLinks();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const currentId = entry.target.id;
          links.forEach(link => {
            const href = link.getAttribute('href');
            const targetId = href ? href.replace('#', '') : '';
            const isMatch = targetId === currentId ||
              (targetId === 'countries' && currentId === 'explore') ||
              (targetId === 'explore' && currentId === 'countries');
            link.classList.toggle('active', isMatch);
          });
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach(section => observer.observe(section));
  }

  /** Mobile hamburger menu toggle. */
  function _initMobileNav() {
    const toggle = els.navToggle();
    const menu   = els.mobileMenu();
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      menu.setAttribute('aria-hidden', String(!isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    // Close mobile menu when a link is clicked
    menu.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-label', 'Open navigation menu');
        toggle.focus();
      }
    });

    // Close on click outside header
    document.addEventListener('click', (e) => {
      const header = document.getElementById('site-header');
      if (header && !header.contains(e.target) && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-label', 'Open navigation menu');
      }
    });
  }

  /** "Load More" button — increase _displayCount and re-render. */
  function _initLoadMore() {
    const btn = els.loadMoreBtn();
    if (!btn) return;

    btn.addEventListener('click', () => {
      _displayCount += PAGE_SIZE;
      render();
      // Announce to screen readers
      btn.setAttribute('aria-label', `Loaded ${_displayCount} countries`);
    });
  }

  /** Retry button — re-attempt API fetch after an error. */
  function _initRetry() {
    const btn = els.retryBtn();
    if (!btn) return;
    btn.addEventListener('click', _loadCountries);
  }

  // ── Application Bootstrap ───────────────────────────────────

  /**
   * Initialise the entire application.
   * Called when the DOM is fully loaded.
   */
  async function init() {
    // 1. Initialise sub-modules (order matters)
    Theme.init();
    if (typeof Favorites !== 'undefined' && typeof Favorites.init === 'function') {
      Favorites.init();
    }
    Details.init();
    Search.init();
    if (typeof Stats !== 'undefined' && typeof Stats.init === 'function') {
      Stats.init();
    }

    // 2. Set up global helpers
    _initFooterYear();
    _initScrolledHeader();
    _initBackToTop();
    _initHeroSearch();
    _initViewAllBtn();
    _initNavHighlight();
    _initMobileNav();
    _initLoadMore();
    _initRetry();

    // 3. Load data
    await _loadCountries();
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Returns the full (unfiltered) country array.
   * Used by Search.js to build autocomplete suggestions.
   * @returns {Object[]}
   */
  function getCountries() {
    return _allCountries;
  }

  // Boot on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', init);

  return {
    render,
    getCountries,
    renderCountryCard: _buildCountryCard
  };

})();

