(function () {
	angular.module('app.utils')
		.factory('DataUtils', DataUtils);
	/** @ngInject **/
	function DataUtils(firebaseDataRef, $localStorage, $q, appUtils, CacheUtil, APP_CONFIG) {
		var utils = {
			stripDollarPrefixedKeys: stripDollarPrefixedKeys,
			firebaseLoadOnce: firebaseLoadOnce,
			getDataFirebaseLoadOnce: getDataFirebaseLoadOnce,
			getListDataFirebaseLoadOnce: getListDataFirebaseLoadOnce,
			updateTimeStampModifiedNode: updateTimeStampModifiedNode,
			toAFArray: toAFArray,
			array2ObjectIndex: array2ObjectIndex
		};

		function updateTimeStampModifiedNode(refPath) {
			var ref = firebaseDataRef.child(refPath + '/timestampModified'), ts = appUtils.getTimestamp();
			return ref.set(ts).then(function () {
				return { result: true };
			}).catch(function (error) {
				return { result: false, errorMsg: error };
			});
		}

		function stripDollarPrefixedKeys(data) {
			if (!angular.isObject(data) || angular.isDate(data)) { return data; }
			var out = angular.isArray(data) ? [] : {};
			angular.forEach(data, function (v, k) {
				if (typeof k !== 'string' || k.charAt(0) !== '$') {
					out[k] = stripDollarPrefixedKeys(v);
				}
				if (v === undefined) {
					delete out[k];
				}
			});
			return out;
		}

		function firebaseLoadOnce(ref, injectKey) {
			return ref.once('value').then(function (snapshop) {
				var val = snapshop.val();
				if (val && injectKey !== false) {
					val.$id = ref.key;
				}
				return val;
			});
		}

		function getDataFirebaseLoadOnce(refPath, notCache) {
			var deferred = $q.defer();
			var ref = angular.isString(refPath) ? firebaseDataRef.child(refPath) : refPath,
				storageKey = ref.toString().replace(APP_CONFIG.fbConnection.databaseURL, 'strg').replace('/', ':'),
				cache = CacheUtil.getOfflineCache(),
				loadFromRemote = false;
			// Get from local storage first
			var storageData = cache.get(storageKey);
			if (!storageData || notCache) {
				return _getData(ref, notCache);

			} else {
				var listTimeModifiedRef = ref.child('timestampModified');
				return firebaseLoadOnce(listTimeModifiedRef, false).then(function (timeStamp) {
					if (storageData.timestampModified < timeStamp) {
						return _getData(ref);
					}
					return storageData;
				});
			}
		}

		function getListDataFirebaseLoadOnce(refPath, notCache) {
			return getDataFirebaseLoadOnce(refPath, notCache).then(function (data) {
				return toAFArray(data);
			});
			// var deferred = $q.defer();

			// // Get from local storage first
			// var storageData = ($localStorage.dataCache && $localStorage.dataCache[refPath]) ? JSON.parse($localStorage.dataCache[refPath]) : null;

			// if(!storageData || storageData === null || notCache){
			// 	console.log('get from firebase storageData not existed');
			// 	_getListData(refPath, deferred);
			// }else{
			// 	var listTimeModifiedRef = firebaseDataRef.child(refPath).child('timestampModified');
			// 	$firebaseObject(listTimeModifiedRef).$loaded().then(function (timeStamp) {
			// 		if(timeStamp.$value && timeStamp.$value !== null && (storageData.timestampModified < timeStamp.$value)){
			// 			console.log('get from firebase storageData expired');
			// 			_getListData(refPath, deferred);
			// 		}else{
			// 			console.log('get from storageData');
			// 			return deferred.resolve(storageData.items);
			// 		}
			// 	});
			// }

			// return deferred.promise;
		}

		//=================================================================================================================================================
		function _getData(ref, notCache) {
			return firebaseLoadOnce(ref).then(function (val) {
				var storageKey = ref.toString().replace(APP_CONFIG.fbConnection.databaseURL, 'strg').replace('/', ':'),
					cache = CacheUtil.getOfflineCache();
				if (val && notCache !== true) {
					try {
						cache.put(storageKey, val);
						// console.log();
					} catch (e) {
						cache.removeAll();
						// cache.put(storageKey, val);
					}
				}
				return val;
			});
			// if(!$localStorage.dataCache){
			// 	 $localStorage.dataCache = {};
			// }
			// var ref = firebaseDataRef.child(refPath);
			// ref.once('value').then(function(snapshop){
			// 	var val = snapshop.val(), timestampModified, rs = {};
			// 	if(val){
			// 		val.$id = ref.key;
			// 		timestampModified = val['timestampModified'] || '';
			// 		
			// 	}
			// 	$localStorage.dataCache[refPath] = JSON.stringify({item: val, timestampModified: timestampModified});
			// 	return deferred.resolve(val);
			// });
		}

		function _getListData(refPath, deferred) {
			if (!$localStorage.dataCache) {
				$localStorage.dataCache = {};
			}
			firebaseDataRef.child(refPath).once('value').then(function (snapshot) {
				var items = {}, timestampModified = '';
				if (snapshot) {
					var data = snapshot.val();
					if (data) {
						/* jshint ignore:start */
						timestampModified = data['timestampModified'] || '';
						items = _toArray(data);
						items = _.map(items, function (item) {
							var obj = item.value;
							obj.$id = item.key;
							return obj;
						});
						/* jshint ignore:end */

					}
				}
				$localStorage.dataCache[refPath] = JSON.stringify({ items: items, timestampModified: timestampModified });
				return deferred.resolve(items);
			});
		}

		function _toArray(targetObject) {
			if (!targetObject) {
				return [];
			}

			var arr = [];
			Object.keys(targetObject).forEach(
				function (key) {
					//skip timestampCreated/Modified
					if (key !== 'timestampCreated' && key != 'timestampModified' && key != '$id') {
						arr.push({
							key: key,
							value: targetObject[key]
						});
					}
				}
			);

			return arr;
		}

		function toAFArray(targetObject) {
			if (!targetObject) {
				return targetObject;
			}
			var arr = [];
			Object.keys(targetObject).forEach(
				function (key) {
					//skip timestampCreated/Modified
					if (key !== 'timestampCreated' && key != 'timestampModified' && key != '$id') {
						var o = targetObject[key];
						o.$id = key;
						arr.push(o);
					}
				}
			);
			return arr;
		}

		function array2ObjectIndex(array, key){
			var obj = {};
			_.each(array, function(item){
				obj[item[key]] = item;
			});
			return obj;
		}

		return utils;
	}

})();