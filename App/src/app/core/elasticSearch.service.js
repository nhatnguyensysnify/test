(function(){
  'use strict';

  angular.module('app.core')
  .service('elasticSearch',elasticSearch);
  /** @ngInject **/
  function elasticSearch (esFactory,APP_CONFIG,$rootScope){
     var elasticConfig = $rootScope.storage.appSettings.elasticSearch.config;
     var elasticHost = elasticConfig && elasticConfig.host ? elasticConfig.host : APP_CONFIG.elasticHost;
     var elasticusAuth =   elasticConfig && elasticConfig.auth ? elasticConfig.auth : APP_CONFIG.elasticusAuth;
     return esFactory({host: elasticHost, httpAuth: elasticusAuth});
  }
})();