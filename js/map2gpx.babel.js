'use strict';

/* from https://stackoverflow.com/a/3855394 */
(function ($) {
    $.QueryString = function (paramsArray) {
        var params = {};

        for (var i = 0; i < paramsArray.length; ++i) {
            var param = paramsArray[i].split('=', 2);

            if (param.length !== 2) continue;

            params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, ' '));
        }

        return params;
    }(window.location.search.substr(1).split('&'));
})(jQuery);

(function ($) {
    var tutorials = [];

    $.Shepherd = {};
    $.Shepherd.Step = function () {
        var _name;
        var _shepherd;
        var _opts;

        var init = function init(name, settings) {
            _name = name;
            _opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text'
            });
            return this;
        };

        return {
            init: init
        };
    };

    $.Shepherd.step = function (name, settings) {
        return $.Shepherd.Step().init(name, settings);
    };

    $.Shepherd.Tour = function () {
        var _tour;
        var _steps = 0;

        var init = function init(settings) {
            var opts = $.extend({}, settings, {
                defaults: {
                    classes: 'shepherd-element shepherd-open shepherd-theme-arrows',
                    showCancelLink: true
                }
            });
            _tour = new Shepherd.Tour(opts);
            return this;
        };

        var add = function add(name, settings) {
            var _this = this;
            var currentStep = _steps;

            var opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text'
            });

            opts.buttons = [{
                text: 'Fermer',
                classes: 'shepherd-button-secondary',
                action: function action() {
                    if (hasLocalStorage) {
                        localStorage.setItem('tutorial' + tutorials.indexOf(_this), -1);
                    }

                    _this.cancel();
                }
            }, {
                text: 'Suivant',
                classes: 'shepherd-button-example-primary',
                action: function action() {
                    var currentShepherdIndex = tutorials.indexOf(_this);

                    if (currentShepherdIndex < 0) console.log('Could not find current shepherd, something is probably wrong');

                    if (hasLocalStorage) {
                        localStorage.setItem('tutorial' + currentShepherdIndex, currentStep + 1); // Restore next step
                    }

                    _this.next();

                    if (currentStep == _steps - 1) {
                        // Last step of current tutorial
                        if (currentShepherdIndex >= 0 && currentShepherdIndex < tutorials.length - 1) {
                            // Another tutorial is available, start it
                            tutorials[currentShepherdIndex + 1].start(true);
                        }
                    }
                }
            }];

            _tour.addStep(name, opts);
            _steps++;
            return this;
        };

        var start = function start(forceShow) {
            var force = typeof forceShow !== 'undefined' ? forceShow : false; // Force display

            var id = 0;

            if (!force) {
                var currentShepherdIndex = tutorials.indexOf(this);
                if (hasLocalStorage && localStorage.getItem('tutorial' + currentShepherdIndex) !== null) {
                    id = parseInt(localStorage.getItem('tutorial' + currentShepherdIndex));
                }
            }

            if (id >= 0 && id < _steps) {
                _tour.show(id);
            }

            return this;
        };

        var cancel = function cancel() {
            _tour.cancel();
            return this;
        };

        var next = function next() {
            _tour.next();
            return this;
        };

        return {
            init: init,
            add: add,
            start: start,
            cancel: cancel,
            next: next
        };
    };

    $.Shepherd.tour = function (settings) {
        var tour = $.Shepherd.Tour().init(settings);
        tutorials.push(tour);
        return tour;
    };

    $.Shepherd.get = function (idx) {
        return tutorials[idx];
    };

    $.Shepherd.has = function (idx) {
        return tutorials.length > idx;
    };
})(jQuery);

(function ($) {
    var _mode = null;
    var _computing = false;

    $.State = {};

    $.State.setMode = function (mode) {
        _mode = mode;
        $('body').trigger($.Event('map2gpx:modechange', { mode: _mode, computing: _computing }));
    };

    $.State.setComputing = function (computing) {
        _computing = computing;
        $('body').trigger($.Event('map2gpx:computingchange', { mode: _mode, computing: _computing }));
    };

    $.State.triggerMarkersChanged = function () {
        $('body').trigger($.Event('map2gpx:markerschange', { mode: _mode, computing: _computing }));
    };

    $.State.getMode = function () {
        return _mode;
    };
    $.State.getComputing = function () {
        return _computing;
    };
})(jQuery);

(function ($) {
    var _markers = []; // Cache of defined markers
    var _routes = []; // Cache of computed routes
    var _altitudes = {}; // Cache of computed altitudes for each points of routes computed so far
    var _slopes = {}; // Cache of computed slopes for each points of routes computed so far

    $.Cache = {};

    var getKey = function getKey(coords) {
        return coords.lng + '/' + coords.lat;
    };

    $.Cache.addAltitude = function (lat, lng, z) {
        _altitudes[lng + '/' + lat] = z;
    };

    $.Cache.getAltitude = function (coords) {
        var key = getKey(coords);
        return key in _altitudes ? _altitudes[key] : null;
    };

    $.Cache.hasAltitude = function (coords) {
        return getKey(coords) in _altitudes;
    };

    $.Cache.addSlope = function (lat, lng, slope) {
        _slopes[lng + '/' + lat] = slope;
    };

    $.Cache.getSlope = function (coords) {
        var key = getKey(coords);
        return key in _slopes ? _slopes[key] : null;
    };

    $.Cache.hasSlope = function (coords) {
        return getKey(coords) in _slopes;
    };

    $.Cache.getInfos = function (coords) {
        var key = getKey(coords);
        return {
            z: key in _altitudes ? _altitudes[key] : null,
            slope: key in _slopes ? _slopes[key] : null
        };
    };

    $.Cache.lengthOfMarkers = function () {
        return _markers.length;
    };

    $.Cache.hasMarkers = function (n) {
        var size = typeof n !== 'undefined' ? n : 1;
        return _markers.length >= size;
    };

    $.Cache.getMarker = function (idx) {
        var i = idx >= 0 ? idx : _markers.length + idx;
        return _markers[i];
    };

    $.Cache.indexOfMarker = function (o) {
        return _markers.indexOf(o);
    };

    $.Cache.eachMarker = function (callback) {
        $.each(_markers, function (i, marker) {
            return callback(i, marker);
        });
    };

    $.Cache.addMarker = function (marker) {
        _markers.push(marker);
    };

    $.Cache.removeMarkerAt = function (idx) {
        var i = idx >= 0 ? idx : _markers.length + idx;
        _markers.splice(i, 1);
    };

    $.Cache.resetMarkers = function () {
        _markers.length = 0;
    };

    $.Cache.lengthOfRoutes = function () {
        return _routes.length;
    };

    $.Cache.hasRoutes = function (n) {
        var size = typeof n !== 'undefined' ? n : 1;
        return _routes.length >= size;
    };

    $.Cache.getRoute = function (idx) {
        var i = idx >= 0 ? idx : _markers.length + idx;
        return _routes[i][0];
    };

    $.Cache.getRouteMode = function (idx) {
        var i = idx >= 0 ? idx : _markers.length + idx;
        return _routes[i][1];
    };

    $.Cache.eachRoute = function (callback) {
        $.each(_routes, function (i, group) {
            return callback(i, group[0]);
        });
    };

    $.Cache.addRoute = function (track, mode) {
        _routes.push([track, mode]);
    };

    $.Cache.setRouteAt = function (idx, track, mode) {
        var i = idx >= 0 ? idx : _markers.length + idx;
        _routes[i] = [track, mode];
    };

    $.Cache.removeRouteAt = function (idx) {
        var i = idx >= 0 ? idx : _markers.length + idx;
        _routes.splice(i, 1);
    };

    $.Cache.resetRoutes = function () {
        _routes.length = 0;
    };
})(jQuery);

function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e instanceof DOMException && (e.code === 22 || // everything except Firefox
        e.code === 1014 || // Firefox

        // test name field too, because code might not be present
        e.name === 'QuotaExceededError' || // everything except Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') && // Firefox

        // acknowledge QuotaExceededError only if there's something already stored
        storage.length !== 0;
    }
}

var isSmallScreen = window.innerWidth <= 800 && window.innerHeight <= 600;
var hasLocalStorage = storageAvailable('localStorage');

window.onload = function () {

    // First, find the current view
    $.Deferred(function () {
        var _this = this;

        var view = [44.96777356135154, 6.06822967529297, 13]; // Center in les Ecrins because I love this place

        if (hasLocalStorage) {
            if (localStorage.getItem('view') !== null) view = JSON.parse(localStorage.getItem('view'));
        }

        if ('lat' in $.QueryString && 'lng' in $.QueryString) {
            view = [$.QueryString.lat, $.QueryString.lng, 15];
        }

        if ('loc' in $.QueryString) {
            // Try to find location
            var options = {
                text: $.QueryString.loc,
                filterOptions: { type: ['StreetAddress', 'PositionOfInterest'] },
                apiKey: keyIgn,
                onSuccess: function onSuccess(results) {
                    if (results && 'suggestedLocations' in results && results.suggestedLocations.length > 0) {
                        _this.resolveWith([results.suggestedLocations[0].position.y, results.suggestedLocations[0].position.x, 15]);
                    } else {
                        console.log('No results?');
                        _this.resolveWith(view); // Use default view
                    }
                },
                onFailure: function onFailure(error) {
                    // Error, or no match
                    console.log(error);
                    _this.resolveWith(view); // Use default view
                }
            };
            Gp.Services.autoComplete(options);
        } else {
            _this.resolveWith(view);
        }
    }).done(function () {
        var view = this; // jscs:ignore safeContextKeyword

        L.LatLng.prototype.roundE8 = function () {
            return L.latLng(Math.roundE8(this.lat), Math.roundE8(this.lng));
        };

        // TODO: these functions should only exist for classes that define getLatLngs
        L.Layer.include({
            _elevations: [],
            _distance: 0,
            _altMin: 0,
            _altMax: 0,
            _slopeMin: 0,
            _slopeMax: 0,
            _denivPos: 0,
            _denivNeg: 0,

            getElevations: function getElevations() {
                return JSON.parse(JSON.stringify(this._elevations)); // return deep copy (isn't there a better way??)
            },

            getDistance: function getDistance() {
                return this._distance;
            },
            getAltMin: function getAltMin() {
                return this._altMin;
            },
            getAltMax: function getAltMax() {
                return this._altMax;
            },
            getSlopeMin: function getSlopeMin() {
                return this._slopeMin;
            },
            getSlopeMax: function getSlopeMax() {
                return this._slopeMax;
            },
            getDenivPos: function getDenivPos() {
                return this._denivPos;
            },
            getDenivNeg: function getDenivNeg() {
                return this._denivNeg;
            },

            computeStats: function computeStats() {
                var track = this; // jscs:ignore safeContextKeyword
                return $.Deferred(function () {
                    var _this = this;
                    $.when.apply($, track._fetchAltitude().concat(track._fetchSlope())).fail(function () {
                        _this.reject();
                    }).then(function () {
                        var elevations = [];

                        $.each(track.getLatLngs(), function (j, coords) {
                            var values = $.extend({}, { lat: coords.lat, lng: coords.lng }, $.Cache.getInfos(coords));
                            elevations.push(values);
                        });

                        if (elevations.length == 0) {
                            _this.resolve();
                        }

                        // Calcul de la distance au départ pour chaque point + arrondi des lat/lon
                        track._distance = 0;
                        track._altMin = elevations[0].z;
                        track._altMax = elevations[0].z;
                        track._slopeMax = 0;
                        track._slopeMin = 0;
                        track._denivPos = 0;
                        track._denivNeg = 0;

                        elevations[0].dist = 0;
                        elevations[0].slopeOnTrack = 0;

                        track._elevations = [elevations[0]];

                        var j = 0;
                        for (var i = 1; i < elevations.length; i++) {
                            var localDistance = _haversineDistance(elevations[i], track._elevations[j]); // m
                            if (localDistance > 10) {
                                j++;

                                track._distance += localDistance / 1000; // km

                                track._elevations[j] = elevations[i];
                                track._elevations[j].dist = track._distance;
                                track._elevations[j].slopeOnTrack = Math.degrees(Math.atan((Math.round(track._elevations[j].z) - Math.round(track._elevations[j - 1].z)) / localDistance));

                                if (j > 5) {
                                    var previous = (track._elevations[j - 5].slopeOnTrack + track._elevations[j - 4].slopeOnTrack + track._elevations[j - 3].slopeOnTrack + track._elevations[j - 2].slopeOnTrack + track._elevations[j - 1].slopeOnTrack) / 5;
                                    track._elevations[j].slopeOnTrack = (previous + track._elevations[j].slopeOnTrack) / 2;
                                }

                                if (track._elevations[j].z < track._altMin) track._altMin = track._elevations[j].z;
                                if (track._elevations[j].z > track._altMax) track._altMax = track._elevations[j].z;

                                if (track._elevations[j].slopeOnTrack > track._slopeMax) track._slopeMax = track._elevations[j].slopeOnTrack;
                                if (track._elevations[j].slopeOnTrack < track._slopeMin) track._slopeMin = track._elevations[j].slopeOnTrack;

                                if (track._elevations[j].z < track._elevations[j - 1].z) track._denivNeg += Math.round(track._elevations[j - 1].z - track._elevations[j].z);else track._denivPos += Math.round(track._elevations[j].z - track._elevations[j - 1].z);
                            }
                        }

                        _this.resolve();
                    });
                });
            },

            _fetchAltitude: function _fetchAltitude() {
                var geometry = []; // Batch
                var promises = [];

                $.each(this.getLatLngs(), function (j, coords) {
                    if (!$.Cache.hasAltitude(coords)) {
                        // Skip already cached values
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

            _fetchSlope: function _fetchSlope() {
                var tiles = {};
                var promises = [];

                $.each(this.getLatLngs(), function (j, coords) {
                    if (!$.Cache.hasSlope(coords)) {
                        // Skip already cached values
                        var _latlngToTilePixel = latlngToTilePixel(coords, map.options.crs, 16, 256, map.getPixelOrigin()),
                            tile = _latlngToTilePixel.tile,
                            tilePixel = _latlngToTilePixel.tilePixel;

                        if (!(tile.x in tiles)) tiles[tile.x] = {};
                        if (!(tile.y in tiles[tile.x])) tiles[tile.x][tile.y] = [[]];

                        if (tiles[tile.x][tile.y][tiles[tile.x][tile.y].length - 1].length > 50) tiles[tile.x][tile.y].push([]);

                        tiles[tile.x][tile.y][tiles[tile.x][tile.y].length - 1].push({
                            lat: coords.lat,
                            lng: coords.lng,
                            x: tilePixel.x,
                            y: tilePixel.y
                        });
                    }
                });

                $.each(tiles, function (x, _y) {
                    $.each(_y, function (y, batches) {
                        $.each(batches, function (j, batch) {
                            promises.push(fetchSlope(x, y, batch));
                        });
                    });
                });

                return promises;
            }
        });

        L.GeoJSON.include({
            getLatLngs: function getLatLngs() {
                var c = [];

                this.eachLayer(function (layer) {
                    $.each(layer.feature.geometry.coordinates, function (j, coords) {
                        c.push(L.latLng(coords[1], coords[0]));
                    });
                });

                return c;
            }
        });

        var colorMap = { red: '#D63E2A', orange: '#F59630', green: '#72B026', blue: '#38AADD', purple: '#D252B9',
            darkred: '#A23336', darkblue: '#0067A3', darkgreen: '#728224', darkpurple: '#5B396B', cadetblue: '#436978',
            lightred: '#FF8E7F', beige: '#FFCB92', lightgreen: '#BBF970', lightblue: '#8ADAFF', pink: '#FF91EA',
            white: '#FBFBFB', lightgray: '#A3A3A3', gray: '#575757', black: '#303030' };
        var colors = ['blue', 'green', 'orange', 'purple', 'red', 'darkblue', 'darkpurple', 'lightblue', 'lightgreen', 'beige', 'pink', 'lightred'];

        var currentColor = 0;
        function nextColor() {
            currentColor = (currentColor + 1) % colors.length;
            return currentColor;
        }

        L.Marker.include({
            __type: 'waypoint',
            __color: currentColor,
            getColorCode: function getColorCode() {
                return colors[this.__color];
            },
            getColorRgb: function getColorRgb() {
                return colorMap[colors[this.__color]];
            },
            getColorIndex: function getColorIndex() {
                return this.__color;
            },
            setColorIndex: function setColorIndex(i) {
                this.__color = i;
            },
            getType: function getType() {
                return this.__type;
            },
            setType: function setType(type) {
                this.__type = type;
                if (type == 'waypoint') {
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

        function _setEnabled(obj, enabled) {
            if (enabled) obj.enable();else obj.disable();
        }

        L.Control.EasyButton.include({
            setEnabled: function setEnabled(enabled) {
                _setEnabled(this, enabled);
            }
        });

        if (isSmallScreen) {
            $('#mobile-warning').show().find('button').click(function () {
                popup.hide();
            });
        }

        // Central map
        var map = L.map('map', {}).setView([view[0], view[1]], view[2]);
        $('body').on('map2gpx:modechange', function (e) {
            _setEnabled(map.doubleClickZoom, e.mode === null);
        });

        // TODO: add support of localStorage for opacity&visiblity
        var layerPhotos = L.geoportalLayer.WMTS({
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            apiKey: keyIgn
        }).addTo(map);
        var layerSlopes = L.geoportalLayer.WMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN',
            apiKey: keyIgn
        }, {
            opacity: 0.25
        }).addTo(map);
        var layerMaps = L.geoportalLayer.WMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
            apiKey: keyIgn
        }, {
            opacity: 0.25
        }).addTo(map);

        // Add controls
        L.geoportalControl.SearchEngine({
            displayAdvancedSearch: false
        }).addTo(map);

        // Mini-map
        if (!isSmallScreen) {
            var miniMapLayer = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                apiKey: keyIgn
            });
            var miniMap = new L.Control.MiniMap(miniMapLayer, {
                position: 'bottomleft',
                zoomLevelOffset: -4
            }).addTo(map);
        }

        var layerSwitcher = L.geoportalControl.LayerSwitcher({
            collapsed: isSmallScreen
        });
        map.addControl(layerSwitcher);
        layerSwitcher.setVisibility(layerSlopes, false);
        $('.GPlayerRemove').remove();

        if (!isSmallScreen) {
            map.addControl(L.control.scale({
                imperial: false,
                position: 'bottomright'
            }));
        }

        var automatedBtn = L.easyButton({
            id: 'btn-autotrace',
            states: [{
                stateName: 'loaded',
                icon: 'fa-map-signs',
                title: 'Tracer automatiquement l\'itinéraire',
                onClick: function onClick(btn, map) {
                    $.State.setMode('auto');
                }
            }, {
                stateName: 'active',
                icon: 'fa-map-signs',
                title: 'Tracer automatiquement l\'itinéraire',
                onClick: function onClick(btn, map) {
                    $.State.setMode(null);
                }
            }]
        });
        $('body').on('map2gpx:modechange map2gpx:markerschange', function (e) {
            if (e.mode == 'auto') {
                automatedBtn.state('active');
                automatedBtn.enable();
            } else {
                automatedBtn.state('loaded');
                automatedBtn.setEnabled(!$.Cache.hasRoutes() || $.Cache.getRouteMode(0) != 'import');
            }
        });

        var lineBtn = L.easyButton({
            id: 'btn-straighttrace',
            states: [{
                stateName: 'loaded',
                icon: 'fa-location-arrow',
                title: 'Tracer l\'itinéraire en ligne droite',
                onClick: function onClick(btn, map) {
                    $.State.setMode('straight');
                }
            }, {
                stateName: 'active',
                icon: 'fa-location-arrow',
                title: 'Tracer l\'itinéraire en ligne droite',
                onClick: function onClick(btn, map) {
                    $.State.setMode(null);
                }
            }]
        });
        $('body').on('map2gpx:modechange map2gpx:markerschange', function (e) {
            if (e.mode == 'straight') {
                lineBtn.state('active');
                lineBtn.enable();
            } else {
                lineBtn.state('loaded');
                lineBtn.setEnabled(!$.Cache.hasRoutes() || $.Cache.getRouteMode(0) != 'import');
            }
        });

        var closeLoop = L.easyButton({
            id: 'btn-closeloop',
            states: [{
                stateName: 'loaded',
                icon: 'fa-magic',
                title: 'Fermer la boucle',
                onClick: function onClick(btn, map) {
                    if ($.Cache.hasMarkers(1)) {
                        addMarker({ latlng: $.Cache.getMarker(0).getLatLng() });
                    }
                }
            }, {
                stateName: 'computing',
                icon: 'fa-spinner fa-pulse',
                title: 'Fermer la boucle (calcul en cours...)'
            }]
        });
        $('body').on('map2gpx:modechange map2gpx:computingchange map2gpx:markerschange', function (e) {
            if (e.computing) {
                closeLoop.state('computing');
                closeLoop.disable();
            } else {
                closeLoop.state('loaded');
                closeLoop.setEnabled(e.mode !== null && $.Cache.hasRoutes() && $.Cache.getRouteMode(0) != 'import');
            }
        });

        L.easyBar([automatedBtn, lineBtn, closeLoop]).addTo(map);

        var exportPopup = L.popup().setContent(L.DomUtil.get('form-export'));
        var exportButton = L.easyButton({
            id: 'btn-export',
            states: [{
                stateName: 'loaded',
                icon: 'fa-cloud-download',
                title: 'Exporter',
                onClick: function onClick(btn, map) {
                    var bounds = L.latLngBounds($.Cache.getMarker(0).getLatLng(), $.Cache.getMarker(1).getLatLng());
                    $.Cache.eachRoute(function (i, route) {
                        bounds.extend(route.getBounds());
                    });

                    map.flyToBounds(bounds, { padding: [50, 50] });
                    exportPopup.setLatLng($.Cache.getMarker(0).getLatLng()).openOn(map);

                    $('.export-gpx-button:visible').click(function () {
                        var $btn = $(this);
                        $btn.attr('disabled', 'disabled');
                        $.when(exportGpx($('.export-filename:visible').val())).then(function () {
                            $btn.removeAttr('disabled');
                        });
                    });

                    $('.export-kml-button:visible').click(function () {
                        var $btn = $(this);
                        $btn.attr('disabled', 'disabled');
                        $.when(exportKml($('.export-filename:visible').val())).then(function () {
                            $btn.removeAttr('disabled');
                        });
                    });
                }
            }, {
                stateName: 'computing',
                icon: 'fa-spinner fa-pulse',
                title: 'Exporter (calcul en cours...)'
            }]
        }).addTo(map);
        $('body').on('map2gpx:computingchange map2gpx:markerschange', function (e) {
            if (e.computing) {
                exportButton.state('computing');
                exportButton.disable();
            } else {
                exportButton.state('loaded');
                exportButton.setEnabled($.Cache.hasMarkers());
            }
        });

        var importPopup = L.popup().setContent(L.DomUtil.get('form-import'));
        var importButton = L.easyButton({
            id: 'btn-import',
            states: [{
                stateName: 'loaded',
                icon: 'fa-cloud-upload',
                title: 'Importer',
                onClick: function onClick(btn, map) {
                    importPopup.setLatLng(map.getCenter()).openOn(map);

                    if ($.Cache.hasRoutes()) {
                        $('.import-gpx-status:visible').html('<strong>Attention:</strong> l\'import va effacer l\'itinéraire existant!');
                    } else {
                        $('.import-gpx-status:visible').text('');
                    }

                    $('.import-gpx-button:visible').click(function () {
                        var $btn = $(this);
                        var f = $('.import-gpx-file:visible')[0].files[0];

                        if (f == undefined) {
                            $('.import-gpx-status:visible').text('Veuillez sélectionner un fichier');
                            return;
                        }

                        $btn.attr('disabled', 'disabled');
                        $.State.setComputing(true);
                        $('.import-gpx-status:visible').text('Importation en cours...');

                        var reader = new FileReader();

                        reader.onload = function (theFile) {
                            return function (e) {

                                var lines = [];
                                var line = new L.GPX(e.target.result, {
                                    async: true,
                                    onFail: function onFail() {
                                        console.log('Failed to retrieve track');
                                        $('.import-gpx-status:visible').text('Imposible de traiter ce fichier');
                                        $btn.removeAttr('disabled');
                                        $.State.setComputing(false);
                                    },
                                    onSuccess: function onSuccess(gpx) {
                                        $('.import-gpx-status:visible').text('Récupération des données géographiques en cours...');
                                        $.Cache.eachRoute(function (i, route) {
                                            map.removeLayer(route);
                                        });
                                        $.Cache.resetRoutes();

                                        $.Cache.eachMarker(function (i, marker) {
                                            map.removeLayer(marker);
                                        });
                                        $.Cache.resetMarkers();

                                        var deleteTrack = function deleteTrack() {
                                            $('.track-delete-button:visible').click(function () {
                                                $.State.setComputing(true);

                                                $.Cache.eachRoute(function (i, route) {
                                                    map.removeLayer(route);
                                                });
                                                $.Cache.resetRoutes();

                                                $.Cache.eachMarker(function (i, marker) {
                                                    map.removeLayer(marker);
                                                });
                                                $.Cache.resetMarkers();

                                                map.removeLayer(gpx);

                                                $.State.triggerMarkersChanged();
                                                $.State.setComputing(false);
                                            });
                                        };

                                        map.fitBounds(gpx.getBounds(), { padding: [50, 50] });
                                        importPopup.setLatLng(gpx.getBounds().getCenter());
                                        gpx.addTo(map);

                                        var promises = [];
                                        $.each(lines, function (idx, track) {
                                            // Add new route+markers
                                            $.Cache.addRoute(track, 'import');

                                            if (idx == 0) {
                                                var start = track.getLatLngs()[0];
                                                var _marker = L.marker(start, { draggable: false, opacity: 0.5 });
                                                _marker.setColorIndex(currentColor);
                                                _marker.setType('waypoint');
                                                $.Cache.addMarker(_marker);
                                                _marker.addTo(map);

                                                _marker.bindPopup('<button class="track-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer l\'import</button>');
                                                _marker.on('popupopen', deleteTrack);
                                            }

                                            var end = track.getLatLngs()[track.getLatLngs().length - 1];
                                            var marker = L.marker(end, { draggable: false, opacity: 0.5 });
                                            marker.setColorIndex(nextColor());
                                            marker.setType('step');
                                            $.Cache.addMarker(marker);
                                            marker.addTo(map);

                                            track.setStyle({ weight: 5, color: $.Cache.getMarker(idx).getColorRgb(), opacity: 0.5 }); // Use color of starting marker
                                            track.bindPopup('Calculs en cours...');

                                            marker.bindPopup('<button class="track-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer l\'import</button>');
                                            marker.on('popupopen', deleteTrack);

                                            promises.push(track.computeStats());
                                        });

                                        $.when.apply($, promises).done(function () {
                                            $.Cache.eachRoute(function (i, route) {
                                                route.setStyle({ opacity: 0.75 });
                                            });

                                            $.Cache.eachMarker(function (i, marker) {
                                                marker.setOpacity(1);
                                            });

                                            importPopup.remove();

                                            $.State.triggerMarkersChanged();
                                            $.State.setMode(null); // Disable any other tracing
                                            $.State.setComputing(false);
                                        }).fail(function () {
                                            console.log('Fail');
                                            $('.import-gpx-status:visible').text('Impossible de récupérer les données géographiques de ce parcours');
                                            $btn.removeAttr('disabled');
                                            $.State.setComputing(false);
                                        });
                                    }
                                }).on('addline', function (e) {
                                    lines.push(e.line);
                                });
                            };
                        }(f);

                        // Read in the image file as a data URL.
                        reader.readAsText(f);
                    });
                }
            }, {
                stateName: 'computing',
                icon: 'fa-spinner fa-pulse',
                title: 'Importer (calcul en cours...)'
            }]
        });
        var resetButton = L.easyButton({
            id: 'btn-reset',
            states: [{
                stateName: 'loaded',
                icon: 'fa-trash',
                title: 'Effacer l\'itinéraire',
                onClick: function onClick(btn, map) {
                    $.State.setComputing(true);

                    $.Cache.eachRoute(function (i, route) {
                        map.removeLayer(route);
                    });
                    $.Cache.resetRoutes();

                    $.Cache.eachMarker(function (i, marker) {
                        map.removeLayer(marker);
                    });
                    $.Cache.resetMarkers();

                    $.State.triggerMarkersChanged();
                    $.State.setComputing(false);
                }
            }, {
                stateName: 'computing',
                icon: 'fa-spinner fa-pulse',
                title: 'Effacer l\'itinéraire (calcul en cours...)'
            }]
        });

        L.easyBar([importButton, resetButton]).addTo(map);
        $('body').on('map2gpx:computingchange', function (e) {
            importButton.state(e.computing ? 'computing' : 'loaded');
            resetButton.state(e.computing ? 'computing' : 'loaded');

            importButton.setEnabled(!e.computing);
            resetButton.setEnabled(!e.computing);
        });

        if (!isSmallScreen) {
            var infoPopup = L.popup().setContent(L.DomUtil.get('about'));

            var infoBtn = L.easyButton({
                position: 'bottomright',
                states: [{
                    icon: 'fa-info-circle',
                    onClick: function onClick(btn, map) {
                        infoPopup.setLatLng(map.getCenter()).openOn(map);
                    },
                    title: 'A propos & crédits'
                }]
            });
            var helpBtn = L.easyButton({
                position: 'bottomright',
                states: [{
                    icon: 'fa-question-circle',
                    onClick: function onClick(btn, map) {
                        $.Shepherd.get(0).start(true);
                    },
                    title: 'Aide'
                }]
            });

            L.easyBar([infoBtn, helpBtn], { position: 'bottomright' }).addTo(map);
        }

        // Map interactions
        map.on('dblclick', addMarker);

        var outOfRangeDrop;
        map.on('zoomend', function () {
            console.log('Zoomed to ', map.getZoom());
            if (hasLocalStorage) localStorage.setItem('view', JSON.stringify([map.getCenter().lat, map.getCenter().lng, map.getZoom()]));

            var outOfRange = void 0;
            var $outOfRangeTarget = void 0;
            if ((layerPhotos.options.minZoom > map.getZoom() || layerPhotos.options.maxZoom < map.getZoom()) && map.hasLayer(layerPhotos)) {
                outOfRange = 'Photographies aériennes';$outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(2)');
            } else if ((layerMaps.options.minZoom > map.getZoom() || layerMaps.options.maxZoom < map.getZoom()) && map.hasLayer(layerMaps)) {
                outOfRange = 'Cartes IGN';$outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(0)');
            } else if ((layerSlopes.options.minZoom > map.getZoom() || layerSlopes.options.maxZoom < map.getZoom()) && map.hasLayer(layerSlopes)) {
                outOfRange = 'Carte des pentes';$outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(1)');
            }

            if (outOfRange !== undefined && outOfRangeDrop === undefined) {
                outOfRangeDrop = new Drop({
                    target: $outOfRangeTarget[0],
                    classes: 'drop-theme-arrows',
                    position: 'left middle',
                    constrainToWindow: false,
                    constrainToScrollParent: false,
                    openOn: null,
                    content: 'La couche &quot;' + outOfRange + '&quot; n\'est pas disponible à ce niveau de zoom'
                });
                outOfRangeDrop.open();
                $(outOfRangeDrop.content).on('click', function () {
                    outOfRangeDrop.destroy();
                    outOfRangeDrop = null;
                });
            } else if (outOfRange === undefined && outOfRangeDrop !== undefined && outOfRangeDrop !== null) {
                outOfRangeDrop.destroy();
                outOfRangeDrop = null;
            }
        });

        map.on('moveend', function () {
            console.log('Moved to ', map.getCenter());
            if (hasLocalStorage) localStorage.setItem('view', JSON.stringify([map.getCenter().lat, map.getCenter().lng, map.getZoom()]));
        });

        $('body').on('map2gpx:computingchange', function (e) {
            if (e.computing) {
                $('#data-computing').fadeIn();
            } else {
                replot();
                $('#data-computing').fadeOut();
            }
        });

        // Rounds to 8 decimals (IGN API does not support/give more precise data)
        Math.roundE8 = function (value) {
            return Math.round(value * Math.pow(10, 8)) / Math.pow(10, 8);
        };

        // Converts from degrees to radians.
        Math.radians = function (degrees) {
            return degrees * Math.PI / 180;
        };

        // Converts from radians to degrees.
        Math.degrees = function (radians) {
            return radians * 180 / Math.PI;
        };

        /** Returns the distance from c1 to c2 using the haversine formula */
        function _haversineDistance(c1, c2) {
            var lat1 = Math.radians(c1.lat);
            var lat2 = Math.radians(c2.lat);
            var deltaLatBy2 = (lat2 - lat1) / 2;
            var deltaLonBy2 = Math.radians(c2.lng - c1.lng) / 2;
            var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) + Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) * Math.cos(lat1) * Math.cos(lat2);
            return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // from https://gis.stackexchange.com/questions/157693/getting-all-vertex-lat-long-coordinates-every-1-meter-between-two-known-points
        function getDestinationLatLong(start, azimuth, distance) {
            var R = 6378137; // Radius of the Earth in m
            var brng = Math.radians(azimuth); // Bearing is degrees converted to radians.
            var lat1 = Math.radians(start.lat); //Current dd lat point converted to radians
            var lon1 = Math.radians(start.lng); //Current dd long point converted to radians
            var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng));
            var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));

            //convert back to degrees
            lat2 = Math.degrees(lat2);
            lon2 = Math.degrees(lon2);
            return L.latLng(Math.roundE8(lat2), Math.roundE8(lon2));
        }

        function _bearing(c1, c2) {
            var startLat = Math.radians(c1.lat);
            var startLong = Math.radians(c1.lng);
            var endLat = Math.radians(c2.lat);
            var endLong = Math.radians(c2.lng);
            var dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
            var dLong = endLong - startLong;
            if (Math.abs(dLong) > Math.PI) {
                if (dLong > 0.0) dLong = -(2.0 * Math.PI - dLong);else dLong = 2.0 * Math.PI + dLong;
            }

            return (Math.degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        }

        function computeStraightRoute(start, end, index) {
            return $.Deferred(function () {
                var _this = this;

                var onFail = function onFail(error) {
                    console.log(error);
                    $.Cache.setRouteAt(index, null, 'invalid');
                    _this.reject();
                };

                var c1 = start.getLatLng().roundE8();
                var c2 = end.getLatLng().roundE8();
                var d = _haversineDistance(c1, c2);
                var azimuth = _bearing(c1, c2);

                var latlngs = [c1];

                var interval = 5;
                for (var counter = interval; counter < d; counter += interval) {
                    latlngs.push(getDestinationLatLong(c1, azimuth, counter));
                }

                latlngs.push(c2);

                var geojson = L.polyline(latlngs, {
                    color: start.getColorRgb(),
                    weight: 5,
                    opacity: 0.75,
                    snakingPause: 0,
                    snakingSpeed: 1000
                });

                var done = function done() {
                    $.Cache.setRouteAt(index, geojson, 'straight');
                    geojson.addTo(map);
                    geojson.bindPopup('Calculs en cours...');
                    geojson.snakeIn();
                    start.setOpacity(1);
                    end.setOpacity(1);
                    _this.resolve();
                };

                geojson.computeStats().then(done).fail(function () {
                    onFail('Impossible d\'obtenir les données de la route');
                });
            });
        }

        function latlngToTilePixel(latlng, crs, zoom, tileSize, pixelOrigin) {
            var layerPoint = crs.latLngToPoint(latlng, zoom).floor();
            var tile = layerPoint.divideBy(tileSize).floor();
            var tileCorner = tile.multiplyBy(tileSize).subtract(pixelOrigin);
            var tilePixel = layerPoint.subtract(pixelOrigin).subtract(tileCorner);
            return { tile: tile, tilePixel: tilePixel };
        }

        function computeRoute(start, end, index) {
            return $.Deferred(function () {
                var _this = this;

                var onFail = function onFail(error) {
                    console.log(error);
                    console.log('Trying straight line...');
                    computeStraightRoute(start, end, index).done(function () {
                        _this.resolve();
                    }).fail(function () {
                        _this.reject();
                    });
                };

                var startLatLng = start.getLatLng();
                var endLatLng = end.getLatLng();

                var options = {
                    distanceUnit: 'm',
                    endPoint: {
                        x: endLatLng.lng,
                        y: endLatLng.lat
                    },
                    exclusions: [],
                    geometryInInstructions: true,
                    graph: 'Pieton',
                    routePreferences: 'fastest',
                    startPoint: {
                        x: startLatLng.lng,
                        y: startLatLng.lat
                    },
                    viaPoints: [],
                    apiKey: keyIgn,
                    onSuccess: function onSuccess(results) {
                        if (results) {
                            var geojson = L.geoJSON([], {
                                color: start.getColorRgb(),
                                weight: 5,
                                opacity: 0.75,
                                snakingPause: 0,
                                snakingSpeed: 1000
                            });

                            var _geometry = {
                                type: 'FeatureCollection',
                                features: []
                            };
                            var counter = 1;
                            $.each(results.routeInstructions, function (idx, instructions) {
                                counter++;
                                _geometry.features.push({
                                    id: counter,
                                    type: 'Feature',
                                    geometry: instructions.geometry
                                });
                            });

                            geojson.addData(_geometry);

                            var done = function done() {
                                $.Cache.setRouteAt(index, geojson, 'auto');
                                geojson.addTo(map);
                                geojson.bindPopup('Calculs en cours...');
                                geojson.snakeIn();
                                start.setOpacity(1);
                                end.setOpacity(1);
                                _this.resolve();
                            };

                            geojson.computeStats().then(done).fail(function () {
                                onFail('Impossible d\'obtenir les données de la route');
                            });
                        } else {
                            onFail('Impossible d\'obtenir la route');
                        }
                    },
                    onFailure: function onFailure(error) {
                        // seems to never be called
                        onFail('Impossible d\'obtenir la route: ' + error.message);
                    }
                };
                Gp.Services.route(options);
            });
        }

        function addMarker(e) {
            if ($.State.getMode() === null || $.State.getComputing()) {
                return;
            }

            $.State.setComputing(true);

            var promises = [];

            var latlng = L.latLng(Math.roundE8(e.latlng.lat), Math.roundE8(e.latlng.lng));
            var marker = L.marker(latlng, {
                riseOnHover: true,
                draggable: true,
                opacity: 0.5
            }).bindPopup('<button class="marker-promote-button"><i class="fa fa-asterisk" aria-hidden="true"></i> Marquer comme étape</button> ' + '<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');
            marker.on('popupopen', function () {
                var _this = this;

                $('.marker-delete-button:visible').click(function () {
                    map.removeLayer(_this); // Routes will be deleted when marker gets deleted
                });

                $('.marker-promote-button:visible').click(function () {
                    $.State.setComputing(true);

                    _this.setPopupContent('<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');
                    _this.setColorIndex(nextColor());
                    _this.setType('step');
                    var colorRgb = _this.getColorRgb();

                    var markerIndex = $.Cache.indexOfMarker(_this);
                    if (markerIndex > -1) {
                        var markersLength = $.Cache.lengthOfMarkers();
                        for (var i = markerIndex + 1; i < markersLength; i++) {
                            if (i > 0) {
                                var routeTo = $.Cache.getRoute(i - 1); // Route ending at this marker
                                routeTo.setStyle({ color: colorRgb });
                            }

                            var m = $.Cache.getMarker(i);
                            if (m.getType() == 'step') {
                                break;
                            }

                            m.setColorIndex(currentColor);
                            m.setType(m.getType()); // To force re-coloring icon
                        }
                    }

                    $.State.triggerMarkersChanged();
                    $.State.setComputing(false);
                });
            });

            if ($.Cache.hasMarkers()) {
                marker.setColorIndex($.Cache.getMarker(-1).getColorIndex()); // Take last marker color
            } else {
                marker.setColorIndex(currentColor);
            }

            marker.setType('waypoint');
            $.Cache.addMarker(marker);
            marker.addTo(map);

            if ($.Cache.hasMarkers(2)) {
                if (!isSmallScreen && !$.Shepherd.has(1)) {
                    $.Shepherd.tour().add('data', {
                        text: $('#help-data')[0],
                        attachTo: { element: $('#data')[0], on: 'top' }
                    }).add('closeloop', {
                        text: $('#help-closeloop')[0],
                        attachTo: { element: $('#btn-closeloop')[0], on: 'right' }
                    }).add('export', {
                        text: $('#help-export')[0],
                        attachTo: { element: $('#btn-export')[0], on: 'right' }
                    }).start();
                }

                if ($.Cache.hasMarkers(3)) {
                    if (!isSmallScreen && !$.Shepherd.has(2)) {
                        $.Shepherd.tour().add('movemarker', {
                            text: $('#help-movemarker')[0],
                            attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' }
                        }).add('movemarker2', {
                            text: $('#help-movemarker2')[0],
                            attachTo: { element: $('.awesome-marker').eq(-2)[0], on: 'bottom' }
                        }).add('steps', {
                            text: $('#help-steps')[0],
                            attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' }
                        }).start();
                    }
                }

                // Compute route between this new marker and the previous one
                var markerIndex = $.Cache.lengthOfMarkers() - 1;
                var start = $.Cache.getMarker(markerIndex - 1); // previous
                var end = $.Cache.getMarker(markerIndex); // this

                if ($.Cache.lengthOfRoutes() != markerIndex - 1) console.log('Something wrong'); // but we can probably recover

                promises.push($.State.getMode() == 'auto' ? computeRoute(start, end, markerIndex - 1) : computeStraightRoute(start, end, markerIndex - 1));
            }

            marker.on('moveend', function (event) {
                // Update routes when moving this marker
                $.State.setComputing(true);
                event.target.setOpacity(0.5);
                var promises = [];

                var markerIndex = $.Cache.indexOfMarker(event.target);
                if (markerIndex > -1 && $.Cache.hasRoutes()) {
                    if (markerIndex < $.Cache.lengthOfMarkers() - 1) {
                        // Re-compute route starting at this marker
                        var routeFrom = $.Cache.getRoute(markerIndex);

                        if (routeFrom != null) map.removeLayer(routeFrom);

                        var _start = $.Cache.getMarker(markerIndex);
                        var _end = $.Cache.getMarker(markerIndex + 1);

                        var mode = $.State.getMode() || $.Cache.getRouteMode(markerIndex) || 'auto';
                        promises.push(mode == 'auto' ? computeRoute(_start, _end, markerIndex) : computeStraightRoute(_start, _end, markerIndex));
                    }

                    if (markerIndex > 0) {
                        // Re-compute route ending at this marker
                        var routeTo = $.Cache.getRoute(markerIndex - 1);

                        if (routeTo != null) map.removeLayer(routeTo);

                        var _start2 = $.Cache.getMarker(markerIndex - 1);
                        var _end2 = $.Cache.getMarker(markerIndex);

                        var _mode2 = $.State.getMode() || $.Cache.getRouteMode(markerIndex - 1) || 'auto';
                        promises.push(_mode2 == 'auto' ? computeRoute(_start2, _end2, markerIndex - 1) : computeStraightRoute(_start2, _end2, markerIndex - 1));
                    }
                }

                $.when.apply($, promises).done(function () {
                    $.State.setComputing(false);
                    event.target.setOpacity(1);
                }).fail(function () {
                    $.State.setComputing(false);
                });
            });

            marker.on('remove', function (event) {
                if ($.State.getComputing()) // FIXME: Dirty hack to enable reset on markers (also, fixes flickering of data pane when importing)
                    return;

                // Remove/update routes when removing this marker
                $.State.setComputing(true);
                var promises = [];

                var markerIndex = $.Cache.indexOfMarker(event.target);
                if (markerIndex > -1) {
                    var markersLength = $.Cache.lengthOfMarkers();

                    if (event.target.getType() == 'step' && markerIndex > 0) {
                        for (var i = markerIndex + 1; i < markersLength; i++) {
                            if (i > 0) {
                                var routeTo = $.Cache.getRoute(i - 1); // Route ending at this marker
                                routeTo.setStyle({ color: $.Cache.getMarker(markerIndex - 1).getColorRgb() });
                            }

                            var m = $.Cache.getMarker(i);
                            if (m.getType() == 'step') {
                                break;
                            }

                            m.setColorIndex($.Cache.getMarker(markerIndex - 1).getColorIndex());
                            m.setType(m.getType()); // To force re-coloring icon
                        }
                    }

                    if (markerIndex == 0) {
                        if ($.Cache.hasRoutes()) {
                            // Remove route starting at this marker
                            var routeFrom = $.Cache.getRoute(0);

                            if (routeFrom != null) map.removeLayer(routeFrom);
                            $.Cache.removeRouteAt(0);
                        }
                    } else if (markerIndex == markersLength - 1) {
                        // Remove route ending at this marking
                        var _routeTo = $.Cache.getRoute(markerIndex - 1);

                        if (_routeTo != null) map.removeLayer(_routeTo);
                        $.Cache.removeRouteAt(markerIndex - 1);
                    } else {
                        // Remove route ending at this marker & route starting at this marker
                        var _routeTo2 = $.Cache.getRoute(markerIndex - 1);
                        var routeToMode = $.Cache.getRouteMode(markerIndex - 1);
                        var _routeFrom = $.Cache.getRoute(markerIndex);
                        if (_routeTo2 != null) map.removeLayer(_routeTo2);
                        if (_routeFrom != null) map.removeLayer(_routeFrom);

                        $.Cache.removeRouteAt(markerIndex); // Remove route starting at this marker

                        // Re-compute new route between previous & next markers
                        var _start3 = $.Cache.getMarker(markerIndex - 1);
                        var _end3 = $.Cache.getMarker(markerIndex + 1);
                        var mode = $.State.getMode() || routeToMode || 'auto';

                        promises.push(mode == 'auto' ? computeRoute(_start3, _end3, markerIndex - 1) : computeStraightRoute(_start3, _end3, markerIndex - 1));
                    }

                    $.Cache.removeMarkerAt(markerIndex);
                }

                $.when.apply($, promises).done(function () {
                    $.State.setComputing(false);
                }).fail(function () {
                    $.State.setComputing(false);
                });
            });

            $.when.apply($, promises).done(function () {
                marker.setOpacity(1);
                $.State.setComputing(false);
            }).fail(function () {
                $.State.setComputing(false);
            });
        }

        function fetchAltitude(geometry) {
            return $.Deferred(function () {
                var _this = this;
                var options = {
                    apiKey: keyIgn,
                    sampling: geometry.length,
                    positions: geometry,
                    onSuccess: function onSuccess(result) {
                        if (result) {
                            $.each(result.elevations, function (i, val) {
                                $.Cache.addAltitude(val.lat, val.lon, val.z);
                            });

                            _this.resolve();
                        } else {
                            console.log('Impossible d\'obtenir les données d\'altitude: résultats invalides');
                            _this.reject();
                        }
                    },
                    /** callback onFailure */
                    onFailure: function onFailure(error) {
                        console.log('Impossible d\'obtenir les données d\'altitude: ', error.message);
                        _this.reject();
                    }
                };

                // Request altitude service
                Gp.Services.getAltitude(options);
            });
        }

        function fetchSlope(tilex, tiley, coords) {
            return $.Deferred(function () {
                var _this = this;

                var data = {
                    tilematrix: 16,
                    tilerow: tiley,
                    tilecol: tilex,
                    lon: '',
                    lat: '',
                    x: '',
                    y: ''
                };

                $.each(coords, function (idx, coord) {
                    if (idx > 0) {
                        data.lon += '|';
                        data.lat += '|';
                        data.x += '|';
                        data.y += '|';
                    }

                    data.lon += coord.lng.toString();
                    data.lat += coord.lat.toString();
                    data.x += coord.x.toString();
                    data.y += coord.y.toString();
                });

                $.getJSON('slope.php', data, function (r) {
                    if (r.results) {
                        $.each(r.results, function (i, val) {
                            $.Cache.addSlope(val.lat, val.lon, val.slope);
                        });

                        _this.resolve();
                    } else {
                        console.log('Impossible d\'obtenir les données de pente: résultats invalides');
                        _this.reject();
                    }
                }).fail(function (jqxhr, textStatus, error) {
                    console.log('Impossible d\'obtenir les données de pente: ', textStatus, error);
                    _this.reject();
                });
            });
        }

        function exportGpx(filename) {
            return $.Deferred(function () {
                var _this = this;

                var isFileSaverSupported = false;
                try {
                    isFileSaverSupported = !!new Blob();
                } catch (e) {}
                if (!isFileSaverSupported) {
                    /* can't check this until Blob polyfill loads above */
                    _this.reject();
                    return false;
                }

                var xml = '<?xml version="1.0"?>\n';
                xml += '<gpx creator="map2gpx.fr" version="1.0" xmlns="http://www.topografix.com/GPX/1/1"';
                xml += ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
                xml += ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n';
                xml += '    <trk>\n';
                xml += '        <name>' + filename + '</name>\n';
                xml += '        <trkseg>\n';

                $.Cache.eachRoute(function (i, group) {
                    if ($.Cache.getMarker(i).getType() == 'step') {
                        xml += '        </trkseg>\n';
                        xml += '    </trk>\n';
                        xml += '    <trk>\n';
                        xml += '        <name>' + filename + '-' + i + '</name>\n';
                        xml += '        <trkseg>\n';
                    }

                    $.each(group.getLatLngs(), function (j, coords) {
                        xml += '            <trkpt lat="' + coords.lat + '" lon="' + coords.lng + '">';
                        if ($.Cache.hasAltitude(coords)) xml += '<ele>' + $.Cache.getAltitude(coords) + '</ele>';
                        xml += '</trkpt>\n';
                    });
                });

                xml += '        </trkseg>\n';
                xml += '    </trk>\n';
                xml += '</gpx>\n';

                var blob = new Blob([xml], { type: 'application/gpx+xml;charset=utf-8' });
                saveAs(blob, filename + '.gpx');
                _this.resolve();
            });
        }

        function exportKml(filename) {
            return $.Deferred(function () {
                var _this = this;

                var isFileSaverSupported = false;
                try {
                    isFileSaverSupported = !!new Blob();
                } catch (e) {}
                if (!isFileSaverSupported) {
                    /* can't check this until Blob polyfill loads above */
                    _this.reject();
                    return false;
                }

                var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                xml += '<kml xmlns="http://www.opengis.net/kml/2.2"';
                xml += ' xmlns:gx="http://www.google.com/kml/ext/2.2"';
                xml += ' xmlns:kml="http://www.opengis.net/kml/2.2"';
                xml += ' xmlns:atom="http://www.w3.org/2005/Atom">\n';
                xml += '    <Document>\n';
                xml += '        <name>' + filename + '.kml</name>\n';
                xml += '        <Placemark>\n';
                xml += '            <name>' + filename + '</name>\n';
                xml += '            <LineString>\n';
                xml += '                <tessellate>1</tessellate>\n';
                xml += '                <coordinates>\n';
                xml += '                    ';

                $.Cache.eachRoute(function (i, group) {
                    if ($.Cache.getMarker(i).getType() == 'step') {
                        xml += '\n                </coordinates>\n';
                        xml += '            </LineString>\n';
                        xml += '        </Placemark>\n';
                        xml += '        <Placemark>\n';
                        xml += '            <name>' + filename + '-' + i + '</name>\n';
                        xml += '            <LineString>\n';
                        xml += '                <tessellate>1</tessellate>\n';
                        xml += '                <coordinates>\n';
                        xml += '                    ';
                    }

                    $.each(group.getLatLngs(), function (j, coords) {
                        xml += coords.lng + ',' + coords.lat + ',0 ';
                    });
                });

                xml += '\n                </coordinates>\n';
                xml += '            </LineString>\n';
                xml += '        </Placemark>\n';
                xml += '    </Document>\n';
                xml += '</kml>\n';

                var blob = new Blob([xml], { type: 'text/plain;charset=utf-8' });
                saveAs(blob, filename + '.kml');
                _this.resolve();
            });
        }

        var plotMarker = null;
        var plotMarkerOptions = {
            icon: L.AwesomeMarkers.icon({
                icon: 'area-chart',
                markerColor: 'cadetblue',
                prefix: 'fa'
            }),
            draggable: false,
            clickable: false,
            zIndexOffset: 1000
        };

        if (!isSmallScreen) {
            var chart = new Chart($('#chart'), {
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
                    }, {
                        label: 'Pente de l\'itinéraire',
                        data: [],
                        fill: true,
                        pointRadius: 0,
                        yAxisID: 'slope'
                    }, {
                        label: 'Pente du terrain',
                        data: [],
                        fill: true,
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
                        onHover: function onHover(event, active) {
                            if (event.type == 'mousemove') {
                                if (active && active.length > 0) {
                                    var idx = active[0]._index;
                                    var item = chart.config.data.datasets[0].data[idx];

                                    if (plotMarker == null) {
                                        plotMarker = L.marker(L.latLng(item.lat, item.lng), plotMarkerOptions);
                                        plotMarker.addTo(map);
                                    } else {
                                        plotMarker.setLatLng(L.latLng(item.lat, item.lng));
                                        plotMarker.update();
                                    }
                                } else {
                                    if (plotMarker) {
                                        map.removeLayer(plotMarker);
                                        plotMarker = null;
                                    }
                                }
                            } else if (event.type == 'mouseout') {
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
                            title: function title(tooltipItems, data) {
                                return 'Distance: ' + Math.floor(tooltipItems[0].xLabel * 100) / 100 + 'km';
                            },
                            label: function label(tooltipItems, data) {
                                return data.datasets[tooltipItems.datasetIndex].label + ': ' + (tooltipItems.datasetIndex == 0 ? Math.round(tooltipItems.yLabel * 100) / 100 + 'm' : Math.round(tooltipItems.yLabel) + '°');
                            }
                        }
                    },
                    annotation: {
                        annotations: []
                    }
                }
            });
        } else {
            $('#chart').remove();
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
                label: { enabled: true, position: 'left', backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: 'normal', yAdjust: 10 }
            }, {
                id: 'altmin',
                type: 'line',
                mode: 'horizontal',
                scaleID: 'alt',
                value: 0,
                borderColor: 'rgba(12, 173, 98, 0.5)',
                borderWidth: 1,
                label: { enabled: true, position: 'left', backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: 'normal', yAdjust: -10 }
            }, {
                id: 'distance',
                type: 'line',
                mode: 'vertical',
                scaleID: 'distance',
                value: 0,
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                label: { enabled: true, position: 'left', backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: 'normal', xAdjust: -50 }
            }];

            var previousStep = 0;
            $.Cache.eachRoute(function (i, group) {
                if (group != null) {
                    if ($.Cache.getMarker(i).getType() == 'step') {
                        annotations.push({
                            id: 'distance-' + i,
                            type: 'line',
                            mode: 'vertical',
                            scaleID: 'distance',
                            value: distance,
                            borderColor: 'rgba(0, 0, 0, 0.5)',
                            borderWidth: 1
                        });

                        for (var _j = previousStep; _j < i; _j++) {
                            $.Cache.getRoute(_j).setPopupContent('<ul class="legend ' + $.Cache.getMarker(_j).getColorCode() + '">' + '<li>Altitude max: ' + Math.round(localAltMax) + 'm</li>' + '<li>D+: ' + Math.round(localDenivPos) + 'm</li>' + '<li>Altitude min: ' + Math.round(localAltMin) + 'm</li>' + '<li>D-: ' + Math.round(localDenivNeg) + 'm</li>' + '<li>Distance: ' + Math.round(localDistance * 100) / 100 + 'km</li></ul>');
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

                    var e = group.getElevations();
                    if (e.length > 0) {
                        // Compute stats on global track

                        for (var j = 0; j < e.length; j++) {
                            e[j].dist += distance;
                        }

                        elevations = elevations.concat(e);
                        distance += group.getDistance();

                        if (group.getAltMin() < altMin) altMin = group.getAltMin();
                        if (group.getAltMax() > altMax) altMax = group.getAltMax();

                        if (group.getSlopeMax() > slopeMax) slopeMax = group.getSlopeMax();
                        if (group.getSlopeMin() < slopeMin) slopeMin = group.getSlopeMin();

                        denivNeg += group.getDenivNeg();
                        denivPos += group.getDenivPos();

                        // Compute stats on current step
                        localDistance += group.getDistance();

                        if (group.getAltMin() < localAltMin) localAltMin = group.getAltMin();
                        if (group.getAltMax() > localAltMax) localAltMax = group.getAltMax();

                        if (group.getSlopeMax() > localSlopeMax) localSlopeMax = group.getSlopeMax();
                        if (group.getSlopeMin() < localSlopeMin) localSlopeMin = group.getSlopeMin();

                        localDenivNeg += group.getDenivNeg();
                        localDenivPos += group.getDenivPos();
                    }
                }
            });

            if (localDistance > 0) {
                for (var j = previousStep; j < $.Cache.lengthOfRoutes(); j++) {
                    $.Cache.getRoute(j).setPopupContent('<ul class="legend ' + $.Cache.getMarker(j).getColorCode() + '">' + '<li>Altitude max: ' + Math.round(localAltMax) + 'm</li>' + '<li>D+: ' + Math.round(localDenivPos) + 'm</li>' + '<li>Altitude min: ' + Math.round(localAltMin) + 'm</li>' + '<li>D-: ' + Math.round(localDenivNeg) + 'm</li>' + '<li>Distance: ' + Math.round(localDistance * 100) / 100 + 'km</li></ul>');
                }
            }

            var size = elevations.length;

            if (size > 0) {
                var data = [];
                var data2 = [];
                var data3 = [];

                if (!isSmallScreen) {
                    for (var _j2 = 0; _j2 < size; _j2++) {
                        data.push({ x: elevations[_j2].dist, y: elevations[_j2].z, lat: elevations[_j2].lat, lng: elevations[_j2].lng });
                        data2.push({ x: elevations[_j2].dist, y: elevations[_j2].slopeOnTrack, lat: elevations[_j2].lat, lng: elevations[_j2].lng });
                        data3.push({ x: elevations[_j2].dist, y: elevations[_j2].slope, lat: elevations[_j2].lat, lng: elevations[_j2].lng });
                    }

                    var lastIndex = data.length - 1;

                    chart.options.scales.xAxes[0].ticks.max = data[lastIndex].x;
                    chart.config.data.datasets[0].data = data;
                    chart.config.data.datasets[1].data = data2;
                    chart.config.data.datasets[2].data = data3;

                    annotations[0].value = altMax;
                    annotations[0].label.content = 'Altitude max: ' + Math.round(altMax) + 'm; D+: ' + Math.round(denivPos) + 'm';
                    annotations[1].value = altMin;
                    annotations[1].label.content = 'Altitude min: ' + Math.round(altMin) + 'm; D-: ' + Math.round(denivNeg) + 'm';
                    annotations[2].value = data[lastIndex].x;
                    annotations[2].label.content = 'Distance: ' + Math.round(data[lastIndex].x * 100) / 100 + 'km';

                    var gradient = document.getElementById('chart').getContext('2d').createLinearGradient(0, 0, 0, 120);
                    var maxSlope = Math.ceil(slopeMax / 10) * 10;
                    var minSlope = Math.floor(slopeMin / 10) * 10;

                    var totalSlope = -minSlope + maxSlope;
                    if (totalSlope != 0) {
                        if (maxSlope >= 45) gradient.addColorStop((maxSlope - 45) / totalSlope, 'purple');
                        if (maxSlope >= 40) gradient.addColorStop((maxSlope - 40) / totalSlope, 'red');
                        if (maxSlope >= 35) gradient.addColorStop((maxSlope - 35) / totalSlope, 'orange');
                        if (maxSlope >= 30) gradient.addColorStop((maxSlope - 30) / totalSlope, 'yellow');

                        gradient.addColorStop(maxSlope / totalSlope, 'grey');

                        if (minSlope <= -30) gradient.addColorStop((maxSlope + 30) / totalSlope, 'yellow');
                        if (minSlope <= -35) gradient.addColorStop((maxSlope + 35) / totalSlope, 'orange');
                        if (minSlope <= -40) gradient.addColorStop((maxSlope + 40) / totalSlope, 'red');
                        if (minSlope <= -45) gradient.addColorStop((maxSlope + 45) / totalSlope, 'purple');
                        chart.config.data.datasets[1].backgroundColor = gradient;
                    }

                    var gradient2 = document.getElementById('chart').getContext('2d').createLinearGradient(0, 0, 0, 120);
                    gradient2.addColorStop(0, 'purple');
                    gradient2.addColorStop(1 - 40 / 45, 'red');
                    gradient2.addColorStop(1 - 35 / 45, 'orange');
                    gradient2.addColorStop(1 - 30 / 45, 'yellow');
                    gradient2.addColorStop(1, 'grey');
                    chart.config.data.datasets[2].backgroundColor = gradient2;

                    chart.options.annotation = {}; // TODO: potential bug with annotations where old 'value' of annotations are kept in graph
                    chart.update();
                    chart.options.annotation = { annotations: annotations };
                    chart.update();
                } else {
                    $('#data').html('<ul>' + '<li>Altitude max: ' + Math.round(altMax) + 'm; D+: ' + Math.round(denivPos) + 'm</li>' + '<li>Altitude min: ' + Math.round(altMin) + 'm; D-: ' + Math.round(denivNeg) + 'm</li>' + '<li>Distance: ' + Math.round(elevations[size - 1].dist * 100) / 100 + 'km</li></ul>');
                }

                $('#data-empty').slideUp();
            } else {
                if (!isSmallScreen) {
                    chart.options.scales.xAxes[0].ticks.max = 1;
                    chart.config.data.datasets[0].data = [];
                    chart.config.data.datasets[1].data = [];
                    chart.config.data.datasets[2].data = [];
                }

                $('#data-empty').slideDown();
            }
        }

        $.State.setMode(null);
        $.State.triggerMarkersChanged();
        $.State.setComputing(false);

        if (!isSmallScreen) {
            $.Shepherd.tour().add('welcome', {
                text: $('#help-welcome')[0]
            }).add('layers', {
                text: $('#help-layers')[0],
                attachTo: { element: $('.GPlayerName').closest('.GPwidget')[0], on: 'left' }
            }).add('search', {
                text: $('#help-search')[0],
                attachTo: { element: $('.GPshowAdvancedToolOpen').closest('.GPwidget')[0], on: 'right' }
            }).add('autotrace', {
                text: $('#help-autotrace')[0],
                attachTo: { element: $('#btn-autotrace')[0], on: 'right' }
            }).add('straighttrace', {
                text: $('#help-straighttrace')[0],
                attachTo: { element: $('#btn-straighttrace')[0], on: 'right' }
            }).start();
        }

        $('#loading').fadeOut();
    });
};