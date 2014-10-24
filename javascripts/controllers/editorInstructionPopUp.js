
define(['app', 'easyCodeConfiguration', 'easyCodeParser', 'controllers/popUp'], function(app, easyCodeConfiguration, Parser){

	var formValidator = {
		isEmpty : function(value) {
			return value == undefined || value.trim().length == 0;
		},
		'define' : function(values) {
			return !this.isEmpty(values.varname) && !this.isEmpty(values.type);
		},
		'read' : function(values) {
			return !this.isEmpty(values.varname);
		},
		'afectation' : function(values) {
			if (values.varType == 'array') {
				if (!values.arrayType) {
					return false;
				}
				if (values.arrayType == 3 && !values.expression) {
					return false;	
				}
			}
			return values.varName != undefined ;
		}
	};
	
	var codeConstructor = {
		escapeString : function(string) {
			return string.replace(/"/g, '\\"');
		},
		/**
		 * if expression have error expression is a string
		 */
		refactorExpression : function(context, expression) {
			var parser = new Parser(undefined, context);
			parser.initParser(expression);
			// try to parse expression
			try {
				parser.parseExpression();
			} catch (exception) {
				return '"'+ this.escapeString(expression) + '"';
			}
			
			return expression;
		},
		// définir varname vartype
		'define' : function(context, values) {
			return {code : 'DEFINIR ' + values.varname + ' ' + values.type};
		},
		'read' : function(context, values ) {
			return {code : 'LIRE ' + values.varname};
		},
		'afectation' : function(context, values) {
			var varname = values.varName;
			var vartype = values.varType;
			var expression = undefined;
			console.log(vartype);
			// it's a string
			if (vartype == 'string' && values.message) {
				expression = '"' + this.escapeString(values.message) + '"';
			} else if (vartype == 'number' && values.number) {
				expression = values.number;
			} else if (vartype == 'boolean' && values.boolean) {
				expression = values.boolean;
			} else if (vartype == 'array') {
				if (values.arrayType == 1) {
					expression = '[';
					if (values.arrayValues) {
						for (var i in values.arrayValues) {
							expression += this.refactorExpression(context, values.arrayValues[i]) + '; ';
						}
						expression = expression.substring(0, expression.length - 2);						
					}
					expression += ']';
				} else if (values.arrayType == 2) {
					expression = '[';
					if (values.arrayValues) {
						for (var i in values.arrayValues) {
							var value = values.arrayValues[i];
							expression += this.refactorExpression(context, value.key) + ' : ' + this.refactorExpression(context, value.value) + '; ';
						}
						expression = expression.substring(0, expression.length - 2);						
					}
					expression += ']';
				} else if (values.arrayType == 3) {
					values.varName += '[' + (values.index || '') + ']';
				}
			}
			
			if (!expression) {
				expression = this.refactorExpression(context, values.expression);
			}

			return {code : values.varName + ' = ' + expression}
		},
		'write' : function(context, values) {
			var expression = undefined;
			
			if (values.message) {
				expression = '"' + this.escapeString(values.message) + '"';
			}
			
			if (!expression) {
				expression = this.refactorExpression(context, values.expression);
			}
			
			return {code : 'ECRIRE ' + expression + (values.output ? ' \''+values.output+'\'' : '')}
		}
	};
	
	
	app.controller('editorInstructionPopUp', function($scope, $modalInstance, $controller,$timeout, codeMirror){	
			
		// extends PopUpController
		angular.extend(this, $controller('popUpController', {$scope: $scope, $modalInstance : $modalInstance, title : '', message : '', buttons : {}}));	
		
		$scope.sections = {
			'Instruction' : {
				'Définir une variable' : {id : 'define', title : 'Définir une variable'},
				'Lire une variable' : {id : 'read', title : 'Lire une variable'},
				'Ecrire un message' : {id : 'write', title : 'Ecrire un message'},
				'Afecter une variable' : {id : 'afectation', title : 'Afectation d\'une variable'}
			}, 
			'Structure conditionelle' : {
				'Si' : {id : 'if'}
			}, 
			'Structure itérative' : {
				'Execution tant que vrai' : {id:'while'},
				'Parcour d\'un tableau' : {id:'for'},
				'Parcour entre deux nombres' : {id:'foreach'}
			}
		};

		
		$scope.configuration = easyCodeConfiguration;
		$scope.selected = undefined;
		$scope.setSelected = function(menu) {
			if ($scope.selected) {
				$scope.selected.selected = false;
			}
			$scope.selected = menu;
			menu.selected = true;
			$scope.isValidated = false;
		};

		// init vars selectionnales
		var parser = new Parser();
		var parsed = parser.parse(codeMirror.getValue());
		// get var by context
		var pos = codeMirror.indexFromPos(codeMirror.getCursor());
		var context = parsed.context.getContextFor(pos);
		
		$scope.vars = context.getAccessibleVars();
		
		$scope.removeArray = function(index) {
			$scope.selected.arrayValues.splice(index, 1);
		};

		$scope.addArrayValue = function(value) {
			if (!$scope.selected.arrayCurrentValue) {
				return;
			}
			if ($scope.selected.arrayValues == undefined) {
				$scope.selected.arrayValues = [];
			}
			$scope.selected.arrayValues.push($scope.selected.arrayCurrentValue);
			$scope.selected.arrayCurrentValue = undefined;
		};

		$scope.validateForm = function(){
			$scope.isValidated = true;
			var selected = $scope.selected || {};
			if (selected.id in formValidator) {
				var valide = formValidator[selected.id](selected);
				
				return valide;
			}
			
			
			return true;
		};
		
		// when the popup is closed
		$modalInstance.result.then(function () {
			// no selection just close the popup
			if (!$scope.selected) {
				return ;
			}
			
			function tabulate(indentNumber) {
				var tab = '';
				for (var i = 0; i < indentNumber; ++i) {
					tab += ' ';
				}
				return tab;
			}
			
			var easyCodeMod = codeMirror.getMode({},"easyCode");

			// timeout is used because replaceRange do digest error
			$timeout(function(){				
				var selection = codeMirror.listSelections()[0];
				var selected = $scope.selected || {};
		     	// new line of code
		     	var newLine = undefined;
		     	// must remove the selected code
		     	var overrideSelection = false;
		     	
		     	// create the line of core
		     	if (selected.id in codeConstructor) {	     		
		     		var value  = codeConstructor[selected.id](context, selected);
					newLine = value.code;
		     	}

		     	var start = selection.head; 
		     	var end = overrideSelection ? selection.anchor : selection.head;

				// indent correctly the current line
				var token = codeMirror.getTokenAt(start);
				var indentNumber = easyCodeMod.indent(token.state, newLine);
				newLine = tabulate(indentNumber) + newLine;
				
																	
		     	// already add a new line end add the code at the end of line
		     	var beforeCursor = codeMirror.getRange(CodeMirror.Pos(start.line, 0), start);
				var line = codeMirror.getLine(start.line);
				if (beforeCursor.trim().length > 0) {
					// if we are not at start of line add the line after the current
					start.ch = line.length;
					newLine = '\n' + newLine;
		     	} else if (line.trim().length > 0){
					// if we are at start on an existing line add the line before this line
					start.ch = 0;
					newLine = newLine + '\n';
				} else {
					// empty line add the line on this line
					start.ch = 0;
				}
				
		     	// add code on code mirror
		     	codeMirror.replaceRange (
	     			newLine,
	     			start, 
	     			end
	     		);
				
				codeMirror.setSelection(start, start);
			})
	    });
	})
});