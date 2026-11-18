import React, { useMemo, useRef, useState, useEffect } from 'react';

const FLOW = [
  { id: 'scope', title: 'Scope & authorisation', detail: 'Set the rules of engagement before a single packet is sent. Confirm ownership, written permission, exclusions, test identities and stop conditions.', groups: ['level-0', 'tools'], pages: ['level-0-intro-pentesting', 'tools-overview'] },
  { id: 'recon', title: 'Reconnaissance', detail: 'Build a verified picture of the target. Separate passive observations from active probing and turn candidate assets into an approved inventory.', groups: ['level-1', 'tools'], pages: ['level-1-recon', 'tools-recon-tools'] },
  { id: 'map', title: 'Map & enumerate', detail: 'Understand exposed services, application routes, roles and trust boundaries. Use bounded techniques and keep evidence tied to the asset.', groups: ['level-1', 'tools', 'offensive-arsenal'], pages: ['tools-scanning-tools', 'tools-web-tools', 'tools-network-tools'] },
  { id: 'test', title: 'Targeted security testing', detail: 'Choose tests from the technology and threat model. Validate manually, preserve the request/response chain and respect engagement limits.', groups: ['level-2', 'tools', 'offensive-arsenal'], pages: ['tools-ad-tools', 'tools-mobile-tools', 'tools-cloud-tools', 'tools-code-tools'] },
  { id: 'validate', title: 'Validate & prioritise', detail: 'Establish applicability, exploitability and impact. Distinguish scanner output from analyst-confirmed findings and eliminate duplicates.', groups: ['level-2', 'level-3', 'tools'], pages: ['level-1-vulnerability-assessment', 'tools-workflows'] },
  { id: 'evidence', title: 'Evidence, report & retest', detail: 'Create reproducible evidence, communicate remediation and repeat the original test after changes. Close the loop with a clear retest result.', groups: ['level-1', 'level-4', 'tools'], pages: ['level-1-report-writing', 'tools-scripting-automation', 'tools-workflows'] },
];

const RELATIONS = [
  ['api-security-testing', 'bola', 'Authorization boundaries'],
  ['web-app-testing', 'api-security-testing', 'Application surface'],
  ['tools-web-tools', 'api-security-testing', 'Request analysis'],
  ['tools-network-tools', 'infrastructure-testing', 'Network evidence'],
  ['tools-code-tools', 'source-code-review', 'Code assurance'],
  ['ai-security-testing', 'ai-workflows', 'AI security practice'],
];

const COLLECTION_LINKS = [
  ['learning-paths', 'offensive-arsenal'],
  ['tools', 'offensive-arsenal'],
  ['tools', 'ai-intelligence'],
  ['ai-intelligence', 'research-bounty'],
];

function routeFor(page, docsOrigin) {
  if (!page || !page.href || page.href === '#') return '#';
  const path = page.href.endsWith('/') ? page.href : page.href + '/';
  return page.group === 'tools' ? path : docsOrigin.replace(/\/$/, '') + '/' + path;
}

function nodePosition(index, count, layer) {
  const angle = -Math.PI / 2 + index * 2.399963229728653 + (layer === 'groups' ? 0.15 : layer === 'pages' ? -0.1 : 0);
  const spread = Math.sqrt((index + 0.72) / Math.max(count, 1));
  const base = layer === 'collections' ? 244 : layer === 'groups' ? 226 : 238;
  const radius = base * (0.79 + spread * 0.21) * (1 + 0.055 * Math.sin(index * 2.1));
  return {
    x: 470 + Math.cos(angle) * radius * 1.22,
    y: 345 + Math.sin(angle) * radius * 0.83,
    angle,
  };
}

function nodeName(item, layer) {
  if (layer === 'pages') return item.title;
  return item.name || item.label || item.title || item.id;
}

function nodeCode(item, layer) {
  return item.code || item.groupCode || (layer === 'pages' ? 'PAGE' : 'NODE');
}

function shortLabel(value, length = 17) {
  return value.length > length ? value.slice(0, length - 1) + '…' : value;
}

export default function KnowledgeExplorer({ data, docsOrigin }) {
  const [view, setView] = useState('atlas');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showConnections, setShowConnections] = useState(true);
  const searchInput = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        setQuery('');
        searchInput.current?.blur();
        setHoveredNode(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const pageById = useMemo(() => new Map(data.pages.map((page) => [page.id, page])), [data]);
  const groupById = useMemo(() => new Map(data.groups.map((group) => [group.id, group])), [data]);
  const collectionById = useMemo(() => new Map(data.collections.map((collection) => [collection.id, collection])), [data]);

  const activeCollection = selectedCollection ? collectionById.get(selectedCollection) : null;
  const activeGroup = selectedGroup ? groupById.get(selectedGroup) : null;

  const layer = activeGroup ? 'pages' : activeCollection ? 'groups' : 'collections';
  const graphItems = activeGroup
    ? data.pages.filter((page) => page.group === activeGroup.id)
    : activeCollection
      ? activeCollection.groupIds.map((id) => groupById.get(id)).filter(Boolean)
      : data.collections;

  const collectionPages = activeCollection
    ? data.pages.filter((page) => activeCollection.groupIds.includes(page.group))
    : data.pages;

  const inspectorPages = activeGroup
    ? data.pages.filter((page) => page.group === activeGroup.id)
    : collectionPages;

  const searchTerm = query.trim().toLowerCase();
  const searchResults = searchTerm
    ? data.pages.filter((page) => [page.title, page.summary, page.groupLabel, page.groupCode, page.type].filter(Boolean).join(' ').toLowerCase().includes(searchTerm)).slice(0, 10)
    : [];

  const filteredPages = data.pages.filter((page) =>
    (filter === 'all' ||
      (filter === 'learning-paths' && page.group.startsWith('level-')) ||
      page.group === filter ||
      (filter === 'offensive-arsenal' && page.group === 'offensive-arsenal') ||
      (filter === 'ai-intelligence' && page.group === 'ai-intelligence') ||
      (filter === 'research-bounty' && page.group === 'research-bounty') ||
      (filter === 'resources' && page.group === 'resources')) &&
    (!searchTerm || [page.title, page.summary, page.groupLabel].filter(Boolean).join(' ').toLowerCase().includes(searchTerm))
  );

  const stats = [
    { value: String(data.meta.collectionCount || data.collections.length).padStart(2, '0'), label: 'DOMAINS' },
    { value: String(data.meta.groupCount || data.groups.length).padStart(2, '0'), label: 'SUBDOMAINS' },
    { value: String(data.meta.lessonCount || 0).padStart(2, '0'), label: 'LEARNING UNITS' },
    { value: String(data.pages.length).padStart(2, '0'), label: 'INDEXED RESOURCES' },
  ];

  function chooseCollection(id) {
    setSelectedCollection(id);
    setSelectedGroup(null);
    setSelectedPage(null);
    setHoveredNode(null);
    setView('atlas');
  }

  function chooseGroup(id) {
    setSelectedGroup(id);
    setSelectedPage(null);
    setHoveredNode(null);
  }

  function choosePage(page) {
    setSelectedPage(page);
    setQuery('');
    setHoveredNode(null);
  }

  function resetAtlas() {
    setSelectedCollection(null);
    setSelectedGroup(null);
    setSelectedPage(null);
    setHoveredNode(null);
  }

  function openSearchResult(page) {
    const collection = data.collections.find((item) => item.groupIds.includes(page.group));
    setSelectedCollection(collection?.id || null);
    setSelectedGroup(page.group);
    setSelectedPage(page);
    setView('atlas');
    setQuery('');
  }

  const selectedEntity = selectedPage || activeGroup || activeCollection;
  const inspectorTitle = selectedPage?.title || activeGroup?.name || activeCollection?.name || 'The knowledge field';
  const inspectorSummary = selectedPage?.summary || activeGroup?.description || activeCollection?.summary || 'A connected map of offensive security, defensive practice, automation, research and technical foundations. Select a domain to start navigating.';
  const centerTitle = activeGroup ? activeGroup.code : activeCollection ? activeCollection.code : 'Z2R / ATLAS';
  const centerSub = activeGroup ? 'RESOURCE CLUSTER' : activeCollection ? 'DOMAIN IN FOCUS' : 'CONNECTED KNOWLEDGE';

  function handleNodeClick(item) {
    if (layer === 'collections') chooseCollection(item.id);
    else if (layer === 'groups') chooseGroup(item.id);
    else choosePage(item);
  }

  return (
    <div className="atlas-app">
      <header className="atlas-topbar">
        <a className="atlas-brand" href="/" aria-label="Zero2Root home">
          <span className="atlas-brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 44 44"><path d="M7 10.5 22 3l15 7.5v23L22 41 7 33.5z" /><path d="M14 15h16M14 22h11M14 29h16" /><path d="M30 15v14" /></svg>
          </span>
          <span className="atlas-brand-lockup"><strong>ZERO<span>2</span>ROOT</strong><small>SECURITY KNOWLEDGE / FIELD ATLAS</small></span>
        </a>
        <div className="atlas-header-center"><span className="atlas-header-rule" /> <span>INDEPENDENT SECURITY RESEARCH</span> <span className="atlas-header-rule" /></div>
        <div className="atlas-header-actions">
          <span className="atlas-status"><i /> PROTOTYPE / 01</span>
          <a href="/tools/" className="atlas-library-link">TECHNICAL LIBRARY <b>↗</b></a>
        </div>
      </header>

      <main className="atlas-main">
        <section className="atlas-hero">
          <div className="atlas-hero-copy">
            <div className="atlas-kicker"><span>FIELD ATLAS</span><i /> <span>VOL. 001 — KNOWLEDGE SYSTEMS</span></div>
            <h1>Think in systems.<br /><em>Navigate the unknown.</em></h1>
            <p>Not another list of links. A navigable map of the disciplines, tools and ideas that shape modern security work.</p>
            <div className="atlas-hero-actions">
              <button className="atlas-primary-button" onClick={() => { setView('atlas'); resetAtlas(); document.getElementById('atlas-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>ENTER THE ATLAS <span>↘</span></button>
              <span className="atlas-hero-note">MAP THE SURFACE / TRACE THE CONNECTIONS</span>
            </div>
          </div>
          <div className="atlas-hero-side">
            <div className="atlas-index-orbit" aria-hidden="true">
              <span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" />
              <span className="orbit-core"><b>Z</b><i>2R</i></span><span className="orbit-point point-one" /><span className="orbit-point point-two" /><span className="orbit-point point-three" />
              <span className="orbit-cross cross-one" /><span className="orbit-cross cross-two" />
            </div>
            <div className="atlas-index-meta"><span>INDEX STATUS</span><strong>CONNECTED / ACTIVE</strong><small>CONTENT GRAPH · CURATED RELATIONSHIPS</small></div>
          </div>
          <div className="atlas-stats" aria-label="Knowledge library statistics">
            {stats.map((item, index) => <div className="atlas-stat" key={item.label}><span className="atlas-stat-index">0{index + 1}</span><strong>{item.value}</strong><small>{item.label}</small></div>)}
          </div>
          <div className="atlas-hero-coordinate" aria-hidden="true">17° 23' N<br />78° 29' E</div>
        </section>

        <section id="atlas-workspace" className="atlas-workspace">
          <div className="atlas-workspace-heading">
            <div><div className="atlas-kicker"><span>01 / EXPLORE</span><i /> <span>INTERACTIVE KNOWLEDGE TOPOLOGY</span></div><h2>Choose your point of entry<span>.</span></h2></div>
            <div className="atlas-view-tabs" role="tablist" aria-label="Atlas views">
              <button role="tab" aria-selected={view === 'atlas'} className={view === 'atlas' ? 'active' : ''} onClick={() => setView('atlas')}>01 <span>Atlas</span></button>
              <button role="tab" aria-selected={view === 'workflow'} className={view === 'workflow' ? 'active' : ''} onClick={() => { setView('workflow'); setSelectedPage(null); }}>02 <span>Method</span></button>
              <button role="tab" aria-selected={view === 'directory'} className={view === 'directory' ? 'active' : ''} onClick={() => { setView('directory'); setSelectedPage(null); }}>03 <span>Index</span></button>
            </div>
          </div>

          <div className="atlas-tools-row">
            <label className="atlas-search">
              <span className="atlas-search-symbol">⌕</span>
              <input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a concept, technique, tool or discipline…" aria-label="Search knowledge atlas" />
              <kbd>/</kbd>
              {query && <button aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
            </label>
            <button className={'atlas-connection-toggle ' + (showConnections ? 'active' : '')} onClick={() => setShowConnections((value) => !value)} disabled={view !== 'atlas'}><span className="connection-glyph">⌘</span> CONNECTIONS <i /></button>
          </div>

          {query && (
            <div className="atlas-search-results">
              <div className="atlas-search-results-head"><span>SEARCH / LIVE INDEX</span><b>{searchResults.length} MATCHES</b></div>
              {searchResults.length ? searchResults.map((page, index) => (
                <button key={page.id} onClick={() => openSearchResult(page)}><span className="result-index">{String(index + 1).padStart(2, '0')}</span><span className="result-code">{page.groupCode}</span><strong>{page.title}</strong><small>{page.summary}</small><b>↗</b></button>
              )) : <p>No results in this index. Try a broader term.</p>}
            </div>
          )}

          {view === 'atlas' && (
            <div className="atlas-layout">
              <nav className="atlas-domain-rail" aria-label="Knowledge domains">
                <div className="atlas-rail-label">DOMAINS <span>06</span></div>
                <button className={'atlas-domain-item all ' + (!activeCollection ? 'selected' : '')} onClick={resetAtlas}><span className="domain-index">00</span><span className="domain-name">All fields</span><i>↗</i></button>
                {data.collections.map((collection, index) => (
                  <button key={collection.id} className={'atlas-domain-item ' + (selectedCollection === collection.id ? 'selected' : '')} onClick={() => chooseCollection(collection.id)}>
                    <span className="domain-index">{String(index + 1).padStart(2, '0')}</span><span className="domain-swatch" style={{ '--domain-color': collection.color }} /><span className="domain-name">{collection.label}</span><i>↗</i>
                  </button>
                ))}
                <div className="atlas-rail-bottom"><span>FIELD KEY</span><small><i className="key-dot" /> DOMAIN</small><small><i className="key-ring" /> SELECTED</small></div>
              </nav>

              <div className="atlas-map-shell">
                <div className="atlas-map-head">
                  <div><span className="atlas-map-live"><i /> LIVE INDEX</span><span className="atlas-map-layer">{layer === 'collections' ? 'GLOBAL TOPOLOGY' : layer === 'groups' ? 'DOMAIN EXPANSION' : 'RESOURCE CLUSTER'}</span></div>
                  <div className="atlas-map-controls"><button onClick={resetAtlas} disabled={!activeCollection}>RESET <b>↺</b></button><span>GRID / 24</span></div>
                </div>
                <div className={'atlas-map-canvas layer-' + layer}>
                  <div className="atlas-map-ambient" aria-hidden="true"><span /><span /><span /></div>
                  <svg viewBox="0 0 940 690" role="group" aria-label="Interactive Zero2Root knowledge graph">
                    <defs>
                      <pattern id="atlas-micro-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#b5c0b5" strokeOpacity=".075" strokeWidth=".6" /><circle cx="0" cy="0" r=".9" fill="#b5c0b5" fillOpacity=".13" /></pattern>
                      <radialGradient id="atlas-wash"><stop stopColor="#c98c64" stopOpacity=".12" /><stop offset=".52" stopColor="#81988b" stopOpacity=".045" /><stop offset="1" stopColor="#0b1011" stopOpacity="0" /></radialGradient>
                      <linearGradient id="atlas-edge-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9aab9c" stopOpacity=".05" /><stop offset=".5" stopColor="#c88e68" stopOpacity=".65" /><stop offset="1" stopColor="#9aab9c" stopOpacity=".08" /></linearGradient>
                      <filter id="atlas-soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    </defs>
                    <rect width="940" height="690" fill="url(#atlas-micro-grid)" />
                    <ellipse cx="470" cy="345" rx="400" ry="300" fill="url(#atlas-wash)" />
                    <g className="atlas-contours" aria-hidden="true">
                      <ellipse cx="470" cy="345" rx="354" ry="268" /><ellipse cx="470" cy="345" rx="300" ry="226" /><ellipse cx="470" cy="345" rx="246" ry="184" />
                      <path d="M62 345H878M470 45V645" /><path d="M142 125 798 565M798 125 142 565" className="atlas-cross-grid" />
                    </g>
                    <g className="atlas-sweep" aria-hidden="true"><circle cx="470" cy="345" r="245" /></g>
                    <g className="atlas-edges">
                      {graphItems.map((item, index) => {
                        const p = nodePosition(index, graphItems.length, layer);
                        const bend = (index % 2 === 0 ? 1 : -1) * (28 + (index % 3) * 12);
                        const mx = (470 + p.x) / 2 + bend;
                        const my = (345 + p.y) / 2 - bend * 0.42;
                        return <path key={'edge-' + item.id} d={'M470 345 Q' + mx + ' ' + my + ' ' + p.x + ' ' + p.y} className="atlas-link" style={{ '--edge-delay': (index * 95) + 'ms' }} />;
                      })}
                      {showConnections && layer === 'collections' && COLLECTION_LINKS.map(([from, to]) => {
                        const aIndex = data.collections.findIndex((item) => item.id === from);
                        const bIndex = data.collections.findIndex((item) => item.id === to);
                        if (aIndex < 0 || bIndex < 0) return null;
                        const a = nodePosition(aIndex, data.collections.length, 'collections');
                        const b = nodePosition(bIndex, data.collections.length, 'collections');
                        return <path key={from + to} d={'M' + a.x + ' ' + a.y + ' Q470 345 ' + b.x + ' ' + b.y} className="atlas-link atlas-link-cross" />;
                      })}
                      {showConnections && layer === 'pages' && inspectorPages.length > 1 && inspectorPages.slice(0, -1).map((page, index) => {
                        const a = nodePosition(index, graphItems.length, layer);
                        const b = nodePosition(index + 1, graphItems.length, layer);
                        return <path key={'sequence-' + page.id} d={'M' + a.x + ' ' + a.y + ' Q470 345 ' + b.x + ' ' + b.y} className="atlas-link atlas-link-sequence" />;
                      })}
                    </g>
                    <g className="atlas-nodes">
                      {graphItems.map((item, index) => {
                        const p = nodePosition(index, graphItems.length, layer);
                        const label = nodeName(item, layer);
                        const isSelected = (layer === 'collections' && selectedCollection === item.id) || (layer === 'groups' && selectedGroup === item.id) || (layer === 'pages' && selectedPage?.id === item.id);
                        const isHovered = hoveredNode === item.id;
                        const color = item.color || '#c98c64';
                        const size = layer === 'collections' ? 30 : layer === 'groups' ? 25 : 19;
                        return (
                          <g key={item.id} className={'atlas-node ' + (isSelected ? 'selected' : '') + (isHovered ? ' hovered' : '')} role="button" tabIndex="0" aria-label={'Open ' + label} onMouseEnter={() => setHoveredNode(item.id)} onMouseLeave={() => setHoveredNode(null)} onFocus={() => setHoveredNode(item.id)} onBlur={() => setHoveredNode(null)} onClick={() => handleNodeClick(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleNodeClick(item); } }}>
                            <circle className="atlas-node-aura" cx={p.x} cy={p.y} r={size + 16} style={{ '--node-color': color }} />
                            <circle className="atlas-node-ring" cx={p.x} cy={p.y} r={size + 7} />
                            <circle className="atlas-node-core" cx={p.x} cy={p.y} r={size} style={{ '--node-color': color }} />
                            <path className="atlas-node-cross" d={'M' + (p.x - 5) + ' ' + p.y + 'h10M' + p.x + ' ' + (p.y - 5) + 'v10'} />
                            <text x={p.x} y={p.y + size + 23} className="atlas-node-code">{nodeCode(item, layer)}</text>
                            <text x={p.x} y={p.y + size + 39} className="atlas-node-label">{shortLabel(label, layer === 'pages' ? 19 : 21)}</text>
                            {(layer !== 'pages' && item.pageCount !== undefined) && <text x={p.x} y={p.y + 4} className="atlas-node-count">{item.pageCount}</text>}
                          </g>
                        );
                      })}
                      <g className="atlas-hub">
                        <circle cx="470" cy="345" r="91" className="atlas-hub-aura" />
                        <circle cx="470" cy="345" r="75" className="atlas-hub-orbit" />
                        <circle cx="470" cy="345" r="62" className="atlas-hub-core" />
                        <path d="M470 291v-12m0 132v-12m-54-54h-12m132 0h-12" className="atlas-hub-ticks" />
                        <text x="470" y="337" className="atlas-hub-title">{centerTitle}</text>
                        <text x="470" y="357" className="atlas-hub-sub">{centerSub}</text>
                        <text x="470" y="376" className="atlas-hub-count">{graphItems.length} {layer.toUpperCase()}</text>
                      </g>
                    </g>
                  </svg>
                  {hoveredNode && (
                    <div className="atlas-hover-readout"><span>FOCUS / NODE</span><strong>{nodeName(graphItems.find((item) => item.id === hoveredNode) || {}, layer)}</strong><small>SELECT TO INSPECT ↗</small></div>
                  )}
                  <div className="atlas-map-coordinate coordinate-nw">N / 01<br /><span>FIELD MAP</span></div>
                  <div className="atlas-map-coordinate coordinate-se">Z2R / {String(data.pages.length).padStart(3, '0')}<br /><span>INDEXED POINTS</span></div>
                </div>
                <div className="atlas-map-footer"><span><i className="legend-node" /> ENTITY</span><span><i className="legend-path" /> RELATION</span><span><i className="legend-active" /> FOCUS</span><strong>{layer === 'collections' ? 'SELECT A DOMAIN TO DESCEND' : layer === 'groups' ? 'SELECT A SUBDOMAIN TO OPEN ITS CLUSTER' : 'SELECT A RESOURCE TO INSPECT'}</strong></div>
              </div>

              <aside className="atlas-dossier">
                <div className="atlas-dossier-top"><span>FIELD DOSSIER / 01</span><span className="atlas-dossier-status"><i /> OPEN</span></div>
                <div className="atlas-dossier-path">
                  <button onClick={resetAtlas}>ROOT</button>
                  {activeCollection && <><i>/</i><button onClick={() => { setSelectedGroup(null); setSelectedPage(null); }}>{activeCollection.code}</button></>}
                  {activeGroup && <><i>/</i><button onClick={() => setSelectedPage(null)}>{activeGroup.code}</button></>}
                </div>
                <div className="atlas-dossier-content">
                  <div className="atlas-dossier-number">{selectedPage ? selectedPage.groupCode : activeGroup ? activeGroup.code : activeCollection ? activeCollection.code : 'Z2R'}</div>
                  <span className="atlas-dossier-kind">{selectedPage ? selectedPage.type.replaceAll('-', ' ').toUpperCase() : activeGroup?.kind?.toUpperCase() || activeCollection?.kind?.toUpperCase() || 'KNOWLEDGE SYSTEM'}</span>
                  <h3>{inspectorTitle}</h3>
                  <p>{inspectorSummary}</p>
                  <div className="atlas-dossier-rule" />
                  <div className="atlas-dossier-metrics">
                    <div><strong>{selectedPage ? '01' : activeGroup ? inspectorPages.length : activeCollection ? inspectorPages.length : data.pages.length}</strong><span>{selectedPage ? 'RESOURCE' : 'RESOURCES'}</span></div>
                    <div><strong>{selectedPage ? '↗' : activeGroup ? '03' : activeCollection ? activeCollection.groupIds.length : data.collections.length}</strong><span>{selectedPage ? 'OPEN' : activeGroup ? 'LAYER' : 'SUBDOMAINS'}</span></div>
                  </div>
                  {selectedPage ? (
                    <a className="atlas-dossier-action" href={routeFor(selectedPage, docsOrigin)}>OPEN RESOURCE <b>↗</b></a>
                  ) : (
                    <div className="atlas-dossier-links">
                      <div className="atlas-dossier-links-head"><span>{activeGroup ? 'IN THIS CLUSTER' : activeCollection ? 'WITHIN THIS DOMAIN' : 'START EXPLORING'}</span><b>{Math.min(inspectorPages.length, 5).toString().padStart(2, '0')} / {inspectorPages.length.toString().padStart(2, '0')}</b></div>
                      {activeGroup ? inspectorPages.slice(0, 5).map((page, index) => (
                        <button key={page.id} onClick={() => choosePage(page)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{page.title}</strong><i>↗</i></button>
                      )) : activeCollection ? activeCollection.groupIds.map((id, index) => {
                        const group = groupById.get(id);
                        return group ? <button key={id} onClick={() => chooseGroup(id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{group.name}</strong><i>↗</i></button> : null;
                      }) : data.collections.slice(0, 5).map((collection, index) => (
                        <button key={collection.id} onClick={() => chooseCollection(collection.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{collection.name}</strong><i>↗</i></button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="atlas-dossier-bottom"><span>INDEX SOURCE / CURATED</span><span>VER. 01.0</span></div>
              </aside>
            </div>
          )}

          {view === 'workflow' && (
            <div className="atlas-method-layout">
              <div className="atlas-method-intro"><span>02 / METHOD</span><h3>From first signal<br /><em>to verified finding.</em></h3><p>A controlled assessment is a sequence of decisions. Select a stage to see the knowledge areas that support it.</p></div>
              <div className="atlas-method-track">
                {FLOW.map((step, index) => (
                  <button key={step.id} className={'atlas-method-step ' + (selectedPage?.id === step.id ? 'selected' : '')} onClick={() => setSelectedPage({ ...step, id: step.id, type: 'workflow-stage', summary: step.detail, title: step.title, groupLabel: 'Assessment method', groupCode: 'FLOW', href: '#' })}>
                    <span className="method-step-no">{String(index + 1).padStart(2, '0')}</span><span className="method-step-line" /><strong>{step.title}</strong><small>{step.groups.length} linked domains</small><b>↗</b>
                  </button>
                ))}
              </div>
              <aside className="atlas-method-dossier"><span>METHOD NOTE / SELECTED STAGE</span><h3>{FLOW.find((step) => step.id === selectedPage?.id)?.title || 'A repeatable process'}</h3><p>{FLOW.find((step) => step.id === selectedPage?.id)?.detail || 'Move through the stages in order, keeping authorisation, evidence and validation connected throughout the engagement.'}</p><div className="atlas-related-pages">{(FLOW.find((step) => step.id === selectedPage?.id)?.pages || FLOW[0].pages).map((id) => pageById.get(id)).filter(Boolean).map((page) => <a key={page.id} href={routeFor(page, docsOrigin)}><span>{page.groupCode}</span><strong>{page.title}</strong><b>↗</b></a>)}</div></aside>
            </div>
          )}

          {view === 'directory' && (
            <div className="atlas-directory">
              <div className="atlas-directory-head"><div><span>03 / INDEX</span><h3>Every entry.<br /><em>One connected field.</em></h3></div><p>Search and filter the indexed destinations. Open any resource to move from the map into the underlying technical material.</p></div>
              <div className="atlas-directory-filters">{[['all', 'All entries'], ['learning-paths', 'Learning paths'], ['tools', 'Tools'], ['ai-intelligence', 'AI security'], ['offensive-arsenal', 'Offensive security'], ['research-bounty', 'Research'], ['resources', 'Career']].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
              <div className="atlas-directory-grid">{filteredPages.map((page, index) => <a className="atlas-directory-card" key={page.id} href={routeFor(page, docsOrigin)}><span><i>{String(index + 1).padStart(2, '0')}</i>{page.groupCode} / {page.type.replaceAll('-', ' ')}</span><strong>{page.title}</strong><small>{page.summary}</small><b>OPEN RESOURCE ↗</b></a>)}</div>
              <div className="atlas-directory-count">DISPLAYING {filteredPages.length} / {data.pages.length} DESTINATIONS <span>·</span> CURATED INDEX</div>
            </div>
          )}

          {view === 'atlas' && showConnections && (
            <div className="atlas-relations-strip"><div><span>RELATIONSHIP LAYER</span><strong>Concept links across the field</strong></div><div className="atlas-relations-list">{RELATIONS.slice(0, 4).map(([from, to, label]) => <span key={from + to}><b>{pageById.get(from)?.title || from.replaceAll('-', ' ')}</b><i>→</i><b>{pageById.get(to)?.title || to.replaceAll('-', ' ')}</b><small>{label}</small></span>)}</div></div>
          )}
        </section>

        <footer className="atlas-footer"><span>ZERO2ROOT <i>×</i> FIELD ATLAS / 2026</span><span>MAP THE SURFACE. UNDERSTAND THE SYSTEM.</span><span>PROTOTYPE / NOT PRODUCTION</span></footer>
      </main>
    </div>
  );
}
