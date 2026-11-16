(() => {
  "use strict";

  const root = document.querySelector("[data-field-atlas]");
  if (!root) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const $ = (selector, scope = root) => scope.querySelector(selector);
  const $$ = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));
  const scene = $("[data-atlas-scene]");
  const svg = $("[data-atlas-map]");
  const inspector = $("[data-atlas-inspector]");
  const search = $("[data-atlas-search]");
  const searchResults = $("[data-atlas-search-results]");
  const routeSelect = $("[data-atlas-route]");
  const routeDescription = $("[data-atlas-route-description]");
  const routeStops = $("[data-atlas-route-stops]");
  const nodeCount = $("[data-atlas-node-count]");
  const fallback = $("[data-atlas-fallback]");
  const colors = {
    copper: "#C77C55",
    copperLight: "#D99973",
    mineral: "#8EA99A",
    ivory: "#E9E5DC",
    muted: "#AAA99F",
    line: "#46514B",
    brass: "#D2AA70",
    ink: "#0B0D0E",
    raised: "#1B2222"
  };
  const view = { x: 0, y: 0, width: 1400, height: 820 };
  const state = { selected: null, filter: "all", mode: "terrain", route: null, pointer: null };
  let data;

  const svgElement = (tag, attrs = {}, text = null) => {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== null) element.textContent = text;
    return element;
  };

  const htmlElement = (tag, className, text = null) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
  };

  const edgeKey = (a, b) => [a, b].sort().join("::");
  const getNode = (id) => data.nodes.find((node) => node.id === id);
  const typeLabel = (type) => ({
    lesson: "LEARNING MATERIAL",
    protocol: "PROTOCOL",
    weakness: "WEAKNESS / TECHNIQUE",
    framework: "FRAMEWORK",
    toolset: "TOOL REFERENCE",
    research: "RESEARCH"
  }[type] || String(type).toUpperCase());

  const zonePaths = {
    foundations: "M58 160 C94 93 250 76 390 117 C470 141 472 252 426 341 C393 412 300 449 185 430 C82 414 38 298 58 160Z",
    appsec: "M465 106 C565 54 781 55 902 119 C970 154 962 285 892 369 C810 462 617 438 492 359 C425 317 408 177 465 106Z",
    enterprise: "M63 502 C131 431 340 431 453 511 C516 556 486 708 408 758 C297 824 113 786 67 699 C30 630 20 550 63 502Z",
    devices: "M529 473 C650 423 837 451 897 540 C954 624 876 768 759 781 C644 800 499 720 485 625 C477 562 489 500 529 473Z",
    field: "M981 108 C1080 47 1294 71 1350 165 C1400 249 1321 393 1262 470 C1191 562 1033 532 951 442 C884 369 896 174 981 108Z"
  };

  function drawDefs() {
    const defs = svg.querySelector("defs");
    const marker = svgElement("marker", {
      id: "atlas-arrow",
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "5",
      markerHeight: "5",
      orient: "auto-start-reverse"
    });
    marker.appendChild(svgElement("path", { d: "M0 0L10 5L0 10Z", fill: colors.copper, opacity: ".75" }));
    defs.appendChild(marker);
  }

  function drawZones() {
    const group = svgElement("g", { class: "atlas-zones", "aria-hidden": "true" });
    data.regions.forEach((region, index) => {
      const path = zonePaths[region.id];
      if (!path) return;
      const palette = ["#8EA99A", "#C77C55", "#9A9A7B", "#8EA99A", "#D2AA70"];
      group.appendChild(svgElement("path", {
        d: path,
        class: "atlas-zone-shape",
        fill: palette[index % palette.length],
        "fill-opacity": ".035",
        stroke: palette[index % palette.length],
        "stroke-opacity": ".28",
        "stroke-width": "1.1"
      }));
      const contour = svgElement("g", { class: "atlas-contours" });
      const center = { foundations:[250,260], appsec:[690,250], enterprise:[265,620], devices:[685,620], field:[1140,300] }[region.id];
      [0,1,2,3].forEach((n) => {
        contour.appendChild(svgElement("ellipse", {
          cx: center[0],
          cy: center[1],
          rx: 56 + n * 26,
          ry: 30 + n * 18,
          transform: "rotate(-14 " + center[0] + " " + center[1] + ")",
          fill: "none",
          stroke: palette[index % palette.length],
          "stroke-opacity": .07 - n * .008,
          "stroke-width": ".8"
        }));
      });
      group.appendChild(contour);
      const label = svgElement("g", { class: "atlas-region-label", transform: "translate(" + region.x + " " + region.y + ")" });
      label.appendChild(svgElement("text", { x: 0, y: 0, class: "atlas-region-name" }, region.label));
      label.appendChild(svgElement("text", { x: 0, y: 19, class: "atlas-region-note" }, region.note));
      group.appendChild(label);
    });
    group.appendChild(svgElement("path", { d:"M32 24h40M32 24v40M1368 756h-40M1368 756v-40", fill:"none", stroke:colors.copper, "stroke-opacity":".45", "stroke-width":"1" }));
    group.appendChild(svgElement("text", { x:"36", y:"790", class:"atlas-coordinate" }, "Z2R / FIELD INDEX / 2026"));
    group.appendChild(svgElement("text", { x:"1362", y:"790", class:"atlas-coordinate", "text-anchor":"end" }, "SCHEMATIC KNOWLEDGE SPACE"));
    scene.appendChild(group);
  }

  function edgePath(source, target, offset = 0) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const bend = Math.min(32, distance * .075) + offset;
    const controlX = (source.x + target.x) / 2 + normalX * bend;
    const controlY = (source.y + target.y) / 2 + normalY * bend;
    return "M" + source.x + " " + source.y + " Q" + controlX + " " + controlY + " " + target.x + " " + target.y;
  }

  function drawEdges() {
    const group = svgElement("g", { class: "atlas-edges" });
    data.edges.forEach((edge, index) => {
      const source = getNode(edge.source);
      const target = getNode(edge.target);
      if (!source || !target) return;
      const path = svgElement("path", {
        d: edgePath(source, target, (index % 3 - 1) * 6),
        class: "atlas-edge atlas-edge--" + edge.kind.replace(/_/g, "-"),
        "data-edge-source": edge.source,
        "data-edge-target": edge.target,
        "data-edge-kind": edge.kind,
        "marker-end": edge.kind === "prerequisite" || edge.kind === "extends" ? "url(#atlas-arrow)" : ""
      });
      const title = svgElement("title", {}, source.label + " — " + edge.label + " → " + target.label);
      path.appendChild(title);
      group.appendChild(path);
    });
    scene.appendChild(group);
  }

  const typeSymbol = (type) => ({
    lesson: "L",
    protocol: "P",
    weakness: "!",
    framework: "F",
    toolset: "T",
    research: "R"
  }[type] || "•");

  function drawNodes() {
    const group = svgElement("g", { class: "atlas-nodes" });
    data.nodes.forEach((node) => {
      const width = Math.max(82, Math.min(170, 36 + node.short.length * 7.05));
      const element = svgElement("g", {
        class: "atlas-node atlas-node--" + node.type,
        transform: "translate(" + node.x + " " + node.y + ")",
        tabindex: "0",
        role: "button",
        "aria-label": node.label + ", " + typeLabel(node.type),
        "aria-pressed": "false",
        "data-atlas-node": node.id,
        "data-node-type": node.type,
        "data-node-region": node.region
      });
      element.appendChild(svgElement("rect", {
        x: -width/2, y: -16, width, height: 32, rx: 6,
        class: "atlas-node-body",
        filter: "url(#atlas-node-shadow)"
      }));
      element.appendChild(svgElement("rect", {
        x: -width/2 + 7, y: -9, width: 18, height: 18, rx: 4,
        class: "atlas-node-mark"
      }));
      element.appendChild(svgElement("text", {
        x: -width/2 + 16, y: 3.5, class: "atlas-node-symbol", "text-anchor": "middle"
      }, typeSymbol(node.type)));
      element.appendChild(svgElement("text", {
        x: -width/2 + 32, y: 4, class: "atlas-node-label"
      }, node.short));
      element.appendChild(svgElement("title", {}, node.label + " · " + (node.level || typeLabel(node.type))));
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        selectNode(node.id, true);
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectNode(node.id, true);
        }
      });
      group.appendChild(element);
    });
    scene.appendChild(group);
  }

  function renderInspector(node) {
    inspector.replaceChildren();
    const related = data.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
    const outgoing = related.filter((edge) => edge.source === node.id);
    const incoming = related.filter((edge) => edge.target === node.id);

    const eyebrow = htmlElement("div", "atlas-inspector-kicker", typeLabel(node.type));
    inspector.appendChild(eyebrow);
    inspector.appendChild(htmlElement("h2", "atlas-inspector-title", node.label));
    inspector.appendChild(htmlElement("p", "atlas-inspector-summary", node.summary));

    const meta = htmlElement("div", "atlas-inspector-meta");
    meta.appendChild(htmlElement("span", "atlas-meta-level", node.level || "Knowledge point"));
    meta.appendChild(htmlElement("span", "atlas-meta-region", (data.regions.find((r) => r.id === node.region) || {}).label || node.region));
    inspector.appendChild(meta);

    const source = htmlElement("div", "atlas-source-block");
    source.appendChild(htmlElement("span", "atlas-source-label", "SOURCE MATERIAL"));
    source.appendChild(htmlElement("p", "atlas-source-title", node.source || "Zero2Root knowledge index"));
    if (node.href) {
      const link = htmlElement("a", "atlas-open-source", "Open source material");
      link.href = node.href;
      link.innerHTML = "Open source material <span aria-hidden='true'>↗</span>";
      source.appendChild(link);
    }
    inspector.appendChild(source);

    const connectionSection = htmlElement("section", "atlas-connections");
    connectionSection.appendChild(htmlElement("div", "atlas-section-label", "DOCUMENTED RELATIONSHIPS"));
    if (!related.length) {
      connectionSection.appendChild(htmlElement("p", "atlas-no-connections", "No curated relationships are recorded yet."));
    } else {
      const list = htmlElement("div", "atlas-connection-list");
      const relationshipOrder = ["prerequisite","contains","extends","tested_with","uses","related","foundation"];
      related.sort((a,b)=>relationshipOrder.indexOf(a.kind)-relationshipOrder.indexOf(b.kind));
      related.forEach((edge) => {
        const neighborId = edge.source === node.id ? edge.target : edge.source;
        const neighbor = getNode(neighborId);
        if (!neighbor) return;
        const row = htmlElement("button", "atlas-connection");
        row.type = "button";
        const direction = edge.source === node.id ? "OUT" : "IN";
        row.appendChild(htmlElement("span", "atlas-connection-direction", direction));
        const details = htmlElement("span", "atlas-connection-text");
        details.appendChild(htmlElement("strong", "", neighbor.short));
        details.appendChild(htmlElement("small", "", edge.label));
        row.appendChild(details);
        row.appendChild(htmlElement("span", "atlas-connection-arrow", "↗"));
        row.addEventListener("click", () => selectNode(neighbor.id, true));
        list.appendChild(row);
      });
      connectionSection.appendChild(list);
    }
    inspector.appendChild(connectionSection);

    if (node.href) {
      const open = htmlElement("a", "atlas-inspector-cta", "Open full lesson");
      open.href = node.href;
      open.appendChild(htmlElement("span", "", "↗"));
      inspector.appendChild(open);
    }
  }

  function clearRoute() {
    state.route = null;
    routeStops.replaceChildren();
    root.classList.remove("has-active-route");
  }

  function selectNode(id, focusMap) {
    const node = getNode(id);
    if (!node) return;
    if (state.route && !state.route.nodes.includes(id)) clearRoute();
    const hiddenByType = state.filter !== "all" && node.type !== state.filter;
    const hiddenByView = state.mode === "learning" && !["lesson","protocol","framework"].includes(node.type)
      || state.mode === "testing" && !["lesson","weakness","toolset","protocol"].includes(node.type);
    if (hiddenByType) applyFilter("all");
    if (hiddenByView) setMode("terrain", true);
    state.selected = id;
    nodeCount.textContent = String(data.nodes.findIndex((entry) => entry.id === id) + 1).padStart(2,"0") + " / " + String(data.nodes.length).padStart(2,"0");
    renderInspector(node);
    $$(".atlas-node", scene).forEach((element) => {
      const active = element.getAttribute("data-atlas-node") === id;
      element.classList.toggle("is-selected", active);
      element.setAttribute("aria-pressed", String(active));
    });
    const relatedIds = new Set([id]);
    data.edges.forEach((edge) => {
      if (edge.source === id) relatedIds.add(edge.target);
      if (edge.target === id) relatedIds.add(edge.source);
    });
    $$(".atlas-node", scene).forEach((element) => {
      element.classList.toggle("is-nearby", relatedIds.has(element.getAttribute("data-atlas-node")));
      element.classList.toggle("is-dimmed", !relatedIds.has(element.getAttribute("data-atlas-node")));
    });
    $$(".atlas-edge", scene).forEach((element) => {
      const connected = element.getAttribute("data-edge-source") === id || element.getAttribute("data-edge-target") === id;
      element.classList.toggle("is-connected", connected);
      element.classList.toggle("is-dimmed", !connected);
    });
    if (focusMap) {
      const mobile = window.matchMedia("(max-width: 600px)").matches;
      const targetWidth = mobile ? 600 : 1050;
      view.width = Math.min(view.width, targetWidth);
      view.height = view.width * 820 / 1400;
      view.x = Math.max(0, Math.min(1400 - view.width, node.x - view.width/2));
      view.y = Math.max(0, Math.min(820 - view.height, node.y - view.height/2));
      applyViewBox();
    }
    applyViewFilter();
  }

  function applyViewFilter() {
    const routeSet = state.route ? new Set(state.route.nodes) : null;
    const routePairs = new Set();
    if (state.route) {
      for (let i=0;i<state.route.nodes.length-1;i++) routePairs.add(edgeKey(state.route.nodes[i],state.route.nodes[i+1]));
    }
    const allowedKinds = state.mode === "learning"
      ? new Set(["prerequisite","contains","extends","foundation"])
      : state.mode === "testing"
        ? new Set(["tested_with","uses","related","contains"])
        : null;
    $$(".atlas-node", scene).forEach((element) => {
      const id = element.getAttribute("data-atlas-node");
      const node = getNode(id);
      const filterMismatch = state.filter !== "all" && node.type !== state.filter;
      const viewMismatch = state.mode === "learning" && !["lesson","protocol","framework"].includes(node.type)
        || state.mode === "testing" && !["lesson","weakness","toolset","protocol"].includes(node.type);
      const routeMismatch = routeSet && !routeSet.has(id);
      element.classList.toggle("is-filtered", filterMismatch || viewMismatch || routeMismatch);
    });
    $$(".atlas-edge", scene).forEach((element) => {
      const source = element.getAttribute("data-edge-source");
      const target = element.getAttribute("data-edge-target");
      const kind = element.getAttribute("data-edge-kind");
      const typeMismatch = allowedKinds && !allowedKinds.has(kind);
      const routeMismatch = routeSet && !routePairs.has(edgeKey(source,target));
      element.classList.toggle("is-filtered", Boolean(typeMismatch || routeMismatch));
      element.classList.toggle("is-route", Boolean(routeSet && routePairs.has(edgeKey(source,target))));
    });
  }

  function renderSearchResults(query) {
    const term = query.trim().toLowerCase();
    searchResults.replaceChildren();
    if (!term) {
      searchResults.hidden = true;
      return [];
    }
    const matches = data.nodes.filter((node) =>
      (node.label + " " + node.short + " " + (node.level || "") + " " + typeLabel(node.type)).toLowerCase().includes(term)
    ).slice(0,8);
    if (!matches.length) {
      searchResults.appendChild(htmlElement("div","atlas-search-empty","No matching field notes. Try a broader term."));
    } else {
      matches.forEach((node) => {
        const button = htmlElement("button","atlas-search-result");
        button.type = "button";
        button.appendChild(htmlElement("span","atlas-search-type",typeLabel(node.type)));
        button.appendChild(htmlElement("strong","",node.label));
        button.appendChild(htmlElement("small","",node.source || node.region));
        button.addEventListener("click",()=>{
          search.value = node.label;
          searchResults.hidden = true;
          selectNode(node.id,true);
        });
        searchResults.appendChild(button);
      });
    }
    searchResults.hidden = false;
    return matches;
  }

  function renderRouteStops(route) {
    routeStops.replaceChildren();
    route.nodes.forEach((id,index) => {
      const node=getNode(id);
      if(!node)return;
      const button=htmlElement("button","atlas-route-stop");
      button.type="button";
      button.appendChild(htmlElement("span","atlas-route-index",String(index+1).padStart(2,"0")));
      button.appendChild(htmlElement("strong","",node.short));
      button.addEventListener("click",()=>selectNode(id,true));
      routeStops.appendChild(button);
    });
  }

  function applyFilter(filter) {
    state.filter=filter;
    $$("[data-atlas-filter]").forEach((button)=>{
      const active=button.getAttribute("data-atlas-filter")===filter;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    applyViewFilter();
  }

  function setMode(mode, preserveRoute = false) {
    if (state.route && !preserveRoute) clearRoute();
    state.mode=mode;
    $$("[data-atlas-view]").forEach((button)=>{
      const active=button.getAttribute("data-atlas-view")===mode;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    applyViewFilter();
  }

  function applyViewBox() {
    svg.setAttribute("viewBox",[view.x,view.y,view.width,view.height].map((v)=>Number(v.toFixed(2))).join(" "));
  }

  function zoomAt(factor,clientX,clientY) {
    const rect=svg.getBoundingClientRect();
    const px=view.x+(clientX-rect.left)/rect.width*view.width;
    const py=view.y+(clientY-rect.top)/rect.height*view.height;
    const nextWidth=Math.max(420,Math.min(1400,view.width*factor));
    const nextHeight=nextWidth*820/1400;
    const actualFactor=nextWidth/view.width;
    view.x=px-(px-view.x)*actualFactor;
    view.y=py-(py-view.y)*actualFactor;
    view.width=nextWidth;view.height=nextHeight;
    view.x=Math.max(0,Math.min(1400-view.width,view.x));
    view.y=Math.max(0,Math.min(820-view.height,view.y));
    applyViewBox();
  }

  function bindMapControls() {
    $$("[data-atlas-zoom]").forEach((button)=>{
      button.addEventListener("click",()=>{
        const action=button.getAttribute("data-atlas-zoom");
        if(action==="reset"){
          view.x=0;view.y=0;view.width=1400;view.height=820;applyViewBox();
        }else{
          const rect=svg.getBoundingClientRect();
          zoomAt(action==="in"?.78:1.28,rect.left+rect.width/2,rect.top+rect.height/2);
        }
      });
    });
    svg.addEventListener("wheel",(event)=>{
      event.preventDefault();
      zoomAt(event.deltaY>0?1.12:.89,event.clientX,event.clientY);
    },{passive:false});
    svg.addEventListener("pointerdown",(event)=>{
      if(event.target.closest("[data-atlas-node]"))return;
      state.pointer={x:event.clientX,y:event.clientY,viewX:view.x,viewY:view.y};
      svg.classList.add("is-panning");
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove",(event)=>{
      if(!state.pointer)return;
      const rect=svg.getBoundingClientRect();
      view.x=state.pointer.viewX-(event.clientX-state.pointer.x)*view.width/rect.width;
      view.y=state.pointer.viewY-(event.clientY-state.pointer.y)*view.height/rect.height;
      view.x=Math.max(0,Math.min(1400-view.width,view.x));
      view.y=Math.max(0,Math.min(820-view.height,view.y));
      applyViewBox();
    });
    const stopPan=()=>{
      state.pointer=null;
      svg.classList.remove("is-panning");
    };
    svg.addEventListener("pointerup",stopPan);
    svg.addEventListener("pointercancel",stopPan);
    svg.addEventListener("lostpointercapture",stopPan);
  }

  function bindControls() {
    $$("[data-atlas-filter]").forEach((button)=>button.addEventListener("click",()=>applyFilter(button.getAttribute("data-atlas-filter"))));
    $("[data-atlas-view]").forEach((button)=>button.addEventListener("click",()=>setMode(button.getAttribute("data-atlas-view"))));
    search.addEventListener("input",()=>renderSearchResults(search.value));
    search.addEventListener("keydown",(event)=>{
      if(event.key==="Escape"){search.value="";searchResults.hidden=true;return;}
      if(event.key==="Enter"){
        const first=$(".atlas-search-result",searchResults);
        if(first)first.click();
      }
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="/" && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){
        event.preventDefault();search.focus();
      }
      if(event.key==="Escape" && document.activeElement!==search)searchResults.hidden=true;
    });
    document.addEventListener("click",(event)=>{
      if(!event.target.closest(".atlas-command"))searchResults.hidden=true;
    });
    routeSelect.addEventListener("change",()=>{
      clearRoute();
      const route=data.routes.find((item)=>item.id===routeSelect.value);
      if(route)routeDescription.textContent=route.description;
    });
    $("[data-atlas-trace]").addEventListener("click",()=>{
      const route=data.routes.find((item)=>item.id===routeSelect.value);
      if(!route)return;
      state.route=route;
      state.mode="learning";
      state.filter="all";
      state.selected=route.nodes[0];
      setMode("learning", true);
      applyFilter("all");
      renderRouteStops(route);
      selectNode(route.nodes[0],true);
      routeDescription.textContent=route.description;
      root.classList.add("has-active-route");
    });
  }

  async function initialize() {
    try {
      const script = document.querySelector('script[src*="assets/javascripts/atlas.js"]');
      const dataUrl = script ? new URL("../data/atlas-graph.json",script.src) : new URL("../assets/data/atlas-graph.json",window.location.href);
      const response=await fetch(dataUrl,{credentials:"same-origin"});
      if(!response.ok)throw new Error("Atlas data returned HTTP "+response.status);
      data=await response.json();
      if(!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!Array.isArray(data.routes))throw new Error("Atlas data schema is incomplete");

      drawDefs();
      drawZones();
      drawEdges();
      drawNodes();
      bindControls();
      bindMapControls();
      const first=getNode("api")||data.nodes[0];
      selectNode(first.id,true);
      fallback.hidden=true;
      root.classList.add("is-ready");
    } catch(error) {
      root.classList.add("has-error");
      const message=htmlElement("p","atlas-load-error","The Field Atlas could not load its map data. Reload the page or open the learning paths directly.");
      const mapFrame=$(".atlas-map-frame");
      if(mapFrame)mapFrame.appendChild(message);
      console.error("Field Atlas initialization failed",error);
    }
  }

  initialize();
})();
