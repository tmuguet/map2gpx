
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
    _slopeMin: 0,
    _slopeMax: 0,
    _denivPos: 0,
    _denivNeg: 0,

    prepareForMap: function (map) {
        this._mapToAdd = map;
    },

    getElevations: function () {
        return JSON.parse(JSON.stringify(this._elevations));   // return deep copy (isn't there a better way??)
    },

    getDistance: function () { return this._distance; },
    getAltMin: function () { return this._altMin; },
    getAltMax: function () { return this._altMax; },
    getSlopeMin: function () { return this._slopeMin; },
    getSlopeMax: function () { return this._slopeMax; },
    getDenivPos: function () { return this._denivPos; },
    getDenivNeg: function () { return this._denivNeg; },

    computeStats: function () {
        const _this = this;
        return $.Deferred(function () {
            const deferred = this;  // jscs:ignore safeContextKeyword
            const promises = _this._fetchAltitude().concat(_this._fetchSlope());
            const total = promises.length;

            deferred.notify({ progress: 0, status: 'Récupération des données géographiques...' });

            var i = 0;
            $.each(promises, function () {
                this.done(function () {
                    i++;
                    deferred.notify({ progress: i / (total + 1), step: this.size + ' points récupérés' });
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
        this._slopeMax = 0;
        this._slopeMin = 0;
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

                if (j > 5) {
                    // FIXME: should maybe do an average with 2 points before & 2 points after
                    let previous = (
                        this._elevations[j - 5].slopeOnTrack +
                        this._elevations[j - 4].slopeOnTrack +
                        this._elevations[j - 3].slopeOnTrack +
                        this._elevations[j - 2].slopeOnTrack +
                        this._elevations[j - 1].slopeOnTrack) / 5;
                    this._elevations[j].slopeOnTrack = (previous + this._elevations[j].slopeOnTrack) / 2;
                }

                if (this._elevations[j].z < this._altMin)
                    this._altMin = this._elevations[j].z;
                if (this._elevations[j].z > this._altMax)
                    this._altMax = this._elevations[j].z;

                if (this._elevations[j].slopeOnTrack > this._slopeMax)
                    this._slopeMax = this._elevations[j].slopeOnTrack;
                if (this._elevations[j].slopeOnTrack < this._slopeMin)
                    this._slopeMin = this._elevations[j].slopeOnTrack;

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
            '<li>Distance: ' + Math.round(stats.distance * 100) / 100 + 'km</li></ul>');
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
