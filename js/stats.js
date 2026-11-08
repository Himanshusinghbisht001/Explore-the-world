/**
 * stats.js — Global Statistics Counter & Animations
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Manages the Global Statistics section (#stats).
 *   - Observes when the section enters the viewport (IntersectionObserver).
 *   - Triggers entrance animations for the 4 statistics cards.
 *   - Animates numerical counters from 0 up to their reference values
 *     using requestAnimationFrame with smooth cubic easing.
 *   - Formats numbers appropriately (integers, decimals, locale commas).
 *   - Respects user prefers-reduced-motion accessibility settings.
 *   - Ensures counting animations run once only.
 *
 * Exports (attached to global `Stats` namespace object):
 *   Stats.init() — Initialize observation and animations.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const Stats = (() => {

  // ── Configuration ───────────────────────────────────────────
  const ANIMATION_DURATION_MS = 1800; // Duration of counter animation
  const OBSERVER_THRESHOLD    = 0.2;  // Viewport visibility threshold

  // ── State ───────────────────────────────────────────────────
  let _hasAnimated = false;

  // ── Private Helpers ─────────────────────────────────────────

  /**
   * Smooth cubic ease-out easing curve:
   * Starts fast, decelerates gracefully to the final value.
   * @param {number} t - Normalized time [0..1]
   * @returns {number} - Eased progress [0..1]
   */
  function _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Check whether the user has requested reduced motion.
   * @returns {boolean}
   */
  function _prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Format a numerical value according to card configuration.
   * @param {number} value - Raw interpolated number
   * @param {number} decimals - Number of decimal places
   * @param {boolean} isLocale - Whether to apply locale thousands formatting
   * @returns {string}
   */
  function _formatValue(value, decimals, isLocale) {
    if (decimals > 0) {
      return value.toFixed(decimals);
    }
    const intVal = Math.floor(value);
    return isLocale ? intVal.toLocaleString() : String(intVal);
  }

  /**
   * Animate a single card's counter element from 0 to target.
   * @param {HTMLElement} card - .stat-card element
   */
  function _animateCard(card) {
    const counterEl = card.querySelector('[data-counter]');
    if (!counterEl) return;

    const targetVal = parseFloat(card.dataset.target || '0');
    const decimals  = parseInt(card.dataset.decimals || '0', 10);
    const isLocale  = card.dataset.format === 'locale';

    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const easedProgress = _easeOutCubic(progress);

      const current = easedProgress * targetVal;
      counterEl.textContent = _formatValue(current, decimals, isLocale);

      if (progress < 1) {
        const raf = window.requestAnimationFrame || requestAnimationFrame;
    raf(step);
      } else {
        // Ensure exact final target is displayed
        counterEl.textContent = _formatValue(targetVal, decimals, isLocale);
      }
    }

    const raf = window.requestAnimationFrame || requestAnimationFrame;
    raf(step);
  }

  /**
   * Trigger the animation of all cards in the section.
   * @param {HTMLElement} section - #stats section
   */
  function _startAnimations(section) {
    if (_hasAnimated) return;
    _hasAnimated = true;

    // Trigger entrance CSS transition
    section.classList.add('is-visible');

    const cards = section.querySelectorAll('.stat-card');

    if (_prefersReducedMotion()) {
      // Respect accessibility: immediately render final numbers without counting
      cards.forEach((card) => {
        const counterEl = card.querySelector('[data-counter]');
        if (!counterEl) return;
        const targetVal = parseFloat(card.dataset.target || '0');
        const decimals  = parseInt(card.dataset.decimals || '0', 10);
        const isLocale  = card.dataset.format === 'locale';
        counterEl.textContent = _formatValue(targetVal, decimals, isLocale);
      });
      return;
    }

    // Animate each card counter
    cards.forEach((card) => _animateCard(card));
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Initialize the Global Statistics IntersectionObserver.
   */
  function init() {
    const section = document.getElementById('stats');
    if (!section) return;

    // If IntersectionObserver is not supported, show immediately
    if (!('IntersectionObserver' in window)) {
      _startAnimations(section);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            _startAnimations(section);
            obs.unobserve(entry.target); // Run only once
          }
        });
      },
      { threshold: OBSERVER_THRESHOLD }
    );

    observer.observe(section);
  }

  return { init };

})();
