(function () {
  "use strict";

  var STORAGE_KEY = "uah.workspace.v1";
  var ICON_COLORS = ["#1d4ed8", "#0ea5e9", "#2563eb", "#4f46e5", "#0284c7", "#1e3a8a"];
  var CATEGORIES = ["productivity", "communication", "media", "social", "utilities", "custom"];

  var defaultApps = [
    { id: "gmail", name: "Gmail", url: "https://mail.google.com", category: "communication", icon: "G", androidPackage: "com.google.android.gm", favourite: true },
    { id: "drive", name: "Google Drive", url: "https://drive.google.com", category: "productivity", icon: "D", androidPackage: "com.google.android.apps.docs", favourite: true },
    { id: "docs", name: "Google Docs", url: "https://docs.google.com", category: "productivity", icon: "W", androidPackage: "com.google.android.apps.docs.editors.docs", favourite: false },
    { id: "calendar", name: "Calendar", url: "https://calendar.google.com", category: "productivity", icon: "C", androidPackage: "com.google.android.calendar", favourite: false },
    { id: "maps", name: "Maps", url: "https://maps.google.com", category: "utilities", icon: "M", androidPackage: "com.google.android.apps.maps", favourite: false },
    { id: "youtube", name: "YouTube", url: "https://www.youtube.com", category: "media", icon: "Y", androidPackage: "com.google.android.youtube", favourite: true },
    { id: "slack", name: "Slack", url: "https://app.slack.com", category: "communication", icon: "S", androidPackage: "com.Slack", favourite: false },
    { id: "notion", name: "Notion", url: "https://www.notion.so", category: "productivity", icon: "N", androidPackage: "notion.id", favourite: false },
    { id: "github", name: "GitHub", url: "https://github.com", category: "productivity", icon: "GH", androidPackage: "com.github.android", favourite: false },
    { id: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com", category: "social", icon: "in", androidPackage: "com.linkedin.android", favourite: false },
    { id: "whatsapp", name: "WhatsApp Web", url: "https://web.whatsapp.com", category: "communication", icon: "W", androidPackage: "com.whatsapp", favourite: false },
    { id: "spotify", name: "Spotify", url: "https://open.spotify.com", category: "media", icon: "♪", androidPackage: "com.spotify.music", favourite: false }
  ];

  var state = {
    apps: [],
    recents: [],
    settings: {
      displayName: "",
      theme: "dark",
      restoreOnLoad: true,
      confirmLaunch: false,
      workspaceActive: false,
      hubX: null,
      hubY: null
    }
  };

  var ui = {
    view: "dashboard",
    category: "all",
    query: "",
    editingId: null
  };

  function now() {
    return Date.now();
  }

  function uid() {
    return "app_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function cloneDefaults() {
    return defaultApps.map(function (app) {
      return Object.assign({ createdAt: now(), lastOpened: 0 }, app);
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.apps = cloneDefaults();
        save();
        return;
      }
      var parsed = JSON.parse(raw);
      state.apps = Array.isArray(parsed.apps) ? parsed.apps : cloneDefaults();
      state.recents = Array.isArray(parsed.recents) ? parsed.recents : [];
      state.settings = Object.assign(state.settings, parsed.settings || {});
    } catch (err) {
      state.apps = cloneDefaults();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      apps: state.apps,
      recents: state.recents,
      settings: state.settings,
      updatedAt: now()
    }));
  }

  function toast(message) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.hidden = true; }, 2800);
  }

  function iconColor(id) {
    var total = 0;
    for (var i = 0; i < id.length; i++) total += id.charCodeAt(i);
    return ICON_COLORS[total % ICON_COLORS.length];
  }

  function getApp(id) {
    return state.apps.find(function (app) { return app.id === id; });
  }

  function favourites() {
    return state.apps.filter(function (app) { return app.favourite; });
  }

  function recentApps() {
    return state.recents
      .map(getApp)
      .filter(Boolean);
  }

  function filteredApps() {
    var q = ui.query.trim().toLowerCase();
    return state.apps.filter(function (app) {
      var catOk = ui.category === "all" || app.category === ui.category;
      var searchOk = !q ||
        app.name.toLowerCase().indexOf(q) !== -1 ||
        app.url.toLowerCase().indexOf(q) !== -1 ||
        app.category.toLowerCase().indexOf(q) !== -1;
      return catOk && searchOk;
    });
  }

  function isSafeUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      return ["http:", "https:", "mailto:", "tel:", "market:"].indexOf(url.protocol) !== -1;
    } catch (err) {
      return false;
    }
  }

  function openShortcut(app) {
    if (!isSafeUrl(app.url)) {
      toast("This shortcut uses an unsupported link type.");
      return;
    }
    if (state.settings.confirmLaunch && !window.confirm("Open “" + app.name + "”?")) {
      return;
    }
    app.lastOpened = now();
    state.recents = [app.id].concat(state.recents.filter(function (id) { return id !== app.id; })).slice(0, 12);
    save();
    render();
    var opened = window.open(app.url, "_blank", "noopener,noreferrer");
    if (!opened) {
      toast("The browser blocked the new tab. Allow pop-ups for this site, or open the URL from the shortcut card.");
    } else {
      toast("Opened " + app.name + ". Return here with your browser Back control or this tab.");
    }
  }

  function cardHtml(app, compact) {
    return (
      '<article class="app-card" data-id="' + app.id + '">' +
        '<div class="app-card-top">' +
          '<div class="app-icon" style="background:' + iconColor(app.id) + '">' + escapeHtml(app.icon || app.name.slice(0, 1)) + '</div>' +
          '<div class="app-meta">' +
            '<h3>' + escapeHtml(app.name) + '</h3>' +
            '<p>' + escapeHtml(app.category) + (app.favourite ? " · favourite" : "") + '</p>' +
          '</div>' +
        '</div>' +
        (compact ? "" : '<p class="app-url">' + escapeHtml(app.url) + '</p>') +
        '<div class="app-actions">' +
          '<button type="button" data-action="open">Open</button>' +
          '<button type="button" data-action="favourite">' + (app.favourite ? "Unpin" : "Favourite") + '</button>' +
          (compact ? "" : '<button type="button" data-action="edit">Edit</button><button type="button" data-action="delete">Remove</button>') +
        '</div>' +
      '</article>'
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillGrid(id, apps, emptyText, compact) {
    var el = document.getElementById(id);
    if (!apps.length) {
      el.innerHTML = '<p class="empty">' + escapeHtml(emptyText) + "</p>";
      return;
    }
    el.innerHTML = apps.map(function (app) { return cardHtml(app, compact); }).join("");
  }

  function setView(name) {
    ui.view = name;
    document.querySelectorAll(".view").forEach(function (section) {
      var match = section.id === "view-" + name;
      section.hidden = !match;
      section.classList.toggle("is-visible", match);
    });
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === name);
    });
    closeSidebar();
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
  }

  function applyActivation() {
    var active = !!state.settings.workspaceActive;
    var toggle = document.getElementById("activate-workspace");
    toggle.checked = active;
    toggle.setAttribute("aria-checked", String(active));
    document.getElementById("sidebar-status").textContent = active ? "Active" : "Inactive";
    document.getElementById("sidebar-status").classList.toggle("is-on", active);
    document.getElementById("stat-workspace").textContent = active ? "On" : "Off";
    document.getElementById("hub-fab").hidden = !active;
    if (active) {
      positionHub(state.settings.hubX, state.settings.hubY);
    } else {
      closeHub();
    }
  }

  function render() {
    applyTheme();
    applyActivation();
    var name = state.settings.displayName.trim();
    document.getElementById("welcome-text").textContent = name
      ? "Welcome back, " + name + ". Keep shortcuts nearby and return to this workspace when the platform allows it."
      : "Organize shortcuts and keep your current activity close when the platform allows it.";
    document.getElementById("stat-library").textContent = String(state.apps.length);
    document.getElementById("stat-favourites").textContent = String(favourites().length);
    document.getElementById("stat-recents").textContent = String(recentApps().length);
    fillGrid("dash-favourites", favourites().slice(0, 4), "Star shortcuts to pin them here.", true);
    fillGrid("dash-recents", recentApps().slice(0, 4), "Open a shortcut to see it here.", true);
    fillGrid("library-grid", filteredApps(), "No shortcuts match this search or category. Add an app to get started.", false);
    fillGrid("favourites-grid", favourites(), "No favourites yet. Pin shortcuts from the library.", false);
    fillGrid("recents-grid", recentApps(), "Nothing opened yet on this device.", false);
    renderHubMenu();
  }

  function renderHubMenu() {
    function items(apps, empty) {
      if (!apps.length) return '<p class="hub-footnote">' + empty + "</p>";
      return apps.map(function (app) {
        return '<button class="hub-item" type="button" data-open-id="' + app.id + '">' +
          '<span>' + escapeHtml(app.name) + '</span><span>' + escapeHtml(app.category) + "</span></button>";
      }).join("");
    }
    document.getElementById("hub-favourites").innerHTML = items(favourites().slice(0, 6), "No favourites yet.");
    document.getElementById("hub-recents").innerHTML = items(recentApps().slice(0, 6), "No recent shortcuts.");
  }

  function openModal(app) {
    ui.editingId = app ? app.id : null;
    document.getElementById("modal-title").textContent = app ? "Edit app" : "Add app";
    document.getElementById("app-id").value = app ? app.id : "";
    document.getElementById("app-name").value = app ? app.name : "";
    document.getElementById("app-url").value = app ? app.url : "";
    document.getElementById("app-package").value = app && app.androidPackage ? app.androidPackage : "";
    document.getElementById("app-category").value = app ? app.category : "custom";
    document.getElementById("app-icon").value = app ? app.icon : "";
    document.getElementById("app-favourite").checked = !!(app && app.favourite);
    document.getElementById("form-status").textContent = "";
    document.getElementById("app-modal").hidden = false;
    document.getElementById("app-name").focus();
  }

  function closeModal() {
    document.getElementById("app-modal").hidden = true;
    ui.editingId = null;
  }

  function handleSaveApp(event) {
    event.preventDefault();
    var name = document.getElementById("app-name").value.trim();
    var url = document.getElementById("app-url").value.trim();
    var androidPackage = document.getElementById("app-package").value.trim();
    var category = document.getElementById("app-category").value;
    var icon = document.getElementById("app-icon").value.trim() || name.slice(0, 1);
    var favourite = document.getElementById("app-favourite").checked;
    var status = document.getElementById("form-status");

    if (!name) {
      status.textContent = "Enter a name.";
      return;
    }
    if (!isSafeUrl(url)) {
      status.textContent = "Enter a valid http(s), mailto, tel, or market link.";
      return;
    }
    if (CATEGORIES.indexOf(category) === -1) category = "custom";

    var existing = ui.editingId ? getApp(ui.editingId) : null;
    if (existing) {
      Object.assign(existing, { name: name, url: url, androidPackage: androidPackage, category: category, icon: icon, favourite: favourite });
      toast("Shortcut updated.");
    } else {
      state.apps.push({
        id: uid(),
        name: name,
        url: url,
        androidPackage: androidPackage,
        category: category,
        icon: icon,
        favourite: favourite,
        createdAt: now(),
        lastOpened: 0
      });
      toast("Shortcut added.");
    }
    save();
    closeModal();
    setView("library");
    render();
  }

  function handleCardClick(event) {
    var button = event.target.closest("[data-action]");
    var card = event.target.closest(".app-card");
    if (!button || !card) return;
    var app = getApp(card.getAttribute("data-id"));
    if (!app) return;
    var action = button.getAttribute("data-action");
    if (action === "open") openShortcut(app);
    if (action === "favourite") {
      app.favourite = !app.favourite;
      save();
      render();
    }
    if (action === "edit") openModal(app);
    if (action === "delete") {
      if (!window.confirm("Remove “" + app.name + "” from the library?")) return;
      state.apps = state.apps.filter(function (item) { return item.id !== app.id; });
      state.recents = state.recents.filter(function (id) { return id !== app.id; });
      save();
      render();
      toast("Shortcut removed.");
    }
  }

  function positionHub(x, y) {
    var fab = document.getElementById("hub-fab");
    var size = 64;
    var maxX = Math.max(8, window.innerWidth - size - 8);
    var maxY = Math.max(8, window.innerHeight - size - 8);
    var left = x == null ? maxX : Math.min(maxX, Math.max(8, x));
    var top = y == null ? Math.max(8, window.innerHeight - size - 24) : Math.min(maxY, Math.max(8, y));
    fab.style.left = left + "px";
    fab.style.top = top + "px";
    state.settings.hubX = left;
    state.settings.hubY = top;
  }

  function placeMenuNearHub() {
    var fab = document.getElementById("hub-fab");
    var menu = document.getElementById("hub-menu");
    var fabRect = fab.getBoundingClientRect();
    menu.hidden = false;
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    var left = fabRect.left - width - 10;
    if (left < 8) left = fabRect.right + 10;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    var top = fabRect.top - height - 10;
    if (top < 8) top = fabRect.bottom + 10;
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - height - 8);
    }
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function openHub() {
    if (!state.settings.workspaceActive) return;
    document.getElementById("hub-scrim").hidden = false;
    placeMenuNearHub();
    document.getElementById("hub-fab").setAttribute("aria-expanded", "true");
  }

  function closeHub() {
    document.getElementById("hub-menu").hidden = true;
    document.getElementById("hub-scrim").hidden = true;
    document.getElementById("hub-fab").setAttribute("aria-expanded", "false");
  }

  function enableHubDrag() {
    var fab = document.getElementById("hub-fab");
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var origX = 0;
    var origY = 0;

    function point(event) {
      if (event.touches && event.touches[0]) return event.touches[0];
      return event;
    }

    function onDown(event) {
      var p = point(event);
      dragging = true;
      moved = false;
      startX = p.clientX;
      startY = p.clientY;
      origX = fab.offsetLeft;
      origY = fab.offsetTop;
    }

    function onMove(event) {
      if (!dragging) return;
      var p = point(event);
      var dx = p.clientX - startX;
      var dy = p.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      positionHub(origX + dx, origY + dy);
      if (moved) event.preventDefault();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        save();
      } else {
        openHub();
      }
    }

    fab.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    fab.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openHub();
      }
    });
  }

  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("is-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    document.getElementById("drawer-backdrop").hidden = true;
  }

  function bind() {
    document.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { setView(btn.getAttribute("data-view")); });
    });
    document.getElementById("menu-toggle").addEventListener("click", function () {
      var open = !document.getElementById("sidebar").classList.contains("is-open");
      document.getElementById("sidebar").classList.toggle("is-open", open);
      this.setAttribute("aria-expanded", String(open));
      document.getElementById("drawer-backdrop").hidden = !open;
    });
    document.getElementById("drawer-backdrop").addEventListener("click", closeSidebar);
    document.getElementById("add-app-btn").addEventListener("click", function () { openModal(null); });
    document.querySelectorAll("[data-open-add]").forEach(function (btn) {
      btn.addEventListener("click", function () { openModal(null); });
    });
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-cancel").addEventListener("click", closeModal);
    document.getElementById("app-form").addEventListener("submit", handleSaveApp);
    document.getElementById("main").addEventListener("click", handleCardClick);
    document.getElementById("search").addEventListener("input", function () {
      ui.query = this.value;
      if (ui.view !== "library") setView("library");
      render();
    });
    document.querySelectorAll("[data-category]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        ui.category = chip.getAttribute("data-category");
        document.querySelectorAll("[data-category]").forEach(function (item) {
          item.classList.toggle("is-active", item === chip);
        });
        setView("library");
        render();
      });
    });
    document.getElementById("activate-workspace").addEventListener("change", function () {
      state.settings.workspaceActive = this.checked;
      save();
      applyActivation();
      toast(this.checked
        ? "Workspace active. Drag the Hub button, then open a shortcut. On Android, overlay permission is required for a system overlay."
        : "Workspace deactivated. The Hub is hidden.");
    });
    document.getElementById("clear-recents").addEventListener("click", function () {
      state.recents = [];
      save();
      render();
      toast("Recently opened list cleared.");
    });
    document.getElementById("settings-form").addEventListener("submit", function (event) {
      event.preventDefault();
      state.settings.displayName = document.getElementById("setting-name").value.trim();
      state.settings.theme = document.getElementById("setting-theme").value;
      state.settings.restoreOnLoad = document.getElementById("setting-restore").checked;
      state.settings.confirmLaunch = document.getElementById("setting-confirm-launch").checked;
      save();
      render();
      document.getElementById("settings-status").textContent = "Settings saved on this device.";
    });
    document.getElementById("reset-workspace").addEventListener("click", function () {
      if (!window.confirm("Replace the library with the default shortcuts? Favourites and recents will reset.")) return;
      state.apps = cloneDefaults();
      state.recents = [];
      save();
      render();
      toast("Library restored to defaults.");
    });
    document.getElementById("export-data").addEventListener("click", function () {
      var blob = new Blob([localStorage.getItem(STORAGE_KEY) || "{}"], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "universal-app-hub-workspace.json";
      a.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById("import-data").addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result));
          if (!Array.isArray(parsed.apps)) throw new Error("Invalid file");
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          load();
          fillSettings();
          render();
          toast("Workspace imported.");
        } catch (err) {
          toast("Could not import that JSON file.");
        }
      };
      reader.readAsText(file);
      this.value = "";
    });
    document.getElementById("hub-close").addEventListener("click", closeHub);
    document.getElementById("hub-scrim").addEventListener("click", closeHub);
    document.getElementById("hub-menu").addEventListener("click", function (event) {
      var item = event.target.closest("[data-open-id]");
      if (!item) return;
      var app = getApp(item.getAttribute("data-open-id"));
      closeHub();
      if (app) openShortcut(app);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
        closeHub();
        closeSidebar();
      }
    });
    window.addEventListener("resize", function () {
      if (state.settings.workspaceActive) positionHub(state.settings.hubX, state.settings.hubY);
    });
    enableHubDrag();
  }

  function fillSettings() {
    document.getElementById("setting-name").value = state.settings.displayName;
    document.getElementById("setting-theme").value = state.settings.theme;
    document.getElementById("setting-restore").checked = state.settings.restoreOnLoad;
    document.getElementById("setting-confirm-launch").checked = state.settings.confirmLaunch;
  }

  load();
  if (!state.settings.restoreOnLoad) {
    state.settings.workspaceActive = false;
  }
  bind();
  fillSettings();
  render();
})();
