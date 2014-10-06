define(function (require) {
	var app = angular.module('easyCodeApp', ['ngRoute', 'ui.bootstrap', 'ui.codemirror', 'vtortola.ng-terminal']);

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
				title : 'Algo ' + ($scope.tabs.length + 1), content : '// alog n°'+ ($scope.tabs.length + 1) , active : true
			});
		};
		
		$scope.currentTab = function(){
		    return $scope.tabs.filter(function(tab){
		      return tab.active;
		    })[0];
		}

		$scope.checkAlgo = function(currentTab){
			currentTab = currentTab || $scope.currentTab();
			var content = currentTab.content;
			var parser = require('easyCodeParser');
			try {
				return parser.parse(content);s		
			} catch (exception) {
				alert('Attention votre code source contient des erreurs ' + exception);
			}
		}

		$scope.clearConsole = function(){
			var terminalScope = angular.element(document.getElementById('terminal')).scope();
			terminalScope.clear();
		}

		
		$scope.runAlgo = function(){
			var currentTab = $scope.currentTab();
			
			$scope.$broadcast('terminal-output', {
			    output: false,
			    text: ['Execution de l\'algorithme : ' + currentTab.title],
			    breakLine: true,
			    className : 'info'
			});


			// must be a function it's call when a command is send
			
			var runner = require('easyCodeRunner');
			runner.run($scope.checkAlgo(currentTab), {
				abstractWrite : function(text, className) {
					text = text + "";
					$scope.$broadcast('terminal-output', {
					    output: false,
					    text: text.split('\n'),
					    breakLine: true,
					    className : className
					});
				},
				write : function(text) {
					this.abstractWrite(text, 'output');
				},
				error : function(text) {
					this.abstractWrite(text, 'error');
				},
				info : function(text) {
					this.abstractWrite(text, 'info');
				}
			}, {
				read : function (validator, action) {
					$scope.onCommandInput = function(command) {
						if (!validator || validator(command)) {
							action(command);
						}						
					}
				}
			});
		}

		$scope.onCommandInput = undefined;
		$scope.$on('terminal-input', function (e, consoleInput) {
		    var cmd = consoleInput[0];
		    if ($scope.onCommandInput) {
		    	$scope.onCommandInput(cmd.command);
		    }
		});
	}).config(['terminalConfigurationProvider', function (terminalConfigurationProvider) {

	    terminalConfigurationProvider.config('vintage').outputDelay = 10;
	    terminalConfigurationProvider.config('vintage').allowTypingWriteDisplaying = false;
	}]).service('promptCreator', [function () {
	    var prompt = function (config) {
	        return {text : ''};
	    };
	    return prompt;
	}]);
	
	
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