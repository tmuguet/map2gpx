/* from https://stackoverflow.com/a/3855394 */
(function($) {
    $.QueryString = (function(paramsArray) {
        let params = {};

        for (let i = 0; i < paramsArray.length; ++i)
        {
            let param = paramsArray[i]
                .split('=', 2);

            if (param.length !== 2)
                continue;

            params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, " "));
        }

        return params;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

window.onload = function() {

    // First, find the current view
    $.Deferred(function() {
        var self = this;

        var view = [44.96777356135154, 6.06822967529297];   // Center in les Ecrins because I love this place
        if ('lat' in $.QueryString && 'lng' in $.QueryString) {
            view = [$.QueryString['lat'], $.QueryString['lng']];
        }

        if ('loc' in $.QueryString) {
            // Try to find location
            var options = {
                "text": $.QueryString['loc'],
                "filterOptions": {"type": ["StreetAddress","PositionOfInterest"]},
                "apiKey": keyIgn,
                onSuccess: function(results) {
                    if (results && 'suggestedLocations' in results && results['suggestedLocations'].length > 0) {
                        self.resolveWith([results['suggestedLocations'][0]['position']['y'], results['suggestedLocations'][0]['position']['x']]);
                    } else {
                        console.log("No results?");
                        self.resolveWith(view); // Use default view
                    }
                },
                onFailure: function(error) {
                    // Error, or no match
                    console.log(error);
                    self.resolveWith(view); // Use default view
                }
            };
            Gp.Services.autoComplete(options);
        } else {
            self.resolveWith(view);
        }
    }).done(function() {
        var view = this;

        var markers = [];   // Cache of defined markers
        var routes = [];    // Cache of computed routes
        var altitudes = {}; // Cache of computed altitudes for each points of routes computed so far
        var slopes = {}; // Cache of computed slopes for each points of routes computed so far
        var mode = null;

        L.LayerGroup.include({
            // TODO: legend
        });

        L.FeatureGroup.include({
            _elevations: [],
            _distance: 0,
            _altMin: 0,
            _altMax: 0,
            _slopeMin: 0,
            _slopeMax: 0,
            _denivPos: 0,
            _denivNeg: 0,

            getElevations: function() {return JSON.parse(JSON.stringify(this._elevations));},   // return deep copy (isn't there a better way??)
            getDistance: function() {return this._distance;},
            getAltMin: function() {return this._altMin;},
            getAltMax: function() {return this._altMax;},
            getSlopeMin: function() {return this._slopeMin;},
            getSlopeMax: function() {return this._slopeMax;},
            getDenivPos: function() {return this._denivPos;},
            getDenivNeg: function() {return this._denivNeg;},

            computeStats: function() {
                var gpx = this;
                return $.Deferred(function() {
                    var self = this;
                    $.when.apply($, gpx._fetchAltitude().concat(gpx._fetchSlope()))
                        .fail(function() {self.reject();})
                        .then(function() {
                            var elevations = [];

                            $.each(gpx.getLatLngs(), function(j, coords) {
                                var key = coords.lng + '/' + coords.lat;
                                var alt = null;
                                var slope = null;
                                if (key in altitudes) {
                                    alt = altitudes[key];
                                }
                                if (key in slopes) {
                                    slope = slopes[key];
                                }
                                elevations.push({lat: coords.lat, lon: coords.lng, z: alt, slope: slope});
                            });

                            if (elevations.length == 0) {
                                self.resolve();
                            }

                            // Calcul de la distance au départ pour chaque point + arrondi des lat/lon
                            gpx._distance = 0;
                            gpx._altMin = elevations[0].z;
                            gpx._altMax = elevations[0].z;
                            gpx._slopeMax = 0;
                            gpx._slopeMin = 0;
                            gpx._denivPos = 0;
                            gpx._denivNeg = 0;

                            elevations[0].dist = 0;
                            elevations[0].slopeOnTrack = 0;

                            gpx._elevations = [];
                            gpx._elevations.push(elevations[0]);

                            var j=0;
                            for (var i = 1; i < elevations.length; i++) {
                                var localDistance = _haversineDistance([elevations[i].lon, elevations[i].lat], [gpx._elevations[j].lon, gpx._elevations[j].lat]); // m
                                if (localDistance > 10) {
                                    gpx._distance += localDistance / 1000;   // km

                                    gpx._elevations.push(elevations[i]);
                                    j++;

                                    gpx._elevations[j].dist = gpx._distance;
                                    gpx._elevations[j].slopeOnTrack = Math.atan((Math.round(gpx._elevations[j].z) - Math.round(gpx._elevations[j-1].z)) / localDistance) * 180 / Math.PI;

                                    if (j > 5) {
                                        var previous = (gpx._elevations[j-5].slopeOnTrack + gpx._elevations[j-4].slopeOnTrack + gpx._elevations[j-3].slopeOnTrack + gpx._elevations[j-2].slopeOnTrack + gpx._elevations[j-1].slopeOnTrack) / 5
                                        gpx._elevations[j].slopeOnTrack = (previous + gpx._elevations[j].slopeOnTrack) / 2;
                                    }

                                    if (gpx._elevations[j].z < gpx._altMin)
                                        gpx._altMin = gpx._elevations[j].z;
                                    if (gpx._elevations[j].z > gpx._altMax)
                                        gpx._altMax = gpx._elevations[j].z;

                                    if (gpx._elevations[j].slopeOnTrack > gpx._slopeMax)
                                        gpx._slopeMax = gpx._elevations[j].slopeOnTrack;
                                    if (gpx._elevations[j].slopeOnTrack < gpx._slopeMin)
                                        gpx._slopeMin = gpx._elevations[j].slopeOnTrack;

                                    if (gpx._elevations[j].z < gpx._elevations[j-1].z)
                                        gpx._denivNeg += (Math.round(gpx._elevations[j-1].z) - Math.round(gpx._elevations[j].z));
                                    else
                                        gpx._denivPos += (Math.round(gpx._elevations[j].z) - Math.round(gpx._elevations[j-1].z));
                                }
                            }

                            self.resolve();
                        });
                });
            },

            _fetchAltitude: function() {
                var gpx = this;
                var geometry = []; // Batch
                var promises = [];

                $.each(gpx.getLatLngs(), function(j, coords) {
                    if (!(coords.lng + '/' + coords.lat in altitudes)) { // Skip already cached values
                        geometry.push({
                            lon: coords.lng,
                            lat: coords.lat
                        });
                        if (geometry.length == 50) {
                            // Launch batch
                            promises.push(fetchAltitude(geometry));
                            geometry = [];
                        }
                    }
                });

                if (geometry.length > 0) {
                    // Launch last batch
                    promises.push(fetchAltitude(geometry));
                }
                return promises;
            },

            _fetchSlope: function() {
                var gpx = this;
                var tiles = {};

                $.each(gpx.getLatLngs(), function(j, coords) {
                    if (!(coords.lng + '/' + coords.lat in slopes)) { // Skip already cached values
                        var tile = latlngToTilePixel(coords, map.options.crs, 16, 256, map.getPixelOrigin());

                        if (!(tile[0].x in tiles))
                            tiles[tile[0].x] = {};
                        if (!(tile[0].y in tiles[tile[0].x]))
                            tiles[tile[0].x][tile[0].y] = [[]];

                        if (tiles[tile[0].x][tile[0].y][tiles[tile[0].x][tile[0].y].length-1].length > 50)
                            tiles[tile[0].x][tile[0].y].push([]);

                        tiles[tile[0].x][tile[0].y][tiles[tile[0].x][tile[0].y].length-1].push({lat: coords.lat, lon: coords.lng, x: tile[1].x, y: tile[1].y});
                    }
                });

                var promises = [];
                $.each(tiles, function(x, _y) {
                    $.each(_y, function(y, batches) {
                        $.each(batches, function(j, batch) {
                            promises.push(fetchSlope(x, y, batch));
                        });
                    });
                });
                return promises;
            },
        });

        L.GeoJSON.include({
            getLatLngs: function() {
                var geojson = this;
                var c = [];

                geojson.eachLayer(function(layer) {
                    $.each(layer.feature.geometry.coordinates, function(j, coords) {
                        c.push(L.latLng(coords[LAT], coords[LON]));
                    });
                });
                return c;
            }
        });

        var colorMap = {'red': '#D63E2A', 'orange': '#F59630', 'green': '#72B026', 'blue': '#38AADD', 'purple': '#D252B9',
            'darkred': '#A23336', 'darkblue': '#0067A3', 'darkgreen': '#728224', 'darkpurple': '#5B396B', 'cadetblue': '#436978',
            'lightred': '#FF8E7F', 'beige': '#FFCB92', 'lightgreen': '#BBF970', 'lightblue': '#8ADAFF', 'pink': '#FF91EA',
            'white': '#FBFBFB', 'lightgray': '#A3A3A3', 'gray': '#575757', 'black': '#303030'};
        var colors = ['blue', 'green', 'orange', 'purple', 'red', 'darkblue', 'darkpurple', 'lightblue', 'lightgreen', 'beige', 'pink', 'lightred'];
        var currentColor = 0;
        function nextColor() {
            currentColor = (currentColor + 1) % colors.length;
            return currentColor;
        }

        L.Marker.include({
            __type: 'waypoint',
            __color: currentColor,
            getColorCode: function() {return colors[this.__color];},
            getColorRgb: function() {return colorMap[colors[this.__color]];},
            getColorIndex: function() {return this.__color;},
            setColorIndex: function(i) {this.__color = i;},
            getType: function() {return this.__type;},
            setType: function(type) {
                this.__type = type;
                if (type == "waypoint") {
                    this.setIcon(L.AwesomeMarkers.icon({
                        icon: 'circle',
                        markerColor: this.getColorCode(),
                        prefix: 'fa'
                    }));
                } else {
                    this.setIcon(L.AwesomeMarkers.icon({
                        icon: 'asterisk',
                        markerColor: this.getColorCode(),
                        prefix: 'fa'
                    }));
                }
            }
        });

        var isSmallScreen = (window.innerWidth <= 800 && window.innerHeight <= 600);

        if (isSmallScreen) {
            var popup = $('<div style="position: fixed; top: 0px; bottom: 0px; left: 0px; right: 0px; z-index: 10000; background-color: #C0C0C0" id="mobile-warning"><strong>Attention:</strong> ce site n\'est pas destiné aux mobiles. <button>Ok, j\'ai compris</button></div>');
            popup.find("button").click(function() {
                popup.hide();
            });
            popup.appendTo("body");
        }

        // Central map
        var map = L.map('map', {
            loadingControl: true
        }).setView(view, 13);

        L.geoportalLayer.WMTS({
            layer: "ORTHOIMAGERY.ORTHOPHOTOS",
            apiKey: keyIgn
        }).addTo(map);
        var slopes =  L.geoportalLayer.WMTS({
            layer: "GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN",
            apiKey: keyIgn
        }, {
            opacity: 0.25
        }).addTo(map);
        L.geoportalLayer.WMTS({
            layer: "GEOGRAPHICALGRIDSYSTEMS.MAPS",
            apiKey: keyIgn
        }, {
            opacity: 0.25
        }).addTo(map);

        // Add controls
        L.geoportalControl.SearchEngine({displayAdvancedSearch: false}).addTo(map);

        // Mini-map
        if (!isSmallScreen) {
            var miniMapLayer = L.geoportalLayer.WMTS({
                layer: "GEOGRAPHICALGRIDSYSTEMS.MAPS",
                apiKey: keyIgn
            });
            var miniMap = new L.Control.MiniMap(miniMapLayer, {
                'position': 'bottomleft',
                'zoomLevelOffset': -4
            }).addTo(map);
        }
        var layerSwitcher = L.geoportalControl.LayerSwitcher({
            collapsed : isSmallScreen
        });
        map.addControl(layerSwitcher);
        layerSwitcher.setVisibility(slopes, false);

        if (!isSmallScreen) {
            map.addControl(L.control.scale({
                'imperial': false,
                'position': 'bottomright'
            }));
        }

        var automatedBtn = L.easyButton({
            states: [{
                stateName: 'loaded',
                icon: 'fa-map-signs',
                title: 'Tracer automatiquement l\'itinéraire',
                onClick: function(btn, map) {
                    btn.state('active');
                    lineBtn.state('loaded');
                    mode = "auto";
                    map.doubleClickZoom.disable();
                }
            },{
                stateName: 'active',
                icon: 'fa-map-signs',
                title: 'Tracer automatiquement l\'itinéraire',
                onClick: function(btn, map) {
                    btn.state('loaded');
                    mode = null;
                    map.doubleClickZoom.enable();
                }
            },{
                stateName: 'invalid',
                icon: 'fa-map-signs',
                title: 'Tracer automatiquement l\'itinéraire',
            }]
        });
        var lineBtn = L.easyButton({
            states: [{
                stateName: 'loaded',
                icon: 'fa-map-marker',
                title: 'Tracer l\'itinéraire en ligne droite',
                onClick: function(btn, map) {
                    btn.state('active');
                    automatedBtn.state('loaded');
                    mode = "straight";
                    map.doubleClickZoom.disable();
                }
            },{
                stateName: 'active',
                icon: 'fa-map-marker',
                title: 'Tracer l\'itinéraire en ligne droite',
                onClick: function(btn, map) {
                    btn.state('loaded');
                    mode = null;
                    map.doubleClickZoom.enable();
                }
            },{
                stateName: 'invalid',
                icon: 'fa-map-marker',
                title: 'Tracer l\'itinéraire en ligne droite'
            }]
        });
        var closeLoop = L.easyButton({
            states: [{
                stateName: 'loaded',
                icon: 'fa-magic',
                title: 'Fermer la boucle',
                onClick: function(btn, map) {
                    if (markers.length > 1) {
                        var first = markers[0];
                        addMarker({
                            latlng: first.getLatLng()
                        });
                    }
                }
            }, {
                stateName: 'computing',
                icon: 'fa-spinner fa-pulse',
                title: 'Fermer la boucle (calcul en cours...)'
            }, {
                stateName: 'invalid',
                icon: 'fa-magic',
                title: 'Fermer la boucle (invalide!)'
            }]
        });
        L.easyBar([automatedBtn, lineBtn, closeLoop]).addTo(map);

        var exportPopup = L.popup().setContent('<input type="text" value="nom" class="export-filename"/><br/><button class="export-gpx-button"><span class="ico gpx"></span></button><button class="export-kml-button"><span class="ico kml"></span></button>');
        var exportButton = L.easyButton({
            states: [{
                stateName: 'loaded',
                icon: 'fa-cloud-download',
                title: 'Exporter',
                onClick: function(btn, map) {
                    var bounds = L.latLngBounds(markers[0].getLatLng(), markers[1].getLatLng());
                    $.each(routes, function(i, group) {
                        bounds.extend(group[0].getBounds());
                    });

                    map.flyToBounds(bounds, {padding: [50, 50]});
                    exportPopup.setLatLng(markers[0].getLatLng()).openOn(map);
                    var o = this;
                    $(".export-gpx-button:visible").click(function() {
                        var btn = $(this);
                        btn.attr("disabled", "disabled");
                        $.when(exportGpx($(".export-filename:visible").val())).then(function() {
                            btn.removeAttr("disabled");
                        });
                    });
                    $(".export-kml-button:visible").click(function() {
                        var btn = $(this);
                        btn.attr("disabled", "disabled");
                        $.when(exportKml($(".export-filename:visible").val())).then(function() {
                            btn.removeAttr("disabled");
                        });
                    });
                }
            }, {
                stateName: 'computing',
                icon: 'fa-spinner fa-pulse',
                title: 'Exporter (calcul en cours...)'
            }, {
                stateName: 'invalid',
                icon: 'fa-cloud-download',
                title: 'Exporter (invalide!)'
            }]
        }).addTo(map);

        var importPopup = L.popup().setContent('<form enctype="multipart/form-data"><input class="import-gpx-file" type="file" name="files[]"/></form><br/><button class="import-gpx-button"><span class="ico gpx"></span></button><br/><span class="import-gpx-status"></span>');
        var importButton = L.easyButton({
            states: [{
                stateName: 'loaded',
                icon: 'fa-cloud-upload',
                title: 'Importer',
                onClick: function(btn, map) {
                    importPopup.setLatLng(map.getCenter()).openOn(map);
                    var o = this;
                    $(".import-gpx-button:visible").click(function() {
                        var btn = $(this);

                        var files = $(".import-gpx-file:visible")[0].files; // FileList object
                        // use the 1st file from the list
                        f = files[0];

                        if (f == undefined) {
                            $(".import-gpx-status:visible").text("Veuillez sélectionner un fichier");
                            return;
                        }

                        btn.attr("disabled", "disabled");
                        updateButtons(false);
                        $(".import-gpx-status:visible").text("Importation en cours...");

                        var reader = new FileReader();
                        // Closure to capture the file information.
                        reader.onload = (function(theFile) {
                            return function(e) {

                                var line = new L.GPX(e.target.result, {
                                    async: false,
                                    onFail: function() {
                                        console.log("Failed to retrieve track");
                                        $(".import-gpx-status:visible").text("Imposible de traiter ce fichier");
                                        btn.removeAttr("disabled");
                                        updateButtons(true);
                                    },
                                    onSuccess: function(track) {
                                        $(".import-gpx-status:visible").text("Récupération des données géographiques en cours...");
                                        // Re-init routes/markers
                                        var oldRoutes = routes;
                                        routes = [];
                                        $.each(oldRoutes, function() {
                                            map.removeLayer(this[0]);
                                        });
                                        var oldMarkers = markers;
                                        markers = [];
                                        $.each(oldMarkers, function() {
                                            map.removeLayer(this);
                                        });

                                        track.computeStats().then(function() {

                                            // Add new route+markers
                                            routes.push([track, 'import']);

                                            var start = track.getLatLngs()[0];
                                            var end = track.getLatLngs()[track.getLatLngs().length-1];

                                            var marker = L.marker(start, {draggable: false});
                                            marker.setType('waypoint');
                                            markers.push(marker);
                                            marker.addTo(map);

                                            var marker2 = L.marker(end, {draggable: false});
                                            marker2.setType('step');
                                            markers.push(marker2);
                                            marker2.addTo(map);

                                            var deleteTrack = function() {
                                                var o = this;
                                                $(".track-delete-button:visible").click(function() {
                                                    map.removeLayer(track);
                                                    map.removeLayer(marker);
                                                    map.removeLayer(marker2);

                                                    routes = [];
                                                    markers = [];

                                                    updateButtons(true);
                                                    replot();
                                                });
                                            };

                                            marker.bindPopup("<button class='track-delete-button'><i class='fa fa-trash' aria-hidden='true'></i> Supprimer l'import</button>");
                                            marker.on("popupopen", deleteTrack);
                                            marker2.bindPopup("<button class='track-delete-button'><i class='fa fa-trash' aria-hidden='true'></i> Supprimer l'import</button>");
                                            marker2.on("popupopen", deleteTrack);
                                            track.bindPopup("<button class='track-delete-button'><i class='fa fa-trash' aria-hidden='true'></i> Supprimer l'import</button>");
                                            track.on("popupopen", deleteTrack);

                                            map.fitBounds(track.getBounds(), {padding: [200, 200]});
                                            track.addTo(map);
                                            track.snakeIn();

                                            updateButtons(true);
                                            replot();
                                            importPopup.remove();
                                        }).fail(function() {
                                            console.log("Fail");
                                            $(".import-gpx-status:visible").text("Impossible de récupérer les données géographiques de ce parcours");
                                            btn.removeAttr("disabled");
                                            updateButtons(true);
                                        });
                                    }
                                });
                            };
                        })(f);

                        // Read in the image file as a data URL.
                        reader.readAsText(f);
                    });
                }
            }]
        }).addTo(map);

        if (!isSmallScreen) {
            var infoPopup = L.popup().setContent(L.DomUtil.get("about"));
            var infoButton = L.easyButton({
                position: 'bottomright',
                states: [{
                    icon: 'fa-info-circle',
                    onClick: function(btn, map) {
                        infoPopup.setLatLng(map.getCenter()).openOn(map);
                    },
                    title: 'A propos & crédits'
                }]
            }).addTo(map);

            var welcomePopup = L.popup().setContent(L.DomUtil.get("welcome"));
            welcomePopup.setLatLng(map.getCenter()).openOn(map);
        }

        // Map interactions
        map.on('dblclick', addMarker);
        map.on('zoomend ', function() {console.log("Zoomed to ", map.getZoom());});
        map.on('moveend  ', function() {console.log("Moved to ", map.getCenter());});


        // Logic
        function updateButtons(enabled) {
            if (enabled) {
                if (routes.length == 1 && routes[0][1] == "import") {
                    automatedBtn.disable();
                    automatedBtn.state('loaded');
                    lineBtn.disable();
                    lineBtn.state('loaded');
                    mode = null;
                    map.doubleClickZoom.enable();

                    closeLoop.disable();
                    exportButton.disable();
                } else {
                    automatedBtn.enable();
                    lineBtn.enable();
                    if (markers.length > 1) {
                        closeLoop.enable();
                        exportButton.enable();
                    } else {
                        closeLoop.disable();
                        exportButton.disable();
                    }
                }

                var invalid = false;
                $.each(routes, function(i, group) {
                    if (group == null) {
                        invalid = true;
                    }
                });
                if (invalid) {
                    closeLoop.state('invalid');
                    exportButton.state('invalid');
                    closeLoop.disable();
                    exportButton.disable();
                    $("#data-invalid").show();
                } else {
                    closeLoop.state('loaded');
                    exportButton.state('loaded');
                    $("#data-invalid").hide();
                }
                $("#data-computing").fadeOut();
            } else {
                $("#data-computing").fadeIn();
                closeLoop.state('computing');
                exportButton.state('computing');
                closeLoop.disable();
                exportButton.disable();
            }
        }
        updateButtons(true);

        const LON=0;
        const LAT=1;
        const ALT=2;
        const SLOPE=3;

        // Converts from radians to degrees.
        Math.roundE8 = function(value) {
            return Math.round(value * Math.pow(10, 8)) / Math.pow(10, 8);
        };

        // Converts from degrees to radians.
        Math.radians = function(degrees) {
            return degrees * Math.PI / 180;
        };

        // Converts from radians to degrees.
        Math.degrees = function(radians) {
            return radians * 180 / Math.PI;
        };

        /** Returns the distance from c1 to c2 using the haversine formula */
        function _haversineDistance(c1, c2) {
            var lat1 = Math.radians(c1[LAT]);
            var lat2 = Math.radians(c2[LAT]);
            var deltaLatBy2 = (lat2 - lat1) / 2;
            var deltaLonBy2 = Math.radians(c2[LON] - c1[LON]) / 2;
            var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
                Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
                Math.cos(lat1) * Math.cos(lat2);
            return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // from https://gis.stackexchange.com/questions/157693/getting-all-vertex-lat-long-coordinates-every-1-meter-between-two-known-points
        function getDestinationLatLong(start, azimuth, distance) {
            var R = 6378137; // Radius of the Earth in m
            var brng = Math.radians(azimuth); // Bearing is degrees converted to radians.
            var lat1 = Math.radians(start[LAT]); //Current dd lat point converted to radians
            var lon1 = Math.radians(start[LON]); //Current dd long point converted to radians
            var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance/R) + Math.cos(lat1)* Math.sin(distance/R)* Math.cos(brng));
            var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distance/R)* Math.cos(lat1), Math.cos(distance/R)- Math.sin(lat1)* Math.sin(lat2));
            //convert back to degrees
            lat2 = Math.degrees(lat2);
            lon2 = Math.degrees(lon2);
            return [Math.roundE8(lon2), Math.roundE8(lat2)];
        }

        function _bearing(c1, c2) {
            var startLat = Math.radians(c1[LAT]);
            var startLong = Math.radians(c1[LON]);
            var endLat = Math.radians(c2[LAT]);
            var endLong = Math.radians(c2[LON]);
            var dLong = endLong - startLong;
            var dPhi = Math.log(Math.tan(endLat/2.0 + Math.PI/4.0) / Math.tan(startLat/2.0 + Math.PI/4.0));
            if (Math.abs(dLong) > Math.PI) {
                 if (dLong > 0.0)
                     dLong = -(2.0 * Math.PI - dLong);
                 else
                     dLong = (2.0 * Math.PI + dLong);
            }
            return (Math.degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        }

        function computeStraightRoute(start, end, index) {
            return $.Deferred(function() {
                var self = this;

                var onFail = function(error) {
                    console.log(error);
                    routes[index] = null;
                    self.reject();
                };

                var c1 = [Math.roundE8(start.getLatLng().lng), Math.roundE8(start.getLatLng().lat)];
                var c2 = [Math.roundE8(end.getLatLng().lng), Math.roundE8(end.getLatLng().lat)];
                var d = _haversineDistance(c1, c2);
                var azimuth = _bearing(c1, c2);

                var coordinates = [c1];

                var interval = 5;
                for (var counter = interval; counter < d; counter+=interval) {
                    var coord = getDestinationLatLong(c1, azimuth, counter);
                    coordinates.push(coord);
                }
                coordinates.push(c2);

                var lines = [{
                    "type": "LineString",
                    "coordinates": coordinates
                }];

                var geojson = L.geoJSON(lines, {
                    color: start.getColorRgb(),
                    weight: 5,
                    opacity: 0.75,
                    snakingPause: 0, snakingSpeed: 1000
                });

                var done = function() {
                    routes[index] = [geojson, 'straight'];
                    geojson.addTo(map);
                    geojson.bindPopup("Calculs en cours...");
                    geojson.snakeIn();
                    start.setOpacity(1);
                    end.setOpacity(1);
                    geojson.on('snakeend', function() {
                        self.resolve();
                    });
                };

                geojson.computeStats().then(done).fail(function() {
                    onFail("Impossible d'obtenir les données de la route");
                });
            });
        }

        function latlngToTilePixel(latlng, crs, zoom, tileSize, pixelOrigin) {
            const layerPoint = crs.latLngToPoint(latlng, zoom).floor()
            const tile = layerPoint.divideBy(tileSize).floor()
            const tileCorner = tile.multiplyBy(tileSize).subtract(pixelOrigin)
            const tilePixel = layerPoint.subtract(pixelOrigin).subtract(tileCorner)
            return [tile, tilePixel];
        }

        function delay(ms){
            return $.Deferred(function() {
                var self = this;
                setTimeout(function(){ self.resolve(); }, ms);
            });
        }

        function computeRoute(start, end, index) {

            return $.Deferred(function() {
                var self = this;
                var worked = false;

                var onFail = function(error) {
                    console.log(error);
                    console.log("Trying straight line...");
                    computeStraightRoute(start, end, index)
                        .done(function() {self.resolve();})
                        .fail(function() {self.reject(); });
                };

                var startLatLng = start.getLatLng();
                var endLatLng = end.getLatLng();

                var options = {
                    distanceUnit: "m",
                    endPoint: {
                        x: endLatLng.lng,
                        y: endLatLng.lat
                    },
                    exclusions: [],
                    geometryInInstructions: true,
                    graph: "Pieton",
                    routePreferences: "fastest",
                    startPoint: {
                        x: startLatLng.lng,
                        y: startLatLng.lat
                    },
                    viaPoints: [],
                    apiKey: keyIgn,
                    onSuccess: function(results) {
                        worked = true;
                        if (results) {
                            var geojson = L.geoJSON([], {
                                color: start.getColorRgb(),
                                weight: 5,
                                opacity: 0.75,
                                snakingPause: 0, snakingSpeed: 1000
                            });

                            var _geometry = {
                                type: "FeatureCollection",
                                features: []
                            };
                            var counter = 1;
                            $.each(results.routeInstructions, function(idx, instructions) {
                                counter++;
                                _geometry.features.push({
                                    id: counter,
                                    type: "Feature",
                                    geometry: instructions.geometry
                                });
                            });
                            geojson.addData(_geometry);

                            var done = function() {
                                routes[index] = [geojson, 'auto'];
                                geojson.addTo(map);
                                geojson.bindPopup("Calculs en cours...");
                                geojson.snakeIn();
                                start.setOpacity(1);
                                end.setOpacity(1);
                                geojson.on('snakeend', function() {
                                    self.resolve();
                                });
                            };

                            geojson.computeStats().then(done).fail(function() {
                                onFail("Impossible d'obtenir les données de la route");
                            });
                        } else {
                            onFail("Impossible d'obtenir la route");
                        }
                    },
                    onFailure: function(error) {    // seems to never be called
                        worked = true;
                        onFail("Impossible d'obtenir la route: " + error.message);
                    }
                };
                Gp.Services.route(options);

                var timeout = delay(4000);
                timeout.then(function(){
                    if (!worked)
                        onFail("Impossible d'obtenir la route: timeout");
                });
            });
        }

        function addMarker(e) {
            if (mode == null) {
                return;
            }

            updateButtons(false); // Disabled while computations
            var promises = [];

            var latlng = L.latLng(Math.roundE8(e.latlng.lat), Math.roundE8(e.latlng.lng));
            var marker = L.marker(latlng, {
                riseOnHover: true,
                draggable: true,
                opacity: 0.5
            }).bindPopup("<button class='marker-promote-button'><i class='fa fa-asterisk' aria-hidden='true'></i> Marquer comme étape</button> <button class='marker-delete-button'><i class='fa fa-trash' aria-hidden='true'></i> Supprimer ce marqueur</button>");
            marker.on("popupopen", function() {
                var o = this;
                $(".marker-delete-button:visible").click(function() {
                    map.removeLayer(o); // Routes will be deleted when marker gets deleted
                });
                $(".marker-promote-button:visible").click(function() {
                    o.setColorIndex(nextColor());
                    o.setType('step');
                    var colorRgb = o.getColorRgb();

                    var markerIndex = markers.indexOf(o);
                    if (markerIndex > -1) {
                        for (var i = markerIndex + 1; i < markers.length; i++) {
                            if (i > 0) {
                                var routeTo = routes[i - 1];    // Route ending at this marker
                                routeTo[0].setStyle({color: colorRgb});
                            }

                            if (markers[i].getType() == "step") {
                                break;
                            }
                            markers[i].setColorIndex(currentColor);
                            markers[i].setType(markers[i].getType());
                        }
                    }
                    replot();
                });
            });
            if (markers.length > 0) {
                marker.setColorIndex(markers[markers.length - 1].getColorIndex());
            } else {
                marker.setColorIndex(currentColor);
            }
            marker.setType('waypoint');
            markers.push(marker);
            marker.addTo(map);

            if (markers.length > 1) {
                // Compute route between this new marker and the previous one
                var markerIndex = markers.length - 1;
                var start = markers[markerIndex - 1]; // previous
                var end = markers[markerIndex]; // this

                if (routes.length != markerIndex - 1)
                    console.log("Something wrong"); // but we can probably recover

                promises.push(mode == "auto" ? computeRoute(start, end, markerIndex - 1)
                    : computeStraightRoute(start, end, markerIndex - 1));
            }

            marker.on('moveend', function(event) {
                // Update routes when moving this marker
                updateButtons(false);
                event.target.setOpacity(0.5);
                var promises = [];

                var markerIndex = markers.indexOf(event.target);
                if (markerIndex > -1 && routes.length > 0) {
                    if (markerIndex < markers.length - 1) {
                        // Re-compute route starting at this marker
                        var routeFrom = routes[markerIndex];

                        if (routeFrom != null)
                            map.removeLayer(routeFrom[0]);

                        var start = markers[markerIndex];
                        var end = markers[markerIndex + 1];

                        var _mode = "auto";
                        if (mode == null && routeFrom != null) {
                            _mode = routeFrom[1];
                        }
                        promises.push((_mode == "auto") ? computeRoute(start, end, markerIndex)
                            : computeStraightRoute(start, end, markerIndex));
                    }

                    if (markerIndex > 0) {
                        // Re-compute route ending at this marker
                        var routeTo = routes[markerIndex - 1];

                        if (routeTo != null)
                            map.removeLayer(routeTo[0]);

                        var start = markers[markerIndex - 1];
                        var end = markers[markerIndex];
                        var _mode = "auto";
                        if (mode == null && routeTo != null) {
                            _mode = routeTo[1];
                        }
                        promises.push((_mode == "auto") ? computeRoute(start, end, markerIndex - 1)
                            : computeStraightRoute(start, end, markerIndex -1));
                    }
                }

                $.when.apply($, promises).done(function() {
                    replot();
                    event.target.setOpacity(1);
                    updateButtons(true);
                }).fail(function() {
                    replot();
                    updateButtons(true);
                });
            });

            marker.on('remove', function(event) {
                // Remove/update routes when removing this marker
                updateButtons(false);
                var promises = [];

                var markerIndex = markers.indexOf(event.target);
                if (markerIndex > -1) {
                    if (event.target.getType() == "step" && markerIndex > 0) {
                        for (var i = markerIndex + 1; i < markers.length; i++) {
                            if (i > 0) {
                                var routeTo = routes[i - 1];    // Route ending at this marker
                                routeTo[0].setStyle({color: markers[markerIndex - 1].getColorRgb()});
                            }

                            if (markers[i].getType() == "step") {
                                break;
                            }
                            markers[i].setColorIndex(markers[markerIndex - 1].getColorIndex());
                            markers[i].setType(markers[i].getType());
                        }
                    }

                    if (markerIndex == 0) {
                        if (routes.length > 0) {
                            // Remove route starting at this marker
                            var routeFrom = routes[0];

                            if (routeFrom != null)
                                map.removeLayer(routeFrom[0]);
                            routes.splice(0, 1);

                            replot();
                        }
                    } else if (markerIndex == markers.length - 1) {
                        // Remove route ending at this marking
                        var routeTo = routes[markerIndex - 1];

                        if (routeTo != null)
                                map.removeLayer(routeTo[0]);
                        routes.splice(markerIndex - 1, 1);

                        replot();
                    } else {
                        // Remove route ending at this marker & route starting at this marker
                        var routeTo = routes[markerIndex - 1];
                        var routeFrom = routes[markerIndex];
                        if (routeTo != null)
                            map.removeLayer(routeTo[0]);
                        if (routeFrom != null)
                            map.removeLayer(routeFrom[0]);

                        routes.splice(markerIndex, 1); // Remove route starting at this marker

                        // Re-compute new route between previous & next markers
                        var start = markers[markerIndex - 1];
                        var end = markers[markerIndex + 1];
                        var _mode = "auto";
                        if (mode == null && routeTo != null) {
                            _mode = routeTo[1];
                        }
                        promises.push((_mode == "auto") ? computeRoute(start, end, markerIndex - 1)
                            : computeStraightRoute(start, end, markerIndex -1));
                    }
                    markers.splice(markerIndex, 1);
                }
                $.when.apply($, promises).done(function() {
                    replot();
                    updateButtons(true);
                }).fail(function() {
                    replot();
                    updateButtons(true);
                });
            });

            $.when.apply($, promises).done(function() {
                replot();
                marker.setOpacity(1);
                updateButtons(true);
            }).fail(function() {
                replot();
                updateButtons(true);
            });
        }

        function fetchAltitude(geometry) {
            return $.Deferred(function() {
                var self = this;
                var options = {
                    apiKey: keyIgn,
                    sampling: geometry.length,
                    positions: geometry,
                    onSuccess: function(result) {
                        if (result) {
                            $.each(result.elevations, function(i, val) {
                                var key = val.lon + '/' + val.lat;
                                altitudes[key] = val.z;
                            });
                            self.resolve();
                        } else {
                            console.log("Impossible d'obtenir les données d'altitude: résultats invalides");
                            self.reject();
                        }
                    },
                    /** callback onFailure */
                    onFailure: function(error) {
                        console.log("Impossible d'obtenir les données d'altitude: ", error.message);
                        self.reject();
                    }
                };
                // Request altitude service
                Gp.Services.getAltitude(options);
            });
        }

        function fetchSlope(tilex, tiley, coords) {
            return $.Deferred(function() {
                var self = this;

                var data = {
                    tilematrix: 16, tilerow: tiley, tilecol: tilex, lon: '', lat: '', x: '', y: ''
                };

                $.each(coords, function(idx, coord) {
                    if (idx > 0) {
                        data.lon += '|';
                        data.lat += '|';
                        data.x += '|';
                        data.y += '|';
                    }

                    data.lon += coord.lon.toString();
                    data.lat += coord.lat.toString();
                    data.x += coord.x.toString();
                    data.y += coord.y.toString();
                });

                $.getJSON("slope.php", data, function (r) {
                    if (r.results) {
                        $.each(r.results, function(i, val) {
                            var key = val.lon + '/' + val.lat;
                            slopes[key] = val.slope;
                        });
                        self.resolve();
                    } else {
                        console.log("Impossible d'obtenir les données de pente: résultats invalides");
                        self.reject();
                    }
                }).fail(function(jqxhr, textStatus, error) {
                    var err = textStatus + ", " + error;
                    console.log("Impossible d'obtenir les données de pente: ", err);
                    self.reject();
                });
            });
        }

        function exportGpx(filename) {
            return $.Deferred(function() {
                var self = this;
                try {
                    var isFileSaverSupported = !! new Blob;
                } catch (e) {}
                if (!isFileSaverSupported) { /* can't check this until Blob polyfill loads above */
                    self.reject();
                    return false;
                }

                var xml = '<?xml version="1.0"?>\n';
                xml += '<gpx creator="map2gpx.fr" version="1.0" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n';
                xml += '    <trk>\n';
                xml += '        <name>' + filename + '</name>\n';
                xml += '        <trkseg>\n';
                $.each(routes, function(i, group) {
                    $.each(group[0].getLatLngs(), function(j, coords) {
                        xml += '            <trkpt lat="' + coords.lat + '" lon="' + coords.lng + '">';
                        if (coords.lng + '/' + coords.lat in altitudes) {
                            xml += '<ele>' + altitudes[coords.lng + '/' + coords.lat] + '</ele>';
                        }
                        xml += '</trkpt>\n';
                    });
                });
                xml += '        </trkseg>\n    </trk>\n</gpx>\n';
                var blob = new Blob([xml], {
                    type: "application/gpx+xml;charset=utf-8"
                });
                saveAs(blob, filename + ".gpx");
                self.resolve();
            });
        }

        function exportKml(filename) {
            return $.Deferred(function() {
                var self = this;
                try {
                    var isFileSaverSupported = !! new Blob;
                } catch (e) {}
                if (!isFileSaverSupported) { /* can't check this until Blob polyfill loads above */
                    self.reject();
                    return false;
                }
                var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                xml += '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n';
                xml += '    <Document>\n';
                xml += '        <name>' + filename + '.kml</name>\n';
                xml += '        <Placemark>\n';
                xml += '            <name>' + filename + '</name>\n';
                xml += '            <LineString>\n';
                xml += '                <tessellate>1</tessellate>\n';
                xml += '                <coordinates>\n';
                xml += '                    ';
                $.each(routes, function(i, group) {
                    $.each(group[0].getLatLngs(), function(j, coords) {
                        xml += coords.lng + ',' + coords.lat + ',0 ';
                    });
                });
                xml += '\n                </coordinates>\n';
                xml += '            </LineString>\n';
                xml += '        </Placemark>\n';
                xml += '    </Document>\n';
                xml += '</kml>\n';
                var blob = new Blob([xml], {
                    type: "text/plain;charset=utf-8"
                });
                saveAs(blob, filename + ".kml");
                self.resolve();
            });
        }

        var plotMarker = null;

        if (!isSmallScreen) {
    /*  TODO: needs https://github.com/chartjs/chartjs-plugin-annotation/issues/60 to be resolved
        var annotationsEnabled = {};
        function onClickAlt(e) {
            this.options.label.enabled = !this.options.label.enabled;
            annotationsEnabled[this.options.id] = this.options.label.enabled;
            chart.update();
        }*/

            var ctx = $("#chart");
            var chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Altitude',
                        data: [],
                        fill: false,
                        borderColor: 'rgba(12, 98, 173, 0.8)',
                        backgroundColor: 'rgba(12, 98, 173, 0.8)',
                        lineTension: 0,
                        pointRadius: 0,
                        yAxisId: 'alt'
                    },{
                        label: 'Pente de l\'itinéraire',
                        data: [],
                        fill: true,
                        //lineTension: 0,
                        pointRadius: 0,
                        yAxisID: 'slope'
                    },{
                        label: 'Pente',
                        data: [],
                        fill: true,
                        //lineTension: 0,
                        pointRadius: 0,
                        yAxisID: 'slope2',
                        hidden: true
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    hover: {
                        mode: 'index',
                        intersect: false,
                        onHover: function(event, active) {
                            if (event.type == "mousemove") {
                                if (active && active.length > 0) {
                                    var idx = active[0]._index;
                                    var item = chart.config.data.datasets[0].data[idx];

                                    if (plotMarker == null) {
                                        plotMarker = L.marker(L.latLng(item.lat, item.lon), {
                                            icon : L.AwesomeMarkers.icon({
                                                icon: 'area-chart',
                                                markerColor: 'cadetblue',
                                                prefix: 'fa'
                                            }),
                                            draggable : false,
                                            clickable : false,
                                            zIndexOffset : 1000
                                        });

                                        plotMarker.addTo(map);
                                    } else {
                                        plotMarker.setLatLng(L.latLng(item.lat, item.lon));
                                        plotMarker.update();
                                    }
                                } else {
                                    if (plotMarker) {
                                        map.removeLayer(plotMarker);
                                        plotMarker = null;
                                    }
                                }
                            } else if (event.type == "mouseout") {
                                if (plotMarker) {
                                    map.removeLayer(plotMarker);
                                    plotMarker = null;
                                }
                            }
                        }
                    },
                    scales: {
                        xAxes: [{
                            id: 'distance',
                            type: 'linear',
                            position: 'bottom',
                            ticks: {
                                min: 0
                            }
                        }],
                        yAxes: [{
                            id: 'alt',
                            type: 'linear',
                            position: 'left',
                            beginAtZero: false
                          }, {
                            id: 'slope',
                            type: 'linear',
                            position: 'right'
                          }, {
                            id: 'slope2',
                            type: 'linear',
                            position: 'right',
                            ticks: {
                                min: 0,
                                max: 45
                            }
                          }]
                    },
                    legend: {
                        position: 'left'
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(tooltipItems, data) {
                                return 'Distance: ' + Math.floor(tooltipItems[0].xLabel*100)/100 + "km";
                            },
                            label: function(tooltipItems, data) {
                                return data.datasets[tooltipItems.datasetIndex].label +': ' + (tooltipItems.datasetIndex == 0 ? Math.round(tooltipItems.yLabel*100)/100 + 'm' : Math.round(tooltipItems.yLabel) + '°');
                            }
                        }
                    },
                    annotation: {
                        //events: ['click'],
                        annotations: [],
                    }
                }
            });
        } else {
            $("#chart").remove();
        }

        function replot() {
            var elevations = [];
            var distance = 0;
            var altMin = Number.MAX_VALUE;
            var altMax = Number.MIN_VALUE;
            var slopeMax = 0;
            var slopeMin = 0;
            var denivPos = 0;
            var denivNeg = 0;

            var localDistance = 0;
            var localAltMin = Number.MAX_VALUE;
            var localAltMax = Number.MIN_VALUE;
            var localSlopeMax = 0;
            var localSlopeMin = 0;
            var localDenivPos = 0;
            var localDenivNeg = 0;

            var annotations = [{
                id: 'altmax',
                type: 'line',
                mode: 'horizontal',
                scaleID: 'alt',
                value: 0,
                borderColor: 'rgba(12, 173, 98, 0.5)',
                borderWidth: 1,
                label: {enabled: true, position: "left", backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: "normal", yAdjust: 10},
                //onClick: onClickAlt,
            },{
                id: 'altmin',
                type: 'line',
                mode: 'horizontal',
                scaleID: 'alt',
                value: 0,
                borderColor: 'rgba(12, 173, 98, 0.5)',
                borderWidth: 1,
                label: {enabled: true, position: "left", backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: "normal", yAdjust: -10},
                //onClick: onClickAlt,
            },{
                id: 'distance',
                type: 'line',
                mode: 'vertical',
                scaleID: 'distance',
                value: 0,
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                label: {enabled: true, position: "left", backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: "normal", xAdjust: -50},
                //onClick: onClickAlt,
            }];

            var previousStep = 0;
            $.each(routes, function(i, group) {
                if (group != null) {

                    if (markers[i].getType() == "step") {
                        annotations.push({
                            id: 'distance-'+i,
                            type: 'line',
                            mode: 'vertical',
                            scaleID: 'distance',
                            value: distance,
                            borderColor: 'rgba(0, 0, 0, 0.5)',
                            borderWidth: 1,
                        });

                        for (var j = previousStep; j < i; j++) {
                            routes[j][0].setPopupContent("<ul class='legend " + markers[j].getColorCode() + "'><li>Altitude max: " + Math.round(localAltMax) + "m</li><li>D+: " + Math.round(localDenivPos) + "m</li><li>Altitude min: " + Math.round(localAltMin) + "m</li><li>D-: " + Math.round(localDenivNeg) + "m</li><li>Distance: " + Math.round(localDistance*100)/100 + "km</li></ul>");
                        }

                        previousStep = i;
                        localDistance = 0;
                        localAltMin = Number.MAX_VALUE;
                        localAltMax = Number.MIN_VALUE;
                        localSlopeMax = 0;
                        localSlopeMin = 0;
                        localDenivPos = 0;
                        localDenivNeg = 0;
                    }

                    var e = group[0].getElevations();
                    if (e.length > 0) {
                        for (var j = 0; j < e.length; j++) {
                            e[j].dist += distance;
                        }
                        elevations = elevations.concat(e);
                        distance += group[0].getDistance();

                        if (group[0].getAltMin() < altMin)
                            altMin = group[0].getAltMin();
                        if (group[0].getAltMax() > altMax)
                            altMax = group[0].getAltMax();

                        if (group[0].getSlopeMax() > slopeMax)
                            slopeMax = group[0].getSlopeMax();
                        if (group[0].getSlopeMin() < slopeMin)
                            slopeMin = group[0].getSlopeMin();

                        denivNeg += group[0].getDenivNeg();
                        denivPos += group[0].getDenivPos();


                        localDistance += group[0].getDistance();

                        if (group[0].getAltMin() < localAltMin)
                            localAltMin = group[0].getAltMin();
                        if (group[0].getAltMax() > localAltMax)
                            localAltMax = group[0].getAltMax();

                        if (group[0].getSlopeMax() > localSlopeMax)
                            localSlopeMax = group[0].getSlopeMax();
                        if (group[0].getSlopeMin() < localSlopeMin)
                            localSlopeMin = group[0].getSlopeMin();

                        localDenivNeg += group[0].getDenivNeg();
                        localDenivPos += group[0].getDenivPos();

                    };
                }
            });
            if (localDistance > 0) {
                for (var j = previousStep; j < routes.length; j++) {
                    routes[j][0].setPopupContent("<ul class='legend " + markers[j].getColorCode() + "'><li>Altitude max: " + Math.round(localAltMax) + "m</li><li>D+: " + Math.round(localDenivPos) + "m</li><li>Altitude min: " + Math.round(localAltMin) + "m</li><li>D-: " + Math.round(localDenivNeg) + "m</li><li>Distance: " + Math.round(localDistance*100)/100 + "km</li></ul>");
                }
            }

            if (elevations.length > 0) {
                var data = [];
                var data2 = [];
                var data3 = [];

                if (!isSmallScreen) {
                    for (var j = 0 ; j < elevations.length; j++) {
                        data.push({x: elevations[j].dist, y: elevations[j].z, lat: elevations[j].lat, lon: elevations[j].lon});
                        data2.push({x: elevations[j].dist, y: elevations[j].slopeOnTrack, lat: elevations[j].lat, lon: elevations[j].lon});
                        data3.push({x: elevations[j].dist, y: elevations[j].slope, lat: elevations[j].lat, lon: elevations[j].lon});
                    }

                    chart.options.scales.xAxes[0].ticks.max = data[data.length-1].x;
                    chart.config.data.datasets[0].data = data;
                    chart.config.data.datasets[1].data = data2;
                    chart.config.data.datasets[2].data = data3;

                    annotations[0].value = altMax;
                    annotations[0].label.content = "Altitude max: " + Math.round(altMax) + "m; D+: " + Math.round(denivPos) + "m";
                    annotations[1].value = altMin;
                    annotations[1].label.content = "Altitude min: " + Math.round(altMin) + "m; D-: " + Math.round(denivNeg) + "m";
                    annotations[2].value = data[data.length-1].x;
                    annotations[2].label.content = "Distance: " + Math.round(data[data.length-1].x*100)/100 + "km";

                    var gradient = document.getElementById('chart').getContext('2d').createLinearGradient(0, 0, 0, 120);
                    var maxSlope = Math.ceil(slopeMax/10)*10;
                    var minSlope = Math.floor(slopeMin/10)*10;

                    var totalSlope = -minSlope + maxSlope;
                    if (totalSlope != 0) {
                        if (maxSlope >= 45) {
                            gradient.addColorStop((maxSlope-45)/totalSlope, 'purple');
                        }
                        if (maxSlope >= 40) {
                            gradient.addColorStop((maxSlope-40)/totalSlope, 'red');
                        }
                        if (maxSlope >= 35) {
                            gradient.addColorStop((maxSlope-35)/totalSlope, 'orange');
                        }
                        if (maxSlope >= 30) {
                            gradient.addColorStop((maxSlope-30)/totalSlope, 'yellow');
                        }

                        gradient.addColorStop(maxSlope/totalSlope, 'grey');

                        if (minSlope <= -30) {
                            gradient.addColorStop((maxSlope+30)/totalSlope, 'yellow');
                        }
                        if (minSlope <= -35) {
                            gradient.addColorStop((maxSlope+35)/totalSlope, 'orange');
                        }
                        if (minSlope <= -40) {
                            gradient.addColorStop((maxSlope+40)/totalSlope, 'red');
                        }
                        if (minSlope <= -45) {
                            gradient.addColorStop((maxSlope+45)/totalSlope, 'purple');
                        }
                        chart.config.data.datasets[1].backgroundColor = gradient;
                    }


                    var gradient2 = document.getElementById('chart').getContext('2d').createLinearGradient(0, 0, 0, 120);
                    gradient2.addColorStop(0, 'purple');
                    gradient2.addColorStop(1-40/45, 'red');
                    gradient2.addColorStop(1-35/45, 'orange');
                    gradient2.addColorStop(1-30/45, 'yellow');
                    gradient2.addColorStop(1, 'grey');
                    chart.config.data.datasets[2].backgroundColor = gradient2;

                    var old = chart.options.annotation;
                    chart.options.annotation = {};  // TODO: potential bug with annotations where old 'value' of annotations are kept in graph
                    chart.update();
                    chart.options.annotation = {annotations: annotations};
                    chart.update();
                } else {
                    $("#data").html("<ul><li>Altitude max: " + Math.round(altMax) + "m; D+: " + Math.round(denivPos) + "m</li><li>Altitude min: " + Math.round(altMin) + "m; D-: " + Math.round(denivNeg) + "m</li><li>Distance: " + Math.round(elevations[elevations.length-1].dist*100)/100 + "km</li></ul>");
                }
                $("#data-empty").slideUp();
            } else {
                if (!isSmallScreen) {
                    chart.options.scales.xAxes[0].ticks.max = 1;
                    chart.config.data.datasets[0].data = [];
                    chart.config.data.datasets[1].data = [];
                    chart.config.data.datasets[2].data = [];
                }
                $("#data-empty").slideDown();
            }
        }
        replot();
    });
}
