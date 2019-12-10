(function () {
    'use strict';
    angular.module('app.utils').factory('DialogButton', DialogButton);
    /** @ngInject **/
    function DialogButton() {
        const buttons = {
            'OK': {
                label: 'OK',
                className: 'btn blue-steel'
            },
            'CANCEL': {
                label: 'CANCEL',
                className: 'btn default'
            }
        };

        return buttons;
    }
})();