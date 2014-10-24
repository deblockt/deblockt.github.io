define(['app'], function(app){

	app.controller('popUpController',  function($scope, $modalInstance, title, message, buttons){
		$scope.title = title || 'Alerte';
		$scope.content = message || 'Un message !!!!';
		$scope.buttons = buttons || [
			{classes : 'btn-success', label : 'ok', onClick : function(){console.log('OK');return false;}},
			{classes : 'btn-warning', label : 'annuler', onClick : function(){console.log('annuler');return true;}}
		];
		
		$scope.close = function(dismiss){
			if (dismiss) {
				$modalInstance.dismiss('cancel');
			} else {
				$modalInstance.close();
			}
		};
		
		$scope.buttonClicked = function(callback) {
			var result = undefined;
			if (callback) {
				result = callback($modalInstance, $scope);
			}
			$scope.close(result === false);
		};
	})
	.factory('popUpManager', ['$modal', function($modal){
		return service = {
			templateUrl : 'popUp.html',
			controller : 'popUpController',
			warning : function(title, message) {
				return $modal.open({
				  templateUrl: this.templateUrl,
				  controller: this.controller,
				  size: 'lg',
				  resolve: { 
					title : function(){return title || 'Alerte'},
					message : function(){ return message },
					buttons : function(){ return [{classes : 'btn-warning', label : 'ok'}]}
				  }
				});
			},
			confirm : function(title, message, yes, no) {
				return $modal.open({
				  templateUrl: this.templateUrl,
				  controller: this.controller,
				  size: 'lg',
				  resolve: { 
					title : function(){return title || 'Alerte'},
					message : function(){ return message },
					buttons : function(){ return [
						{classes : 'btn-success', label : 'Oui', onClick : yes},
						{classes : 'btn-warning', label : 'Non', onClick : no}
					]}
				  }
				});
			}
		};
		
		return service;
	}]);
	
	var popUpManager = {};
	
	return popUpManager;
});