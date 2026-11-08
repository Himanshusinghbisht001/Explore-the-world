/**
 * api.js — Data Fetching Layer
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Centralises ALL communication with the REST Countries API.
 *   No other module should make raw fetch() calls.
 *
 * Exports (attached to the global `API` namespace object):
 *   API.getAllCountries()          → Promise<Country[]>
 *   API.getCountryByName(name)    → Promise<Country[]>
 *   API.getCountriesByRegion(r)   → Promise<Country[]>
 *   API.getCountryByCode(code)    → Promise<Country>
 *
 * Error handling strategy:
 *   All methods throw a typed ApiError so callers can inspect
 *   .status (HTTP status) and .message separately.
 *
 * Performance features (Phase 5):
 *   - In-memory response cache (Map) — avoids repeated network calls.
 *   - In-flight deduplication (Map of Promises) — prevents parallel
 *     identical requests from both firing when called concurrently.
 *   - Minimal field selection via ?fields= — reduces payload size.
 * ─────────────────────────────────────────────────────────────
 */

/* eslint-disable no-unused-vars */

'use strict';

const API = (() => {

  // ── Configuration ──────────────────────────────────────────

  /** Base URL for the REST Countries v3.1 API */
  const BASE_URL = 'https://restcountries.com/v3.1';

  /**
   * Fields requested from the REST Countries API.
   * Includes general, linguistic, monetary, geographic, and border fields
   * required across the application (Cards, Filter, and Details Modal).
   */
  const FIELDS = [
    'name',
    'flags',
    'capital',
    'region',
    'subregion',
    'population',
    'area',
    'cca2',
    'cca3',
    'cioc',
    'independent',
    'landlocked',
    'languages',
    'currencies',
    'timezones',
    'idd',
    'borders',
    'maps',
    'continents'
  ].join(',');

  // ── Custom Error Class ──────────────────────────────────────

  /**
   * ApiError — enriches the standard Error with an HTTP status code.
   * Callers can distinguish network failures (status 0) from HTTP errors.
   * @extends Error
   */
  class ApiError extends Error {
    /**
     * @param {string} message  - Human-readable description.
     * @param {number} [status] - HTTP status code (0 = network failure).
     */
    constructor(message, status = 0) {
      super(message);
      this.name   = 'ApiError';
      this.status = status;
    }
  }

  // ── Caches ─────────────────────────────────────────────────

  /**
   * Response cache — stores parsed JSON keyed by request URL.
   * Lifetime: the current page session (cleared only by clearCache()).
   */
  const _cache = new Map();

  /**
   * In-flight deduplication map — stores the Promise for a pending request
   * keyed by URL. If a second caller requests the same URL while the first
   * request is still in-flight, they share the same Promise instead of
   * triggering a second network request.
   */
  const _inFlight = new Map();

  // ── Private Core ───────────────────────────────────────────

  /**
   * Core fetch wrapper with caching and in-flight deduplication.
   *
   * Flow:
   *   1. Return cached data if present.
   *   2. Return the in-flight Promise if the same request is already running.
   *   3. Otherwise fire a fetch(), store the Promise in _inFlight, and on
   *      completion move the result into _cache (or throw ApiError).
   *
   * @param {string} endpoint - Path relative to BASE_URL (e.g. '/all').
   * @param {string} [fields] - Optional comma-separated field list override.
   * @returns {Promise<any>} Parsed JSON response.
   */
  async function _request(endpoint, fields = FIELDS) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}fields=${fields}`;

    // 1. Cache hit — return immediately
    if (_cache.has(url)) {
      return _cache.get(url);
    }

    // 2. In-flight deduplication — reuse the pending Promise
    if (_inFlight.has(url)) {
      return _inFlight.get(url);
    }

    // 3. New request
    const promise = (async () => {
      let response;
      try {
        response = await fetch(url);
      } catch (networkError) {
        _inFlight.delete(url);
        throw new ApiError(
          `Network error — please check your connection. (${networkError.message})`,
          0
        );
      }

      _inFlight.delete(url);

      if (!response.ok) {
        throw new ApiError(
          `API responded with ${response.status} ${response.statusText}. Please try again.`,
          response.status
        );
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new ApiError('Failed to parse the API response. Please try again.', 0);
      }

      _cache.set(url, data);
      return data;
    })();

    _inFlight.set(url, promise);
    return promise;
  }

  // ── Public Methods ─────────────────────────────────────────

  /**
   * Fetch ALL countries from the REST Countries v3.1 API.
   *
   * Returns ~250 country objects, each containing the fields defined
   * in FIELDS above. Responses are cached in memory so repeated calls
   * within the same session cost nothing after the first network round-trip.
   *
   * @returns {Promise<Object[]>} Array of country data objects.
   * @throws  {ApiError} On network failure or non-OK HTTP response.
   */
  async function fetchAllCountries() {
    return _request('/all');
  }

  // Alias for backward compatibility
  const getAllCountries = fetchAllCountries;

  /**
   * Search countries by common or official name (partial match supported
   * by the API via the ?fullText=false default).
   *
   * @param {string} name - The country name to search for.
   * @returns {Promise<Object[]>} Matching country objects.
   * @throws  {ApiError}
   */
  async function getCountryByName(name) {
    if (!name || typeof name !== 'string') {
      throw new ApiError('A valid country name string is required.', 400);
    }
    const encoded = encodeURIComponent(name.trim());
    return _request(`/name/${encoded}`);
  }

  /**
   * Fetch all countries within a specific geographic region.
   *
   * @param {string} region - e.g. 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'.
   * @returns {Promise<Object[]>} Countries in that region.
   * @throws  {ApiError}
   */
  async function getCountriesByRegion(region) {
    if (!region || typeof region !== 'string') {
      throw new ApiError('A valid region string is required.', 400);
    }
    const encoded = encodeURIComponent(region.trim());
    return _request(`/region/${encoded}`);
  }

  /**
   * Fetch a single country by its ISO 3166-1 alpha-2 or alpha-3 code.
   *
   * @param {string} code - e.g. 'US', 'GBR', 'IN'.
   * @returns {Promise<Object>} The matching country object (first result).
   * @throws  {ApiError}
   */
  async function getCountryByCode(code) {
    if (!code || typeof code !== 'string') {
      throw new ApiError('A valid country code string is required.', 400);
    }
    const encoded = encodeURIComponent(code.trim().toUpperCase());
    const results = await _request(`/alpha/${encoded}`);
    return Array.isArray(results) ? results[0] : results;
  }

  /**
   * Clear the in-memory response cache.
   * Forces the next call to re-fetch from the network.
   * Useful for forcing a manual data refresh.
   */
  function clearCache() {
    _cache.clear();
    // Note: _inFlight is NOT cleared here — clearing mid-flight promises
    // would cause the in-flight callers to hang. They resolve/reject naturally.
  }

  // ── Public Surface ─────────────────────────────────────────
  return {
    fetchAllCountries,
    getAllCountries,
    getCountryByName,
    getCountriesByRegion,
    getCountryByCode,
    clearCache,
    /** Expose the error class so callers can instanceof-check it. */
    ApiError,
  };

})();

