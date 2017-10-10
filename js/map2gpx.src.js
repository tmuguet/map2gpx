(function ($) {
    const hasLocalStorage = (function storageAvailable(type) {
        var storage;
        try {
            storage = window[type];
            var x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return e instanceof DOMException && (
                e.code === 22 || // everything except Firefox
                e.code === 1014 || // Firefox

                // test name field too, because code might not be present
                e.name === 'QuotaExceededError' || // everything except Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') && // Firefox

                // acknowledge QuotaExceededError only if there's something already stored
                storage.length !== 0;
        }
    })('localStorage');

    $.localStorage = {
        get: function (item) {
            if (hasLocalStorage)
                return localStorage.getItem(item);
            else
                return null;
        },

        getAsJSON: function (item) {
            if (hasLocalStorage && localStorage.getItem(item) !== null)
                return JSON.parse(localStorage.getItem(item));
            else
                return null;
        },

        set: function (item, value) {
            if (hasLocalStorage)
                localStorage.setItem(item, value);
        },

        setAsJSON: function (item, value) {
            this.set(item, JSON.stringify(value));
        },
    };
})(jQuery);

/* from https://stackoverflow.com/a/3855394 */
(function ($) {
    $.QueryString = (function (paramsArray) {
        let params = {};

        for (let i = 0; i < paramsArray.length; ++i) {
            let param = paramsArray[i].split('=', 2);

            if (param.length !== 2)
                continue;

            params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, ' '));
        }

        return params;
    })(window.location.search.substr(1).split('&'));
})(jQuery);

(function ($) {
    const tutorials = [];

    $.Shepherd = {};
    $.Shepherd.Step = function () {
        var _name;
        var _shepherd;
        var _opts;

        var init = function (name, settings) {
            _name = name;
            _opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
            });
            return this;
        };

        return {
            init,
        };
    };

    $.Shepherd.step = function (name, settings) {
        return $.Shepherd.Step().init(name, settings);
    };

    $.Shepherd.Tour = function () {
        var _tour;
        var _steps = 0;

        const init = function (settings) {
            const opts = $.extend({}, settings, {
                defaults: {
                    classes: 'shepherd-element shepherd-open shepherd-theme-arrows',
                    showCancelLink: true,
                },
            });
            _tour = new Shepherd.Tour(opts);
            return this;
        };

        const add = function (name, settings) {
            const _this = this;
            const currentStep = _steps;

            const opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
            });

            opts.buttons = [
                {
                    text: 'Fermer',
                    classes: 'shepherd-button-secondary',
                    action: function () {
                        $.localStorage.set('tutorial' + tutorials.indexOf(_this), -1);
                        _this.cancel();
                    },
                }, {
                    text: 'Suivant',
                    classes: 'shepherd-button-example-primary',
                    action: function () {
                        const currentShepherdIndex = tutorials.indexOf(_this);

                        if (currentShepherdIndex < 0)
                            console.log('Could not find current shepherd, something is probably wrong');

                        $.localStorage.set('tutorial' + currentShepherdIndex, currentStep + 1);   // Restore next step

                        _this.next();

                        if (currentStep == _steps - 1) {
                            // Last step of current tutorial
                            if (currentShepherdIndex >= 0 && currentShepherdIndex < tutorials.length - 1) {
                                // Another tutorial is available, start it
                                tutorials[currentShepherdIndex + 1].start(true);
                            }
                        }
                    },
                },
            ];

            _tour.addStep(name, opts);
            _steps++;
            return this;
        };

        const start = function (forceShow = false) {
            var id = 0;

            if (!forceShow) {
                const currentShepherdIndex = tutorials.indexOf(this);
                if ($.localStorage.get('tutorial' + currentShepherdIndex) !== null) {
                    id = parseInt($.localStorage.get('tutorial' + currentShepherdIndex));
                }
            }

            if (id >= 0 && id < _steps) {
                _tour.show(id);
            }

            return this;
        };

        const cancel = function () {
            _tour.cancel();
            return this;
        };

        const next = function () {
            _tour.next();
            return this;
        };

        return {
            init,
            add,
            start,
            cancel,
            next,
        };
    };

    $.Shepherd.tour = function (settings) {
        const tour = $.Shepherd.Tour().init(settings);
        tutorials.push(tour);
        return tour;
    };

    $.Shepherd.get = function (idx) {
        return tutorials[idx];
    };

    $.Shepherd.has = function (idx) {
        return (tutorials.length > idx);
    };

})(jQuery);

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

// Can't use L.LatLng.include() because not defined
L.LatLng.prototype.roundE8 = function () {
    return L.latLng(Math.roundE8(this.lat), Math.roundE8(this.lng));
};

// from https://stackoverflow.com/a/40986574
L.LatLng.prototype.toTilePixel = function (crs, zoom, tileSize, pixelOrigin) {
    const layerPoint = crs.latLngToPoint(this, zoom).floor();
    const tile = layerPoint.divideBy(tileSize).floor();
    const tileCorner = tile.multiplyBy(tileSize).subtract(pixelOrigin);
    const tilePixel = layerPoint.subtract(pixelOrigin).subtract(tileCorner);
    return { tile, tilePixel };
};

// from https://gis.stackexchange.com/questions/157693/getting-all-vertex-lat-long-coordinates-every-1-meter-between-two-known-points
L.LatLng.prototype.getDestinationAlong = function (azimuth, distance) {
    const R = 6378137; // Radius of the Earth in m
    const brng = Math.radians(azimuth); // Bearing is degrees converted to radians.
    const lat1 = Math.radians(this.lat); //Current dd lat point converted to radians
    const lon1 = Math.radians(this.lng); //Current dd long point converted to radians
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng));
    var lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1),
        Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    //convert back to degrees
    lat2 = Math.degrees(lat2);
    lon2 = Math.degrees(lon2);
    return L.latLng(Math.roundE8(lat2), Math.roundE8(lon2));
};

L.LatLng.prototype.bearingTo = function (other) {
    const startLat = Math.radians(this.lat);
    const startLong = Math.radians(this.lng);
    const endLat = Math.radians(other.lat);
    const endLong = Math.radians(other.lng);
    const dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
    var dLong = endLong - startLong;
    if (Math.abs(dLong) > Math.PI) {
        if (dLong > 0.0)
            dLong = -(2.0 * Math.PI - dLong);
        else
            dLong = (2.0 * Math.PI + dLong);
    }

    return (Math.degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
};

L.Handler.include({
    setEnabled: function (enabled) {
        if (enabled)
            this.enable();
        else
            this.disable();
    },
});

L.Control.EasyButton.include({
    setEnabled: function (enabled) {
        if (enabled)
            this.enable();
        else
            this.disable();
    },
});

(function ($) {
    var queues = 0;

    $.fn.clearCompute = function () {
        return this.each(function () {
            queues -= $(this).queue().length;
            $(this).clearQueue();
        });
    };

    $.fn.startCompute = function (cb) {
        return this.each(function () {
            $.State.setComputing(true);
            queues++;
            $(this).queue(cb);
        });
    };

    $.fn.endCompute = function (next) {
        return this.each(function () {
            queues--;
            next();

            if (queues == 0)
                $.State.setComputing(false);
        });
    };

    $.Queue = {
        size: () => queues,
    };

})(jQuery);

(function ($) {
    var _mode = null;
    var _computing = false;

    var _progress = 0;
    var _total = 0;

    const $h2 = $('#data-computing h2');
    const $progress = $('#data-computing-progress');
    const $progressbar = $('#data-computing-progressbar');
    const $status = $('#data-computing-status');
    const $pending = $('#data-computing-pending');

    $.State = {};

    $.State.setMode = function (mode) {
        _mode = mode;
        $('body').trigger($.Event('map2gpx:modechange', { mode: _mode, computing: _computing }));
    };

    $.State.setComputing = function (computing) {
        if (computing && !_computing) {
            _progress = 0;
            _total = 0;
        }

        _computing = computing;
        $('body').trigger($.Event('map2gpx:computingchange', { mode: _mode, computing: _computing }));
    };

    $.State.updateComputing = function (progress, display = true) {
        if (Array.isArray(progress)) {
            $.each(progress, function () {
                $.State.updateComputing(this, false);
            });

            $.State.displayComputing();

            return;
        }

        if (progress.start) {
            _total += progress.total;
        } else if (progress.end) {
            _progress = _total;
        } else {
            _progress++;
        }

        if ('status' in progress && progress.status)
            $status.text(progress.status);
        if ('step' in progress && progress.step)
            $('<div><small>' + progress.step + '</small></div>').insertAfter($h2).fadeOut(400, function () {$(this).remove();});

        if (display)
            $.State.displayComputing();
    };

    $.State.displayComputing = function () {
        let p = 1;
        if (_total > 0)
            p = _progress / _total;

        $progress.text(Math.round(p * 100) + '%');
        $progressbar.css('width', Math.round(p * 100) + '%');

        if (Math.round(p * 100) == 42)
            $('<div><small>La grande question sur la vie, l\'univers et le reste répondue</small></div>').insertAfter($h2).fadeOut(400, function () {$(this).remove();});
    };

    $.State.triggerMarkersChanged = function () {
        $('body').trigger($.Event('map2gpx:markerschange', { mode: _mode, computing: _computing }));
    };

    $.State.getMode = function () { return _mode; };
    $.State.getComputing = function () { return _computing; };

})(jQuery);

(function ($) {
    const _altitudes = {}; // Cache of computed altitudes for each points of routes computed so far
    const _slopes = {}; // Cache of computed slopes for each points of routes computed so far

    $.Cache = {};

    const getKey = function (coords) {
        return coords.lng + '/' + coords.lat;
    };

    $.Cache.addAltitude = function (lat, lng, z) {
        _altitudes[lng + '/' + lat] = z;
    };

    $.Cache.getAltitude = function (coords) {
        const key = getKey(coords);
        return (key in _altitudes) ? _altitudes[key] : null;
    };

    $.Cache.hasAltitude = function (coords) {
        return getKey(coords) in _altitudes;
    };

    $.Cache.addSlope = function (lat, lng, slope) {
        _slopes[lng + '/' + lat] = slope;
    };

    $.Cache.getSlope = function (coords) {
        const key = getKey(coords);
        return (key in _slopes) ? _slopes[key] : null;
    };

    $.Cache.hasSlope = function (coords) {
        return getKey(coords) in _slopes;
    };

    $.Cache.getInfos = function (coords) {
        const key = getKey(coords);
        return {
            z: (key in _altitudes) ? _altitudes[key] : null,
            slope: (key in _slopes) ? _slopes[key] : null,
        };
    };

    $.Cache.lengthOfMarkers = function () {
        return $.Track.lengthOfMarkers();
    };

    $.Cache.hasMarkers = function (size = 1) {
        return $.Track.hasMarkers(size);
    };

    $.Cache.getMarker = function (idx) {
    };

    $.Cache.indexOfMarker = function (o) {
    };

    $.Cache.eachMarker = function (callback) {
    };

    $.Cache.addMarker = function (marker) {
    };

    $.Cache.removeMarkerAt = function (idx) {
    };

    $.Cache.resetMarkers = function () {
    };

    $.Cache.lengthOfRoutes = function () {
    };

    $.Cache.hasRoutes = function (n) {
    };

    $.Cache.getRoute = function (idx) {
    };

    $.Cache.getRouteMode = function (idx) {
    };

    $.Cache.eachRoute = function (callback) {
    };

    $.Cache.addRoute = function (track, mode) {
    };

    $.Cache.setRouteAt = function (idx, track, mode) {
    };

    $.Cache.removeRouteAt = function (idx) {
    };

    $.Cache.resetRoutes = function () {
    };
})(jQuery);

L.Map.include({
    _bindViewEvents: function () {
        this.on('zoomend', function () {
            console.log('Zoomed to ', this.getZoom());
            $.localStorage.set('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
        });

        this.on('moveend', function () {
            console.log('Moved to ', this.getCenter());
            $.localStorage.setAsJSON('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
        });
    },

    _setView: function (view) {
        this.setView([view[0], view[1]], view[2]);
    },

    initView: function () {
        const _this = this;
        return $.Deferred(function () {
            const deferred = this;    // jscs:ignore safeContextKeyword

            let view = $.localStorage.getAsJSON('view') ||
                [44.96777356135154, 6.06822967529297, 13];   // Center in les Ecrins because I love this place

            if ('lat' in $.QueryString && 'lng' in $.QueryString) {
                view = [$.QueryString.lat, $.QueryString.lng, 15];
            }

            if ('loc' in $.QueryString) {
                // Try to find location
                const options = {
                    text: $.QueryString.loc,
                    filterOptions: { type: ['StreetAddress', 'PositionOfInterest'] },
                    apiKey: keyIgn,
                    onSuccess: function (results) {
                        if (results && 'suggestedLocations' in results && results.suggestedLocations.length > 0) {
                            _this._setView([
                                results.suggestedLocations[0].position.y,
                                results.suggestedLocations[0].position.x,
                                15,
                            ]);
                            deferred.resolveWith(_this);
                        } else {
                            console.log('No results?');
                            _this._setView(view); // Use default view
                            deferred.resolveWith(_this);
                        }
                    },
                    onFailure: function (error) {
                        // Error, or no match
                        console.log(error);
                        _this._setView(view); // Use default view
                        deferred.resolveWith(_this);
                    },
                };
                Gp.Services.autoComplete(options);
            } else {
                _this._setView(view);
                deferred.resolveWith(_this);
            }
        }).done(this._bindViewEvents);  // Bind events when we're done, so we don't store parameters from query string
    },
});


function fetchAltitude(geometry) {
    return $.Deferred(function () {
        const _this = this;
        const options = {
            apiKey: keyIgn,
            sampling: geometry.length,
            positions: geometry,
            onSuccess: function (result) {
                if (result) {
                    $.each(result.elevations, function (i, val) {
                        $.Cache.addAltitude(val.lat, val.lon, val.z);
                    });

                    _this.resolveWith({ size: result.elevations.length });
                } else {
                    console.log('Impossible d\'obtenir les données d\'altitude: résultats invalides');
                    _this.reject();
                }
            },
            /** callback onFailure */
            onFailure: function (error) {
                console.log('Impossible d\'obtenir les données d\'altitude: ', error.message);
                _this.reject();
            },
        };

        // Request altitude service
        Gp.Services.getAltitude(options);
    });
}

function fetchSlope(tilex, tiley, coords) {
    return $.Deferred(function () {
        const _this = this;

        const data = {
            tilematrix: 16,
            tilerow: tiley,
            tilecol: tilex,
            lon: '',
            lat: '',
            x: '',
            y: '',
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

                _this.resolveWith({ size: r.results.length });
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

// TODO: these functions should only exist for classes that define getLatLngs
L.Layer.include({
    _elevations: [],
    _distance: 0,
    _altMin: 0,
    _altMax: 0,
    _denivPos: 0,
    _denivNeg: 0,

    prepareForMap: function (map, start, end) {
        this._mapToAdd = map;
        this._start = start;
        this._end = end;
    },

    getStartMarker: function () { return this._start; },
    getEndMarker: function () { return this._end; },

    getElevations: function () {
        return JSON.parse(JSON.stringify(this._elevations));   // return deep copy (isn't there a better way??)
    },

    getDistance: function () { return this._distance; },
    getAltMin: function () { return this._altMin; },
    getAltMax: function () { return this._altMax; },
    getDenivPos: function () { return this._denivPos; },
    getDenivNeg: function () { return this._denivNeg; },

    computeStats: function () {
        const _this = this;
        return $.Deferred(function () {
            const deferred = this;  // jscs:ignore safeContextKeyword
            const promises = _this._fetchAltitude().concat(_this._fetchSlope());
            const total = promises.length;

            deferred.notify({ start: true, total: total, status: 'Récupération des données géographiques...' });

            $.each(promises, function () {
                this.done(function () {
                    deferred.notify({ step: this.size + ' points récupérés' });
                });
            });

            $.when.apply($, promises)
                .fail(deferred.reject)
                .then(function () {
                    _this._computeStats();
                    deferred.resolve();
                });
        });
    },

    _computeStats: function () {
        const elevations = [];

        $.each(this.getLatLngs(), function (j, coords) {
            const values = $.extend({}, { lat: coords.lat, lng: coords.lng }, $.Cache.getInfos(coords));
            elevations.push(values);
        });

        if (elevations.length == 0) {
            return false;
        }

        // Calcul de la distance au départ pour chaque point + arrondi des lat/lon
        this._distance = 0;
        this._altMin = elevations[0].z;
        this._altMax = elevations[0].z;
        this._denivPos = 0;
        this._denivNeg = 0;

        elevations[0].dist = 0;
        elevations[0].slopeOnTrack = 0;

        this._elevations = [elevations[0]];

        let j = 0;
        for (let i = 1; i < elevations.length; i++) {
            const localDistance = L.latLng(elevations[i]).distanceTo(L.latLng(this._elevations[j])); // m
            if (localDistance > 10) {

                this._distance += localDistance / 1000;   // km

                j++;
                this._elevations[j] = elevations[i];
                this._elevations[j].dist = this._distance;
                this._elevations[j].slopeOnTrack = Math.degrees(
                    Math.atan((Math.round(this._elevations[j].z) - Math.round(this._elevations[j - 1].z)) / localDistance)
                );

                if (this._elevations[j].z < this._altMin)
                    this._altMin = this._elevations[j].z;
                if (this._elevations[j].z > this._altMax)
                    this._altMax = this._elevations[j].z;

                if (this._elevations[j].z < this._elevations[j - 1].z)
                    this._denivNeg += (Math.round(this._elevations[j - 1].z - this._elevations[j].z));
                else
                    this._denivPos += (Math.round(this._elevations[j].z - this._elevations[j - 1].z));
            }
        }

        return true;
    },

    _fetchAltitude: function () {
        var geometry = []; // Batch
        const promises = [];

        $.each(this.getLatLngs(), function (j, coords) {
            if (!$.Cache.hasAltitude(coords)) { // Skip already cached values
                geometry.push({
                    lon: coords.lng,
                    lat: coords.lat,
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

    _fetchSlope: function () {
        const _this = this;
        const tiles = {};
        const promises = [];
        const map = (this._map || this._mapToAdd);

        $.each(this.getLatLngs(), function (j, coords) {
            if (!$.Cache.hasSlope(coords)) { // Skip already cached values
                const { tile, tilePixel } = coords.toTilePixel(map.options.crs, 16, 256, map.getPixelOrigin());

                if (!(tile.x in tiles))
                    tiles[tile.x] = {};
                if (!(tile.y in tiles[tile.x]))
                    tiles[tile.x][tile.y] = [[]];

                if (tiles[tile.x][tile.y][tiles[tile.x][tile.y].length - 1].length > 50)
                    tiles[tile.x][tile.y].push([]);

                tiles[tile.x][tile.y][tiles[tile.x][tile.y].length - 1].push({
                    lat: coords.lat,
                    lng: coords.lng,
                    x: tilePixel.x,
                    y: tilePixel.y,
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
    },

    setPopupContentWith: function (color, stats) {
        this.setPopupContent('<ul class="legend ' + color + '">' +
            '<li>Altitude max: ' + Math.round(stats.altMax) + 'm</li>' +
            '<li>D+: ' + Math.round(stats.denivPos) + 'm</li>' +
            '<li>Altitude min: ' + Math.round(stats.altMin) + 'm</li>' +
            '<li>D-: ' + Math.round(stats.denivNeg) + 'm</li>' +
            '<li>Distance: ' + Math.round(stats.distance * 100) / 100 + 'km</li></ul>' +
            '<button class="marker-add-button"><i class="fa fa-plus" aria-hidden="true"></i> Ajouter un marqueur ici</button>');
    },
});

L.GeoJSON.include({
    getLatLngs: function () {
        const c = [];

        this.eachLayer(function (layer) {
            $.each(layer.feature.geometry.coordinates, function (j, coords) {
                c.push(L.latLng(coords[1], coords[0]));
            });
        });

        return c;
    },
});

(function ($) {
    var plotMarker = null;
    const plotMarkerOptions = {
        icon: L.AwesomeMarkers.icon({
            icon: 'area-chart',
            markerColor: 'cadetblue',
            prefix: 'fa',
        }),
        draggable: false,
        clickable: false,
        zIndexOffset: 1000,
    };

    var chart = null;
    var chartId;
    var $d;
    var $dEmpty;
    var isSmallScreen;

    $.Chart = {
        init: function (map, id, $data, $dataEmpty, smallScreen) {
            chartId = id;
            $d = $data;
            $dEmpty = $dataEmpty;
            isSmallScreen = smallScreen;

            if (isSmallScreen) {
                $('#' + id).remove();
                return;
            }

            chart = new Chart($('#' + id), {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'Altitude',
                            data: [],
                            fill: false,
                            borderColor: 'rgba(12, 98, 173, 0.8)',
                            backgroundColor: 'rgba(12, 98, 173, 0.8)',
                            lineTension: 0,
                            pointRadius: 0,
                            yAxisId: 'alt',
                        }, {
                            label: 'Pente de l\'itinéraire',
                            data: [],
                            fill: true,
                            pointRadius: 0,
                            yAxisID: 'slope',
                        }, {
                            label: 'Pente du terrain',
                            data: [],
                            fill: true,
                            pointRadius: 0,
                            yAxisID: 'slope2',
                            hidden: true,
                        },
                    ],
                },
                options: {
                    maintainAspectRatio: false,
                    onClick: function (event, active) {
                        if (active && active.length > 0) {
                            const idx = active[0]._index;
                            const item = chart.config.data.datasets[0].data[idx];

                            if (item.route) {
                                item.route.openPopup(L.latLng(item.lat, item.lng));
                            }
                        }
                    },
                    hover: {
                        mode: 'index',
                        intersect: false,
                        onHover: function (event, active) {
                            if (event.type == 'mousemove') {
                                if (active && active.length > 0) {
                                    const idx = active[0]._index;
                                    const item = chart.config.data.datasets[0].data[idx];

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
                        },
                    },
                    scales: {
                        xAxes: [
                            {
                                id: 'distance',
                                type: 'linear',
                                position: 'bottom',
                                ticks: {
                                    min: 0,
                                },
                            },
                        ],
                        yAxes: [
                            {
                                id: 'alt',
                                type: 'linear',
                                position: 'left',
                                beginAtZero: false,
                            }, {
                                id: 'slope',
                                type: 'linear',
                                position: 'right',
                            }, {
                                id: 'slope2',
                                type: 'linear',
                                position: 'right',
                                ticks: {
                                    min: 0,
                                    max: 45,
                                },
                            },
                        ],
                    },
                    legend: {
                        position: 'left',
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function (tooltipItems, data) {
                                return 'Distance: ' + Math.floor(tooltipItems[0].xLabel * 100) / 100 + 'km';
                            },
                            label: function (tooltipItems, data) {
                                return data.datasets[tooltipItems.datasetIndex].label + ': ' +
                                    (tooltipItems.datasetIndex == 0 ? Math.round(tooltipItems.yLabel * 100) / 100 + 'm' : Math.round(tooltipItems.yLabel) + '°');
                            },
                        },
                    },
                    annotation: {
                        annotations: [],
                    },
                },
            });
        },

        _replotSmallScreen: function (data) {
            if (data.size > 0) {
                $d.html('<ul>' +
                    '<li>Altitude max: ' + Math.round(data.total.altMax) + 'm; D+: ' + Math.round(data.total.denivPos) + 'm</li>' +
                    '<li>Altitude min: ' + Math.round(data.total.altMin) + 'm; D-: ' + Math.round(data.total.denivNeg) + 'm</li>' +
                    '<li>Distance: ' + Math.round(data.elevations[data.size - 1].dist * 100) / 100 + 'km</li></ul>');
            } else {
                $d.empty();
            }
        },

        _replotWideScreen: function (data) {
            if (data.size > 0) {
                const series1 = [];
                const series2 = [];
                const series3 = [];

                let maxSlope = 0;
                let minSlope = 0;

                for (let j = 0; j < data.size; j++) {
                    let correctedSlopeOnTrack;
                    if (j > 3 && j < data.size - 4) {
                        correctedSlopeOnTrack = (
                            data.elevations[j - 3].slopeOnTrack +
                            2 * data.elevations[j - 2].slopeOnTrack +
                            4 * data.elevations[j - 1].slopeOnTrack +
                            8 * data.elevations[j].slopeOnTrack +
                            4 * data.elevations[j + 1].slopeOnTrack +
                            2 * data.elevations[j + 2].slopeOnTrack +
                            data.elevations[j + 3].slopeOnTrack
                            ) / 22;
                    } else {
                        correctedSlopeOnTrack = data.elevations[j].slopeOnTrack;
                    }

                    if (correctedSlopeOnTrack > maxSlope)
                        maxSlope = correctedSlopeOnTrack;
                    if (correctedSlopeOnTrack < minSlope)
                        minSlope = correctedSlopeOnTrack;

                    series1.push({ x: data.elevations[j].dist, y: data.elevations[j].z, lat: data.elevations[j].lat, lng: data.elevations[j].lng, route: data.elevations[j].route });
                    series2.push({ x: data.elevations[j].dist, y: correctedSlopeOnTrack });
                    series3.push({ x: data.elevations[j].dist, y: data.elevations[j].slope });
                }

                const lastIndex = data.size - 1;

                chart.options.scales.xAxes[0].ticks.max = series1[lastIndex].x;
                chart.config.data.datasets[0].data = series1;
                chart.config.data.datasets[1].data = series2;
                chart.config.data.datasets[2].data = series3;

                data.annotations[0].value = data.total.altMax;
                data.annotations[0].label.content = 'Altitude max: ' + Math.round(data.total.altMax) + 'm; D+: ' + Math.round(data.total.denivPos) + 'm';
                data.annotations[1].value = data.total.altMin;
                data.annotations[1].label.content = 'Altitude min: ' + Math.round(data.total.altMin) + 'm; D-: ' + Math.round(data.total.denivNeg) + 'm';
                data.annotations[2].value = series1[lastIndex].x;
                data.annotations[2].label.content = 'Distance: ' + Math.round(series1[lastIndex].x * 100) / 100 + 'km';

                const gradient = document.getElementById(chartId).getContext('2d').createLinearGradient(0, 0, 0, 120);
                maxSlope = Math.ceil(maxSlope / 10) * 10;
                minSlope = Math.floor(minSlope / 10) * 10;

                const totalSlope = -minSlope + maxSlope;
                if (totalSlope != 0) {
                    if (maxSlope >= 45)
                        gradient.addColorStop((maxSlope - 45) / totalSlope, 'purple');
                    if (maxSlope >= 40)
                        gradient.addColorStop((maxSlope - 40) / totalSlope, 'red');
                    if (maxSlope >= 35)
                        gradient.addColorStop((maxSlope - 35) / totalSlope, 'orange');
                    if (maxSlope >= 30)
                        gradient.addColorStop((maxSlope - 30) / totalSlope, 'yellow');

                    gradient.addColorStop(maxSlope / totalSlope, 'grey');

                    if (minSlope <= -30)
                        gradient.addColorStop((maxSlope + 30) / totalSlope, 'yellow');
                    if (minSlope <= -35)
                        gradient.addColorStop((maxSlope + 35) / totalSlope, 'orange');
                    if (minSlope <= -40)
                        gradient.addColorStop((maxSlope + 40) / totalSlope, 'red');
                    if (minSlope <= -45)
                        gradient.addColorStop((maxSlope + 45) / totalSlope, 'purple');
                    chart.config.data.datasets[1].backgroundColor = gradient;
                }

                const gradient2 = document.getElementById(chartId).getContext('2d').createLinearGradient(0, 0, 0, 120);
                gradient2.addColorStop(0, 'purple');
                gradient2.addColorStop(1 - 40 / 45, 'red');
                gradient2.addColorStop(1 - 35 / 45, 'orange');
                gradient2.addColorStop(1 - 30 / 45, 'yellow');
                gradient2.addColorStop(1, 'grey');
                chart.config.data.datasets[2].backgroundColor = gradient2;

                chart.options.annotation = {};  // TODO: potential bug with annotations where old 'value' of annotations are kept in graph
                chart.update();
                chart.options.annotation = { annotations: data.annotations };
                chart.update();
            } else {
                chart.options.scales.xAxes[0].ticks.max = 1;
                chart.config.data.datasets[0].data = [];
                chart.config.data.datasets[1].data = [];
                chart.config.data.datasets[2].data = [];
            }
        },

        replot: function () {
            const data = this._compute();

            data.annotations = [
                {
                    id: 'altmax',
                    type: 'line',
                    mode: 'horizontal',
                    scaleID: 'alt',
                    value: 0,
                    borderColor: 'rgba(12, 173, 98, 0.5)',
                    borderWidth: 1,
                    label: { enabled: true, position: 'left', backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: 'normal', yAdjust: 10 },
                }, {
                    id: 'altmin',
                    type: 'line',
                    mode: 'horizontal',
                    scaleID: 'alt',
                    value: 0,
                    borderColor: 'rgba(12, 173, 98, 0.5)',
                    borderWidth: 1,
                    label: { enabled: true, position: 'left', backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: 'normal', yAdjust: -10 },
                }, {
                    id: 'distance',
                    type: 'line',
                    mode: 'vertical',
                    scaleID: 'distance',
                    value: 0,
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                    borderWidth: 1,
                    label: { enabled: true, position: 'left', backgroundColor: 'rgba(0,0,0,0.4)', fontSize: 10, fontStyle: 'normal', xAdjust: -50 },
                },
            ].concat(data.annotations);

            if (isSmallScreen)
                this._replotSmallScreen(data);
            else
                this._replotWideScreen(data);

            if (data.size > 0)
                $dEmpty.slideUp();
            else
                $dEmpty.slideDown();
        },

        _initStats: function () {
            return {
                distance: 0,
                altMin: Number.MAX_VALUE,
                altMax: Number.MIN_VALUE,
                slopeMax: 0,
                slopeMin: 0,
                denivPos: 0,
                denivNeg: 0,
            };
        },

        _compute: function () {
            const _this = this;

            var annotations = [];
            var elevations = [];
            var total = this._initStats();
            var local = this._initStats();

            $.Track.eachMarker(function (i, marker) {
                if (marker.getType() == 'step') {
                    annotations.push({
                        id: 'distance-' + i,
                        type: 'line',
                        mode: 'vertical',
                        scaleID: 'distance',
                        value: total.distance,
                        borderColor: 'rgba(0, 0, 0, 0.5)',
                        borderWidth: 1,
                    });

                    var current = marker;
                    while (current && current.hasRouteToHere()) {
                        current.getRouteToHere().setPopupContentWith(current._previousMarker.getColorCode(), local);
                        current = current._previousMarker;
                        if (current.getType() == 'step')
                            break;
                    }

                    local = _this._initStats();
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
                var current = $.Track.getLastMarker();
                while (current && current.hasRouteToHere()) {
                    current.getRouteToHere().setPopupContentWith(current._previousMarker.getColorCode(), local);
                    current = current._previousMarker;
                    if (current.getType() == 'step')
                        break;
                }
            }

            return {
                size: elevations.length,
                elevations,
                total,
                annotations,
            };
        },
    };

})(jQuery);

(function ($) {
    var map;

    $.Route = {
        bindTo: function (map) {
            this.map = map;
        },

        find: function (start, end, index, mode = 'auto') {
            const _this = this;

            var deferred;

            if (mode == 'straight') {
                deferred = this._findStraight(start, end, index);
            } else {
                deferred = $.Deferred(function () {
                    const deferred = this;  // jscs:ignore safeContextKeyword

                    _this._findAuto(start, end, index)
                        .done(deferred.resolve)
                        .progress(deferred.notify)
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

                            _this._findStraight(start, end, index)
                                .done(deferred.resolve)
                                .fail(deferred.reject);
                        });
                });
            }

            return deferred;
        },

        _add: function (geojson, start, end, index, mode) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword

                geojson.prepareForMap(_this.map, start, end);
                geojson.computeStats().progress(deferred.notify).then(function () {
                    geojson.addTo(_this.map);
                    geojson.bindPopup('Calculs en cours...');
                    geojson.on('popupopen', function (event) {
                        const _this = this;

                        $('.marker-add-button:visible').click(function () {
                            if ($.State.getComputing()) // FIXME: Dirty hack to enable reset on markers (also, fixes flickering of data pane when importing)
                                return;

                            $.State.setComputing(true);
                            const marker = L.Marker.routed(event.popup.getLatLng().roundE8(), {
                                riseOnHover: true,
                                draggable: true,
                                opacity: 0.5,
                                color: start.getColorIndex(),
                                type: 'waypoint',
                            });

                            marker.insert(geojson).progress($.State.updateComputing)
                                .done(function () {
                                    marker.setOpacity(1);
                                    $.State.setComputing(false);
                                }).fail(function () {
                                    $.State.setComputing(false);
                                });
                        });
                    });

                    geojson.snakeIn();
                    start.setOpacity(1);
                    end.setOpacity(1);

                    deferred.resolveWith({ route: geojson });
                }).fail(function () {
                    deferred.rejectWith({ error: 'Impossible d\'obtenir les données de la route' });
                });
            });
        },

        _findAuto: function (start, end, index) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword

                const startLatLng = start.getLatLng();
                const endLatLng = end.getLatLng();

                const options = {
                    distanceUnit: 'm',
                    endPoint: {
                        x: endLatLng.lng,
                        y: endLatLng.lat,
                    },
                    exclusions: [],
                    geometryInInstructions: true,
                    graph: 'Pieton',
                    routePreferences: 'fastest',
                    startPoint: {
                        x: startLatLng.lng,
                        y: startLatLng.lat,
                    },
                    viaPoints: [],
                    apiKey: keyIgn,
                    onSuccess: function (results) {
                        if (results) {
                            const geojson = L.geoJSON([], {
                                color: start.getColorRgb(),
                                weight: 5,
                                opacity: 0.75,
                                snakingPause: 0,
                                snakingSpeed: 1000,
                            });

                            const _geometry = {
                                type: 'FeatureCollection',
                                features: [],
                            };
                            var counter = 1;
                            $.each(results.routeInstructions, function (idx, instructions) {
                                counter++;
                                _geometry.features.push({
                                    id: counter,
                                    type: 'Feature',
                                    geometry: instructions.geometry,
                                });
                            });

                            geojson.addData(_geometry);

                            _this._add(geojson, start, end, index, 'auto')
                                .progress(deferred.notify)
                                .done(deferred.resolve)
                                .fail(deferred.reject);

                            deferred.notify({ step: 'Route calculée' });
                        } else {
                            deferred.rejectWith({ error: 'Impossible d\'obtenir la route: pas de résultats fournis' });
                        }
                    },
                    onFailure: function (error) {    // seems to never be called
                        deferred.rejectWith({ error: 'Impossible d\'obtenir la route: ' + error.message });
                    },
                };
                deferred.notify({ start: true, total: 1, status: 'Calcul de la route...' });
                Gp.Services.route(options);
            });
        },

        _findStraight: function (start, end, index) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword

                deferred.notify({ start: true, total: 1, status: 'Calcul de la route...' });

                const c1 = start.getLatLng().roundE8();
                const c2 = end.getLatLng().roundE8();
                const d = c1.distanceTo(c2);
                const azimuth = c1.bearingTo(c2);

                const latlngs = [c1];

                const interval = 10;
                for (let counter = interval; counter < d; counter += interval) {
                    latlngs.push(c1.getDestinationAlong(azimuth, counter));
                }

                latlngs.push(c2);

                const geojson = L.polyline(latlngs, {
                    color: start.getColorRgb(),
                    weight: 5,
                    opacity: 0.75,
                    snakingPause: 0,
                    snakingSpeed: 1000,
                });

                _this._add(geojson, start, end, index, 'straight')
                    .progress(deferred.notify)
                    .done(deferred.resolve)
                    .fail(deferred.reject);

                deferred.notify({ step: 'Route calculée' });
            });
        },
    };

})(jQuery);


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

        isLoop: function () {
            return this.firstMarker && this.lastMarker && this.firstMarker.getLatLng().distanceTo(this.lastMarker.getLatLng()) < 10;
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

        moveMarker: function (marker) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword
                const promises = [];

                const mode = $.State.getMode() || marker.getRouteModeFromHere();

                if (marker.hasRouteFromHere()) {
                    // Re-compute route starting at this marker
                    const idx = promises.length;

                    promises.push(
                        marker.recomputeRouteFromHere($.State.getMode()).progress(deferred.notify)
                    );
                }

                if (marker.hasRouteToHere()) {
                    // Re-compute route ending at this marker
                    const idx = promises.length;

                    promises.push(
                        marker.recomputeRouteToHere($.State.getMode()).progress(deferred.notify)
                    );
                }

                $.when.apply($, promises).done(deferred.resolve).fail(deferred.fail);
            });
        },

        insertMarker: function (marker, route) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword
                const promises = [];

                const mode = $.State.getMode() || marker.getRouteModeFromHere();

                promises.push(
                    route.getStartMarker().computeRouteTo(marker, $.State.getMode()).progress(deferred.notify)
                );
                promises.push(
                    marker.computeRouteTo(route.getEndMarker(), $.State.getMode()).progress(deferred.notify)
                );

                _this.markersLength++;
                marker.addTo(_this.map);

                $.when.apply($, promises).done(deferred.resolve).fail(deferred.fail);
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

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword

                if (_this.routeFrom) {
                    _this.routeFrom.setStyle({ opacity: 0.5 });
                }

                $(_this).clearCompute();
                $(_this).startCompute(function (next) {
                    mode = mode || _this._mode || 'auto';

                    $.Route.find(_this, to, 0, mode)
                        .progress(deferred.notify)
                        .done(function () {
                            _this.deleteRouteFromHere();
                            _this.attachRouteFrom(to, this.route, mode);
                            deferred.resolve();
                        })
                        .fail(deferred.reject)
                        .always(() => $(_this).endCompute(next));
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
            const _this = this;

            this.bindPopup('<button class="marker-promote-button"><i class="fa fa-asterisk" aria-hidden="true"></i> Marquer comme étape</button> ' +
                '<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');

            this.on('popupopen', function () {

                $('.marker-delete-button:visible').click(function () {
                    if ($.State.getComputing()) // FIXME: Dirty hack to enable reset on markers (also, fixes flickering of data pane when importing)
                        return;

                    $.State.setComputing(true);
                    _this.remove().progress($.State.updateComputing).done(function () {
                        $.State.setComputing(false);
                    }).fail(function () {
                        $.State.setComputing(false);
                    });
                });

                $('.marker-promote-button:visible').click(function () {
                    $.State.setComputing(true);
                    _this.closePopup();

                    _this.setPopupContent('<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');
                    _this.promoteToStep();

                    $.State.setComputing(false);
                });
            });

            this.on('moveend', function (event) {
                // Update routes when moving this marker
                $.State.setComputing(true);
                _this.setOpacity(0.5);

                $.Track.moveMarker(_this)
                    .progress($.State.updateComputing)
                    .done(function () {
                        $.State.setComputing(false);
                        event.target.setOpacity(1);
                    }).fail(function () {
                        $.State.setComputing(false);
                    });
            });
        },

        add: function (computeRoute = true) {
            this._bindEvents();
            return $.Track.addMarker(this, computeRoute);
        },

        insert: function (route) {
            this._bindEvents();
            return $.Track.insertMarker(this, route);
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


const isSmallScreen = (window.innerWidth <= 800 && window.innerHeight <= 600);

$('<div>Observation des faucons crécerelle...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {$(this).remove();});

window.onload = function () {

    $('<div>Localisation des chamois...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {$(this).remove();});

    var map = L.map('map', {});
    map.initView().done(function () {

        $('<div>Suivi des renards roux...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {$(this).remove();});

        if (isSmallScreen) {
            $('#mobile-warning')
                .show()
                .find('button').click(function () { popup.hide(); });
        }

        // Central map
        $.Route.bindTo(map);
        $.Track.bindTo(map);
        $('body').on('map2gpx:modechange', function (e) {
            map.doubleClickZoom.setEnabled((e.mode === null));
        });

        // TODO: add support of localStorage for opacity&visiblity (#4)
        var layerPromises = [];
        var layerPhotos = L.geoportalLayer.WMTS({
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            apiKey: keyIgn,
        }).addTo(map);
        layerPromises.push($.Deferred(function () {
            layerPhotos.once('load', this.resolve);
        }));

        // Don't monitor load event, because we don't display this layer (thus, never fires)
        var layerSlopes =  L.geoportalLayer.WMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN',
            apiKey: keyIgn,
        }, {
            opacity: 0.25,
        }).addTo(map);

        var layerMaps = L.geoportalLayer.WMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
            apiKey: keyIgn,
        }, {
            opacity: 0.25,
        }).addTo(map);
        layerPromises.push($.Deferred(function () {
            layerMaps.once('load', this.resolve);
        }));

        // Add controls
        L.geoportalControl.SearchEngine({
            displayAdvancedSearch: false,
        }).addTo(map);

        // Mini-map
        if (!isSmallScreen) {
            let miniMapLayer = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                apiKey: keyIgn,
            });
            layerPromises.push($.Deferred(function () {
                miniMapLayer.once('load', this.resolve);
            }));

            let miniMap = new L.Control.MiniMap(miniMapLayer, {
                position: 'bottomleft',
                zoomLevelOffset: -4,
            }).addTo(map);
        }

        var layerSwitcher = L.geoportalControl.LayerSwitcher({
            collapsed: isSmallScreen,
        });
        map.addControl(layerSwitcher);
        layerSwitcher.setVisibility(layerSlopes, false);
        $('.GPlayerRemove').remove();

        if (!isSmallScreen) {
            map.addControl(L.control.scale({
                imperial: false,
                position: 'bottomright',
            }));
        }

        var automatedBtn = L.easyButton({
            id: 'btn-autotrace',
            states: [
                {
                    stateName: 'loaded',
                    icon: 'fa-map-signs',
                    title: 'Tracer automatiquement l\'itinéraire',
                    onClick: function (btn, map) {
                        $.State.setMode('auto');
                    },
                }, {
                    stateName: 'active',
                    icon: 'fa-map-signs',
                    title: 'Tracer automatiquement l\'itinéraire',
                    onClick: function (btn, map) {
                        $.State.setMode(null);
                    },
                },
            ],
        });
        $('body').on('map2gpx:modechange map2gpx:markerschange', function (e) {
            if (e.mode == 'auto') {
                automatedBtn.state('active');
                automatedBtn.enable();
            } else {
                automatedBtn.state('loaded');
                automatedBtn.setEnabled(!$.Track.isImport());
            }
        });

        var lineBtn = L.easyButton({
            id: 'btn-straighttrace',
            states: [
                {
                    stateName: 'loaded',
                    icon: 'fa-location-arrow',
                    title: 'Tracer l\'itinéraire en ligne droite',
                    onClick: function (btn, map) {
                        $.State.setMode('straight');
                    },
                }, {
                    stateName: 'active',
                    icon: 'fa-location-arrow',
                    title: 'Tracer l\'itinéraire en ligne droite',
                    onClick: function (btn, map) {
                        $.State.setMode(null);
                    },
                },
            ],
        });
        $('body').on('map2gpx:modechange map2gpx:markerschange', function (e) {
            if (e.mode == 'straight') {
                lineBtn.state('active');
                lineBtn.enable();
            } else {
                lineBtn.state('loaded');
                lineBtn.setEnabled(!$.Track.isImport());
            }
        });

        var closeLoop = L.easyButton({
            id: 'btn-closeloop',
            states: [
                {
                    stateName: 'loaded',
                    icon: 'fa-magic',
                    title: 'Fermer la boucle',
                    onClick: function (btn, map) {
                        if ($.Track.hasMarkers(1)) {
                            addMarker({ latlng: $.Track.getFirstMarker().getLatLng() });
                        }
                    },
                },
            ],
        });
        $('body').on('map2gpx:modechange map2gpx:computingchange map2gpx:markerschange', function (e) {
            closeLoop.setEnabled((e.mode !== null && $.Track.hasRoutes() && !$.Track.isImport() && !$.Track.isLoop()));
        });

        L.easyBar([automatedBtn, lineBtn, closeLoop]).addTo(map);

        var exportPopup = L.popup().setContent(L.DomUtil.get('form-export'));
        var exportButton = L.easyButton({
            id: 'btn-export',
            states: [
                {
                    stateName: 'loaded',
                    icon: 'fa-cloud-download',
                    title: 'Exporter',
                    onClick: function (btn, map) {
                        const bounds = $.Track.getBounds();

                        map.flyToBounds(bounds, { padding: [50, 50] });
                        exportPopup.setLatLng(bounds.getCenter()).openOn(map);

                        $('.export-gpx-button:visible').click(function () {
                            const $btn = $(this);
                            $btn.attr('disabled', 'disabled');
                            $.Track.exportGpx($('.export-filename:visible').val());
                            $btn.removeAttr('disabled');
                        });

                        $('.export-kml-button:visible').click(function () {
                            const $btn = $(this);
                            $btn.attr('disabled', 'disabled');
                            $.Track.exportKml($('.export-filename:visible').val());
                            $btn.removeAttr('disabled');
                        });
                    },
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Exporter (calcul en cours...)',
                },
            ],
        }).addTo(map);
        $('body').on('map2gpx:computingchange map2gpx:markerschange', function (e) {
            if (e.computing) {
                exportButton.state('computing');
                exportButton.disable();
            } else {
                exportButton.state('loaded');
                exportButton.setEnabled($.Track.hasRoutes());
            }
        });

        var importPopup = L.popup().setContent(L.DomUtil.get('form-import'));
        var importButton = L.easyButton({
            id: 'btn-import',
            states: [
                {
                    stateName: 'loaded',
                    icon: 'fa-cloud-upload',
                    title: 'Importer',
                    onClick: function (btn, map) {
                        importPopup.setLatLng(map.getCenter()).openOn(map);

                        if ($.Track.hasRoutes()) {
                            $('.import-gpx-status:visible').html('<strong>Attention:</strong> l\'import va effacer l\'itinéraire existant!');
                        } else {
                            $('.import-gpx-status:visible').text('');
                        }

                        $('.import-gpx-button:visible').click(function () {
                            const $btn = $(this);
                            const f = $('.import-gpx-file:visible')[0].files[0];

                            if (f == undefined) {
                                $('.import-gpx-status:visible').text('Veuillez sélectionner un fichier');
                                return;
                            }

                            $btn.attr('disabled', 'disabled');
                            $.State.setComputing(true);
                            $.State.updateComputing({ start: true, total: 1, status: 'Importation en cours...' });

                            const reader = new FileReader();

                            reader.onload = (function (theFile) {
                                return function (e) {

                                    const lines = [];
                                    const line = new L.GPX(e.target.result, {
                                        async: true,
                                        onFail: function () {
                                            console.log('Failed to retrieve track');
                                            $('.import-gpx-status:visible').text('Impossible de traiter ce fichier');
                                            $btn.removeAttr('disabled');
                                            $.State.setComputing(false);
                                        },
                                        onSuccess: function (gpx) {
                                            $.State.updateComputing([
                                                { step: 'Fichier traité' },
                                                { start: true, total: lines.length, status: 'Récupération des données géographiques en cours...' },
                                            ]);

                                            $.Track.clear();

                                            const bounds = gpx.getBounds();

                                            map.fitBounds(bounds, { padding: [50, 50] });
                                            importPopup.setLatLng(bounds.getCenter());
                                            gpx.addTo(map);

                                            var deleteTrack = function () {
                                                $('.track-delete-button:visible').click(function () {
                                                    $.State.setComputing(true);

                                                    $.Track.clear();
                                                    map.removeLayer(gpx);

                                                    $.State.setComputing(false);
                                                });
                                            };

                                            const promises = [];
                                            var startMarker;
                                            $.each(lines, function (idx, track) {
                                                // Add new route+markers

                                                if (idx == 0) {
                                                    const start = track.getLatLngs()[0];
                                                    startMarker = L.Marker.routed(start, {
                                                        draggable: false,
                                                        opacity: 0.5,
                                                        color: $.Track.getCurrentColor(),
                                                        type: 'waypoint',
                                                    });
                                                    $.Track.addMarker(startMarker, false);

                                                    startMarker.bindPopup('<button class="track-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer l\'import</button>');
                                                    startMarker.on('popupopen', deleteTrack);
                                                }

                                                const end = track.getLatLngs()[track.getLatLngs().length - 1];
                                                const marker = L.Marker.routed(end, {
                                                    draggable: false,
                                                    opacity: 0.5,
                                                    color: $.Track.nextColor(),
                                                    type: 'step',
                                                });
                                                $.Track.addMarker(marker, false);
                                                startMarker.attachRouteFrom(marker, track, 'import');

                                                track.setStyle({ weight: 5, color: startMarker.getColorRgb(), opacity: 0.5 });    // Use color of starting marker
                                                track.bindPopup('Calculs en cours...');
                                                track.on('popupopen', function (event) {
                                                    $('.marker-add-button:visible').remove();
                                                });

                                                marker.bindPopup('<button class="track-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer l\'import</button>');
                                                marker.on('popupopen', deleteTrack);

                                                promises.push(track.computeStats().progress($.State.updateComputing));

                                                startMarker = marker;
                                            });

                                            $.each(promises, function () {
                                                this.done(() => $.State.updateComputing({}));
                                            });

                                            $.when.apply($, promises).done(function () {
                                                $.Track.eachRoute(function (i, route) {
                                                    route.setStyle({ opacity: 0.75 });
                                                });

                                                $.Track.eachMarker(function (i, marker) {
                                                    marker.setOpacity(1);
                                                });

                                                $btn.removeAttr('disabled');
                                                importPopup.remove();

                                                $.State.triggerMarkersChanged();
                                                $.State.setMode(null);  // Disable any other tracing
                                                $.State.setComputing(false);
                                            }).fail(function () {
                                                console.log('Fail');
                                                $('.import-gpx-status:visible').text('Impossible de récupérer les données géographiques de ce parcours');
                                                $btn.removeAttr('disabled');
                                                $.State.setComputing(false);
                                            });
                                        },
                                    }).on('addline', function (e) { lines.push(e.line); });
                                };
                            })(f);

                            // Read in the image file as a data URL.
                            reader.readAsText(f);
                        });
                    },
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Importer (calcul en cours...)',
                },
            ],
        });
        var resetButton = L.easyButton({
            id: 'btn-reset',
            states: [
                {
                    stateName: 'loaded',
                    icon: 'fa-trash',
                    title: 'Effacer l\'itinéraire',
                    onClick: function (btn, map) {
                        $.Track.clear();
                        $.State.triggerMarkersChanged();
                        $.State.setComputing(false);
                    },
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Effacer l\'itinéraire (calcul en cours...)',
                },
            ],
        });

        L.easyBar([importButton, resetButton]).addTo(map);
        $('body').on('map2gpx:computingchange', function (e) {
            importButton.state(e.computing ? 'computing' : 'loaded');
            resetButton.state(e.computing ? 'computing' : 'loaded');

            importButton.setEnabled(!e.computing);
            resetButton.setEnabled(!e.computing);
        });

        if (!isSmallScreen) {
            const infoPopup = L.popup().setContent(L.DomUtil.get('about'));

            const infoBtn = L.easyButton({
                position: 'bottomright',
                states: [
                    {
                        icon: 'fa-info-circle',
                        onClick: function (btn, map) {
                            infoPopup.setLatLng(map.getCenter()).openOn(map);
                        },
                        title: 'A propos & crédits',
                    },
                ],
            });
            const helpBtn = L.easyButton({
                position: 'bottomright',
                states: [
                    {
                        icon: 'fa-question-circle',
                        onClick: function (btn, map) {
                            $.Shepherd.get(0).start(true);
                        },
                        title: 'Aide',
                    },
                ],
            });

            L.easyBar([infoBtn, helpBtn], { position: 'bottomright' }).addTo(map);
        }

        // Map interactions
        map.on('dblclick', addMarker);

        var outOfRangeDrop;
        map.on('zoomend', function () {
            let outOfRange;
            let $outOfRangeTarget;
            if ((layerPhotos.options.minZoom > map.getZoom() || layerPhotos.options.maxZoom < map.getZoom()) && map.hasLayer(layerPhotos)) {
                outOfRange = 'Photographies aériennes'; $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(2)');
            } else if ((layerMaps.options.minZoom > map.getZoom() || layerMaps.options.maxZoom < map.getZoom()) && map.hasLayer(layerMaps)) {
                outOfRange = 'Cartes IGN'; $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(0)');
            } else if ((layerSlopes.options.minZoom > map.getZoom() || layerSlopes.options.maxZoom < map.getZoom()) && map.hasLayer(layerSlopes)) {
                outOfRange = 'Carte des pentes'; $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(1)');
            }

            if (outOfRange !== undefined && outOfRangeDrop === undefined) {
                outOfRangeDrop = new Drop({
                    target: $outOfRangeTarget[0],
                    classes: 'drop-theme-arrows',
                    position: 'left middle',
                    constrainToWindow: false,
                    constrainToScrollParent: false,
                    openOn: null,
                    content: 'La couche &quot;' + outOfRange + '&quot; n\'est pas disponible à ce niveau de zoom',
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

        $('body').on('map2gpx:computingchange', function (e) {
            if (e.computing) {
                $.State.updateComputing({ start: true, total: 1, status: 'Calculs en cours...' });
                $('#data-computing').fadeIn();
            } else {
                $.State.updateComputing({ end: true, status: 'Finalisation...' });
                $.Chart.replot();
                $('#data-computing').fadeOut();
            }
        });

        function addMarker(e) {
            if ($.State.getMode() === null) {
                return;
            }

            const marker = L.Marker.routed(e.latlng.roundE8(), {
                riseOnHover: true,
                draggable: true,
                opacity: 0.5,
                color: ($.Track.hasMarkers()) ? $.Track.getLastMarker().getColorIndex() : $.Track.getCurrentColor(),
                type: 'waypoint',
            });

            marker.add().progress($.State.updateComputing).done(function () {
                marker.setOpacity(1);
            });

            if (!isSmallScreen) {
                if ($.Track.hasMarkers(2) && !$.Shepherd.has(1)) {
                    $.Shepherd.tour()
                        .add('data', {
                            text: $('#help-data')[0],
                            attachTo: { element: $('#data')[0], on: 'top' },
                        })
                        .add('closeloop', {
                            text: $('#help-closeloop')[0],
                            attachTo: { element: $('#btn-closeloop')[0], on: 'right' },
                        })
                        .add('export', {
                            text: $('#help-export')[0],
                            attachTo: { element: $('#btn-export')[0], on: 'right' },
                        })
                        .start();
                }

                if ($.Track.hasMarkers(3) && !$.Shepherd.has(2)) {
                    $.Shepherd.tour()
                        .add('movemarker', {
                            text: $('#help-movemarker')[0],
                            attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' },
                        })
                        .add('movemarker2', {
                            text: $('#help-movemarker2')[0],
                            attachTo: { element: $('.awesome-marker').eq(-2)[0], on: 'bottom' },
                        })
                        .add('steps', {
                            text: $('#help-steps')[0],
                            attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' },
                        })
                        .add('steps2', {
                            beforeShowPromise: function () {
                                return $.Deferred(function () {
                                    const route = $.Track.getFirstMarker().getRouteFromHere();
                                    const lngs = route.getLatLngs();
                                    const item = lngs[Math.floor(lngs.length / 2)];
                                    route.openPopup(item);
                                    this.resolve();
                                }).promise();
                            },
                            text: $('#help-steps2')[0],
                        })
                        .start();
                }
            }
        }

        $('<div>Alignement des satellites...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {$(this).remove();});

        $.Chart.init(map, 'chart', $('#data'), $('#data-empty'), isSmallScreen);

        $.State.setMode(null);
        $.State.triggerMarkersChanged();
        $.State.setComputing(false);

        if (!isSmallScreen) {
            $.Shepherd.tour()
                .add('welcome', {
                    text: $('#help-welcome')[0],
                })
                .add('layers', {
                    text: $('#help-layers')[0],
                    attachTo: { element: $('.GPlayerName').closest('.GPwidget')[0], on: 'left' },
                })
                .add('search', {
                    text: $('#help-search')[0],
                    attachTo: { element: $('.GPshowAdvancedToolOpen').closest('.GPwidget')[0], on: 'right' },
                })
                .add('autotrace', {
                    text: $('#help-autotrace')[0],
                    attachTo: { element: $('#btn-autotrace')[0], on: 'right' },
                })
                .add('straighttrace', {
                    text: $('#help-straighttrace')[0],
                    attachTo: { element: $('#btn-straighttrace')[0], on: 'right' },
                })
                .start();
        }

        $.when.apply($, layerPromises).done(function () {
            clearInterval(interval);
            $('#loading').fadeOut();
        });
    });
};
