var date = "2017-06-18";
var intro = "LuVa-Games-";
var coreCacheName = intro + "Core (" + date + ")";
var dbCacheName = intro + "Database (Dynamic)";
var db = "https://spreadsheets.google.com/feeds/list/16qXL4U92CwMa5QdAIS1tyTKDQNrINo0uvk6dvu10XBI/1/public/values?alt=json";
var coreRes = [
	'/',
	'/?utm_source=homescreen',
	'index.html',
	'manifest.json',
	'/asset/form.html',
	'/asset/ico.png',
	'/asset/logo@1x.png',
	'/asset/logo@0,5x.png',
	'/asset/MaterialIcons-Regular.woff2'
];
var css = [
	'https://fonts.googleapis.com/css?family=Roboto:400,700',
	'https://cdnjs.cloudflare.com/ajax/libs/angular-material/1.1.4/angular-material.min.css',
	'https://cdnjs.cloudflare.com/ajax/libs/angular-material-data-table/0.10.10/md-data-table.min.css'
];
var fonts = [];
var js = [
	'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.4/angular.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.4/angular-aria.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.4/angular-animate.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.4/angular-messages.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/angular-material/1.1.4/angular-material.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/angular-material-data-table/0.10.10/md-data-table.min.js'
];
coreRes = coreRes.concat(js, css);
importScripts('/asset/sw-offline-google-analytics.prod.v0.0.25.js');

self.addEventListener('install', function(e) {
	e.waitUntil(
		caches.open(coreCacheName).then(function(c) {
			return c.addAll(coreRes);
		}),
		fetch(db).then(function(res) {
			if (!res.ok) throw new Error("Failed to fetch DB!");
			
			caches.open(dbCacheName).then(function(c) {
				return c.put('database', res);
			});
		})
	);	
});
self.addEventListener('activate', function(e) {
	clients.claim();
	e.waitUntil(
		caches.keys().then(function(ls) {
			return Promise.all(
				ls.filter(function(single) {
					return single.startsWith(intro) && (single == coreCacheName ? false : (dbCacheName==single ? false : true));
				}).map(function(single) {
					return caches.delete(single);
				})
			);
		})
	);
});

goog.offlineGoogleAnalytics.initialize();
self.addEventListener('fetch', function(e) {
	if (e.request.url == db) {
		e.respondWith(
			caches.open(dbCacheName).then(function(c) {
				return fetch(db).then(function(res) {
					c.put('database', res.clone());
					return res;
				});
			})
		);
	} else {
		e.respondWith(
			caches.match(e.request).then(function(res) {
				return res || fetch(e.request);
			})
		);
	}
});

self.addEventListener('message', function(m){
	if (m.data == 'skipWaiting') {
		self.skipWaiting();
	}
})