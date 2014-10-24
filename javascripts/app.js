define(function (require) {
	
	var app = angular.module('easyCodeApp', ['ngRoute', 'ui.bootstrap', 'ui.codemirror', 'vtortola.ng-terminal', 'flow']);
	

	// controller for header actions
	app.controller('headerController', function($scope){
		// add header properties for phone support
		$scope.header = {
			isCollapsed : true
		};
	});


	/**
	 * lazy loading configuration
	 */
    var config = require('routes');
	var dependencyResolverFor = require('appDir/services/dependencyResolverFor');

	/**
	 * lazy routing configuration
	 */
    app.config(
    [
        '$routeProvider',
        '$locationProvider',
        '$controllerProvider',
        '$compileProvider',
        '$filterProvider',
        '$provide',
        function($routeProvider, $locationProvider, $controllerProvider, $compileProvider, $filterProvider, $provide, terminalConfigurationProvider)
        {
			// allow blob link
			$compileProvider.aHrefSanitizationWhitelist(/^\s*(blob):/);
		
        	app.controller = function(name, constructor) {
        		$controllerProvider.register(name, constructor);
        		return this;
        	}
	        app.directive  = function(name, constructor) {
	        	$compileProvider.directive(name, constructor);
	        	return this;
	        }
	        app.filter     = function(name, constructor) {
	        	$filterProvider.register(name, constructor);
	        	return this;
	        }
	        app.factory    = function(name, constructor) {
	        	$provide.factory(name, constructor);
	        	return this;
	        }
	        app.service    = function (name, constructor) {
	        	$provide.service(name, constructor);
	        	return this;
	        }

            // $locationProvider.html5Mode(true);

            if(config.routes !== undefined)
            {
                angular.forEach(config.routes, function(route, path)
                {
                	// default template has the same name as the controller
                	route.templateUrl = route.templateUrl || route.controller+'.html';
                    $routeProvider.when(
                    	path, 
                    	{
                    		templateUrl:route.templateUrl,
                    		resolve:dependencyResolverFor(route.dependencies),
                    		controller : route.controller
                    	}
                	);
                });
            }

            if(config.defaultRoutePaths !== undefined)
            {
                $routeProvider.otherwise({redirectTo:config.defaultRoutePaths});
            }

        }
    ]);
  
  	/**
  	 * configuration for terminal emlator
  	 */
    app.config([
        'terminalConfigurationProvider',
         function(terminalConfigurationProvider){
            terminalConfigurationProvider.config('vintage').outputDelay = 10;
            terminalConfigurationProvider.config('vintage').allowTypingWriteDisplaying = false;
         }
    ]);

	app.init = function(){
		// lancement de l'application
		angular.bootstrap(document, ['easyCodeApp']);
	}

	return app;
});