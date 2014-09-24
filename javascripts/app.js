define(function (require) {
	var app = angular.module('easyCodeApp', ['ngRoute', 'ui.bootstrap', 'ui.codemirror']);

	// controller for header actions
	app.controller('headerController', function($scope){
		// add header properties for phone support
		$scope.header = {
			isCollapsed : true
		};
	});

	// controller for text editor
	app.controller('easyCodeController', function($scope){
		// add header properties for phone support
		$scope.editor = {
			options : {
				lineNumbers: true,
				tabSize : 2,							
				mode : 'text/easyCode-src',
				extraKeys: {"Ctrl-Space": "autocomplete"}
			}
		};
		
		$scope.tabs = [
			{title : 'Algo 1', content : 'SI test > 0', active : true}
		];

		$scope.nbTabs = 1;
		
		$scope.addTab = function(){
			$scope.tabs.push({
				title : 'Algo ' + ++$scope.nbTabs, content : '<html>\n\t<head>\n\t\t<title> alog n°'+$scope.nbTabs+'</title>\n\t</head>\n\t<body>\n\t</body>\n</html>', active : true
			});
		};
		
	});
	
	
	app.config(['$routeProvider', function ($routeProvider) {
          //$httpProvider.responseInterceptors.push('httpInterceptor');

          $routeProvider
              .when('/', { templateUrl: 'codeEditor.html', controller: 'easyCodeController' })
              .otherwise({ redirectTo: '/' });

          //$locationProvider.html5Mode(true);
      }
	]);
  
  
	app.init = function(){
		// lancement de l'application
		angular.bootstrap(document, ['easyCodeApp']);
	}
	return app;
});