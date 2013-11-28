'use strict';

angular.module('dateaWebApp')
.controller('SignupCtrl'
, [ '$scope'
  , '$http'
  , 'localStorageService'
, function (
	  $scope
	, $http
	, localStorageService
) {

	var ls = localStorageService
	  , twitterKeys
	  ;

	twitterKeys = ls.get( 'twitter-keys' );

	$scope.datea = {};
	$scope.auth  = {};
	// datea-api endpoint -- now called from User service
	// $scope.auth.url   = 'http://192.168.1.37:8000/api/v2/create_user/';
	$scope.auth.url   = 'http://api.datea.pe/api/v2/create_user/';
	$scope.datea.name = 'Datea.pe';
	$scope.auth.passwordRequired = true;

	$scope.auth.twitterToken  = twitterKeys && twitterKeys.oauth_token;
	$scope.auth.twitterSecret = twitterKeys && twitterKeys.oauth_token_secret;
	if ( twitterKeys && twitterKeys.oauth_token && twitterKeys.oauth_token_secret ) {
		$scope.auth.twitterId = twitterKeys.user_id;
		$scope.auth.passwordRequired = false;
	}

	$scope.auth.save = function () {
		var data
		  , isValid
		  ;

		isValid = $scope.form.$valid;

		data = { bio        : $scope.auth.bio
		       , email      : $scope.auth.email
		       , password   : $scope.auth.password
		       , twitter_id : $scope.auth.twitterId
		       }

		if ( isValid ) {
			// $scope.auth.message = null;
			// $scope.auth.message = "call api";
			// User.post( data, function ( response ) {
			// 	console.log( response );
			// 	$scope.auth.message = 'api called';
			// } );
			$http.post( $scope.auth.url, data )
			.success( function ( response ) {
				console.log( response );
			} );
		} else {
			$scope.auth.message = 'please check your inputs';
		}

		// Now in User service
		// $http.post( $scope.auth.url, data )
		// .success( function ( response ) {
		// 	console.log( response );
		// } );
	}

} ] );