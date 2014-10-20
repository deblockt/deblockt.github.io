define([], function()
{
    return {
        defaultRoutePath: '/',
        routes: {
            '/': {
                controller : 'easyCodeEditor',
                dependencies: [
                    'controllers/easyCodeEditor',
                    'directives/directives'
                ]
            }
        }
    };
});