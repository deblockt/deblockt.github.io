define(['app', 'easyCodeParser', 'services/fileSystem', 'controllers/popUp', 'controllers/editorInstructionPopUp'], function(app, Parser, fs)
{
	// default editor configuration
	var EDITOR_OPTIONS = {
		lineNumbers: true,
		tabSize : 2,                            
		mode : 'text/easyCode-src',
		gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
		extraKeys: {"Ctrl-Space": "autocomplete"},
		lint : {async : true} ,
		foldGutter: true,
		autoCloseBrackets : true,
		dragDrop : false
	};
		
	// object used for write on the console
	var terminalWritter = {	
		init : function($scope) {
			this.$scope = $scope;
		},
		setCodeMirror : function(cm) {
			this.cm = cm;
		},
		abstractWrite : function(message, callName) {
			if (!Array.isArray(message)) {
				message = [message + ""];
			} 
			callName = callName || 'info';
			
			this.$scope.$broadcast('terminal-output', {
				output: true,
				text: message,
				breakLine: false,
				className : callName
			});
		},
		write : function(text) {
			this.abstractWrite(text, 'output');
		},
		error : function(text) {
			if (typeof text == 'object') {
				text = text.toString(this.cm);
			}
			this.abstractWrite(text, 'error');
		},
		info : function(text) {
			this.abstractWrite(text, 'info');
		}
	};
	
	var terminalReader = {
		init : function($scope) {
			this.$scope = $scope;
			this.onCommandInput = undefined;
			var _this = this;
			$scope.$on('terminal-input', function (e, consoleInput) {
				var cmd = consoleInput[0];
				if (_this.onCommandInput) {
					var callback = _this.onCommandInput;
					_this.onCommandInput = undefined;
					callback(cmd.command);
				}
			});
		},
		setHandler : function(callback) {
			this.onCommandInput = callback;
		},
		read : function (validator, action) {
			var _this = this;
			var handler = function(command) {
				if (!validator || validator(command)) {
					action(command);
				} else {
					_this.setHandler(handler);
				}				
			};
			this.setHandler(handler);
		}
	};
	
	// convert a string to a filename
	var toFileName = function(string) {
		return string.replace(/[^a-z0-9\(\)\-]/gi, '_').toLowerCase();
	}
		
    app.controller('easyCodeEditor', function($scope, popUpManager, $modal){
			
		terminalWritter.init($scope);
		terminalReader.init($scope);
		
        /**
         * generate configuration for a tab
         */
        $scope.editorConfiguration = function(tab) {
            if (tab.options) {return tab.options};
            
            var options = {};
            angular.copy(EDITOR_OPTIONS, options);
            
            options.onLoad = function(cm) {
                tab.cm = cm;
				cm.on('change', function(cm, event){
					// if it's a user input
					// it's do because setValue fire a change event
					if ($scope.fsSupported && event.origin != 'setValue') {
						tab.isSaved = false;
						$scope.$apply();
					}
				});
            };
            
			options.extraKeys = {
				"Ctrl-S": function(instance) { $scope.saveAlgo(tab)},
			};
			
            tab.options = options; 
            
            return options;
        };
        
        /** 
		 * tab management
		 */
        $scope.tabs = [];
        
		$scope.renamed = function(tab) {
			tab.renameMode = false;
			if ($scope.fsSupported && tab.filePath) {
				$scope.saveAlgo(tab);
			}
		};
		
        $scope.addTab = function(){
			var tab = {
                title : 'Algo ' + ($scope.tabs.length + 1),
                content : '// Algo n°'+ ($scope.tabs.length + 1) ,
                active : true,
                renameMode : true,
				isSaved : true,
            };
            $scope.tabs.push(tab);
			return tab;
        };
        
        $scope.removeTab = function(index) {			
			var tab = $scope.tabs[index];
			popUpManager.confirm(
				'Suppression de l\'onglet : ' + tab.title,
				'Voulez vous vraiment supprimer l\'onglet ' + tab.title + ' ?',
				function() {
					$scope.tabs.splice(index, 1);
					if ($scope.fsSupported && tab.filePath) {
						fs.removeFile(tab.filePath);
					}
				}
			);
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

			// set the current cm on the writer (used for get line et collumn of errors)
			terminalWritter.setCodeMirror(currentTab.cm);
			terminalWritter.info('Complilation de l\'algorithme : ' + currentTab.title);
                
			// parse algo
            var algo = undefined;
            try {
                var parser = new Parser();
                result = parser.parse(content);
                
                if (result.errors && result.errors.length > 0) {
					// show all parsing errors
					terminalWritter.error('L\'algorithme comporte des erreurs!');
                    for (var i in result.errors) {
                        var error = result.errors[i];
                        var startPos = currentTab.cm.posFromIndex(error.getStart());
                        terminalWritter.error(error + ' (ligne : ' + (startPos.line + 1) + ', colonne : '+ startPos.ch +')');
                    }
                    return;
                } else {
                    algo = result.result;
                }
            } catch (exception) {
				terminalWritter.error(['Une erreur est survenue : ', exception.toString()]);
                return;
            }
			
			terminalWritter.info('Execution de l\'algorithme : ' + currentTab.title);

			// run algo
            var runner = require('easyCodeRunner');
            runner.run(algo, terminalWritter, terminalReader);
        };
 

		/**
		 * function call before download link
		 */
		$scope.downloadAlgo = function(){
			var currentTab = $scope.currentTab();
			
			var content = currentTab.content;
			var blob = new Blob([ content ], { type : 'text/plain' });
			$scope.downloadAlgoUrl = (window.URL || window.webkitURL).createObjectURL( blob );
			$scope.downloadAlgoFileName = toFileName(currentTab.title);
		};

		/**
		 * convert a file upload on a tab
		 */
		$scope.fileAdded = function($file, $event, $flow) {
			var ext = $file.name.substring($file.name.lastIndexOf('.') + 1);
			var allowExt = 'easyCode';
			if (ext != allowExt) {
				popUpManager.warning(
					'Erreur lors de l\'ajout de l\'algorithme',
					'L\'extension du fichier doit être .'+allowExt
				);
				return;
			}
			var fileReader = new FileReader();
			fileReader.readAsText($file.file);
			fileReader.onload = function (event) {
			   var tab = $scope.addTab();
			   tab.content = event.target.result;
			   tab.title = $file.name.substring(0, $file.name.lastIndexOf('.'));
			   tab.renameMode = false;
			   $flow.removeFile($file);
			   $scope.$apply();			   
			};
		}
 
		var errorFsHandler = function() {
			var tab = $scope.addTab();
			tab.renameMode = false;
			$scope.$apply();
		}
		
		
		/**
		 * read algos finds on file system
		 */
		$scope.initAlgos = function() {
			fs.listDir('algos', function(dirContent) {
				var added = false;
				// todo is the number of tab saved
				// when todo = 0 all tabs are read and create
				var todo = dirContent.length;
				if (todo == 0) {
					errorFsHandler();
				}
				
				for (var i in dirContent) {
					var fileEntry = dirContent[i];
					(function(index) {
						fs.readFileEntry(fileEntry, function(content){
							try {
								var tab = {};
								if (JSON && JSON.parse) {
									tab = JSON.parse(content);
								} else {
									tab = eval('('+content+')');
								}
								tab.renameMode = false;
								tab.active = true;
								tab.filePath = fileEntry.fullPath.slice(1);
								
								$scope.tabs.push(tab);
								$scope.$apply();
								added = true;
								todo--;
							} catch (e) {
							}
							// if no tabs are successful created
							if (todo == 0 && !added) {
								errorFsHandler();
							}						
						})
					})(i);
				}
			}, errorFsHandler);
		};
		
		/**
		 * save algo on file system
		 */
		$scope.saveAlgo = function(tab) {
			var currentTab = tab || $scope.currentTab();
			var filePath = currentTab.filePath || 'algos/'+toFileName(currentTab.title);
			var writeFile = function() {
				var toStringify = {title : currentTab.title, content : currentTab.content};
				currentTab.filePath = filePath;
				currentTab.isSaved = true;
				$scope.$apply();
				fs.writeFile(filePath, JSON.stringify(toStringify));
			};
			
			fs.touch(
				filePath, 
				writeFile, 
				function(e){
					// the file already exists
					if (e.name = 'InvalidModificationError') {
						writeFile();
					}
				}
			);			
		};
			
		$scope.openInstructionPopUp = function(){			
			$modal.open({
			  templateUrl: 'editorInstructionPopUp.html',
			  controller: 'editorInstructionPopUp',
			  size: 'lg',
			  resolve : {
			  	codeMirror : function(){return $scope.currentTab().cm}
			  }
			});
		};
		
		//init file system	
		$scope.fsSupported = false;
		if (fs.isSupported()) {
			fs.initFs(
				5*1024*1024, 
				function(){
					//  init algo directory
					fs.mkdir('algos', function(algo) {
						// algo created
						$scope.fsSupported = true;
						$scope.$apply();
						$scope.initAlgos();
					});
				},
				errorFsHandler
			);
		}
		
		
    })
    .service('promptCreator', [function () {
        var prompt = function (config) {
            return {text : ''};
        };
        return prompt;
    }]);

});