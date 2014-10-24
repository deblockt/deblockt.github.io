// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

if (!Array.indexOf)
{
  Array.indexOf = [].indexOf ?
      function (arr, obj, from) { return arr.indexOf(obj, from); }:
      function (arr, obj, from) { // (for IE6)
        var l = arr.length,
            i = from ? parseInt( (1*from) + (from<0 ? l:0), 10) : 0;
        i = i<0 ? 0 : i;
        for (; i<l; i++) {
          if (i in arr  &&  arr[i] === obj) { return i; }
        }
        return -1;
      };
}

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("codemirror/lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror/lib/codemirror", "easyCodeConfiguration"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror, easyCodeConfiguration) {
"use strict";

CodeMirror.defineMode("easyCode", function(config, parserConfig) {
  var indentUnit = config.indentUnit,
      statementIndentUnit = parserConfig.statementIndentUnit || indentUnit,
      dontAlignCalls = parserConfig.dontAlignCalls,
      keywords = parserConfig.keywords || {},
      builtin = parserConfig.builtin || {},
      blockKeywords = parserConfig.blockKeywords || {},
      atoms = parserConfig.atoms || {},
      hooks = parserConfig.hooks || {},
      multiLineStrings = true;
  var isOperatorChar = /[+\-*&%=<>!?|\/]/;
  // create electricInput regex for end block keywork
  var electricInputRegexString = '';
  for (var startWord in blockKeywords) {
	for (var word in blockKeywords[startWord]) {
		electricInputRegexString +=  blockKeywords[startWord][word] + '|';
	}
  }
  electricInputRegexString = electricInputRegexString.substring(0, electricInputRegexString.length - 1);
  
  var electricInputRegex = new RegExp(electricInputRegexString, 'i');
  
  var curPunc;
  
  function tokenBase(stream, state) {
    curPunc = '';
	var ch = stream.next();
	// cas d'une chaine de caractére
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
	// cas d'un nombre
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.\,]/);
      return "number";
    }
	
	// cas du début d'un commentaire
    if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      }
	  // cas d'un commentaire sur une seul ligne on va simplement à la fin de la ligne
      if (stream.eat("/")) {
        stream.skipToEnd();
        return "comment";
      }
    }
	
	// cas d'un opérateur
	if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return "operator";
    }
	
    stream.eatWhile(/[\w\$_]/);
    var cur = stream.current();
	cur = cur.toUpperCase();
    // cas d'un mot clef
	if (keywords.propertyIsEnumerable(cur)) {
	  if (blockKeywords.propertyIsEnumerable(cur)) {
		curPunc = "newstatement";
	  } else if (
			blockKeywords.propertyIsEnumerable(state.context.blockName) 
		 && blockKeywords[state.context.blockName].indexOf(cur) >= 0
	  ) {
		curPunc = "endstatement";
      }
	  
	  return "keyword";
    }
	
	// gestion des atoms du languages
    if (atoms.propertyIsEnumerable(cur)) return "atom";
	
    return "variable";
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {end = true; break;}
        escaped = !escaped && next == "\\";
      }
      if (end || !(escaped || multiLineStrings))
        state.tokenize = null;
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  function Context(indented, column, type, align, prev, blockName, vars) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.align = align;
    this.prev = prev;
	this.blockName = blockName;
	this.vars = vars || [];
  }

  function pushContext(state, col, type, blockName) {
    var indent = state.indented;
	
    if (type == "statement") {
	  indent = ((state.context) ? state.context.indented : 0) +  indentUnit;
	}
	
    return state.context = new Context(indent, col, type, null, state.context, blockName);
  }
  
  function popContext(state) {
    return state.context = state.context.prev;
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: null,
        context: new Context(0, 0, "top", false),
        indented: 0,
        startOfLine: true
      };
    },

    token: function(stream, state) {
      var ctx = state.context;
      if (stream.sol()) {
        if (ctx.align == null) ctx.align = false;
        state.indented = stream.indentation();
        state.startOfLine = true;
      }
	  
      if (stream.eatSpace()) return null;
	  
  	  var style = (state.tokenize || tokenBase)(stream, state);
       
        ctx.align = ctx.align || true;
  	
  	  if (curPunc == "endstatement") {
  		popContext(state);
  	  }
  	  
  	  if (curPunc == "newstatement") {
  		pushContext(state, stream.column(), "statement", stream.current().toUpperCase());
  	  }
	  
      return style;
    },

    indent: function(state, textAfter) {
	  console.log(state, textAfter);
	  var blockName = state.context.blockName ? state.context.blockName.toUpperCase() : '';
  	  // if it's a end statement, this is reindented with -indentUnit
  	  if (blockKeywords[blockName] && blockKeywords[blockName].indexOf(textAfter.toUpperCase()) >= 0) {
  		state.context.indented -= indentUnit;
  		if (state.context.indented < 0) {
  			state.context.indented = 0;
  		}
  	  }
	  console.log((state.context ? state.context.indented : 0));
      return (state.context ? state.context.indented : 0);
    },
	  electricInput: electricInputRegex,
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    lineComment: "//",
    fold: "easyCode"
  };
});

  function words(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }

  function def(mimes, mode) {
    if (typeof mimes == "string") mimes = [mimes];
    var words = [];
    function add(obj) {
      if (obj) for (var prop in obj) if (obj.hasOwnProperty(prop))
        words.push(prop);
    }
    add(mode.keywords);
    add(mode.builtin);
    add(mode.atoms);
    if (words.length) {
      mode.helperType = mimes[0];
      CodeMirror.registerHelper("hint", "easyCode", function(editor, options){
		var Pos = CodeMirror.Pos;
		var cur = editor.getCursor();
		var token = editor.getTokenAt(editor.getCursor());
		
		var list = [];
		var wordList = [];
		function addToList(value) {
			var tokenString = token.string.trim().toUpperCase();
			
			// test if value correspond current entry
			if (tokenString.length > 0 && value.indexOf(tokenString) == -1) {
				return;
			}
			
			if (Array.indexOf(list, value) == -1) {
				wordList.push(value);
				list.push(
					{
						text : value,
						hint : function(cm, data, completion){
							var easyCode = cm.getMode({},"easyCode");
							
							var before = cm.getRange(Pos(cur.line, 0), Pos(cur.line, token.start));
							// if the word is the first of the line
							if (before.trim().length == 0) {
								token.start = easyCode.indent(token.state, completion.text);
							} else if (token.string.trim() == 0) {
								// if it's after an other word but no car are entred
								token.start += 1;
							}
													
							cm.replaceRange(completion.text, Pos(cur.line, token.start),  Pos(cur.line, token.end), "complete")
						}
					}
				);
			}
		}
		
		// add end bloc keyword
		if (vblocKeyWord[token.state.context.blockName]) {
			for (var i in  vblocKeyWord[token.state.context.blockName]) {
				addToList(vblocKeyWord[token.state.context.blockName][i]);
			}
		}
		
		for (var i in words) {
			addToList(words[i]);
		}
	 
		return {
			list : list,
			from: Pos(cur.line, token.start),
			to: Pos(cur.line, token.end)				
		};
	  });
    }

    for (var i = 0; i < mimes.length; ++i)
      CodeMirror.defineMIME(mimes[i], mode);
  }

  var vblocKeyWord = easyCodeConfiguration.getStartToEndBlock();
  
  def(["text/easyCode-src"], {
    name: "easyCode",
    keywords: words("LIRE ECRIRE SI SI_NON SI_NON_SI FIN_SI POUR DE A DANS PAR FIN_POUR TANT_QUE FIN_TANT_QUE DEFINIR ET OU"),
    blockKeywords: vblocKeyWord,
    atoms: words("NOMBRE CHAINE BOOLEEN TABLEAU VRAI FAUX VIDE")
  });
  
});
