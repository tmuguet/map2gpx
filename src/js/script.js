
const isSmallScreen = (window.innerWidth <= 800 && window.innerHeight <= 600);

$('<div>Observation des faucons crécerelle...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {this.remove();});

window.onload = function () {

    $('<div>Localisation des chamois...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {this.remove();});

    var map = L.map('map', {});
    map.initView().done(function () {

        $('<div>Suivi des renards roux...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {this.remove();});

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
                }, {
                    stateName: 'computing',
                    icon: 'fa-spinner fa-pulse',
                    title: 'Fermer la boucle (calcul en cours...)',
                },
            ],
        });
        $('body').on('map2gpx:modechange map2gpx:computingchange map2gpx:markerschange', function (e) {
            if (e.computing) {
                closeLoop.state('computing');
                closeLoop.disable();
            } else {
                closeLoop.state('loaded');
                closeLoop.setEnabled((e.mode !== null && $.Track.hasRoutes() && !$.Track.isImport()));
            }
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
                            $.State.updateComputing({ progress: 0, status: 'Importation en cours...' });

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
                                            $.State.updateComputing({ progress: 1 / (lines.length + 1), status: 'Récupération des données géographiques en cours...', step: 'Fichier traité' });

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
                                            const progresses = [1];
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

                                                marker.bindPopup('<button class="track-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer l\'import</button>');
                                                marker.on('popupopen', deleteTrack);

                                                progresses.push(0);
                                                promises.push(track.computeStats().progress(function (progress) {
                                                    progresses[idx + 1] = progress.progress;
                                                    progress.progress = progresses;
                                                    $.State.updateComputing(progress);
                                                }));

                                                startMarker = marker;
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
                        $.State.setComputing(true);
                        $.Track.clear();
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
                $.State.updateComputing({ progress: 0, status: 'Calculs en cours...' });
                $('#data-computing').fadeIn();
            } else {
                $.State.updateComputing({ progress: 1, status: 'Finalisation...' });
                $.Chart.replot();
                $('#data-computing').fadeOut();
            }
        });

        function addMarker(e) {
            if ($.State.getMode() === null || $.State.getComputing()) {
                return;
            }

            $.State.setComputing(true);

            const latlng = L.latLng(Math.roundE8(e.latlng.lat), Math.roundE8(e.latlng.lng));
            const marker = L.Marker.routed(latlng, {
                riseOnHover: true,
                draggable: true,
                opacity: 0.5,
                color: ($.Track.hasMarkers()) ? $.Track.getLastMarker().getColorIndex() : $.Track.getCurrentColor(),
                type: 'waypoint',
            }).bindPopup('<button class="marker-promote-button"><i class="fa fa-asterisk" aria-hidden="true"></i> Marquer comme étape</button> ' +
                '<button class="marker-delete-button"><i class="fa fa-trash" aria-hidden="true"></i> Supprimer ce marqueur</button>');

            marker.on('popupopen', function () {
                const _this = this;

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

            marker.on('moveend', function (event) {
                // Update routes when moving this marker
                $.State.setComputing(true);
                event.target.setOpacity(0.5);
                const promises = [];
                const progresses = [];

                if (event.target.hasRouteFromHere()) {
                    // Re-compute route starting at this marker
                    const idx = promises.length;

                    progresses.push(0);
                    promises.push(
                        event.target.recomputeRouteFromHere($.State.getMode()).progress(function (progress) {
                            progresses[idx] = progress.progress;
                            progress.progress = progresses;
                            $.State.updateComputing(progress);
                        })
                    );
                }

                if (event.target.hasRouteToHere()) {
                    // Re-compute route ending at this marker
                    const idx = promises.length;

                    progresses.push(0);
                    promises.push(
                        event.target.recomputeRouteToHere($.State.getMode()).progress(function (progress) {
                            progresses[idx] = progress.progress;
                            progress.progress = progresses;
                            $.State.updateComputing(progress);
                        })
                    );
                }

                $.when.apply($, promises).done(function () {
                    $.State.setComputing(false);
                    event.target.setOpacity(1);
                }).fail(function () {
                    $.State.setComputing(false);
                });
            });

            var promise = $.Track.addMarker(marker);

            promise.progress($.State.updateComputing).done(function () {
                marker.setOpacity(1);
                $.State.setComputing(false);
            }).fail(function () {
                $.State.setComputing(false);
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
                        .start();
                }
            }
        }

        $('<div>Alignement des satellites...</div>').insertAfter($('#loading h2')).fadeOut(2000, function () {this.remove();});

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
