require.config({
	baseUrl : '../bower_components',
    urlArgs: "bust=" + (new Date()).getTime(),
	paths : {
		app : '../javascripts/app',
		angular : 'angular/angular.min',
		angularBootstrap : 'angular-bootstrap/ui-bootstrap-tpls.min',
		angularRoute : 'angular-route/angular-route.min',
		easyCodeParser : '../javascripts/easyCodeLanguage/easyCodeParser',
		easyCodeRunner : '../javascripts/easyCodeLanguage/easyCodeRunner',
		easyCodeLint : '../javascripts/easyCodeLanguage/easyCodeLint',
		easyCodeFold : '../javascripts/easyCodeLanguage/easyCodeFold',
		easyCodeCloseTag : '../javascripts/easyCodeLanguage/easyCodeCloseTag',
		easyCodeValidator : '../javascripts/easyCodeLanguage/easyCodeValidator',
		easyCodeConfiguration : '../javascripts/easyCodeLanguage/easyCodeConfiguration',
		terminalEmulator : '../javascripts/terminalEmulator/vtortola.ng-terminal'
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
				'angular'
			],
			exports: 'angularRoute'
		},
		'terminalEmulator': {
			deps : [
				'angular'
			],
			exports : 'terminalEmulator'
		},
		app : {
			deps: [
				'angular',
				'angularRoute',
				'angularBootstrap',
				'codemirror/mode/htmlmixed/htmlmixed',
				'codemirror/addon/hint/show-hint',
				'codemirror/addon/lint/lint',
				'codemirror/addon/fold/foldgutter',
                '../javascripts/easyCodeLanguage/easyCodeSyntaxHighlighter',
				'easyCodeParser',
				'easyCodeLint',
				'easyCodeFold',
				'easyCodeValidator',
				'terminalEmulator',
				'angular-ui-codemirror/ui-codemirror',
				'easyCodeCloseTag'
			],
			exports: 'app'
		}
	}
});

require(['app'], function (app) {
  // create CodeMirror on window for correcte usage of ui.codemirror
  window.CodeMirror = require('codemirror/lib/codemirror');
  app.init();
});