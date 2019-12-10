(function() {
	'use strict';
	angular.module('app.membership').factory('memberShipService', memberShipService);
   /** @ngInject **/
  function memberShipService($http,$q,firebaseDataRef, appUtils, membershipSnapshotService, memAppSnapshotService, DataUtils){
  		var items = firebaseDataRef.child('membership');
      var searchRef = firebase.database().ref("/membership-snapshot");
  		var service = {
        itemsLoadOnce: getAllItemsLoadOnce,
        getWithLoad: getWithLoad,
  			create: create,
  			update: update,
  			remove: remove,
        verificationAddress: verificationAddress,
        activeMember : activeMember,
        searchQuery: searchQuery,
        searchVerifiedQuery: searchVerifiedQuery
  		};

      var searchedMembers = [];

      return service;
      
      function getAllItemsLoadOnce(){
        return DataUtils.getListDataFirebaseLoadOnce(items, true);
      }
      
      function getWithLoad(id) {
        var ref = firebaseDataRef.child('membership/' + id);
        return DataUtils.getDataFirebaseLoadOnce(ref, true);
      }

  		function create(add){
        var key = items.push().key,
            ts = appUtils.getTimestamp();
        
        add.timestampCreated = add.timestampModified = ts;
        add =  DataUtils.stripDollarPrefixedKeys(add);
   			return items.child(key).update(add).then(function(result) {
  		        return {result: true , errorMsg: "", id: key};
  		      }).catch(function(error) {
                console.log(error);
  		        return {result: false , errorMsg: error.message};
  		    });
      }
      
      function update(update){
        var key = angular.copy(update.$id),
              ts = appUtils.getTimestamp();
        var ref= firebaseDataRef.child('membership/' + key);
        update.timestampModified = ts;
        update = DataUtils.stripDollarPrefixedKeys(update);
        return ref.update(update).then(function(){
            var reqs = [];
            _.forEach(update.apps, function(appId) {
               reqs.push(memAppSnapshotService.update(appId));
            });
            return $q.all(reqs).then(function(){return { result: true, errorMsg: "" }; });
        }).catch(function(error) {
            console.log(error);
            return {result: false , errorMsg: error.message};
        });
  		}

  		function remove(id){
        var ref = items.child(id + '/timestampCreated');
        return DataUtils.firebaseLoadOnce(ref, false).then(function(timeStamp){
            var obj = {
               timestampCreated : timeStamp
            };
            return items.child(id).remove().then(function(){
              membershipSnapshotService.remove(obj);
              return {result: true , errorMsg: ""};
            }).catch(function(error) {
                console.log(error);
              return {result: false , errorMsg: error.message};
              });
        });
  		}

      function verificationAddress (address) {
        return $http({
          method: 'GET',
          url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address
        });
      }

      function activeMember(member){
        var mem = firebaseDataRef.child('membership/' + member.$id),
            ts = appUtils.getTimestamp();
        return mem.update({
            isActive : member.isActive,
            timestampModified: ts
        }).then(function(data){
            var reqs = [];
            _.forEach(member.apps, function(appId) {
              reqs.push(memAppSnapshotService.update(appId));
            });
            return $q.all(reqs).then(function(){
                return { result: true, errorMsg: "" };
            });  
        }).catch(function(error) {
            console.log(error);
            return {result: false , errorMsg: error.message};
       });
     }

     function searchQuery(index, type, term, authors,region, timestampStart, timestampEnd, pageSize, pageIndex){
         var from = pageSize * pageIndex;
         var bool;
         // if(from !== 0){
         //     from = from;
         // }

         var size = pageSize;
         //create query
         var query = {
             index: index,
             type: type,
             size: parseInt(size),
             from: parseInt(from)
         };

         query.body= {};
         query.body.query = {
             bool:{
                 must:[{
                     range: {
                       apptimestampSignatured : {
                             gte: timestampStart,
                             lte: timestampEnd
                         }
                     }
                 },{
                     match:{
                       isActive : true
                     }
                 }]
             }
         };

         if(authors && $.trim(authors) !== '' && authors !== 'All'){
            bool = {
               match : {
                   author: authors
               }
            };
            query.body.query.bool.must.push(bool);
         }

         if(region && $.trim(region) !== '' && region !== 'All'){
            bool = {
               match : {
                   region: region
               }
            };
            query.body.query.bool.must.push(bool);
         }

         if($.trim(term) !== '') {
            bool = {
               match_phrase_prefix: {
                   _all : term.toLowerCase()
               }
            };

            query.body.query.bool.must.push(bool);
         }

         query.sort = ['timestampCreated:desc'];
         return query;
     }
     
     function searchVerifiedQuery(index, type, term, authors,region, timestampStart, timestampEnd, pageSize, pageIndex){
         var from = pageSize * pageIndex;
         var bool;
         // if(from !== 0){
         //     from = from;
         // }

         var size = pageSize;
         //create query
         var query = {
             index: index,
             type: type,
             size: parseInt(size),
             from: parseInt(from)
         };

         query.body= {};
         query.body.query = {
             bool:{
                 must:[{
                     range: {
                         apptimestampVerified : {
                             gte: timestampStart,
                             lte: timestampEnd
                         }
                     }
                 },{
                     match:{
                       isActive : true
                     }
                 }]
             }
         };

         if(authors && $.trim(authors) !== '' && authors !== 'All'){
            bool = {
               match : {
                   author: authors
               }
            };
            query.body.query.bool.must.push(bool);
         }

         if(region && $.trim(region) !== '' && region !== 'All'){
            bool = {
               match : {
                   region: region
               }
            };
            query.body.query.bool.must.push(bool);
         }

         if($.trim(term) !== '') {
            bool = {
               match_phrase_prefix: {
                   _all : term.toLowerCase()
               }
            };

            query.body.query.bool.must.push(bool);
         }

         query.sort = ['timestampCreated:desc'];
         return query;
     }

      // function searchMembership(authors, timestampStart, timestampEnd, keyword) {
      //   var result = {
      //      items: [],
      //      totalRecords: 0
      //   };
      //   var ref = searchRef.orderByKey().startAt(timestampStart + '').endAt(timestampEnd + '').once("value");
      //   return ref.then(function (res) {
      //     var data = res.val();
      //     var records = [];
      //     if (data !== null) {
      //       var items = map(data, function (val, key) {
      //          return val.isActive && val.isActive === true;
      //       });
      //       var rs = [];
      //       _.forEach(items, function (item, key) {
      //         //filter authors
      //         var clientFlag = false;
      //         if (!authors || authors ==='' || authors === 'All') {
      //           clientFlag = true;
      //         } else if (item.author === authors) {
      //           clientFlag = true;
      //         }

      //         //filter keyword
      //         var keywordFlag = false;
      //         if ($.trim(keyword) ==='') {
      //           keywordFlag = true;
      //         } else {
      //           keywordFlag = item.keyword.toLowerCase().includes(keyword.toLowerCase());
      //         }
      //         if ((clientFlag === true) && (keywordFlag === true)) {
      //           var obj = {
      //             $id: item.membershipId,
      //             timestampCreated: item.timestampCreated,
      //             apps : item.apps,
      //             name : item.name,
      //             accountId : item.accountId,
      //             isActive : item.isActive
      //           };
      //           rs.push(obj);
      //         }
      //       });

      //       result.items = rs.sort(function (a, b) {
      //         return b.timestampCreated - a.timestampCreated;
      //       });
      //       result.totalRecords = rs.length;
      //     }
      //     return result;
      //   });
      // }

      

	  }
})();
