// Service worker do Lida (só na web; o app Android já tem tudo dentro do APK).
// O app inteiro funciona offline depois da primeira abertura.
// Ao publicar uma nova versão, aumente VERSION aqui e app.version em js/state.js.
// A lista SHELL é conferida pelos testes (npm test): todo arquivo do app precisa estar nela.
const VERSION = 'lida-v3.0.0-alfa.16';
const SHELL = [
  './',
  'index.html',
  'alarm.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/atkinson-400.woff2',
  'fonts/atkinson-700.woff2',
  'fonts/inter.woff2',
  'fonts/lexend.woff2',
  'fonts/lora.woff2',
  'fonts/manrope.woff2',
  'fonts/nunito.woff2',
  'fonts/vt323.woff2',
  'icons/apple-touch-icon.png',
  'icons/favicon.ico',
  'icons/icon.svg',
  'icons/lidinho/ancestral.webp',
  'icons/lidinho/calejado.webp',
  'icons/lidinho/diligente.webp',
  'icons/lidinho/dragao.webp',
  'icons/lidinho/erudito.webp',
  'icons/lidinho/iniciado.webp',
  'icons/lidinho/lifehacker.webp',
  'icons/lidinho/mestre.webp',
  'icons/lidinho/neofito.webp',
  'icons/lidinho/obstinado.webp',
  'icons/lidinho/perseverante.webp',
  'icons/lidinho/pinguim.webp',
  'icons/lidinho/robo.webp',
  'icons/lidinho/selfie/ancestral.webp',
  'icons/lidinho/selfie/calejado.webp',
  'icons/lidinho/selfie/diligente.webp',
  'icons/lidinho/selfie/dragao.webp',
  'icons/lidinho/selfie/erudito.webp',
  'icons/lidinho/selfie/iniciado.webp',
  'icons/lidinho/selfie/lifehacker.webp',
  'icons/lidinho/selfie/mestre.webp',
  'icons/lidinho/selfie/neofito.webp',
  'icons/lidinho/selfie/obstinado.webp',
  'icons/lidinho/selfie/perseverante.webp',
  'icons/lidinho/selfie/pinguim.webp',
  'icons/lidinho/selfie/robo.webp',
  'icons/lidinho/selfie/soberano.webp',
  'icons/lidinho/selfie/virtuoso.webp',
  'icons/lidinho/soberano.webp',
  'icons/lidinho/virtuoso.webp',
  'icons/maskable-512x512.png',
  'icons/pwa-192x192.png',
  'icons/pwa-512x512.png',
  'icons/tray-22.png',
  'icons/tray-44.png',
  'icons/tray-64.png',
  'icons/tray.svg',
  'js/core/achievements.js',
  'js/core/alarms.js',
  'js/core/backup.js',
  'js/core/changelog.js',
  'js/core/cloud.js',
  'js/core/demo.js',
  'js/core/filesync.js',
  'js/core/focus.js',
  'js/core/game.js',
  'js/core/glance.js',
  'js/core/habits.js',
  'js/core/i18n.js',
  'js/core/ipl.js',
  'js/core/legacy.js',
  'js/core/model.js',
  'js/core/net.js',
  'js/core/notify.js',
  'js/core/parse.js',
  'js/core/providers.js',
  'js/core/reminders.js',
  'js/core/simulate.js',
  'js/core/sound.js',
  'js/core/store.js',
  'js/core/sync.js',
  'js/core/tasks.js',
  'js/desktop.js',
  'js/firebase-config.js',
  'js/flavor.js',
  'js/lib/clock.js',
  'js/lib/crypto.js',
  'js/lib/hlc.js',
  'js/lib/idb.js',
  'js/lib/util.js',
  'js/lib/version.js',
  'js/main.js',
  'js/native.js',
  'js/state.js',
  'js/sync-config.js',
  'js/ui/achicons.js',
  'js/ui/chart.js',
  'js/ui/haptics.js',
  'js/ui/mascot.js',
  'js/ui/pickers.js',
  'js/ui/qr.js',
  'js/ui/reward.js',
  'js/ui/rich.js',
  'js/ui/theme.js',
  'js/ui/ui.js',
  'js/vendor/capacitor.js',
  'js/vendor/jsqr.js',
  'js/vendor/qrcode.js',
  'js/views/achievements.js',
  'js/views/alarm.js',
  'js/views/board.js',
  'js/views/brain.js',
  'js/views/celebrate.js',
  'js/views/cloudfiles.js',
  'js/views/common.js',
  'js/views/focus.js',
  'js/views/gate.js',
  'js/views/habits.js',
  'js/views/kanban.js',
  'js/views/me.js',
  'js/views/review.js',
  'js/views/search.js',
  'js/views/settings.js',
  'js/views/shop.js',
  'js/views/summary.js',
  'js/views/sync.js',
  'js/views/tasks.js',
  'js/views/today.js',
  'js/views/update.js',
  'sounds/alarms/amanhecer.ogg',
  'sounds/alarms/classico.ogg',
  'sounds/alarms/digital.ogg',
  'sounds/alarms/marimba.ogg',
  'sounds/alarms/passaros.ogg',
  'sounds/alarms/sinos.ogg',
  'sounds/sino_bicicleta.wav',
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

// Toque na notificação (ou num botão dela): traz o Lida para a frente e repassa o pedido.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const route = data.route || '';
  const msg = { type: 'notification-click', route, action: e.action || '', extra: data.extra || {} };
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const c = list[0];
      if (c) {
        c.postMessage(msg);
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
