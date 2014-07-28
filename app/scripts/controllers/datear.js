'use strict';

angular.module('dateaWebApp')
.controller('DatearCtrl',
[ '$scope'
, '$modalInstance'
, 'geolocation'
, '$http'
, '$rootScope'
, 'config'
, 'Api'
, 'datearModalGivens'
, '$timeout'
, 'leafletData'
, 'User'
// , 'leafletEvents'
, function (
  $scope
, $modalInstance
, geo
, $http
, $rootScope
, config
, Api
, datearModalGivens
, $timeout
, leafletData
, User
// , leafletEvents
) {
	var headers
	  , dateo        = {}
	  , alertIndexes = {}
	  , defaultMap
	  // fn declarations
	  , onGeolocation
	  , onGeolocationError
	  , geocode
	  , reverseGeocode
	  , mapToAddress
	  , addressCache = {}
	  ;

// Object to be sent
$scope.dateo               = {};
$scope.datear              = {};
$scope.datear.leaflet      = {};
$scope.datear.autocomplete = {};
$scope.flow                = {};
$scope.flow.dp             = {};

$scope.datear.selectedTags = [];
$scope.datear.loading			 = false;
$scope.datear.onFinished   = false;
$scope.datear.isScrolling  = false;
$scope.alerts = [];
$scope.datear.step				 = 1;

var $modal_body = angular.element(document.getElementById('modal-body'));
if ($modal_body.scrollTop() != 0 ) $modal_body.scrollTop(0);


$scope.$on( 'leafletDirectiveMarker.dragend', function ( event ) {
	if ( $scope.datear.leaflet.center.zoom <= 16 ) {
		$scope.datear.leaflet.center.lat  = $scope.datear.leaflet.markers.draggy.lat;
		$scope.datear.leaflet.center.lng  = $scope.datear.leaflet.markers.draggy.lng;
		$scope.datear.leaflet.center.zoom = $scope.datear.leaflet.center.zoom + 1;
	}
} );

onGeolocation = function ( data ) {
	var leaflet;
	leaflet = { center : { lat  : data.coords.latitude
	                     , lng  : data.coords.longitude
	                     , zoom : 14
	                     }
	          , markers : { draggy : { lat : data.coords.latitude
	                                 , lng : data.coords.longitude
	                                 , draggable : true
	                                 }
	                      }
	          , events : 'dragend'
	          }

	// leafletData.getMap("leafletDatear")
	// .then( function ( map ) {
	// 	// map.fitBounds( markersBounds );
	// 	angular.extend( map, leaflet );
	// } )

	angular.extend( $scope.datear.leaflet, leaflet );

}

onGeolocationError = function ( reason ) {
	var leaflet = {}
	  , draggy
	  ;

	leaflet = { center : { lat  : -12.05
	                     , lng  : -77.06
	                     , zoom : 14
	                     }
	          , markers : { draggy : { lat : -12.05
	                                 , lng : -77.06
	                                 , draggable : true
	                                 }
	                      }
	          , events : 'dragend'
	          }

	angular.extend( $scope.datear.leaflet, leaflet );
}

$scope.$on( 'leafletDirectiveMap.click', function ( event, args ) {
	console.log( 'leafletDirectiveMap.click' );
	var leafEvent = args.leafletEvent
	  , newDraggy = {}
	  ;

	newDraggy = { lat : leafEvent.latlng.lat
	            , lng : leafEvent.latlng.lng
	            , draggable : true
	            }

	/*
	if ( $scope.datear.leaflet.center.zoom <= 16 ) {
		$scope.datear.leaflet.center.lat  = $scope.datear.leaflet.markers.draggy.lat;
		$scope.datear.leaflet.center.lng  = $scope.datear.leaflet.markers.draggy.lng;
		setTimeout(function () {
			$scope.datear.leaflet.center.zoom = $scope.datear.leaflet.center.zoom + 1;
		}, 300);
	}*/
	leafletData.getMap("leafletDatear")
		.then( function ( map ) {
			var zoom   = $scope.datear.leaflet.center.zoom;
			if (zoom <= 16) {
				var center = L.latLng(leafEvent.latlng.lat, leafEvent.latlng.lng); 
			 	zoom+=2;
				map.setZoomAround(center, zoom);
				angular.extend( $scope.datear.leaflet.markers.draggy, newDraggy );
			} else {
				angular.extend( $scope.datear.leaflet.markers.draggy, newDraggy );
			} 
	} );

	

	//reverseGeocode(leafEvent.latlng.lat, leafEvent.latlng.lng);

} );


$scope.scrollTo = function($event, element, offset) {
	var rootElem, elem;
	$event.stopPropagation();
	$event.preventDefault();
	$scope.datear.isScrolling = true;
	rootElem = angular.element(document.getElementById('modal-body'));
	elem = angular.element(document.getElementById(element));
	rootElem.scrollToElement(elem, offset, 400).then(function() {
		$scope.datear.isScrolling = false;
	});
}

$scope.closeAlert = function ( index ) {
	$scope.alerts.splice(index, 1);
}

$scope.addAlert = function ( givens ) {
	return $scope.alerts.push( givens ) - 1;
}

$rootScope.$on( 'datea:fileLoaded', function ( ev, givens ) {
	if ( givens.data.size > config.dateo.sizeImgMax ) {
		$scope.dateo.img = null;
		alertIndexes.imgSize !== void 0 && $scope.closeAlert( alertIndexes.imgSize );
		alertIndexes.imgSize = $scope.addAlert( { type: 'danger', msg: config.dateo.sizeImgMaxMsg } );
	} else {
		alertIndexes.imgSize !== void 0 && $scope.closeAlert( alertIndexes.imgSize );
	}
} );

$rootScope.$on('duScrollspy:becameActive', function($event, $element){
	var spy = $element[0].attributes['du-scrollspy'].value;
	var step = parseInt(spy.charAt(spy.length-1));
	$scope.$apply(function() {$scope.datear.step = step});
	/*
	var rootElem = angular.element(document.getElementById('modal-body'));
	if (!$scope.datear.isScrolling) {
		if (step == 1) {
			var elem = angular.element(document.getElementById("spy-step1"));
			rootElem.scrollToElement(elem, 30, 400);
		}else if (step == 2) {
			var elem = angular.element(document.getElementById("spy-step2"));
			rootElem.scrollToElement(elem, 20, 400);
		}else if (step == 3) {
			var elem = angular.element(document.getElementById("spy-step3"));
			rootElem.scrollToElement(elem, 100, 400);
		}
	}*/
});

// DATE INPUT
$scope.flow.dp = {
	// Date picker
	  dateoDate   : new Date()
	, dateOptions : {
			  'year-format': "'yy'"
			, 'starting-day': 1
		}
	, format      : 'yyyy/MM/dd'
	, opened      : false
	// Time picker
	, dateoTime   : new Date()
	, hstep       : 1
	, mstep       : 1
}

$scope.flow.dp.openDatepicker = function($event) {
	$event.stopPropagation();
	$event.preventDefault();
	$scope.flow.dp.opened = true;
}
$scope.flow.dp.changed = function () {
	var datetime = {};
	if ( $scope.flow.dp.dateoDate && $scope.flow.dp.dateoTime ) {
		datetime.year     = $scope.flow.dp.dateoDate.getUTCFullYear();
		datetime.month    = $scope.flow.dp.dateoDate.getUTCMonth();
		datetime.day      = $scope.flow.dp.dateoDate.getDate();
		datetime.hour     = $scope.flow.dp.dateoTime.getHours();
		datetime.minutes  = $scope.flow.dp.dateoTime.getUTCMinutes();
		$scope.dateo.date = new Date( datetime.year
		, datetime.month
		, datetime.day
		, datetime.hour
		, datetime.minutes
		, '00' ).toISOString();
	}
	console.log("DATEO DATE", $scope.dateo.date);
}

// Date watch
$scope.$watch( 'flow.dp.dateoDate', function () {
	$scope.flow.dp.changed();
} );

// /* Static alert close */
// $scope.closeAlert = function ( ev ) {
// 	var $this = angular.element( ev.srcElement );

// 	$this.parent().remove();
// }

$scope.flow.removeImg = function () {
	$scope.datear.img = null;
	$scope.datear.imgData = null;
} 

$scope.flow.removeFile = function () {
	$scope.datear.file = null;
	$scope.datear.fileData = null;
}


$scope.datear.doDatear = function () {
	
	$scope.datear.loading = true;

	var tags = [];
	// Tags
	angular.forEach( $scope.datear.selectedTags, function ( value, key ){
		tags.push( { 'tag' : value } );
	});
	$scope.dateo.tags = tags;

	// Position
	$scope.dateo.position = { coordinates : [ $scope.datear.leaflet.markers.draggy.lng, $scope.datear.leaflet.markers.draggy.lat ]
	                        , type : 'Point'
	                        }

	// Images
	if ( $scope.datear.imgData ) {
		$scope.dateo.images = [ { image : { name     : $scope.datear.imgData.name
		                                  , data_uri : $scope.datear.img
		                                  }
		                        , order : 0
		                        }
		                      ];
	}

	// Files
	if ( $scope.datear.fileData) {
		$scope.dateo.files = [ { file   : { name     : $scope.datear.fileData.name
		                                  , data_uri : $scope.datear.file
		                                  }
		                        , order : 0
		                        }
		                      ];
	}

	if ( $scope.dateo.content && $scope.dateo.tags.length ) {
		Api.dateo.postDateo( $scope.dateo )
		.then( function ( response ) {
			$scope.dateo.errorMessage = null;
			$scope.datear.onFinished  = true;
			//$rootScope.$broadcast( 'user:hasDateado' );
			if (typeof(datearModalGivens.datearSuccessCallback) != 'undefined') datearModalGivens.datearSuccessCallback(response);
			$scope.datear.loading = false;
		} , function ( reason ) {
			console.log( reason );
		} )
	} else {
		if ( !$scope.dateo.content ) {
			$scope.dateo.errorMessage = 'Escriba una descripción de su dateo';
		} else if ( !$scope.dateo.tags.length ) {
			$scope.dateo.errorMessage = 'Elija una etiqueta';
		} else {
			$scope.dateo.errorMessage = 'Hubo un error al datear';
		}
	}
};

$scope.datear.cancel = function () {
	$modalInstance.dismiss('cancel');
};

$scope.datear.autocompleteTag = function ( val ) {
	return Api.tag.getAutocompleteByKeyword( { q: val } )
	.then( function ( response ) {
		var tags = [];
		angular.forEach( response.suggestions, function( item ){
			tags.push( item );
		});
		return tags;
	} );
}

$scope.datear.addTag = function ( tag ) {
	$scope.dateo.nextTag = null;
	if ( !~$scope.datear.selectedTags.indexOf( tag )
	&& $scope.datear.selectedTags.length < config.dateo.tagsMax ) {
		tag = tag.replace('#','');
		$scope.datear.selectedTags.push( tag );
	}
}
$scope.datear.removeTag = function ( idx ) {
	$scope.datear.selectedTags.splice( idx, 1 );
}

reverseGeocode = function (lat, lng) {
	if (!$scope.dateo.address || $scope.dateo.address.trim() != '') {
		$http({
			  method : 'GET'
			, url    : 'http://nominatim.openstreetmap.org/reverse'
			, params : {
					lat               : lat
				, lon               : lng
				, format            : 'json'
				, 'accept-language' : 'es,en' 
 			}
		}).success(function (data, status){
			console.log("NOMINATIM REVERSE", data);
			$scope.dateo.address = data.display_name;
		}); 
	}
}

geocode = function (query) {
	$scope.flow.addressSearchLoading = true;
	$http({
		  method : 'GET'
		, url    : 'http://nominatim.openstreetmap.org/search'
		, params : {
				q                 : query
			, format            : 'json'
			, 'accept-language' : 'es,en'
			, countrycodes      : User.data.ip_country
			}
	}).success(function (data, status){
		console.log("NOMINATIM SEARCH", data);
		if (data.length == 1) {
			mapToAddress(data[0]);
		} else if (data.length > 1) {
			$scope.flow.addressSearchResults = data;
		} else {
			$scope.flow.addressNotFound = true;
			setTimeout(function () {
				$scope.$apply(function() {$scope.flow.addressNotFound = false;});
			}, 2000);
		}
		$scope.flow.addressSearchLoading = false;
		addressCache[query] = data;
	}).error(function (data, status) {
		$scope.flow.addressSearchLoading = false;
	}); 
}

mapToAddress = function (address) {
	var newDraggy, lat, lng;
	lat = parseFloat(address.lat);
	lng = parseFloat(address.lon);
	newDraggy = { 
		 			  lat : lat
          , lng : lng
          , draggable : true
          }
  angular.extend( $scope.datear.leaflet.markers.draggy, newDraggy );
  $scope.datear.leaflet.center.lat  = lat;
	$scope.datear.leaflet.center.lng  = lng;
	$scope.datear.leaflet.center.zoom = 16;
}

$scope.flow.searchAddressInMap = function () {
	var query, results;
	$('.address-search-btn').focus();
	if ($scope.dateo.address && $scope.dateo.address.trim() !== '' && !$scope.flow.addressSearchLoading) {
		query = $scope.dateo.address.trim();
		if (addressCache[query]) {
			results = addressCache[query];
			if (results.length > 1) {
				$scope.flow.addressSearchResults = results;
			} else if (results.length == 1) {
				mapToAddress(results[0]);
			} else {
				$scope.flow.addressNotFound = true;
				setTimeout(function () {
					$scope.$apply(function() {$scope.flow.addressNotFound = false;});
				}, 2000);
			}
		}else {
			geocode(query);
		}
	}
}

$scope.flow.selectAddress = function (idx) {
	var address = $scope.flow.addressSearchResults[idx];
	console.log("SELECTED ADDRESS", address);
	mapToAddress(address);
	$scope.flow.addressSearchResults = null;
}

$scope.flow.closeSelectAddress = function () {
	if (!$scope.flow.mouseOverSelectAddress) {
		$scope.flow.addressSearchResults = null;
	}
	$scope.flow.addressNotFound = false;
}


// Map defaults
defaultMap = angular.copy( config.defaultMap );
angular.extend( $scope.datear.leaflet, defaultMap );
if ( datearModalGivens.defaultTag ) {
	$scope.datear.selectedTags.push( datearModalGivens.defaultTag );
}
if ( datearModalGivens.suggestedTags ) {
	$scope.datear.suggestedTags = datearModalGivens.suggestedTags;
}
geo.getLocation( {timeout:10000} ).then( onGeolocation, onGeolocationError );


} ] );
