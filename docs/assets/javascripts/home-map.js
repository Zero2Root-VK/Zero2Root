(() => {
  "use strict";

  const root = document.querySelector("[data-z2r-library]");
  if (!root) return;

  const one = (selector, scope = root) => scope.querySelector(selector);
  const many = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = one("[data-library-radial]");
  const rings = one("[data-library-rings]");
  const connections = one("[data-library-connections]");
  const segments = one("[data-library-segments]");
  const labels = one("[data-library-labels]");
  const center = one("[data-library-center]");
  const inspector = one("[data-library-inspector]");
  const search = one("[data-library-search]");
  const directory = one("[data-library-directory]");
  const legend = one("[data-library-legend]");
  const errorPanel = one("[data-library-error]");
  const resultCount = one("[data-library-result-count]");
  const viewport = one("[data-library-viewport]");
  const hovercard = one("[data-library-hovercard]");
  const hoverType = one("[data-library-hover-type]");
  const hoverTitle = one("[data-library-hover-title]");
  const hoverMeta = one("[data-library-hover-meta]");
  const zoomLabel = one("[data-library-zoom-label]");
  const zoomIn = one("[data-library-zoom-in]");
  const zoomOut = one("[data-library-zoom-out]");
  const zoomReset = one("[data-library-zoom-reset]");
  const mapWrap = one(".z2r-library-radial-wrap");

  const CX = 430;
  const CY = 430;
  const TAU = Math.PI * 2;
  const START = -Math.PI / 2;
  const GROUP_GAP = 0.035;
  const PAGE_GAP = 0.009;
  const state = {
    data: null, selected: null, filter: "all", query: "", visiblePages: [],
    zoom: 1, zoomFocus: { x: CX, y: CY }, hoveredGroup: null, hoveredPage: null,
    groupLinks: new Map(), pageLinks: new Map()
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
    const startOuter = polar(outerRadius, startAngle);
    const endOuter = polar(outerRadius, endAngle);
    const endInner = polar(innerRadius, endAngle);
    const startInner = polar(innerRadius, startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
      "M", startOuter.x.toFixed(3), startOuter.y.toFixed(3),
      "A", outerRadius, outerRadius, 0, largeArc, 1, endOuter.x.toFixed(3), endOuter.y.toFixed(3),
      "L", endInner.x.toFixed(3), endInner.y.toFixed(3),
      "A", innerRadius, innerRadius, 0, largeArc, 0, startInner.x.toFixed(3), startInner.y.toFixed(3),
      "Z"
    ].join(" ");
  }

  function appendRing(radius, className) {
    rings.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: radius, class: className }));
  }

  function renderStaticRings() {
    [84, 116, 213, 228, 350, 366].forEach((radius, index) => {
      appendRing(radius, index === 5 ? "library-ring-dash" : "library-ring");
    });

    const ticks = makeSvg("g", { "aria-hidden": "true" });
    for (let i = 0; i < 72; i += 1) {
      const angle = START + i * TAU / 72;
      const major = i % 6 === 0;
      const inner = major ? 354 : 359;
      const outer = 366;
      const a = polar(inner, angle);
      const b = polar(outer, angle);
      ticks.appendChild(makeSvg("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: major ? "#A68A6D" : "#6E7C71",
        "stroke-opacity": major ? ".55" : ".25",
        "stroke-width": major ? "1.15" : ".7"
      }));
    }
    rings.appendChild(ticks);

    center.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: 83, class: "library-center-ring" }));
    center.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: 71, fill: "none", stroke: "#303A38", "stroke-width": "1" }));
    center.appendChild(makeSvg("path", {
      d: "M " + (CX - 15) + " " + (CY - 35) + " H " + (CX + 15) + " V " + (CY - 29) + " L " + (CX - 8) + " " + (CY - 9) + " H " + (CX + 15) + " V " + (CY - 3) + " H " + (CX - 15) + " V " + (CY - 9) + " L " + (CX + 8) + " " + (CY - 29) + " H " + (CX - 15) + " Z",
      fill: "#D99973",
      opacity: ".92"
    }));
    center.appendChild(makeSvg("text", { x: CX, y: CY + 19, class: "library-center-title" }, "ZERO2ROOT"));
    center.appendChild(makeSvg("text", { x: CX, y: CY + 34, class: "library-center-subtitle" }, "EXISTING LIBRARY"));
    center.appendChild(makeSvg("circle", { cx: CX + 40, cy: CY - 40, r: 2.5, fill: "#8EA99A" }));
  }

  function groupLabel(group) {
    if (group.id === "tools") return "TOOLS";
    if (group.id === "resources") return "RESOURCES";
    return group.code;
  }

  function readableRotation(angle) {
    let degrees = angle * 180 / Math.PI + 90;
    while (degrees < 0) degrees += 360;
    while (degrees >= 360) degrees -= 360;
    if (degrees > 90 && degrees < 270) degrees += 180;
    return degrees;
  }

  function renderMap() {
    segments.replaceChildren();
    labels.replaceChildren();
    connections.replaceChildren();

    const groups = state.data.groups;
    const pages = state.data.pages;
    const total = pages.length;
    const usableAngle = TAU - groups.length * GROUP_GAP;
    let cursor = START;
    const pageElements = new Map();
    const groupElements = new Map();
    const groupFocus = new Map();
    const pageFocus = new Map();
    const groupLinks = new Map();
    const pageLinks = new Map();

    groups.forEach((group) => {
      const groupPages = pages.filter((page) => page.group === group.id);
      const groupSpan = usableAngle * groupPages.length / total;
      const start = cursor;
      const end = start + groupSpan;
      const groupMid = (start + end) / 2;
      groupFocus.set(group.id, polar(165, groupMid));
      const groupAnchor = polar(226, groupMid);
      const hubAnchor = polar(84, groupMid);
      const groupLink = makeSvg("path", {
        d: "M " + hubAnchor.x.toFixed(2) + " " + hubAnchor.y.toFixed(2) +
          " Q " + polar(150, groupMid - 0.12).x.toFixed(2) + " " + polar(150, groupMid - 0.12).y.toFixed(2) +
          " " + groupAnchor.x.toFixed(2) + " " + groupAnchor.y.toFixed(2),
        class: "library-link library-link-group",
        "data-library-link-group": group.id
      });
      connections.appendChild(groupLink);
      groupLinks.set(group.id, groupLink);
      connections.appendChild(makeSvg("circle", {
        cx: groupAnchor.x, cy: groupAnchor.y, r: 3.2,
        class: "library-network-node", "data-library-node-group": group.id
      }));

      const groupPath = makeSvg("path", {
        d: annularPath(119, 211, start + 0.004, end - 0.004),
        class: "library-group-sector",
        fill: group.color,
        "fill-opacity": ".32",
        "data-library-group": group.id,
        role: "button",
        tabindex: "0",
        "aria-label": group.name + ", " + groupPages.length + " existing pages",
        "aria-pressed": "false"
      });
      groupPath.appendChild(makeSvg("title", {}, group.name + " / " + groupPages.length + " existing pages. Select to filter."));
      groupPath.addEventListener("click", () => applyFilter(group.id));
      groupPath.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          applyFilter(group.id);
        }
      });
      groupPath.addEventListener("pointerenter", (event) => showHover("group", group.id, event, groupPath));
      groupPath.addEventListener("pointerleave", hideHover);
      groupPath.addEventListener("focus", (event) => showHover("group", group.id, event, groupPath));
      groupPath.addEventListener("blur", hideHover);
      segments.appendChild(groupPath);
      groupElements.set(group.id, groupPath);

      const labelPoint = polar(164, groupMid);
      const rotation = readableRotation(groupMid);
      labels.appendChild(makeSvg("text", {
        x: labelPoint.x, y: labelPoint.y - 4,
        class: "library-group-label",
        transform: "rotate(" + rotation + " " + labelPoint.x + " " + labelPoint.y + ")"
      }, groupLabel(group)));
      const countPoint = polar(183, groupMid);
      labels.appendChild(makeSvg("text", {
        x: countPoint.x, y: countPoint.y,
        class: "library-group-count",
        transform: "rotate(" + rotation + " " + countPoint.x + " " + countPoint.y + ")"
      }, String(groupPages.length).padStart(2, "0")));

      const step = groupSpan / groupPages.length;
      groupPages.forEach((page, index) => {
        const pageStart = start + index * step + PAGE_GAP / 2;
        const pageEnd = start + (index + 1) * step - PAGE_GAP / 2;
        const pageMid = (pageStart + pageEnd) / 2;
        pageFocus.set(page.id, polar(288, pageMid));
        const pageAnchor = polar(351.5, pageMid);
        const pageLink = makeSvg("path", {
          d: "M " + groupAnchor.x.toFixed(2) + " " + groupAnchor.y.toFixed(2) +
            " C " + polar(270, pageMid).x.toFixed(2) + " " + polar(270, pageMid).y.toFixed(2) +
            " " + polar(316, pageMid).x.toFixed(2) + " " + polar(316, pageMid).y.toFixed(2) +
            " " + pageAnchor.x.toFixed(2) + " " + pageAnchor.y.toFixed(2),
          class: "library-link library-link-page",
          "data-library-link-page": page.id,
          "data-library-link-group": group.id
        });
        connections.appendChild(pageLink);
        pageLinks.set(page.id, pageLink);
        const arc = makeSvg("path", {
          d: annularPath(230, 347, pageStart, pageEnd),
          class: "library-page-sector",
          fill: group.color,
          "fill-opacity": page.type.includes("overview") ? ".25" : String(.34 + (index % 3) * .045),
          "data-library-page": page.id,
          "data-library-group": group.id,
          role: "button",
          tabindex: "0",
          "aria-label": page.title + " / " + group.name,
          "aria-pressed": "false"
        });
        arc.appendChild(makeSvg("title", {}, page.title + " — " + group.name));
        arc.addEventListener("click", () => selectPage(page.id));
        arc.addEventListener("keydown", (event) => handlePageKey(event, page.id));
        arc.addEventListener("pointerenter", (event) => showHover("page", page.id, event, arc));
        arc.addEventListener("pointerleave", hideHover);
        arc.addEventListener("focus", (event) => showHover("page", page.id, event, arc));
        arc.addEventListener("blur", hideHover);
        segments.appendChild(arc);
        pageElements.set(page.id, arc);

        const mark = polar(351.5, (pageStart + pageEnd) / 2);
        segments.appendChild(makeSvg("circle", {
          cx: mark.x, cy: mark.y, r: 2.1,
          fill: group.color, "fill-opacity": ".92",
          "data-library-dot": page.id,
          "aria-hidden": "true",
          "pointer-events": "none"
        }));
      });

      cursor = end + GROUP_GAP;
    });

    state.pageElements = pageElements;
    state.groupElements = groupElements;
    state.groupFocus = groupFocus;
    state.pageFocus = pageFocus;
    state.groupLinks = groupLinks;
    state.pageLinks = pageLinks;
    renderLegend();
    renderDirectory();
    applyVisibility();
  }

  function typeLabel(type) {
    return ({
      "learning-overview": "LEARNING LEVEL OVERVIEW",
      lesson: "EXISTING LESSON",
      "reference-overview": "TOOLS REFERENCE",
      reference: "EXISTING TOOL GUIDE",
      "resource-overview": "RESOURCES OVERVIEW",
      resource: "EXISTING RESOURCE"
    })[type] || "EXISTING PAGE";
  }

  function renderLegend() {
    legend.replaceChildren();
    state.data.groups.forEach((group) => {
      const button = makeHtml("button", "");
      button.type = "button";
      button.dataset.libraryLegend = group.id;
      const swatch = makeHtml("i", "");
      swatch.style.background = group.color;
      const label = makeHtml("span", "", group.name);
      button.append(swatch, label);
      button.addEventListener("click", () => applyFilter(group.id));
      legend.appendChild(button);
    });
  }

  function renderDirectory() {
    directory.replaceChildren();
    state.data.groups.forEach((group) => {
      const section = makeHtml("section", "z2r-library-directory-group");
      section.appendChild(makeHtml("h3", "", group.name));
      state.data.pages.filter((page) => page.group === group.id).forEach((page) => {
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

  function renderInspector(pageId) {
    const page = state.data.pages.find((item) => item.id === pageId);
    if (!page) return;
    const group = state.data.groups.find((item) => item.id === page.group);
    state.selected = page.id;

    one("[data-library-inspector-type]").textContent = typeLabel(page.type);
    one("[data-library-inspector-title]").textContent = page.title;
    one("[data-library-inspector-group]").textContent = group.label + " / " + group.name;
    one("[data-library-inspector-summary]").textContent = page.summary;
    one("[data-library-open]").href = page.href;
    const index = state.data.pages.findIndex((item) => item.id === page.id) + 1;
    one("[data-library-inspector-index]").textContent = String(index).padStart(2, "0") + " / " + String(state.data.pages.length).padStart(2, "0");

    state.pageElements.forEach((element, id) => {
      const selected = id === page.id;
      element.classList.toggle("is-selected", selected);
      element.setAttribute("aria-pressed", String(selected));
    });
    state.groupElements.forEach((element, id) => {
      element.setAttribute("aria-pressed", String(id === page.group && state.filter === id));
    });
    syncNetworkStyles();

    try {
      const url = new URL(window.location.href);
      url.searchParams.set("page", page.id);
      window.history.replaceState(null, "", url);
    } catch {
      // The page inspector remains functional when URL updates are restricted.
    }
  }

  function selectPage(pageId, focus = false) {
    const page = state.data.pages.find((item) => item.id === pageId);
    if (!page) return;
    if (state.filter !== "all" && state.filter !== page.group) {
      state.filter = page.group;
      syncFilterButtons();
    }
    state.query = "";
    search.value = "";
    applyVisibility();
    renderInspector(pageId);
    applyZoom(1.10, state.pageFocus.get(pageId));
    if (focus) state.pageElements.get(pageId)?.focus();
  }


  function applyZoom(value, focus = state.zoomFocus) {
    if (!viewport) return;
    state.zoom = Math.max(0.86, Math.min(1.28, value));
    state.zoomFocus = state.zoom <= 1 ? { x: CX, y: CY } : (focus || { x: CX, y: CY });
    viewport.style.transformOrigin =
      (state.zoomFocus.x / 860 * 100).toFixed(2) + "% " +
      (state.zoomFocus.y / 860 * 100).toFixed(2) + "%";
    viewport.style.transform = "scale(" + state.zoom.toFixed(3) + ")";
    if (zoomLabel) zoomLabel.textContent = Math.round(state.zoom * 100) + "%";
    if (zoomOut) zoomOut.disabled = state.zoom <= 0.86;
    if (zoomIn) zoomIn.disabled = state.zoom >= 1.28;
  }

  function showHover(kind, id, event, target) {
    if (!hovercard || !mapWrap || !state.data) return;
    let title = "";
    let meta = "";
    if (kind === "group") {
      const group = state.data.groups.find((item) => item.id === id);
      if (!group) return;
      const count = state.data.pages.filter((page) => page.group === id).length;
      state.hoveredGroup = id;
      state.hoveredPage = null;
      title = group.name;
      meta = count + " EXISTING PAGES · SELECT TO FOCUS";
      if (hoverType) hoverType.textContent = group.kind === "learning" ? "LEARNING PATH" : "REFERENCE COLLECTION";
    } else {
      const page = state.data.pages.find((item) => item.id === id);
      if (!page) return;
      const group = state.data.groups.find((item) => item.id === page.group);
      state.hoveredPage = id;
      state.hoveredGroup = page.group;
      title = page.title;
      meta = group.name + " / " + typeLabel(page.type);
      if (hoverType) hoverType.textContent = "EXISTING PAGE";
    }
    if (hoverTitle) hoverTitle.textContent = title;
    if (hoverMeta) hoverMeta.textContent = meta;
    syncHoverStyles();

    const wrapRect = mapWrap.getBoundingClientRect();
    let x, y;
    if (event && event.type !== "focus" && Number.isFinite(event.clientX)) {
      x = event.clientX - wrapRect.left;
      y = event.clientY - wrapRect.top;
    } else if (target && target.getBoundingClientRect) {
      const targetRect = target.getBoundingClientRect();
      x = targetRect.left + targetRect.width / 2 - wrapRect.left;
      y = targetRect.top + targetRect.height / 2 - wrapRect.top;
    } else {
      x = wrapRect.width / 2;
      y = wrapRect.height / 2;
    }
    hovercard.hidden = false;
    const cardRect = hovercard.getBoundingClientRect();
    const left = Math.max(12, Math.min(wrapRect.width - cardRect.width - 12, x + 14));
    const top = Math.max(10, Math.min(wrapRect.height - cardRect.height - 10, y + 14));
    hovercard.style.left = left + "px";
    hovercard.style.top = top + "px";
  }

  function syncHoverStyles() {
    if (!state.data) return;
    state.pageElements.forEach((element, id) => {
      const page = state.data.pages.find((item) => item.id === id);
      const related = state.hoveredPage ? id === state.hoveredPage :
        state.hoveredGroup ? page.group === state.hoveredGroup : false;
      const dimmed = Boolean(state.hoveredPage || state.hoveredGroup) && !related;
      element.classList.toggle("is-hovered", related);
      element.classList.toggle("is-hover-dimmed", dimmed);
    });
    state.groupElements.forEach((element, id) => {
      const related = state.hoveredPage ? id === state.hoveredGroup :
        state.hoveredGroup ? id === state.hoveredGroup : false;
      const dimmed = Boolean(state.hoveredPage || state.hoveredGroup) && !related;
      element.classList.toggle("is-hovered", related);
      element.classList.toggle("is-hover-dimmed", dimmed);
    });
    syncNetworkStyles();
  }

  function syncNetworkStyles() {
    if (!state.data) return;
    const selectedPage = state.data.pages.find((page) => page.id === state.selected);
    const activeGroup = state.hoveredGroup ||
      (state.hoveredPage ? state.data.pages.find((page) => page.id === state.hoveredPage)?.group : null) ||
      (state.filter !== "all" ? state.filter : selectedPage?.group) || null;
    const activePage = state.hoveredPage || state.selected;
    state.groupLinks.forEach((element, id) => {
      const related = Boolean(activeGroup) && id === activeGroup;
      element.classList.toggle("is-related", related);
      element.classList.toggle("is-muted", Boolean(activeGroup) && !related);
    });
    state.pageLinks.forEach((element, id) => {
      const page = state.data.pages.find((item) => item.id === id);
      const related = activePage ? id === activePage : activeGroup ? page.group === activeGroup : false;
      const muted = activePage ? id !== activePage : Boolean(activeGroup) && page.group !== activeGroup;
      element.classList.toggle("is-related", related);
      element.classList.toggle("is-muted", muted);
    });
    many("[data-library-node-group]").forEach((node) => {
      const related = node.getAttribute("data-library-node-group") === activeGroup;
      node.classList.toggle("is-related", related);
    });
  }

  function hideHover() {
    if (!hovercard) return;
    hovercard.hidden = true;
    state.hoveredGroup = null;
    state.hoveredPage = null;
    syncHoverStyles();
  }

  function applyVisibility() {
    const matches = state.data.pages.filter((page) => {
      const groupMatch = state.filter === "all" || page.group === state.filter;
      const term = state.query.toLowerCase();
      const haystack = [page.title, page.summary, page.groupLabel, typeLabel(page.type)].join(" ").toLowerCase();
      return groupMatch && (!term || haystack.includes(term));
    });
    const visibleIds = new Set(matches.map((page) => page.id));
    state.visiblePages = matches;

    state.pageElements.forEach((element, id) => {
      const visible = visibleIds.has(id);
      element.classList.toggle("is-filtered", !visible);
      element.classList.toggle("is-dimmed", false);
    });

    state.groupElements.forEach((element, id) => {
      const anyVisible = matches.some((page) => page.group === id);
      element.classList.toggle("is-filtered", !anyVisible);
      element.classList.toggle("is-dimmed", Boolean(state.filter !== "all" && state.filter !== id));
    });

    resultCount.textContent = matches.length + " / " + state.data.pages.length + " PAGES";
    syncFilterButtons();
    syncHoverStyles();
  }

  function syncFilterButtons() {
    many("[data-library-filter]").forEach((button) => {
      const active = button.getAttribute("data-library-filter") === state.filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    many("[data-library-legend]").forEach((button) => {
      const active = button.getAttribute("data-library-legend") === state.filter;
      button.classList.toggle("is-active", active);
    });
  }

  function applyFilter(groupId) {
    state.filter = groupId;
    applyVisibility();
    if (groupId !== "all") {
      const next = state.data.pages.find((page) => page.group === groupId);
      if (next) renderInspector(next.id);
      applyZoom(1.18, state.groupFocus.get(groupId));
    } else {
      applyZoom(1);
      if (state.selected && !state.visiblePages.some((page) => page.id === state.selected)) {
        const next = state.visiblePages[0];
        if (next) renderInspector(next.id);
      }
    }
    hideHover();
  }

  function handlePageKey(event, pageId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPage(pageId);
      return;
    }
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 :
      ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
    if (direction) {
      event.preventDefault();
      const list = state.visiblePages;
      const index = list.findIndex((page) => page.id === pageId);
      if (index >= 0 && list.length) {
        const next = list[(index + direction + list.length) % list.length];
        selectPage(next.id, true);
      }
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const list = state.visiblePages;
      const next = event.key === "Home" ? list[0] : list[list.length - 1];
      if (next) selectPage(next.id, true);
    }
  }

  function syncSearch() {
    state.query = search.value.trim();
    applyVisibility();
    if (state.query && state.visiblePages.length) {
      const selectedVisible = state.visiblePages.some((page) => page.id === state.selected);
      if (!selectedVisible) renderInspector(state.visiblePages[0].id);
    }
  }

  function bindControls() {
    search.addEventListener("input", syncSearch);
    if (zoomIn) zoomIn.addEventListener("click", () => applyZoom(state.zoom + 0.06));
    if (zoomOut) zoomOut.addEventListener("click", () => applyZoom(state.zoom - 0.06));
    if (zoomReset) zoomReset.addEventListener("click", () => applyZoom(1));
    if (center) {
      center.style.cursor = "pointer";
      center.setAttribute("role", "button");
      center.setAttribute("tabindex", "0");
      center.setAttribute("aria-label", "Reset knowledge map");
      center.addEventListener("click", () => applyFilter("all"));
      center.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); applyFilter("all"); }
      });
    }
    if (svg) {
      svg.addEventListener("wheel", (event) => {
        event.preventDefault();
        applyZoom(state.zoom + (event.deltaY < 0 ? 0.045 : -0.045));
      }, { passive: false });
    }
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        search.value = "";
        state.query = "";
        applyVisibility();
      }
      if (event.key === "Enter" && state.visiblePages.length) {
        event.preventDefault();
        selectPage(state.visiblePages[0].id);
      }
    });
    many("[data-library-filter]").forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.getAttribute("data-library-filter")));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        search.focus();
      }
    });
  }

  function renderStats() {
    const pages = state.data.pages;
    const learningGroups = state.data.groups.filter((group) => group.kind === "learning").length;
    const lessonPages = pages.filter((page) => page.type === "lesson").length;
    const toolPages = pages.filter((page) => page.group === "tools" && page.type === "reference").length;
    const resourcePages = pages.filter((page) => page.group === "resources" && page.type === "resource").length;

    one('[data-library-stat="levels"]').textContent = String(learningGroups).padStart(2, "0");
    one('[data-library-stat="lessons"]').textContent = String(lessonPages).padStart(2, "0");
    one('[data-library-stat="tools"]').textContent = String(toolPages).padStart(2, "0");
    one('[data-library-stat="resources"]').textContent = String(resourcePages).padStart(2, "0");

  }

  function showError(error) {
    if (!errorPanel) return;
    errorPanel.hidden = false;
    errorPanel.appendChild(makeHtml("p", "", "Details: " + (error && error.message ? error.message : "Unknown loading error")));
    console.error("Zero2Root content map:", error);
  }

  async function initialize() {
    try {
      const script = document.querySelector('script[data-library-map]');
      if (!script || !script.src) throw new Error("Homepage map script path is unavailable.");
      const dataUrl = new URL("../data/home-map.json", script.src);
      const response = await fetch(dataUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error("Content index request failed (" + response.status + ").");
      const data = await response.json();

      if (!Array.isArray(data.groups) || !Array.isArray(data.pages) || !data.pages.length) {
        throw new Error("Content index format is invalid.");
      }
      const groupIds = new Set(data.groups.map((group) => group.id));
      const invalidPages = data.pages.filter((page) => !groupIds.has(page.group) || !page.href || !page.title);
      if (invalidPages.length) throw new Error("Content index contains pages without valid existing destinations.");

      state.data = data;
      renderStaticRings();
      renderMap();
      renderStats();
      bindControls();
      applyZoom(1);

      const requested = new URL(window.location.href).searchParams.get("page");
      const initial = data.pages.find((page) => page.id === requested) ||
        data.pages.find((page) => page.id === "level-0-overview") || data.pages[0];
      renderInspector(initial.id);
      applyVisibility();
    } catch (error) {
      showError(error);
    }
  }

  initialize();
})();
