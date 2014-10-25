
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
			return values.varname != undefined ;
		},
		'if' : function(values) {
			return !this.isEmpty(values.test);
		},
		'while' : function(values) {
			return !this.isEmpty(values.test);
		},
		'foreach' : function(values) {
			return !this.isEmpty(values.varname) && !this.isEmpty(values.array);	
		},
		'for' : function(values) {
			return !this.isEmpty(values.varname) && !this.isEmpty(values.start) && !this.isEmpty(values.end);		
		}
	};
	
	var codeConstructor = {
		tabulate : function(lines){
			return lines.replace(/\n/g, '\n\t');
		},
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
					values.varname += '[' + (values.index || '') + ']';
				}
			}
			
			if (!expression) {
				expression = this.refactorExpression(context, values.expression);
			}

			return {code : values.varname + ' = ' + expression}
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
		},
		'if' : function(context, values, selectedCode) {
			var code = 'SI ' + values.test + '\n';
			if (selectedCode) {
				code += '\t' + this.tabulate(selectedCode.trim());
			} else {
				code += '\t' + '// code si le test est vrai';
			}
			
			if (values.elseBlock) {
				code += '\nSI_NON\n\t//code si le test est faux';
			}
			code += '\nFIN_SI';

			return {overrideSelection : true, code : code};
		},
		'while' : function(context, values, selectedCode) {
			var code = 'TANT_QUE ' + values.test + '\n';
			if (selectedCode) {
				code += '\t' + this.tabulate(selectedCode.trim());
			} else {
				code += '\t' + '// code executé dans la boucle';
			}
			
			code += '\nFIN_TANT_QUE';

			return {overrideSelection : true, code : code};
		},
		'foreach' : function(context, values, selectedCode) {
			var code = '';
			if (!context.isset(values.varname, false)) {
				code = 'DEFINIR ' + values.varname + ' CHAINE // attention vérifier le type de la variable \n';
			}

			code += 'POUR ' + values.varname + ' DANS ' + values.array + '\n';
			if (selectedCode) {
				code += '\t' + this.tabulate(selectedCode.trim());
			} else {
				code += '\t' + '// code executé pour chaques element du tableau';
			}			
			code += '\nFIN_POUR';

			return {overrideSelection : true, code : code};
		},
		'for' : function(context, values, selectedCode) {
			var code = '';
			if (!context.isset(values.varname, false)) {
				code = 'DEFINIR ' + values.varname + ' NOMBRE\n';
			}

			code += 'POUR ' + values.varname + ' DE ' + values.start + ' A ' + values.end;
			if (values.step) {
				code += ' PAR ' + values.step;
			}
			code += '\n';

			if (selectedCode) {
				code += '\t' + this.tabulate(selectedCode.trim());
			} else {
				code += '\t' + '// code executé pour chaques element du tableau';
			}			
			
			code += '\nFIN_POUR';

			return {overrideSelection : true, code : code};
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
				'Afecter une variable' : {id : 'afectation', title : 'Afectation d\'une variable'},
				'position' : 1
			}, 
			'Structure conditionelle' : {
				'Si' : {id : 'if', title : 'Condition'},
				'position' : 2
			}, 
			'Structure itérative' : {
				'Execution tant que vrai' : {id:'while', 'title' : 'Boucle tant que'},
				'Parcour entre deux nombres' : {id:'for', 'title' : 'Boucle pour'},
				'Parcour d\'un tableau' : {id:'foreach', 'title' : 'Boucle pour chaque'},
				'position' : 3
			},
			'Aide' : {
				'Liste de fonctions' : {type : 'help', id : 'functions', title : 'Fonctions'},
				'Liste des variables' : {type : 'help', id : 'variables', title : 'Variables'},
				'position' : 4
			}
		};

		
		$scope.configuration = easyCodeConfiguration;
		$scope.selected = undefined;
		$scope.setSelected = function(menu) {
			if (menu.type == 'help') {
				$scope.help = menu;
			} else {
				if ($scope.selected) {
					$scope.selected.selected = false;
				}
				$scope.selected = menu;
				menu.selected = true;
				$scope.isValidated = false;				
			}
		};

		$scope.closeHelp = function(){
			$scope.help = undefined;
		};

		// init vars selectionnales
		var parser = new Parser();
		var parsed = parser.parse(codeMirror.getValue());
		// get var by context
		var pos = codeMirror.indexFromPos(codeMirror.getCursor());
		var context = parsed.context.getContextFor(pos);
		
		$scope.vars = context.getAccessibleVars();
		$scope.functions = easyCodeConfiguration.getFunctions();
		$scope.functionsDescription = easyCodeConfiguration.getFunctionsDescription();

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
			if (!$scope.selected || !($scope.selected.id in codeConstructor)) {
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

		     	// check if start == end
		     	var selectedCode = undefined;
		     	if(!(selection.head.line == selection.anchor.line && selection.head.ch == selection.anchor.ch)) {
			     	var startSelected = CodeMirror.Pos(selection.head.line, 0);
			     	var endLineSelected = codeMirror.getLine(selection.anchor.line);
					var endSelected = CodeMirror.Pos(selection.anchor.line, endLineSelected.length);
					selectedCode = codeMirror.getRange(startSelected, endSelected);
				}

	     		var value  = codeConstructor[selected.id](context, selected, selectedCode);
				newLine = value.code;
				overrideSelection = value.overrideSelection || false;		     	

		     	var start = overrideSelection && selectedCode ? startSelected : selection.head; 
		     	var end = overrideSelection && selectedCode ? endSelected : selection.head;

				// indent correctly the current line
				var token = codeMirror.getTokenAt(start);
				var indentNumber = easyCodeMod.indent(token.state, newLine);

				// tabulate 
				var stringTabulate = tabulate(indentNumber);	
				console.log(newLine);
				newLine = stringTabulate + newLine;
				newLine = newLine.replace(/\n/g, '\n' + stringTabulate);				
				console.log(newLine);

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
					newLine = newLine + (overrideSelection ? '' : '\n' );
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
	});
});