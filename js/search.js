/**
 * search.js — Search, Filter & Sorting Logic
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Manages the live country search, autocomplete suggestions,
 *   region filter dropdown, sort dropdown, and 250ms debouncing.
 *   Operates strictly on the in-memory country dataset fetched
 *   by the API module (zero repeated API calls per keystroke).
 *
 * Requirements (Phase 6):
 *   1. Search by common name, official name, and capital city.
 *   2. Case-insensitive matching with trimmed whitespace.
 *   3. 250ms debounce on keystroke inputs.
 *   4. Autocomplete suggestions with country flag & name (max 5 items),
 *      keyboard navigation (ArrowUp, ArrowDown, Enter, Escape),
 *      and outside click dismissal.
 *   5. Region filtering: All Regions, Africa, Americas, Asia, Europe, Oceania.
 *   6. Dynamic sorting:
 *      - Name: A to Z / Z to A
 *      - Population: Low to High / High to Low
 *      - Area: Low to High / High to Low
 *      (Non-mutating, handles missing numeric values gracefully).
 *   7. Clear Filters support for both toolbar button and empty state.
 *   8. Two-way input synchronization between hero search and toolbar search.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const Search = (() => {

  // ── State ───────────────────────────────────────────────────
  let _query         = '';
  let _region        = '';
  let _sort          = 'name-asc';
  let _debounceTimer = null;
  let _isInitialized = false;

  // ── DOM References (cached lazily in init) ───────────────────
  let _heroSearchInput   = null;
  let _filterSearchInput = null;
  let _suggestionsBox    = null;
  let _regionFilter      = null;
  let _sortSelect        = null;
  let _clearBtn          = null;
  let _emptyClearBtn     = null;

  // ── Constants ───────────────────────────────────────────────
  const DEBOUNCE_MS      = 250;   // 250ms debounce per specification
  const MAX_SUGGESTIONS  = 5;     // Maximum 5 suggestions per specification
  const MIN_QUERY_LENGTH = 1;

  // ── Helpers ─────────────────────────────────────────────────

  /**
   * Debounce helper — delays execution of fn by `delay` ms.
   * Cancels any previously scheduled invocation.
   * @param {Function} fn
   * @param {number} delay
   */
  function _debounce(fn, delay) {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(fn, delay);
  }

  /**
   * Normalise a string: lowercase and trim whitespace.
   * @param {*} val
   * @returns {string}
   */
  function _normalise(val) {
    return String(val || '').toLowerCase().trim();
  }

  /**
   * Extract searchable capital string from a country object.
   * Handles array of capitals or single string.
   * @param {Object} country
   * @returns {string}
   */
  function _getCapitalString(country) {
    if (Array.isArray(country.capital)) {
      return country.capital.map(_normalise).join(' ');
    }
    return _normalise(country.capital);
  }

  // ── Filter Trigger ──────────────────────────────────────────

  /**
   * Notify the App orchestrator that filters have changed.
   * Triggers a re-render of the grid with updated count.
   */
  function _triggerFilter() {
    if (typeof App !== 'undefined' && typeof App.render === 'function') {
      App.render();
    }
  }

  // ── Autocomplete Suggestions ────────────────────────────────

  /**
   * Build and display up to 5 autocomplete suggestions.
   * Renders matching country flags and names with accessible ARIA markup.
   * @param {string} query
   */
  function _showSuggestions(query) {
    if (!_suggestionsBox) return;

    const normalised = _normalise(query);
    if (normalised.length < MIN_QUERY_LENGTH) {
      _hideSuggestions();
      return;
    }

    // Get current in-memory countries from App
    const allCountries = (typeof App !== 'undefined' && typeof App.getCountries === 'function')
      ? App.getCountries()
      : [];

    if (!Array.isArray(allCountries) || allCountries.length === 0) {
      _hideSuggestions();
      return;
    }

    // Filter matching countries by common name, official name, or capital
    const matches = allCountries
      .filter(country => {
        const common   = _normalise(country.name?.common);
        const official = _normalise(country.name?.official);
        const capital  = _getCapitalString(country);
        return common.includes(normalised) ||
               official.includes(normalised) ||
               capital.includes(normalised);
      })
      .sort((a, b) => {
        // Prioritize common name prefix matches
        const aStarts = _normalise(a.name?.common).startsWith(normalised);
        const bStarts = _normalise(b.name?.common).startsWith(normalised);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.name?.common || '').localeCompare(b.name?.common || '');
      })
      .slice(0, MAX_SUGGESTIONS);

    if (matches.length === 0) {
      _hideSuggestions();
      return;
    }

    _suggestionsBox.innerHTML = '';

    matches.forEach((country, index) => {
      const commonName = country.name?.common || 'Unknown';
      const flagSrc    = country.flags?.svg || country.flags?.png || '';
      const flagAlt    = country.flags?.alt || `Flag of ${commonName}`;
      const capital    = Array.isArray(country.capital) && country.capital.length > 0
        ? country.capital[0]
        : (country.capital || '');

      const li = document.createElement('li');
      li.className = 'search-suggestion-item';
      li.setAttribute('role', 'option');
      li.id = `suggestion-item-${index}`;
      li.setAttribute('aria-selected', 'false');
      li.tabIndex = -1;

      // Flag image thumbnail
      if (flagSrc) {
        const img = document.createElement('img');
        img.className = 'search-suggestion-flag';
        img.src = flagSrc;
        img.alt = flagAlt;
        img.width = 24;
        img.height = 16;
        img.loading = 'lazy';
        li.appendChild(img);
      }

      // Name & capital text
      const textWrap = document.createElement('div');
      textWrap.className = 'search-suggestion-text';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'search-suggestion-name';
      nameSpan.textContent = commonName;
      textWrap.appendChild(nameSpan);

      if (capital) {
        const capSpan = document.createElement('span');
        capSpan.className = 'search-suggestion-capital';
        capSpan.textContent = ` (${capital})`;
        textWrap.appendChild(capSpan);
      }

      li.appendChild(textWrap);

      // Click to select
      li.addEventListener('click', () => {
        _selectSuggestion(commonName);
      });

      _suggestionsBox.appendChild(li);
    });

    _suggestionsBox.classList.add('is-visible');
    _suggestionsBox.setAttribute('aria-hidden', 'false');

    if (_heroSearchInput) {
      _heroSearchInput.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Commit a selected suggestion as the active search query.
   * Updates inputs, triggers filter, and smoothly scrolls to results.
   * @param {string} name
   */
  function _selectSuggestion(name) {
    _setQueryValue(name);
    _hideSuggestions();
    _triggerFilter();

    const target = document.getElementById('countries') || document.getElementById('explore');
    target?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Hide and clear the suggestions dropdown.
   */
  function _hideSuggestions() {
    if (!_suggestionsBox) return;
    _suggestionsBox.classList.remove('is-visible');
    _suggestionsBox.setAttribute('aria-hidden', 'true');
    _suggestionsBox.innerHTML = '';

    if (_heroSearchInput) {
      _heroSearchInput.setAttribute('aria-expanded', 'false');
      _heroSearchInput.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Set search query across both input fields in sync.
   * @param {string} val
   */
  function _setQueryValue(val) {
    _query = _normalise(val);
    if (_heroSearchInput && _heroSearchInput.value !== val) {
      _heroSearchInput.value = val;
    }
    if (_filterSearchInput && _filterSearchInput.value !== val) {
      _filterSearchInput.value = val;
    }
  }

  // ── Keyboard Navigation for Suggestions ─────────────────────

  /**
   * Handle ArrowUp, ArrowDown, Enter, and Escape on search inputs.
   * @param {KeyboardEvent} e
   */
  function _handleSearchKeydown(e) {
    if (!_suggestionsBox || !_suggestionsBox.classList.contains('is-visible')) {
      if (e.key === 'Escape') {
        _hideSuggestions();
      }
      return;
    }

    const items = [..._suggestionsBox.querySelectorAll('.search-suggestion-item')];
    if (!items.length) return;

    const activeItem = _suggestionsBox.querySelector('[aria-selected="true"]');
    let currentIndex = items.indexOf(activeItem);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter') {
      if (activeItem) {
        e.preventDefault();
        activeItem.click();
        return;
      }
      _hideSuggestions();
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _hideSuggestions();
      return;
    } else {
      return;
    }

    // Update selection highlight & ARIA
    items.forEach((item, idx) => {
      const isSelected = idx === currentIndex;
      item.setAttribute('aria-selected', String(isSelected));
      if (isSelected) {
        item.scrollIntoView({ block: 'nearest' });
        if (_heroSearchInput) {
          _heroSearchInput.setAttribute('aria-activedescendant', item.id);
        }
      }
    });
  }

  // ── Event Wiring ────────────────────────────────────────────

  /**
   * Wire up DOM event listeners.
   * Called by App.init() once DOM is fully ready.
   */
  function init() {
    _heroSearchInput   = document.getElementById('search-input');
    _filterSearchInput = document.getElementById('filter-search-input');
    _suggestionsBox    = document.getElementById('search-suggestions');
    _regionFilter      = document.getElementById('region-filter');
    _sortSelect        = document.getElementById('sort-select');
    _clearBtn          = document.getElementById('clear-filters-btn');
    _emptyClearBtn     = document.getElementById('empty-clear-btn');

    if (_isInitialized) return;
    _isInitialized = true;

    // ── 1. Hero Search Input ──────────────────────────────────
    if (_heroSearchInput) {
      _heroSearchInput.setAttribute('role', 'combobox');
      _heroSearchInput.setAttribute('aria-autocomplete', 'list');
      _heroSearchInput.setAttribute('aria-expanded', 'false');
      _heroSearchInput.setAttribute('aria-controls', 'search-suggestions');

      _heroSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        _setQueryValue(val);

        _debounce(() => {
          _showSuggestions(val);
          _triggerFilter();
        }, DEBOUNCE_MS);
      });

      _heroSearchInput.addEventListener('keydown', _handleSearchKeydown);
    }

    // ── 2. In-Page Filter Search Input (Synced) ───────────────
    if (_filterSearchInput) {
      _filterSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        _setQueryValue(val);

        _debounce(() => {
          _triggerFilter();
        }, DEBOUNCE_MS);
      });

      _filterSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _filterSearchInput.value) {
          _setQueryValue('');
          _triggerFilter();
        }
      });
    }

    // ── 3. Region Filter Dropdown ─────────────────────────────
    if (_regionFilter) {
      _regionFilter.addEventListener('change', (e) => {
        _region = _normalise(e.target.value);
        _triggerFilter();
      });
    }

    // ── 4. Sorting Dropdown ───────────────────────────────────
    if (_sortSelect) {
      _sortSelect.addEventListener('change', (e) => {
        _sort = e.target.value || 'name-asc';
        _triggerFilter();
      });
    }

    // ── 5. Clear Filters Buttons ──────────────────────────────
    if (_clearBtn) {
      _clearBtn.addEventListener('click', reset);
    }
    if (_emptyClearBtn) {
      _emptyClearBtn.addEventListener('click', reset);
    }

    // ── 6. Dismiss suggestions on outside click ───────────────
    document.addEventListener('click', (e) => {
      if (_suggestionsBox && _suggestionsBox.classList.contains('is-visible')) {
        const searchWrap = document.querySelector('.hero__search-wrapper');
        if (searchWrap && !searchWrap.contains(e.target)) {
          _hideSuggestions();
        }
      }
    });
  }

  // ── Public Filtering & Sorting Logic ────────────────────────

  /**
   * Apply current query (name, official, capital), region, and favorites filters.
   * Pure function: does not mutate the input array.
   *
   * @param {Object[]} countries
   * @returns {Object[]}
   */
  function filterCountries(countries) {
    if (!Array.isArray(countries)) return [];

    const isOnlyFav = (typeof Favorites !== 'undefined' && typeof Favorites.isOnlyFavoritesActive === 'function')
      ? Favorites.isOnlyFavoritesActive()
      : false;

    return countries.filter(country => {
      // 1. Favorites-only filter check
      if (isOnlyFav && typeof Favorites !== 'undefined' && !Favorites.isFavorite(country)) {
        return false;
      }

      const common   = _normalise(country.name?.common);
      const official = _normalise(country.name?.official);
      const capital  = _getCapitalString(country);
      const region   = _normalise(country.region);

      // 2. Search matches common name, official name, or capital city
      const matchesQuery = !_query ||
        common.includes(_query) ||
        official.includes(_query) ||
        capital.includes(_query);

      // 3. Region filter match
      const matchesRegion = !_region || region === _region;

      return matchesQuery && matchesRegion;
    });
  }

  /**
   * Sort an array of countries based on the active sort option.
   * Safely handles missing numeric values and copies the array to
   * avoid mutating the original dataset.
   *
   * @param {Object[]} countries
   * @returns {Object[]}
   */
  function sortCountries(countries) {
    if (!Array.isArray(countries)) return [];
    const sorted = [...countries];

    switch (_sort) {
      case 'name-asc':
        sorted.sort((a, b) =>
          (a.name?.common || '').localeCompare(b.name?.common || ''));
        break;

      case 'name-desc':
        sorted.sort((a, b) =>
          (b.name?.common || '').localeCompare(a.name?.common || ''));
        break;

      case 'population-asc':
        sorted.sort((a, b) => {
          const popA = typeof a.population === 'number' ? a.population : 0;
          const popB = typeof b.population === 'number' ? b.population : 0;
          return popA - popB;
        });
        break;

      case 'population-desc':
        sorted.sort((a, b) => {
          const popA = typeof a.population === 'number' ? a.population : 0;
          const popB = typeof b.population === 'number' ? b.population : 0;
          return popB - popA;
        });
        break;

      case 'area-asc':
        sorted.sort((a, b) => {
          const areaA = typeof a.area === 'number' ? a.area : 0;
          const areaB = typeof b.area === 'number' ? b.area : 0;
          return areaA - areaB;
        });
        break;

      case 'area-desc':
        sorted.sort((a, b) => {
          const areaA = typeof a.area === 'number' ? a.area : 0;
          const areaB = typeof b.area === 'number' ? b.area : 0;
          return areaB - areaA;
        });
        break;

      default:
        sorted.sort((a, b) =>
          (a.name?.common || '').localeCompare(b.name?.common || ''));
        break;
    }

    return sorted;
  }

  // ── State Accessors & Reset ─────────────────────────────────

  /**
   * Return current filter values.
   * @returns {{ query: string, region: string, sort: string }}
   */
  function getFilters() {
    return { query: _query, region: _region, sort: _sort };
  }

  /**
   * Reset all filters and inputs back to default state.
   */
  function reset() {
    _query  = '';
    _region = '';
    _sort   = 'name-asc';

    if (_heroSearchInput)   _heroSearchInput.value   = '';
    if (_filterSearchInput) _filterSearchInput.value = '';
    if (_regionFilter)      _regionFilter.value      = '';
    if (_sortSelect)        _sortSelect.value        = 'name-asc';

    _hideSuggestions();

    if (typeof Favorites !== 'undefined' && Favorites.isOnlyFavoritesActive()) {
      Favorites.setOnlyFavorites(false);
      return; // setOnlyFavorites already triggers App.render()
    }

    _triggerFilter();
  }

  // ── Public Surface ──────────────────────────────────────────
  return {
    init,
    filterCountries,
    sortCountries,
    getFilters,
    reset,
  };

})();
