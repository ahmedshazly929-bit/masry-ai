const CACHE_NAME = 'masry-ai-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/chat.css',
  '/js/main.js',
  '/js/chat.js',
  '/js/particles.js',
  '/manifest.json',
  '/icon.svg'
];

// تثبيت ملفات الـ Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// التعامل مع الدخول الأوفلاين والسريع
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // نرجّع النسخة المتخزنة لو موجودة، وإلا نعمل Fetch
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
  );
});

// تنظيف الكاش القديم
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
