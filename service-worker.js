const CACHE_NAME = "outro-lado-design-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/coroa-192.png",
  "./icons/coroa-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((key) => key.startsWith("outro-lado-design-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Só armazena páginas e arquivos do próprio site, nunca chamadas de APIs externas.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Para navegação, prioriza a versão em cache para abrir mesmo sem conexão.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || caches.match("./index.html")
      ).then((cached) => {
        if (cached) {
          // Atualiza o cache em segundo plano quando houver internet.
          fetch(request).then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request);
      })
    );
    return;
  }

  // Para CSS, JavaScript, imagens e outros arquivos locais:
  // cache-first, salvando a resposta para visitas futuras.
  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    }).catch(() => new Response("", { status: 503 }))
  );
});
