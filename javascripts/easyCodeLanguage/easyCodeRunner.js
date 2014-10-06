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
		/**
	 	 * context class
	 	 * context contains line to execute, current scope var
	 	 */
		var Context = function(parent) {
			this.parent = parent;
		}

		Context.prototype = {
			isset : function(varName, exceptionMode, offset) {
				if  (varName in this) {
					return true;
				}
				var parentIsset = this.getParent() && this.getParent().isset(varName, exceptionMode, offset);
				if (!parentIsset && exceptionMode) {
					throw new RuntimeException('La variable ' + varName + ' n\'est pas definie', offset);
				}
				return parentIsset || false;
			},
			getVar : function(varName) {
				if (this[varName]) {
					return this[varName];
				}
				if (this.getParent()) {
					return this.getParent().getVar(varName);
				}
				return undefined;
			},
			getValue : function(varName) {
				return this.getVar(varName).value;
			},
			getType : function(varName) {
				return this.getVar(varName).type;
			},
			setValue : function(varName, value) {
				// TODO add type check
				this.getVar(varName).value = value;
			},
			defineVar : function(varName, type) {
				this[varName] = {
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
	 			var runNextLine = true;
	 			var _this = this;
				try {
					this.lineProcessor.runLine(line, this.context, this, function(){
						endOfLine && endOfLine();
						_this.runNextLine();
					});	
				} catch (e) {
					this.haveFatalError();
					output.error(e.toString());
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
 			"string" : "Chaine"
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
				if (variable == undefined) {
					// TODO maybe throw error
					output.error('La variable ' + expression.name + ' n\'est pas initialisée')
				}
				return variable;
 			}

 			if (expression.type == 'function') {
 				if (window[expression.name]) {
 					// ajouter un traitement pour les fonctions
 					output.error('Les fonction ne sont pas gérée pour le moment')
 				} else {
 					// throw error
 					throw new RuntimeException('La fonction ' + expression.name + ' n\'existe pas', expression.offset);
 				}
 			}
 		}

 		/**
 		 * run a command
 		 * write, read, affectation, define
 		 */
 		var runCommand = function(line, context, endFunction) {
 			if (line.commandName == 'write') {
				output.write(evaluateExpression(line.params[0], context));
			} else if (line.commandName == 'define') {
				context.defineVar(line.varname.name, line.vartype);
			} else if (line.commandName == 'affectation') { 
				context.isset(line.varname.name, true, line.offset);
				var value = evaluateExpression(line.expression, context);
				checkType(value, context.getType(line.varname.name), line.expression.offset || line.offset);
				// TODO gérer l'index pour les tableaux
				// TODO gérer les variables des objets
				context.setValue(line.varname.name, value);
			} else if (line.commandName == 'read') {
				input.read(function(value) { 						
					var type = context.getType(line.varname.name);
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
					var type = context.getType(line.varname.name);
					if (type == 'number') {
						value = parseInt(value, 10);
					} else if (type == 'boolean') {
						value = value == '1' || value == 'vrai';
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
	 				var start = line.start - 1; // -1 because step begin by ++
	 				var end = line.end;

	 				context.setValue(line.varname.name, start);
	 				var nextStep = function(){ 			
	 					start++;
	 					if (start <= end) {
	 						context.setValue(line.varname.name, start);
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