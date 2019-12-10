(function () {
	'use strict';
	angular.module('app.utils')
		.factory('CacheUtil', CacheUtil);

	/** @ngInject **/
	function CacheUtil(CacheFactory) {
		var util = {
			getOfflineCache: getOfflineAppCache,
			getAppCache: getAppCache,
			getAllCaches: getAllCaches,
			clearKey: clearKey,
			clearKeyPattern: clearKeyPattern,
			clearAllExcept: clearAllExcept
		};
		return util;

		function getAppCache() {
			var cache = CacheFactory.get('app');
			if (!cache) {
				cache = CacheFactory('app', {
					capacity: 200,
					cacheFlushInterval: 600000, // This cache will clear itself every hour.
					deleteOnExpire: 'aggressive', // Items will be deleted from this cache right when they expire.
					// storageMode: 'localStorage'
				});
			}
			return cache;
		}
		function getOfflineAppCache() {
			var cache = CacheFactory.get('off_app');
			if (!cache) {
				cache = CacheFactory('off_app', {
					maxAge: 1000 * 60 * 60 * 24 * 7, // Items added to this cache expire after 1 weeks.
					storageMode: 'localStorage',
					capacity: 300,
					deleteOnExpire: 'aggressive'
				});
			}
			return cache;
		}
		function getAllCaches() {
			var caches = [
				getAppCache(),
				getOfflineAppCache()
			];

			return caches;
		}

		function clearKey(keys) {
			var caches = getAllCaches();
			_.forEach(caches, function (cache) {
				_.forEach(keys, function (key) {
					cache.remove(key);
					cache.remove(APP_CONFIG.Host + key);
					cache.remove(APP_CONFIG.EComHost + key);
				});
			});
		}

		function clearKeyPattern(keyPatterns, cache) {
			var cacheKeys = cache.keys(),
				delKeys = [],
				regex;
			_.forEach(keyPatterns, function (keyPattern) {
				regex = new RegExp(keyPattern);
				var tmpDelKeys = _.filter(cacheKeys, function (ckey) {
					return regex.test(ckey);
				});
				delKeys = delKeys.concat(tmpDelKeys);
			});
			_.forEach(delKeys, function (delKey) {
				cache.remove(delKey);
			});
		}

		function clearAllExcept(keyPatterns, cache) {
			var cacheKeys = cache.keys(),
				delKeys = [];

			delKeys = _.filter(cacheKeys, function (ckey) {
				var match = false;
				_.forEach(keyPatterns, function (keyPattern) {
					match = ckey.indexOf(keyPattern) >= 0 || match;
				});
				return !match;
			});
			_.forEach(delKeys, function (delKey) {
				cache.remove(delKey);
			});
		}
	}

})();