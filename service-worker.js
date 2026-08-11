const CACHE_NAME = "econ-notes-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./config.js",
  "./styles.css",
  "./theme.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./subjects/mjc-4/mjc-4.html",
  "./subjects/mjc-5/mjc-5.html",
  "./subjects/mjc-6/mjc-6.html",
  "./subjects/mjc-7/mjc-7.html",
  "./subjects/mic-4/mic-4.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));

          if (url.pathname.startsWith("/subjects/") && url.pathname.endsWith(".html")) {
            return injectPageAssets(response);
          }

          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

function injectPageAssets(response) {
  return response.text().then((html) => {
    const headInjection = `
      <link rel="manifest" href="/manifest.json">
      <meta name="theme-color" content="#1e3a8a">
      <script src="/theme.js" defer></script>
      <script src="/app.js" defer></script>
    </head>`;
    const bodyInjection = `
      <div id="notes-drawer" class="drawer-backdrop">
        <div class="drawer-content">
          <div class="drawer-header">
            <h3 style="margin:0;">📝 Subject Short Notes</h3>
            <button id="close-drawer-btn" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-primary);">✕</button>
          </div>
          <div id="drawer-notes-list" class="notes-list"></div>
          <button id="btn-download-txt" class="btn-icon-text primary" style="width:100%; justify-content:center;">📥 Export Short-Notes (.txt)</button>
        </div>
      </div>
    </body>`;

    if (html.includes("</head>")) {
      html = html.replace("</head>", headInjection);
    }
    if (html.includes("</body>")) {
      html = html.replace("</body>", bodyInjection);
    }

    return new Response(html, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText
    });
  });
}
