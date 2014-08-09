angular.module("dateaWebApp")
.directive("daCampaignForm", [ 
  'Api'
, 'geolocation'
, 'config'
, 'leafletData'
, 'User'
, '$location'
, '$rootScope'
, '$document'
, '$http'
, function(Api, geo, config, leafletData, User, $location, $rootScope, $document, $http) {
	return {
	      restrict: "E"
	    	, scope: {
	    		  mode 				  : '='
	    		, campaignId		: '=?'
	    	} 
	    , templateUrl: "views/campaign-form.html"
	    , controller: function ($scope, $element, $attrs) {

	    		var mode
	    		  , campaignGivens
					// boundary map options fix
					  , drawnItems  = new L.FeatureGroup()
					  , options     = { edit: { featureGroup: drawnItems }
					                  , draw: { marker: false, polyline: false, circle: false, rectangle: false, polygon: { allowIntersection: false } } }
					  , drawControl = new L.Control.Draw(options)
					// fn declarations
					  , buildCategories
					  , getCategory
					  , buildBoundariesMap
					  , onGeolocation
					  , onGeolocationError
					  , b64_to_utf8
					  , validateCampaign
					;

					User.isSignedIn() || $location.path( '/' );
	    		mode = $attrs.mode;

	    		$scope.campaign = { 
	    			  main_tag: {}
	    			, secondary_tags: []
	    			, published: true
	    			, default_vis: 'map'
	    			, layer_files: []
	    		}; 

					$scope.help							= {};
					$scope.flow             = {};
					$scope.flow.categories;
					$scope.flow.loading     = false;
					$scope.flow.validInput  = {};
					$scope.flow.messages    = {};
					$scope.flow.alerts      = [];
					$scope.flow.mode        = mode;
					$scope.flow.leaflet     = {
							controls   : { custom: [drawControl] }
						, center     : config.defaultMap.center
						, fileLayers : []
					};
					leafletData.getMap("leafletNewCampaign").then( function ( map ) {
						$scope.flow.leaflet.map = map;
					});

					$scope.flow.dp = {
						  minDate     : null
						, dateOptions : {
														  'year-format': "'yy'"
														, 'starting-day': 1
														}
						, format      : 'yyyy/MM/dd'
						, opened      : false
					}
					$scope.flow.dp.openDatepicker = function($event) {
						$event.stopPropagation();
						$event.preventDefault();
						$scope.flow.dp.opened = true;
					}
					$scope.flow.dp.clear = function() {
						$scope.flow.dp.endDate = null;
					}
					// Date watch
					$scope.$watch( 'flow.dp.endDate', function () {
						$scope.campaign.end_date = ($scope.flow.dp.endDate) ? $scope.flow.dp.endDate.toISOString() : null;
						console.log($scope.campaign.end_date);
					} );

	    		// GET CAMPAIGN MODEL FROM API IF EDITING
	    		if (mode == 'edit') {
	    			$scope.flow.loading = true;
	    			campaignGivens = {
	    				  id     : $scope.campaignId
	    			}
	    			Api.campaign
						.getCampaigns( campaignGivens )
						.then( function (response) {
								var latLngs = []
									, polygon
									, polygonBounds
								;
								angular.extend($scope.campaign, response.objects[0]);
								console.log($scope.campaign);
								$scope.flow.selectedCategory = $scope.campaign.category.id;
								$scope.flow.leaflet.center = {
									  lat  : $scope.campaign.center.coordinates[1]
									, lng  : $scope.campaign.center.coordinates[0]
									, zoom : $scope.campaign.zoom 
								}
								// boundary
								if ($scope.campaign.boundary && $scope.campaign.boundary.coordinates) {
									// leaflet draw cannot handle geojson at the moment (sadly)
									// var polygon = L.geoJson(boundary);
									// HACKING TO GET draw working without geojson
									angular.forEach($scope.campaign.boundary.coordinates[0], function (c) {
										latLngs.push(L.latLng(c[1], c[0]));
									} );
									polygon = L.polygon(latLngs, {
										  color       : '#E65F00'
										, fillColor   : '#E65F00'
										, fillOpacity : 0.2
									});
									drawnItems.addLayer(polygon);
									$scope.flow.leaflet.map.addLayer(polygon);
									
									// check if polygon is in map bounds, otherwise adjust viewport
									polygonBounds = polygon.getBounds();
									if (!map.getBounds().contains(polygonBounds)) {
										setTimeout(function() {
											$scope.flow.leaflet.map.fitBounds(polygonBounds);
										}, 300);
									}
								}
								// image
								if ($scope.campaign.image) {
									$scope.flow.img = config.api.imgUrl + $scope.campaign.image.image;
								}
								// layer files
								if ($scope.campaign.layer_files && $scope.campaign.layer_files.length > 0) {
									angular.forEach($scope.campaign.layer_files, function (lf) {
										var fname, ext;
										fname = lf.file.split('/').slice(-1)[0];
										ext   = fname.split('.').slice(-1)[0].toLowerCase();
										if (ext === 'kml') {
											$http.get(config.api.imgUrl+lf.file)
											.success( function (data) {
												var gjson, layer;
												gjson = toGeoJSON.kml(data, { styles: true });
												layer = L.geoJson(gjson, config.geoJSONStyle).addTo($scope.flow.leaflet.map);
												$scope.flow.leaflet.fileLayers.push({layer: layer, name: fname});
											} );
										}else if (ext === 'json') {
											$http.get(config.api.imgUrl+lf.file)
											.success( function (data) {
												var layer;
												layer = L.geoJson(data, config.geoJSONStyle).addTo($scope.flow.leaflet.map);
												$scope.flow.leaflet.fileLayers.push({layer: layer, name: fname});
											} );
										}

									});
								}
								$scope.flow.loading = false;
								// only edit ones own campaigns (protected in api anyway)
								//if (User.data.id != $scope.campaign.user.id) $location.path( '/' );
							}, function (reason) {
								$scope.flow.loading = false;
								console.log(reason);
						} );
	    		}

	    		onGeolocation = function ( data ) {
						var leaflet = {};
						console.log('sup onGeolocation')
						leaflet.center = { lat  : data.coords.latitude
						                 , lng  : data.coords.longitude
						                 , zoom : config.dashboard.defaultZoom
						                 }
						//leaflet.controls = { draw : { marker: false, polyline: false } }
						angular.extend( $scope.flow.leaflet, leaflet );
					}

					onGeolocationError = function () {
						console.log('sup onGeolocationError')
						// angular.extend( $$scope.newCampaign.leaflet, config.defaultMap );
					}

					buildCategories = function () {
						Api.category
						.getCategories( {} )
						.then( function ( response ) {
							$scope.flow.categories = response.objects;
							//console.log( $scope.flow.categories );
						} );
					}

					getCategory = function (id) {
						for (var i=0; i<$scope.flow.categories.length; i++) {
							if ($scope.flow.categories[i].id == id) return $scope.flow.categories[i];
						}
					}

					buildBoundariesMap = function () {
						geo.getLocation( { timeout:10000 } )
						.then( onGeolocationError, onGeolocationError );

						angular.extend( $scope.flow.leaflet, config.defaultMap );
						angular.extend( $scope.flow.leaflet, { controls : { custom: [drawControl] } });

						leafletData.getMap("leafletNewCampaign").then( function ( map ) {
							map.on('draw:created', function ( e ) {
								var layer = e.layer;
								$scope.campaign.boundary = layer.toGeoJSON().geometry;
								drawnItems.addLayer( layer );
								map.addLayer( layer );
								angular.element('div.leaflet-draw-toolbar-top').hide();
							});
							map.on('draw:deleted', function ( e ) {
								var layer = e.layers._layers[ Object.keys( e.layers._layers )[0] ];
								console.log( 'draw:deleted', e.layers._layers );
								map.removeLayer( layer );
								angular.element('div.leaflet-draw-toolbar-top').show();
							});
						});
					}

					$scope.flow.checkMainTag = function () {
						$scope.campaign.main_tag.tag = $scope.flow.hashtagify($scope.campaign.main_tag.tag);
						$scope.flow.messages.mainTagExists = '';
						if ( $scope.campaign.main_tag.tag ) {
							Api.campaign
							.getCampaigns( { main_tag: $scope.campaign.main_tag.tag } )
							.then( function ( response ) {
								console.log( 'checkMainTag', response, !!response.objects.length );
								if ($scope.campaign.id && !!response.objects.length && response.objects[0].id == $scope.campaign.id) {
									$scope.flow.validInput.mainTag = true;
									$scope.flow.messages.mainTagExists = '';
									return;
								}
								$scope.flow.validInput.main_tag     = !response.objects.length;
								$scope.flow.messages.mainTagExists = !response.objects.length ? '' : config.dashboard.validationMsgs.mainTagExists;
							}, function ( reason ) {
								console.log( reason	);
							} );
						}
					}

					$scope.flow.hashtagify = function ( name ) {
						name = name.replace(/[^a-z0-9]/gi,'');
						var hashtag = [];
						name.split(' ').map( function (v) { hashtag.push( v.charAt(0).toUpperCase() + v.slice(1) ) } );
						if (hashtag.length > 1) return hashtag.join('');
						return name;
					}

					$scope.flow.addTag = function () {
						$scope.flow.nextTag && $scope.campaign.secondary_tags.push( { title: $scope.flow.nextTag, tag: $scope.flow.hashtagify( $scope.flow.nextTag ) } );
						$scope.flow.nextTag = '';
					}

					b64_to_utf8 = function ( str ) {
					  return decodeURIComponent(escape(window.atob( str )));
					}

					// Add File
					$rootScope.$on('datea:fileLoaded', function ( ev, givens ) {
						var xmlStr, xmlDom, gjson, ext, layer;
						if (givens.data.name) { 
							ext = givens.data.name.split('.').slice(-1)[0].toLowerCase();
							$scope.campaign.layer_files.push( { file: { name: givens.data.name , data_uri: givens.file }});
							if (ext === 'kml') {
								xmlStr = b64_to_utf8(givens.file.split(';base64,')[1]);
								xmlDom = (new DOMParser()).parseFromString(xmlStr, 'text/xml');
								gjson  = toGeoJSON.kml(xmlDom, { styles: true });
								//console.log("MAPBOX KML", gjson);
														
							}else if (ext === 'json') {
								gjson = JSON.parse(b64_to_utf8(givens.file.split(';base64,')[1]));
								//console.log("MAPBOX GEOJSON", gjson);
							}
							layer = L.geoJson(gjson, config.geoJSONStyle).addTo($scope.flow.leaflet.map);	
							$scope.flow.leaflet.fileLayers.push({layer: layer, name: givens.data.name});
							//console.log("GEOJSON", gjson);
						}
						$scope.flow.nextFile     = null;
						$scope.flow.nextFileData = null;
					});

					$scope.flow.arrowUp = function ( idx ) {
						var temp;
						if ( idx > 0 ) {
							temp = $scope.campaign.secondary_tags[ idx - 1 ];
							$scope.campaign.secondary_tags[ idx - 1 ] = $scope.campaign.secondary_tags[ idx ];
							$scope.campaign.secondary_tags[ idx ]     = temp;
						}
					}

					$scope.flow.arrowDown = function ( idx ) {
						var temp;
						if ( idx < $scope.campaign.secondary_tags.length - 1 ) {
							temp = $scope.campaign.secondary_tags[ idx + 1 ];
							$scope.campaign.secondary_tags[ idx + 1 ] = $scope.campaign.secondary_tags[ idx ];
							$scope.campaign.secondary_tags[ idx ]     = temp;
						}
					}

					$scope.flow.removeTag = function ( idx ) {
						$scope.campaign.secondary_tags.splice( idx, 1 );
					}

					$scope.flow.removeFile = function ( idx ) {
						$scope.campaign.layer_files.splice( idx, 1 );
						$scope.flow.leaflet.map.removeLayer($scope.flow.leaflet.fileLayers[idx].layer);
						$scope.flow.leaflet.fileLayers.splice( idx, 1 );
					}

					// Date picker
					$scope.flow.today = function() {
						$scope.flow.dt = new Date();
					};
					// $$scope.flow.today();

					$scope.flow.save = function () {
						var center;

						$scope.campaign.end_date            = $scope.flow.dt && $scope.flow.dt;
						$scope.campaign.category            = getCategory($scope.flow.selectedCategory);
						//$scope.campaign.main_tag            = { tag: $scope.campaign.main_tag.replace('#', '') };
						$scope.campaign.layer_files               = $scope.campaign.layer_files.length && $scope.campaign.layer_files;
						$scope.campaign.center              = { type: 'Point', coordinates: [ -77.027772, -12.121937 ] };
						$scope.campaign.zoom                = $scope.flow.leaflet.center.zoom;

						// Image (if imgData exits, new file is being uploaded, else, stay with the old one, if any)
						if ( $scope.flow.imgData ) {
							$scope.campaign.image = [ { image : { name  : $scope.flow.imgData.name
		                                  						, data_uri : $scope.flow.img
		                                  					}
		                        						, order : 0
		                        						}
		                      						];
						}
			
						center = $scope.flow.leaflet.map.getCenter();
						$scope.campaign.center = { coordinates : [ center.lng, center.lat ]
	                        					 , type        : 'Point'
	                        					 }
	          if (validateCampaign()) {
	          	$scope.flow.loading = true;
							Api.campaign
							.postCampaign( $scope.campaign )
							.then( function ( response ) {
								console.log( 'postCampaign', response);
								$location.path( '/'+User.data.username+'/'+response.main_tag.tag );
							}, function ( reason ) {
								console.log( 'postCampaign reason: ', reason );
								$scope.flow.loading = false;
							} );
						}
					}

					validateCampaign = function () {
						var requiredFields = ['name', 'main_tag', 'category', 'short_description', 'mission', 'information_destiny']
						  , isValid = true;

						// clear validation
						for (var f in $scope.flow.validInput) {
							$scope.flow.validInput[f] = null;
						}

						for (var i in requiredFields) {
							var f = requiredFields[i];
							if ((f !== 'main_tag' && !$scope.campaign[f]) || (f === 'main_tag' && $.isEmptyObject($scope.campaign[f]))) {
								isValid = false;
								$scope.flow.validInput[f] = false;
							}
						}
						if (!isValid) {
							$scope.flow.alerts = ["Hmmm, parece que te faltó llenar algún campo. Chequea los campos marcados en rojo y vuélvelo a intentar."];
						}
						return isValid;
					}

					$scope.flow.closeAlert = function (index) {
						$scope.flow.alerts.splice(index, 1);
					}

					// HELP FOR INDIVIDUAL FIELDS/SECTIONS
					$scope.help = {
						  name : {
						  	content : 'Escoge un título llamativo, que describa e identifique tu iniciativa.'
						  }
						, mainTag : {
								title   : 'Tag principal'
							,	content : 'Este tag identifica tu iniciativa dentro y fuera de Datea. ¡Escogelo bien! '
											  + 'Toma en cuenta: que sea simple, identifique claramente tu iniciativa, no sea '
											  + 'muy generico a menos que desees compartirlo. Tips para diferenciar: inluye siglas de tu organización, '
											  + 'el lugar, año etc.'
						}
						, published : {
							  content : 'Las iniciativas publicadas aparece en nuestra busqueda.'
						}
						, image : {
							  content : 'La imágen que identifica a tu iniciativa en la plataforma. '
							          + 'Elige una que sea legible en varios tamaños.'
						}
						, endDate : {
							  content : 'Opcionalmente puedes indicar una fecha de cierre de tu iniciativa.'
						}
						, category : {
								content : 'Esta categoría ayuda a encontrar tu iniciativa en nuestra busqueda de iniciativas.'
						}
						, shortDescription : {
								content : 'Slogan, subtítulo o descripción corta de iniciativa (max 140 caractéres).'
						}
						, mission : {
							  content : 'Explícale a los usuarios la razón por la que deben participar de la iniciativa: objetivos, que se espera lograr.'
						}
						, informationDestiny : {
							  content : 'Indica que sucederá con la información que se recopila, si se va a mandar a algún lugar, quién la va a recibir etc.'
						}
						, secondaryTags : {
							  title   : 'Etiquetas'
							, content : 'Estas etiquetas le son sugeridas a los usuarios para categorizar sus dateos. ' 
												+ 'Por ello, ayudan luego a analizar mejor la información. Recomendamos elegir ' 
												+ 'con cuidado, reutilizar etiquetas existentes y no utilizar demasiadas (idealmente no más de 7).'
						} 
						, map : {
								title   : 'Opciones de ubicación'
							, content : 'Coloca el mapa en el lugar y nivel de zoom, en que quieres que aparezca. '
							  				+ 'Opcionalmente puedes delimitar la zona de dateo con un polígono, '
							  				+ 'utilizando el control respectivo en la parte superior izquierda del mapa. '
						}
						, layerFiles : {
								title   : 'Archivos Kml/geoJSON'
							, content : 'Opcionalmente puedes subir archivos kml o geoJSON para mostrar puntos, lineas y polígonos, incluyendo texto en popups. ' 
												+	'Recomendamos para ello crear archivos geoJSON en Mapbox, '
							  				+ 'porque son más compatibles con Datea y siempre conservan el estilo.'
						}
						, defaultVis : {
							  content : 'Elige cual de las visualizaciones aparecerá por defecto. Elige la que tenga más sentido para tu iniciativa.'
						}
						, defaultFilter : {
							  content : 'Si deseas moderar el contenido de tu iniciativa (aprobar dateos de otros usuarios), '
							  				+ 'entonces te sugerimos que enciendas este filtro. Asi aparecerán por defecto sólo '
							  				+ 'tus dateos y los que re-dateas. '
							  				+ 'Los usuarios pueden desactivar el filtro si lo desean.'
						}
					}

					buildCategories();
					buildBoundariesMap();
	    	}
	  	, link: function ($scope, element, attrs) {

	  		//var menuFixThold = angular.element('.campaign-form-nav').position().top - 51;
	  		var menuFixThold = 60;
	  		//console.log(menuFixThold);
	  		$scope.scrollTo = function($event, element, offset) {
						$event.stopPropagation();
						$event.preventDefault();
						$scope.flow.isScrolling = true;
						var elem = angular.element(document.getElementById(element));
						$document.scrollToElement(elem, offset, 400).then(function() {
							$scope.flow.isScrolling = false;
						});
					}

				$document.on('scroll', function() {
					//console.log($document.scrollTop());
					$scope.$apply(function() { $scope.flow.fixMenu = $document.scrollTop() > menuFixThold; });
				});

				$scope.$watch('flow.fixMenu', function () {
					if ($scope.flow.fixMenu) {
						var new_width = $('.form').width();
						$('.form-alert').width(new_width);
					}
				});

	  	}  
		} 
} ] );