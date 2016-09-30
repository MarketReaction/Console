var app = angular.module('MRConsole', [
    'ngRoute',
    'ngStorage',
    'ngTable',
    'ngSanitize',
    'angularMoment',
    'highcharts-ng',
    'ui.bootstrap',
    'MRConsoleControllers'
]);

app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/', {
                templateUrl: 'partials/dashboard.html',
                controller: 'DashboardController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated ()) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/exchanges', {
                templateUrl: 'partials/exchanges.html',
                controller: 'ExchangesController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated ()) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/exchanges/:id', {
                templateUrl: 'partials/exchange.html',
                controller: 'ExchangeController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated ()) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/company/:id', {
                templateUrl: 'partials/company.html',
                controller: 'CompanyController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated ()) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/account', {
                templateUrl: 'partials/account.html',
                controller: 'AccountController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated ()) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/story/:id', {
                templateUrl: 'partials/story.html',
                controller: 'StoryController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated ()) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/users', {
                templateUrl: 'partials/users.html',
                controller: 'UsersController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/users/:id', {
                templateUrl: 'partials/user.html',
                controller: 'UserController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/sources', {
                templateUrl: 'partials/sources.html',
                controller: 'SourcesController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/source/:id', {
                templateUrl: 'partials/source.html',
                controller: 'SourceController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/exclusions', {
                templateUrl: 'partials/exclusions.html',
                controller: 'ExclusionsController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/dateFormats', {
                templateUrl: 'partials/dateFormats.html',
                controller: 'DateFormatsController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/system', {
                templateUrl: 'partials/system.html',
                controller: 'SystemController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
            when('/learningModel', {
                templateUrl: 'partials/learningModel.html',
                controller: 'LearningModelController',
                resolve: {
                    auth: ["$q", "AuthService", function($q, authService) {
                        if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                            return $q.when(authService.isAuthenticated ());
                        } else {
                            return $q.reject("not_logged_in");
                        }
                    }]
                }
            }).
        when('/predictions', {
            templateUrl: 'partials/predictions.html',
            controller: 'PredictionsController',
            resolve: {
                auth: ["$q", "AuthService", function($q, authService) {
                    if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                        return $q.when(authService.isAuthenticated ());
                    } else {
                        return $q.reject("not_logged_in");
                    }
                }]
            }
        }).
        when('/prediction/:id', {
            templateUrl: 'partials/prediction.html',
            controller: 'PredictionController',
            resolve: {
                auth: ["$q", "AuthService", function($q, authService) {
                    if (authService.isAuthenticated () && authService.isAuthorized('ROLE_ADMIN')) {
                        return $q.when(authService.isAuthenticated ());
                    } else {
                        return $q.reject("not_logged_in");
                    }
                }]
            }
        }).
            when('/login', {
                templateUrl: 'partials/login.html',
                controller: 'LoginController'
            }).
            when('/register', {
                templateUrl: 'partials/register.html',
                controller: 'RegisterController'
            }).
            when('/register/confirm', {
                templateUrl: 'partials/register_confirm.html',
                controller: 'RegisterConfirmController'
            }).
            when('/register/activate', {
                templateUrl: 'partials/activate.html'
            }).
            otherwise({
                redirectTo: '/'
            });
    }]);

app.factory('AuthService', function ($localStorage) {
    var authService = {};

    authService.login = function (promise) {

        promise.success(function (data) {
            authService.user = data;
            $localStorage.user = authService.user;
        });

        return promise;
    };

    authService.logout = function () {
        authService.user = {};
        delete $localStorage.user;
    };

    function getUser() {
        if(!authService.user)
            authService.user = $localStorage.user;

        return authService.user;
    };

    authService.getEmail = function () {
        if(getUser() != undefined && getUser().email != undefined)
            return getUser().email;
    };

    authService.getToken = function () {
        if(getUser() != undefined && getUser().token != undefined)
            return getUser().token;
    };

    authService.isAuthenticated = function () {
        return (getUser() != undefined && getUser().token != undefined);
    };

    authService.isAuthorized = function (role) {
        if(!getUser()) {
            return false;
        }

        if(!getUser().roles)
        {
            return false;
        }

        return (getUser().roles.indexOf(role) >= 0);
    };

    authService.watchedCompanies = function () {
        if(!getUser())
            return;

        return getUser().watchedCompanies;
    };

    return authService;
});

app.factory('ConfigService', function () {
    var configService = {};

    configService.getApiBase = function () {
         return "http://api.market-reaction.com";
        //return "http://jonsnas.myqnapcloud.com:7080";
        //return "http://192.168.0.10:8080";
    };

    return configService;
});

app.service('Session', function () {
    this.create = function (sessionId, userId, userRole) {
        this.id = sessionId;
        this.userId = userId;
        this.userRole = userRole;
    };
    this.destroy = function () {
        this.id = null;
        this.userId = null;
        this.userRole = null;
    };
    return this;
});

app.config(function ($provide, $httpProvider) {

    // Intercept http calls.
    $provide.factory('HttpTokenInterceptor', function ($q, AuthService, $window) {
        return {
            // On request success
            request: function (config) {
                // console.log(config); // Contains the data about the request before it is sent.

                config.headers['Content-Type'] = 'application/json';
                config.headers['Accept'] = 'application/json';

                if(AuthService.getToken() != undefined && AuthService.getEmail() != undefined) {
                    config.headers['X-AuthToken'] = AuthService.getToken();
                    config.headers['X-AuthEmail'] = AuthService.getEmail();
                }

                // Return the config or wrap it in a promise if blank.
                return config || $q.when(config);
            },

            // On request failure
            requestError: function (rejection) {
                // console.log(rejection); // Contains the data about the error on the request.

                // Return the promise rejection.
                return $q.reject(rejection);
            },

            // On response success
            response: function (response) {
                // console.log(response); // Contains the data from the response.

                // Return the response or promise.
                return response || $q.when(response);
            },

            // On response failture
            responseError: function (rejection) {
                // console.log(rejection); // Contains the data about the error.

                if(rejection.status == 401) {
                    AuthService.logout();

                    $window.location.reload();
                }

                // Return the promise rejection.
                return $q.reject(rejection);
            }
        };
    });

    // Add the interceptor to the $httpProvider.
    $httpProvider.interceptors.push('HttpTokenInterceptor');

});