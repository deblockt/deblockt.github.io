// a syntaxique validator for easyCode
define(['easyCodeConfiguration', 'easyCodeParser'], function(easyCodeConfiguration, Parser){


	
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
		
		
		try {
			var parser = new Parser();
			var result = parser.parse(content);
			
			for (var i in result.errors) {
				var error = result.errors[i];
				console.log(error);
				addError(
					error.toString(),
					error.getStart(),
					error.getEnd(),
					'error'
				);
			}
		} catch (exception) {
			console.log(exception);
			found.push({
			  from: CodeMirror.Pos(exception.line - 1 , exception.column - 1),
			  to: CodeMirror.Pos(exception.line - 1, exception.column ),
			  message: exception.message,
			  severity : 'error'
			});
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