# 🌍 Explore the World

A modern, fast, and accessible web application to explore countries, cultures, geography, languages, and global statistics. Built with **pure HTML5, CSS3, and Vanilla JavaScript** — zero dependencies, zero build steps, and zero frameworks.

---

## ✨ Features

- **Responsive Sticky Navbar**: Brand identity, smooth anchor navigation, real-time live favorites count badge, theme switcher, and an accessible mobile hamburger drawer.
- **Hero Gateway**: World map backdrop, ambient floating orbs, quick global planetary statistics, and a live search input.
- **Real-Time Live Search & Autocomplete**:
  - 250ms keystroke debounce.
  - Searches common names, official names, and capitals in-memory.
  - 5-item rich autocomplete dropdown with national flags, common names, and capital hints.
  - Full keyboard accessibility (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- **Global Statistics Counter**: Animated milestone counters showing planet stats with reduced-motion support.
- **Dynamic Country Grid**:
  - Live data from the [REST Countries v3.1 API](https://restcountries.com/).
  - Custom SVG flag fallbacks for offline operation.
  - Interactive favorite heart button directly on country flags with elastic pop animations.
  - Dual-line clamped common name headings and structured metadata (capital, population, area).
- **Search, Filter & Sort Controls**:
  - Region filtering (Africa, Americas, Asia, Europe, Oceania).
  - Multi-attribute non-mutating sorting (Name A-Z/Z-A, Population High-Low/Low-High, Area High-Low/Low-High).
  - Favorites-only toggle with dynamic results counts.
  - Distinct contextual empty states (differentiating 0 saved favorites from 0 filter matches).
- **Comprehensive Country Details Modal**:
  - Large flag showcase with regional badges and ISO codes.
  - General information, official language counts, currencies (names, codes, and symbols).
  - Timezones, international calling codes, and clickable neighboring border links.
  - Direct external links to Google Maps and OpenStreetMap.
  - Full keyboard trap, `Escape` key dismissal, backdrop click dismissal, and background scroll locking.
- **Wishlist & Favorites System**:
  - Persistent storage in `localStorage` under key `'etw_favorites'`.
  - Duplicate prevention and error-resilient memory fallback.
  - Lightweight animated toast notification system (`#toast-container`).
- **Theme Engine**:
  - Seamless light and dark mode toggling.
  - Anti-FODT (Flash of Dark Theme) zero-flicker pre-paint script.
  - Real-time OS `prefers-color-scheme` synchronization.
  - High-contrast accessible `:focus-visible` indicators.

---

## 🚀 Deployment Instructions

Because **Explore the World** is built exclusively with standard web technologies (pure HTML, CSS, Vanilla JS), it requires **zero compilation, transpilations, or build scripts**.

### Option A: GitHub Pages (Recommended for simplicity)

1. **Initialize Git Repository**:
   ```bash
   cd explore-the-world
   git init
   git add .
   git commit -m "feat: complete production release of Explore the World"
   ```

2. **Connect to your GitHub Repository**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub: `Settings` > `Pages`.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select branch: `main` and folder: `/ (root)`.
   - Click **Save**.
   - Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.

---

### Option B: Vercel (Recommended for performance & headers)

The project includes a ready-to-use [`vercel.json`](./vercel.json) pre-configured with security headers and long-term asset caching.

1. **Deploy via Vercel CLI**:
   ```bash
   npm i -g vercel
   cd explore-the-world
   vercel
   ```
   *(Follow the prompts to link your project and deploy)*

2. **Deploy via Vercel Web Dashboard**:
   - Push your code to GitHub or GitLab.
   - Go to [vercel.com/new](https://vercel.com/new).
   - Import your repository.
   - Leave Framework Preset as **Other** and Root Directory as `./` (or `explore-the-world`).
   - Click **Deploy**.

---

## 🔒 Security & Performance Considerations

- **XSS Protection**: Zero dynamic string interpolation into `innerHTML`. All runtime text is safely assigned using `textContent`, `setAttribute`, and structured DOM creation.
- **Link Security**: All external links (`target="_blank"`) enforce `rel="noopener noreferrer"`.
- **API Efficiency**: REST Countries API calls use minimal payload querying (`?fields=...`), in-memory session caching (`Map`), and in-flight request deduplication.
- **Image Performance**: Flag images leverage native `loading="lazy"` and `decoding="async"`.
- **Accessibility**: Validated WCAG AA color contrast, full keyboard navigation, ARIA roles, skip-to-content links, and `prefers-reduced-motion` compliance.

---

## 📄 License
MIT License. Data sourced from [REST Countries API](https://restcountries.com/).
