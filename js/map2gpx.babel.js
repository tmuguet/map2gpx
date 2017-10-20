'use strict';

(function ($) {
    var hasLocalStorage = function storageAvailable(type) {
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
    }('localStorage');

    $.localStorage = {
        get: function get(item) {
            if (hasLocalStorage) return localStorage.getItem(item);else return null;
        },

        getAsJSON: function getAsJSON(item) {
            if (hasLocalStorage && localStorage.getItem(item) !== null) return JSON.parse(localStorage.getItem(item));else return null;
        },

        set: function set(item, value) {
            if (hasLocalStorage) localStorage.setItem(item, value);
        },

        setAsJSON: function setAsJSON(item, value) {
            this.set(item, JSON.stringify(value));
        }
    };
})(jQuery);

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
            var _this2 = this;

            var currentStep = _steps;

            var opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text'
            });

            opts.buttons = [{
                text: 'Fermer',
                classes: 'shepherd-button-secondary',
                action: function action() {
                    $.localStorage.set('tutorial' + tutorials.indexOf(_this2), -1);
                    _this2.cancel();
                }
            }, {
                text: 'Suivant',
                classes: 'shepherd-button-example-primary',
                action: function action() {
                    var currentShepherdIndex = tutorials.indexOf(_this2);

                    if (currentShepherdIndex < 0) console.log('Could not find current shepherd, something is probably wrong');

                    $.localStorage.set('tutorial' + currentShepherdIndex, currentStep + 1); // Restore next step

                    _this2.next();

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

        var start = function start() {
            var forceShow = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            var id = 0;

            if (!forceShow) {
                var currentShepherdIndex = tutorials.indexOf(this);
                if ($.localStorage.get('tutorial' + currentShepherdIndex) !== null) {
                    id = parseInt($.localStorage.get('tutorial' + currentShepherdIndex));
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
    var layerPoint = crs.latLngToPoint(this, zoom).floor();
    var tile = layerPoint.divideBy(tileSize).floor();
    var tileCorner = tile.multiplyBy(tileSize).subtract(pixelOrigin);
    var tilePixel = layerPoint.subtract(pixelOrigin).subtract(tileCorner);
    return { tile: tile, tilePixel: tilePixel };
};

// from https://gis.stackexchange.com/questions/157693/getting-all-vertex-lat-long-coordinates-every-1-meter-between-two-known-points
L.LatLng.prototype.getDestinationAlong = function (azimuth, distance) {
    var R = 6378137; // Radius of the Earth in m
    var brng = Math.radians(azimuth); // Bearing is degrees converted to radians.
    var lat1 = Math.radians(this.lat); //Current dd lat point converted to radians
    var lon1 = Math.radians(this.lng); //Current dd long point converted to radians
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng));
    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));

    //convert back to degrees
    lat2 = Math.degrees(lat2);
    lon2 = Math.degrees(lon2);
    return L.latLng(Math.roundE8(lat2), Math.roundE8(lon2));
};

L.LatLng.prototype.bearingTo = function (other) {
    var startLat = Math.radians(this.lat);
    var startLong = Math.radians(this.lng);
    var endLat = Math.radians(other.lat);
    var endLong = Math.radians(other.lng);
    var dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
    var dLong = endLong - startLong;
    if (Math.abs(dLong) > Math.PI) {
        if (dLong > 0.0) dLong = -(2.0 * Math.PI - dLong);else dLong = 2.0 * Math.PI + dLong;
    }

    return (Math.degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
};

L.Handler.include({
    setEnabled: function setEnabled(enabled) {
        if (enabled) this.enable();else this.disable();
    }
});

L.Control.EasyButton.include({
    setEnabled: function setEnabled(enabled) {
        if (enabled) this.enable();else this.disable();
    }
});

L.Polyline.include({
    getLatLngsFlatten: function getLatLngsFlatten() {
        var latlngs = this.getLatLngs();

        if (latlngs.length > 0 && Array.isArray(latlngs[0])) {
            var result = [];
            $.each(latlngs, function (j, array) {
                result = result.concat(array);
            });

            return result;
        } else {
            return latlngs;
        }
    }
});

L.polyline_findAuto = function (startLatLng, endLatLng) {
    return $.Deferred(function () {
        var deferred = this; // jscs:ignore safeContextKeyword

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
                    var latlngs = [];
                    $.each(results.routeInstructions, function (idx, instructions) {
                        $.each(instructions.geometry.coordinates, function (j, coords) {
                            latlngs.push(L.latLng(coords[1], coords[0]));
                        });
                    });

                    var geojson = L.polyline(latlngs);

                    deferred.resolveWith({ geojson: geojson });
                } else {
                    deferred.rejectWith({ error: 'Impossible d\'obtenir la route: pas de résultats fournis' });
                }
            },
            onFailure: function onFailure(error) {
                deferred.rejectWith({ error: 'Impossible d\'obtenir la route: ' + error.message });
            }
        };
        Gp.Services.route(options);
    });
};

L.polyline_findStraight = function (startLatLng, endLatLng) {
    var interval = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10;

    var c1 = startLatLng.roundE8();
    var c2 = endLatLng.roundE8();
    var d = c1.distanceTo(c2);
    var azimuth = c1.bearingTo(c2);

    var latlngs = [c1];

    for (var counter = interval; counter < d; counter += interval) {
        latlngs.push(c1.getDestinationAlong(azimuth, counter));
    }

    latlngs.push(c2);

    return L.polyline(latlngs);
};

L.Polyline.include({
    distanceTo: function distanceTo(o) {
        var xLatLng = this.getLatLngsFlatten();
        var yLatLng = o.getLatLngsFlatten();

        var distances = {};

        var sizeX = xLatLng.length;
        var sizeY = yLatLng.length;

        var supX = Number.MIN_VALUE;
        var supY = Number.MIN_VALUE;

        for (var x = 0; x < sizeX; x++) {
            var infY = Number.MAX_VALUE;
            for (var y = 0; y < sizeY; y++) {
                distances[x + '/' + y] = xLatLng[x].distanceTo(yLatLng[y]);
                if (distances[x + '/' + y] < infY) infY = distances[x + '/' + y];
            }

            if (infY > supX) supX = infY;
        }

        for (var _y2 = 0; _y2 < sizeY; _y2++) {
            var infX = Number.MAX_VALUE;
            for (var _x3 = 0; _x3 < sizeX; _x3++) {
                if (distances[_x3 + '/' + _y2] < infX) infX = distances[_x3 + '/' + _y2];
            }

            if (infX > supY) supY = infX;
        }

        return Math.max(supX, supY);
    }
});

var _interpolateTrackData = function _interpolateTrackData(deferred, coords, coordsLeft, depth) {

    if (coords.length > 500) {
        return $.Deferred(function () {
            var _this = this;
            var coords1 = coords.slice(0, 500);
            var coords2 = coords.slice(499);

            _interpolateTrackData(deferred, coords1, coords2.concat(coordsLeft.slice(1)), depth + 1).done(_this.resolve).fail(_this.reject);
        });
    }

    var l = new L.Polyline(coords);

    if (coords.length < 100) {
        var straight = L.polyline_findStraight(coords[0], coords[coords.length - 1]);

        if (coords.length <= 4 || l.distanceTo(straight) < 10) {
            deferred.notify({ line: straight, count: coords.length - 1 });
            return $.Deferred(function () {
                this.resolve({ line: straight, mode: 'straight', coordsLeft: coordsLeft });
            });
        }
    }

    return $.Deferred(function () {
        var _this = this;

        L.polyline_findAuto(coords[0], coords[coords.length - 1]).done(function () {
            var d = l.distanceTo(this.geojson);
            if (d < 10) {
                deferred.notify({ line: this.geojson, count: coords.length - 1 });
                _this.resolve({ line: this.geojson, mode: 'auto', coordsLeft: coordsLeft });
            } else {
                var coords1 = coords.slice(0, Math.floor(coords.length / 2) + 1);
                var coords2 = coords.slice(Math.floor(coords.length / 2));

                _interpolateTrackData(deferred, coords1, coords2.concat(coordsLeft.slice(1)), depth + 1).done(_this.resolve).fail(_this.reject);
            }
        }).fail(function () {
            var coords1 = coords.slice(0, Math.floor(coords.length / 2) + 1);
            var coords2 = coords.slice(Math.floor(coords.length / 2));

            _interpolateTrackData(deferred, coords1, coords2.concat(coordsLeft.slice(1)), depth + 1).done(_this.resolve).fail(_this.reject);
        });
    });
};

L.polyline_interpolate = function (coords) {
    return $.Deferred(function () {

        var _this = this;
        var lines = [];

        var onDone = function onDone(line) {
            lines.push(line);

            if (line.coordsLeft.length > 0) {
                _interpolateTrackData(_this, line.coordsLeft, [], 0).done(onDone).fail(_this.reject);
            } else {
                _this.resolve(lines);
            }
        };

        _interpolateTrackData(this, coords, [], 0).done(onDone).fail(this.reject);
    });
};

(function ($) {
    var queues = 0;
    var listeners = [];

    $.fn.clearCompute = function () {
        return this.each(function () {
            queues -= $(this).queue().length;
            $(this).clearQueue();
            $.Queue.stop();
        });
    };

    $.fn.startCompute = function (cb) {
        return this.each(function () {
            $.Queue.start();
            queues++;
            $(this).queue(cb);
        });
    };

    $.fn.endCompute = function (next) {
        return this.each(function () {
            queues--;
            next();
            $.Queue.stop();
        });
    };

    $.Queue = {
        size: function size() {
            return queues;
        },
        bindTo: function bindTo(o) {
            return listeners.push(o);
        },

        start: function start() {
            if (queues == 0) {
                $.each(listeners, function () {
                    this.progress('start');
                });
            }
        },

        stop: function stop() {
            if (queues == 0) {
                $.each(listeners, function () {
                    this.progress('stop');
                });
            }
        },

        notify: function notify(progress) {
            $.each(listeners, function () {
                this.progress('update', progress);
            });
        }
    };
})(jQuery);

(function ($) {
    $.widget('map2gpx.progress', {
        options: {
            progress: 0,
            total: 0,
            started: false
        },

        _create: function _create() {
            this.element.append('<h2><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br/>' + '<strong><span class="data-computing-progress"></span> <small>- <span class="data-computing-status">Calculs en cours...</span></small></strong>' + '<div class="data-computing-progressbar-container"><div class="data-computing-progressbar"></div></div></h2>');

            this.$h2 = this.element.find('h2');
            this.$progress = this.element.find('.data-computing-progress');
            this.$progressbar = this.element.find('.data-computing-progressbar');
            this.$status = this.element.find('.data-computing-status');

            if (this.options.started) this.start();
        },

        _buildEventData: function _buildEventData() {
            return { started: this.options.started };
        },

        start: function start() {
            if (!this.options.started) {
                // Reset
                this.options.progress = 0;
                this.options.total = 0;
            }

            this.options.started = true;
            this.update({ start: true, total: 1, status: 'Calculs en cours...' });

            this._trigger('statechanged', null, this._buildEventData());
            this._trigger('started', null, {});
        },

        stop: function stop() {
            this.options.started = false;
            this.update({ end: true, status: 'Finalisation...' });

            this._trigger('statechanged', null, this._buildEventData());
            this._trigger('stopped', null, {});
        },

        started: function started(_started) {
            if (_started === undefined) {
                return this.options.started;
            }

            if (_started) this.start();else this.stop();
        },

        update: function update(progress) {
            if (Array.isArray(progress)) {
                var _this = this;
                $.each(progress, function () {
                    _this._update(this);
                });
            } else {
                this._update(progress);
            }

            this._display();
        },

        _update: function _update(progress) {
            if (progress.start) {
                this.options.total += progress.total;
            } else if (progress.end) {
                this.options.progress = this.options.total;
            } else if (progress.count) {
                this.options.progress += progress.count;
            } else {
                this.options.progress++;
            }

            if ('status' in progress && progress.status) this.$status.text(progress.status);
            if ('step' in progress && progress.step) $('<div><small>' + progress.step + '</small></div>').insertAfter(this.$h2).fadeOut(400, function () {
                $(this).remove();
            });
        },

        _display: function _display() {
            var p = 1;
            if (this.options.total > 0) p = this.options.progress / this.options.total;

            this.$progress.text(Math.round(p * 100) + '%');
            this.$progressbar.css('width', Math.round(p * 100) + '%');

            if (Math.round(p * 100) == 42) $('<div><small>La grande question sur la vie, l\'univers et le reste répondue</small></div>').insertAfter(this.$h2).fadeOut(400, function () {
                $(this).remove();
            });
        }
    });
})(jQuery);

(function ($) {
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
})(jQuery);

L.Map.include({
    _bindViewEvents: function _bindViewEvents() {
        this.on('zoomend', function () {
            console.log('Zoomed to ', this.getZoom());
            $.localStorage.set('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
        });

        this.on('moveend', function () {
            console.log('Moved to ', this.getCenter());
            $.localStorage.setAsJSON('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
        });
    },

    _setView: function _setView(view) {
        this.setView([view[0], view[1]], view[2]);
    },

    initView: function initView() {
        var _this = this;
        return $.Deferred(function () {
            var deferred = this; // jscs:ignore safeContextKeyword

            var view = $.localStorage.getAsJSON('view') || [44.96777356135154, 6.06822967529297, 13]; // Center in les Ecrins because I love this place

            if (view[2] > 17) view[2] = 17;

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
                            _this._setView([results.suggestedLocations[0].position.y, results.suggestedLocations[0].position.x, 15]);
                            deferred.resolveWith(_this);
                        } else {
                            console.log('No results?');
                            _this._setView(view); // Use default view
                            deferred.resolveWith(_this);
                        }
                    },
                    onFailure: function onFailure(error) {
                        // Error, or no match
                        console.log(error);
                        _this._setView(view); // Use default view
                        deferred.resolveWith(_this);
                    }
                };
                Gp.Services.autoComplete(options);
            } else {
                _this._setView(view);
                deferred.resolveWith(_this);
            }
        }).done(this._bindViewEvents); // Bind events when we're done, so we don't store parameters from query string
    }
});

function fetchAltitude(geometry) {
    return $.Deferred(function () {
        var _this3 = this;

        var options = {
            apiKey: keyIgn,
            sampling: geometry.length,
            positions: geometry,
            onSuccess: function onSuccess(result) {
                if (result) {
                    $.each(result.elevations, function (i, val) {
                        $.Cache.addAltitude(val.lat, val.lon, val.z);
                    });

                    _this3.resolveWith({ size: result.elevations.length });
                } else {
                    console.log('Impossible d\'obtenir les données d\'altitude: résultats invalides');
                    _this3.reject();
                }
            },
            /** callback onFailure */
            onFailure: function onFailure(error) {
                console.log('Impossible d\'obtenir les données d\'altitude: ', error.message);
                _this3.reject();
            }
        };

        // Request altitude service
        Gp.Services.getAltitude(options);
    });
}

function fetchSlope(tilex, tiley, coords) {
    return $.Deferred(function () {
        var _this4 = this;

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

                _this4.resolveWith({ size: r.results.length });
            } else {
                console.log('Impossible d\'obtenir les données de pente: résultats invalides');
                _this4.reject();
            }
        }).fail(function (jqxhr, textStatus, error) {
            console.log('Impossible d\'obtenir les données de pente: ', textStatus, error);
            _this4.reject();
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

    prepareForMap: function prepareForMap(map, start, end) {
        this._mapToAdd = map;
        this._start = start;
        this._end = end;
    },

    getStartMarker: function getStartMarker() {
        return this._start;
    },
    getEndMarker: function getEndMarker() {
        return this._end;
    },

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
    getDenivPos: function getDenivPos() {
        return this._denivPos;
    },
    getDenivNeg: function getDenivNeg() {
        return this._denivNeg;
    },

    computeStats: function computeStats() {
        var _this = this;
        return $.Deferred(function () {
            var deferred = this; // jscs:ignore safeContextKeyword
            var promises = _this._fetchAltitude().concat(_this._fetchSlope());
            var total = promises.length;

            deferred.notify({ start: true, total: total, status: 'Récupération des données géographiques...' });

            $.each(promises, function () {
                this.done(function () {
                    deferred.notify({ step: this.size + ' points récupérés' });
                });
            });

            $.when.apply($, promises).fail(deferred.reject).then(function () {
                _this._computeStats();
                deferred.resolve();
            });
        });
    },

    _computeStats: function _computeStats() {
        var elevations = [];

        $.each(this.getLatLngsFlatten(), function (j, coords) {
            var values = $.extend({}, { lat: coords.lat, lng: coords.lng }, $.Cache.getInfos(coords));
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

        var j = 0;
        for (var i = 1; i < elevations.length; i++) {
            var localDistance = L.latLng(elevations[i]).distanceTo(L.latLng(this._elevations[j])); // m
            if (localDistance > 0) {

                this._distance += localDistance / 1000; // km

                j++;
                this._elevations[j] = elevations[i];
                this._elevations[j].dist = this._distance;
                this._elevations[j].slopeOnTrack = Math.degrees(Math.atan((Math.round(this._elevations[j].z) - Math.round(this._elevations[j - 1].z)) / localDistance));

                if (this._elevations[j].z < this._altMin) this._altMin = this._elevations[j].z;
                if (this._elevations[j].z > this._altMax) this._altMax = this._elevations[j].z;

                if (this._elevations[j].z < this._elevations[j - 1].z) this._denivNeg += Math.round(this._elevations[j - 1].z - this._elevations[j].z);else this._denivPos += Math.round(this._elevations[j].z - this._elevations[j - 1].z);
            }
        }

        return true;
    },

    _fetchAltitude: function _fetchAltitude() {
        var geometry = []; // Batch
        var promises = [];

        $.each(this.getLatLngsFlatten(), function (j, coords) {
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
        var map = this._map || this._mapToAdd;

        $.each(this.getLatLngsFlatten(), function (j, coords) {
            if (!$.Cache.hasSlope(coords)) {
                // Skip already cached values
                var _coords$toTilePixel = coords.toTilePixel(map.options.crs, 16, 256, map.getPixelOrigin()),
                    tile = _coords$toTilePixel.tile,
                    tilePixel = _coords$toTilePixel.tilePixel;

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
    },

    setPopupContentWith: function setPopupContentWith(color, stats) {
        var hasInsertMaker = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

        this.setPopupContent('<ul class="legend ' + color + '">' + '<li>Altitude max: ' + Math.round(stats.altMax) + 'm</li>' + '<li>D+: ' + Math.round(stats.denivPos) + 'm</li>' + '<li>Altitude min: ' + Math.round(stats.altMin) + 'm</li>' + '<li>D-: ' + Math.round(stats.denivNeg) + 'm</li>' + '<li>Distance: ' + Math.round(stats.distance * 100) / 100 + 'km</li></ul>' + (hasInsertMaker ? '<button class="marker-add-button"><i class="fa fa-plus" aria-hidden="true"></i> Ajouter un marqueur ici</button>' : ''));
    }
});

(function ($) {

    $.widget('map2gpx.chart', {
        options: {
            map: undefined,
            dataEmpty: '#data-empty',
            isSmallScreen: false,

            showMarker: true,
            plotMarkerOptions: {
                icon: L.AwesomeMarkers.icon({
                    icon: 'area-chart',
                    markerColor: 'cadetblue',
                    prefix: 'fa'
                }),
                draggable: false,
                clickable: false,
                zIndexOffset: 1000
            },

            showSlope: true,
            showTerrainSlope: true
        },

        _create: function _create() {
            var _this5 = this;

            if (this.options.map === undefined) throw '"map" option cannot be undefined';

            this.$emptyElement = $(this.options.dataEmpty);

            if (!this.options.isSmallScreen) {
                this.$chart = $('<canvas width="100%" height="100%"></canvas>').appendTo(this.element);

                var datasets = [{
                    label: 'Altitude',
                    data: [],
                    fill: false,
                    borderColor: 'rgba(12, 98, 173, 0.8)',
                    backgroundColor: 'rgba(12, 98, 173, 0.8)',
                    lineTension: 0,
                    pointRadius: 0,
                    yAxisId: 'alt'
                }];
                var yAxes = [{
                    id: 'alt',
                    type: 'linear',
                    position: 'left',
                    beginAtZero: false
                }];

                if (this.options.showSlope) {
                    this.slopeIdx = datasets.length;
                    datasets.push({
                        label: 'Pente de l\'itinéraire',
                        data: [],
                        fill: true,
                        pointRadius: 0,
                        yAxisID: 'slope'
                    });
                    yAxes.push({
                        id: 'slope',
                        type: 'linear',
                        position: 'right'
                    });
                }

                if (this.options.showTerrainSlope) {
                    this.slopeTerrainIdx = datasets.length;
                    datasets.push({
                        label: 'Pente du terrain',
                        data: [],
                        fill: true,
                        pointRadius: 0,
                        yAxisID: 'slope2',
                        hidden: true
                    });
                    yAxes.push({
                        id: 'slope2',
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            min: 0,
                            max: 45
                        }
                    });
                }

                var hover = {};
                if (this.options.showMarker) {
                    hover = {
                        mode: 'index',
                        intersect: false,
                        onHover: function onHover(event, active) {
                            return _this5._onHover(event, active);
                        }
                    };
                }

                this.chartjs = new Chart(this.$chart, {
                    type: 'line',
                    data: {
                        datasets: datasets
                    },
                    options: {
                        maintainAspectRatio: false,
                        onClick: function onClick(event, active) {
                            return _this5._onClick(event, active);
                        },
                        hover: hover,
                        scales: {
                            xAxes: [{
                                id: 'distance',
                                type: 'linear',
                                position: 'bottom',
                                ticks: {
                                    min: 0
                                }
                            }],
                            yAxes: yAxes
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
            }
        },

        _onClick: function _onClick(event, active) {
            if (active && active.length > 0) {
                var idx = active[0]._index;
                var item = this.chartjs.config.data.datasets[0].data[idx];

                if (item.route) {
                    item.route.openPopup(L.latLng(item.lat, item.lng));
                }
            }
        },

        _onHover: function _onHover(event, active) {
            if (event.type == 'mousemove') {
                if (active && active.length > 0) {
                    var idx = active[0]._index;
                    var item = this.chartjs.config.data.datasets[0].data[idx];

                    if (this.plotMarker == null) {
                        this.plotMarker = L.marker(L.latLng(item.lat, item.lng), this.options.plotMarkerOptions);
                        this.plotMarker.addTo(this.options.map);
                    } else {
                        this.plotMarker.setLatLng(L.latLng(item.lat, item.lng));
                        this.plotMarker.update();
                    }
                } else {
                    if (this.plotMarker) {
                        this.options.map.removeLayer(this.plotMarker);
                        this.plotMarker = null;
                    }
                }
            } else if (event.type == 'mouseout') {
                if (this.plotMarker) {
                    this.options.map.removeLayer(this.plotMarker);
                    this.plotMarker = null;
                }
            }
        },

        _replotSmallScreen: function _replotSmallScreen(data) {
            if (data.size > 0) {
                this.element.html('<ul>' + '<li>Altitude max: ' + Math.round(data.total.altMax) + 'm; D+: ' + Math.round(data.total.denivPos) + 'm</li>' + '<li>Altitude min: ' + Math.round(data.total.altMin) + 'm; D-: ' + Math.round(data.total.denivNeg) + 'm</li>' + '<li>Distance: ' + Math.round(data.elevations[data.size - 1].dist * 100) / 100 + 'km</li></ul>');
            } else {
                this.element.empty();
            }
        },

        _replotWideScreen: function _replotWideScreen(data) {
            if (data.size > 0) {
                var series1 = [];
                var series2 = [];
                var series3 = [];

                var maxSlope = 0;
                var minSlope = 0;

                for (var j = 0; j < data.size; j++) {
                    series1.push({ x: data.elevations[j].dist, y: data.elevations[j].z, lat: data.elevations[j].lat, lng: data.elevations[j].lng, route: data.elevations[j].route });

                    if (this.options.showSlope) {
                        var correctedSlopeOnTrack = void 0;
                        if (j > 3 && j < data.size - 4) {
                            correctedSlopeOnTrack = (data.elevations[j - 3].slopeOnTrack + 2 * data.elevations[j - 2].slopeOnTrack + 4 * data.elevations[j - 1].slopeOnTrack + 8 * data.elevations[j].slopeOnTrack + 4 * data.elevations[j + 1].slopeOnTrack + 2 * data.elevations[j + 2].slopeOnTrack + data.elevations[j + 3].slopeOnTrack) / 22;
                        } else {
                            correctedSlopeOnTrack = data.elevations[j].slopeOnTrack;
                        }

                        if (correctedSlopeOnTrack > maxSlope) maxSlope = correctedSlopeOnTrack;
                        if (correctedSlopeOnTrack < minSlope) minSlope = correctedSlopeOnTrack;

                        series2.push({ x: data.elevations[j].dist, y: correctedSlopeOnTrack });
                    }

                    if (this.options.showTerrainSlope) {
                        series3.push({ x: data.elevations[j].dist, y: data.elevations[j].slope });
                    }
                }

                var lastIndex = data.size - 1;

                this.chartjs.options.scales.xAxes[0].ticks.max = series1[lastIndex].x;
                this.chartjs.config.data.datasets[0].data = series1;
                data.annotations[0].value = data.total.altMax;
                data.annotations[0].label.content = 'Altitude max: ' + Math.round(data.total.altMax) + 'm; D+: ' + Math.round(data.total.denivPos) + 'm';
                data.annotations[1].value = data.total.altMin;
                data.annotations[1].label.content = 'Altitude min: ' + Math.round(data.total.altMin) + 'm; D-: ' + Math.round(data.total.denivNeg) + 'm';
                data.annotations[2].value = series1[lastIndex].x;
                data.annotations[2].label.content = 'Distance: ' + Math.round(series1[lastIndex].x * 100) / 100 + 'km';

                if (this.options.showSlope) {
                    this.chartjs.config.data.datasets[this.slopeIdx].data = series2;

                    var gradient = this.$chart[0].getContext('2d').createLinearGradient(0, 0, 0, 120);
                    maxSlope = Math.ceil(maxSlope / 10) * 10;
                    minSlope = Math.floor(minSlope / 10) * 10;

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

                        this.chartjs.config.data.datasets[this.slopeIdx].backgroundColor = gradient;
                    }
                }

                if (this.options.showTerrainSlope) {
                    this.chartjs.config.data.datasets[this.slopeTerrainIdx].data = series3;

                    var gradient2 = this.$chart[0].getContext('2d').createLinearGradient(0, 0, 0, 120);
                    gradient2.addColorStop(0, 'purple');
                    gradient2.addColorStop(1 - 40 / 45, 'red');
                    gradient2.addColorStop(1 - 35 / 45, 'orange');
                    gradient2.addColorStop(1 - 30 / 45, 'yellow');
                    gradient2.addColorStop(1, 'grey');

                    this.chartjs.config.data.datasets[this.slopeTerrainIdx].backgroundColor = gradient2;
                }

                this.chartjs.options.annotation = {}; // TODO: potential bug with annotations where old 'value' of annotations are kept in graph
                this.chartjs.update();
                this.chartjs.options.annotation = { annotations: data.annotations };
                this.chartjs.update();
            } else {
                this.chartjs.options.scales.xAxes[0].ticks.max = 1;
                for (var i = 0; i < this.chartjs.config.data.datasets.length; i++) {
                    this.chartjs.config.data.datasets[i].data = [];
                }
            }
        },

        replot: function replot(data) {
            data.annotations = [{
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

            $.each(data.steps, function (i, value) {
                return data.annotations.push({
                    id: 'distance-' + i,
                    type: 'line',
                    mode: 'vertical',
                    scaleID: 'distance',
                    value: value,
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                    borderWidth: 1
                });
            });

            if (isSmallScreen) this._replotSmallScreen(data);else this._replotWideScreen(data);

            if (data.size > 0) this.$emptyElement.slideUp();else this.$emptyElement.slideDown();
        }
    });
})(jQuery);

(function ($) {

    var colorMap = { red: '#D63E2A', orange: '#F59630', green: '#72B026', blue: '#38AADD', purple: '#D252B9',
        darkred: '#A23336', darkblue: '#0067A3', darkgreen: '#728224', darkpurple: '#5B396B', cadetblue: '#436978',
        lightred: '#FF8E7F', beige: '#FFCB92', lightgreen: '#BBF970', lightblue: '#8ADAFF', pink: '#FF91EA',
        white: '#FBFBFB', lightgray: '#A3A3A3', gray: '#575757', black: '#303030' };
    var colors = ['blue', 'green', 'orange', 'purple', 'red', 'darkblue', 'darkpurple', 'lightblue', 'lightgreen', 'beige', 'pink', 'lightred'];

    function findRoute(map, start, end, index) {
        var mode = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'auto';

        return $.Deferred(function () {
            var deferred = this; // jscs:ignore safeContextKeyword

            if (mode == 'straight') {
                // Use a deferred instead of returning it so we don't miss notifications
                _findRouteStraight(map, start, end, index).progress(deferred.notify).done(deferred.resolve).fail(deferred.reject);
            } else {
                _findRouteAuto(map, start, end, index).progress(deferred.notify).done(deferred.resolve).fail(function () {
                    console.log(this.error);
                    console.log('Trying straight line...');

                    var autoFailDrop = new Drop({
                        target: $('.awesome-marker').eq(index + 1)[0],
                        classes: 'drop-theme-arrows',
                        position: 'right middle',
                        constrainToWindow: false,
                        constrainToScrollParent: false,
                        openOn: null,
                        content: 'Impossible d\'obtenir le tracé en mode automatique. Le mode ligne droite va être utilisé.'
                    });
                    autoFailDrop.open();
                    $(autoFailDrop.content).on('click', function () {
                        autoFailDrop.destroy();
                    });

                    _findRouteStraight(map, start, end, index).progress(deferred.notify).done(deferred.resolve).fail(deferred.reject);
                });
            }
        });
    }

    function _addRoute(map, geojson, start, end, index, mode) {
        return $.Deferred(function () {
            var deferred = this; // jscs:ignore safeContextKeyword

            geojson.prepareForMap(map, start, end);
            geojson.computeStats().progress(deferred.notify).then(function () {
                geojson.addTo(map);
                geojson.bindPopup('Calculs en cours...');
                geojson.on('popupopen', function (event) {
                    $('.marker-add-button:visible').click(function () {
                        var marker = L.Marker.routed(event.popup.getLatLng().roundE8(), {
                            riseOnHover: true,
                            draggable: true,
                            opacity: 0.5,
                            color: start.getColorIndex(),
                            type: 'waypoint'
                        });

                        marker.insert(geojson).done(function () {
                            marker.setOpacity(1);
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
    }

    function _findRouteAuto(map, start, end, index) {
        return $.Deferred(function () {
            var deferred = this; // jscs:ignore safeContextKeyword

            deferred.notify({ start: true, total: 1, status: 'Calcul de la route...' });
            L.polyline_findAuto(start.getLatLng(), end.getLatLng()).done(function () {
                deferred.notify({ step: 'Route calculée' });

                this.geojson.setStyle({
                    color: start.getColorRgb(),
                    weight: 5,
                    opacity: 0.75,
                    snakingPause: 0,
                    snakingSpeed: 1000
                });

                _addRoute(map, this.geojson, start, end, index, 'auto').progress(deferred.notify).done(deferred.resolve).fail(deferred.reject);
            }).fail(deferred.reject);
        });
    }

    function _findRouteStraight(map, start, end, index) {
        var geojson = L.polyline_findStraight(start.getLatLng(), end.getLatLng());
        geojson.setStyle({
            color: start.getColorRgb(),
            weight: 5,
            opacity: 0.75,
            snakingPause: 0,
            snakingSpeed: 1000
        });

        return _addRoute(map, geojson, start, end, index, 'straight');
    }

    L.Track = L.Evented.extend({
        options: {
            map: undefined
        },

        initialize: function initialize(options) {
            L.setOptions(this, options);
            this.Lmap = this.options.map.map('getMap');
            this.$map = this.options.map;

            this.currentColor = 0;
            this.markersLength = 0;
        },

        getCurrentColor: function getCurrentColor() {
            return this.currentColor;
        },

        nextColor: function nextColor() {
            this.currentColor = (this.currentColor + 1) % colors.length;
            return this.currentColor;
        },

        lengthOfMarkers: function lengthOfMarkers() {
            return this.markersLength;
        },

        hasMarkers: function hasMarkers() {
            var size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

            return this.markersLength >= size;
        },

        hasRoutes: function hasRoutes() {
            var size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

            return this.markersLength - 1 >= size;
        },

        isImport: function isImport() {
            return this.hasRoutes() && this.getFirstMarker().getRouteModeFromHere() == 'import';
        },

        getBounds: function getBounds() {
            var bounds = L.latLngBounds(this.getFirstMarker(0).getLatLng(), this.getLastMarker().getLatLng());
            this.eachRoute(function (i, route) {
                bounds.extend(route.getBounds());
            });

            return bounds;
        },

        getFirstMarker: function getFirstMarker() {
            return this.firstMarker;
        },

        getLastMarker: function getLastMarker() {
            return this.lastMarker;
        },

        isLoop: function isLoop() {
            return !!this.firstMarker && !!this.lastMarker && this.firstMarker.getLatLng().distanceTo(this.lastMarker.getLatLng()) < 10;
        },

        clear: function clear() {
            this.eachMarker(function (i, marker) {
                marker.remove(false);
            });
            this.fire('markerschanged');
        },

        eachMarker: function eachMarker(callback) {
            var current = this.firstMarker;
            var i = 0;
            while (current) {
                var next = current._nextMarker;
                callback.call(current, i, current);

                current = next;
                i++;
            }
        },

        eachRoute: function eachRoute(callback) {
            var next = this.firstMarker;
            var i = 0;
            while (next) {
                var route = next.getRouteFromHere();
                if (route) {
                    callback.call(route, i, route);
                    i++;
                }

                next = next._nextMarker;
            }
        },

        addMarker: function addMarker(marker) {
            var _this6 = this;

            var computeRoute = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            var _this = this;

            var promise;

            if (this.firstMarker === undefined) this.firstMarker = marker;

            if (this.lastMarker !== undefined) {
                if (computeRoute) promise = this.lastMarker.computeRouteTo(marker, this.$map.map('getMode'));
            }

            this.lastMarker = marker;
            this.markersLength++;
            marker.track = this;
            marker.addTo(this.Lmap);

            if (promise) return promise.done(function () {
                return _this6.fire('markerschanged');
            });else return $.Deferred(function () {
                _this.fire('markerschanged');
                this.resolve();
            });
        },

        moveMarker: function moveMarker(marker) {
            var _this = this;

            return $.Deferred(function () {
                var deferred = this; // jscs:ignore safeContextKeyword
                var promises = [];

                if (marker.hasRouteFromHere()) {
                    // Re-compute route starting at this marker
                    var idx = promises.length;

                    promises.push(marker.recomputeRouteFromHere(_this.$map.map('getMode')));
                }

                if (marker.hasRouteToHere()) {
                    // Re-compute route ending at this marker
                    var _idx = promises.length;

                    promises.push(marker.recomputeRouteToHere(_this.$map.map('getMode')));
                }

                $.when.apply($, promises).done(function () {
                    _this.fire('markerschanged');
                    deferred.resolve();
                }).fail(deferred.fail);
            });
        },

        insertMarker: function insertMarker(marker, route) {
            var _this = this;

            return $.Deferred(function () {
                var deferred = this; // jscs:ignore safeContextKeyword
                var promises = [];

                promises.push(route.getStartMarker().computeRouteTo(marker, _this.$map.map('getMode')));
                promises.push(marker.computeRouteTo(route.getEndMarker(), _this.$map.map('getMode')));

                _this.markersLength++;
                marker.addTo(_this.Lmap);

                $.when.apply($, promises).done(function () {
                    _this.fire('markerschanged');
                    deferred.resolve();
                }).fail(deferred.fail);
            });
        },

        _initStats: function _initStats() {
            return {
                distance: 0,
                altMin: Number.MAX_VALUE,
                altMax: Number.MIN_VALUE,
                denivPos: 0,
                denivNeg: 0
            };
        },

        computeStats: function computeStats() {
            var _this7 = this;

            var steps = [];
            var elevations = [];
            var total = this._initStats();
            var local = this._initStats();

            this.eachMarker(function (i, marker) {
                if (marker.getType() == 'step') {
                    steps.push(total.distance);

                    var current = marker;
                    while (current && current.hasRouteToHere()) {
                        current.getRouteToHere().setPopupContentWith(current._previousMarker.getColorCode(), local, current._previousMarker.getRouteModeFromHere() != 'import');
                        current = current._previousMarker;
                        if (current.getType() == 'step') break;
                    }

                    local = _this7._initStats();
                }

                var route = marker.getRouteFromHere();
                var e = route ? route.getElevations() : [];
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
                    if (current.getType() == 'step') break;
                }
            }

            return {
                size: elevations.length,
                elevations: elevations,
                total: total,
                steps: steps
            };
        },

        exportGpx: function exportGpx(filename) {
            var isFileSaverSupported = false;
            try {
                isFileSaverSupported = !!new Blob();
            } catch (e) {}
            if (!isFileSaverSupported) {
                /* can't check this until Blob polyfill loads above */
                return false;
            }

            var xml = '<?xml version="1.0"?>\n';
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

                    $.each(marker.getRouteFromHere().getLatLngsFlatten(), function (j, coords) {
                        xml += '            <trkpt lat="' + coords.lat + '" lon="' + coords.lng + '">';
                        if ($.Cache.hasAltitude(coords)) xml += '<ele>' + $.Cache.getAltitude(coords) + '</ele>';
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

        exportKml: function exportKml(filename) {
            var isFileSaverSupported = false;
            try {
                isFileSaverSupported = !!new Blob();
            } catch (e) {}
            if (!isFileSaverSupported) {
                /* can't check this until Blob polyfill loads above */
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

                    $.each(marker.getRouteFromHere().getLatLngsFlatten(), function (j, coords) {
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

        importGpx: function importGpx(file, interpolate) {
            var _this = this;

            return $.Deferred(function () {
                var deferred = this; // jscs:ignore safeContextKeyword
                var reader = new FileReader();

                reader.onload = function (theFile) {
                    return function (e) {

                        var lines = [];
                        var line = new L.GPX(e.target.result, {
                            async: true,
                            onFail: function onFail() {
                                deferred.rejectWith({ error: 'Impossible de traiter ce fichier' });
                            },
                            onSuccess: function onSuccess(gpx) {
                                deferred.notify({ step: 'Fichier traité' });
                                deferred.notify({ start: true, total: lines.length, status: interpolate ? 'Interpolation en cours...' : 'Traitement en cours...' });

                                _this.clear();

                                var bounds = gpx.getBounds();

                                _this.Lmap.fitBounds(bounds, { padding: [50, 50] });

                                var promises = [];
                                var promises2 = [];
                                $.each(lines, function (idx, track) {
                                    if (interpolate) {
                                        var latlngs = track.getLatLngsFlatten();
                                        deferred.notify({ start: true, total: latlngs.length });

                                        promises.push(L.polyline_interpolate(latlngs).progress(function (p) {
                                            deferred.notify({ count: p.count, step: p.count + ' points trouvés' });
                                            p.line.prepareForMap(_this.Lmap, null, null);
                                            p.line.setStyle({ weight: 5, color: '#81197f', opacity: 0.5, snakingPause: 0, snakingSpeed: 1000 }); // Use temporary color
                                            p.line.addTo(_this.Lmap);
                                            promises2.push(p.line.computeStats().progress(deferred.notify));
                                        }));
                                    } else {
                                        track.prepareForMap(_this.Lmap, null, null);
                                        track.setStyle({ weight: 5, color: '#81197f', opacity: 0.5, snakingPause: 0, snakingSpeed: 1000 }); // Use temporary color
                                        track.addTo(_this.Lmap);
                                        promises.push($.Deferred(function () {
                                            this.resolve([{ line: track, mode: 'import' }]);
                                        }));
                                        promises2.push(track.computeStats().progress(deferred.notify));
                                    }
                                });

                                $.when.apply($, promises).done(function () {
                                    var _arguments = arguments;

                                    var startMarker;

                                    var _loop = function _loop(i) {
                                        var newlines = _arguments[i];
                                        var linesLength = newlines.length;

                                        $.each(newlines, function (idx, track) {
                                            // jshint ignore:line
                                            var latlngs = track.line.getLatLngsFlatten();

                                            if (startMarker === undefined) {
                                                var start = latlngs[0];
                                                startMarker = L.Marker.routed(start, {
                                                    riseOnHover: true,
                                                    draggable: interpolate,
                                                    opacity: 0.5,
                                                    color: _this.getCurrentColor(),
                                                    type: 'waypoint'
                                                });
                                                if (interpolate) startMarker.add(_this, false);else _this.addMarker(startMarker, false);
                                            }

                                            var end = latlngs[latlngs.length - 1];
                                            var marker = L.Marker.routed(end, {
                                                riseOnHover: true,
                                                draggable: interpolate,
                                                opacity: 0.5,
                                                color: idx == linesLength - 1 ? _this.nextColor() : _this.getCurrentColor(),
                                                type: idx == linesLength - 1 ? 'step' : 'waypoint'
                                            });
                                            if (interpolate) marker.add(_this, false);else _this.addMarker(marker, false);

                                            track.line.prepareForMap(_this.Lmap, startMarker, marker);
                                            track.line.setStyle({ weight: 5, color: startMarker.getColorRgb(), opacity: 0.5 }); // Use color of starting marker
                                            track.line.bindPopup('Calculs en cours...');
                                            startMarker.attachRouteFrom(marker, track.line, track.mode);
                                            startMarker = marker;
                                        });
                                    };

                                    for (var i = 0; i < arguments.length; i++) {
                                        _loop(i);
                                    }

                                    $.when.apply($, promises2).done(function () {
                                        _this.eachRoute(function (i, route) {
                                            route.setStyle({ opacity: 0.75 });
                                        });

                                        _this.eachMarker(function (i, marker) {
                                            marker.setOpacity(1);
                                        });

                                        _this.fire('markerschanged');

                                        deferred.resolve();
                                    }).fail(function () {
                                        deferred.rejectWith({ error: 'Impossible de récupérer les données géographiques de ce parcours' });
                                    });
                                }).fail(function () {
                                    deferred.rejectWith({ error: 'Impossible d\'interpoler ce parcours' });
                                });
                            }
                        }).on('addline', function (e) {
                            lines.push(e.line);
                        });
                    };
                }(file);

                // Read in the image file as a data URL.
                reader.readAsText(file);
            });
        },

        _removeMarker: function _removeMarker(marker) {
            if (this.firstMarker === marker) this.firstMarker = marker._nextMarker; // Potentially undefined
            if (this.lastMarker === marker) this.lastMarker = marker._previousMarker; // Potentially undefined

            this.markersLength--;
        }
    });

    L.track = function (options) {
        return new L.Track(options);
    };

    L.Marker.Routed = L.Marker.extend({
        options: {
            type: 'waypoint',
            color: 0
        },

        initialize: function initialize(latlng, options) {
            L.Marker.prototype.initialize.call(this, latlng, options);
            L.setOptions(this, options);

            this.setType(this.options.type);
        },

        getColorCode: function getColorCode() {
            return colors[this.options.color];
        },
        getColorRgb: function getColorRgb() {
            return colorMap[colors[this.options.color]];
        },
        getColorIndex: function getColorIndex() {
            return this.options.color;
        },
        setColorIndex: function setColorIndex(i) {
            this.options.color = i;
            this.setType(this.options.type);

            if (this.routeFrom) {
                this.routeFrom.setStyle({ color: this.getColorRgb() });
            }
        },
        getType: function getType() {
            return this.options.type;
        },
        setType: function setType(type) {
            this.options.type = type;
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
        },

        promoteToStep: function promoteToStep() {
            var newColor = this.track.nextColor();

            var _this = this;
            while (_this && _this.options.type != 'step') {
                _this.setColorIndex(newColor);
                _this = _this._nextMarker;
            }

            this.setType('step');
            this.track.fire('markerschanged');
        },

        demoteToWaypoint: function demoteToWaypoint() {
            this.setType('waypoint');

            if (this.hasRouteToHere()) {
                var newColor = this._previousMarker.getColorIndex();

                var _this = this;
                while (_this && _this.options.type != 'step') {
                    _this.setColorIndex(newColor);
                    _this = _this._nextMarker;
                }
            }

            this.track.fire('markerschanged');
        },

        hasRouteToHere: function hasRouteToHere() {
            return this._previousMarker && this._previousMarker.hasRouteFromHere();
        },
        getRouteToHere: function getRouteToHere() {
            return this._previousMarker.routeFrom;
        },
        hasRouteFromHere: function hasRouteFromHere() {
            return !!this.routeFrom;
        },
        getRouteFromHere: function getRouteFromHere() {
            return this.routeFrom;
        },
        getRouteModeFromHere: function getRouteModeFromHere() {
            return this._mode;
        },

        deleteRouteFromHere: function deleteRouteFromHere() {
            if (this._nextMarker) this._nextMarker._previousMarker = undefined;
            if (this.routeFrom) this.routeFrom.remove();
            this.attachRouteFrom(undefined, null, undefined);
        },

        computeRouteTo: function computeRouteTo(to, mode) {
            var _this = this;

            return $.Deferred(function () {
                var deferred = this; // jscs:ignore safeContextKeyword

                if (_this.routeFrom) {
                    _this.routeFrom.setStyle({ opacity: 0.5 });
                }

                $(_this).clearCompute();
                $(_this).startCompute(function (next) {
                    mode = mode || _this._mode || 'auto';

                    findRoute($('#map').map('getMap'), _this, to, 0, mode) // FIXME
                    .progress($.Queue.notify).done(function () {
                        _this.deleteRouteFromHere();
                        _this.attachRouteFrom(to, this.route, mode);
                        deferred.resolve();
                    }).fail(deferred.reject).always(function () {
                        return $(_this).endCompute(next);
                    });
                });
            });
        },

        recomputeRouteFromHere: function recomputeRouteFromHere(mode) {
            return this.computeRouteTo(this._nextMarker, mode);
        },

        recomputeRouteToHere: function recomputeRouteToHere(mode) {
            return this._previousMarker.computeRouteTo(this, mode);
        },

        attachRouteFrom: function attachRouteFrom(to, route, mode) {
            this._nextMarker = to;
            if (to) to._previousMarker = this;
            this.routeFrom = route;
            this._mode = mode;
        },

        _bindEvents: function _bindEvents() {
            var _this8 = this;

            this.bindPopup('<button class="marker-promote-button"><i class="fa fa-asterisk" aria-hidden="true"></i> Marquer comme étape</button> ' + '<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');

            this.on('popupopen', function () {
                $('.marker-delete-button:visible').click(function () {
                    _this8.remove();
                });

                $('.marker-promote-button:visible').click(function () {
                    _this8.closePopup();
                    _this8.setPopupContent('<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');
                    _this8.promoteToStep();
                });
            });

            this.on('moveend', function (event) {
                // Update routes when moving this marker
                _this8.setOpacity(0.5);

                _this8.track.moveMarker(_this8).done(function () {
                    return _this8.setOpacity(1);
                });
            });
        },

        add: function add(o) {
            var computeRoute = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            this.track = o;
            this._bindEvents();
            return this.track.addMarker(this, computeRoute);
        },

        insert: function insert(route) {
            this.track = $('#map').map('getTrack'); // FIXME
            this._bindEvents();
            return this.track.insertMarker(this, route);
        },

        remove: function remove() {
            var recompute = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

            var promise;

            if (this.options.type == 'step' && recompute) {
                // Change colors of next markers until next step
                this.demoteToWaypoint();
            }

            var previous = this._previousMarker;
            var next = this._nextMarker;

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
                        previous.attachRouteFrom(next, null, undefined); // We need to temporarily "fix" the chain to remove the marker properly
                        if (previous.options.type == 'step') promise = next.remove(recompute);else promise = previous.remove(recompute);
                    } else if (recompute) {
                        // Re-connect markers
                        var mode = this.track.$map.map('getMode') || this._mode || 'auto';

                        promise = previous.computeRouteTo(next, mode);
                    }
                }
            }

            L.Marker.prototype.remove.call(this);
            this.track.fire('markerschanged');

            if (promise) return promise;else return $.Deferred(function () {
                this.resolve();
            });
        }
    });

    L.Marker.routed = function (latlng, options) {
        return new L.Marker.Routed(latlng, options);
    };
})(jQuery);

(function ($) {

    $.widget('map2gpx.map', {
        options: {
            leafletOptions: {},

            controls: {
                searchEngine: {
                    show: true,
                    leafletOptions: {
                        displayAdvancedSearch: false
                    }
                },
                minimap: {
                    show: true,
                    leafletOptions: {
                        position: 'bottomleft',
                        zoomLevelOffset: -4
                    }
                },
                layerSwitcher: {
                    show: true,
                    leafletOptions: {
                        collapsed: false
                    }
                },
                scale: {
                    show: true,
                    leafletOptions: {
                        imperial: false,
                        position: 'bottomright'
                    }
                },
                help: {
                    show: true
                }
            }
        },

        getMap: function getMap() {
            return this.map;
        },

        getTrack: function getTrack() {
            return this.track;
        },

        getMode: function getMode() {
            return this.mode;
        },

        _buildEventData: function _buildEventData() {
            return { mode: this.mode };
        },

        _setMode: function _setMode(mode) {
            this.mode = mode;
            this._trigger('modechanged', null, this._buildEventData());
        },

        _onCreated: function _onCreated() {
            var _this9 = this;

            this.element.on('mapmodechanged', function (e) {
                _this9.map.doubleClickZoom.setEnabled(_this9.mode === null);
            });
            this.map.on('dblclick', function (e) {
                return _this9._addMarker.call(_this9, e);
            });

            this._initializeLayers();
            if (this.options.controls.searchEngine.show) this._initializeSearchEngine();
            if (this.options.controls.minimap.show) this._initializeMinimap();
            if (this.options.controls.layerSwitcher.show) this._initializeLayerSwitcher();
            if (this.options.controls.scale.show) this._initializeScale();

            this._initializeTraceButtons();
            this._initializeExportButtons();
            this._initializeImportButtons();
            this._initializeHelpButtons();

            this._trigger('created', null, {});
            this._trigger('statechanged', null, this._buildEventData());

            $.when.apply($, this.layers.promises).done(function () {
                _this9._trigger('loaded', null, {});
            });
        },

        _initializeLayers: function _initializeLayers() {
            var _this10 = this;

            var _this = this;

            this.layers.photos = L.geoportalLayer.WMTS({
                layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
                apiKey: keyIgn
            }).addTo(this.map);
            this.layers.promises.push($.Deferred(function () {
                _this.layers.photos.once('load', this.resolve);
            }));

            // Don't monitor load event, because we don't display this layer (thus, never fires)
            this.layers.slopes = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN',
                apiKey: keyIgn
            }, {
                opacity: 0.25
            }).addTo(this.map);

            this.layers.maps = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                apiKey: keyIgn
            }, {
                opacity: 0.25
            }).addTo(this.map);
            this.layers.promises.push($.Deferred(function () {
                _this.layers.maps.once('load', this.resolve);
            }));

            var outOfRangeDrop = void 0;
            this.map.on('zoomend', function () {
                var currentZoom = _this10.map.getZoom();

                var outOfRange = void 0;
                var $outOfRangeTarget = void 0;
                if (_this10.map.hasLayer(_this10.layers.photos) && (_this10.layers.photos.options.minZoom > currentZoom || _this10.layers.photos.options.maxZoom < currentZoom)) {
                    outOfRange = 'Photographies aériennes';
                    $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(2)');
                } else if (_this10.map.hasLayer(_this10.layers.maps) && (_this10.layers.maps.options.minZoom > currentZoom || _this10.layers.maps.options.maxZoom < currentZoom)) {
                    outOfRange = 'Cartes IGN';
                    $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(0)');
                } else if (_this10.map.hasLayer(_this10.layers.slopes) && (_this10.layers.slopes.options.minZoom > currentZoom || _this10.layers.slopes.options.maxZoom < currentZoom)) {
                    outOfRange = 'Carte des pentes';
                    $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(1)');
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
        },

        _initializeSearchEngine: function _initializeSearchEngine() {
            L.geoportalControl.SearchEngine(this.options.controls.searchEngine.leafletOptions).addTo(this.map);
        },

        _initializeMinimap: function _initializeMinimap() {
            var _this = this;

            this.layers.minimap = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                apiKey: keyIgn
            });
            this.layers.promises.push($.Deferred(function () {
                _this.layers.minimap.once('load', this.resolve);
            }));

            new L.Control.MiniMap(this.layers.minimap, this.options.controls.minimap.leafletOptions).addTo(this.map);
        },

        _initializeLayerSwitcher: function _initializeLayerSwitcher() {
            var layerSwitcher = L.geoportalControl.LayerSwitcher(this.options.controls.layerSwitcher.leafletOptions);
            this.map.addControl(layerSwitcher);
            layerSwitcher.setVisibility(this.layers.slopes, false);
            $('.GPlayerRemove').remove();
        },

        _initializeScale: function _initializeScale() {
            L.control.scale(this.options.controls.scale.leafletOptions).addTo(this.map);
        },

        _initializeTraceButtons: function _initializeTraceButtons() {
            var _this11 = this;

            var automatedBtn = L.easyButton({
                id: 'btn-autotrace',
                states: [{
                    stateName: 'loaded',
                    icon: 'fa-map-signs',
                    title: 'Tracer automatiquement l\'itinéraire',
                    onClick: function onClick(btn, map) {
                        return _this11._setMode('auto');
                    }
                }, {
                    stateName: 'active',
                    icon: 'fa-map-signs',
                    title: 'Tracer automatiquement l\'itinéraire',
                    onClick: function onClick(btn, map) {
                        return _this11._setMode(null);
                    }
                }]
            });
            this.element.on('mapmodechanged mapstatechanged', function (e) {
                if (_this11.mode == 'auto') {
                    automatedBtn.state('active');
                    automatedBtn.enable();
                } else {
                    automatedBtn.state('loaded');
                    automatedBtn.setEnabled(!_this11.track.isImport());
                }
            });

            var lineBtn = L.easyButton({
                id: 'btn-straighttrace',
                states: [{
                    stateName: 'loaded',
                    icon: 'fa-location-arrow',
                    title: 'Tracer l\'itinéraire en ligne droite',
                    onClick: function onClick(btn, map) {
                        return _this11._setMode('straight');
                    }
                }, {
                    stateName: 'active',
                    icon: 'fa-location-arrow',
                    title: 'Tracer l\'itinéraire en ligne droite',
                    onClick: function onClick(btn, map) {
                        return _this11._setMode(null);
                    }
                }]
            });
            this.element.on('mapmodechanged mapstatechanged', function (e) {
                if (_this11.mode == 'straight') {
                    lineBtn.state('active');
                    lineBtn.enable();
                } else {
                    lineBtn.state('loaded');
                    lineBtn.setEnabled(!_this11.track.isImport());
                }
            });

            var closeLoop = L.easyButton({
                id: 'btn-closeloop',
                states: [{
                    stateName: 'loaded',
                    icon: 'fa-magic',
                    title: 'Fermer la boucle',
                    onClick: function onClick(btn, map) {
                        if (_this11.track.hasMarkers(1)) {
                            _this11._addMarker({ latlng: _this11.track.getFirstMarker().getLatLng() });
                        }
                    }
                }]
            });
            this.element.on('mapmodechanged mapcomputingchanged mapstatechanged', function (e) {
                closeLoop.setEnabled(_this11.mode !== null && _this11.track.hasRoutes() && !_this11.track.isImport() && !_this11.track.isLoop());
            });

            L.easyBar([automatedBtn, lineBtn, closeLoop]).addTo(this.map);
        },

        _initializeExportButtons: function _initializeExportButtons() {
            var _this12 = this;

            var _this = this;

            var exportPopup = L.popup().setContent(L.DomUtil.get('form-export'));
            var exportButton = L.easyButton({
                id: 'btn-export',
                states: [{
                    stateName: 'loaded',
                    icon: 'fa-cloud-download',
                    title: 'Exporter',
                    onClick: function onClick(btn, map) {
                        var bounds = _this12.track.getBounds();

                        _this12.map.flyToBounds(bounds, { padding: [50, 50] });
                        exportPopup.setLatLng(bounds.getCenter()).openOn(_this12.map);
                    }
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Exporter (calcul en cours...)'
                }]
            }).addTo(this.map);

            $('#export-gpx-button').click(function () {
                var $btn = $(this);
                $btn.attr('disabled', 'disabled');
                _this.track.exportGpx($('#export-filename').val());
                $btn.removeAttr('disabled');
            });

            $('#export-kml-button').click(function () {
                var $btn = $(this);
                $btn.attr('disabled', 'disabled');
                _this.track.exportKml($('#export-filename').val());
                $btn.removeAttr('disabled');
            });

            this.element.on('mapcomputingchanged mapstatechanged', function (e) {
                if (e.computing) {
                    exportButton.state('computing');
                    exportButton.disable();
                } else {
                    exportButton.state('loaded');
                    exportButton.setEnabled(_this12.track.hasRoutes());
                }
            });
        },

        _initializeImportButtons: function _initializeImportButtons() {
            var _this13 = this;

            var _this = this;

            var importPopup = L.popup().setContent(L.DomUtil.get('form-import'));
            var importButton = L.easyButton({
                id: 'btn-import',
                states: [{
                    stateName: 'loaded',
                    icon: 'fa-cloud-upload',
                    title: 'Importer',
                    onClick: function onClick(btn, map) {
                        importPopup.setLatLng(_this13.map.getCenter()).openOn(_this13.map);

                        if (_this13.track.hasRoutes()) {
                            $('#import-gpx-status').html('<strong>Attention:</strong> l\'import va effacer l\'itinéraire existant!');
                        } else {
                            $('#import-gpx-status').text('');
                        }
                    }
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Importer (calcul en cours...)'
                }]
            });

            $('#import-gpx-button').click(function () {
                var $btn = $(this);
                var f = $('#import-gpx-file')[0].files[0];
                var interpolate = $('#import-gpx-interpolate').is(':checked');

                if (f == undefined) {
                    $('#import-gpx-status').text('Veuillez sélectionner un fichier');
                    return;
                }

                $btn.attr('disabled', 'disabled');

                $('body').startCompute(function (next) {
                    $.Queue.notify({ start: true, total: 1, status: 'Importation en cours...' });
                    _this.track.importGpx(f, interpolate).done(function () {
                        $btn.removeAttr('disabled');
                        _this._setMode(null); // Disable any other tracing
                    }).fail(function () {
                        $('#import-gpx-status').text(this.error);
                        $btn.removeAttr('disabled');
                    }).progress(function (progress) {
                        $.Queue.notify(progress);
                        if (importPopup.isOpen()) {
                            _this.map.closePopup();
                        }
                    }).always(function () {
                        return $('body').endCompute(next);
                    });
                });
            });

            var resetButton = L.easyButton({
                id: 'btn-reset',
                states: [{
                    stateName: 'loaded',
                    icon: 'fa-trash',
                    title: 'Effacer l\'itinéraire',
                    onClick: function onClick(btn, map) {
                        _this13.track.clear();
                    }
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Effacer l\'itinéraire (calcul en cours...)'
                }]
            });

            L.easyBar([importButton, resetButton]).addTo(this.map);
            this.element.on('mapcomputingchanged mapstatechanged', function (e) {
                importButton.state(_this13.computing ? 'computing' : 'loaded');
                resetButton.state(_this13.computing ? 'computing' : 'loaded');

                importButton.setEnabled(!_this13.computing);
                resetButton.setEnabled(!_this13.computing && _this13.track.hasMarkers());
            });
        },

        _initializeHelpButtons: function _initializeHelpButtons() {
            var _this14 = this;

            var infoPopup = L.popup().setContent(L.DomUtil.get('about'));

            var infoBtn = L.easyButton({
                position: 'bottomright',
                states: [{
                    icon: 'fa-info-circle',
                    onClick: function onClick(btn, map) {
                        infoPopup.setLatLng(_this14.map.getCenter()).openOn(_this14.map);
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

            L.easyBar([infoBtn, helpBtn], { position: 'bottomright' }).addTo(this.map);
        },

        _create: function _create() {
            var _this15 = this;

            this.element.uniqueId();

            this.layers = {};
            this.layers.promises = [];
            this.mode = null;

            this.map = L.map(this.element.attr('id'), this.options.leafletOptions);

            this.track = L.track({ map: this.element });
            this.track.on('markerschanged', function () {
                return _this15._trigger('statechanged', null, _this15._buildEventData());
            });

            this.map.initView().done(function () {
                return _this15._onCreated();
            });
        },

        _addMarker: function _addMarker(e) {
            if (this.mode === null) {
                return;
            }

            var marker = L.Marker.routed(e.latlng.roundE8(), {
                riseOnHover: true,
                draggable: true,
                opacity: 0.5,
                color: this.track.hasMarkers() ? this.track.getLastMarker().getColorIndex() : this.track.getCurrentColor(),
                type: 'waypoint'
            });

            // Ignore this marker if same as previous
            if (this.track.hasMarkers() && this.track.getLastMarker().getLatLng().equals(marker.getLatLng())) return;

            marker.add(this.track).done(function () {
                marker.setOpacity(1);
            });
        }
    });
})(jQuery);

var isSmallScreen = window.innerWidth <= 800 && window.innerHeight <= 600;

showLoadingMessage('Observation des faucons crécerelle...');

if (isSmallScreen) {
    $('#mobile-warning').show().find('button').click(function () {
        $('#mobile-warning').hide();
    });
}

window.onload = function () {
    try {
        showLoadingMessage('Localisation des chamois...');

        $('#data-computing').progress().on('progressstatechanged', function (e, data) {
            if (data.started) {
                $('#data-computing').fadeIn();
            } else {
                $('#data').data('map2gpx-chart').replot($map.map('getTrack').computeStats());
                $('#data-computing').fadeOut();
            }
        });
        $.Queue.bindTo($('#data-computing'));

        var $map = $('#map').map({
            controls: {
                minimap: {
                    show: !isSmallScreen
                },
                layerSwitcher: {
                    leafletOptions: {
                        collapsed: isSmallScreen
                    }
                },
                scale: {
                    show: !isSmallScreen
                },
                help: {
                    show: !isSmallScreen
                }
            },
            created: function created() {
                showLoadingMessage('Suivi des renards roux...');

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
            },
            loaded: function loaded() {
                showLoadingMessage('Alignement des satellites...');
                clearInterval(interval);
                $('#loading').fadeOut();
            }
        }).on('mapmarkerschanged', function (e) {
            if (!isSmallScreen) {
                if ($map.map('getTrack').hasMarkers(2) && !$.Shepherd.has(1)) {
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

                if ($map.map('getTrack').hasMarkers(3) && !$.Shepherd.has(2)) {
                    $.Shepherd.tour().add('movemarker', {
                        text: $('#help-movemarker')[0],
                        attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' }
                    }).add('movemarker2', {
                        text: $('#help-movemarker2')[0],
                        attachTo: { element: $('.awesome-marker').eq(-2)[0], on: 'bottom' }
                    }).add('steps', {
                        text: $('#help-steps')[0],
                        attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' }
                    }).add('steps2', {
                        beforeShowPromise: function beforeShowPromise() {
                            return $.Deferred(function () {
                                var route = $map.map('getTrack').getFirstMarker().getRouteFromHere();
                                var lngs = route.getLatLngsFlatten();
                                var item = lngs[Math.floor(lngs.length / 2)];
                                route.openPopup(item);
                                this.resolve();
                            }).promise();
                        },
                        text: $('#help-steps2')[0]
                    }).start();
                }
            }
        }).on('mapstatechanged', function (e) {
            $('#data').data('map2gpx-chart').replot($map.map('getTrack').computeStats());
        });

        $('#data').chart({ map: $map.map('getMap'), dataEmpty: '#data-empty', isSmallScreen: isSmallScreen });
    } catch (ex) {
        gotError = true;
        console.log('Got exception', ex);
        $('#loading').animate({ backgroundColor: '#A23336', color: '#FFFFFF' });
        $('#loading h2 i.fa').removeClass('fa-spinner fa-pulse').addClass('fa-bug');
        $('#loading h2 span').html('Une erreur s\'est produite: &quot;' + ex + '&quot;.');
        $('#loading h3').html($('<div>N\'hésitez pas à ouvrir un ticket sur <a href="https://github.com/tmuguet/map2gpx" target="_blank" rel="noopener noreferrer">Github</a> ' + 'ou à m\'envoyer un mail à <a href="mailto:hi@tmuguet.me">hi@tmuguet.me</a>.</div>').hide().slideDown());
        clearInterval(interval);
    }
};