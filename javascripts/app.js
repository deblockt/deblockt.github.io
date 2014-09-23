define(function (require) {
	var app = angular.module('easyCodeApp', ['ui.bootstrap', 'ui.codemirror']);	
					
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
			content : 'Bonjour tous le monde',
			options : {
				lineNumbers: true,
				tabSize : 2,							
				mode : 'text/html'
			}
		}
	});
	
	app.init = function(){
		// lancement de l'application
		angular.bootstrap(document, ['easyCodeApp']);
	}
	return app;
});