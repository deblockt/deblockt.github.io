/**
 * runner for easyCode expression parsed with the easyCodeParser.js
 */

 define(['easyCodeConfiguration', 'easyCodeContext', 'easyCodeRuntimeException'], function(easyCodeConfiguration, Context, RuntimeException){
 	


 	var runner = {};

 	/**
 	 * @param expression the expression give with easyCodeParser
 	 * @param output an object for write this object must have 3 methodes error, info, write they have one string parameter
 	 */
 	runner.run = function(expression, output, input) {
		var FUNCTIONS = easyCodeConfiguration.getFunctions();		
		var SKIP_FUNCTION = easyCodeConfiguration.getSkipedFunction();
	
		

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
		}

		BlockRunner.prototype = {			
			registerEndFunction : function(endFunction) {
				this.onEndFunction.push(endFunction);
			},
			blockEnd : function() {
				// run handler, the last handler is exec before
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
					output.error(e);
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
			haveARunningChild : function(){
				return this.proccessingChild != undefined;
			},
			endOfLineHandler : function(){
				// warn if a child running 
 				if (this.currentLine >= this.lines.length) {
 					if (!this.haveARunningChild()) {
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
	 			this.proccessingChild = childBlockRunner;
				var _this = this;
		
				childBlockRunner.registerEndFunction(function(){
					// unregister the child
					_this.proccessingChild = undefined;
					// call callback for this end of child block
					onEndFunction();
					// call the block next line if the child is finish
					if (_this.haveARunningChild() !== true && _this.currentLine < _this.lines.length) {
	 					_this.runNextLine();
	 				} else {
	 					//_this.endOfLineHandler();
	 				}
				});
				
	 			// run the first line of the child
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
 				// TODO ne pas evaluer la second partie pour un && avec la partie gauche à false. idem avec ou
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
				context.defineVar(line.varname, line.vartype);
			} else if (line.commandName == 'affectation') { 
				context.isset(line.varname.name, true, line.offset);
				var value = evaluateExpression(line.expression, context);
				if (line.varname.indexs == undefined) {
					checkType(value, context.getType(line.varname.name), line.expression.offset || line.offset);
				}
				var indexs = [];
				for (var i in line.varname.indexs) {
					indexs.push(evaluateExpression(line.varname.indexs[i], context));
				}
				// TODO gérer les variables des objets	
				context.setValue(line.varname.name, value, indexs.length == 0 ? undefined : indexs);
			} else if (line.commandName == 'read') {
				context.isset(line.varname.name, true, line.offset);
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
		 		var runNextLine = true;
				if (line.type && line.type == 'command') {
	 				runNextLine = runCommand(line, context, nextLineFunction);
	 			} else if (line.type && line.type == 'condition') {
	 				var testResult = evaluateExpression(line.test, context);
	 				checkType(testResult, "boolean", line.offset);
	 				if (testResult && line.yes && line.yes.length > 0) {
	 					blockRunner.runChildBlock(line.yes, nextLineFunction);
						runNextLine = false;
	 				} else if (line.no && line.no.length > 0) {
	 					blockRunner.runChildBlock(line.no, nextLineFunction);
						runNextLine = false;
	 				}
	 			} else if (line.type && line.type == 'for') {
	 				context.isset(line.varname, true, line.offset);
					var step = line.step ? evaluateExpression(line.step, context) : 1;
					var start = evaluateExpression(line.start, context) - step; // -1 because step begin by ++
	 				var end = evaluateExpression(line.end, context);
					
	 				context.setValue(line.varname, start);
	 				var nextStep = function(){ 	
						start += step;
	 					if (start <= end) {
							context.setValue(line.varname, start);
	 						blockRunner.runChildBlock(line.block, nextStep);
	 					} else {
							nextLineFunction && nextLineFunction();
	 					}
	 				};

	 				nextStep();
	 				runNextLine = false;
	 			} else if (line.type && line.type == 'forEach') {
					var varname = line.varname;
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
