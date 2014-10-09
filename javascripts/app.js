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
				gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
				extraKeys: {"Ctrl-Space": "autocomplete"},
				lint : {async : true} ,
				foldGutter: true,
				autoCloseBrackets : true
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


		$scope.clearConsole = function(){
			var terminalScope = angular.element(document.getElementById('terminal')).scope();
			terminalScope.clear();
		}

		
		$scope.runAlgo = function(){
			var currentTab = $scope.currentTab();
			var content = currentTab.content;

			$scope.$broadcast('terminal-output', {
			    output: true,
			    text: ['Execution de l\'algorithme : ' + currentTab.title],
			    breakLine: true,
			    className : 'info'
			});
				
			var parser = require('easyCodeParser');
			var algo = undefined;
			try {
				algo = parser.parse(content);
			} catch (exception) {
				$scope.$broadcast('terminal-output', {
					output: true,
					text: ['L\'algorithme comporte des erreurs!', exception + ' (ligne : ' + exception.line + ', colonne : '+exception.column+')'],
					breakLine: true,
					className : 'error'
				});
				return;
			}

			var runner = require('easyCodeRunner');
			runner.run(algo, {
				abstractWrite : function(text, className) {
					text = text + "";
					$scope.$broadcast('terminal-output', {
						output: true,
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

	    //terminalConfigurationProvider.config('vintage').outputDelay = 1000;
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