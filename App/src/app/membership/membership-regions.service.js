(function(){
  'use strict';

  angular.module("app.membership").factory("memRegionService", memRegionService);
  /** @ngInject **/
  function memRegionService (firebaseDataRef, DataUtils){
    var regionRef = firebaseDataRef.child('membership-regions');

    var service = {
        getIdByState: getIdByState,
        getAll: getAll,
        getRegion: getRegion
    };

    return service;

    function getIdByState(stateCode){
      if(stateCode === null || stateCode === undefined || stateCode === "") return "";

      var ref =regionRef.child(stateCode.toUpperCase());
      
      return DataUtils.getListDataFirebaseLoadOnce(ref, true).then(function(array){
          if(array === null || array.length === 0) return null;
          var region = _.head(array);
          return region.id;
      });
    }

    function getRegions(stateCode){
      stateCode = stateCode.toUpperCase();
      return getAll().then(function(regions){
        return regions[stateCode];
      });
    }

    function getRegion(stateCode, regionTLSId){
      stateCode = stateCode.toUpperCase();
      return getRegions(stateCode).then(function(data){
        return _.find(data, {id: regionTLSId});
      });
    }
    // getAll group by StateCode
    function getAll(){
      return DataUtils.getDataFirebaseLoadOnce(regionRef).then(function(rs){
        delete rs.$id;
        delete rs.timestampModified;
        return rs;
      });
    }
  }
})();
