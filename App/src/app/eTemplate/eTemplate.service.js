(function() {
	'use strict';

	angular.module('app.eTemplate')
	.factory('eTemplateService' , eTemplateService);
    
	/** @ngInject **/
	function eTemplateService(firebaseDataRef, $firebaseObject,$filter, appUtils, $q, $firebaseArray){
		var service = {
			list: list,
			get: get,
			create: create,
            update: update,
            remove: remove,
            search: search,
            checkUniqueName : checkUniqueName
		};

		var tplRef = firebaseDataRef.child('emarketing-templates');

		return service;

		function list(){
			return $firebaseArray(tplRef);
		}

		function get(id,channel){
			var ref = tplRef.child(channel + '/' + id);
			return $firebaseObject(ref);
		}

        function create(objAdd){
            var ts = appUtils.getTimestamp(),
            key = objAdd.channel + '/' + objAdd.shortName;
            objAdd.timestampCreated =  ts;
            objAdd.timestampModified =  ts;
            //
            return tplRef.child(key).set(objAdd).then(function(res){
                 return {result: true , data: key};
            }, function(error){
				 return {result: false , msgError: error};
			});
        }

        function update(objUpdate){
            var ts = appUtils.getTimestamp(),
            key =  objUpdate.channel + '/' + objUpdate.$id;
            objUpdate.timestampModified =  ts;
            //
            return tplRef.child(key).update({
				content: objUpdate.content,
				note: objUpdate.note,
				timestampModified: ts,
				editorName: objUpdate.editorName,
				subject: objUpdate.subject || '',
				displayName: objUpdate.displayName || ''
			}).then(function(res){
                 return {result: true , data: key};
            }, function(error){
				 return {result: false , msgError: error};
			});
        }

        function remove(item){
			var key =  item.channel + '/' + item.$id;
			return tplRef.child(key).remove().then(function(res){
                 return {result: true};
            }, function(error){
				 return {result: false , msgError: error};
			});
		}

        function search(cir){
			var emailRef = firebaseDataRef.child('emarketing-templates/email'),
			smsRef = firebaseDataRef.child('emarketing-templates/sms'),
			reqs = [];
			reqs.push($firebaseArray(emailRef).$loaded());
			reqs.push($firebaseArray(smsRef).$loaded());
			return $q.all(reqs).then(function(res){
                emailRef.onDisconnect();
				smsRef.onDisconnect();
				var data = res[0].concat(res[1]);
				var searchFields = ['name','shortName'];
				return $filter('filter')(data, function (item) {
					for(var index in searchFields) {
						var attr = searchFields[index];
						if (searchMatch(item[attr] + '', cir.keyword)){
							return true;
						}
					}
					return false;
				});
			});
		 }

		 function searchMatch(haystack, needle) {
			if (!needle) {
				return true;
			}
			return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
		 }

        function checkUniqueName(item){
			var key = item.channel + '/' + item.shortName;
            var ref =  tplRef.child(key);
            return $firebaseObject(ref).$loaded().then(function(data){
                ref.onDisconnect();
				if(data.$value !== null){
					return data;
				}
                return null;
            });
        }

		function objToArray (obj) {
            if ( !useProperty ) return _.values(obj);
            var rs = [];
            return rs;
        }
	}

})();