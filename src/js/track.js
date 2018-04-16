
(function ($) {

    const colorMap = { red: '#D63E2A', orange: '#F59630', green: '#72B026', blue: '#38AADD', purple: '#D252B9',
        darkred: '#A23336', darkblue: '#0067A3', darkgreen: '#728224', darkpurple: '#5B396B', cadetblue: '#436978',
        lightred: '#FF8E7F', beige: '#FFCB92', lightgreen: '#BBF970', lightblue: '#8ADAFF', pink: '#FF91EA',
        white: '#FBFBFB', lightgray: '#A3A3A3', gray: '#575757', black: '#303030', };
    const colors = ['blue', 'green', 'orange', 'purple', 'red', 'darkblue', 'darkpurple', 'lightblue', 'lightgreen', 'beige', 'pink', 'lightred'];

    function findRoute(map, start, end, index, mode = 'auto') {
        return $.Deferred(function () {
            const deferred = this;  // jscs:ignore safeContextKeyword

            if (mode == 'straight') {
                // Use a deferred instead of returning it so we don't miss notifications
                _findRouteStraight(map, start, end, index)
                    .progress(deferred.notify)
                    .done(deferred.resolve)
                    .fail(deferred.reject);
            } else {
                _findRouteAuto(map, start, end, index)
                    .progress(deferred.notify)
                    .done(deferred.resolve)
                    .fail(function () {
                        console.log(this.error);
                        console.log('Trying straight line...');

                        const autoFailDrop = new Drop({
                            target: $('.awesome-marker').eq(index + 1)[0],
                            classes: 'drop-theme-arrows',
                            position: 'right middle',
                            constrainToWindow: false,
                            constrainToScrollParent: false,
                            openOn: null,
                            content: 'Impossible d\'obtenir le tracé en mode automatique. Le mode ligne droite va être utilisé.',
                        });
                        autoFailDrop.open();
                        $(autoFailDrop.content).on('click', function () {
                            autoFailDrop.destroy();
                        });

                        _findRouteStraight(map, start, end, index)
                            .progress(deferred.notify)
                            .done(deferred.resolve)
                            .fail(deferred.reject);
                    });
            }
        });
    }

    function _findRouteAuto(map, start, end, index) {
        return L.polyline_findAuto(start.getLatLng(), end.getLatLng());
    }

    function _findRouteStraight(map, start, end, index) {
        const geojson = L.polyline_findStraight(start.getLatLng(), end.getLatLng());
        return $.Deferred(function () {
            this.resolve(geojson);
        });
    }

    L.Track = L.Evented.extend({
        options: {
            map: undefined,
        },

        initialize: function (options) {
            L.setOptions(this, options);
            this.Lmap = this.options.map.map('getMap');
            this.$map = this.options.map;

            this.currentColor = 0;
            this.markersLength = 0;
        },

        getCurrentColor: function () {
            return this.currentColor;
        },

        nextColor: function () {
            this.currentColor = (this.currentColor + 1) % colors.length;
            return this.currentColor;
        },

        lengthOfMarkers: function () {
            return this.markersLength;
        },

        hasMarkers: function (size = 1) {
            return this.markersLength >= size;
        },

        hasRoutes: function (size = 1) {
            return (this.markersLength - 1) >= size;
        },

        isImport: function () {
            return this.hasRoutes() && this.getFirstMarker().getRouteModeFromHere() == 'import';
        },

        getBounds: function () {
            const bounds = L.latLngBounds(this.getFirstMarker(0).getLatLng(), this.getLastMarker().getLatLng());
            this.eachRoute(function (i, route) {
                bounds.extend(route.getBounds());
            });

            return bounds;
        },

        getFirstMarker: function () {
            return this.firstMarker;
        },

        getLastMarker: function () {
            return this.lastMarker;
        },

        isLoop: function () {
            return !!this.firstMarker && !!this.lastMarker && this.firstMarker.getLatLng().distanceTo(this.lastMarker.getLatLng()) < 10;
        },

        clear: function () {
            this.eachMarker(function (i, marker) { marker.remove(false); });
            this.fire('markerschanged');
        },

        eachMarker: function (callback) {
            var current = this.firstMarker;
            var i = 0;
            while (current) {
                const next = current._nextMarker;
                callback.call(current, i, current);

                current = next;
                i++;
            }
        },

        eachRoute: function (callback) {
            var next = this.firstMarker;
            var i = 0;
            while (next) {
                const route = next.getRouteFromHere();
                if (route) {
                    callback.call(route, i, route);
                    i++;
                }

                next = next._nextMarker;
            }
        },

        addMarker: function (marker, computeRoute = true) {
            const _this = this;

            var promise;

            if (this.firstMarker === undefined)
                this.firstMarker = marker;

            if (this.lastMarker !== undefined) {
                if (computeRoute)
                    promise = this.lastMarker.computeRouteTo(marker, this.$map.map('getMode'));
            }

            this.lastMarker = marker;
            this.markersLength++;
            marker.track = this;
            marker.addTo(this.Lmap);

            if (!promise) {
                promise = $.Deferred(function () {
                    this.resolve();
                });
            }

            return promise.done(() => this.fire('markerschanged'));
        },

        moveMarker: function (marker) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword
                const promises = [];

                if (marker.hasRouteFromHere()) {
                    // Re-compute route starting at this marker
                    const idx = promises.length;

                    promises.push(
                        marker.recomputeRouteFromHere(_this.$map.map('getMode'))
                    );
                }

                if (marker.hasRouteToHere()) {
                    // Re-compute route ending at this marker
                    const idx = promises.length;

                    promises.push(
                        marker.recomputeRouteToHere(_this.$map.map('getMode'))
                    );
                }

                $.when.apply($, promises).done(() => {
                    _this.fire('markerschanged');
                    deferred.resolve();
                }).fail(deferred.reject);
            });
        },

        insertMarker: function (marker, route) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword
                const promises = [];

                promises.push(
                    route.getStartMarker().computeRouteTo(marker, _this.$map.map('getMode'))
                );
                promises.push(
                    marker.computeRouteTo(route.getEndMarker(), _this.$map.map('getMode'))
                );

                _this.markersLength++;
                marker.addTo(_this.Lmap);

                $.when.apply($, promises).done(() => {
                    _this.fire('markerschanged');
                    deferred.resolve();
                }).fail(deferred.reject);
            });
        },

        _initStats: function () {
            return {
                distance: 0,
                altMin: Number.MAX_VALUE,
                altMax: Number.MIN_VALUE,
                denivPos: 0,
                denivNeg: 0,
            };
        },

        computeStats: function () {
            var steps = [];
            var elevations = [];
            var total = this._initStats();
            var local = this._initStats();

            this.eachMarker((i, marker) => {
                if (marker.getType() == 'step') {
                    steps.push(total.distance);

                    var current = marker;
                    while (current && current.hasRouteToHere()) {
                        current.getRouteToHere().setPopupContentWith(current._previousMarker.getColorCode(), local, current._previousMarker.getRouteModeFromHere() != 'import');
                        current = current._previousMarker;
                        if (current.getType() == 'step')
                            break;
                    }

                    local = this._initStats();
                }

                const route = marker.getRouteFromHere();
                const e = route ? route.getElevations() : [];
                if (e.length > 0) {
                    // Compute stats on global track

                    for (var j = 0; j < e.length; j++) {
                        e[j].dist += total.distance;
                        e[j].route = route;
                    }

                    elevations = elevations.concat(e);
                    total.distance += route.getDistance();

                    total.altMin = Math.min(total.altMin, route.getAltMin());
                    total.altMax = Math.max(total.altMax, route.getAltMax());

                    total.denivNeg += route.getDenivNeg();
                    total.denivPos += route.getDenivPos();

                    // Compute stats on current step
                    local.distance += route.getDistance();

                    local.altMin = Math.min(local.altMin, route.getAltMin());
                    local.altMax = Math.max(local.altMax, route.getAltMax());

                    local.denivNeg += route.getDenivNeg();
                    local.denivPos += route.getDenivPos();
                }
            });

            if (local.distance > 0) {
                var current = this.getLastMarker();
                while (current && current.hasRouteToHere()) {
                    current.getRouteToHere().setPopupContentWith(current._previousMarker.getColorCode(), local, current._previousMarker.getRouteModeFromHere() != 'import');
                    current = current._previousMarker;
                    if (current.getType() == 'step')
                        break;
                }
            }

            return {
                size: elevations.length,
                elevations,
                total,
                steps,
            };
        },

        exportGpx: function (filename) {
            let isFileSaverSupported = false;
            try {
                isFileSaverSupported = !!(new Blob());
            } catch (e) {}
            if (!isFileSaverSupported) { /* can't check this until Blob polyfill loads above */
                return false;
            }

            let xml = '<?xml version="1.0"?>\n';
            xml += '<gpx creator="map2gpx.fr" version="1.0" xmlns="http://www.topografix.com/GPX/1/1"';
            xml += ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
            xml += ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n';
            xml += '    <trk>\n';
            xml += '        <name>' + filename + '</name>\n';
            xml += '        <trkseg>\n';

            this.eachMarker((i, marker) => {
                if (marker.hasRouteFromHere()) {
                    if (marker.getType() == 'step') {
                        xml += '        </trkseg>\n';
                        xml += '    </trk>\n';
                        xml += '    <trk>\n';
                        xml += '        <name>' + filename + '-' + i + '</name>\n';
                        xml += '        <trkseg>\n';
                    }

                    $.each(marker.getRouteFromHere().getLatLngsFlatten(), (j, coords) => {
                        xml += '            <trkpt lat="' + coords.lat + '" lon="' + coords.lng + '">';
                        if ($.Cache.hasAltitude(coords))
                            xml += '<ele>' + $.Cache.getAltitude(coords) + '</ele>';
                        xml += '</trkpt>\n';
                    });
                }
            });

            xml += '        </trkseg>\n';
            xml += '    </trk>\n';
            xml += '</gpx>\n';

            var blob = new Blob([xml], { type: 'application/gpx+xml;charset=utf-8' });
            saveAs(blob, filename + '.gpx');
            return true;
        },

        exportKml: function (filename) {
            let isFileSaverSupported = false;
            try {
                isFileSaverSupported = !!(new Blob());
            } catch (e) {}
            if (!isFileSaverSupported) { /* can't check this until Blob polyfill loads above */
                return false;
            }

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
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

            this.eachMarker((i, marker) => {
                if (marker.hasRouteFromHere()) {
                    if (marker.getType() == 'step') {
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

                    $.each(marker.getRouteFromHere().getLatLngsFlatten(), (j, coords) => {
                        xml += coords.lng + ',' + coords.lat + ',0 ';
                    });
                }
            });

            xml += '\n                </coordinates>\n';
            xml += '            </LineString>\n';
            xml += '        </Placemark>\n';
            xml += '    </Document>\n';
            xml += '</kml>\n';

            var blob = new Blob([xml], { type: 'text/plain;charset=utf-8' });
            saveAs(blob, filename + '.kml');
            return true;
        },

        importGpx: function (file, interpolate) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword
                const reader = new FileReader();

                $(_this).startBlockingCompute((next) => {
                    reader.onload = (function (theFile) {
                        return function (e) {

                            const lines = [];
                            const line = new L.GPX(e.target.result, {
                                async: true,
                                onFail: function () {
                                    $(_this).endBlockingCompute(next);
                                    deferred.rejectWith({ error: 'Impossible de traiter ce fichier' });
                                },
                                onSuccess: function (gpx) {
                                    deferred.notify({ step: 'Fichier traité' });
                                    deferred.notify({ start: true, total: lines.length, status: (interpolate ? 'Interpolation en cours...' : 'Traitement en cours...') });

                                    _this.clear();

                                    const bounds = gpx.getBounds();

                                    _this.Lmap.fitBounds(bounds, { padding: [50, 50] });

                                    const promises = [];
                                    const promises2 = [];
                                    $.each(lines, function (idx, track) {
                                        if (interpolate) {
                                            const latlngs = track.getLatLngsFlatten();
                                            deferred.notify({ start: true, total: latlngs.length });

                                            // Temporarily show track to indicate we got it right
                                            track.prepareForMap(_this.Lmap, null, null);
                                            track.setStyle({ weight: 5, color: '#81197f', opacity: 0.2, snakingPause: 0, snakingSpeed: 1000, });
                                            track.addTo(_this.Lmap);

                                            promises.push(L.polyline_interpolate(latlngs).progress(function (p) {
                                                deferred.notify({ count: p.count, step: p.count + ' points trouvés' });
                                                p.line.prepareForMap(_this.Lmap, null, null);
                                                p.line.setStyle({ weight: 5, color: '#81197f', opacity: 0.5, snakingPause: 0, snakingSpeed: 1000, });    // Use temporary color
                                                p.line.addTo(_this.Lmap);
                                                promises2.push(p.line.computeStats().progress(deferred.notify));
                                            }).done(() => track.remove()));
                                        } else {
                                            track.prepareForMap(_this.Lmap, null, null);
                                            track.setStyle({ weight: 5, color: '#81197f', opacity: 0.5, snakingPause: 0, snakingSpeed: 1000, });    // Use temporary color
                                            track.addTo(_this.Lmap);
                                            promises.push($.Deferred(function () {this.resolve([{ line: track, mode: 'import' }]);}));
                                            promises2.push(track.computeStats().progress(deferred.notify));
                                        }
                                    });

                                    $.when.apply($, promises).done(function () {
                                        var startMarker;

                                        for (let i = 0; i < arguments.length; i++) {
                                            const newlines = arguments[i];
                                            const linesLength = newlines.length;

                                            $.each(newlines, function (idx, track) {  // jshint ignore:line
                                                const latlngs = track.line.getLatLngsFlatten();

                                                if (startMarker === undefined) {
                                                    const start = latlngs[0];
                                                    startMarker = L.Marker.routed(start, {
                                                        riseOnHover: true,
                                                        draggable: interpolate,
                                                        opacity: 1,
                                                        color: _this.getCurrentColor(),
                                                        type: 'waypoint',
                                                    });
                                                    if (interpolate)
                                                        startMarker.add(_this, false);
                                                    else
                                                        _this.addMarker(startMarker, false);
                                                }

                                                const end = latlngs[latlngs.length - 1];
                                                const marker = L.Marker.routed(end, {
                                                    riseOnHover: true,
                                                    draggable: interpolate,
                                                    opacity: 1,
                                                    color: (idx == linesLength - 1 ? _this.nextColor() : _this.getCurrentColor()),
                                                    type: (idx == linesLength - 1 ? 'step' : 'waypoint'),
                                                });
                                                if (interpolate)
                                                    marker.add(_this, false);
                                                else
                                                    _this.addMarker(marker, false);

                                                track.line.prepareForMap(_this.Lmap, startMarker, marker);
                                                track.line.setStyle({ weight: 5, color: startMarker.getColorRgb(), opacity: 0.75 });    // Use color of starting marker
                                                track.line.bindPopup('Calculs en cours...');

                                                if (interpolate) {
                                                    const _startMarker = startMarker;
                                                    track.line.on('popupopen', (event) => {
                                                        $('.marker-add-button:visible').click(function () {
                                                            const m = L.Marker.routed(event.popup.getLatLng().roundE8(), {
                                                                riseOnHover: true,
                                                                draggable: true,
                                                                opacity: 0.5,
                                                                color: _startMarker.getColorIndex(),
                                                                type: 'waypoint',
                                                            });

                                                            m.insert(track.line);
                                                        });
                                                    });
                                                }

                                                startMarker.attachRouteFrom(marker, track.line, track.mode);
                                                startMarker = marker;
                                            });
                                        }

                                        $(_this).endBlockingCompute(next);

                                        $.when.apply($, promises2).done(() => {
                                            _this.fire('markerschanged');
                                            deferred.resolve();
                                        }).fail(() => {
                                            deferred.rejectWith({ error: 'Impossible de récupérer les données géographiques de ce parcours' });
                                        });

                                    }).fail(() => {
                                        $(_this).endBlockingCompute(next);
                                        deferred.rejectWith({ error: 'Impossible d\'interpoler ce parcours' });
                                    });
                                },
                            }).on('addline', (e) => lines.push(e.line));
                        };
                    })(file);

                    // Read in the image file as a data URL.
                    reader.readAsText(file);
                });
            });
        },

        _removeMarker: function (marker) {
            if (this.firstMarker === marker)
                this.firstMarker = marker._nextMarker;   // Potentially undefined
            if (this.lastMarker === marker)
                this.lastMarker = marker._previousMarker;    // Potentially undefined

            this.markersLength--;
        },
    });

    L.track = function (options) {
        return new L.Track(options);
    };

    L.Marker.Routed = L.Marker.extend({
        options: {
            type: 'waypoint',
            color: 0,
        },

        initialize: function (latlng, options) {
            L.Marker.prototype.initialize.call(this, latlng, options);
            L.setOptions(this, options);

            this.setType(this.options.type);
        },

        getColorCode: function () {
            return colors[this.options.color];
        },
        getColorRgb: function () {
            return colorMap[colors[this.options.color]];
        },
        getColorIndex: function () {
            return this.options.color;
        },
        setColorIndex: function (i) {
            this.options.color = i;
            this.setType(this.options.type);

            if (this.routeFrom) {
                this.routeFrom.setStyle({ color: this.getColorRgb() });
            }
        },
        getType: function () {
            return this.options.type;
        },
        setType: function (type) {
            this.options.type = type;
            if (type == 'waypoint') {
                this.setIcon(L.AwesomeMarkers.icon({
                    icon: 'circle',
                    markerColor: this.getColorCode(),
                    prefix: 'fa',
                }));
            } else {
                this.setIcon(L.AwesomeMarkers.icon({
                    icon: 'asterisk',
                    markerColor: this.getColorCode(),
                    prefix: 'fa',
                }));
            }
        },

        promoteToStep: function () {
            const newColor = this.track.nextColor();

            var _this = this;
            while (_this && _this.options.type != 'step') {
                _this.setColorIndex(newColor);
                _this = _this._nextMarker;
            }

            this.setType('step');
            this.track.fire('markerschanged');
        },

        demoteToWaypoint: function () {
            this.setType('waypoint');

            if (this.hasRouteToHere()) {
                const newColor = this._previousMarker.getColorIndex();

                var _this = this;
                while (_this && _this.options.type != 'step') {
                    _this.setColorIndex(newColor);
                    _this = _this._nextMarker;
                }
            }

            this.track.fire('markerschanged');
        },

        hasRouteToHere: function () {
            return (this._previousMarker && this._previousMarker.hasRouteFromHere());
        },
        getRouteToHere: function () {
            return this._previousMarker.routeFrom;
        },
        hasRouteFromHere: function () {
            return !!this.routeFrom;
        },
        getRouteFromHere: function () {
            return this.routeFrom;
        },
        getRouteModeFromHere: function () {
            return this._mode;
        },

        deleteRouteFromHere: function () {
            if (this._nextMarker)
                this._nextMarker._previousMarker = undefined;
            if (this.routeFrom)
                this.routeFrom.remove();
            this.attachRouteFrom(undefined, null, undefined);
        },

        computeRouteTo: function (to, mode) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword

                $(_this).startBlockingCompute((next) => {
                    mode = mode || _this._mode || 'auto';

                    const map = $('#map').map('getMap');    // FIXME

                    _this.setOpacity(0.5);
                    to.setOpacity(0.5);
                    if (_this.routeFrom) {
                        _this.routeFrom.setStyle({ opacity: 0.5 });
                    }

                    findRoute(map, _this, to, 0, mode)
                        .done(function (geojson) {
                            geojson.prepareForMap(map, _this, to);
                            geojson.setStyle({
                                color: _this.getColorRgb(),
                                weight: 5,
                                opacity: 0.75,
                                snakingPause: 0,
                                snakingSpeed: 1000,
                            });

                            _this.deleteRouteFromHere();
                            _this.attachRouteFrom(to, geojson, mode);

                            $(_this).startCompute((next) => {
                                geojson.computeStats().progress($.Queue.notify).done(deferred.resolve).fail(function () {
                                    $.Queue.failed('Impossible d\'obtenir les données de la route');
                                    deferred.rejectWith({ error: 'Impossible d\'obtenir les données de la route' });
                                }).always(() => $(_this).endCompute(next));

                                geojson.addTo(map);
                                geojson.bindPopup('Calculs en cours...');
                                geojson.on('popupopen', (event) => {
                                    $('.marker-add-button:visible').click(function () {
                                        const marker = L.Marker.routed(event.popup.getLatLng().roundE8(), {
                                            riseOnHover: true,
                                            draggable: true,
                                            opacity: 0.5,
                                            color: _this.getColorIndex(),
                                            type: 'waypoint',
                                        });

                                        marker.insert(geojson);
                                    });
                                });

                                try {
                                    geojson.snakeIn();
                                } catch (e) {
                                    // With some weird tracks, snakeIn can fail (don't know why)
                                    geojson._snakeEnd();
                                }

                                _this.setOpacity(1);
                                to.setOpacity(1);
                            });
                        })
                        .fail(deferred.reject)
                        .always(() => $(_this).endBlockingCompute(next));
                });
            });
        },

        recomputeRouteFromHere: function (mode) {
            return this.computeRouteTo(this._nextMarker, mode);
        },

        recomputeRouteToHere: function (mode) {
            return this._previousMarker.computeRouteTo(this, mode);
        },

        attachRouteFrom: function (to, route, mode) {
            this._nextMarker = to;
            if (to)
                to._previousMarker = this;
            this.routeFrom = route;
            this._mode = mode;
        },

        _bindEvents: function () {
            this.bindPopup('<button class="marker-promote-button"><i class="fa fa-asterisk" aria-hidden="true"></i> Marquer comme étape</button> ' +
                '<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');

            this.on('popupopen', () => {
                $('.marker-delete-button:visible').click(() => {
                    this.remove();
                });

                $('.marker-promote-button:visible').click(() => {
                    this.closePopup();
                    this.setPopupContent('<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');
                    this.promoteToStep();
                });
            });

            this.on('moveend', (event) => {
                // Update routes when moving this marker
                this.track.moveMarker(this);
            });
        },

        add: function (o, computeRoute = true) {
            this.track = o;
            this._bindEvents();
            return this.track.addMarker(this, computeRoute);
        },

        insert: function (route) {
            this.track = $('#map').map('getTrack'); // FIXME
            this._bindEvents();
            return this.track.insertMarker(this, route);
        },

        remove: function (recompute = true) {
            var promise;

            if (this.options.type == 'step' && recompute) {
                // Change colors of next markers until next step
                this.demoteToWaypoint();
            }

            const previous = this._previousMarker;
            const next = this._nextMarker;

            this.track._removeMarker(this);

            if (this.routeFrom) {
                this.deleteRouteFromHere();
            }

            if (previous) {
                // Has a route to here

                previous.deleteRouteFromHere();

                if (next) {
                    if (previous.getLatLng().equals(next.getLatLng())) {
                        // In case previous & next markers are the same, remove one of them because there's no route
                        // This can happen if we have a loop with 3 markers and we delete the middle one
                        previous.attachRouteFrom(next, null, undefined);    // We need to temporarily "fix" the chain to remove the marker properly
                        if (previous.options.type == 'step')
                            promise = next.remove(recompute);
                        else
                            promise = previous.remove(recompute);
                    } else if (recompute) {
                        // Re-connect markers
                        const mode = this.track.$map.map('getMode') || this._mode || 'auto';

                        promise = previous.computeRouteTo(next, mode);
                    }
                }
            }

            if (!promise) {
                promise = $.Deferred(function () {
                    this.resolve();
                });
            }

            L.Marker.prototype.remove.call(this);
            this.track.fire('markerschanged');

            return promise;
        },
    });

    L.Marker.routed = function (latlng, options) {
        return new L.Marker.Routed(latlng, options);
    };

})(jQuery);
