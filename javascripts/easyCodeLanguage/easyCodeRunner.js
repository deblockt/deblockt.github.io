/**
 * runner for easyCode expression parsed with the easyCodeParser.js
 */

 define(function(){
 	


 	var runner = {};

 	/**
 	 * @param expression the expression give with easyCodeParser
 	 * @param output an object for write this object must have 3 methodes error, info, write they have one string parameter
 	 */
 	runner.run = function(expression, output, input) {
		var FUNCTIONS = {
			'aleatoire' : function(min, max){
				min = min || 0;
				max = max || 100;
				return Math.floor(Math.random() * max + min);
			},
			'racine_carree' : Math.sqrt,
			'en_entier' : function(value) {
				return parseInt(value, 10);
			},
			'taille' : function(value) {
				checkType(value, 'array');
				// TODO optimiser le traitement en créer une nouvelle structure de donnée pour la gestion des tableaux
				// this is do for associative array
				var size = 0;
				for (var i in value) {
					size++;
				}
				return size;
			},
			'arondi_inferieur' : Math.floor
		}
		
		var SKIP_FUNCTION = ['eval'];
	
		/**
	 	 * context class
	 	 * context contains line to execute, current scope var
	 	 */
		var Context = function(parent) {
			this.parent = parent;
			this.functions = {};
			this.vars = {};
		}

		Context.prototype = {
			isset : function(varName, exceptionMode, offset) {
				if  (varName in this.vars) {
					return true;
				}
				var parentIsset = this.getParent() && this.getParent().isset(varName, exceptionMode, offset);
				if (!parentIsset && exceptionMode) {
					throw new RuntimeException('La variable ' + varName + ' n\'est pas definie.', offset);
				}
				return parentIsset || false;
			},
			formatFunctionName : function(name) {
				var DEFAULT_REGEX = /[-_]+(.)?/g;

				function toUpper(match, group1) {
					return group1 ? group1.toUpperCase() : '';
				}
				
				var name = name.replace(DEFAULT_REGEX, toUpper);
				// remove function to skip for security raison
				if (Array.indexOf(SKIP_FUNCTION, name) >= 0) {
					return '';
				}
				return name;
			},
			issetFunction : function(functionName, exceptionMode, offset) {
				var isset = functionName in FUNCTIONS 
					|| functionName in this.functions 
					|| this.formatFunctionName(functionName) in window 
					|| (this.getParent() && this.getParent().issetFunction(functionName));
				
				if (!isset && exceptionMode) {
					throw new RuntimeException('La fonction ' + functionName + ' n\'existe pas.', offset);
				}
				
				return isset;
			},
			getVar : function(varName) {
				if (this.vars[varName]) {
					return this.vars[varName];
				}
				if (this.getParent()) {
					return this.getParent().getVar(varName);
				}
				return undefined;
			},
			getFunction : function(functionName) {
				if (functionName in FUNCTIONS) {
					return FUNCTIONS[functionName];
				} 
				
				if (functionName in this.functions) {
					return this.functions[functionName];
				}
				
				var formatFunction = this.formatFunctionName(functionName);
				if (formatFunction in window) {
					return window[formatFunction];
				}
				
				if (this.getParent()) {
					return this.getParent().getFunction(functionName);
				}
				return undefined;
			},
			getValue : function(varName) {
				return this.getVar(varName).value;
			},
			getType : function(varName) {
				return this.getVar(varName).type;
			},
			setValue : function(varName, value, indexs) {
				// TODO add type check
				if (indexs != undefined) {					
					if (this.getType(varName) == 'array') {
						var varValue = this.getVar(varName);
						
						if (varValue.value == undefined) {
							varValue.value = [];
						}
						var currentArray = varValue.value;
						// on traite la création de tous les indices
						var max = indexs.length;
						if (max > 1) {
							for (var i = 0; i < max - 1; i++) {
								var index = indexs[i];							
								if (currentArray[index] == undefined || index == 'ADD_AT_END') {
									if (index == 'ADD_AT_END') {
										index = currentArray.length;
									}
									currentArray[index] = [];
								}										
								currentArray = currentArray[index];
							}
						}
						// on est arrivé à la fin de l'acces aux indexs
						var lastIndex = indexs[indexs.length - 1];
						if (lastIndex == 'ADD_AT_END') {
							currentArray.push(value);
						} else {
							currentArray[lastIndex] = value;
						}						
					} else {
						throw new RuntimeException('La variable ' + varName + ' n\'est pas un tableau.');
					}
				} else {	
					this.getVar(varName).value = value;
				}
			},
			defineVar : function(varName, type) {
				this.vars[varName] = {
					type : type,
					value : undefined
				};
			},
			getParent : function(){
				return this.parent;
			}
		};

		var BlockRunner = function(context, lines, parent, lineProcessor) {
			this.context = context;
			this.lines = lines;
			this.parent = parent;
			this.lineProcessor = lineProcessor;

			this.currentLine = 0;
			this.onEndFunction = [];
			this.fatalError = false;
			
			// the child currently run
			this.proccessingChild = undefined;
			if (this.getParent()) {
				this.getParent().proccessingChild = this;
			}
		}

		BlockRunner.prototype = {			
			registerEndFunction : function(endFunction) {
				this.onEndFunction.push(endFunction);
			},
			blockEnd : function() {
				if (this.getParent()) {
					this.getParent().proccessingChild = undefined;
				}
				for (var i = this.onEndFunction.length - 1; i >= 0; i--) {
					var canContinue = this.onEndFunction[i]();
					if (canContinue === false) {
						break;
					}
				}
			},			
			/**
	 		 * run a line of code
	 		 */
	 		runLine : function(line, endOfLine){
	 			var _this = this;
				try {
					this.lineProcessor.runLine(line, this.context, this, function(){
						endOfLine && endOfLine();
						_this.runNextLine();
					});	
				} catch (e) {
					this.haveFatalError();
					output.error(e.toString());
					console.log(e);
				}				
	 		},
			haveFatalError : function() {
				this.fatalError = true;
				if (this.getParent()) {
					this.getParent().haveFatalError();
				}
			},
			runNextLine : function() {
				if (this.fatalError) {
					return;
				}
				if (this.currentLine < this.lines.length) {
	 				// call run line function (not in context class)
	 				var _this = this;
	 				var _currentLine = this.currentLine + 1;
	 				this.runLine(this.lines[this.currentLine++], function(){_this.endOfLineHandler()} );
	 			}
			},	
			endOfLineHandler : function(){
				// warn if a child running 
 				if (this.currentLine >= this.lines.length) {
 					if (!this.proccessingChild) {
 						this.blockEnd();	 						
 					} else {
 						var _this = this;
 						this.proccessingChild.registerEndFunction(function(){_this.blockEnd()});
 					}
 				}
			},
	 		/**
	 		 * run a suite of line as child
	 		 */
	 		runChildBlock : function(block, onEndFunction) {
				var subContext = new Context(this.context);
	 			var childBlockRunner = new BlockRunner(subContext, block, this, this.lineProcessor);
	 			childBlockRunner.registerEndFunction(onEndFunction);
	 			var _this = this;
	 			childBlockRunner.registerEndFunction(function(){
	 				if (_this.currentLine < _this.lines.length) {
	 					_this.runNextLine();
	 				} else {
	 					//_this.endOfLineHandler();
	 				}
	 			});
	 			childBlockRunner.runNextLine();
	 		},
			getParent : function(){
				return this.parent;
			}
		}

 		// context is init on the runBlock function
 		var context = undefined;

 		var typeTranslation = {
 			"number" : "Nombre",
 			"boolean" : "Booleen",
 			"string" : "Chaine",
			"array" : "Tableau"
 		};

 		var RuntimeException = function(message, offset) {
 			this.message = message;
 			this.offset = offset;
 			this.name = 'RuntimeException';
 			this.toString = function(){
 				return this.message + (offset ? ' (ligne : ' + offset.line + ', colonne : ' + offset.column  + ')' : '')
 			}
 		}

 		/**
 		 * check the type of the value, if type is bad a runtime exception is throw
 		 */
 		var checkType = function(value, type, offset) {
 			if (typeof value == type || (type == 'array' && angular.isArray(value))) {
 				return true;
 			}
 			throw new RuntimeException(value + ' doit être du type ' + (typeTranslation[type] || type), offset);
 		}

 		var evaluateOperation = function(left, right, operator, offset) {
 			switch (operator) {
 				case '+' :
					if (typeof left == "string" || typeof right == "string") {
						left = toString(left);
						right = toString(right);
					}
 					return left + right;
 				case '-' :
 					checkType(left, "number", offset);
 					checkType(right, "number", offset);
 					return left - right;
 				case '*' :
 					checkType(left, "number", offset);
 					checkType(right, "number", offset);
 					return left * right;
 				case '/' : 					
 					checkType(left, "number", offset);
 					checkType(right, "number", offset);
 					return left / right;
 				case 'mod' :
 				case '%' : 					
 					checkType(left, "number", offset);
 					checkType(right, "number", offset);
 					return left % right;
 				case '>' : 					
 					return left > right;
 				case '<' : 
 					return left < right;
 				case '>=' :
 					return left >= right;
 				case '<=' :
 					return left <= right;
 				case '==' :
 					return left == right;
 				case '<>' :
 				case '!=' :
 					return left != right;
 				case '&&' : 					
 					checkType(left, "boolean", offset);
 					checkType(right, "boolean", offset);
 					return left && right;
 				case '||' :
 					checkType(left, "boolean", offset);
 					checkType(right, "boolean", offset);
 					return left || right;
 				default : 
 					return undefined;
 			}
 		}

 		/**
 		 * evaluate one expression
 		 */
 		var evaluateExpression = function(expression, context) {
 			if (typeof expression == "string" || typeof expression == "number" || typeof expression == "boolean") {
 				return expression;
 			}

 			if (expression.operation || expression.type == "comparaison" || expression.type == "boolean") {
 				var leftValue = evaluateExpression(expression.left, context);
 				var rightValue = evaluateExpression(expression.right, context);
 				return evaluateOperation(leftValue, rightValue, expression.operation, expression.offset);
 			}

 			if (expression.type == 'var') {
 				context.isset(expression.name, true, expression.offset);
 				
				var variable = context.getValue(expression.name);
				if (expression.indexs != undefined) {
					for (var i in expression.indexs) {
						index = expression.indexs[i];
						if (index == 'ADD_AT_END') {
							throw new RuntimeException('Vous devez préciser l\'indice de l\'element à accéder.', expression.offset);
						}
						var index = evaluateExpression(index, context);
						checkType(variable, 'array', expression.offset);
						variable = variable[index];
					}
				}
				if (variable == undefined) {
					output.info('La variable ' + expression.name + (index != undefined ? '['+index+']': '') + ' n\'est pas initialisée')
				}
				return variable;
 			}

 			if (expression.type == 'function') {
 				context.issetFunction(expression.name, true, expression.offset);
				
				var easyCodefunction = context.getFunction(expression.name);
				if (easyCodefunction) {
					var args = [];
					
					for (var i in expression.params) {
						args.push(evaluateExpression(expression.params[i], context));
					}
 					// appeller call sur la fonction
					return easyCodefunction.apply(undefined, args);
 				} else {
 					// throw error
 					throw new RuntimeException('La fonction ' + expression.name + ' n\'existe pas', expression.offset);
 				}
				return undefined;
 			}
			
			// array [1;2;3]
			if (expression.type == 'array') {
				var ret = [];
				for (var i in expression.elements) {
					var element = expression.elements[i];
					var value = evaluateExpression(element.expression, context);
					if (element.name != undefined) {
						ret[element.name] = value;
					} else {
						ret.push(value);
					}
				}
				return ret;
			}
 		}

		/**
		 * format value for write value
		 */
		var toString = function(value) {
			if (Array.isArray(value)) {
				var ret = '[';
				for (var i in value) {
					ret += ' ';
					if (isNaN(i)) {
						ret += i + ' : '
					}
					ret += toString(value[i]) + ',';
				}
				return ret.substring(0, ret.length - 1) + ' ]';
			}	
			return value;
		}
		
 		/**
 		 * run a command
 		 * write, read, affectation, define
 		 */
 		var runCommand = function(line, context, endFunction) {
 			if (line.commandName == 'write') {
				var string = toString(evaluateExpression(line.params[0], context));
				if (line.output && line.output == 'error') {
					output.error(string);
				} else if (line.output && line.output == 'info') {
					output.info(string);
				} else {
					output.write(string);
				}
			} else if (line.commandName == 'define') {
				context.defineVar(line.varname.name, line.vartype);
			} else if (line.commandName == 'affectation') { 
				context.isset(line.varname.name, true, line.offset);
				var value = evaluateExpression(line.expression, context);
				if (line.varname.indexs == undefined) {
					checkType(value, context.getType(line.varname.name), line.expression.offset || line.offset);
				}
				// TODO gérer les variables des objets	
				context.setValue(line.varname.name, value, line.varname.indexs);
			} else if (line.commandName == 'read') {
				var type = context.getType(line.varname.name);
				if (type == 'array') {
					output.info('Un tableau est une suite de valeurs séparée par des ";", par exemple 1;2;Bonjour;5');
				}
				input.read(function(value) { 						
					
					var translatedType = typeTranslation[type] || type;
					
					switch (type) {
						case 'number' :
							if (isNaN(value)) {
								output.info('L\'entrée doit être de type ' + translatedType + '. Entrez une nouvelle valeur');
								return false;
							}
						break;
						case 'boolean' :
							if (value != '1' && value != '0' && value != 'vrai' && value != 'faux') {
								output.info('L\'entrée doit être de type ' + translatedType + '. Entrez une nouvelle valeur (1, 0, vrai, faux)');
								return false;
							}
						break;
					}

					return true;
				}, function(value){
					var value = value;
					
					if (type == 'number') {
						value = parseInt(value, 10);
					} else if (type == 'boolean') {
						value = value == '1' || value == 'vrai';
					} else if (type == 'array') {
						value = value.split(';');
					}
					context.setValue(line.varname.name, value);
					endFunction && endFunction();
				});
				return false;
			}
			return true;
 		}

	 	var runLineProcessor = {
	 		runLine : function(line, context, blockRunner, nextLineFunction) {
		 		console.log(line);
				var runNextLine = true;
				if (line.type && line.type == 'command') {
	 				runNextLine = runCommand(line, context, nextLineFunction);
	 			} else if (line.type && line.type == 'condition') {
	 				var testResult = evaluateExpression(line.test, context);
	 				checkType(testResult, "boolean", line.offset);
	 				if (testResult) {
	 					blockRunner.runChildBlock(line.yes, nextLineFunction);
	 				} else if (line.no) {
	 					blockRunner.runChildBlock(line.no, nextLineFunction);
	 				}
	 				runNextLine = false;
	 			} else if (line.type && line.type == 'for') {
	 				context.isset(line.varname.name, true, line.offset);
					var step = line.step || 1;
					var start = line.start - step; // -1 because step begin by ++
	 				var end = line.end;
					
	 				context.setValue(line.varname.name, start);
	 				var nextStep = function(){ 			
	 					start += step;
	 					if (start <= end) {
	 						context.setValue(line.varname.name, start);
	 						blockRunner.runChildBlock(line.block, nextStep);
	 					} else {
	 						nextLineFunction && nextLineFunction();
	 					}
	 				};

	 				nextStep();
	 				runNextLine = false;
	 			} else if (line.type && line.type == 'forEach') {
					var varname = line.varname.name;
					var indiceVarname = (varname+'_index').toUpperCase();
					context.isset(varname, true, line.offset);
					context.defineVar(indiceVarname, 'NOMBRE');
					var array = evaluateExpression(line.array ,context);
					// get keys
					var keys = [];
					for (var i in array) {
						keys.push(i);
					}
					var arrayLength = keys.length;
					var i = -1;	// -1 because step begin by ++	
						
					var nextStep = function(){ 			
	 					i++;
	 					if (i < arrayLength) {
							var key = keys[i];
							var value = array[key];
	 						context.setValue(indiceVarname, key);
							context.setValue(varname, value);
							blockRunner.runChildBlock(line.block, nextStep);
	 					} else {
	 						nextLineFunction && nextLineFunction();
	 					}
	 				};

	 				nextStep();
	 				runNextLine = false;						
				} else if (line.type && line.type == 'while') {
	 				var test = line.test;
	 				var block = line.block;

	 				var nextStep = function(){
	 					var result = evaluateExpression(test, context);
	 					if (result === true) {
	 						blockRunner.runChildBlock(block, nextStep);
	 					} else {
	 						nextLineFunction && nextLineFunction();
	 					}
	 				}

	 				nextStep();
	 				runNextLine = false;
	 			} else if (line.type && line.type == 'function') {
					evaluateExpression(line, context);
				}

	 			// run the next line
	 			if (runNextLine) {
	 				nextLineFunction && nextLineFunction(); 				
	 			}
		 	}
		 }

	 	var initialContext = new Context();
	 	var initialBlockRunner = new BlockRunner(initialContext, expression, undefined, runLineProcessor);
	 	initialBlockRunner.registerEndFunction(function(){
 			output.info('Fin de l\'algorithme');
 		});

 		initialBlockRunner.runNextLine();
 		
 	}


 	return runner;
 });
