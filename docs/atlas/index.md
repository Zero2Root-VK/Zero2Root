---
title: Field Atlas
hide:
  - title
---

<div class="z2r-atlas" data-field-atlas>
  <header class="atlas-heading">
    <div class="atlas-overline"><span>FIELD ATLAS</span><i></i><span>SECURITY KNOWLEDGE / 001</span></div>
    <div class="atlas-heading-row">
      <div>
        <h1>Cyber Terrain<span class="atlas-heading-period">.</span></h1>
        <p class="atlas-lede">A navigable map of the systems, weaknesses and methods that make up practical cybersecurity. Follow a relationship, open the source lesson, and keep your place as you investigate.</p>
      </div>
      <div class="atlas-edition">
        <span>ATLAS EDITION</span>
        <strong>01<span> / </span>30</strong>
        <small>CURATED KNOWLEDGE POINTS</small>
      </div>
    </div>
  </header>

  <section class="atlas-command" aria-label="Search the Field Atlas">
    <label class="atlas-search-wrap">
      <span class="atlas-search-mark" aria-hidden="true">⌕</span>
      <input type="search" data-atlas-search autocomplete="off" placeholder="Find a concept, weakness, protocol or tool…" aria-label="Search Field Atlas">
      <kbd> / </kbd>
    </label>
    <div class="atlas-search-results" data-atlas-search-results hidden></div>
    <div class="atlas-command-note"><span class="atlas-live-mark"></span> SOURCE-LINKED MAP <span>·</span> 30 NODES <span>·</span> 39 CURATED RELATIONSHIPS</div>
  </section>

  <section class="atlas-workbench" aria-label="Interactive cybersecurity knowledge map">
    <div class="atlas-map-column">
      <div class="atlas-toolbar">
        <div class="atlas-view-switch" role="group" aria-label="Atlas view">
          <button type="button" class="is-active" data-atlas-view="terrain" aria-pressed="true">Terrain</button>
          <button type="button" data-atlas-view="learning" aria-pressed="false">Learning route</button>
          <button type="button" data-atlas-view="testing" aria-pressed="false">Testing links</button>
        </div>
        <div class="atlas-map-actions">
          <button type="button" data-atlas-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-atlas-zoom="reset" aria-label="Reset map view">RESET</button>
          <button type="button" data-atlas-zoom="in" aria-label="Zoom in">+</button>
        </div>
      </div>

      <div class="atlas-filter-row" role="group" aria-label="Filter node categories">
        <button type="button" class="is-active" data-atlas-filter="all" aria-pressed="true">All points</button>
        <button type="button" data-atlas-filter="lesson" aria-pressed="false">Lessons</button>
        <button type="button" data-atlas-filter="weakness" aria-pressed="false">Weaknesses</button>
        <button type="button" data-atlas-filter="protocol" aria-pressed="false">Protocols</button>
        <button type="button" data-atlas-filter="toolset" aria-pressed="false">Tool references</button>
      </div>
      <div class="atlas-map-frame">
        <div class="atlas-map-topline"><span>FIG. 01</span><span>DOMAIN TOPOLOGY / INTERACTIVE</span></div>
        <svg class="atlas-map" data-atlas-map viewBox="0 0 1400 820" role="group" aria-label="Interactive map of cybersecurity topics. Select any labelled point to inspect its source material and connected concepts." tabindex="0">
          <defs>
            <pattern id="atlas-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="#9BA69B" stroke-opacity=".075" stroke-width=".7"/>
              <circle cx="0" cy="0" r="1" fill="#9BA69B" fill-opacity=".14"/>
            </pattern>
            <pattern id="atlas-grid-major" width="160" height="160" patternUnits="userSpaceOnUse">
              <path d="M160 0H0V160" fill="none" stroke="#B98A6A" stroke-opacity=".12" stroke-width=".8"/>
            </pattern>
            <filter id="atlas-node-shadow" x="-30%" y="-40%" width="160%" height="180%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".26"/>
            </filter>
          </defs>
          <rect x="0" y="0" width="1400" height="820" fill="#0B0D0E"/>
          <rect x="0" y="0" width="1400" height="820" fill="url(#atlas-grid)"/>
          <rect x="0" y="0" width="1400" height="820" fill="url(#atlas-grid-major)"/>
          <g data-atlas-scene></g>
        </svg>
        <div class="atlas-map-scale"><span>0</span><i></i><span>250</span><i></i><span>500 m</span><span class="atlas-scale-note">SCHEMATIC / NOT GEOGRAPHIC</span></div>
        <div class="atlas-map-corner" aria-hidden="true"><span>N</span><b>↑</b></div>
      </div>

      <div class="atlas-legend">
        <span class="atlas-legend-title">RELATIONSHIP KEY</span>
        <span><i class="legend-line legend-prerequisite"></i> Prerequisite</span>
        <span><i class="legend-line legend-covered"></i> Covers / contains</span>
        <span><i class="legend-line legend-tool"></i> Tested with</span>
        <span><i class="legend-line legend-related"></i> Related</span>
      </div>
    </div>

    <aside class="atlas-inspector" aria-label="Selected knowledge point" aria-live="polite">
      <div class="atlas-inspector-top">
        <span>FIELD NOTE / NODE INSPECTOR</span>
        <span data-atlas-node-count>01 / 30</span>
      </div>
      <div data-atlas-inspector>
        <div class="atlas-inspector-empty">
          <span class="atlas-crosshair">⊕</span>
          <strong>Select a point on the map.</strong>
          <p>Inspect its role, source material and documented relationships.</p>
        </div>
      </div>
    </aside>
  </section>

  <section class="atlas-expedition" aria-label="Guided learning routes">
    <div class="atlas-expedition-copy">
      <span class="atlas-overline">GUIDED EXPEDITIONS / 02</span>
      <h2>Don't just browse.<br><em>Follow a line of thought.</em></h2>
      <p>Choose a route to highlight a useful sequence through the existing curriculum. Each stop opens its original lesson.</p>
    </div>
    <div class="atlas-expedition-controls">
      <label for="atlas-route-select">SELECT AN EXPEDITION</label>
      <select id="atlas-route-select" data-atlas-route>
        <option value="first-assessment">Foundations → First assessment</option>
        <option value="api-specialist">API security specialist</option>
        <option value="enterprise-identity">Enterprise identity assessment</option>
      </select>
      <p data-atlas-route-description>Build the network baseline, discover an attack surface, enumerate it and validate a finding.</p>
      <div class="atlas-route-stops" data-atlas-route-stops aria-label="Route stops"></div>
      <button type="button" class="atlas-route-button" data-atlas-trace>Trace this route <span aria-hidden="true">↗</span></button>
    </div>
  </section>

  <footer class="atlas-footnote">
    <span>DATA MODEL / SOURCE-LINKED</span>
    <p>Relationships describe curriculum prerequisites, lesson coverage and tool references. They are curated editorial links—not automatically inferred attack paths. The map is a learning index, not a live threat-intelligence feed.</p>
    <a href="../learn/">Browse the complete learning paths →</a>
  </footer>

  <div class="atlas-noscript" data-atlas-fallback>
    The interactive map needs JavaScript. The underlying learning material remains available in <a href="../learn/">Learning Paths</a> and <a href="../tools/">Tools Reference</a>.
  </div>
</div>

<script defer src="../assets/javascripts/atlas.js"></script>
