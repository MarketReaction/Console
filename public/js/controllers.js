var app = angular.module('MRConsoleControllers', []);

app.controller("MainController", function($q, $scope, $http, $location, AuthService, ConfigService) {
    //$scope.page.hideNav = false;

    var searchCanceller = $q.defer();

    $scope.searching = false;

    $scope.$on("$routeChangeError", function(evt,current,previous,rejection){
        console.log('routeChangeError = Rejection [' + rejection + ']');
        if(rejection == "not_logged_in"){
            $location.path("/login");
        }
    });

    $scope.search = function(criteria) {
        if (searchCanceller.promise.$$state.pending && searchCanceller.promise.$$state.pending.length > 0) {
            searchCanceller.resolve("user cancelled");
            searchCanceller = $q.defer();
        }

        $scope.searching = true;

        return $http.get(ConfigService.getApiBase() + "/company/search/" + criteria, { timeout: searchCanceller.promise })
            .then(function(response)
                {
                    $scope.searching = false;
                    return response.data.map(function(item){
                        return item;
                });
        });
    };

    $scope.searchResultSelected = function($item, $model, $label)
    {
        $scope.searchCriteria = undefined;
        $location.path("/company/" + $item.id);
    };

    $scope.hasRole = function(role) {
        return AuthService.isAuthorized(role);
    }

    $scope.isAuthenticated = function() {
        return AuthService.isAuthenticated();
    }

    $scope.logout = function() {

        $http.post(ConfigService.getApiBase() + "/user/logout");

        AuthService.logout();

        var auth2 = gapi.auth2.getAuthInstance();

        if(auth2) {
            auth2.signOut().then(function () {
                console.log('Google OAuth2 User signed out.');
            });
        }

        $location.path("/login");
    }

    $scope.page = {
        hideNav: true
    }
});

app.controller("LoginController", function($scope, $http, $location, AuthService, ConfigService) {
    //$scope.page.hideNav = false;

    $scope.errorMsg;

    $scope.authenticating = false;

    $scope.credentials = {};

    $scope.submit = function()
    {
        $scope.authenticating = true;

        if($scope.credentials.email == undefined || $scope.credentials.email == "")
        {
            $scope.authenticating = false;
            $scope.errorMsg = "Please enter your E-mail";
            return;
        }

        if($scope.credentials.password == undefined || $scope.credentials.password == "")
        {
            $scope.authenticating = false;
            $scope.errorMsg = "Please enter your Password";
            return;
        }

        var authPromise = $http.post(ConfigService.getApiBase() + "/user/authenticate", $scope.credentials)
            .success(function(data, status, headers, config) {
                $scope.authenticating = false;
                $location.path("/");
            })
            .error(function(data, status, headers, config) {
                $scope.authenticating = false;
                $scope.errorMsg = data.message;
            });

        AuthService.login(authPromise);
    }

});

app.controller('GoogleCtrl', function($http, $location, AuthService, ConfigService) {
    function onSignIn(googleUser) {

        var authPromise = $http.post(ConfigService.getApiBase() + "/user/oauth2/google", googleUser.hg.id_token)
            .success(function(data, status, headers, config) {
                $location.path("/");
            })
            .error(function(data, status, headers, config) {
                console.log('ERROR: ' + data.message);
            });;

        AuthService.login(authPromise);
    }


    window.onSignIn = onSignIn;
});

app.controller("RegisterController", function($scope, $http, $location, ConfigService) {
    //$scope.page.hideNav = false;

    $scope.errorMsg;

    $scope.registering = false;

    $scope.submit = function()
    {
        $scope.registering = true;

        if(!$scope.userForm) {

            $scope.registering = false;
            $scope.errorMsg = "Please complete all fields";
            return;
        }

        if($scope.userForm.password != $scope.userForm.passwordConfirm)
        {
            $scope.registering = false;
            $scope.errorMsg = "Passwords do not match";
            return;
        }

        $http.post(ConfigService.getApiBase() + "/user/register", $scope.userForm)
            .success(function(data, status, headers, config) {
                $scope.registering = false;
                $location.path("/register/activate");
            })
            .error(function(data, status, headers, config) {
                $scope.registering = false;
                $scope.errorMsg = data.message;
            });
    }
});

app.controller("RegisterConfirmController", function($scope, $http, $location, $routeParams, ConfigService) {
    //$scope.page.hideNav = false;

    $scope.errorMsg;

    $scope.activating = false;

    $scope.submit = function()
    {
        $scope.activating = true;

        var authPromise = $http.post(ConfigService.getApiBase() + "/user/register/confirm", $scope.activationId)
            .success(function(data, status, headers, config) {
                $scope.activating = false;
                $location.path("/");
            })
            .error(function(data, status, headers, config) {
                $scope.activating = false;
                $scope.errorMsg = data.message;
            });
    }

    if($routeParams.activationId != undefined)
    {
        $scope.activationId = $routeParams.activationId;

        $scope.submit();
    }
});

app.controller("DashboardController", function($scope, $http, $interval, AuthService, ConfigService) {
    $scope.page.hideNav = false;

    $scope.timeline = {};
    var timelineLast = {};
    $scope.watchedCompanies = {};
    $scope.highestToday = {};
    var highestTodayLast = {};
    $scope.lowestToday = {};
    var lowestTodayLast = {};

    $scope.timelineLoading = true;
    $scope.watchedCompaniesLoading = true;
    $scope.highestCompaniesLoading = true;
    $scope.lowestCompaniesLoading = true;
    $scope.timelineLastUpdated = null;
    $scope.highestCompaniesLastUpdated = null;
    $scope.lowestCompaniesLastUpdated = null;

    var stopUpdates = $interval(updateData, 60000);

    $scope.$on('$destroy', function() {
        if (angular.isDefined(stopUpdates)) {
            $interval.cancel(stopUpdates);
            stopUpdates = undefined;
        }
    });

    $scope.updateTimeline = function () {
        $http.post(ConfigService.getApiBase() + "/story/ids/", AuthService.watchedCompanies()).
            success(function (data, status, headers, config) {
                if(angular.toJson(timelineLast) != angular.toJson(data)) {
                    timelineLast = angular.copy(data);
                    $scope.timeline = data;
                    for (i = 0; i < $scope.timeline.length; i++) {

                        $scope.timeline[i].companys = [];
                        for (c = 0; c < $scope.watchedCompanies.length; c++) {
                            if ($scope.timeline[i].matchedCompanies.indexOf($scope.watchedCompanies[c].id) != -1) {
                                $scope.timeline[i].companys.push({
                                    "id": $scope.watchedCompanies[c].id,
                                    "name": $scope.watchedCompanies[c].name
                                });

                                $http.get(ConfigService.getApiBase() + "/sentiment/company/" + $scope.watchedCompanies[c].id + "/story/" + $scope.timeline[i].id).
                                    success(function (data, status, headers, config) {
                                        for (i = 0; i < $scope.timeline.length; i++) {
                                            if ($scope.timeline[i].id == data.story) {
                                                for (c = 0; c < $scope.timeline[i].companys.length; c++) {
                                                    if ($scope.timeline[i].companys[c].id == data.company) {
                                                        $scope.timeline[i].companys[c].sentiment = data.sentiment;
                                                    }
                                                }
                                            }
                                        }
                                    });
                            }

                        }

                    }
                }
                $scope.timelineLoading = false;
                $scope.timelineLastUpdated = new Date();
            }).
            error(function (data, status, headers, config) {
                $scope.timelineLoading = false;
            });
    }

    $scope.updateHighestCompanies = function() {
        $http.get(ConfigService.getApiBase() + "/sentiment/highest/period/Day/limit/10").
            success(function (data, status, headers, config) {
                if(angular.toJson(highestTodayLast) != angular.toJson(data.content)) {
                    highestTodayLast = angular.copy(data.content);

                    $scope.highestToday = data;
                    $scope.highestCompaniesLoading = false;

                    for (i = 0; i < $scope.highestToday.length; i++) {
                        $http.get(ConfigService.getApiBase() + "/sentiment/direction/company/" + $scope.highestToday[i].companyId).
                            success(function (data, status, headers, config) {
                                for (i = 0; i < $scope.highestToday.length; i++) {
                                    if ($scope.highestToday[i].companyId == data.companyId) {
                                        $scope.highestToday[i].sentimentDirection = data.direction;
                                    }
                                }
                            });
                    }
                }

                $scope.highestCompaniesLastUpdated = new Date();
            }).
            error(function (data, status, headers, config) {
                $scope.highestCompaniesLoading = false;
            });
    }

    $scope.updateLowestCompanies = function () {
        $http.get(ConfigService.getApiBase() + "/sentiment/lowest/period/Day/limit/10").
            success(function (data, status, headers, config) {
                if(angular.toJson(lowestTodayLast) != angular.toJson(data.content)) {
                    lowestTodayLast = angular.copy(data.content);

                    $scope.lowestToday = data;
                    $scope.lowestCompaniesLoading = false;

                    for (i = 0; i < $scope.lowestToday.length; i++) {
                        $http.get(ConfigService.getApiBase() + "/sentiment/direction/company/" + $scope.lowestToday[i].companyId).
                            success(function (data, status, headers, config) {
                                for (i = 0; i < $scope.lowestToday.length; i++) {
                                    if ($scope.lowestToday[i].companyId == data.companyId) {
                                        $scope.lowestToday[i].sentimentDirection = data.direction;
                                    }
                                }
                            });
                    }
                }

                $scope.lowestCompaniesLastUpdated = new Date();
            }).
            error(function(data, status, headers, config) {
                $scope.lowestCompaniesLoading = false;
            });
    }

    updateData();

    function updateData() {
        $scope.updateTimeline();
        $scope.updateHighestCompanies();
        $scope.updateLowestCompanies()
    }

    if (AuthService.watchedCompanies()) {

        $http.post(ConfigService.getApiBase() + "/company/ids", AuthService.watchedCompanies()).
            success(function (data, status, headers, config) {
                $scope.watchedCompanies = data;
                $scope.watchedCompaniesLoading = false;

                for (i = 0; i < $scope.watchedCompanies.length; i++) {
                    $http.get(ConfigService.getApiBase() + "/sentiment/company/" + $scope.watchedCompanies[i].id).
                        success(function (data, status, headers, config) {
                            for (i = 0; i < $scope.watchedCompanies.length; i++) {
                                if($scope.watchedCompanies[i].id == data.companyId) {
                                    $scope.watchedCompanies[i].sentiment = data.sentiment;
                                }
                            }
                        });

                    $http.get(ConfigService.getApiBase() + "/quote/company/" + $scope.watchedCompanies[i].id + "/today").
                        success(function (data, status, headers, config) {
                            for (i = 0; i < $scope.watchedCompanies.length; i++) {
                                if($scope.watchedCompanies[i].id == data.companyId) {
                                    $scope.watchedCompanies[i].quote = data.quote;
                                }
                            }
                        });

                    $http.get(ConfigService.getApiBase() + "/sentiment/direction/company/" + $scope.watchedCompanies[i].id).
                        success(function (data, status, headers, config) {
                            for (i = 0; i < $scope.watchedCompanies.length; i++) {
                                if($scope.watchedCompanies[i].id == data.companyId) {
                                    $scope.watchedCompanies[i].sentimentDirection = data.direction;
                                }
                            }
                        });

                    $http.get(ConfigService.getApiBase() + "/quote/direction/company/" + $scope.watchedCompanies[i].id).
                        success(function (data, status, headers, config) {
                            for (i = 0; i < $scope.watchedCompanies.length; i++) {
                                if($scope.watchedCompanies[i].id == data.companyId) {
                                    $scope.watchedCompanies[i].quoteDirection = data.direction;
                                }
                            }
                        });
                }

            }).
            error(function (data, status, headers, config) {
                $scope.watchedCompaniesLoading = false;
            });
    } else {
        $scope.watchedCompaniesLoading = false;
    }

});

app.controller("ExchangesController", function($scope, $http, AuthService, ConfigService) {
    $scope.page.hideNav = false;

    $scope.exchanges = {};
    $scope.exchangesLoading = true;

    if (AuthService.isAuthorized("ROLE_ADMIN")) {
        $http.get(ConfigService.getApiBase() + "/exchange/all").
            success(function (data, status, headers, config) {
                $scope.exchanges = data;
                $scope.exchangesLoading = false;
            });
    }
    else {$http.get(ConfigService.getApiBase() + "/exchange").
        success(function (data, status, headers, config) {
            $scope.exchanges = data;
            $scope.exchangesLoading = false;
        });
    }
});

app.controller("ExchangeController", function($scope, $http, $routeParams, ngTableParams, AuthService, ConfigService) {
    $scope.page.hideNav = false;

    $scope.exchange = {};

    $http.get(ConfigService.getApiBase() + "/exchange/" + $routeParams.id).
        success(function (data, status, headers, config) {
            $scope.exchange = data;
        });


    $scope.enable = function()
    {
        $http.get(ConfigService.getApiBase() + "/exchange/" + $routeParams.id + "/enable").
            success(function(data, status, headers, config) {
                $scope.exchange = data;
            });
    }

    $scope.disable = function()
    {
        $http.get(ConfigService.getApiBase() + "/exchange/" + $routeParams.id + "/disable").
            success(function(data, status, headers, config) {
                $scope.exchange = data;
            });
    }

    $scope.followCompany = function(company)
    {
        $http.get(ConfigService.getApiBase() + "/company/" + company + "/follow")
            .success(function(data, status, headers, config) {
                AuthService.watchedCompanies().push(data.id);
                $scope.tableParams.reload();
            }).
            error(function(data, status, headers, config) {
                    $scope.tableParams.reload();
            });
    }

    $scope.unfollowCompany = function(company)
    {
        $http.get(ConfigService.getApiBase() + "/company/" + company + "/unfollow")
            .success(function(data, status, headers, config) {
                if(AuthService.watchedCompanies().indexOf(data.id) != -1) {
                    AuthService.watchedCompanies().splice(AuthService.watchedCompanies().indexOf(data.id), 1)
                }
                $scope.tableParams.reload();
            }).
            error(function(data, status, headers, config) {
                $scope.tableParams.reload();
            });
    }

    $scope.tableParams = new ngTableParams(
        {
            page: 1,            // show first page
            count: 25          // count per page
        },
        {
            total: 0,           // length of data
            getData: function($defer, params) {
                // ajax request to api
                var url = ConfigService.getApiBase() + "/company/exchange/" + $routeParams.id;

                if(params.$params.filter.name != undefined && params.$params.filter.name.length > 0)
                    url +=  "/search/" + params.$params.filter.name;

                url += "/offset/" + ((params.$params.page -1)*params.$params.count) + "/length/" + params.$params.count;

                $http.get(url).
                    success(function(data, status, headers, config) {
                        // update table params
                        params.total(data.totalRecords);

                        for (i = 0; i < data.data.length; i++) {
                            if(AuthService.watchedCompanies().indexOf(data.data[i].id) != -1)
                                data.data[i].watched = true;
                        }

                        // set new data
                        $defer.resolve(data.data);
                    });
            }
        }
    );

});

app.controller("CompanyController", function($scope, $http, $routeParams, AuthService, ConfigService) {
    $scope.page.hideNav = false;

    $scope.company = {};
    $scope.exchange = {};
    $scope.stories = {};
    $scope.predictions = {};
    $scope.relatedCompanies = {};
    $scope.latestQuote = {};

    stockChartValues = null;
    sentimentChartValues = null;

    $scope.companyLoading = true;
    $scope.companyPerformanceLoading = true;
    $scope.storiesLoading = true;
    $scope.predictionsLoading = true;
    $scope.predictionCorrectnessLoading = true;
    $scope.relatedCompaniesLoading = true;

    $scope.follow = function()
    {
        $http.get(ConfigService.getApiBase() + "/company/" + $scope.company.id + "/follow")
            .success(function(data, status, headers, config) {
                AuthService.watchedCompanies().push($scope.company.id);
                $scope.company = data;
                $scope.company.watched = true;
            }
        );
    }

    $scope.unfollow = function()
    {
        $http.get(ConfigService.getApiBase() + "/company/" + $scope.company.id + "/unfollow").
            success(function(data, status, headers, config) {
                if(AuthService.watchedCompanies().indexOf($scope.company.id) != -1) {
                    AuthService.watchedCompanies().splice(AuthService.watchedCompanies().indexOf($scope.company.id), 1)
                }
                $scope.company = data;
                $scope.company.watched = false;
            }
        );
    }

    $scope.reloadInformation = function()
    {
        $http.get(ConfigService.getApiBase() + "/company/" + $scope.company.id + "/reloadInformation");
    }

    $http.get(ConfigService.getApiBase() + "/company/" + $routeParams.id).
        success(function(data, status, headers, config) {
            if(AuthService.watchedCompanies().indexOf(data.id) != -1)
                data.watched = true;

            $scope.company = data;
            $scope.companyLoading = false;

            $http.get(ConfigService.getApiBase() + "/exchange/" + $scope.company.exchange).
                success(function(data, status, headers, config) {
                    $scope.exchange = data;
                });
        });


    $http.get(ConfigService.getApiBase() + "/company/" + $routeParams.id + "/relatedCompanies/10").
        success(function(data, status, headers, config) {

            $scope.relatedCompanies = data;
            $scope.relatedCompaniesLoading = false;

            for (i = 0; i < $scope.relatedCompanies.length; i++) {
                $http.get(ConfigService.getApiBase() + "/company/" + $scope.relatedCompanies[i].company + "/name").
                    success(function (data, status, headers, config) {
                        for (i = 0; i < $scope.relatedCompanies.length; i++) {
                            if($scope.relatedCompanies[i].company == data.id) {
                                $scope.relatedCompanies[i].companyName = data.name;
                            }
                        }
                    });
            }

        });

    $http.get(ConfigService.getApiBase() + "/prediction/company/" + $routeParams.id).
        success(function(data, status, headers, config) {
            $scope.predictions = data;
            $scope.predictionsLoading = false;

        });

    $http.get(ConfigService.getApiBase() + "/sentiment/company/" + $routeParams.id + "/period/Day").
        success(function(data, status, headers, config) {

            sentimentChartValues = {
                id: 1,
                data: [],
                type: "column",
                yAxis: 1,
                name: 'Sentiment'
            }

            for(var i = 0; i < data.length; i++)
            {
                var sentiment = data[i];
                sentimentChartValues.data[i] = [sentiment.date, sentiment.sentiment];
            }

            mapSentimentData();

        });

    $http.get(ConfigService.getApiBase() + "/quote/company/" + $routeParams.id).
        success(function(data, status, headers, config) {

            $scope.latestQuote = data[data.length -1];

            stockChartValues = {
                id: 2,
                data: [],
                name: 'Quote'
            }

            for(var i = 0; i < data.length; i++)
            {
                var quote = data[i];

                stockChartValues.data[i] = [quote.date, quote.open, quote.high, quote.low, quote.close];
            }

            mapSentimentData();

        });

    $http.post(ConfigService.getApiBase() + "/story/ids/", [$routeParams.id]).
        success(function(data, status, headers, config) {
            $scope.stories = data;
            $scope.storiesLoading = false;

            if($scope.stories) {
                for (i = 0; i < $scope.stories.length; i++) {

                    $http.get(ConfigService.getApiBase() + "/sentiment/company/" + $routeParams.id + "/story/" + $scope.stories[i].id).success(function (data, status, headers, config) {
                        for (i = 0; i < $scope.stories.length; i++) {
                            if ($scope.stories[i].id == data.story) {
                                $scope.stories[i].sentiment = data.sentiment;
                            }
                        }
                    });
                }
            }

        });


    $scope.chartConfig = {
        options: {
            chart: {
                zoomType: 'x',
                type: 'candlestick'
            },
            plotOptions: {
                candlestick: {
                    color: 'red',
                    lineColor: 'red',
                    upColor: 'green',
                    upLineColor: 'green'
                },
                column: {
                    color: '#434348'
                }
            },
            tooltip: {
                borderColor: '#000000'
            },
            rangeSelector: {
                enabled: false
            },
            navigator: {
                enabled: false
            },
            scrollbar: {
                enabled: false
            },
            yAxis: [{
                title: {
                    text: "Quote",
                },
                labels: {
                    format: "{value}"
                },
                height: '50%'
            },{
                title: {
                    text: "Sentiment",
                },
                labels: {
                    format: "{value}"
                },
                top: '55%',
                height: '45%',
                offset: 0
            }]
        },
        series: [],
        useHighStocks: true
    }


    mapSentimentData = function() {
        if(!stockChartValues || ! sentimentChartValues)
            return;

        $scope.chartConfig.series.push(stockChartValues);

        $scope.chartConfig.series.push(sentimentChartValues);

        $scope.companyPerformanceLoading = false;

    }

    $scope.predictionsChartConfig = {
        options: {
            chart: {
                type: 'line'
            }
        },
        title: {
            text: 'Prediction Correctness'
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            currentMin: 0,
            currentMax: 100,
            title: {text: '%'}
        },
        series: []
    }

    $http.get(ConfigService.getApiBase() + "/prediction/correctness/company/" + $routeParams.id).
        success(function (data, status, headers, config) {
            var values = {
                data: [],
                name: 'Correctness'
            }

            for(var i = 0; i < data.length; i++)
            {
                values.data[i] = [data[i].date, data[i].correctness];
            }

            $scope.predictionsChartConfig.series.push(values);
            $scope.predictionCorrectnessLoading = false;
        });

});

app.controller("UsersController", function($scope, $http, ConfigService) {
    $scope.page.hideNav = false;

    $scope.users = {};
    $scope.usersLoading = true;

    $http.get(ConfigService.getApiBase() + "/user/list").
        success(function(data, status, headers, config) {
            $scope.users = data;
            $scope.usersLoading = false;
        });

});

app.controller("UserController", function($scope, $http, $location, $routeParams, ConfigService) {
    $scope.page.hideNav = false;

    $scope.errorMsg;
    $scope.user = {};
    $scope.watchedCompanies = {};

    $scope.userLoading = true;
    $scope.watchedCompaniesLoading = true;

    $http.get(ConfigService.getApiBase() + "/user/" + $routeParams.id).
        success(function(data, status, headers, config) {
            $scope.user = data;
            $scope.userLoading = false;

            $http.post(ConfigService.getApiBase() + "/company/ids", $scope.user.watchedCompanies).
            success(function(data, status, headers, config) {
                $scope.watchedCompanies = data;
                $scope.watchedCompaniesLoading = false;
            }).
            error(function(data, status, headers, config) {
                $scope.watchedCompaniesLoading = false;
            });

        });

    $scope.enable = function()
    {
        $http.get(ConfigService.getApiBase() + "/user/" + $scope.user.id + "/enable").
            success(function(data, status, headers, config) {
                $scope.user = data;
            }).
            error(function(data, status, headers, config) {
                $scope.errorMsg = "Update failed";
            });
    }

    $scope.disable = function()
    {
        $http.get(ConfigService.getApiBase() + "/user/" + $scope.user.id + "/disable").
            success(function(data, status, headers, config) {
                $scope.user = data;
            }).
            error(function(data, status, headers, config) {
                $scope.errorMsg = "Update failed";
            });
    }

    $scope.delete = function()
    {
        $http.get(ConfigService.getApiBase() + "/user/" + $scope.user.id + "/delete").
            success(function(status, headers, config) {
                $location.path("/users");
            }).
            error(function(status, headers, config) {
                $scope.errorMsg = "Delete failed";
            });
    }

});

app.controller("AccountController", function($scope, $http, ConfigService, AuthService) {
    $scope.page.hideNav = false;

    $scope.message;
    $scope.user = {};

    $scope.userLoading = true;
    $scope.watchedCompaniesLoading = true;

    $scope.changingPassword = false;

    $http.get(ConfigService.getApiBase() + "/user/").
        success(function (data, status, headers, config) {
            $scope.user = data;
            $scope.userLoading = false;
        });

    $scope.reloadWatched = function ()
    {
        if (AuthService.watchedCompanies()) {

            $http.post(ConfigService.getApiBase() + "/company/ids", AuthService.watchedCompanies()).
                success(function (data, status, headers, config) {
                    $scope.watchedCompanies = data;
                    $scope.watchedCompaniesLoading = false;

                }).
                error(function (data, status, headers, config) {
                    $scope.watchedCompaniesLoading = false;
                });
        } else {
            $scope.watchedCompaniesLoading = false;
        }
    };

    $scope.reloadWatched();

    $scope.unfollowCompany = function(company)
    {
        $scope.watchedCompaniesLoading = true;

        $http.get(ConfigService.getApiBase() + "/company/" + company + "/unfollow")
            .success(function(data, status, headers, config) {
                if(AuthService.watchedCompanies().indexOf(data.id) != -1) {
                    AuthService.watchedCompanies().splice(AuthService.watchedCompanies().indexOf(data.id), 1)
                }
                $scope.reloadWatched();
            }).
            error(function(data, status, headers, config) {
                $scope.reloadWatched();
            });
    };

    $scope.changePassword = function()
    {
        $scope.changingPassword = true;

        if(!$scope.userForm) {

            $scope.changingPassword = false;
            $scope.message = "Please complete all fields";
            return;
        }

        if(!$scope.userForm.currentPassword)
        {
            $scope.changingPassword = false;
            $scope.message = "Please supply existing password";
            return;
        }

        if($scope.userForm.newPassword != $scope.userForm.newPasswordConfirm)
        {
            $scope.changingPassword = false;
            $scope.message = "Passwords do not match";
            return;
        }

        $http.post(ConfigService.getApiBase() + "/user/updatePassword", $scope.userForm)
            .success(function(data, status, headers, config) {
                $scope.changingPassword = false;
                $scope.message = "Password Updated.";
            })
            .error(function(data, status, headers, config) {
                $scope.changingPassword = false;
                $scope.message = data.message;
            });
    };
});

app.controller("SourcesController", function($scope, $http, ConfigService) {
    $scope.page.hideNav = false;

    $scope.sources = {};
    $scope.sourcesLoading = true;

    $scope.sourceToAdd = {};

    $scope.loadSources = function() {
        $http.get(ConfigService.getApiBase() + "/source").success(function (data, status, headers, config) {
            $scope.sources = data;
            $scope.sourcesLoading = false;
        });
    }

    $scope.loadSources();

    $scope.addSource = function() {

        $scope.exclusionsLoading = true;

        $scope.sourceToAdd.type = "Crawler";
        $scope.sourceToAdd.disabled = true;

        $http.post(ConfigService.getApiBase() + "/source/add", $scope.sourceToAdd)
            .success(function(data, status, headers, config) {
                $scope.sourceToAdd = {};
                $scope.loadSources();
            });
    };

});

app.controller("SourceController", function($scope, $http, $interval, $routeParams, ConfigService) {
    $scope.page.hideNav = false;

    $scope.source = {};
    $scope.stories = {};
    $scope.storiesLastUpdated = null;

    $http.get(ConfigService.getApiBase() + "/source/" + $routeParams.id).success(function (data, status, headers, config) {
        $scope.source = data;
    });

    var storyUpdates = $interval(updateStories, 5000);

    $scope.$on('$destroy', function() {
        if (angular.isDefined(storyUpdates)) {
            $interval.cancel(storyUpdates);
            storyUpdates = undefined;
        }
    });

    $scope.getLatestStories = function () {
        $http.get(ConfigService.getApiBase() + "/story/source/" + $routeParams.id).success(function (data, status, headers, config) {
            $scope.stories = data;
            $scope.storiesLastUpdated = new Date();
        });
    }

    updateStories();

    function updateStories() {
        $scope.getLatestStories();
    }

    $scope.enable = function() {

        $http.get(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/enable")
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.disable = function() {

        $http.get(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/disable")
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.addUrl = function(urlToAdd) {

        $http.post(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/url/add", urlToAdd)
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.addExclusion = function(exclusionToAdd) {

        $http.post(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/exclusion/add", exclusionToAdd)
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.removeUrl = function(urlToRemove) {

        $http.post(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/url/remove", urlToRemove)
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.removeExclusion = function(exclusionToRemove) {

        $http.post(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/exclusion/remove", exclusionToRemove)
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.enableUrl = function(urlToEnable)
    {
        $http.post(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/url/enable", urlToEnable)
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

    $scope.disableUrl = function(urlToDisable)
    {
        $http.post(ConfigService.getApiBase() + "/source/" + $scope.source.id + "/url/disable", urlToDisable)
            .success(function(data, status, headers, config) {
                $scope.source = data;
            });
    };

});

app.controller("ExclusionsController", function($scope, $http, ConfigService) {
    $scope.page.hideNav = false;

    $scope.exclusions = {};
    $scope.commonNames = {};
    $scope.newExclusion = {};

    $scope.exclusionsLoading = true;
    $scope.commonNamesLoading = true;

    $scope.loadExclusions = function(exclusionToRemove) {
        $http.get(ConfigService.getApiBase() + "/exclusions").success(function (data, status, headers, config) {
            $scope.exclusions = data;
            $scope.exclusionsLoading = false;
        });
    };

    $scope.loadExclusions();

    $http.get(ConfigService.getApiBase() + "/exclusions/commonNames/25").
        success(function (data, status, headers, config) {
            $scope.commonNames = data;
            $scope.commonNamesLoading = false;
        });

    $scope.removeExclusion = function(exclusionToRemove)
    {
        $scope.exclusionsLoading = true;

        $http.get(ConfigService.getApiBase() + "/exclusions/" + exclusionToRemove.id + "/remove")
            .success(function(data, status, headers, config) {
                $scope.loadExclusions();
            });
    };

    $scope.addExclusion = function() {

        $scope.exclusionsLoading = true;

        $http.post(ConfigService.getApiBase() + "/exclusions/add", $scope.newExclusion)
            .success(function(data, status, headers, config) {
                $scope.newExclusion = {};
                $scope.loadExclusions();
            });
    };

    $scope.addCommonNameAsExclusion = function(commonNameToExclude) {
        $scope.newExclusion = {
            name: commonNameToExclude
        };

        $scope.addExclusion();
    }

});

app.controller("DateFormatsController", function($scope, $http, ConfigService) {
    $scope.page.hideNav = false;

    $scope.dateFormats = {};
    $scope.newDateFormat = {};

    $scope.missingDateFormats = {};

    $scope.newDateFormat = {};

    $scope.dateFormatsLoading = true;
    $scope.missingDateFormatsLoading = true;

    $scope.loadDateFormats = function() {
        $scope.dateFormatsLoading = true;
        $http.get(ConfigService.getApiBase() + "/dateFormats").
            success(function (data, status, headers, config) {
                $scope.dateFormats = data;
                $scope.dateFormatsLoading = false;
            });
    };

    $scope.loadDateFormats();

    $http.get(ConfigService.getApiBase() + "/dateFormats/missing").
        success(function (data, status, headers, config) {
            $scope.missingDateFormats = data;
            $scope.missingDateFormatsLoading = false;
        });

    $scope.removeDateFormat = function(dateFormatToRemove)
    {
        $scope.dateFormatsLoading = true;

        $http.get(ConfigService.getApiBase() + "/dateFormats/" + dateFormatToRemove + "/remove")
            .success(function(data, status, headers, config) {
                $scope.loadDateFormats();
            });
    };

    $scope.addDateFormat = function() {

        $scope.dateFormatsLoading = true;

        $http.post(ConfigService.getApiBase() + "/dateFormats/add", $scope.newDateFormat)
            .success(function(data, status, headers, config) {
                $scope.loadDateFormats();
            });

        $scope.newDateFormat = {};
    };

});

app.controller("SystemController", function($scope, $http, $interval, $filter, ConfigService) {
    $scope.page.hideNav = false;

    $scope.storyCountLoading = true;
    $scope.storyProcessingTimesLoading = true;
    $scope.storyStageProcessingTimesLoading = true;

    $scope.storyQueueLastUpdated = null;
    $scope.companyQueueLastUpdated = null;
    $scope.storyStatsLastUpdated = null;
    $scope.storyStageStatsLastUpdated = null;
    $scope.storyCountLastUpdated = null;

    $scope.storyFlowChartConfig = {
        options: {
            chart: {
                type: 'areaspline'
            }
        },
        xAxis: {
            categories: ['Crawler', 'Collect', 'Analyse', 'Match', 'Sentiment']
        },
        yAxis: [{
            title: {
                text: "Queue Size",
            },
        },
        {
            title: {
                text: "Consumer Count",
            },
            opposite: true
        }],
        title: {
            text: ''
        },
        series: [{
            data: [0,0,0,0,0],
            name: 'Queue Size'
            },
            {
            data: [0,0,0,0,0],
            yAxis: 1,
            type: 'scatter',
            name: 'Consumer Count'
            }
        ]
    };
    $scope.companyFlowChartConfig = {
        options: {
            chart: {
                type: 'areaspline'
            },
            plotOptions: {
                series: {
                    stacking: ''
                }
            }
        },
        xAxis: {
            categories: ['Identify', 'Collect', 'Analyse']
        },
        yAxis: [{
            title: {
                text: "Queue Size",
            },
        },
        {
            title: {
                text: "Consumer Count",
            },
            opposite: true
            }],
        title: {
            text: 'Company Flow Queues'
        },
        series: [{
            data: [0,0,0],
            name: 'Queue Sizes'
            },
            {
            data: [0,0,0],
            yAxis: 1,
            type: 'scatter',
            name: 'Consumer Count'
            }
        ]
    };

    $scope.chartConfig = {
        options: {
            chart: {
                type: 'line'
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            title: {text: ''}
        },
        series: [{
            data: [],
            showInLegend: false
        }]
    };

    $scope.processingTimesChartConfig = {
        options: {
            chart: {
                type: 'scatter'
            },
            tooltip: {
                formatter: function() {
                    return 'Date: <b>' + $filter('date')(this.x, "short") + '</b> <br /> ' +
                        'Time: <b>' + $filter('date')(new Date(this.y), "H:mm:ss") + '</b>';
                }
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            type: "datetime",
            // max:86400000,
            dateTimeLabelFormats: {
                millisecond: '%L',
                second: '%S.%L',
                hour: '%H:%M',
                day: '%H:%M'
            },
            title: {
                enabled: false
            }
        },
        series: [{
            data: [],
            showInLegend: false
        }]
    };

    $scope.collectProcessingTimesChartConfig = {
        options: {
            chart: {
                type: 'scatter'
            },
            tooltip: {
                formatter: function() {
                    return 'Date: <b>' + $filter('date')(this.x, "short") + '</b> <br /> ' +
                        'Time: <b>' + $filter('date')(new Date(this.y), "mm:ss.sss") + '</b>';
                }
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            type: "datetime",
            // max:86400000,
            dateTimeLabelFormats: {
                millisecond: '%L',
                second: '%S.%L',
                minute: '%M:%S.%L',
            },
            title: {
                enabled: false
            }
        },
        series: [{
            data: [],
            showInLegend: false
        }]
    };

    $scope.analyseProcessingTimesChartConfig = {
        options: {
            chart: {
                type: 'scatter'
            },
            tooltip: {
                formatter: function() {
                    return 'Date: <b>' + $filter('date')(this.x, "short") + '</b> <br /> ' +
                        'Time: <b>' + $filter('date')(new Date(this.y), "mm:ss.sss") + '</b>';
                }
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            type: "datetime",
            // max:86400000,
            dateTimeLabelFormats: {
                second: '%S.%L',
                millisecond: '%L'
            },
            title: {
                enabled: false
            }
        },
        series: [{
            data: [],
            showInLegend: false
        }]
    };

    $scope.sentimentProcessingTimesChartConfig = {
        options: {
            chart: {
                type: 'scatter'
            },
            tooltip: {
                formatter: function() {
                    return 'Date: <b>' + $filter('date')(this.x, "short") + '</b> <br /> ' +
                        'Time: <b>' + $filter('date')(new Date(this.y), "mm:ss.sss") + '</b>';
                }
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            type: "datetime",
            // max:86400000,
            dateTimeLabelFormats: {
                second: '%S.%L',
                millisecond: '%L'
            },
            title: {
                enabled: false
            }
        },
        series: [{
            data: [],
            showInLegend: false
        }]
    };

    $scope.matchProcessingTimesChartConfig = {
        options: {
            chart: {
                type: 'scatter'
            },
            tooltip: {
                formatter: function() {
                    return 'Date: <b>' + $filter('date')(this.x, "short") + '</b> <br /> ' +
                        'Time: <b>' + $filter('date')(new Date(this.y), "mm:ss.sss") + '</b>';
                }
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            type: "datetime",
            // max:86400000,
            dateTimeLabelFormats: {
                second: '%S.%L',
                millisecond: '%L'
            },
            title: {
                enabled: false
            }
        },
        series: [{
            data: [],
            showInLegend: false
        }]
    };

    $scope.getStoryProcessingStats = function () {
        $http.get(ConfigService.getApiBase() + "/story/processingTimes/pastDays/1")
            .success(function (data, status, headers, config) {
                var values = {
                    data: [],
                    name: 'Story Processing Times'
                }

                for (var i = 0; i < data.length; i++) {
                    $scope.processingTimesChartConfig.series[0].data[i] = [data[i].date, (data[i].processingTime)];
                }

                $scope.storyProcessingTimesLoading = false
                $scope.storyStatsLastUpdated = new Date();
            })
            .error(function (data, status, headers, config) {
                $scope.storyProcessingTimesLoading = false;
            });
    }
    
    $scope.getStoryStageProcessingStats = function () {
        $http.get(ConfigService.getApiBase() + "/system/storyMetrics/pastDays/1")
            .success(function (data, status, headers, config) {
                var values = {
                    data: [],
                    name: 'Story Processing Times'
                }

                if(data['Collect']) {
                    for (var i = 0; i < data['Collect'].length; i++) {
                        if (data['Collect'][i].date) {
                            $scope.collectProcessingTimesChartConfig.series[0].data[i] = [data['Collect'][i].date, (data['Collect'][i].processingTime)];
                        }
                    }
                }

                if(data['Analyse']) {
                    for (var i = 0; i < data['Analyse'].length; i++) {
                        if (data['Analyse'][i].date) {
                            $scope.analyseProcessingTimesChartConfig.series[0].data[i] = [data['Analyse'][i].date, (data['Analyse'][i].processingTime)];
                        }
                    }
                }

                if(data['Sentiment']) {
                    for (var i = 0; i < data['Sentiment'].length; i++) {
                        if (data['Sentiment'][i].date) {
                            $scope.sentimentProcessingTimesChartConfig.series[0].data[i] = [data['Sentiment'][i].date, (data['Sentiment'][i].processingTime)];
                        }
                    }
                }

                if(data['Match']) {
                    for (var i = 0; i < data['Match'].length; i++) {
                        if (data['Match'][i].date) {
                            $scope.matchProcessingTimesChartConfig.series[0].data[i] = [data['Match'][i].date, (data['Match'][i].processingTime)];
                        }
                    }
                }

                $scope.storyStageProcessingTimesLoading = false
                $scope.storyStageStatsLastUpdated = new Date();
            })
            .error(function (data, status, headers, config) {
                $scope.storyStageProcessingTimesLoading = false;
            });
    }

    $scope.getStoryCount = function () {
        $http.get(ConfigService.getApiBase() + "/story/countByDay")
            .success(function (data, status, headers, config) {

                for (var i = 0; i < data.length; i++) {
                    $scope.chartConfig.series[0].data[i] = [data[i].date, data[i].stories];
                }

                $scope.storyCountLoading = false
                $scope.storyCountLastUpdated = new Date();
            })
            .error(function (data, status, headers, config) {
                $scope.storyCountLoading = false;
            });
    }

    var queueUpdates = $interval(updateQueueData, 5000);

    $scope.$on('$destroy', function() {
        if (angular.isDefined(queueUpdates)) {
            $interval.cancel(queueUpdates);
            queueUpdates = undefined;
        }
    });

    var storyStatsUpdates = $interval(updateStoryData, 30000);

    $scope.$on('$destroy', function() {
        if (angular.isDefined(storyStatsUpdates)) {
            $interval.cancel(storyStatsUpdates);
            storyStatsUpdates = undefined;
        }
    });

    $scope.getStoryQueueStats = function () {
        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/Crawler")
            .success(function (data, status, headers, config) {
                $scope.storyFlowChartConfig.series[0].data[0] = data["QueueSize"]
                $scope.storyFlowChartConfig.series[1].data[0] = data["ConsumerCount"]
                $scope.storyQueueLastUpdated = new Date();
            });

        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/Stories")
            .success(function (data, status, headers, config) {
                $scope.storyFlowChartConfig.series[0].data[1] = data["QueueSize"]
                $scope.storyFlowChartConfig.series[1].data[1] = data["ConsumerCount"]
                $scope.storyQueueLastUpdated = new Date();
            });

        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/StoriesWithContent")
            .success(function (data, status, headers, config) {
                $scope.storyFlowChartConfig.series[0].data[2] = data["QueueSize"]
                $scope.storyFlowChartConfig.series[1].data[2] = data["ConsumerCount"]
                $scope.storyQueueLastUpdated = new Date();
            });

        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/IndexedStory")
            .success(function (data, status, headers, config) {
                $scope.storyFlowChartConfig.series[0].data[3] = data["QueueSize"]
                $scope.storyFlowChartConfig.series[1].data[3] = data["ConsumerCount"]
                $scope.storyQueueLastUpdated = new Date();
            });

        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/MatchFound")
            .success(function (data, status, headers, config) {
                $scope.storyFlowChartConfig.series[0].data[4] = data["QueueSize"]
                $scope.storyFlowChartConfig.series[1].data[4] = data["ConsumerCount"]
                $scope.storyQueueLastUpdated = new Date();
            });
    }

    $scope.getCompanyQueueStats = function () {
        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/FindCompanies")
            .success(function (data, status, headers, config) {
                $scope.companyFlowChartConfig.series[0].data[0] = data["QueueSize"]
                $scope.companyFlowChartConfig.series[1].data[0] = data["ConsumerCount"]
                $scope.companyQueueLastUpdated = new Date();
            });

        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/FoundCompany")
            .success(function (data, status, headers, config) {
                $scope.companyFlowChartConfig.series[0].data[1] = data["QueueSize"]
                $scope.companyFlowChartConfig.series[1].data[1] = data["ConsumerCount"]
                $scope.companyQueueLastUpdated = new Date();
            });

        $http.get(ConfigService.getApiBase() + "/system/queue/Queue/CompanyWithInformation")
            .success(function (data, status, headers, config) {
                $scope.companyFlowChartConfig.series[0].data[2] = data["QueueSize"]
                $scope.companyFlowChartConfig.series[1].data[2] = data["ConsumerCount"]
                $scope.companyQueueLastUpdated = new Date();
            });
    }

    updateQueueData();

    function updateQueueData() {
        $scope.getStoryQueueStats();
        // $scope.getCompanyQueueStats();
    }

    updateStoryData();

    function updateStoryData() {
        $scope.getStoryProcessingStats();
        $scope.getStoryStageProcessingStats();
        $scope.getStoryCount();
    }
});

app.controller("LearningModelController", function($scope, $http, ConfigService) {
    $scope.page.hideNav = false;

    $scope.learningModelSize = {};

    $scope.learningModelSizeLoading = true;

    $http.get(ConfigService.getApiBase() + "/learningModel/size").
        success(function (data, status, headers, config) {
            $scope.learningModelSize = data;
            $scope.learningModelSizeLoading = false;
        });
});

app.controller("PredictionsController", function($scope, $http, ConfigService) {
    $scope.page.hideNav = false;

    $scope.certaintyFilter = '0.0';
    $scope.limit = 25;

    $scope.predictions = {};

    $scope.chartConfig = {
        options: {
            chart: {
                type: 'line'
            }
        },
        title: {
            text: 'Prediction Correctness'
        },
        xAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        yAxis: {
            currentMin: 0,
            currentMax: 100,
            title: {text: '%'}
        },
        series: []
    }

    $scope.loadPredictions = function() {

        $scope.predictionsLoading = true;

        $http.get(ConfigService.getApiBase() + "/prediction/latest/" + $scope.limit + "/certainty/" + $scope.certaintyFilter + "/").success(function (data, status, headers, config) {
            $scope.predictions = data;
            $scope.predictionsLoading = false;

            var requestedCompanyNames = [];

            for (i = 0; i < $scope.predictions.length; i++) {

                if(requestedCompanyNames[$scope.predictions[i].company] == undefined) {

                    requestedCompanyNames[$scope.predictions[i].company] = true;

                    $http.get(ConfigService.getApiBase() + "/company/" + $scope.predictions[i].company + "/name")
                        .success(function (data, status, headers, config) {
                            for (i = 0; i < $scope.predictions.length; i++) {
                                if ($scope.predictions[i].company == data.id) {
                                    $scope.predictions[i].companyName = data.name;
                                }
                            }
                        });
                }
            }
        });

        $scope.predictionsCorrectnessLoading = true;

        $scope.chartConfig.series = [];

        $http.get(ConfigService.getApiBase() + "/prediction/correctness/certainty/" + $scope.certaintyFilter + "/").
            success(function (data, status, headers, config) {
                var values = {
                    data: [],
                    name: 'Correctness'
                }

                for(var i = 0; i < data.length; i++)
                {
                    values.data[i] = [data[i].date, data[i].correctness];
                }

                $scope.chartConfig.series.push(values);
                $scope.predictionsCorrectnessLoading = false
            });
    }

    $scope.loadPredictions();

});

app.controller("PredictionController", function($scope, $http, $routeParams, ConfigService) {
    $scope.page.hideNav = false;

    $scope.prediction = {};
    $scope.company = {};
    $scope.exchange = {};
    $scope.predictionLoading = true;
    $scope.companyLoading = true;
    $scope.exchangeLoading = true;

    $scope.chartConfig = {
        options: {
            chart: {
                zoomType: 'x',
                type: 'candlestick'
            },
            plotOptions: {
                candlestick: {
                    color: 'red',
                    lineColor: 'red',
                    upColor: 'green',
                    upLineColor: 'green'
                },
                column: {
                    color: '#434348'
                }
            },
            tooltip: {
                borderColor: '#000000'
            },
            rangeSelector: {
                enabled: false
            },
            navigator: {
                enabled: false
            },
            scrollbar: {
                enabled: false
            },
            yAxis: [{
                title: {
                    text: "Quote",
                },
                labels: {
                    format: "{value}"
                },
                height: '50%'
            },{
                title: {
                    text: "Sentiment",
                },
                labels: {
                    format: "{value}"
                },
                top: '55%',
                height: '45%',
                offset: 0
            }]
        },
        series: [
            {
                data: [],
                name: 'Quote',
                yAxis: 0,
            }, {
                data: [],
                type: "column",
                yAxis: 1,
                name: 'Sentiment'
            }, {
                type : 'flags',
                data : [],
                onSeries : 1,
                // shape : 'circlepin',
                // width : 16
            }
        ],
        useHighStocks: true
    }

    $http.get(ConfigService.getApiBase() + "/prediction/" + $routeParams.id)
        .success(function(data, status, headers, config) {

        $scope.prediction = data;
        $scope.predictionLoading = false;
            
        $http.get(ConfigService.getApiBase() + "/company/" + $scope.prediction.company)
            .success(function(data, status, headers, config) {

                $scope.company = data;
                $scope.companyLoading = false;

                $http.get(ConfigService.getApiBase() + "/exchange/" + $scope.company.exchange)
                    .success(function(data, status, headers, config) {
                        $scope.exchange = data;

                        if($scope.exchange.intraday) {
                            $http.post(ConfigService.getApiBase() + "/quote/company/" + $scope.prediction.company + "/intraday", {
                                from: $scope.prediction.predictionDate - 3600 * 1000,
                                to: $scope.prediction.predictionDate + $scope.prediction.validityPeriod + 3600 * 1000
                            }).
                                success(function (data, status, headers, config) {

                                    for (var i = 0; i < data.length; i++) {
                                        var quote = data[i];

                                        $scope.chartConfig.series[0].data[i] = [quote.date, quote.open, quote.high, quote.low, quote.close];
                                    }

                                // Add prediction start and end markers
                                $scope.chartConfig.series[2].data[0] = {
                                    x : $scope.prediction.predictionDate,
                                    title : 'Prediction Generated',
                                    text : 'Prediction Generated'
                                };

                                $scope.chartConfig.series[2].data[1] = {
                                    x: $scope.prediction.predictionDate + $scope.prediction.validityPeriod,
                                    title : 'Prediction End',
                                    text : 'Prediction End'
                                };

                                });
                        }
                    });                
            });

            $http.get(ConfigService.getApiBase() + "/sentiment/company/" + $scope.prediction.company + "/period/Hour").
            success(function(data, status, headers, config) {

                for(var i = 0; i < data.length; i++)
                {
                    var sentiment = data[i];
                    $scope.chartConfig.series[1].data[i] = [sentiment.date, sentiment.sentiment];
                }

            });
            


        });
});

app.controller("StoryController", function($scope, $http, $routeParams, $sce, ConfigService) {
    $scope.page.hideNav = false;

    $scope.story = {};
    $scope.storyLoading = true;

    $scope.matchedCompanies = [];

    $scope.chartConfig = {
        options: {
            chart: {
                type: 'columnrange',
                inverted: true
            }
        },
        title: {
            text: 'Story Processing Metrics'
        },
        yAxis: {
            type:"datetime",
            dateTimeLabelFormats:{
                month: '%e %b %Y'
            }
        },
        // xAxis: {
        //     currentMin: 0,
        //     currentMax: 100,
        //     title: {text: '%'}
        // },
        series: []
    }


    $http.get(ConfigService.getApiBase() + "/story/" + $routeParams.id).
        success(function (data, status, headers, config) {
            $scope.story = data;
            $scope.storyLoading = false;

            if($scope.story.metrics) {
                $scope.story.metrics.sort(function (a, b) {
                    return a.metricOrder > b.metricOrder
                });

                for(var i = 0; i < $scope.story.metrics.length; i++)
                {
                    $scope.chartConfig.series.push([$scope.story.metrics[i].start, $scope.story.metrics[i].end]);
                }
            }

        if($scope.story.entities) {
            $scope.story.entities.organisations.sort(function (a, b) {
                return a.count < b.count
            });

            //for (i = 0; i < $scope.story.entities.organisations.length; i++) {
            //    $scope.story.body = $scope.story.body.replace($scope.story.entities.organisations[i].name, '<span class="text-info">' + $scope.story.entities.organisations[i].name + '</span>');
            //}

            for (i = 0; i < $scope.story.entities.organisations.length; i++) {
                for (c = 0; c < $scope.story.entities.organisations[i].sentiments.length; c++) {
                    var sentiment = $scope.story.entities.organisations[i].sentiments[c].sentiment;
                    var textColour = 'primary';
                    if (sentiment > 0) {
                        textColour = 'success';
                    }
                    if (sentiment < 0) {
                        textColour = 'danger';
                    }
                    $scope.story.body = $scope.story.body.replace($scope.story.entities.organisations[i].sentiments[c].sentence, '<span class="text-' + textColour + '">' + $scope.story.entities.organisations[i].sentiments[c].sentence + '</span>');
                }
            }

        }

            $scope.story.body = $sce.trustAsHtml($scope.story.body);

        if($scope.story.matchedCompanies) {
            for (i = 0; i < $scope.story.matchedCompanies.length; i++) {
                $http.get(ConfigService.getApiBase() + "/company/" + $scope.story.matchedCompanies[i] + "/name").success(function (companyData, status, headers, config) {
                    $scope.matchedCompanies.push(companyData);

                    $http.get(ConfigService.getApiBase() + "/sentiment/company/" + companyData.id + "/story/" + $scope.story.id).success(function (StoryData, status, headers, config) {
                        for (c = 0; c < $scope.matchedCompanies.length; c++) {
                            if ($scope.matchedCompanies[c].id == StoryData.company) {
                                $scope.matchedCompanies[c].sentiment = StoryData.sentiment;
                            }
                        }
                    });
                });
            }
        }


        });

});
