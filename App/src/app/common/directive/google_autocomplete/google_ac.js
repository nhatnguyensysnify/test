(function(){
	'use strict';

    angular.module('googleAutocomplete', []).directive('googleAc', function() {
        return {
            restrict: "E",
            scope: { address: '=' },
            template: [
                '<input class="form-control" ng-class="address.cls" ng-model="appAddress"/><br/>'
            ].join(''),
            link: function(scope, element, attrs, model) {
                scope.$watch('address.show', function ( n ) {
                    if ( n ) {
                        var place = scope.address.place;
                        scope.appAddress = '';

                        if ( place ) {
                            scope.appAddress = [place.address || '', place.city || '', place.state || '', place.zipCode || ''].join(', ');
                            scope.appAddress = scope.appAddress.replace(/ ,/g, '');
                            scope.appAddress = scope.appAddress.replace(/, $/, '');
                        }

                        var options = {
                            types: [],
                            componentRestrictions: {}
                        };

                        var gPlaceFrm = element[0].querySelector('.' + scope.address.cls);
                        var gPlace = new google.maps.places.Autocomplete(gPlaceFrm, options);

                        google.maps.event.addListener(gPlace, 'place_changed', function() {
                            var place = gPlace.getPlace();
                            var addComponents = [];
                            if ( place ) addComponents = place.address_components;

                            scope.address.getPlace(addComponents);
                        });
                    }
                });
            }
        };
    });
})();