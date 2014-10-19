define(function (require) {
	var app = angular.module('easyCodeApp', ['ngRoute', 'ui.bootstrap', 'ui.codemirror', 'vtortola.ng-terminal']);

	var Parser = require('easyCodeParser');
	
	// controller for header actions
	app.controller('headerController', function($scope){
		// add header properties for phone support
		$scope.header = {
			isCollapsed : true
		};
	});

	// create a directive specific module
	app.directive('focusMe', function($timeout) {
	  return {
		scope: { trigger: '=focusMe' },
		link: function(scope, element) {
		  scope.$watch('trigger', function(value) {
			if(value === true) { 			  
				element[0].focus();
				element[0].select();
			}
		  });
		}
	  };
	}).directive('ngEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if(event.which === 13) {
                    scope.$apply(function(){
                        scope.$eval(attrs.ngEnter, {'event': event});
                    });

                    event.preventDefault();
                }
            });
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
			{title : 'Algo 1', content : '// Algo n°1', active : true},
		];
		
		$scope.addTab = function(){
			$scope.tabs.push({
				title : 'Algo ' + ($scope.tabs.length + 1),
				content : '// Algo n°'+ ($scope.tabs.length + 1) ,
				active : true,
				renameMode : true
			});
		};
		
		/**
		 * generate configuration for a tab
		 */
		$scope.editorConfiguration = function(tab) {
			if (tab.options) {return tab.options};
			
			var options = {};
			angular.copy($scope.editor.options, options);
			
			options.onLoad = function(cm) {
				tab.cm = cm;
			};
			
			tab.options = options;
			
			return options;
		};
		
		
		$scope.removeTab = function(index) {
			$scope.tabs.splice(index, 1);
		};
		
		$scope.currentTab = function(){
		    return $scope.tabs.filter(function(tab){
		      return tab.active;
		    })[0];
		};


		$scope.clearConsole = function(){
			var terminalScope = angular.element(document.getElementById('terminal')).scope();
			terminalScope.clear();
		};

		
		$scope.runAlgo = function(){
			var currentTab = $scope.currentTab();
			var content = currentTab.content;

			$scope.$broadcast('terminal-output', {
			    output: true,
			    text: ['Complilation de l\'algorithme : ' + currentTab.title],
			    breakLine: false,
			    className : 'info'
			});
				
			var algo = undefined;
			try {
				var parser = new Parser();
				result = parser.parse(content);
				
				if (result.errors && result.errors.length > 0) {
					$scope.$broadcast('terminal-output', {
						output: true,
						text: ['L\'algorithme comporte des erreurs!'],
						breakLine: false,
						className : 'error'
					});
					for (var i in result.errors) {
						var error = result.errors[i];
						var startPos = currentTab.cm.posFromIndex(error.getStart());
						
						$scope.$broadcast('terminal-output', {
							output: true,
							text: [error + ' (ligne : ' + (startPos.line + 1) + ', colonne : '+ startPos.ch +')'],
							breakLine: false,
							className : 'error'
						});
					}
					return;
				} else {
					algo = result.result;
				}
			} catch (exception) {
				$scope.$broadcast('terminal-output', {
					output: true,
					text: ['Une erreur est survenue : ', exception.toString()],
					breakLine: false,
					className : 'error'
				});
				return;
			}

			$scope.$broadcast('terminal-output', {
			    output: true,
			    text: ['Execution de l\'algorithme : ' + currentTab.title],
			    breakLine: false,
			    className : 'info'
			});
			var runner = require('easyCodeRunner');
			runner.run(algo, {
				abstractWrite : function(text, className) {
					text = text + "";
					$scope.$broadcast('terminal-output', {
						output: true,
						text: text.split('\n'),
						breakLine: false,
						className : className
					});
				},
				write : function(text) {
					this.abstractWrite(text, 'output');
				},
				error : function(text) {
					if (typeof text == 'object') {
						text = text.toString(currentTab.cm);
					}
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
		};

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