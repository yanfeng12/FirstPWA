var dataCacheName = 'weatherData-v1';

var cacheName = 'weatherPWA-step-6-1';
/**
 * 更新 App Shell 所需的文件列表。在数组中，
 * 我们需要加入应用所需的全部文件，包括图像、JavaScript、样式表等。
 */
var filesToCache = [
    '/',
    '/index.html',
    '/scripts/app.js',
    '/styles/inline.css',
    '/images/clear.png',
    '/images/cloudy-scattered-showers.png',
    '/images/cloudy.png',
    '/images/fog.png',
    '/images/ic_add_white_24px.svg',
    '/images/ic_refresh_white_24px.svg',
    '/images/partly-cloudy.png',
    '/images/rain.png',
    '/images/scattered-showers.png',
    '/images/sleet.png',
    '/images/snow.png',
    '/images/thunderstorm.png',
    '/images/wind.png'
  ];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
      /**
       * 通过 caches.open() 打开缓存并提供一个缓存名称。提供缓存名称可让我们对文件进行版本控制，
       * 或将数据与 App Shell 分开，以便我们能轻松地更新某个数据，而不会影响其他数据。
       */
    caches.open(cacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      /**
       * 缓存打开后，我们便可调用 cache.addAll()，这个带有网址列表参数的方法随即从服务器获取文件，并将响应添加到缓存内。
       * 遗憾的是，cache.addAll() 具有原子性，如果任何一个文件失败，整个缓存步骤也将失败！
      */
      return cache.addAll(filesToCache);
    })
  );
});

//activate 事件会在服务工作线程启动时触发。
//确保您的服务工作线程在任何 App Shell 文件更改时更新其缓存。
self.addEventListener('activate', function(e) {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
      caches.keys().then(function(keyList) {
        return Promise.all(keyList.map(function(key) {
          if (key !== cacheName && key !== dataCacheName) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
    );
    return self.clients.claim();
  });


/**
 * 服务工作线程提供了拦截 Progressive Web App 发出的请求并在服务工作线程内对它们进行处理的能力。
 * 这意味着我们可以决定想要如何处理请求，并可提供我们自己的已缓存响应。
 */
/**
 * caches.match() 会由内而外对触发抓取事件的网络请求进行评估，并检查以确认它是否位于缓存内。
 * 它随即使用已缓存版本作出响应，或者利用 fetch 从网络获取一个副本。
 * response 通过 e.respondWith() 传回至网页。
 */
//更新 fetch 事件处理程序，将发给 data API 的请求与其他请求分开处理。
self.addEventListener('fetch', function(e) {
    console.log('[Service Worker] Fetch', e.request.url);
    var dataUrl = 'https://query.yahooapis.com/v1/public/yql';
    if (e.request.url.indexOf(dataUrl) > -1) {
      /*
       * When the request URL contains dataUrl, the app is asking for fresh
       * weather data. In this case, the service worker always goes to the
       * network and then caches the response. This is called the "Cache then
       * network" strategy:
       * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
       */
      e.respondWith(
        caches.open(dataCacheName).then(function(cache) {
          return fetch(e.request).then(function(response){
            cache.put(e.request.url, response.clone());
            return response;
          });
        })
      );
    } else {
      /*
       * The app is asking for app shell files. In this scenario the app uses the
       * "Cache, falling back to the network" offline strategy:
       * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
       */
      e.respondWith(
        caches.match(e.request).then(function(response) {
          return response || fetch(e.request);
        })
      );
    }
  });