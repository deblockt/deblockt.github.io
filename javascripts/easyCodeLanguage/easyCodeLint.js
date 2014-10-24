(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("codemirror/lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror/lib/codemirror", 'easyCodeValidator'], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror, validator) {
	"use strict";
	
	var parsing = false;
	var vneedToReparse = undefined;
	var onEndParsing = undefined;

	// function call if a new check instruction is call, and the current parsing is not ended
	var needToReparse = function(cm, updateLinting){
		vneedToReparse = {cm : cm, updateLinting : updateLinting};
	};

	// function call the current parse is ended
	var endParsing = function(haveError){
		parsing = false;
		if (vneedToReparse) {
			var cm = vneedToReparse.cm;
			var updateLinting = vneedToReparse.updateLinting;
			vneedToReparse = undefined;
			checkText(cm, updateLinting);
		} else if (onEndParsing) {
			var end = onEndParsing;
			onEndParsing = undefined;
			end(haveError);
		}
	};

	var checkText = function(cm, updateLinting, value) {
		var found = validator.validate(value);

		for (var i in found) {
			var founded = found[i];
			if (typeof founded.from == 'number') {
				founded.from = cm.posFromIndex(founded.from);
			}
			if (typeof founded.to == 'number') {
				founded.to = cm.posFromIndex(founded.to);
			}
		}
		
		updateLinting(cm, found);


		endParsing(found.length > 0);
	}

	CodeMirror.registerHelper("lint", "easyCode", function(value, updateLinting, options, cm) {
		
		setTimeout(function(){checkText(cm, updateLinting, value)}, 1);  		

	});

});
