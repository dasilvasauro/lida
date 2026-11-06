// Service worker do Lida (só na web; o app Android já tem tudo dentro do APK).
// O app inteiro funciona offline depois da primeira abertura.
// Ao publicar uma nova versão, aumente VERSION aqui e app.version em js/state.js.
// A lista SHELL é conferida pelos testes (npm test): todo arquivo do app precisa estar nela.
const VERSION = 'lida-v3.0.0-alfa.1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/atkinson-400.woff2',
  'fonts/atkinson-700.woff2',
  'fonts/inter.woff2',
  'fonts/lexend.woff2',
  'fonts/lora.woff2',
  'fonts/manrope.woff2',
  'fonts/nunito.woff2',
  'icons/apple-touch-icon.png',
  'icons/favicon.ico',
  'icons/pwa-192x192.png',
  'icons/pwa-512x512.png',
  'js/core/cloud.js',
  'js/core/demo.js',
  'js/core/legacy.js',
  'js/core/model.js',
  'js/core/notify.js',
  'js/core/sound.js',
  'js/core/store.js',
  'js/core/sync.js',
  'js/core/tasks.js',
  'js/firebase-config.js',
  'js/lib/clock.js',
  'js/lib/crypto.js',
  'js/lib/hlc.js',
  'js/lib/idb.js',
  'js/lib/util.js',
  'js/main.js',
  'js/native.js',
  'js/state.js',
  'js/ui/haptics.js',
  'js/ui/pickers.js',
  'js/ui/qr.js',
  'js/ui/reward.js',
  'js/ui/theme.js',
  'js/ui/ui.js',
  'js/vendor/capacitor.js',
  'js/vendor/jsqr.js',
  'js/vendor/qrcode.js',
  'js/views/common.js',
  'js/views/gate.js',
  'js/views/settings.js',
  'js/views/tasks.js',
  'js/views/today.js',
];
const RUNTIME = 'lida-runtime';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip') self.skipWaiting();
});

// Toque na notificação: traz o Lida para a frente e abre a tarefa.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const route = e.notification.data?.route || '';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const c = list[0];
      if (c) {
        c.postMessage({ type: 'notification-click', route });
        return c.focus();
      }
      return self.clients.openWindow(`./${route ? '#' + route : ''}`);
    }),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.endsWith('/js/firebase-config.js')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put('js/firebase-config.js', copy));
          }
          return res;
        })
        .catch(() => caches.match('js/firebase-config.js')),
    );
    return;
  }
  // App: cache primeiro, rede como reserva.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match('index.html'))));
    return;
  }
  // SDK do Firebase: usa o cache e atualiza em segundo plano.
  if (url.hostname === 'www.gstatic.com') {
    e.respondWith(
      caches.open(RUNTIME).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
  // Firestore e Auth: sempre rede (os dados ficam no IndexedDB do próprio app).
});
