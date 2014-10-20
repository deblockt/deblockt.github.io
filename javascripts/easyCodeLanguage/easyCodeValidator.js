// a syntaxique validator for easyCode
define(function(){
	
	var eatTo = function(stream, ch) {
		var curCh = '';
		while (curCh = stream.next()) {
			if (ch == curCh) {
				return true;
			}
		}
		return false;
	}


	var readComment = function(stream) {
	  // cas d'un commentaire multiligne
	  if (stream.eat("*")) {
		// on va jusqu'a la fin potentiel du commentaire
		var isEnded = false;
		do {
			isEnded = eatTo(stream, "*");
			if (!isEnded) {
				return false;
			}
			isEnded = stream.eat("/");
		} while (!isEnded);
	  }
	  
	  // cas d'un commentaire sur une seul ligne on va simplement à la fin de la ligne
	  if (stream.eat("/")) {
		eatTo(stream, '\n')
	  }
	  
	  return true;
    }


	
	
	var readString = function(stream, delimiter) {
		var isEnded = eatTo(stream, delimiter);
		if (!isEnded) {
			return false;
		}
		// if the prev is \ it's not the end of the string
		var prev = stream.string.substring(stream.pos - 2, stream.pos - 1);
		if (prev == '\\') {
			return readString(stream, delimiter);
		}
		return true;
	}


	/**
	 * add a block start tag on the list
	 */
	var addBlockStart = function(blockList, name, startPos, endPos, openBlockName) {
		blockList.push(
			{
				type : name, 
				offset : {
					from : startPos,
					to : endPos
				},
				name : openBlockName
			}
		);
	}


	/**
	 * call when a close block is found
	 */
	var closeBlock = function(blockList, startBlockName) {
		for (var i = blockList.length - 1; i >= 0; i--) {
			if (blockList[i].type == startBlockName) {
				// remove the corresponding if
				blockList.splice(i, 1);
				return true;
			}
		}
		return false;
	}


	
	// function call for test if the current code is OK
	var checkText = function(content, useParser){
		var found = [];
		parsing = true;
		
		var addError = function(message, start, end, type){
			found.push({
			  from: start,
			  to: end,
			  message: message,
			  severity : type
			});
		}
		
		// check with the easyCodeParser
		var stream = new CodeMirror.StringStream(content, 4);
		// throw all content for check if / endif for / endfor
		stream.eatSpace();
		var ch = undefined;
		var blockToClose = [];
		var openBlock = {
			'si' : {tag : 'if', error : 'Un SI doit être terminé par un FIN_SI'}, 
			'pour' : {tag : 'for', error : 'Un POUR doit être terminé par un FIN_POUR'},
			'tant_que' : {tag : 'while', error : 'Un TANT_QUE doit être terminé par un FIN_TANT_QUE'}
		};
		var endBlock = {
			'fin_si' : {error : 'un FIN_SI doit avoir un SI correspondant.', startTag : 'if'},
			'fin_pour' : {error : 'un FIN_POUR doit avoir un POUR correspondant.', startTag : 'for'},
			'fin_tant_que' : {error : 'un FIN_TANT_QUE doit avoir un TANT_QUE correspondant.', startTag : 'while'}
		};
		
		while ((ch = stream.next()) != undefined) {			
					
			// token
			if (ch == '/') {
				var pos = stream.pos;
				var isOk = readComment(stream);
				if (!isOk) {
					addError('Le commentaire n\'est pas fermé. Fermez le avec */', pos, stream.pos, 'warning');
				}
			}
			
			// string
			if (ch == '"' || ch == "'") {
				var pos = stream.pos;
				var isOk = readString(stream, ch);
				if (!isOk) {
					addError(
						'La chaine de caractére ne se termine par. Une chaine s\'écrit de la facon suivante : \'Bonjour, j\\\'aime les chats\'', 
						pos, 
						stream.pos, 
						'warning'
					);
				}
			}
			
			var beforeEatPos = stream.pos - 1;
			// it's an other inscrtuction
			stream.eatWhile(/[\w\$_]/);
			var cur = stream.current().substring(beforeEatPos).toLowerCase();
			// an open block
			if (cur in openBlock) {
				addBlockStart(blockToClose, openBlock[cur].tag, beforeEatPos, stream.pos, cur);
			}
			
			// an end block
			if (cur in endBlock) {
				if (!closeBlock(blockToClose, endBlock[cur].startTag)) {
					addError(endBlock[cur].error, beforeEatPos, stream.pos, 'error');
				}				
			}
			
			stream.eatSpace();
		}
		
		// if a condition or while is not closed
		if (blockToClose.length > 0) {
			for (var i in blockToClose) {
				var notClosed = blockToClose[i];
				var message = 'Une erreur est présente.';
				if (notClosed.name in openBlock) {
					message = openBlock[notClosed.name].error;
				}
				
				addError(message, notClosed.offset.from, notClosed.offset.to, 'error');
			}
		}
		
		
		// check with pegjs parser
		if (useParser) {
			var parser = require('easyCodeParser');
			if (found.length == 0) {
				try {
					 parser.parse(content);
				} catch (exception) {
					found.push({
					  from: CodeMirror.Pos(exception.line - 1 , exception.column - 1),
					  to: CodeMirror.Pos(exception.line - 1, exception.column ),
					  message: exception.message,
					  severity : 'error'
					});
				}
			}
		}
		
		return found;
	};

	return {
		validate : function(content, useParser) {
			useParser = useParser == undefined ? true : useParser;
			return checkText(content, useParser);
		}
	}
});