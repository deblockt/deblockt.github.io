// a syntaxique validator for easyCode
define(['easyCodeConfiguration', 'codemirror/lib/codemirror', 'easyCodeContext'], function(easyCodeConfiguration, CodeMirror, Context){

	// add utils function
	CodeMirror.StringStream.prototype.eatTo = function(ch, returnRead) {
		var start = this.pos;
		if (this.skipTo(ch)) {
			if (returnRead === undefined || returnRead === true) {							
				return this.string.slice(start, this.pos);
			} else {
				return true;
			}
		}
		
		return false;				
	};
	CodeMirror.StringStream.prototype.textBetween = function(start, end) {
		return this.string.slice(start, end);
	}
	
	CodeMirror.StringStream.prototype.eatWord = function(toUpper) {
		var beforeIns = this.pos;
		if (!this.eatWhile(/[\w\$_]/)) {
			return false;
		}		
		var read = this.textBetween(beforeIns, this.pos);
		if (toUpper) {
			return read.toUpperCase();
		}
		return read;
	}
	
	// end
	
	
	var ExceptionConfig = {
		'errorEndOfLine' : {
			message : 'La ligne est mal terminée. Du code est présent après votre instruction'
		},
		'affectationHaveNotEquals' : {
			message : 'Une affectation doit avoir la forme suivante. variable = expression'
		},
		'blockNotEnded' : {
			message : 'Le block doit être terminé par {0}'
		},
		'typeNotExist' : {
			message : 'Ce type n\'existe pas. Les types possibles sont NOMBRE, CHAINE, BOOLEEN, TABLEAU'
		},
		'varnameErrorLanguage' : {
			message : 'Ce nom de variable ne peut pas être utilisé il fait partie du langage'
		},
		'lineBeginWithInstruction' : {
			message : 'Une ligne doit commencer par une instruction ou une affectation'
		},
		'writeOutput' : {
			message : 'La sortie peut être "erreur" ou "info"'
		},
		'defineBadWrited' : {
			message : 'La définition d\'une variable se faire de la facon suivante : DEFINIR nomDeVariable Type'
		},
		'ifMalFormated' : {
			message : 'Un Si s\'écrit de la facon suivante : \nSI condition\n	code\nSI_NON_SI condition\n	code\nSI_NON\n	code\nFIN_SI\nSI_NON_SI et SI_NON sont facultatifs'
		},
		'whileMalFormated' : {
			message : 'Un TANT_QUE s\'écrit de la facon suivante : \nTANT_QUE condition de continuité\n	code\nFIN_TANT_QUE'
		},
		'forMalFormated' : {
			message : 'Un POUR peux s\'écrire de deux façons : \nPOUR variable DE debutInclu A finInclu\n	code\nFIN_POUR\n\nou \nPOUR variable DANS unTableau\n	code\nFIN_POUR'
		},
		'simpleEqualsInExpression' : {
			message : 'Une égalité entre deux expression se fait avec l\'opérateur == et non pas ='
		},
		'exlamationPrevEquals' : {
			message : 'L\'opérateur de différence est le suivant != et non pas !'
		},
		'onlyBooleanAreAllow' : {
			message : 'Une expression booléenne est attendue'
		},
		'booleanNotAllowed' : {
			message : 'Cette expression ne doit pas retourner un booléen'
		},
		'emptyExpression' : {
			message : 'Une expression vide () n\'est pas autorisée'
		},
		'expressionNotEnded' : {
			message : 'Une expression qui commence par une ( doit être terminée par une )'
		},
		'arrayDefinitionNotEnded' : {
			message : 'Un tableau doit être défini de la facon suivante [1; 2; 3; 4; 5] ou ["indice" : value; "indice2" : value2]'
		},
		'expressionExpected' : {
			message : 'Une expression est attendue'
		},
		'arrayKeyMustBeString' : {
			message : 'Une clef de tableau doit être une chaine de caractére ou un nombre comme ceci : ["indice" : value] ou [10 : "bonjour"]'
		},
		'functionNotAllow' : {
			message : 'L\'appel à une fonction n\'est pas autorisé ici'
		},
		'squareNotClosed' : {
			message : 'Le signe {0} doit être fermé par {1}'
		},
		'varnameError' : {
			message : 'Un nombre de variable ne doit contenir que des caractére alphanumérique et _. Une variable ne doit pas commencer par un nombre'
		},
		'commentNotEnded' : {
			message : 'Votre commentaire n\'est pas fermé. Un commentaire peut être de la forme suivante :\n // commentaire sur une line\nou\n/* commentaire \nmultiline\n*/'
		},
		'stringNotEnded' : {
			message : 'Votre chaine de caractére n\'est pas fermée. Elle doit être fermée avec le caractére {0}. Par exemple "Bonjour j\\"aime les chats" ou \'Bonjour j\\\'aime les chats\''
		},
		'variableAlreadyDefined' : {
			message : 'La variable {0} est déjà définie'
		},
		'variableNotDefined' : {
			message : 'La variable {0} n\'est pas définie'
		}
	};
	
	var ParseException = function(msgCode, parameters, parserOrBegin, offsetEnd) {
		this.msg = msgCode;
		this.parameters = parameters;
		if (parserOrBegin instanceof Parser) {
			this.startOffset = parserOrBegin.startLinePos;
			this.endOffset = parserOrBegin.stream.pos;
		} else if (parserOrBegin.begin) {
			this.startOffset = parserOrBegin.begin;
			this.endOffset = parserOrBegin.end;
		} else {
			this.startOffset = parserOrBegin;
			this.endOffset = offsetEnd;
		}
	};
	
	ParseException.prototype = {
		toString : function() {
			var message = this.msg in ExceptionConfig ? ExceptionConfig[this.msg].message : this.msg;
			for (var i in this.parameters) {
				var value = this.parameters[i];
				if (Array.isArray(value)) {
					value = value.join(', ');
				}
				message = message.replace('{'+i+'}', this.parameters[i]);
			}
			return message;
		},
		getStart : function() {
			return this.startOffset;
		},
		getEnd : function() {
			return this.endOffset;
		}
	};
	
	var LanguageRunnerFactory = function(){
		// priority of operations
		this.operationPriority = {
			"-" : 1,
			"+" : 1,
			"&&" : 2,
			"||" : 3,
			"*" : 0,
			"/" : 0,
			"%" : 0
		};
		
		this.definedVars = {};
	};
	
	LanguageRunnerFactory.prototype = {
		/**
		 * create an affectation operation
		 */
		createAffectation : function(varname, expression, offset) {
			return {
				type : 'command', 
				commandName : 'affectation',
				varname : varname, 
				expression : expression, 
				offset : offset
			};
		},
		/**
		 * create a var call
		 */
		createVar : function(name, indexs, attribute, offset) {				
			return {
				type : 'var',
				name : name.toUpperCase(),
				offset : offset,
				indexs : indexs,
				attribute : attribute
			};
		},
		/**
		 * create a function call
		 */
		createFunctionCall : function(name, indexs, params, offset) {
			return {
				type : 'function', 
				name : name.toLowerCase(),
				params : params,
				offset : offset
			};
		},	
		/**
		 * create an arithmetique or boolean instruction
		 */
		createOperation : function(operation, left, right, type, offset) {
			if (right 
					&& right.operation 
					&& !right.priority 
					&& this.operationPriority[right.operation] >= this.operationPriority[operation]
					&& right.type == type
				) {
				
				// récupération de l'element le plus à droites
				// il faut en fait ajouter l'operation à la gauche de l'operation de droit
				// mostLeft représente le dernier objet qui a un element à gauche
				var mostLeft = right;
				while (mostLeft.left.left 
					&& !mostLeft.left.priority 
					&& mostLeft.left.type == mostLeft.type
					&& this.operationPriority[mostLeft.left.operation] >= this.operationPriority[mostLeft.operation]
				) {
					mostLeft = mostLeft.left;
				}
				
				// on va recréer l'operation courrante dans la partie la plus à gauche
				mostLeft.left = this.createArithmetique(operation, left , mostLeft.left, offset);
				return right;
			}
			
			return {
				type : type,
				priority : false,
				operation : operation,		
				left : left,
				right : right,
				offset : offset
			}
		},	
		createArithmetique : function(operation, left, right, offset) {
			return this.createOperation(operation, left, right, "numerique", offset);
		},	
		createArithmetiqueBoolean : function(operation, left, right, offset) {
			if (left.operation 
					&& !left.priority 
					&& this.operationPriority[left.operation] >= this.operationPriority[operation]
					&& left.type == 'boolean'
				) {
				
				// récupération de l'element le plus à droites
				// il faut en fait ajouter l'operation à la gauche de l'operation de droit
				// mostLeft représente le dernier objet qui a un element à gauche
				var mostRight = left;
				while (mostRight.right.right 
					&& !mostRight.right.priority 
					&& mostRight.right.type == mostRight.type
					&& this.operationPriority[mostRight.right.operation] >= this.operationPriority[mostRight.operation]
				) {
					mostRight = mostRight.right;
				}
				
				// on va recréer l'operation courrante dans la partie la plus à gauche
				mostRight.right = this.createArithmetiqueBoolean(operation, mostRight.right , right, offset);
				return left;
			}
			
			return {
				type : 'boolean',
				priority : false,
				operation : operation,		
				left : left,
				right : right,
				offset : offset
			};
		},
		createComparison : function(left, right, oper, offset) {
			return {type : 'comparaison', left : left, right : right, operation : oper, offset : offset};
		},
		createWrite : function(expression, output) {
			return {
				type : 'command',
				commandName : 'write',
				params : [expression],
				output : output
			};
		},		
		/**
		 * create a condition structure
		 */
		createCondition : function(test, yes, no, offset) {
			return {
				type : 'condition',
				test : test,
				yes : yes,
				no : Array.isArray(no) || no == undefined ? no : [no],
				offset : offset
			};
		},
		createWhile : function (test, body, offset) {
			return {
				type : 'while',
				test : test, 
				block : body,
				offset : offset
			};
		},
		createFor : function(varname, start, end, step, block, offset) {
			return {
				type : 'for', 
				varname : varname,
				start : start,
				end : end, 
				block : block, 
				offset : offset, 
				step : step
			}
		},
		createForEach : function (varname, array, block, offset) {
			return {
				type : 'forEach',
				varname : varname,
				array : array,
				block : block,
				offset : offset
			}
		},
		createArray : function(elements, offset) {
			return {offset : offset, elements : elements, type : 'array'};
		},
		createOffset : function(start, end) {
			if (start instanceof Parser) {
				return {
					begin : start.startLinePos,
					end : start.stream.pos
				};
			} 
			return {
				begin : start,
				end : end
			}
		},
		createDefine : function(varname, varType, offset) {
			return {type : 'command', commandName : 'define', varname : varname, vartype : varType, offset : offset};
		},
		createRead : function(varcall, offset) {
			return {type : 'command', commandName : 'read', varname : varcall, offset : offset}
		}
	};
	
	var Parser = function(factory, parentContext) {
		this.languageRunnerFactory = factory || new LanguageRunnerFactory();
		this.languageInstruction = {
			'ECRIRE'	: this.parseWrite,
			'DEFINIR'	: this.parseDefine,
			'LIRE'		: this.parseRead,
			'SI'		: this.parseIf,
			'TANT_QUE'	: this.parseWhile,
			'POUR' 		: this.parseFor
		};
		this.blocs = {
			'if'	: ['SI_NON_SI','SI_NON', 'FIN_SI'],
			'while'	: ['FIN_TANT_QUE'],
			'for'	: ['FIN_POUR']
		};
		this.forConfig = {
			'at'	: 'A',
			'to'	: 'DE',
			'in'	: 'DANS',
			'step'	: 'PAR',
		};
		this.writeOutput = easyCodeConfiguration.writeOutput();
		
		this.languageWord = ['NOMBRE', 'CHAINE', 'TABLEAU', 'BOOLEEN', 'ECRIRE', 'DEFINIR', 'LIRE', 'SI', 'TANT_QUE', 'POUR', 'SI_NON_SI', 'SI_NON', 'FIN_SI', 'FIN_POUR', 'FIN_TANT_QUE', 'FIN_POUR', 'A', 'DE', 'DANS', 'PAR'];
		this.numberRegex = /[0-9]/;
		this.varnameRegex = /[a-zA-Z0-9_]/;
		this.operationRegex = /[+\-*\/%]/;
		this.spaces = /[\ \t]/;
		this.booleanName = easyCodeConfiguration.getBooleanName();
		this.booleanOperation = {ET : '&&', OU : '||'};
		this.varTypes = easyCodeConfiguration.getVarTypes();
		this.END_OF_BLOCK = 'endOfBlock';
		this.context = new Context(parentContext);
	};
	
	Parser.prototype = {
		initParser : function(content){
			if (content instanceof CodeMirror.StringStream) {
				this.stream = content;
			} else {
				this.stream = new CodeMirror.StringStream(content + '\n', 4);
			}				
		},
		/**
		 * check if we are at end of line
		 * if not throw a errorEndOfLine
		 */
		checkEndOfLine : function() {
			// it's line test if we are at end of line
			this.stream.eatWhile(this.spaces);
			
			if (this.stream.eat('/')) {
				this.parseComment();
			}
			
			// check if we are at the end of the line
			if (!this.stream.eat('\n') && !this.stream.eol()) {
				var beforeSkip = this.stream.pos;
				this.stream.skipTo('\n');
				throw new ParseException('errorEndOfLine', undefined, beforeSkip, this.stream.pos);
			}
		},
		/**
		 * parse a easyCode content a return an array 
		 * {
		 *   result : treeParsed,
		 *   errors : [Error, Error]
		 * }
		 */
		parse : function(content, endBlock) {
			this.initParser(content);
			var parseResult = [];
			var errors = [];
			var startParsing = this.stream.pos;
			// start the parsing
			while (!this.stream.eol()) {
				try {
					var startLine = this.stream.pos;
					var line = this.parseLine(endBlock);
					
					// is a end block stop immediatly to parse
					if (typeof line == "string" && line.indexOf(this.END_OF_BLOCK) === 0) {
						return {endInstruction : line.slice(this.END_OF_BLOCK.length + 1, line.length), result : parseResult, errors : errors, context : this.context};
					} else {
						this.checkEndOfLine();
						if (line != undefined) {
							// add the line to the result
							parseResult.push(line);
						}
					}
				} catch (e) {
					if (e instanceof ParseException) {
						errors.push(e);
					} else if (e.errors) {
						for (var i in e.errors) {
							errors.push(e.errors[i]);
						}
					}
					console.log(e);
					// go at the end of the line
					this.stream.skipTo('\n');
				}
			}
			
			if (endBlock && errors.length == 0) {
				throw new ParseException('blockNotEnded', [endBlock], startParsing, this.stream.pos);
			}
			
			return {errors : errors, result : parseResult, context : this.context};			
		},
		/**
		 * parse a line code, all line type can be parse affectation, write, etc.
		 */
		parseLine : function(endBlock) {
			// for error management
			this.startLinePos = this.stream.pos;
			// we eat space at the begining of the line
			this.stream.eatWhile(this.spaces);
			// read the first car for know what operation can be do
			var ch = this.stream.next();
			
			// end of file or empty line
			if (ch == undefined || ch == '\n') {	
				this.stream.backUp(1);
				return undefined;
			}
			
			// exect action in function of ch
			if (ch == '/') {
				return this.parseComment();				 
			} else  {				
				this.stream.backUp(1);
				// it's an other instruction
				var instruction = this.stream.eatWord(true);
				
				if (instruction === false) {
					throw new ParseException('lineBeginWithInstruction', undefined, this.startLinePos, this.stream.pos);
				}
				
				// is an language instruction
				if (endBlock && Array.indexOf(endBlock, instruction) >= 0) {
					return 'endOfBlock:'+instruction;
				}
				
				if (instruction in this.languageInstruction) {
					this.stream.eatWhile(this.spaces);
					// have an instruction run the method
					return this.languageInstruction[instruction].call(this, instruction);
				}
				
				// it's an affectation
				return this.parseAffectation(instruction);
			}
		},
		/**
		 * parse a write line ECRIRE expression 'output'<'erreur'/'info'>
		 */
		parseWrite : function() {
			var expr = this.parseExpression();
			var output = 'output';
			this.stream.eatWhile(this.spaces);
			var stringLimiter = this.stream.peek();
			if (this.stream.eat('"') || this.stream.eat("'")) {
				var startOutput = this.stream.pos - 1;
				output = this.parseString(stringLimiter).toLowerCase();
				if (output in this.writeOutput) {
					output = this.writeOutput[output];
				} else {
					throw new ParseException('writeOutput', undefined, startOutput, this.stream.pos);
				}
			}
			
			return this.languageRunnerFactory.createWrite(expr, output, this.languageRunnerFactory.createOffset(this));
		},
		/**
		 * parse a define line DEFINIR varname vartype
		 */
		parseDefine : function() {
			var beforeVarName = this.stream.pos;
			var varname = this.parseVarname();
			if (this.stream.eatWhile(this.spaces)) {
				var beforeType = this.stream.pos;
				var varType = this.stream.eatWord(true);
				if (!(varType in this.varTypes)) {
					throw new ParseException('typeNotExist', undefined, beforeType, this.stream.pos);
				}
				// add the var on the context
				if (this.context.isset(varname, false)) {
					throw new ParseException('variableAlreadyDefined', [varname], beforeVarName, beforeType);
				}
				this.context.defineVar(varname, this.varTypes[varType]);
				
				return this.languageRunnerFactory.createDefine(varname, this.varTypes[varType], this.languageRunnerFactory.createOffset(this));
			} 

			throw new ParseException('defineBadWrited', undefined, this);			
		},
		/**
		 * parse a read line LIRE varcall without function
		 */
		parseRead : function() {
			var name = this.parseVarname();
			var varcall = this.parseVarCall(name, false);
			
			if (!this.context.isset(name, false)) {
				throw new ParseException('variableNotDefined', [name], this);
			}
			
			return this.languageRunnerFactory.createRead(varcall, this.languageRunnerFactory.createOffset(this));
		},
		/**
		 * parse an affectation line varName = 0
		 */
		parseAffectation : function(varname) {
			// go back of varname length
			this.stream.backUp(varname.length);
			
			var current = this.stream.pos;
			var varname = this.parseVarCall(this.parseVarname(), false);
			this.stream.eatSpace();
			if (!this.stream.eat('=')) {
				throw new ParseException('affectationHaveNotEquals', undefined, this);
			}
			var expression = this.parseExpression();
			return this.languageRunnerFactory.createAffectation(varname, expression, current);
		},
		/**
		 * parse a sub block used for if while for
		 */
		parseChild : function(endBlock) {
			var parser = new Parser(this.languageRunnerFactory, this.context);
			var from = this.stream.pos;
			var body = parser.parse(this.stream, endBlock);
			var to = this.stream.pos;
			
			body.context.setRange(from, to);
			
			if (body.errors && body.errors.length > 0) {
				throw {errors : body.errors};
			}
			return body;
		},
		/**
		 * parse a if expression
		 * SI test
		 * SI_Non SI test
		 * SI_NON
		 * FIN_SI
		 */
		parseIf : function(instructionName) {
			if (this.stream.eat('\n')) {
				throw new ParseException('ifMalFormated', undefined, this);
			}

			var beforeExpression = this.stream.pos;
			var conditionalExpression = this.parseExpression();
						
			
			this.checkEndOfLine();			
			
			var body = this.parseChild(this.blocs['if']);						
			var elseBlock = undefined;
			
			// it's a else instruction
			if (body.endInstruction == this.blocs['if'][1]) {
				this.checkEndOfLine();				
				// it's a else a simple else bloc must be finished by a ENd_IF
				var elseBlock = this.parseChild([this.blocs['if'][2]]);
				elseBlock = elseBlock.result;				
			} else if (body.endInstruction == this.blocs['if'][0]) {				
				// it's must be a else if so launch a new if parse
				var elseBlock = this.parseIf(instructionName);
			}
			
			return this.languageRunnerFactory.createCondition(conditionalExpression, body.result, elseBlock, this.languageRunnerFactory.createOffset(beforeExpression, this.stream.pos));
		},
		/**
		 * parse a while expression TANT_QUE test {body} FIN_TANT_QUE
		 */
		parseWhile : function(instructionName) {
			if (this.stream.eat('\n')) {
				throw new ParseException('whileMalFormated', undefined, this);
			}
			var beforeExpression = this.stream.pos;
			var conditionalExpression = this.parseExpression();
			
			this.checkEndOfLine();
			
			var body = this.parseChild(this.blocs['while']);
			
			return this.languageRunnerFactory.createWhile(conditionalExpression, body.result, this.languageRunnerFactory.createOffset(beforeExpression, this.stream.pos));
		},
		/**
		 * parse a for instruction POUR varname DE x A y  || POUR varname DANS array<varCall>
		 */
		parseFor : function(instructionName) {
			if (this.stream.eat('\n')) {
				throw new ParseException('forMalFormated', undefined, this);
			}

			var varname = this.parseVarname();
			var start = this.stream.pos;
			this.stream.eatSpace();
			
			// to or in		
			var instruction = this.stream.eatWord(true);
			
			if (instruction == this.forConfig['to']) {
				this.stream.eatSpace();
				var to = this.parseExpression();
				
				this.stream.eatSpace();
				var atInstruction = this.stream.eatWord(true);
				
				if (atInstruction == this.forConfig['at']) {
					var at = this.parseExpression();
					
					// test if step is present
					var beforeParseStep = this.stream.pos;
					this.stream.eatSpace();
					var stepInstruction = this.stream.eatWord(true);
					var stepValue = undefined;
					if (stepInstruction == this.forConfig['step']) {
						stepValue = this.parseExpression();
					} else {
						// no step do backup
						this.stream.backUp(this.stream.pos - beforeParseStep);
					}
					
					this.checkEndOfLine();
										
					var body = this.parseChild(this.blocs['for']);	
					return this.languageRunnerFactory.createFor(varname, to, at, stepValue, body.result, this.languageRunnerFactory.createOffset(start, this.stream.pos));
				}
			} else if (instruction == this.forConfig['in']) {
				this.stream.eatSpace();
				var array = this.parseExpression();
				
				this.checkEndOfLine();
								
				var body = this.parseChild(this.blocs['for']);
				// create the for instruction
				return this.languageRunnerFactory.createForEach(varname, array, body.result, this.languageRunnerFactory.createOffset(start, this.stream.pos));
			}
			
			throw new ParseException('forMalFormated', undefined, this);			
		},
		/**
		 * parse an expression 
		 */
		parseExpression : function(){
			return this.parseComparaisonExpression();
		},
		/**
		 * parse and return an operator
		 */
		parseComparaisonOperator : function() {
			var startOperator = this.stream.pos;
			var operator = undefined;
			// eatSpace
			this.stream.eatSpace();
			
			if (this.stream.eat('<')) {
				if (this.stream.eat('>')) {
					operator = '!=';
				} else if (this.stream.eat('=')) {
					operator = '<=';
				} else {
					operator = '<';
				}
			}
			
			if (this.stream.eat('>')) {
				if (this.stream.eat('=')) {
					operator = '>=';
				} else {
					operator = '>';
				}
			}
			
			if (this.stream.eat('=')) {
				if (this.stream.eat('=')) {
					operator = '==';
				} else {
					throw new ParseException('simpleEqualsInExpression', undefined, startOperator, this.stream.pos);
				}
			}
			
			if (this.stream.eat('!')) {
				if (this.stream.eat('=')) {
					operator = '!=';
				} else {
					throw new ParseException('exlamationPrevEquals', undefined, startOperator, this.stream.pos);
				}
			}
			
			if (operator == undefined) {
				this.stream.backUp(this.stream.pos - startOperator);
			}
			
			return operator;
		},
		/**
		 * parse boolean operator like ET or OU {@see this.booleanOperation}
		 */
		parseBooleanOperator : function() {
			// have a boolean operation
			var _booleanOperation = this.booleanOperation;
			var checkCarValidForBoolean = function(car, pos) {
				if (car == undefined) {
					return false;
				}
				var retour = false;
				car = car.toUpperCase();
				for (var key in _booleanOperation) {
					if (key.charAt(pos) == car) {
						return true;
					}
				}
				return retour;
			}
			
			var beforReadOperator = this.stream.pos;
			this.stream.eatSpace();
			var car = this.stream.next();
			var booleanOperation = '';
			
			while (checkCarValidForBoolean(car, booleanOperation.length)) {
				booleanOperation += car;
				car = this.stream.next();				
			}
			booleanOperation = booleanOperation.toUpperCase();
			// it's a boolean operation
			if (booleanOperation in this.booleanOperation) {
				return booleanOperation;
			}
			
			// go back for non operator read
			this.stream.backUp(this.stream.pos - beforReadOperator);
			return undefined;
		},
		/**
		 * parse a comparaison expression
		 */
		parseComparaisonExpression : function() {
			var left = this.parseComparaison();
						
			// boolean operation feature
			var booleanOperation = this.parseBooleanOperator();
			// it's a boolean operation
			while (booleanOperation != undefined) {			
				this.stream.eatSpace();
				var current = this.stream.pos;
				var right = this.parseComparaison();
				
				// only boolean expression can be used by && and ||
				if (
					(typeof right != 'boolean' && right.type != 'boolean' && right.type != 'comparaison' && right.type != 'function')
				 || (typeof left != 'boolean'  && left.type  != 'boolean' && left.type  != 'comparaison' && left.type  != 'function')
				) {
					throw new ParseException('onlyBooleanAreAllow', undefined, current, this.stream.pos);
				}
				
				
				left = this.languageRunnerFactory.createArithmetiqueBoolean(
					this.booleanOperation[booleanOperation], 
					left,
					right,
					current
				);
				booleanOperation = this.parseBooleanOperator();
			}
			
			return left;
			
		},
		/**
		 * parse a comparaison expression expr1 == expr2 , expr1 <= expr2 etc.
		 */
		parseComparaison : function() {
			var current = this.stream.pos;
			var left = this.parseArithmeticalExpression();
			var comparisonOperator = this.parseComparaisonOperator();
				
			// an operator is not necessary
			if (comparisonOperator) {
				this.stream.eatSpace();
				var right = this.parseComparaison();
				
				return this.languageRunnerFactory.createComparison(left, right, comparisonOperator, this.languageRunnerFactory.createOffset(current, this.stream.pos));
			} 
			
			return left;
		},
		/**
		 * parse an expression, the stream must be at the start of the expression
		 */
		parseArithmeticalExpression : function() {
			var current = this.stream.pos;
			var left = this.parsePrimitive();
			
			// an expression can have an operation
			var beforeEatSpace = this.stream.pos;
			this.stream.eatSpace();
			// have an arithmetique operation ?
			var operation = this.stream.eat(this.operationRegex);
			// if it's an operation and not a comment
			if (operation && !(operation == '/' && (this.stream.peek() == '/' || this.stream.peek() == '*'))) {
				this.stream.eatSpace();
				var right = this.parseArithmeticalExpression();
				
				// boolean is not allowed
				if (typeof left == 'boolean' || typeof right == 'boolean') {
					throw new ParseException('booleanNotAllowed', undefined, current, this.stream.pos);
				}	
				
				return this.languageRunnerFactory.createArithmetique(operation, left, right, this.languageRunnerFactory.createOffset(current, this.stream.pos));
			} else {
				// no operation go back
				this.stream.backUp(this.stream.pos - beforeEatSpace);
			}
			
			return left;
		},
		/**
		 * parse a primitive value can be a string, a var, a number, or an other expression ()
		 */
		parsePrimitive : function(){
			var startPos = this.stream.pos;
			this.stream.eatSpace();
			var curCh = this.stream.next();
			if (curCh == '(') {
				// empty expression ()
				if (this.stream.eat(')')) {
					throw new ParseException('emptyExpression', undefined, this.stream.pos);
				}
				var current = this.stream.pos;
				var expr = this.parseExpression();
				if (!this.stream.eat(')')) {
					throw new ParseException('expressionNotEnded', undefined, this.languageRunnerFactory.createOffset(current, this.stream.pos));
				}
				expr.priority = true;
				return expr;
			} else if (curCh == "'" || curCh == '"') {
				return this.parseString(curCh);
			} else if (curCh == '[') {
				var current = this.stream.pos;
				if (this.stream.eat(']')) {
					this.stream.backUp(1);
				} else {
					// parse array content
					var arrayContent = [];
					do {
						arrayContent.push(this.parseArrayCell());
					} while (this.stream.eat(';'));
				}

				this.stream.eatSpace();
				// array definition
				if (!this.stream.eat(']')) {
					throw new ParseException('arrayDefinitionNotEnded', undefined, this.languageRunnerFactory.createOffset(current, this.stream.pos));
				}

				return this.languageRunnerFactory.createArray(arrayContent, this.languageRunnerFactory.createOffset(current, this.stream.pos));
			} else {
				this.stream.backUp(1);
				// it's a varName
				if (isNaN(curCh)) {
					var varname = this.parseVarname();		
					// it'a a boolean value
					if (varname in this.booleanName) {
						return this.booleanName[varname];
					}
					var ret = this.parseVarCall(varname, true);
					// if it's variable check is var isser
					if (ret.type == 'var') {
						if (!this.context.isset(ret.name, false)) {
							throw new ParseException('variableNotDefined', [ret.name], ret.offset);
						}						
					}
					
					return ret;
				} else if (this.numberRegex.test(curCh)){
					return this.parseNumber();
				}
			}
			
			throw new ParseException('expressionExpected', undefined, this.languageRunnerFactory.createOffset(startPos, this.stream.pos));
		},
		/**
		 * parse an array cell like
		 * 0 : expression
		 * 'bonjour' : expression
		 * expression
		 */
		parseArrayCell : function() {
			var current = this.stream.pos;
			// eat array space
			this.stream.eatSpace();
			var valueOrKey = this.parseExpression();

			this.stream.eatSpace();
			if (this.stream.eat(':')) {
				if (typeof valueOrKey != 'string' && typeof valueOrKey != 'number') {
					throw new ParseException('arrayKeyMustBeString', undefined, this.languageRunnerFactory.createOffset(current, this.stream.pos));
				}
				this.stream.eatSpace();
				var value = this.parseExpression();
				return {expression : value, name : valueOrKey, offset : this.languageRunnerFactory.createOffset(current, this.stream.pos)};
			}

			return {expression : valueOrKey, offset : this.languageRunnerFactory.createOffset(current, this.stream.pos)};
		},
		/**
		 * parse a number it can be 1 1.0 1,01
		 */
		parseNumber : function(){
			var start = this.stream.pos;
			// eat number
			this.stream.eatWhile(this.numberRegex);
			var integer = this.stream.textBetween(start, this.stream.pos);
			
			if (this.stream.eat('.') || this.stream.eat(',')) {
				var start = this.stream.pos;
				this.stream.eatWhile(this.numberRegex);
				var decimal = this.stream.textBetween(start, this.stream.pos);
				return parseFloat(integer + '.' + decimal);
			}
			
			return parseInt(integer, 10);
		},
		/**
		 * parse a var :
		 *  - just a var name
		 *  - function call
		 */
		parseVarCall : function(varname, allowFunction){
			
			var indexs = undefined;
			var isFunction = false;
			var params = [];
			
			// eatSpace
			this.stream.eatWhile(this.spaces);
			var current = this.stream.pos;
			// check if it's a function call
			if (this.stream.eat('(')) {
				if (!allowFunction) {
					throw new ParseException('functionNotAllow', undefined, current, this.stream.pos);
				}
				
				this.stream.eatSpace();
				
				params = this.parseFunctionParameters();
				
				// TODO gérer les variables dans les appeles de fonctions
				if (!this.stream.eat(')')) {
					throw new ParseException('squareNotClosed', ['(', ')'], current, this.stream.pos);
				}	
				isFunction = true;
			}
			
			// array access
			if (this.stream.eat('[')) {
				indexs = [];
				do {
					indexs.push(this.parseVarIndex());
				} while (this.stream.eat('['));
			}
			
			if (!isFunction) {
				return this.languageRunnerFactory.createVar(varname, indexs, undefined, current);
			} else {
				return this.languageRunnerFactory.createFunctionCall(varname, indexs, params, current);
			}			
		},
		/**
		 * parse function parameters (param1 ; param2; param3; param4 ; param5)
		 */
		parseFunctionParameters : function() {
			this.stream.eatSpace();
			if (this.stream.peek() == ')') {
				return [];
			}
			
			var params = [];
			do {
				this.stream.eatSpace();
				params.push(this.parseExpression());
				this.stream.eatSpace();
			} while (this.stream.eat(';'));
			
			return params;
		},
		/**
		 * read a varname
		 */
		parseVarname : function() {
			var current = this.stream.pos;
			this.stream.eatWhile(this.varnameRegex);
			var varname = this.stream.textBetween(current, this.stream.pos).toUpperCase();			
			if (varname.trim().length == 0) {
				throw new ParseException('varnameError', undefined, current, this.stream.pos);
			}
			
			if (Array.indexOf(this.languageWord, varname) >= 0) {
				this.stream.backUp(this.stream.pos - current);
				throw new ParseException('varnameErrorLanguage', undefined, current, this.stream.pos + varname.length);
			}
			return varname;
		},
		/**
		 * par an index of array
		 */
		parseVarIndex : function(){
			var current = this.stream.pos;
			this.stream.eatSpace();
			// case []
			if (this.stream.eat(']')) {
				return 'ADD_AT_END';
			}
			var indexExpression = this.parseExpression();
			
			if (!this.stream.eat(']')) {
				throw new ParseException('squareNotClosed', ['[', ']'], current, this.stream.pos);
			}
			return indexExpression;
		},
		/**
		 * parse a comment warning the stream must be place after the first /
		 */
		parseComment : function() {
		  var start = this.stream.pos;
		  // cas d'un commentaire multiligne
		  if (this.stream.eat("*")) {
			// on va jusqu'a la fin potentiel du commentaire
			var isEnded = false;
			do {
				isEnded = this.stream.skipTo('*');
				if (!isEnded) {
					this.stream.skipToEnd();
					throw new ParseException('commentNotEnded', undefined, start - 1, this.stream.pos);
				}
				// eat the * who are not eat by skipTo
				this.stream.eat('*');
				isEnded = this.stream.eat('/');
			} while (!isEnded);
		  } else if (this.stream.eat("/")) {
			// cas d'un commentaire sur une seul ligne on va simplement à la fin de la ligne
			this.stream.skipTo('\n');
		  }
		},
		/**
		 * parse a comment string the stream must be place after the first " or '
		 */
		parseString : function(delimiter) {
			var current = this.stream.pos;
			var stringRead = this.stream.eatTo(delimiter);
			if (stringRead === false) {
				this.stream.skipToEnd();
				throw new ParseException('stringNotEnded', [delimiter], current, this.stream.pos);
			}
			// if the prev is \ it's not the end of the string
			var prev = this.stream.string.slice(this.stream.pos - 1, this.stream.pos);
			// read the " not read by the eatTo
			this.stream.next();	
			if (prev == '\\') {				
				// go to the next car
				subStringRead = this.parseString(delimiter);
				stringRead += delimiter + subStringRead;
			}

			return stringRead;	
		}
	};


	return Parser;
});