import React, { useMemo, useState } from 'react';

const FLOW = [
  { id: 'scope', title: 'Scope & authorisation', detail: 'Confirm written permission, assets, exclusions, test identities, windows and stop conditions.', groups: ['level-0', 'tools'], pages: ['level-0-intro-pentesting', 'tools-overview'] },
  { id: 'recon', title: 'Reconnaissance', detail: 'Collect passive observations, establish ownership and convert candidates into an approved asset inventory.', groups: ['level-1', 'tools'], pages: ['level-1-recon', 'tools-recon-tools'] },
  { id: 'map', title: 'Map & enumerate', detail: 'Identify live hosts, services, application routes, roles and trust boundaries using bounded techniques.', groups: ['level-1', 'tools', 'offensive-arsenal'], pages: ['tools-scanning-tools', 'tools-web-tools', 'tools-network-tools'] },
  { id: 'test', title: 'Targeted security testing', detail: 'Select techniques based on the target technology and engagement rules. Keep manual validation in the loop.', groups: ['level-2', 'tools', 'offensive-arsenal'], pages: ['tools-ad-tools', 'tools-mobile-tools', 'tools-cloud-tools', 'tools-code-tools'] },
  { id: 'validate', title: 'Validate & prioritise', detail: 'Confirm applicability, exploitability and impact. Separate scanner output from analyst-confirmed findings.', groups: ['level-2', 'level-3', 'tools'], pages: ['level-1-vulnerability-assessment', 'tools-workflows'] },
  { id: 'evidence', title: 'Evidence, report & retest', detail: 'Preserve reproducible evidence, communicate remediation and repeat the original test after changes.', groups: ['level-1', 'level-4', 'tools'], pages: ['level-1-report-writing', 'tools-scripting-automation', 'tools-workflows'] },
];

const RELATIONS = [
  ['api-security-testing', 'bola', 'BOLA is a core API authorisation test'],
  ['web-app-testing', 'api-security-testing', 'API routes are part of application attack surface'],
  ['tools-web-tools', 'api-security-testing', 'Proxy and request replay support API tests'],
  ['tools-network-tools', 'infrastructure-testing', 'Packet evidence validates network behaviour'],
  ['tools-code-tools', 'source-code-review', 'SAST and dependency analysis support code review'],
  ['ai-security-testing', 'ai-workflows', 'Secure AI systems and secure AI-assisted testing are related'],
];

function routeFor(page, docsOrigin) {
  if (!page) return '#';
  const path = page.href.endsWith('/') ? page.href : page.href + '/';
  return page.href.startsWith('tools/') ? path : docsOrigin.replace(/\/$/, '') + '/' + path;
}

function polar(index, count, radius, cx = 460, cy = 340, start = -Math.PI / 2) {
  const angle = start + (Math.PI * 2 * index) / count;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

export default function KnowledgeExplorer({ data, docsOrigin }) {
  const [view, setView] = useState('explore');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showRelations, setShowRelations] = useState(false);

  const pageById = useMemo(() => new Map(data.pages.map((page) => [page.id, page])), [data]);
  const groupById = useMemo(() => new Map(data.groups.map((group) => [group.id, group])), [data]);
  const collectionById = useMemo(() => new Map(data.collections.map((collection) => [collection.id, collection])), [data]);

  const selectedCollectionData = selectedCollection ? collectionById.get(selectedCollection) : null;
  const selectedGroupData = selectedGroup ? groupById.get(selectedGroup) : null;
  const visibleGroups = selectedCollectionData
    ? selectedCollectionData.groupIds.map((id) => groupById.get(id)).filter(Boolean)
    : data.groups;

  const currentPages = selectedGroup
    ? data.pages.filter((page) => page.group === selectedGroup)
    : selectedCollectionData
      ? data.pages.filter((page) => selectedCollectionData.groupIds.includes(page.group))
      : data.pages;

  const searchTerm = query.trim().toLowerCase();
  const searchResults = searchTerm
    ? data.pages.filter((page) =>
        [page.title, page.summary, page.groupLabel, page.groupCode, page.type]
          .filter(Boolean).join(' ').toLowerCase().includes(searchTerm)
      ).slice(0, 12)
    : [];

  const filteredPages = data.pages.filter((page) =>
    (filter === 'all' || page.group === filter || (filter === 'learning-paths' && page.group.startsWith('level-'))) &&
    (!searchTerm || [page.title, page.summary, page.groupLabel].filter(Boolean).join(' ').toLowerCase().includes(searchTerm))
  );

  const stats = [
    { value: String(data.meta.learningLevels).padStart(2, '0'), label: 'LEARNING LEVELS' },
    { value: String(data.meta.lessonCount).padStart(2, '0'), label: 'LESSONS' },
    { value: String(data.meta.toolGuideCount + 1).padStart(2, '0'), label: 'TOOLS PAGES' },
    { value: String(data.pages.length).padStart(2, '0'), label: 'INDEXED PAGES' },
  ];

  function chooseCollection(id) {
    setSelectedCollection(id);
    setSelectedGroup(null);
    setSelectedPage(null);
    setShowRelations(false);
  }
  function chooseGroup(id) {
    setSelectedGroup(id);
    setSelectedPage(null);
  }
  function choosePage(page) {
    setSelectedPage(page);
    setQuery('');
  }
  function resetMap() {
    setSelectedCollection(null);
    setSelectedGroup(null);
    setSelectedPage(null);
    setShowRelations(false);
  }

  const focusedGroupPages = selectedGroup
    ? data.pages.filter((page) => page.group === selectedGroup)
    : currentPages;

  const graphItems = selectedCollectionData
    ? visibleGroups
    : data.collections;

  const graphCenter = { x: 460, y: 340 };
  const nodeRadius = selectedCollectionData ? (graphItems.length > 7 ? 205 : 190) : 238;

  return (
    <div className="z2r-app">
      <header className="z2r-topbar">
        <a className="z2r-brand" href="/" aria-label="Zero2Root home">
          <span className="z2r-brand-mark">Z<span>2</span>R</span>
          <span className="z2r-brand-word">ZERO2ROOT<small>SECURITY KNOWLEDGE SYSTEM</small></span>
        </a>
        <div className="z2r-top-actions">
          <span className="z2r-preview-label"><i /> PROTOTYPE / NOT PRODUCTION</span>
          <a href="/tools/" className="z2r-top-link">Technical library <span>↗</span></a>
        </div>
      </header>

      <main>
        <section className="z2r-hero">
          <div className="z2r-eyebrow"><span>FIELD INTELLIGENCE / 001</span><b /> CONNECTED SECURITY KNOWLEDGE</div>
          <h1>Understand the system.<br /><em>Explore the weakness.</em></h1>
          <p className="z2r-hero-copy">A connected map of cybersecurity concepts, assessment methods, tools and research. Explore by domain, follow an assessment path, or jump directly to a technical guide.</p>
          <div className="z2r-stats">
            {stats.map((item) => <div className="z2r-stat" key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
        </section>

        <section className="z2r-workspace" aria-label="Knowledge explorer workspace">
          <div className="z2r-workspace-head">
            <div>
              <div className="z2r-section-kicker">KNOWLEDGE INTERFACE / LIVE INDEX</div>
              <h2>{view === 'explore' ? 'Explore the knowledge graph' : view === 'workflow' ? 'Assessment lifecycle' : 'Browse the library'}</h2>
              <p>{view === 'explore' ? 'Select a domain to reveal its structure and the material connected to it.' : view === 'workflow' ? 'Follow the stages of a controlled security assessment.' : 'Search and filter the complete content index.'}</p>
            </div>
            <div className="z2r-view-switch" role="tablist" aria-label="Explorer views">
              <button role="tab" aria-selected={view === 'explore'} className={view === 'explore' ? 'active' : ''} onClick={() => setView('explore')}>Explorer</button>
              <button role="tab" aria-selected={view === 'workflow'} className={view === 'workflow' ? 'active' : ''} onClick={() => setView('workflow')}>Workflow</button>
              <button role="tab" aria-selected={view === 'directory'} className={view === 'directory' ? 'active' : ''} onClick={() => setView('directory')}>Directory</button>
            </div>
          </div>

          <div className="z2r-search-row">
            <label className="z2r-search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concepts, lessons, tools and guides…" aria-label="Search Zero2Root knowledge" />
              <kbd>/</kbd>
              {query && <button aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
            </label>
            <button className={'z2r-relationship-toggle ' + (showRelations ? 'active' : '')} onClick={() => setShowRelations((value) => !value)} disabled={view !== 'explore'}>↗ <span>Relationships</span></button>
          </div>

          {query && (
            <div className="z2r-search-results">
              <div className="z2r-panel-kicker">SEARCH RESULTS / {searchResults.length} MATCHES SHOWN</div>
              {searchResults.length ? searchResults.map((page) => (
                <button key={page.id} onClick={() => { chooseCollection(data.collections.find((c) => c.groupIds.includes(page.group))?.id || null); chooseGroup(page.group); choosePage(page); setView('explore'); }}>
                  <span>{page.groupCode}</span><strong>{page.title}</strong><small>{page.summary}</small><b>↗</b>
                </button>
              )) : <p className="z2r-empty">No matching pages. Try another term.</p>}
            </div>
          )}

          {view === 'explore' && (
            <div className="z2r-explorer-layout">
              <div className="z2r-map-panel">
                <div className="z2r-map-toolbar">
                  <div><span className="z2r-live-dot" /> KNOWLEDGE MAP <small>{selectedCollectionData ? selectedCollectionData.name.toUpperCase() : 'ALL COLLECTIONS'}</small></div>
                  <button onClick={resetMap} disabled={!selectedCollection}>↺ Reset view</button>
                </div>
                <div className="z2r-map-canvas">
                  <svg viewBox="0 0 920 680" role="group" aria-label="Interactive graph of Zero2Root knowledge domains">
                    <defs>
                      <pattern id="z2r-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                        <path d="M26 0H0V26" fill="none" stroke="currentColor" strokeOpacity=".09" strokeWidth=".7" />
                        <circle cx="0" cy="0" r="1" fill="currentColor" fillOpacity=".11" />
                      </pattern>
                      <radialGradient id="z2r-map-glow"><stop stopColor="#a87958" stopOpacity=".10" /><stop offset="1" stopColor="#111416" stopOpacity="0" /></radialGradient>
                    </defs>
                    <rect width="920" height="680" fill="url(#z2r-grid)" />
                    <rect width="920" height="680" fill="url(#z2r-map-glow)" />
                    <g className="z2r-map-orbits">
                      <circle cx="460" cy="340" r={selectedCollectionData ? 190 : 238} />
                      <circle cx="460" cy="340" r={selectedCollectionData ? 245 : 292} />
                    </g>
                    <g className="z2r-map-edges">
                      {graphItems.map((item, index) => {
                        const p = polar(index, graphItems.length, nodeRadius);
                        return <line key={item.id} x1={graphCenter.x} y1={graphCenter.y} x2={p.x} y2={p.y} />;
                      })}
                      {showRelations && !selectedCollectionData && RELATIONS.slice(0, 4).map((relation, index) => {
                        const a = polar(index % data.collections.length, data.collections.length, nodeRadius);
                        const b = polar((index + 2) % data.collections.length, data.collections.length, nodeRadius);
                        return <path key={relation.join('-')} d={'M ' + a.x + ' ' + a.y + ' Q 460 340 ' + b.x + ' ' + b.y} className="z2r-cross-edge" />;
                      })}
                    </g>
                    <g className="z2r-map-nodes">
                      {graphItems.map((item, index) => {
                        const p = polar(index, graphItems.length, nodeRadius);
                        const isSelected = selectedCollectionData ? selectedGroup === item.id : selectedCollection === item.id;
                        const label = selectedCollectionData ? item.label : item.label;
                        return (
                          <g key={item.id} className={'z2r-node ' + (isSelected ? 'selected' : '')} role="button" tabIndex="0" aria-label={'Open ' + item.name} onClick={() => selectedCollectionData ? chooseGroup(item.id) : chooseCollection(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectedCollectionData ? chooseGroup(item.id) : chooseCollection(item.id); } }}>
                            <circle className="z2r-node-halo" cx={p.x} cy={p.y} r={selectedCollectionData ? 54 : 60} />
                            <circle className="z2r-node-core" cx={p.x} cy={p.y} r={selectedCollectionData ? 42 : 47} />
                            <text x={p.x} y={p.y - 4} className="z2r-node-code">{item.code}</text>
                            <text x={p.x} y={p.y + 14} className="z2r-node-label">{label.length > 17 ? label.slice(0, 16) + '…' : label}</text>
                          </g>
                        );
                      })}
                      <g className="z2r-map-center">
                        <circle cx="460" cy="340" r="83" />
                        <circle cx="460" cy="340" r="72" />
                        <text x="460" y="329" className="z2r-center-mark">Z2R</text>
                        <text x="460" y="351" className="z2r-center-caption">{selectedCollectionData ? selectedCollectionData.code : 'KNOWLEDGE'}</text>
                        <text x="460" y="369" className="z2r-center-count">{selectedCollectionData ? visibleGroups.reduce((sum, group) => sum + group.pageCount, 0) + ' PAGES' : data.pages.length + ' PAGES'}</text>
                      </g>
                    </g>
                  </svg>
                </div>
                <div className="z2r-map-legend">
                  <span><i className="domain" /> DOMAIN / COLLECTION</span>
                  <span><i className="line" /> CONNECTED TOPICS</span>
                  <span>SELECT A NODE TO EXPAND ↗</span>
                </div>
              </div>

              <aside className="z2r-inspector">
                <div className="z2r-inspector-head">
                  <div className="z2r-panel-kicker">CONTEXT / INSPECTOR</div>
                  <div className="z2r-breadcrumbs">
                    <button onClick={resetMap}>Library</button>
                    {selectedCollectionData && <><span>/</span><button onClick={() => { setSelectedGroup(null); setSelectedPage(null); }}>{selectedCollectionData.label}</button></>}
                    {selectedGroupData && <><span>/</span><button onClick={() => setSelectedPage(null)}>{selectedGroupData.label}</button></>}
                  </div>
                </div>
                {selectedPage ? (
                  <div className="z2r-inspector-content">
                    <span className="z2r-content-type">{selectedPage.type.replaceAll('-', ' ').toUpperCase()}</span>
                    <h3>{selectedPage.title}</h3>
                    <p>{selectedPage.summary}</p>
                    <div className="z2r-content-meta"><span>{selectedPage.groupLabel}</span><span>{selectedPage.groupCode}</span></div>
                    <a className="z2r-primary-action" href={routeFor(selectedPage, docsOrigin)}>{selectedPage.group === 'tools' ? 'Open technical guide' : 'Open current guide'} <b>↗</b></a>
                    <button className="z2r-text-action" onClick={() => setSelectedPage(null)}>← Back to topic list</button>
                  </div>
                ) : (
                  <div className="z2r-inspector-content">
                    <span className="z2r-content-type">{selectedGroupData ? selectedGroupData.kind.toUpperCase() : selectedCollectionData ? selectedCollectionData.kind.toUpperCase() : 'KNOWLEDGE LIBRARY'}</span>
                    <h3>{selectedGroupData?.name || selectedCollectionData?.name || 'Explore Zero2Root'}</h3>
                    <p>{selectedGroupData ? 'Browse the material within this knowledge area. Select a page to inspect its purpose and open the full guide.' : selectedCollectionData?.summary || 'Choose a domain on the map to inspect its subdomains, lessons and practical references.'}</p>
                    <div className="z2r-content-meta"><span>{focusedGroupPages.length} PAGES</span><span>{selectedGroupData?.code || selectedCollectionData?.code || 'ALL DOMAINS'}</span></div>
                    <div className="z2r-child-list">
                      {focusedGroupPages.map((page) => (
                        <button key={page.id} onClick={() => choosePage(page)}>
                          <span>{page.index !== undefined ? String(page.index + 1).padStart(2, '0') : '↗'}</span>
                          <div><strong>{page.title}</strong><small>{page.summary}</small></div>
                          <b>↗</b>
                        </button>
                      ))}
                      {!focusedGroupPages.length && <p className="z2r-empty">Select a topic to see its pages.</p>}
                    </div>
                  </div>
                )}
                <div className="z2r-inspector-footer"><span>INDEXED CONTENT</span><span>{data.pages.length} DESTINATIONS</span></div>
              </aside>
            </div>
          )}

          {view === 'workflow' && (
            <div className="z2r-workflow-layout">
              <div className="z2r-flow-track">
                {FLOW.map((step, index) => (
                  <button key={step.id} className={'z2r-flow-step ' + (selectedPage?.id === step.id ? 'selected' : '')} onClick={() => setSelectedPage({ ...step, id: step.id, type: 'workflow-stage', summary: step.detail, title: step.title, groupLabel: 'Assessment lifecycle', groupCode: 'FLOW', href: '#' })}>
                    <span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong><small>{step.groups.length} knowledge areas</small>
                  </button>
                ))}
              </div>
              <aside className="z2r-flow-detail">
                <div className="z2r-panel-kicker">ASSESSMENT METHOD / STAGE GUIDE</div>
                <h3>{FLOW.find((step) => step.id === selectedPage?.id)?.title || 'A controlled assessment lifecycle'}</h3>
                <p>{FLOW.find((step) => step.id === selectedPage?.id)?.detail || 'Select a stage to inspect its purpose and related knowledge pages.'}</p>
                <div className="z2r-related-links">
                  {(FLOW.find((step) => step.id === selectedPage?.id)?.pages || FLOW[0].pages).map((id) => pageById.get(id)).filter(Boolean).map((page) => (
                    <a key={page.id} href={routeFor(page, docsOrigin)}><span>{page.groupCode}</span><strong>{page.title}</strong><b>↗</b></a>
                  ))}
                </div>
              </aside>
            </div>
          )}

          {view === 'directory' && (
            <div className="z2r-directory-view">
              <div className="z2r-directory-filters">
                {[
                  ['all', 'All content'], ['learning-paths', 'Learning paths'], ['tools', 'Tools'], ['ai-intelligence', 'AI security'], ['offensive-arsenal', 'Offensive security'], ['research-bounty', 'Research'], ['resources', 'Career'],
                ].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
              </div>
              <div className="z2r-directory-grid">
                {filteredPages.map((page) => (
                  <a className="z2r-directory-card" key={page.id} href={routeFor(page, docsOrigin)}>
                    <span>{page.groupCode} / {page.type.replaceAll('-', ' ')}</span>
                    <strong>{page.title}</strong>
                    <small>{page.summary}</small>
                    <b>OPEN GUIDE ↗</b>
                  </a>
                ))}
              </div>
              <div className="z2r-directory-count">SHOWING {filteredPages.length} OF {data.pages.length} INDEXED PAGES</div>
            </div>
          )}

          {showRelations && view === 'explore' && (
            <div className="z2r-relations-panel">
              <div className="z2r-panel-kicker">CURATED CONCEPT CONNECTIONS</div>
              <p>These links are authored knowledge relationships, not automatically inferred from page proximity.</p>
              <div>{RELATIONS.map(([a,b,description]) => {
                const from = pageById.get(a);
                const to = pageById.get(b);
                const fromTitle = from?.title || a.toUpperCase();
                const toTitle = to?.title || b.toUpperCase();
                return <span key={a + b}><b>{fromTitle}</b><i>→</i><b>{toTitle}</b><small>{description}</small></span>;
              })}</div>
            </div>
          )}
        </section>

        <footer className="z2r-footer">
          <span>ZERO2ROOT / KNOWLEDGE SYSTEM PROTOTYPE</span>
          <span>LEARN THE SYSTEM. UNDERSTAND THE WEAKNESS.</span>
        </footer>
      </main>
    </div>
  );
}
