
(function ($) {

    const colorMap = { red: '#D63E2A', orange: '#F59630', green: '#72B026', blue: '#38AADD', purple: '#D252B9',
        darkred: '#A23336', darkblue: '#0067A3', darkgreen: '#728224', darkpurple: '#5B396B', cadetblue: '#436978',
        lightred: '#FF8E7F', beige: '#FFCB92', lightgreen: '#BBF970', lightblue: '#8ADAFF', pink: '#FF91EA',
        white: '#FBFBFB', lightgray: '#A3A3A3', gray: '#575757', black: '#303030', };
    const colors = ['blue', 'green', 'orange', 'purple', 'red', 'darkblue', 'darkpurple', 'lightblue', 'lightgreen', 'beige', 'pink', 'lightred'];

    $.Track = {
        currentColor: 0,
        markersLength: 0,

        bindTo: function (map) {
            this.map = map;
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

        clear: function () {
            this.eachMarker(function (i, marker) { marker.remove(false); });
            $.State.triggerMarkersChanged();
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
            var promise;

            if (this.firstMarker === undefined)
                this.firstMarker = marker;

            if (this.lastMarker !== undefined) {
                if (computeRoute)
                    promise = this.lastMarker.computeRouteTo(marker, $.State.getMode());
            }

            this.lastMarker = marker;
            this.markersLength++;
            marker.addTo(this.map);

            if (promise)
                return promise;
            else
                return $.Deferred(function () {
                    this.resolve();
                });
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

            this.eachMarker(function (i, marker) {
                if (marker.hasRouteFromHere()) {
                    if (marker.getType() == 'step') {
                        xml += '        </trkseg>\n';
                        xml += '    </trk>\n';
                        xml += '    <trk>\n';
                        xml += '        <name>' + filename + '-' + i + '</name>\n';
                        xml += '        <trkseg>\n';
                    }

                    $.each(marker.getRouteFromHere().getLatLngs(), function (j, coords) {
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

            this.eachMarker(function (i, marker) {
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

                    $.each(marker.getRouteFromHere().getLatLngs(), function (j, coords) {
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

        _removeMarker: function (marker) {
            if (this.firstMarker === marker)
                this.firstMarker = marker._nextMarker;   // Potentially undefined
            if (this.lastMarker === marker)
                this.lastMarker = marker._previousMarker;    // Potentially undefined

            this.markersLength--;
        },
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
            const newColor = $.Track.nextColor();

            var _this = this;
            while (_this && _this.options.type != 'step') {
                _this.setColorIndex(newColor);
                _this = _this._nextMarker;
            }

            this.setType('step');
            $.State.triggerMarkersChanged();
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

            $.State.triggerMarkersChanged();
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

            if (this.routeFrom) {
                mode = mode || this._mode || 'auto';
                this.deleteRouteFromHere();
            }

            return $.Route.find(this, to, 0, mode)
                .done(function () {
                    _this.attachRouteFrom(to, this.route, mode);
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

        remove: function (recompute = true) {
            var promise;

            if (this.options.type == 'step' && recompute) {
                // Change colors of next markers until next step
                this.demoteToWaypoint();
            }

            const previous = this._previousMarker;
            const next = this._nextMarker;

            $.Track._removeMarker(this);

            if (this.routeFrom) {
                this.deleteRouteFromHere();
            }

            if (previous) {
                // Has a route to here

                previous.deleteRouteFromHere();

                if (next && recompute) {
                    // Re-connect markers
                    const mode = $.State.getMode() || this._mode || 'auto';

                    promise = previous.computeRouteTo(next, mode);
                }
            }

            L.Marker.prototype.remove.call(this);

            if (promise)
                return promise;
            else
                return $.Deferred(function () {
                    this.resolve();
                });
        },
    });

    L.Marker.routed = function (latlng, options) {
        return new L.Marker.Routed(latlng, options);
    };

})(jQuery);
