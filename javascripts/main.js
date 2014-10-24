require.config({
	baseUrl : '../bower_components',
    urlArgs: "bust=" + (new Date()).getTime(),
	paths : {
		// configuration base dir
		services : '../javascripts/services',
		controllers : '../javascripts/controllers',
		directives : '../javascripts/directives',
		
		// module shortcut
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
		easyCodeSyntaxHighlighter : '../javascripts/easyCodeLanguage/easyCodeSyntaxHighlighter',
		easyCodeContext : '../javascripts/easyCodeLanguage/easyCodeContext',
		easyCodeRuntimeException : '../javascripts/easyCodeLanguage/easyCodeRuntimeException',
		terminalEmulator : '../javascripts/terminalEmulator/vtortola.ng-terminal',
		routes : '../javascripts/routes',
		appDir : '../javascripts/',
		ffFileSystem : 'idb.filesystem.js/src/idb.filesystem.min'
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
		'controllers/easyCodeEditor' : {
			deps : [
				'codemirror/mode/htmlmixed/htmlmixed',
				'codemirror/addon/hint/show-hint',
				'codemirror/addon/lint/lint',
				'codemirror/addon/fold/foldgutter',
                'easyCodeSyntaxHighlighter',
                'easyCodeParser',
				'easyCodeLint',
				'easyCodeFold',
				'easyCodeValidator',
				'easyCodeCloseTag',
				'easyCodeRunner',				
				'services/fileSystem'
			],
			exports : 'controllers/easyCodeEditor'
		},
		'ng-flow/dist/ng-flow-standalone' : {
			deps : ['angular']
		},
		app : {
			deps: [
				'angular',
				'angularRoute',
				'appDir/services/dependencyResolverFor',
				'routes',
				'angularBootstrap',
				'terminalEmulator',
				'angular-ui-codemirror/ui-codemirror',
				'ng-flow/dist/ng-flow-standalone'
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