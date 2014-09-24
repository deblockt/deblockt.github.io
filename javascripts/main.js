require.config({
	baseUrl : '../bower_components',
    urlArgs: "bust=" + (new Date()).getTime(),
	paths : {
		app : '../javascripts/app',
		angular : 'angular/angular.min',
		angularBootstrap : 'angular-bootstrap/ui-bootstrap-tpls.min',
		angularRoute : 'angular-route/angular-route.min'
	},
	shim : {
		'angularBootstrap' : {
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
		'angularRoute': {		
			deps : [
				'angular',
			],
			exports: 'angularRoute'
		},
		app : {
			deps: [
				'angular',
				'angularRoute',
				'angularBootstrap',
				'angular-ui-codemirror/ui-codemirror',
				'codemirror/mode/htmlmixed/htmlmixed',
				'codemirror/addon/hint/show-hint',
                '../javascripts/codeMirrorEasyCode/easyCode'
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