/* ==========================================================================
   LeToG – global JavaScript
   Contains: mock data, localStorage helpers, shared UI (navbar, footer,
   bottom nav, dropdowns, toast) and reusable card builders.
   Loaded on every page BEFORE the page specific script.
   ========================================================================== */

/* 1. Mock data ---------------------------------------------------------- */
var NOTES = [];

var CATEGORIES = [
  { name: "Programming", notes: "Browse notes", icon: "code" },
  { name: "Web Development", notes: "Browse notes", icon: "browser" },
  { name: "Mathematics", notes: "Browse notes", icon: "chart" },
  { name: "Science", notes: "Browse notes", icon: "atom" },
  { name: "Design", notes: "Browse notes", icon: "pen" },
  { name: "Business", notes: "Browse notes", icon: "bag" },
  { name: "Skills", notes: "Browse notes", icon: "star" },
  { name: "More", notes: "Explore more", icon: "dots" },
];

var CONTRIBUTORS = [];

/* 2. Small helpers ------------------------------------------------------ */
function qs(selector, scope) {
  return (scope || document).querySelector(selector);
}

function qsa(selector, scope) {
  return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
}

function formatCount(number) {
  if (number >= 1000) {
    return (number / 1000).toFixed(1).replace(".0", "") + "K";
  }
  return String(number);
}

function initials(name) {
  return name
    .split(" ")
    .map(function (part) {
      return part.charAt(0);
    })
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function showToast(message) {
  var existing = qs(".toast");
  if (existing) {
    existing.remove();
  }
  var el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  window.setTimeout(function () {
    el.remove();
  }, 2600);
}

/* 3. localStorage state ------------------------------------------------- */
var Store = {
  read: function (key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  },
  write: function (key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* storage may be unavailable – ignore in this demo */
    }
  },
};

function getBookmarks() {
  return Store.read("letog_bookmarks", []);
}

function isBookmarked(id) {
  return getBookmarks().indexOf(id) !== -1;
}

function toggleBookmark(id) {
  var list = getBookmarks();
  var index = list.indexOf(id);
  if (index === -1) {
    list.push(id);
  } else {
    list.splice(index, 1);
  }
  Store.write("letog_bookmarks", list);
  return index === -1;
}

function getNoteById(id) {
  for (var i = 0; i < NOTES.length; i++) {
    if (NOTES[i].id === Number(id)) {
      return NOTES[i];
    }
  }
  return null;
}

/* 4. Reusable icons ----------------------------------------------------- */
var ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  bookmark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  bell:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 15V10a6 6 0 10-12 0v5l-2 3h16z"/><path d="M10 21h4"/></svg>',
  upload:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>',
  home:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c3 0 5 1.5 5 4"/></svg>',
  categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4 21c0-4.5 3-7 8-7s8 2.5 8 7"/></svg>',
  messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 01-12.2 7.6L3 21l1.9-5.2A8.5 8.5 0 1121 11.5z"/><path d="M8 11h8M8 15h5"/></svg>',
  about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>',
  explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  code:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 8l-4 4 4 4"/><path d="M15 8l4 4-4 4"/></svg>',
  browser:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>',
  chart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/></svg>',
  atom:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3c5 4 6 12 0 18-6-6-5-14 0-18z"/></svg>',
  pen:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20l4-1 10-10-3-3L5 16z"/></svg>',
  bag:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  star:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4l2.4 5 5.6.7-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.6-.7z"/></svg>',
  dots:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>',
};

/* 5. Shared navbar / footer / bottom nav -------------------------------- */
function navbarHtml(active) {
  function link(href, label, icon) {
    var key = label.toLowerCase().replace(/\s+/g, "-");
    var cls = active === key ? ' class="active"' : "";
    return '<li><a href="' + href + '"' + cls + '>' + (ICONS[icon] || '') + '<span>' + label + '</span></a></li>';
  }
  return (
    '<nav class="navbar"><div class="container navbar-inner">' +
    '<a class="brand" href="home.html" aria-label="LeToG home"><span class="brand-wordmark"><span class="brand-navy">Le</span><span class="brand-teal">To</span><span class="brand-navy">G</span></span></a>' +
    '<ul class="nav-links">' +
    link("home.html", "Home", "home") +
    link("community.html", "Community", "community") +
    link("messages.html", "Messages", "messages") +
    link("categories.html", "Categories", "categories") +
    link("top-users.html", "Top Users", "users") +
    link("about.html", "About", "about") +
    '</ul>' +
    '<form class="nav-search" action="search.html" method="get" role="search"><span aria-hidden="true">' + ICONS.search + '</span><input type="search" name="q" placeholder="Search tags, categories, usernames…" aria-label="Search tags, categories, and usernames"><button type="submit" aria-label="Search">Search</button></form>' +
    '<div class="nav-right">' +
    '<button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-label="Switch theme" title="Switch theme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5z"/></svg></button>' +
    '<a class="btn btn-primary btn-sm nav-upload" href="upload.html">' + ICONS.upload + '<span>Upload</span></a>' +
    '<button class="icon-btn nav-toggle" type="button" id="navToggle" aria-label="Open menu" aria-expanded="false">' + ICONS.menu + '</button>' +
    '<div class="dropdown"><button class="icon-btn" type="button" id="bellBtn" aria-label="Notifications" aria-expanded="false" title="Notifications">' + ICONS.bell + '<span class="notification-count" id="notificationCount" hidden></span></button></div>' +
    '<div class="dropdown"><button class="avatar" type="button" id="avatarBtn" aria-label="Your account" aria-expanded="false">AA</button><div class="dropdown-panel" id="avatarPanel"><a href="profile.html">' + ICONS.user + ' My profile</a><a href="bookmarks.html">' + ICONS.bookmark + ' Bookmarks</a><a href="settings.html">Settings</a><a href="login.html">Log out</a></div></div>' +
    '</div></div><div class="mobile-menu" id="mobileMenu"><a href="home.html">' + ICONS.home + ' Home</a><a href="community.html">' + ICONS.community + ' Community</a><a href="messages.html">' + ICONS.messages + ' Messages</a><a href="categories.html">' + ICONS.categories + ' Categories</a><a href="top-users.html">' + ICONS.users + ' Top Users</a><a href="about.html">' + ICONS.about + ' About</a><a href="upload.html">' + ICONS.upload + ' Upload notes</a><form class="nav-search mobile-nav-search" action="search.html" method="get"><input type="search" name="q" placeholder="Search tags, categories, usernames…" aria-label="Search"><button type="submit">Search</button></form><a href="bookmarks.html">' + ICONS.bookmark + ' Bookmarks</a><a href="settings.html">Settings</a></div></nav>'
  );
}

function footerHtml() {
  function column(title, items) {
    var links = items
      .map(function (item) {
        return '<li><a href="' + item[1] + '">' + item[0] + "</a></li>";
      })
      .join("");
    return "<div><h4>" + title + "</h4><ul>" + links + "</ul></div>";
  }

  return (
    '<footer class="footer" id="about"><div class="container">' +
    '<div class="footer-grid"><div>' +
    '<a class="brand" href="home.html" aria-label="LeToG home"><span class="brand-wordmark"><span class="brand-navy">Le</span><span class="brand-teal">To</span><span class="brand-navy">G</span></span></a>' +
    '<p class="footer-about">A platform to discover, share and grow together.</p>' +
    '<div class="socials">' +
    '<a href="#" aria-label="LeToG on Facebook">' + ICONS.user + "</a>" +
    '<a href="#" aria-label="LeToG on X">' + ICONS.star + "</a>" +
    '<a href="#" aria-label="LeToG on Instagram">' + ICONS.browser + "</a>" +
    '<a href="#" aria-label="LeToG on LinkedIn">' + ICONS.code + "</a>" +
    "</div></div>" +
    column("Explore", [
      ["Notes", "search.html"],
      ["Categories", "search.html"],
      ["Top Users", "profile.html"],
    ]) +
    column("Support", [
      ["Help Center", "#"],
      ["Contact", "#"],
      ["Report Content", "#"],
    ]) +
    column("Company", [
      ["About", "#about"],
      ["Terms", "#"],
      ["Privacy", "#"],
    ]) +
    "</div>" +
    '<p class="footer-bottom">&copy; 2026 LeToG. All rights reserved.</p>' +
    "</div></footer>"
  );
}

function bottomNavHtml(active) {
  var items = [
    ["Home", "home.html", ICONS.home],
    ["Search", "search.html", ICONS.search],
    ["Upload", "upload.html", ICONS.upload],
    ["Saved", "bookmarks.html", ICONS.bookmark],
    ["Profile", "profile.html", ICONS.user],
  ];
  var links = items
    .map(function (item) {
      var cls = active === item[0].toLowerCase() ? ' class="active"' : "";
      return "<li><a href=" + '"' + item[1] + '"' + cls + ">" + item[2] + "<span>" + item[0] + "</span></a></li>";
    })
    .join("");
  return '<nav class="bottom-nav" aria-label="Mobile navigation"><ul>' + links + "</ul></nav>";
}

/* 6. Reusable card builders -------------------------------------------- */
function fileIconHtml(fileType) {
  var extra = fileType === "DOCX" ? " doc" : fileType === "PPT" ? " ppt" : "";
  return '<span class="file-icon' + extra + '" aria-hidden="true">' + fileType + "</span>";
}

function metaHtml(note) {
  return (
    '<div class="meta-row">' +
    '<span><span class="star" aria-hidden="true">★</span> ' + note.rating + "</span>" +
    "<span>" + formatCount(note.views) + " views</span>" +
    "<span>" + formatCount(note.downloads) + " downloads</span>" +
    "</div>"
  );
}

function bookmarkButtonHtml(note) {
  return (
    '<button class="bookmark-btn" type="button" data-bookmark="' + note.id + '" ' +
    'aria-pressed="' + (isBookmarked(note.id) ? "true" : "false") + '" ' +
    'aria-label="Save ' + note.title + '">' + ICONS.bookmark + "</button>"
  );
}

function tagsHtml(note) {
  var tags = note.tags
    .map(function (tag) {
      return '<span class="tag">' + tag + "</span>";
    })
    .join("");
  var level =
    note.tags.indexOf(note.difficulty) === -1
      ? '<span class="tag tag-muted">' + note.difficulty + "</span>"
      : "";
  return '<div class="tag-row">' + tags + level + "</div>";
}

/* Grid style card used on home, bookmarks and profile pages */
function noteCardHtml(note) {
  return (
    '<article class="note-card">' +
    bookmarkButtonHtml(note) +
    fileIconHtml(note.fileType) +
    '<a class="note-title" href="note.html?id=' + note.id + '">' + note.title + "</a>" +
    '<p class="note-desc">' + note.description + "</p>" +
    '<p class="note-author">' + note.author + " &middot; " + note.category + "</p>" +
    tagsHtml(note) +
    metaHtml(note) +
    "</article>"
  );
}

/* Horizontal card used on the search results page */
function resultCardHtml(note) {
  return (
    '<article class="result-card">' +
    fileIconHtml(note.fileType) +
    "<div>" +
    '<a class="note-title" href="note.html?id=' + note.id + '">' + note.title + "</a>" +
    '<p class="note-desc">' + note.description + "</p>" +
    '<p class="note-author">' + note.author + "</p>" +
    tagsHtml(note) +
    metaHtml(note) +
    "</div>" +
    bookmarkButtonHtml(note) +
    "</article>"
  );
}

/* Notifications live in a right-side page column, not a floating overlay. */
function setupNotificationDrawer() {
  var bell = qs("#bellBtn");
  if (!bell) return;
  var navSlot = qs("#site-nav");
  var bottom = qs("#site-bottom-nav");
  var body = document.body;
  var layout = document.createElement("div"); layout.className = "app-page-layout";
  var main = document.createElement("div"); main.className = "app-page-main";
  var drawer = document.createElement("aside"); drawer.className = "notification-drawer"; drawer.id = "notificationDrawer"; drawer.hidden = true;
  drawer.innerHTML = '<div class="notification-drawer-head"><h2>Notifications</h2><button type="button" class="icon-btn" id="closeNotificationDrawer" aria-label="Close notifications">×</button></div><div class="notification-drawer-list" id="notificationDrawerList"><p class="muted">Sign in to see notifications.</p></div>';
  var nodes = Array.from(body.children);
  nodes.forEach(function(node){ if(node===navSlot || node===bottom) return; main.appendChild(node); });
  if (navSlot && navSlot.parentNode === body) body.insertBefore(layout, navSlot.nextSibling); else body.insertBefore(layout, bottom || null);
  layout.appendChild(main); layout.appendChild(drawer);
  if (bottom) body.appendChild(bottom);
  var db = window.leToGSupabase;
  var currentUser = null;
  async function loadNotifications(){
    var list = qs("#notificationDrawerList"), badge = qs("#notificationCount");
    if (!db) { list.innerHTML='<p class="muted">Supabase is not configured.</p>'; return; }
    var auth = await db.auth.getUser(); currentUser = auth.data && auth.data.user;
    if (!currentUser) { list.innerHTML='<p class="muted">Please log in to see your notifications.</p>'; badge.hidden=true; return; }
    var r = await db.from("user_notifications").select("id,actor_id,type,created_at,read_at").eq("recipient_id",currentUser.id).order("created_at",{ascending:false}).limit(40);
    if(r.error){list.innerHTML='<p class="muted">Could not load notifications. Check the latest LeToG Supabase SQL.</p>';return;}
    var rows=r.data||[], unread=rows.filter(function(n){return !n.read_at;}).length;
    badge.textContent=unread>9?'9+':String(unread); badge.hidden=!unread;
    if(!rows.length){list.innerHTML='<p class="muted">No notifications yet. When someone follows or messages you, it will appear here.</p>';return;}
    var ids=Array.from(new Set(rows.map(function(n){return n.actor_id;})));
    var pr=await db.from("profiles").select("id,display_name,avatar_url").in("id",ids), people={};
    (pr.data||[]).forEach(function(x){people[x.id]=x;});
    function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    list.innerHTML=rows.map(function(n){var person=people[n.actor_id]||{},name=person.display_name||'A LeToG member',isMsg=n.type==='message';var href=isMsg?'messages.html?to='+encodeURIComponent(n.actor_id):'member.html?id='+encodeURIComponent(n.actor_id);var action=isMsg?'sent you a message':'started following you';return '<a class="notification-item '+(!n.read_at?'unread':'')+'" href="'+href+'"><span class="notification-avatar">'+(person.avatar_url?'<img src="'+esc(person.avatar_url)+'" alt="">':esc(name.charAt(0).toUpperCase()))+'</span><span class="notification-copy"><strong>'+esc(name)+'</strong> '+action+'<small>'+esc(new Date(n.created_at).toLocaleString())+'</small></span></a>';}).join('');
    var unreadIds=rows.filter(function(n){return !n.read_at;}).map(function(n){return n.id;});
    if(unreadIds.length) await db.from("user_notifications").update({read_at:new Date().toISOString()}).in("id",unreadIds).eq("recipient_id",currentUser.id);
  }
  function openDrawer(open){drawer.hidden=!open;layout.classList.toggle('notifications-open',open);bell.setAttribute('aria-expanded',open?'true':'false');if(open)loadNotifications();}
  bell.addEventListener('click',function(e){e.stopPropagation();openDrawer(drawer.hidden);});
  qs('#closeNotificationDrawer').addEventListener('click',function(){openDrawer(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')openDrawer(false);});
}

/* 7. Wire up shared behaviour ------------------------------------------ */
function mountChrome() {
  var page = document.body.getAttribute("data-page") || "";

  var navSlot = qs("#site-nav");
  if (navSlot) {
    navSlot.innerHTML = navbarHtml(page);
  }

  var footerSlot = qs("#site-footer");
  if (footerSlot) {
    footerSlot.innerHTML = footerHtml();
  }

  var bottomSlot = qs("#site-bottom-nav");
  if (bottomSlot) {
    bottomSlot.innerHTML = bottomNavHtml(page);
  }

  applyLeToGTheme(Store.read("letog_theme", "light"));

  // mobile menu
  var toggle = qs("#navToggle");
  var mobileMenu = qs("#mobileMenu");
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // dropdowns
  function bindDropdown(buttonId, panelId) {
    var button = qs("#" + buttonId);
    var panel = qs("#" + panelId);
    if (!button || !panel) {
      return;
    }
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      qsa(".dropdown-panel").forEach(function (other) {
        if (other !== panel) {
          other.classList.remove("open");
        }
      });
      var open = panel.classList.toggle("open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  bindDropdown("avatarBtn", "avatarPanel");
  setupNotificationDrawer();

  document.addEventListener("click", function () {
    qsa(".dropdown-panel").forEach(function (panel) {
      panel.classList.remove("open");
    });
  });
}


/* Global light/dark theme. Saved once and applied across all pages. */
function applyLeToGTheme(theme) {
  var selected = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", selected);
  if (document.body) document.body.setAttribute("data-theme", selected);
  Store.write("letog_theme", selected);
  qsa("[data-theme-toggle]").forEach(function (button) {
    var dark = selected === "dark";
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    button.setAttribute("title", dark ? "Switch to light theme" : "Switch to dark theme");
    button.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5z"/></svg>';
  });
  qsa("[data-theme]").forEach(function (button) {
    button.classList.toggle("is-active", button.getAttribute("data-theme") === selected);
  });
}

// Apply the saved theme before the shared page UI is mounted.
(function () {
  var selected = "light";
  try { selected = JSON.parse(window.localStorage.getItem("letog_theme")) || "light"; } catch (error) {}
  document.documentElement.setAttribute("data-theme", selected === "dark" ? "dark" : "light");
})();

document.addEventListener("click", function (event) {
  var toggle = event.target.closest ? event.target.closest("[data-theme-toggle]") : null;
  if (!toggle) return;
  var current = document.documentElement.getAttribute("data-theme") || "light";
  applyLeToGTheme(current === "dark" ? "light" : "dark");
});

/* Bookmark buttons work on every page (event delegation) */
document.addEventListener("click", function (event) {
  var button = event.target.closest ? event.target.closest("[data-bookmark]") : null;
  if (!button) {
    return;
  }
  var id = Number(button.getAttribute("data-bookmark"));
  var saved = toggleBookmark(id);
  button.setAttribute("aria-pressed", saved ? "true" : "false");
  showToast(saved ? "Saved to bookmarks" : "Removed from bookmarks");
  document.dispatchEvent(new CustomEvent("letog:bookmarks-changed"));
});

document.addEventListener("DOMContentLoaded", mountChrome);
