(() => {
  "use strict";

  const root = document.querySelector("[data-z2r-library]");
  if (!root) return;

  const one = (selector, scope = root) => scope.querySelector(selector);
  const many = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = one("[data-library-radial]");
  const viewport = one("[data-library-viewport]");
  const rings = one("[data-library-rings]");
  const connections = one("[data-library-connections]");
  const segments = one("[data-library-segments]");
  const labels = one("[data-library-labels]");
  const center = one("[data-library-center]");
  const search = one("[data-library-search]");
  const searchResults = one("[data-library-search-results]");
  const directory = one("[data-library-directory]");
  const legend = one("[data-library-legend]");
  const inspector = one("[data-library-inspector]");
  const childList = one("[data-library-child-list]");
  const breadcrumbs = one("[data-library-breadcrumbs]");
  const openLink = one("[data-library-open]");
  const errorPanel = one("[data-library-error]");
  const resultCount = one("[data-library-result-count]");
  const hovercard = one("[data-library-hovercard]");
  const hoverType = one("[data-library-hover-type]");
  const hoverTitle = one("[data-library-hover-title]");
  const hoverMeta = one("[data-library-hover-meta]");

  const CX = 430;
  const CY = 430;
  const TAU = Math.PI * 2;
  const START = -Math.PI / 2;
  const state = {
    data: null,
    view: "library",
    activeGroup: null,
    activePage: null,
    hoveredGroup: null,
    hoveredPage: null,
    query: "",
    visiblePages: [],
    zoom: 1,
    groupElements: new Map(),
    pageElements: new Map(),
    groupFocus: new Map(),
    pageFocus: new Map()
  };

  function makeSvg(tag, attrs = {}, text = null) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== null) node.textContent = text;
    return node;
  }

  function makeHtml(tag, className, text = null) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  }

  function polar(radius, angle) {
    return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
  }

  function annularPath(innerRadius, outerRadius, startAngle, endAngle) {
    const a = polar(outerRadius, startAngle);
    const b = polar(outerRadius, endAngle);
    const c = polar(innerRadius, endAngle);
    const d = polar(innerRadius, startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
      "M", a.x.toFixed(3), a.y.toFixed(3),
      "A", outerRadius, outerRadius, 0, largeArc, 1, b.x.toFixed(3), b.y.toFixed(3),
      "L", c.x.toFixed(3), c.y.toFixed(3),
      "A", innerRadius, innerRadius, 0, largeArc, 0, d.x.toFixed(3), d.y.toFixed(3),
      "Z"
    ].join(" ");
  }

  function appendRing(radius, className) {
    rings.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: radius, class: className }));
  }

  function renderStaticRings() {
    [82, 112, 182, 346, 362].forEach((radius, i) => {
      appendRing(radius, i === 4 ? "library-ring-dash" : "library-ring");
    });
    const ticks = makeSvg("g", { "aria-hidden": "true" });
    for (let i = 0; i < 72; i += 1) {
      const angle = START + i * TAU / 72;
      const major = i % 6 === 0;
      const a = polar(major ? 350 : 356, angle);
      const b = polar(362, angle);
      ticks.appendChild(makeSvg("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: major ? "#A68A6D" : "#6E7C71",
        "stroke-opacity": major ? ".48" : ".20",
        "stroke-width": major ? "1.1" : ".7"
      }));
    }
    rings.appendChild(ticks);
  }

  function typeLabel(type) {
    return ({
      "learning-overview": "LEARNING LEVEL OVERVIEW",
      lesson: "EXISTING LESSON",
      "reference-overview": "TOOLS REFERENCE",
      reference: "EXISTING TOOL GUIDE",
      "resource-overview": "RESOURCES OVERVIEW",
      resource: "EXISTING RESOURCE",
      "ai-overview": "AI INTELLIGENCE OVERVIEW",
      "ai-reference": "AI SECURITY RESOURCE",
      "offsec-overview": "OFFENSIVE SECURITY OVERVIEW",
      "offsec-reference": "OFFENSIVE SECURITY GUIDE",
      "research-overview": "RESEARCH COLLECTION",
      "research-reference": "RESEARCH RESOURCE"
    })[type] || "EXISTING PAGE";
  }

  function groupPages(groupId) {
    return state.data.pages.filter((page) => page.group === groupId);
  }

  function groupOverview(groupId) {
    const pages = groupPages(groupId);
    return pages.find((page) => page.type.includes("overview")) || pages[0] || null;
  }

  function groupKindLabel(group) {
    if (group.kind === "learning") return "LEARNING PATH";
    if (group.id === "tools") return "TOOLS COLLECTION";
    if (group.id === "ai-intelligence") return "AI & SECURITY INTELLIGENCE";
    if (group.id === "offensive-arsenal") return "OFFENSIVE SECURITY";
    if (group.id === "research-bounty") return "RESEARCH & BUG BOUNTY";
    return "CAREER & PRACTICE";
  }

  function accessibleSegment(node, label, onActivate, onKey) {
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-label", label);
    node.addEventListener("click", onActivate);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onKey ? onKey(event) : onActivate();
      }
    });
  }

  function addCenterText(subtitle) {
    center.replaceChildren();
    center.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: 83, class: "library-center-ring" }));
    center.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: 71, fill: "none", stroke: "#303A38", "stroke-width": "1" }));
    center.appendChild(makeSvg("path", {
      d: "M " + (CX - 15) + " " + (CY - 35) + " H " + (CX + 15) + " V " + (CY - 29) +
        " L " + (CX - 8) + " " + (CY - 9) + " H " + (CX + 15) + " V " + (CY - 3) +
        " H " + (CX - 15) + " V " + (CY - 9) + " L " + (CX + 8) + " " + (CY - 29) +
        " H " + (CX - 15) + " Z",
      fill: "#D99973",
      opacity: ".92"
    }));
    center.appendChild(makeSvg("text", { x: CX, y: CY + 19, class: "library-center-title" }, "ZERO2ROOT"));
    center.appendChild(makeSvg("text", { x: CX, y: CY + 34, class: "library-center-subtitle" }, subtitle));
    center.appendChild(makeSvg("circle", { cx: CX + 40, cy: CY - 40, r: 2.5, fill: "#8EA99A" }));
    center.style.cursor = state.view === "library" ? "default" : "pointer";
    center.setAttribute("aria-label", state.view === "library" ? "Zero2Root knowledge library" : "Return to the knowledge library");
    center.setAttribute("role", state.view === "library" ? "img" : "button");
    center.setAttribute("tabindex", state.view === "library" ? "-1" : "0");
    if (state.view !== "library") {
      center.addEventListener("click", goHome);
      center.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); goHome(); }
      });
    }
  }

  function clearHover() {
    state.hoveredGroup = null;
    state.hoveredPage = null;
    if (hovercard) hovercard.hidden = true;
  }

  function bindHover(node, kind, id) {
    node.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      showHover(kind, id, event);
    });
    node.addEventListener("pointerleave", clearHover);
    node.addEventListener("focus", () => showHover(kind, id, null));
    node.addEventListener("blur", clearHover);
  }

  function showHover(kind, id, event) {
    if (!hovercard || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let title = "";
    let meta = "";
    if (kind === "group") {
      const group = state.data.groups.find((item) => item.id === id);
      if (!group) return;
      state.hoveredGroup = id;
      state.hoveredPage = null;
      title = group.name;
      meta = groupPages(id).length + " EXISTING PAGES · OPEN COLLECTION";
      hoverType.textContent = groupKindLabel(group);
    } else {
      const page = state.data.pages.find((item) => item.id === id);
      if (!page) return;
      const group = state.data.groups.find((item) => item.id === page.group);
      state.hoveredPage = id;
      state.hoveredGroup = page.group;
      title = page.title;
      meta = group.name + " / " + typeLabel(page.type);
      hoverType.textContent = "EXISTING PAGE";
    }
    hoverTitle.textContent = title;
    hoverMeta.textContent = meta;
    syncSegmentStates();
    const wrap = one(".z2r-library-radial-wrap");
    const rect = wrap.getBoundingClientRect();
    let left = rect.width - 260;
    let top = 16;
    if (event && Number.isFinite(event.clientX)) {
      const desired = event.clientX - rect.left + 16;
      left = Math.min(rect.width - 260, Math.max(10, desired));
      top = Math.min(rect.height - 90, Math.max(10, event.clientY - rect.top + 14));
    }
    hovercard.style.left = Math.max(10, left) + "px";
    hovercard.style.top = Math.max(10, top) + "px";
    hovercard.hidden = false;
  }

  function renderMap() {
    segments.replaceChildren();
    labels.replaceChildren();
    connections.replaceChildren();
    state.groupElements = new Map();
    state.pageElements = new Map();
    state.groupFocus = new Map();
    state.pageFocus = new Map();

    if (state.view === "library") renderLibraryMap();
    else renderCollectionMap();

    addCenterText(
      state.view === "library" ? "KNOWLEDGE LIBRARY" :
      state.view === "group" ? "COLLECTION VIEW" : "PAGE EXPLORER"
    );
    syncSegmentStates();
    renderLegend();
  }

  function renderLibraryMap() {
    const groups = state.data.groups;
    const total = state.data.pages.length;
    const gap = .045;
    const usable = TAU - groups.length * gap;
    let cursor = START;

    groups.forEach((group) => {
      const pages = groupPages(group.id);
      const span = usable * pages.length / total;
      const start = cursor + .003;
      const end = cursor + span - .003;
      const mid = (start + end) / 2;
      const inner = polar(118, mid);
      const outer = polar(338, mid);
      state.groupFocus.set(group.id, polar(220, mid));

      const connector = makeSvg("path", {
        d: "M " + polar(83, mid).x.toFixed(2) + " " + polar(83, mid).y.toFixed(2) +
          " Q " + polar(105, mid - .08).x.toFixed(2) + " " + polar(105, mid - .08).y.toFixed(2) +
          " " + inner.x.toFixed(2) + " " + inner.y.toFixed(2),
        class: "library-link library-link-group"
      });
      connections.appendChild(connector);

      const path = makeSvg("path", {
        d: annularPath(124, 336, start, end),
        class: "library-group-sector",
        fill: group.color,
        "fill-opacity": ".30",
        "data-library-group": group.id
      });
      accessibleSegment(path, group.name + ", " + pages.length + " existing pages. Open collection.", () => openGroup(group.id));
      bindHover(path, "group", group.id);
      segments.appendChild(path);
      state.groupElements.set(group.id, path);

      const labelPoint = polar(232, mid);
      const countPoint = polar(267, mid);
      const rotation = readableRotation(mid);
      labels.appendChild(makeSvg("text", {
        x: labelPoint.x, y: labelPoint.y,
        class: "library-group-label",
        transform: "rotate(" + rotation + " " + labelPoint.x + " " + labelPoint.y + ")"
      }, group.code));
      labels.appendChild(makeSvg("text", {
        x: countPoint.x, y: countPoint.y,
        class: "library-group-count",
        transform: "rotate(" + rotation + " " + countPoint.x + " " + countPoint.y + ")"
      }, String(pages.length).padStart(2, "0")));

      const pageStep = (end - start) / pages.length;
      pages.forEach((page, i) => {
        const dotPoint = polar(350, start + (i + .5) * pageStep);
        connections.appendChild(makeSvg("circle", {
          cx: dotPoint.x, cy: dotPoint.y, r: 2.6,
          fill: group.color, class: "library-overview-page-dot",
          "aria-hidden": "true"
        }));
      });
      cursor += span + gap;
    });
  }

  function renderCollectionMap() {
    const group = state.data.groups.find((item) => item.id === state.activeGroup);
    if (!group) return;
    const pages = groupPages(group.id);
    const gap = Math.min(.022, .11 / pages.length);
    const step = TAU / pages.length;
    const activePage = state.data.pages.find((page) => page.id === state.activePage);
    const groupHub = polar(112, START);

    pages.forEach((page, i) => {
      const start = START + i * step + gap / 2;
      const end = START + (i + 1) * step - gap / 2;
      const mid = (start + end) / 2;
      state.pageFocus.set(page.id, polar(260, mid));
      const anchor = polar(186, mid);
      const connector = makeSvg("path", {
        d: "M " + polar(82, mid).x.toFixed(2) + " " + polar(82, mid).y.toFixed(2) +
          " Q " + polar(135, mid).x.toFixed(2) + " " + polar(135, mid).y.toFixed(2) +
          " " + anchor.x.toFixed(2) + " " + anchor.y.toFixed(2),
        class: "library-link library-link-page"
      });
      connections.appendChild(connector);

      const path = makeSvg("path", {
        d: annularPath(190, 338, start, end),
        class: "library-page-sector",
        fill: group.color,
        "fill-opacity": page.type.includes("overview") ? ".32" : String(.42 + (i % 3) * .045),
        "data-library-page": page.id,
        "data-library-group": group.id
      });
      accessibleSegment(path, page.title + ", " + group.name + ". Open page details.", () => openPage(page.id));
      bindHover(path, "page", page.id);
      segments.appendChild(path);
      state.pageElements.set(page.id, path);

      const numberPoint = polar(260, mid);
      labels.appendChild(makeSvg("text", {
        x: numberPoint.x, y: numberPoint.y,
        class: "library-page-index",
        transform: "rotate(" + readableRotation(mid) + " " + numberPoint.x + " " + numberPoint.y + ")"
      }, String(i + 1).padStart(2, "0")));
      connections.appendChild(makeSvg("circle", {
        cx: polar(342, mid).x, cy: polar(342, mid).y, r: 2.5,
        fill: group.color, "aria-hidden": "true"
      }));
    });

    if (activePage) {
      const midIndex = pages.findIndex((page) => page.id === activePage.id);
      if (midIndex >= 0) {
        const mid = START + (midIndex + .5) * step;
        const source = polar(82, mid);
        const target = polar(190, mid);
        connections.appendChild(makeSvg("path", {
          d: "M " + source.x + " " + source.y + " Q " + CX + " " + CY + " " + target.x + " " + target.y,
          class: "library-link library-link-active"
        }));
      }
    }
  }

  function renderLegend() {
    legend.replaceChildren();
    state.data.groups.forEach((group) => {
      const button = makeHtml("button", "");
      button.type = "button";
      button.dataset.libraryLegend = group.id;
      if (state.activeGroup === group.id) button.classList.add("is-active");
      const swatch = makeHtml("i", "");
      swatch.style.background = group.color;
      const label = makeHtml("span", "", group.code + " · " + group.name);
      button.append(swatch, label);
      button.addEventListener("click", () => openGroup(group.id));
      legend.appendChild(button);
    });
  }

  function addBreadcrumb(label, current, action) {
    const item = makeHtml("button", current ? "is-current" : "", label);
    item.type = "button";
    item.disabled = Boolean(current);
    if (!current && action) item.addEventListener("click", action);
    breadcrumbs.appendChild(item);
  }

  function renderBreadcrumbs() {
    breadcrumbs.replaceChildren();
    addBreadcrumb("Library", state.view === "library", goHome);
    if (state.activeGroup) {
      breadcrumbs.appendChild(makeHtml("span", "z2r-breadcrumb-divider", "/"));
      const group = state.data.groups.find((item) => item.id === state.activeGroup);
      addBreadcrumb(group.name, state.view === "group", () => openGroup(group.id));
    }
    if (state.view === "page" && state.activePage) {
      const page = state.data.pages.find((item) => item.id === state.activePage);
      breadcrumbs.appendChild(makeHtml("span", "z2r-breadcrumb-divider", "/"));
      addBreadcrumb(page.title, true, null);
    }
  }

  function addChildButton(parent, title, detail, color, action, active = false) {
    const button = makeHtml("button", "z2r-explorer-child" + (active ? " is-active" : ""));
    button.type = "button";
    if (color) button.style.setProperty("--child-accent", color);
    const copy = makeHtml("span", "z2r-explorer-child-copy");
    copy.appendChild(makeHtml("strong", "", title));
    copy.appendChild(makeHtml("small", "", detail));
    button.append(copy, makeHtml("span", "z2r-explorer-child-arrow", "↗"));
    button.addEventListener("click", action);
    parent.appendChild(button);
  }

  function renderChildList() {
    childList.replaceChildren();
    const heading = makeHtml("div", "z2r-explorer-child-heading");
    if (state.view === "library") {
      heading.appendChild(makeHtml("span", "", "EXPLORE COLLECTIONS"));
      heading.appendChild(makeHtml("small", "", state.data.groups.length + " COLLECTIONS"));
      childList.appendChild(heading);
      state.data.groups.forEach((group) => {
        addChildButton(
          childList,
          group.name,
          groupKindLabel(group) + " · " + groupPages(group.id).length + " PAGES",
          group.color,
          () => openGroup(group.id)
        );
      });
      return;
    }

    const group = state.data.groups.find((item) => item.id === state.activeGroup);
    if (!group) return;
    const pages = groupPages(group.id);
    heading.appendChild(makeHtml("span", "", state.view === "group" ? "EXISTING PAGES" : "MORE IN THIS COLLECTION"));
    heading.appendChild(makeHtml("small", "", pages.length + " PAGES"));
    childList.appendChild(heading);

    pages.forEach((page, i) => {
      addChildButton(
        childList,
        page.title,
        String(i + 1).padStart(2, "0") + " · " + typeLabel(page.type),
        group.color,
        () => openPage(page.id),
        state.activePage === page.id
      );
    });
  }

  function renderInspector() {
    if (!inspector || !state.data) return;
    renderBreadcrumbs();
    renderChildList();
    const type = one("[data-library-inspector-type]");
    const title = one("[data-library-inspector-title]");
    const groupText = one("[data-library-inspector-group]");
    const summary = one("[data-library-inspector-summary]");
    const index = one("[data-library-inspector-index]");
    const status = one("[data-library-inspector-status]");

    if (state.view === "library") {
      type.textContent = "KNOWLEDGE LIBRARY";
      title.textContent = "Explore Zero2Root";
      groupText.textContent = state.data.groups.length + " COLLECTIONS · " + state.data.pages.length + " EXISTING PAGES";
      summary.textContent = "Start with a learning level, explore the tool references, or browse career and practice resources. Each collection opens into its existing pages.";
      index.textContent = String(state.data.groups.length).padStart(2, "0") + " COLLECTIONS";
      status.textContent = "LIBRARY VIEW";
      openLink.hidden = true;
    } else if (state.view === "group") {
      const group = state.data.groups.find((item) => item.id === state.activeGroup);
      const overview = groupOverview(group.id);
      const pages = groupPages(group.id);
      type.textContent = groupKindLabel(group);
      title.textContent = group.name;
      groupText.textContent = group.label + " · " + pages.length + " EXISTING PAGES";
      summary.textContent = overview ? overview.summary : pages[0].summary;
      index.textContent = String(state.data.groups.findIndex((item) => item.id === group.id) + 1).padStart(2, "0") + " / " + String(state.data.groups.length).padStart(2, "0");
      status.textContent = "COLLECTION VIEW";
      openLink.href = overview.href;
      openLink.hidden = false;
      one("span", openLink).textContent = "↗";
      openLink.firstChild.textContent = "Open collection overview ";
    } else {
      const page = state.data.pages.find((item) => item.id === state.activePage);
      const group = state.data.groups.find((item) => item.id === page.group);
      const pageIndex = state.data.pages.findIndex((item) => item.id === page.id) + 1;
      type.textContent = typeLabel(page.type);
      title.textContent = page.title;
      groupText.textContent = group.label + " / " + group.name;
      summary.textContent = page.summary;
      index.textContent = String(pageIndex).padStart(2, "0") + " / " + String(state.data.pages.length).padStart(2, "0");
      status.textContent = "PAGE DETAIL";
      openLink.href = page.href;
      openLink.hidden = false;
      openLink.firstChild.textContent = "Open original page ";
      const arrow = one("span", openLink);
      if (arrow) arrow.textContent = "↗";
    }
  }

  function syncSegmentStates() {
    state.groupElements.forEach((element, id) => {
      const group = state.data.groups.find((item) => item.id === id);
      const isActive = state.activeGroup === id;
      const isHovered = state.hoveredGroup === id;
      const matchesQuery = state.visiblePages.some((page) => page.group === id);
      element.classList.toggle("is-selected", isActive);
      element.classList.toggle("is-hovered", isHovered);
      element.classList.toggle("is-muted", Boolean(state.query) && !matchesQuery);
      element.setAttribute("aria-pressed", String(isActive));
    });
    state.pageElements.forEach((element, id) => {
      const selected = state.activePage === id;
      const hovered = state.hoveredPage === id;
      const page = state.data.pages.find((item) => item.id === id);
      const matchesQuery = !state.query || state.visiblePages.some((item) => item.id === id);
      element.classList.toggle("is-selected", selected);
      element.classList.toggle("is-hovered", hovered);
      element.classList.toggle("is-muted", !matchesQuery || (state.view === "page" && !selected));
      element.setAttribute("aria-pressed", String(selected));
    });
    many("[data-library-legend]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-library-legend") === state.activeGroup);
    });
  }

  function updateURL(push = true) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("group");
      url.searchParams.delete("page");
      if (state.activeGroup) url.searchParams.set("group", state.activeGroup);
      if (state.activePage) url.searchParams.set("page", state.activePage);
      const method = push ? "pushState" : "replaceState";
      window.history[method]({ view: state.view }, "", url);
    } catch {
      // Navigation continues to work when URL state cannot be updated.
    }
  }

  function applyZoom(scale) {
    if (!viewport) return;
    state.zoom = Math.max(.88, Math.min(1.18, scale));
    viewport.style.transform = "scale(" + state.zoom.toFixed(3) + ")";
  }

  function openGroup(groupId, push = true) {
    if (!state.data.groups.some((group) => group.id === groupId)) return;
    state.view = "group";
    state.activeGroup = groupId;
    state.activePage = null;
    clearHover();
    renderMap();
    renderInspector();
    applyZoom(1.035);
    syncFilterButtons();
    updateURL(push);
  }

  function openPage(pageId, push = true) {
    const page = state.data.pages.find((item) => item.id === pageId);
    if (!page) return;
    state.view = "page";
    state.activeGroup = page.group;
    state.activePage = page.id;
    state.query = "";
    if (search) search.value = "";
    clearHover();
    renderMap();
    renderInspector();
    applyZoom(1.06);
    syncFilterButtons();
    renderSearchResults();
    updateURL(push);
  }

  function goHome(push = true) {
    state.view = "library";
    state.activeGroup = null;
    state.activePage = null;
    clearHover();
    renderMap();
    renderInspector();
    applyZoom(1);
    syncFilterButtons();
    updateURL(push);
  }

  function syncFilterButtons() {
    many("[data-library-filter]").forEach((button) => {
      const id = button.getAttribute("data-library-filter");
      const active = id === "all" ? state.view === "library" : state.activeGroup === id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderSearchResults() {
    if (!searchResults) return;
    searchResults.replaceChildren();
    const matches = state.visiblePages;
    if (!state.query || !matches.length) {
      searchResults.hidden = true;
      return;
    }
    searchResults.hidden = false;
    const heading = makeHtml("div", "z2r-library-search-results-heading", matches.length + " MATCHING PAGES");
    searchResults.appendChild(heading);
    matches.slice(0, 8).forEach((page) => {
      const group = state.data.groups.find((item) => item.id === page.group);
      addChildButton(
        searchResults,
        page.title,
        group.name + " · " + typeLabel(page.type),
        group.color,
        () => openPage(page.id)
      );
    });
  }

  function applySearch() {
    state.query = search.value.trim().toLowerCase();
    state.visiblePages = state.data.pages.filter((page) => {
      const group = state.data.groups.find((item) => item.id === page.group);
      const haystack = [page.title, page.summary, page.groupLabel, group.name, typeLabel(page.type)].join(" ").toLowerCase();
      return !state.query || haystack.includes(state.query);
    });
    resultCount.textContent = state.visiblePages.length + " / " + state.data.pages.length + " PAGES";
    syncSegmentStates();
    renderSearchResults();
  }

  function renderDirectory() {
    directory.replaceChildren();
    state.data.groups.forEach((group) => {
      const section = makeHtml("section", "z2r-library-directory-group");
      section.appendChild(makeHtml("h3", "", group.name));
      groupPages(group.id).forEach((page) => {
        const link = makeHtml("a", "", page.title);
        link.href = page.href;
        link.appendChild(makeHtml("small", "", group.label + " / " + typeLabel(page.type)));
        section.appendChild(link);
      });
      directory.appendChild(section);
    });
    const count = one("[data-library-directory-count]");
    if (count) count.textContent = state.data.pages.length + " PAGES";
  }

  function renderStats() {
    const pages = state.data.pages;
    const levels = state.data.groups.filter((group) => group.kind === "learning").length;
    const lessons = pages.filter((page) => page.type === "lesson").length;
    const tools = pages.filter((page) => page.group === "tools" && page.type === "reference").length;
    const resources = pages.filter((page) => page.group === "resources" && page.type === "resource").length;
    one('[data-library-stat="levels"]').textContent = String(levels).padStart(2, "0");
    one('[data-library-stat="lessons"]').textContent = String(lessons).padStart(2, "0");
    one('[data-library-stat="tools"]').textContent = String(tools).padStart(2, "0");
    one('[data-library-stat="resources"]').textContent = String(resources).padStart(2, "0");
  }

  function restoreFromURL() {
    const params = new URL(window.location.href).searchParams;
    const page = params.get("page");
    const group = params.get("group");
    if (page && state.data.pages.some((item) => item.id === page)) {
      openPage(page, false);
    } else if (group && state.data.groups.some((item) => item.id === group)) {
      openGroup(group, false);
    } else {
      goHome(false);
    }
  }

  function bindControls() {
    search.addEventListener("input", applySearch);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && state.visiblePages.length) {
        event.preventDefault();
        openPage(state.visiblePages[0].id);
      }
      if (event.key === "Escape") {
        search.value = "";
        applySearch();
        searchResults.hidden = true;
      }
    });
    many("[data-library-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-library-filter");
        if (id === "all") goHome();
        else openGroup(id);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        search.focus();
      }
      if (event.key === "Escape" && state.view === "page") openGroup(state.activeGroup);
      else if (event.key === "Escape" && state.view === "group") goHome();
    });
    window.addEventListener("popstate", restoreFromURL);
    if (svg) {
      svg.addEventListener("wheel", (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        applyZoom(state.zoom + (event.deltaY < 0 ? .035 : -.035));
      }, { passive: false });
      let pinchStart = 0;
      let pinchZoom = 1;
      svg.addEventListener("touchstart", (event) => {
        if (event.touches.length === 2) {
          const dx = event.touches[0].clientX - event.touches[1].clientX;
          const dy = event.touches[0].clientY - event.touches[1].clientY;
          pinchStart = Math.hypot(dx, dy);
          pinchZoom = state.zoom;
        }
      }, { passive: true });
      svg.addEventListener("touchmove", (event) => {
        if (event.touches.length !== 2 || !pinchStart) return;
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        applyZoom(pinchZoom * Math.hypot(dx, dy) / pinchStart);
      }, { passive: true });
      svg.addEventListener("touchend", () => { pinchStart = 0; }, { passive: true });
    }
  }

  async function initialize() {
    try {
      const script = document.querySelector('script[data-library-map]');
      if (!script || !script.src) throw new Error("Homepage map script path is unavailable.");
      const response = await fetch(new URL("../data/home-map.json", script.src), { cache: "no-cache" });
      if (!response.ok) throw new Error("Content index request failed (" + response.status + ").");
      const data = await response.json();
      if (!Array.isArray(data.groups) || !Array.isArray(data.pages) || !data.pages.length) {
        throw new Error("Content index format is invalid.");
      }
      const groupIds = new Set(data.groups.map((group) => group.id));
      const invalid = data.pages.filter((page) => !groupIds.has(page.group) || !page.href || !page.title || !page.summary);
      if (invalid.length) throw new Error("Content index contains an invalid existing page destination.");
      if (data.pages.length !== data.meta.pageCount) throw new Error("Content index page count does not match its metadata.");

      state.data = data;
      renderStaticRings();
      renderDirectory();
      renderStats();
      bindControls();
      applySearch();
      restoreFromURL();
    } catch (error) {
      errorPanel.hidden = false;
      errorPanel.appendChild(makeHtml("p", "", "Details: " + (error && error.message ? error.message : "Unknown loading error")));
      console.error("Zero2Root knowledge explorer:", error);
    }
  }

  initialize();
})();
