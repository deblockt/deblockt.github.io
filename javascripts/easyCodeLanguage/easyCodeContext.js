define(['easyCodeRuntimeException'], function(RuntimeException){

	/**
	 * context class
	 * context contains line to execute, current scope var
	 */
	var Context = function(parent) {
		if (parent) {
			parent.addChild(this);
		}
		this.parent = parent;
		this.functions = {};
		this.vars = {};
		this.childs = [];
		this.from = 0;
		this.to = 0;
	}

	Context.prototype = {
		setRange : function(from, to) {
			this.from = from;
			this.to = to;
		},
		addChild : function(context) {
			this.childs.push(context);
		},
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
		},
		getAccessibleVars : function(){
			var ret = {};
			
			if (this.getParent()) {
				var parentVars = this.getParent().getAccessibleVars();
				for (var i in parentVars) {
					ret[i] = parentVars[i];
				}
			}
			
			for  (varName in this.vars) {
				ret[varName] = this.vars[varName].type;
			}
			
			return ret;
		},
		getContextFor : function(pos){
			for (var i in this.childs) {
				var child = this.childs[i];
				if (pos >= child.from && pos <= child.to) {
					return child.getContextFor(pos);
				}
			}
			
			return this;
		}
	};
		
	return Context;
});