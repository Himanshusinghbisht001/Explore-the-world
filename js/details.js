/**
 * details.js — Country Details Modal
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Manages the accessible modal dialog that displays comprehensive,
 *   structured information about a selected country.
 *
 * Requirements (Phase 7):
 *   1. Country Header:
 *      - Large country flag with descriptive alt text
 *      - Common country name & official country name
 *      - Region & subregion badges, country code badge (cca2/cca3)
 *   2. General Information:
 *      - Capital, Region, Subregion, Population, Area in km²,
 *        Independent status, Landlocked status
 *   3. Languages & Currency:
 *      - All official languages
 *      - Number of official languages (calculated from official API entries)
 *      - Currency names, codes, and symbols
 *   4. Geographical Information:
 *      - Time zones, International calling code (idd)
 *      - Neighboring countries (resolved by code from in-memory dataset,
 *        rendered as clickable badges that navigate to that country)
 *      - External map links (Google Maps, OpenStreetMap)
 *   5. Accessibility & UX:
 *      - Keyboard focus trap (Tab / Shift+Tab)
 *      - Escape key closes modal
 *      - Outside backdrop click closes modal
 *      - Close button closes modal
 *      - Background scrolling prevented while open (overflow: hidden)
 *      - Focus moved to close button on open, restored on close
 *      - Uses safe DOM methods (createElement, textContent) to prevent XSS
 *      - Handles missing API fields gracefully (shows "N/A" or "Unknown")
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const Details = (() => {

  // ── DOM References (cached in init) ─────────────────────────
  let _panel        = null;   // <section id="detail-panel">
  let _backdrop     = null;   // <div id="detail-backdrop">
  let _closeBtn     = null;   // <button id="detail-close">
  let _content      = null;   // <div id="detail-content">
  let _card         = null;   // <div class="detail-panel__card">
  let _previousFocus = null;  // Element that had focus before opening modal
  let _isInitialized = false;

  // ── Formatting Helpers ──────────────────────────────────────

  /**
   * Format a number with locale thousands separators.
   * @param {number|*} num
   * @returns {string}
   */
  function _formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return 'N/A';
    return num.toLocaleString();
  }

  /**
   * Format area with km² unit.
   * @param {number|*} area
   * @returns {string}
   */
  function _formatArea(area) {
    if (typeof area !== 'number' || isNaN(area)) return 'N/A';
    return `${_formatNumber(area)} km²`;
  }

  /**
   * Extract international calling code from idd object.
   * @param {Object} idd
   * @returns {string}
   */
  function _formatCallingCode(idd) {
    if (!idd || !idd.root) return 'N/A';
    const root = idd.root || '';
    if (Array.isArray(idd.suffixes) && idd.suffixes.length === 1) {
      return `${root}${idd.suffixes[0]}`;
    }
    if (Array.isArray(idd.suffixes) && idd.suffixes.length > 1) {
      return `${root} (${idd.suffixes.slice(0, 3).join(', ')}${idd.suffixes.length > 3 ? '…' : ''})`;
    }
    return root || 'N/A';
  }

  /**
   * Resolve a 3-letter border code (e.g. "DEU", "FRA") to a full country object
   * using the already-loaded country list in memory.
   * @param {string} code
   * @returns {Object|null}
   */
  function _resolveBorderCountry(code) {
    if (!code) return null;
    const all = (typeof App !== 'undefined' && typeof App.getCountries === 'function')
      ? App.getCountries()
      : (typeof window !== 'undefined' && window.SAMPLE_COUNTRIES
          ? window.SAMPLE_COUNTRIES
          : (typeof SAMPLE_COUNTRIES !== 'undefined' ? SAMPLE_COUNTRIES : []));

    const upper = String(code).toUpperCase().trim();
    return all.find(c =>
      (c.cca3 && c.cca3.toUpperCase() === upper) ||
      (c.cca2 && c.cca2.toUpperCase() === upper) ||
      (c.cioc && c.cioc.toUpperCase() === upper)
    ) || null;
  }

  // ── Safe DOM Node Builders ──────────────────────────────────

  /**
   * Create an informational card group for the modal.
   * @param {string} title
   * @param {string} icon
   * @returns {{ section: HTMLElement, grid: HTMLElement }}
   */
  function _createSection(title, icon) {
    const sec = document.createElement('div');
    sec.className = 'detail-section';

    const header = document.createElement('div');
    header.className = 'detail-section__header';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'detail-section__icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = icon;
    header.appendChild(iconSpan);

    const h3 = document.createElement('h3');
    h3.className = 'detail-section__title';
    h3.textContent = title;
    header.appendChild(h3);

    sec.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    sec.appendChild(grid);

    return { section: sec, grid };
  }

  /**
   * Create a single key-value detail item.
   * Uses textContent to guarantee safe rendering.
   * @param {string} label
   * @param {string} value
   * @returns {HTMLElement}
   */
  function _createItem(label, value) {
    const item = document.createElement('div');
    item.className = 'detail-item';

    const lbl = document.createElement('span');
    lbl.className = 'detail-item__label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'detail-item__value';
    val.textContent = value || 'N/A';

    item.appendChild(lbl);
    item.appendChild(val);
    return item;
  }

  // ── Modal Content Renderer ──────────────────────────────────

  /**
   * Render complete country details inside the modal using safe DOM methods.
   * @param {Object} country
   */
  function _renderCountryDetails(country) {
    if (!_content) return;
    _content.innerHTML = '';

    const nameCommon   = country.name?.common || 'Unknown Country';
    const nameOfficial = country.name?.official || nameCommon;
    const flagSrc      = country.flags?.svg || country.flags?.png || '';
    const flagAlt      = country.flags?.alt || `National flag of ${nameCommon}`;
    const region       = country.region || 'N/A';
    const subregion    = country.subregion || 'N/A';
    const cca2         = country.cca2 || '';
    const cca3         = country.cca3 || '';
    const capital      = Array.isArray(country.capital) && country.capital.length > 0
      ? country.capital.join(', ')
      : (country.capital || 'N/A');

    // ── 1. Country Header ─────────────────────────────────────
    const headerWrap = document.createElement('div');
    headerWrap.className = 'detail-header';

    // Large Flag Container
    if (flagSrc) {
      const flagContainer = document.createElement('div');
      flagContainer.className = 'detail-flag-wrap';

      const flagImg = document.createElement('img');
      flagImg.className = 'detail-flag';
      flagImg.src = flagSrc;
      flagImg.alt = flagAlt;
      flagImg.loading = 'eager';
      flagImg.decoding = 'async';
      flagContainer.appendChild(flagImg);

      headerWrap.appendChild(flagContainer);
    }

    // Titles & Badges
    const titleGroup = document.createElement('div');
    titleGroup.className = 'detail-title-group';

    const h2 = document.createElement('h2');
    h2.className = 'detail-name';
    h2.id = 'detail-country-name';
    h2.textContent = nameCommon;
    titleGroup.appendChild(h2);

    const officialP = document.createElement('p');
    officialP.className = 'detail-official-name';
    officialP.textContent = nameOfficial;
    titleGroup.appendChild(officialP);

    // Badges Row (Region, Subregion, Code)
    const badgesRow = document.createElement('div');
    badgesRow.className = 'detail-badges';

    if (region && region !== 'N/A') {
      const rBadge = document.createElement('span');
      rBadge.className = 'detail-badge detail-badge--teal';
      rBadge.textContent = region;
      badgesRow.appendChild(rBadge);
    }

    if (subregion && subregion !== 'N/A') {
      const srBadge = document.createElement('span');
      srBadge.className = 'detail-badge detail-badge--sub';
      srBadge.textContent = subregion;
      badgesRow.appendChild(srBadge);
    }

    const codeBadge = document.createElement('span');
    codeBadge.className = 'detail-badge detail-badge--code';
    codeBadge.textContent = [cca2, cca3].filter(Boolean).join(' / ') || 'ISO';
    badgesRow.appendChild(codeBadge);

    // Modal Favorite Button (Phase 8)
    if (typeof Favorites !== 'undefined') {
      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'detail-fav-btn';
      const isFav = Favorites.isFavorite(country);
      if (isFav) {
        favBtn.classList.add('is-favorite');
        favBtn.setAttribute('aria-label', `Remove ${nameCommon} from favorites`);
      } else {
        favBtn.setAttribute('aria-label', `Add ${nameCommon} to favorites`);
      }
      favBtn.innerHTML = `
        <svg class="detail-fav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span class="detail-fav-text">${isFav ? 'Favorited' : 'Favorite'}</span>
      `;
      favBtn.addEventListener('click', () => {
        favBtn.classList.add('anim-pop');
        setTimeout(() => favBtn.classList.remove('anim-pop'), 400);
        const nowFav = Favorites.toggle(country);
        favBtn.classList.toggle('is-favorite', nowFav);
        const txt = favBtn.querySelector('.detail-fav-text');
        if (txt) txt.textContent = nowFav ? 'Favorited' : 'Favorite';
        favBtn.setAttribute('aria-label', nowFav ? `Remove ${nameCommon} from favorites` : `Add ${nameCommon} to favorites`);
      });
      badgesRow.appendChild(favBtn);
    }

    titleGroup.appendChild(badgesRow);
    headerWrap.appendChild(titleGroup);

    _content.appendChild(headerWrap);

    // ── 2. General Information Section ────────────────────────
    const genSec = _createSection('General Information', '📋');
    genSec.grid.appendChild(_createItem('Capital', capital));
    genSec.grid.appendChild(_createItem('Region', region));
    genSec.grid.appendChild(_createItem('Subregion', subregion));
    genSec.grid.appendChild(_createItem('Population', _formatNumber(country.population)));
    genSec.grid.appendChild(_createItem('Total Area', _formatArea(country.area)));

    const independentStr = country.independent === true
      ? 'Yes (Sovereign)'
      : (country.independent === false ? 'No' : 'N/A');
    genSec.grid.appendChild(_createItem('Independent', independentStr));

    const landlockedStr = country.landlocked === true
      ? 'Yes (Landlocked)'
      : (country.landlocked === false ? 'No (Coastal)' : 'N/A');
    genSec.grid.appendChild(_createItem('Landlocked', landlockedStr));

    _content.appendChild(genSec.section);

    // ── 3. Languages & Currency Section ───────────────────────
    const langSec = _createSection('Languages & Currency', '🗣️');

    // Official languages & count
    const langEntries = country.languages && typeof country.languages === 'object'
      ? Object.values(country.languages)
      : [];
    const langListStr = langEntries.length > 0 ? langEntries.join(', ') : 'N/A';
    const langCountStr = langEntries.length > 0
      ? `${langEntries.length} ${langEntries.length === 1 ? 'language' : 'languages'}`
      : 'N/A';

    langSec.grid.appendChild(_createItem('Official Languages', langListStr));
    langSec.grid.appendChild(_createItem('Official Language Count', langCountStr));

    // Currencies: name, code, symbol
    const currEntries = country.currencies && typeof country.currencies === 'object'
      ? Object.entries(country.currencies)
      : [];
    const currenciesStr = currEntries.length > 0
      ? currEntries.map(([code, cur]) => {
          const cName = cur.name || code;
          const cSym  = cur.symbol ? `, ${cur.symbol}` : '';
          return `${cName} (${code}${cSym})`;
        }).join('; ')
      : 'N/A';

    langSec.grid.appendChild(_createItem('Currencies', currenciesStr));

    _content.appendChild(langSec.section);

    // ── 4. Geographical Information Section ───────────────────
    const geoSec = _createSection('Geographical & Regional', '🗺️');

    const timezonesStr = Array.isArray(country.timezones) && country.timezones.length > 0
      ? country.timezones.join(', ')
      : (country.timezones || 'N/A');
    geoSec.grid.appendChild(_createItem('Time Zones', timezonesStr));

    const callingCode = _formatCallingCode(country.idd);
    geoSec.grid.appendChild(_createItem('Calling Code', callingCode));

    _content.appendChild(geoSec.section);

    // ── 5. Neighboring Countries (Borders) ─────────────────────
    const borderWrap = document.createElement('div');
    borderWrap.className = 'detail-section detail-borders-section';

    const bHeader = document.createElement('div');
    bHeader.className = 'detail-section__header';

    const bIcon = document.createElement('span');
    bIcon.className = 'detail-section__icon';
    bIcon.setAttribute('aria-hidden', 'true');
    bIcon.textContent = '🗾';
    bHeader.appendChild(bIcon);

    const bTitle = document.createElement('h3');
    bTitle.className = 'detail-section__title';
    bTitle.textContent = 'Neighboring Countries';
    bHeader.appendChild(bTitle);

    borderWrap.appendChild(bHeader);

    const bordersList = document.createElement('div');
    bordersList.className = 'detail-borders__list';

    const rawBorders = Array.isArray(country.borders) ? country.borders : [];

    if (rawBorders.length === 0) {
      const noBorders = document.createElement('p');
      noBorders.className = 'detail-borders__none';
      noBorders.textContent = 'No land borders (Island or standalone nation).';
      bordersList.appendChild(noBorders);
    } else {
      rawBorders.forEach(bCode => {
        const neighbor = _resolveBorderCountry(bCode);
        const neighborName = neighbor?.name?.common || bCode;

        const borderBtn = document.createElement('button');
        borderBtn.type = 'button';
        borderBtn.className = 'btn border-badge';
        borderBtn.setAttribute('data-code', bCode);
        borderBtn.setAttribute('aria-label', `View details for neighboring country ${neighborName}`);
        borderBtn.textContent = neighborName;

        borderBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (neighbor) {
            open(neighbor);
          } else {
            // Fallback: try fetching by code from API
            try {
              borderBtn.disabled = true;
              borderBtn.textContent = 'Loading…';
              if (typeof API !== 'undefined' && typeof API.getCountryByCode === 'function') {
                const fetched = await API.getCountryByCode(bCode);
                if (fetched) open(fetched);
              }
            } catch (err) {
              console.error('Failed to load border country:', err);
              borderBtn.textContent = neighborName;
              borderBtn.disabled = false;
            }
          }
        });

        bordersList.appendChild(borderBtn);
      });
    }

    borderWrap.appendChild(bordersList);
    _content.appendChild(borderWrap);

    // ── 6. External Map Links ─────────────────────────────────
    const mapActions = document.createElement('div');
    mapActions.className = 'detail-actions';

    const googleMapsUrl = country.maps?.googleMaps;
    const openStreetMapsUrl = country.maps?.openStreetMaps;

    if (googleMapsUrl) {
      const gMapLink = document.createElement('a');
      gMapLink.href = googleMapsUrl;
      gMapLink.target = '_blank';
      gMapLink.rel = 'noopener noreferrer';
      gMapLink.className = 'btn btn--primary detail-action-btn';
      gMapLink.setAttribute('aria-label', `View ${nameCommon} on Google Maps (opens in new tab)`);

      const gIcon = document.createElement('span');
      gIcon.setAttribute('aria-hidden', 'true');
      gIcon.textContent = '📍';
      gMapLink.appendChild(gIcon);

      const gText = document.createElement('span');
      gText.textContent = 'Google Maps';
      gMapLink.appendChild(gText);

      mapActions.appendChild(gMapLink);
    }

    if (openStreetMapsUrl) {
      const osmLink = document.createElement('a');
      osmLink.href = openStreetMapsUrl;
      osmLink.target = '_blank';
      osmLink.rel = 'noopener noreferrer';
      osmLink.className = 'btn btn--secondary detail-action-btn';
      osmLink.setAttribute('aria-label', `View ${nameCommon} on OpenStreetMap (opens in new tab)`);

      const osmIcon = document.createElement('span');
      osmIcon.setAttribute('aria-hidden', 'true');
      osmIcon.textContent = '🌐';
      osmLink.appendChild(osmIcon);

      const osmText = document.createElement('span');
      osmText.textContent = 'OpenStreetMap';
      osmLink.appendChild(osmText);

      mapActions.appendChild(osmLink);
    }

    if (mapActions.children.length > 0) {
      _content.appendChild(mapActions);
    }
  }

  // ── Keyboard Focus Trap ─────────────────────────────────────

  /**
   * Trap keyboard focus inside the open modal dialog.
   * Cycles Tab and Shift+Tab between the first and last focusable element.
   * @param {KeyboardEvent} e
   */
  function _trapFocus(e) {
    if (e.key !== 'Tab' || !_panel || _panel.hasAttribute('hidden')) return;

    const focusable = _panel.querySelectorAll(
      'button:not([disabled]), a[href]:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ── Public API: Open & Close ────────────────────────────────

  /**
   * Open the Country Details Modal and display complete information.
   * @param {Object} country - Country data object
   */
  function open(country) {
    if (!_panel || !_content || !country) {
      console.error('[Details] Cannot open modal: missing panel or country data.');
      return;
    }

    // Save current active element for focus restoration on close
    _previousFocus = document.activeElement;

    // Render country information safely
    _renderCountryDetails(country);

    // Show dialog
    _panel.removeAttribute('hidden');
    _panel.setAttribute('aria-hidden', 'false');

    // Prevent body background scrolling
    document.body.style.overflow = 'hidden';

    // Move focus inside the dialog (close button)
    if (_closeBtn) {
      _closeBtn.focus();
    }

    // Add keyboard focus trap listener
    document.addEventListener('keydown', _trapFocus);
  }

  /**
   * Close the Country Details Modal and restore state.
   */
  function close() {
    if (!_panel) return;

    // Hide dialog
    _panel.setAttribute('hidden', '');
    _panel.setAttribute('aria-hidden', 'true');

    // Restore background scrolling
    document.body.style.overflow = '';

    // Clear content to save memory and avoid stale data
    if (_content) {
      _content.innerHTML = '';
      if (Array.isArray(_content.children)) {
        _content.children.length = 0;
      }
    }

    // Remove focus trap listener
    document.removeEventListener('keydown', _trapFocus);

    // Restore focus to triggering button
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      try {
        _previousFocus.focus();
      } catch (e) {
        /* ignore */
      }
    }
  }

  // ── Initialisation ──────────────────────────────────────────

  /**
   * Wire up dialog triggers, close buttons, and backdrop.
   */
  function init() {
    _panel    = document.getElementById('detail-panel');
    _backdrop = document.getElementById('detail-backdrop');
    _closeBtn = document.getElementById('detail-close');
    _content  = document.getElementById('detail-content');
    _card     = document.querySelector('.detail-panel__card');

    if (_isInitialized) return;
    _isInitialized = true;

    if (!_panel || !_backdrop || !_closeBtn || !_content) {
      console.warn('[Details] One or more modal elements not found in DOM.');
      return;
    }

    // Close on close button click
    _closeBtn.addEventListener('click', close);

    // Close on backdrop click (outside click)
    _backdrop.addEventListener('click', close);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _panel && !_panel.hasAttribute('hidden')) {
        close();
      }
    });
  }

  // ── Public Surface ──────────────────────────────────────────
  return {
    init,
    open,
    close,
  };

})();
