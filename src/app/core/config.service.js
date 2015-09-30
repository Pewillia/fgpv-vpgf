(function () {
    'use strict';

    /**
     * @ngdoc service
     * @name configService
     * @module app.core
     * @description
     *
     * The `configService' is responsible for loading and parsing the supplied configuration.
     *
     * Config file is either specified inline, by a url or is referencing a global variable:
     * ```html
     * <div rv-map rv-cfg='{"layout": { "title": "Granpa"}}'></div>
     * ```
     * ```html
     * <div rv-map rv-cfg="config.en.json"></div>
     * ```
     * ```html
     * <div rv-map rv-cfg="configOpts"></div>
     * <script>configOpts = {}</script>
     * ```
     * The main core run block (core.run.js) kicks in the initialization process by calling initialize on the `configService`. `configService` is responsible for parsing (inline) or loading (url) of the config. This service preserves the configuration in its pristine state (after applying all the defaults) - it will not be modified.
     * After the main config service retrieved the configuration, all other services are initialized. Until then, the application is covered by a loading overlay to hide unstyled content.
     */
    angular
        .module('app.core')
        .factory('configService', configService);

    /* @ngInject */
    function configService($q, $rootElement, $timeout, $http, configDefaults) {
        var initDeferred = $q.defer();
        var isInitialized = false;

        var service = {
            data: {},
            initialize: initialize,
            ready: ready
        };

        return service;

        ////////////////

        function initialize() {
            var configAttr = $rootElement.attr('th-config');
            var configJson;

            // This function can only be called once.
            if (isInitialized) {
                return initDeferred.promise;
            }

            // check if config attribute exist
            if (configAttr) {
                // check if it's a valid JSON
                try {
                    configJson = angular.fromJson(configAttr);
                    configInitialized(configJson);
                } catch (e) {
                    console.log('Not valid JSON');
                }

                // try to load config file
                if (!configJson) {
                    $http
                        .get(configAttr)
                        .then(function (data) {
                            if (data.data) {
                                configJson = data.data;
                            }

                            // simulate delay to show loading splash
                            $timeout(function () {
                                configInitialized(configJson);
                            }, 2000);

                            //configInitialized(configJson);
                        });
                }
            } else {
                configInitialized({});
            }

            return initDeferred.promise;

            function configInitialized(config) {
                // apply any defaults from layoutConfigDefaults, then merge config on top
                // TODO: this is an exampe; actual merging of the defaults is more complicated
                angular.merge(service.data, configDefaults, config);

                isInitialized = true;

                initDeferred.resolve();
            }
        }

        function ready(nextPromises) {
            var readyPromise = initDeferred.promise;

            return readyPromise
                .then(function () {
                    console.log('Ready promise resolved.');
                    return $q.all(nextPromises);
                })
                .catch(function () {
                    console.log('"ready" function failed');
                });
        }
    }
})();