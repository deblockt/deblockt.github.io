define([], function(){
	
	var RuntimeException = function(message, offset) {
		this.message = message;
		this.offset = offset;
		this.name = 'RuntimeException';

	}

	RuntimeException.prototype = {
		toString : function(cm){
			var offsetString = undefined;
			if (this.offset) {
				if (cm) {
					var objectOffset = cm.posFromIndex(this.offset);
					offsetString = '(ligne : '+objectOffset.line+', colonne : '+objectOffset.ch+')';
				} else {
					offsetString = '(caractére : ' + this.offset+')';
				}
			}
			return this.message + (offsetString ? offsetString : '');
		}
	}

	return RuntimeException;
});