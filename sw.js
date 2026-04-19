const CACHE_NAME = 'masry-ai-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/chat.css',
  '/js/main.js',
  '/js/chat.js',
  '/js/particles.js',
  '/js/brain.js',
  '/manifest.json',
  '/icon.svg'
];

// تدمير الكاش القديم فوراً عند التثبيت
self.addEventListener('install', event => {
  self.skipWaiting(); // تفعيل النسخة الجديدة فوراً
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// تفعيل وتنظيف
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة فوراً
  );
});

// استراتيجية "الشبكة أولاً" لضمان التحديثات
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // للملفات الأساسية، جرب النت الأول
  if (event.request.mode === 'navigate' || event.request.url.includes('/js/') || event.request.url.includes('/css/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // للداتا التانية، الكاش الأول أسرع
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
