define([], function(){
	var config = {};
	
	// list of accessib default function of language
	config.functions = {
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
			//checkType(value, 'array');
			// TODO optimiser le traitement en créer une nouvelle structure de donnée pour la gestion des tableaux
			// this is do for associative array
			var size = 0;
			for (var i in value) {
				size++;
			}
			return size;
		},
		'arondi_inferieur' : Math.floor,
		'arondi_superieur' : Math.ceil	
	};
	
	// list of javascript function to ignore
	config.skipedFunction = ['eval'];
	
	// block used for syntaxe higlight
	config.blocNames = {
		'SI'  : ['FIN_SI', 'SI_NON', 'SI_NON_SI'],
		'TANT_QUE' : ['FIN_TANT_QUE'],
		'POUR' : ['FIN_POUR'],
		'SI_NON_SI' : ['FIN_SI', 'SI_NON', 'SI_NON_SI'],
		'SI_NON' : ['FIN_SI']
    };
	
	// blocks use for fold usage
	config.foldBlocks = {
	  'SI' : 'FIN_SI',
	  'POUR' : 'FIN_POUR',
	  'TANT_QUE' : 'FIN_TANT_QUE'
	};
	
	config.autoCloseTag = {
		'SI ' : 'FIN_SI', // if have a space because SI have a SI_NON two have I car
		'POUR' : 'FIN_POUR',
		'TANT_QUE' : 'FIN_TANT_QUE'
	};
	
	// use for validator
	config.openBlock = {
		'SI' : {tag : 'if', error : 'Un SI doit être terminé par un FIN_SI'}, 
		'POUR' : {tag : 'for', error : 'Un POUR doit être terminé par un FIN_POUR'},
		'TANT_QUE' : {tag : 'while', error : 'Un TANT_QUE doit être terminé par un FIN_TANT_QUE'}
	};
	
	config.endBlock = {
		'FIN_SI' : {error : 'un FIN_SI doit avoir un SI correspondant.', startTag : 'if'},
		'FIN_POUR' : {error : 'un FIN_POUR doit avoir un POUR correspondant.', startTag : 'for'},
		'FIN_TANT_QUE' : {error : 'un FIN_TANT_QUE doit avoir un TANT_QUE correspondant.', startTag : 'while'}
	};
	
	config.varTypes = {
		NOMBRE	: 'number',
		CHAINE	: 'string',
		TABLEAU : 'array',
		BOOLEEN : 'boolean'
	};

	config.booleanName = {VRAI : true, FAUX : false};
	
	config.translateVarType = {};
	
	config.writeOutput = function() {
		return {
			erreur : 'error',
			info : 'info'
		};
	}
		
	for (var i in config.varTypes) {
		config.translateVarType[config.varTypes[i]] = i;
	}
	
	config.getBooleanName = function(){
		return config.booleanName;
	}
	
	config.getVarTypes = function() {
		return config.varTypes;
	}

	// functions
	config.getFunctions = function(){
		return this.functions;
	}
	
	config.getSkipedFunction = function() {
		return this.skipedFunction;
	}
	
	config.getStartToEndBlock = function(){
		return this.blocNames;
	}
	
	// configuration use for fold
	config.getStartToLastEndBlock = function(){
		return this.foldBlocks;
	}
	
	config.getValidatorOpenBlock = function(){
		return this.openBlock;
	}
	
	config.getValidatorEndBlock = function(){
		return this.endBlock;
	}
	
	config.getAutoCloseTag = function(){
		return this.autoCloseTag;
	}
	return config;
});