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

                geojson.prepareForMap(_this.map);
                geojson.computeStats().progress(deferred.notify).then(function () {
                    geojson.addTo(_this.map);
                    geojson.bindPopup('Calculs en cours...');
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

                            deferred.notify({ progress: 0.5, step: 'Route calculée' });
                            _this._add(geojson, start, end, index, 'auto')
                                .progress(function (progress) {
                                    progress.progress = 0.5 + progress.progress / 2;
                                    deferred.notify(progress);
                                })
                                .done(deferred.resolve)
                                .fail(deferred.reject);
                        } else {
                            deferred.rejectWith({ error: 'Impossible d\'obtenir la route: pas de résultats fournis' });
                        }
                    },
                    onFailure: function (error) {    // seems to never be called
                        deferred.rejectWith({ error: 'Impossible d\'obtenir la route: ' + error.message });
                    },
                };
                deferred.notify({ progress: 0, status: 'Calcul de la route...' });
                Gp.Services.route(options);
            });
        },

        _findStraight: function (start, end, index) {
            const _this = this;

            return $.Deferred(function () {
                const deferred = this;  // jscs:ignore safeContextKeyword

                deferred.notify({ progress: 0, status: 'Calcul de la route...' });

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

                deferred.notify({ progress: 0.5, step: 'Route calculée' });
                _this._add(geojson, start, end, index, 'straight')
                    .progress(function (progress) {
                        progress.progress = 0.5 + progress.progress / 2;
                        deferred.notify(progress);
                    })
                    .done(deferred.resolve)
                    .fail(deferred.reject);
            });
        },
    };

})(jQuery);
