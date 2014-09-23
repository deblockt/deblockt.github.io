require.config({
	baseUrl : '../bower_components',
	paths : {
		app : '../javascripts/app',
		angular : 'angular/angular.min'
	},
	shim : {
		'angular-bootstrap/ui-bootstrap.min' : {
			deps : [
				'angular'
			],
			exports: 'angular-ui-bootstrap'
		},
		'angular-ui-codemirror/ui-codemirror' : {
			deps : [
				'angular',
				'codemirror/lib/codemirror'
			],
			exports: 'codeMirrorAngular'
		},
		app : {
			deps: [
				'angular',
				'angular-bootstrap/ui-bootstrap.min',
				'angular-ui-codemirror/ui-codemirror',
				'codemirror/mode/htmlmixed/htmlmixed'
			],
			exports: 'app'
		}
	}
});

require(['app'], function (app) {
  // create CodeMirror on wondow for correcte usage of ui.codemirror
  window.CodeMirror = require('codemirror/lib/codemirror');
  app.init();
});