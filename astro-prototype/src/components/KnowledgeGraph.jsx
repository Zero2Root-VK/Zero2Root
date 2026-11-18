import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Sigma, { DEFAULT_STYLES } from 'sigma';

const RELATIONSHIPS = [
  ['level-1-recon', 'tools-recon-tools', 'Recon methods / toolchain'],
  ['level-1-scanning', 'tools-scanning-tools', 'Enumeration / assessment'],
  ['level-1-owasp-top10', 'tools-web-tools', 'Web testing / practical tools'],
  ['level-2-api-security', 'api-security-testing', 'API authorisation / attack paths'],
  ['level-2-source-code-review', 'source-code-review', 'Source assurance'],
  ['level-2-infrastructure', 'infrastructure-testing', 'Infrastructure assessment'],
  ['level-3-red-team', 'offensive-skills', 'Adversary simulation'],
  ['ai-security-testing', 'ai-workflows', 'AI assurance / AI-assisted practice'],
  ['bug-bounty-intelligence', 'research-library', 'Research / vulnerability discovery'],
  ['tools-scripting-automation', 'tools-workflows', 'Automation / repeatable process'],
  ['tools-network-tools', 'level-2-segmentation-testing', 'Traffic analysis / segmentation'],
  ['tools-ad-tools', 'level-2-active-directory', 'Identity / directory services'],
  ['tools-cloud-tools', 'level-3-cloud-security', 'Cloud tooling / cloud security'],
];

const FALLBACK_COLOR = '#9bb1a0';

function buildGraph(data) {
  const graph = new Graph();
  const collections = data.collections;
  const groupById = new Map(data.groups.map((group) => [group.id, group]));
  const collectionForGroup = new Map();

  collections.forEach((collection) => {
    collection.groupIds.forEach((id) => collectionForGroup.set(id, collection));
  });

  graph.addNode('root:zero2root', {
    x: 0,
    y: 0,
    size: 18,
    color: '#d7b08e',
    label: 'ZERO2ROOT',
    kind: 'root',
    entityId: 'zero2root',
    summary: 'An interconnected field of cybersecurity knowledge.',
  });

  const collectionCenters = new Map();
  collections.forEach((collection, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / collections.length;
    const center = { x: Math.cos(angle) * 4.5, y: Math.sin(angle) * 4.5 };
    collectionCenters.set(collection.id, center);
    const key = 'collection:' + collection.id;

    graph.addNode(key, {
      x: center.x,
      y: center.y,
      size: 13,
      color: collection.color || FALLBACK_COLOR,
      label: collection.name,
      kind: 'domain',
      entityId: collection.id,
      collectionId: collection.id,
      summary: collection.summary || '',
      degreeHint: collection.groupIds.length,
    });
    graph.addEdgeWithKey('hierarchy:root:' + collection.id, 'root:zero2root', key, {
      color: '#657b6b',
      size: 1.35,
      relation: false,
      label: 'domain',
      weight: 1.8,
    });
  });

  const groupCenters = new Map();
  data.groups.forEach((group) => {
    const parent = collectionForGroup.get(group.id);
    if (!parent) return;
    const parentCenter = collectionCenters.get(parent.id) || { x: 0, y: 0 };
    const siblings = parent.groupIds || [group.id];
    const siblingIndex = siblings.indexOf(group.id);
    const angle = -Math.PI / 2 + (Math.PI * 2 * Math.max(siblingIndex, 0)) / Math.max(siblings.length, 1);
    const center = {
      x: parentCenter.x + Math.cos(angle) * (siblings.length > 1 ? 1.28 : 0.18),
      y: parentCenter.y + Math.sin(angle) * (siblings.length > 1 ? 1.28 : 0.18),
    };
    groupCenters.set(group.id, center);
    const key = 'group:' + group.id;

    graph.addNode(key, {
      x: center.x,
      y: center.y,
      size: 8.7,
      color: group.color || parent.color || FALLBACK_COLOR,
      label: group.name,
      kind: 'cluster',
      entityId: group.id,
      collectionId: parent.id,
      groupId: group.id,
      summary: group.description || (String(group.pageCount) + ' indexed resources in ' + group.name + '.'),
      degreeHint: group.pageCount || 0,
    });
    graph.addEdgeWithKey('hierarchy:' + parent.id + ':' + group.id, 'collection:' + parent.id, key, {
      color: '#53685b',
      size: 1.05,
      relation: false,
      label: 'contains',
      weight: 1.55,
    });
  });

  const pageBuckets = new Map();
  data.pages.forEach((page) => {
    const group = groupById.get(page.group);
    const parent = collectionForGroup.get(page.group);
    const center = groupCenters.get(page.group) || { x: 0, y: 0 };
    if (!pageBuckets.has(page.group)) pageBuckets.set(page.group, []);
    const bucket = pageBuckets.get(page.group);
    const index = bucket.length;
    bucket.push(page);

    const angle = index * 2.399963229728653 + (data.groups.findIndex((item) => item.id === page.group) * 0.37);
    const radius = 0.48 + Math.sqrt(index + 1) * 0.19;
    const key = 'page:' + page.id;

    graph.addNode(key, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
      size: 4.5 + Math.min((page.summary || '').length / 220, 1.8),
      color: parent?.color || group?.color || FALLBACK_COLOR,
      label: page.title,
      kind: 'resource',
      entityId: page.id,
      collectionId: parent?.id || '',
      groupId: page.group,
      summary: page.summary || '',
      pageType: page.type || 'resource',
      href: page.href || '',
    });
    graph.addEdgeWithKey('hierarchy:' + page.group + ':' + page.id, 'group:' + page.group, key, {
      color: '#46564b',
      size: 0.72,
      relation: false,
      label: 'contains',
      weight: 1.2,
    });
  });

  let relationCount = 0;
  RELATIONSHIPS.forEach(([fromId, toId, label], index) => {
    const source = 'page:' + fromId;
    const target = 'page:' + toId;
    if (!graph.hasNode(source) || !graph.hasNode(target) || graph.hasEdge(source, target)) return;
    graph.addEdgeWithKey('relationship:' + index + ':' + fromId + ':' + toId, source, target, {
      color: '#bd8967',
      size: 1.05,
      relation: true,
      label,
      weight: 0.45,
    });
    relationCount += 1;
  });

  const settings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
    iterations: 260,
    settings: {
      ...settings,
      gravity: 0.055,
      scalingRatio: 5.2,
      slowDown: 1.7,
      barnesHutOptimize: true,
      linLogMode: true,
      outboundAttractionDistribution: true,
      adjustSizes: true,
      strongGravityMode: false,
    },
  });

  const index = new Map();
  graph.forEachNode((key, attrs) => index.set(key, attrs));
  return { graph, index, relationCount };
}

export default function KnowledgeGraph({
  data,
  activeCollectionId,
  activeGroupId,
  selectedPageId,
  searchTerm,
  showConnections,
  onSelect,
}) {
  const hostRef = useRef(null);
  const rendererRef = useRef(null);
  const propsRef = useRef({ onSelect, showConnections, searchTerm });
  const graphModel = useMemo(() => buildGraph(data), [data]);
  const [hoverCard, setHoverCard] = useState(null);
  const [engineError, setEngineError] = useState('');

  useEffect(() => {
    propsRef.current = { onSelect, showConnections, searchTerm };
  }, [onSelect, showConnections, searchTerm]);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    let renderer;

    try {
      const graph = graphModel.graph;
      renderer = new Sigma(graph, hostRef.current, {
        styles: {
          nodes: [
            DEFAULT_STYLES.nodes,
            {
              color: { attribute: 'color' },
              size: { attribute: 'size' },
              label: { attribute: 'label' },
            },
            {
              when: (_attrs, state, graphState) => graphState.hasActiveSubgraph && !state.isActive && !state.isHovered && !state.isSearchHit,
              then: { color: '#27332e', label: '' },
            },
            {
              whenState: 'isSearchHit',
              then: { color: '#e6ad83', labelColor: '#f3d7c0', depth: 'topNodes', labelVisibility: 'visible' },
            },
            {
              whenState: 'isHovered',
              then: { depth: 'topNodes', labelVisibility: 'visible' },
            },
          ],
          edges: [
            DEFAULT_STYLES.edges,
            {
              color: { attribute: 'color' },
              size: { attribute: 'size' },
            },
            {
              when: (_attrs, state, graphState) => graphState.hasActiveSubgraph && !state.isActive,
              then: { color: '#18211d' },
            },
          ],
        },
        customNodeState: { isActive: false, isSearchHit: false },
        customEdgeState: { isActive: false },
        customGraphState: { hasActiveSubgraph: false },
        defaultNodeColor: FALLBACK_COLOR,
        defaultEdgeColor: '#46564b',
        labelDensity: 0.09,
        labelGridCellSize: 95,
        labelRenderedSizeThreshold: 8,
        zIndex: true,
        minCameraRatio: 0.08,
        maxCameraRatio: 3.2,
        edgeReducer: (_key, computed, attrs) => {
          if (attrs.relation && !propsRef.current.showConnections) return { ...computed, visibility: 'hidden' };
          return computed;
        },
        enableEdgeEvents: false,
      });

      rendererRef.current = renderer;
      renderer.getCamera().setState({ x: 0, y: 0, ratio: 1.02, angle: 0 });
      setEngineError('');

      const applyActive = (hoveredNode = null) => {
        const currentTerm = propsRef.current.searchTerm.trim().toLowerCase();
        const matching = new Set();
        if (currentTerm) {
          graph.forEachNode((key, attrs) => {
            const haystack = [attrs.label || '', attrs.summary || '', attrs.kind || ''].join(' ').toLowerCase();
            if (haystack.includes(currentTerm)) matching.add(key);
          });
        }

        const active = new Set(matching);
        if (hoveredNode && graph.hasNode(hoveredNode)) {
          active.add(hoveredNode);
          graph.neighbors(hoveredNode).forEach((key) => active.add(key));
        }
        if (matching.size) {
          matching.forEach((key) => graph.neighbors(key).forEach((neighbor) => active.add(neighbor)));
        }

        graph.forEachNode((key) => {
          renderer.setNodeState(key, {
            isActive: active.has(key),
            isSearchHit: matching.has(key),
          });
        });
        graph.forEachEdge((edge) => {
          const [source, target] = graph.extremities(edge);
          renderer.setEdgeState(edge, {
            isActive: active.has(source) && active.has(target),
          });
        });
        renderer.setGraphState({ hasActiveSubgraph: active.size > 0 });
        renderer.refresh({ skipIndexation: true });
      };

      renderer.on('enterNode', ({ node }) => {
        const attrs = graph.getNodeAttributes(node);
        setHoverCard({ title: attrs.label, kind: attrs.kind, summary: attrs.summary || '' });
        applyActive(node);
      });
      renderer.on('leaveNode', () => {
        setHoverCard(null);
        applyActive(null);
      });
      renderer.on('clickNode', ({ node }) => {
        const attrs = graph.getNodeAttributes(node);
        if (attrs.kind === 'root') {
          propsRef.current.onSelect?.({ type: 'root', id: 'zero2root' });
          renderer.getCamera().animate({ x: 0, y: 0, ratio: 1.02 }, { duration: 720 });
          return;
        }
        propsRef.current.onSelect?.({
          type: attrs.kind,
          id: attrs.entityId,
          collectionId: attrs.collectionId,
          groupId: attrs.groupId,
          title: attrs.label,
          summary: attrs.summary,
        });
        renderer.getCamera().animate(
          { x: attrs.x, y: attrs.y, ratio: attrs.kind === 'resource' ? 0.32 : attrs.kind === 'cluster' ? 0.48 : 0.68 },
          { duration: 760 },
        );
      });
    } catch (error) {
      console.error('Knowledge graph initialisation failed', error);
      setEngineError('The WebGL graph could not initialise in this browser. The indexed directory remains available below.');
    }

    return () => {
      renderer?.kill();
      rendererRef.current = null;
    };
  }, [graphModel]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const graph = graphModel.graph;
    const currentTerm = searchTerm.trim().toLowerCase();
    const matching = new Set();

    if (currentTerm) {
      graph.forEachNode((key, attrs) => {
        const haystack = [attrs.label || '', attrs.summary || '', attrs.kind || ''].join(' ').toLowerCase();
        if (haystack.includes(currentTerm)) matching.add(key);
      });
    }

    const active = new Set(matching);
    matching.forEach((key) => graph.neighbors(key).forEach((neighbor) => active.add(neighbor)));
    graph.forEachNode((key) => renderer.setNodeState(key, {
      isActive: active.has(key),
      isSearchHit: matching.has(key),
    }));
    graph.forEachEdge((edge) => {
      const [source, target] = graph.extremities(edge);
      renderer.setEdgeState(edge, { isActive: active.has(source) && active.has(target) });
    });
    renderer.setGraphState({ hasActiveSubgraph: active.size > 0 });
    renderer.refresh({ skipIndexation: true });

    if (matching.size) {
      const first = matching.values().next().value;
      const attrs = graph.getNodeAttributes(first);
      renderer.getCamera().animate({ x: attrs.x, y: attrs.y, ratio: 0.52 }, { duration: 360 });
    }
  }, [searchTerm, graphModel]);

  const focusNodeId = selectedPageId
    ? 'page:' + selectedPageId
    : activeGroupId
      ? 'group:' + activeGroupId
      : activeCollectionId
        ? 'collection:' + activeCollectionId
        : 'root:zero2root';

  useEffect(() => {
    const renderer = rendererRef.current;
    const attrs = graphModel.graph.getNodeAttributes(focusNodeId);
    if (!renderer || !attrs) return;
    renderer.getCamera().animate({
      x: attrs.x,
      y: attrs.y,
      ratio: attrs.kind === 'resource' ? 0.38 : attrs.kind === 'cluster' ? 0.55 : attrs.kind === 'domain' ? 0.72 : 1.02,
    }, { duration: 780 });
  }, [focusNodeId, graphModel]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) renderer.refresh({ skipIndexation: true });
  }, [showConnections]);

  const zoom = (direction) => {
    const camera = rendererRef.current?.getCamera();
    if (!camera) return;
    if (direction > 0) camera.zoomIn({ factor: 1.45 });
    else camera.zoomOut({ factor: 1.45 });
  };

  const reset = () => {
    const camera = rendererRef.current?.getCamera();
    if (camera) camera.animate({ x: 0, y: 0, ratio: 1.02 }, { duration: 700 });
  };

  return (
    <div className="atlas-graph-frame">
      <div ref={hostRef} className="atlas-graph-stage" aria-label="Interactive WebGL cybersecurity knowledge graph" />
      <div className="atlas-graph-vignette" aria-hidden="true" />
      <div className="atlas-graph-hud atlas-graph-hud-top">
        <span><i className="hud-live-dot" /> FORCE-DIRECTED TOPOLOGY</span>
        <span>{graphModel.graph.order} NODES / {graphModel.graph.size} EDGES</span>
      </div>
      <div className="atlas-graph-tools" aria-label="Graph controls">
        <button type="button" onClick={() => zoom(1)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out">−</button>
        <button type="button" onClick={reset} aria-label="Reset graph view">⌖</button>
      </div>
      {hoverCard && (
        <div className="atlas-graph-hover-card" aria-live="polite">
          <span>{hoverCard.kind} / NODE FOCUS</span>
          <strong>{hoverCard.title}</strong>
          {hoverCard.summary && <small>{hoverCard.summary}</small>}
        </div>
      )}
      {engineError ? (
        <div className="atlas-graph-fallback">{engineError}</div>
      ) : (
        <div className="atlas-graph-hud atlas-graph-hud-bottom">
          <span>DRAG TO PAN</span><span>SCROLL TO ZOOM</span><span>SELECT A NODE TO DESCEND</span>
        </div>
      )}
    </div>
  );
}
