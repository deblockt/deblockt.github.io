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
    }).filter('orderObjectBy', function() {
	  return function(items, field, reverse) {
	    var filtered = [];
	    
	    console.log(field, reverse);
	    angular.forEach(items, function(item, key) {
	    	item.key = key;
	      filtered.push(item);
	    });
	    
	    filtered.sort(function (a, b) {
	      return (a[field] > b[field] ? 1 : -1);
	    });

	    if(reverse) filtered.reverse();
	    return filtered;
	  };
	});

});