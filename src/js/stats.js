
function fetchAltitude(geometry) {
    return $.Deferred(function () {
        const options = {
            apiKey: keyIgn,
            sampling: geometry.length,
            positions: geometry,
            onSuccess: (result) => {
                if (result) {
                    $.each(result.elevations, function (i, val) {
                        $.Cache.addAltitude(val.lat, val.lon, val.z);
                    });

                    this.resolveWith({ size: result.elevations.length });
                } else {
                    console.log('Impossible d\'obtenir les données d\'altitude: résultats invalides');
                    this.reject();
                }
            },
            /** callback onFailure */
            onFailure: (error) => {
                console.log('Impossible d\'obtenir les données d\'altitude: ', error.message);
                this.reject();
            },
        };

        // Request altitude service
        Gp.Services.getAltitude(options);
    });
}

function fetchSlope(tilex, tiley, coords) {
    return $.Deferred(function () {
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

        $.getJSON('slope.php', data, (r) => {
            if (r.results) {
                $.each(r.results, function (i, val) {
                    $.Cache.addSlope(val.lat, val.lon, val.slope);
                });

                this.resolveWith({ size: r.results.length });
            } else {
                console.log('Impossible d\'obtenir les données de pente: résultats invalides');
                this.reject();
            }
        }).fail((jqxhr, textStatus, error) => {
            console.log('Impossible d\'obtenir les données de pente: ', textStatus, error);
            this.reject();
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
        const latlngs = _this.getLatLngsFlatten();

        return $.Deferred(function () {
            const deferred = this;  // jscs:ignore safeContextKeyword
            const promises = _this._fetchAltitude(latlngs).concat(_this._fetchSlope(latlngs));
            const total = promises.length;

            deferred.notify({ start: true, total: total, status: 'Récupération des données géographiques...' });

            $.each(promises, function () {
                this.done(function () {
                    deferred.notify({ step: this.size + ' points récupérés' });
                });
            });

            $.when.apply($, promises)
                .fail(deferred.reject)
                .done(function () {
                    // Sanity checks
                    $.each(latlngs, function (j, coords) {
                        if (!$.Cache.hasAltitude(coords)) {
                            console.log('Could not find altitude for coordinates', coords);
                            deferred.rejectWith({ error: 'Impossible d\'obtenir les données d\'altitude' });
                        }
                        if (!$.Cache.hasSlope(coords)) {
                            console.log('Could not find slope for coordinates', coords);
                            deferred.rejectWith({ error: 'Impossible d\'obtenir les données de pente' });
                        }
                    });

                    _this._computeStats(latlngs);
                    deferred.resolve();
                });
        });
    },

    _computeStats: function (latlngs) {
        const elevations = [];

        $.each(latlngs, function (j, coords) {
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
            if (localDistance > 0) {

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

    _fetchAltitude: function (latlngs) {
        var geometry = []; // Batch
        const promises = [];

        $.each(latlngs, function (j, coords) {
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

    _fetchSlope: function (latlngs) {
        const tiles = {};
        const promises = [];
        const map = (this._map || this._mapToAdd);

        $.each(latlngs, function (j, coords) {
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

    setPopupContentWith: function (color, stats, hasInsertMaker = true) {
        this.setPopupContent('<ul class="legend ' + color + '">' +
            '<li>Altitude max: ' + Math.round(stats.altMax) + 'm</li>' +
            '<li>D+: ' + Math.round(stats.denivPos) + 'm</li>' +
            '<li>Altitude min: ' + Math.round(stats.altMin) + 'm</li>' +
            '<li>D-: ' + Math.round(stats.denivNeg) + 'm</li>' +
            '<li>Distance: ' + Math.round(stats.distance * 100) / 100 + 'km</li></ul>' +
            (hasInsertMaker ? '<button class="marker-add-button"><i class="fa fa-plus" aria-hidden="true"></i> Ajouter un marqueur ici</button>' : ''));
    },
});
