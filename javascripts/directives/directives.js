define(['app'], function(app){
	// create a directive specific module
	app.directive('focusMe', function($timeout) {
	  return {
		scope: { trigger: '=focusMe' },
		link: function(scope, element) {
		  scope.$watch('trigger', function(value) {
			if(value === true) { 			  
				element[0].focus();
				element[0].select();
			}
		  });
		}
	  };
	}).directive('ngEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if(event.which === 13) {
                    scope.$apply(function(){
                        scope.$eval(attrs.ngEnter, {'event': event});
                    });

                    event.preventDefault();
                }
            });
        };
    });

});