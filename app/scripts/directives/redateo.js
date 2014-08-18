angular.module("dateaWebApp")
.directive("daRedateo", 
[
  'Api'
, 'User'
, '$location'
, function (
	  Api
	, User
	, $location
) {
	
	return {
		  restrict    : "E"
		, templateUrl : "/views/redateo-button.html"
		, replace		  : true
		, scope: {
			   btnClass  		   : '@'
		   , dateoId  		   : '='
		   , redateoCallback : '=?'
		   , redateoCount    : '='
		}
		, controller : function ($scope, $element, $attrs) {

			var checkHasRedateado
				, mouseHasLeft
			;

			$scope.redateo           = {};
			$scope.flow              = {};
			$scope.flow.isActive     = false;
			$scope.flow.loading      = false;
			$scope.flow.disabled     = true;
			$scope.flow.hoverEnabled = false;

			$scope.$watch('dateoId', function () {
				checkHasRedateado();
			});

			checkHasRedateado = function () {
				if (User.isSignedIn() && $scope.dateoId) {
					Api.redateo
					.getList( { user : User.data.id, dateo : $scope.dateoId } )
					.then( function ( response ) {
						$scope.flow.disabled = false;
						$scope.flow.isActive = response.meta.total_count ? true : false;
						$scope.flow.hoverEnabled = true;
						if (response.objects.length) $scope.flow.redateo = response.objects[0];
					}, function ( reason ) {
						console.log( reason );
						$scope.flow.disabled  = false;
						$scope.flow.hoverEnabled = true;
					} )
				}else{
					$scope.flow.disabled = false;
					$scope.flow.hoverEnabled = true;
				}
			}

			$scope.flow.doRedateo = function () {
				if (!User.isSignedIn()) {
					$location.path('/registrate');
					return;
				}
				if ( !$scope.flow.loading && !$scope.flow.disabled) {
					$scope.flow.loading = true;
					$scope.flow.hoverEnabled = false;
					mouseHasLeft = false;
					// POST
					if (!$scope.flow.isActive) {
						Api.redateo
						.post( { user : User.data.id, dateo : $scope.dateoId } )
						.then( function ( response ) {
							console.log( 'doRedateo', response );
							$scope.redateoCount++;
							if (typeof($scope.redateoCallback) != 'undefined') $scope.redateoCallback(response, 'post');
							$scope.flow.loading  = false;
							$scope.flow.isActive = true;
							$scope.flow.redateo = response;
							if (!mouseHasLeft) $scope.flow.hoverEnabled = false;
						}, function ( reason ) {
							console.log( reason );
							$scope.flow.loading = false;
							$scope.flow.hoverEnabled = true;
						} );
					// DELETE
					}else {
						Api.redateo
						.deleteList( { user : User.data.id, dateo : $scope.dateoId, id: $scope.flow.redateo.id } )
						.then( function ( response ) {
							console.log( 'deleteRedateo', response );
							$scope.redateoCount--;
							if (typeof($scope.redateoCallback) != 'undefined') $scope.redateoCallback(response, 'delete');
							$scope.flow.loading  = false;
							$scope.flow.isActive = false;
							$scope.flow.redateo = null;
							if (!mouseHasLeft) $scope.flow.hoverEnabled = false;
						}, function ( reason ) {
							console.log( reason );
							$scope.flow.loading = false;
							$scope.flow.hoverEnabled = true;
						} );
					}
				} 
			}

			$scope.flow.onMouseLeave = function () {
				//if ($scope.flow.loading === false) {
					mouseHasLeft = true;
					$scope.flow.hoverEnabled = true;
				//}
			}

		}
	}
} ] );