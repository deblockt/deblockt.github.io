// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("codemirror/lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror/lib/codemirror", "easyCodeConfiguration"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror, easyCodeConfiguration) {
"use strict";

var startBlock = easyCodeConfiguration.getStartToLastEndBlock();

CodeMirror.registerHelper("fold", "easyCode", function(cm, start) {
  
  var firstLine = cm.getLine(start.line);
  var startTag = firstLine.trim().split(' ')[0].toUpperCase();

  // line can not be a ended block
  if (!(startTag in startBlock)) {
     return;
  }
 
  var endTag = startBlock[startTag];
  var countEndBlock = 1;
  var lastLine = cm.lastLine();
  for (var i = start.line + 1; i <= lastLine && countEndBlock > 0; ++i) {
    var curLine = cm.getLine(i).trim();
    
    var splited = curLine.split(' ');
    var firstTag = splited[0].toUpperCase();
    if (firstTag == endTag) {
      countEndBlock--;
    } else if (firstTag == startTag) {
      countEndBlock++;
    }
  }

  i -= 2;

  if (countEndBlock == 0) {
    return {
      from: CodeMirror.Pos(start.line, firstLine.length),
      to: CodeMirror.Pos(i, cm.getLine(i).length)
    };    
  }
   
});

});
