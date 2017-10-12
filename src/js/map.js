(function ($) {

    $.widget('map2gpx.map', {
        options: {
            leafletOptions: {},

            controls: {
                searchEngine: {
                    show: true,
                    leafletOptions: {
                        displayAdvancedSearch: false,
                    },
                },
                minimap: {
                    show: true,
                    leafletOptions: {
                        position: 'bottomleft',
                        zoomLevelOffset: -4,
                    },
                },
                layerSwitcher: {
                    show: true,
                    leafletOptions: {
                        collapsed: false,
                    },
                },
                scale: {
                    show: true,
                    leafletOptions: {
                        imperial: false,
                        position: 'bottomright',
                    },
                },
                help: {
                    show: true,
                },
            },
        },

        getMap: function () {
            return this.map;
        },

        getTrack: function () {
            return this.track;
        },

        getMode: function () {
            return this.mode;
        },

        _buildEventData: function () {
            return { mode: this.mode };
        },

        _setMode: function (mode) {
            this.mode = mode;
            this._trigger('modechanged', null, this._buildEventData());
        },

        _onCreated: function () {
            this.element.on('mapmodechanged', (e) => {
                this.map.doubleClickZoom.setEnabled((this.mode === null));
            });
            this.map.on('dblclick', (e) => this._addMarker.call(this, e));

            this._initializeLayers();
            if (this.options.controls.searchEngine.show)
                this._initializeSearchEngine();
            if (this.options.controls.minimap.show)
                this._initializeMinimap();
            if (this.options.controls.layerSwitcher.show)
                this._initializeLayerSwitcher();
            if (this.options.controls.scale.show)
                this._initializeScale();

            this._initializeTraceButtons();
            this._initializeExportButtons();
            this._initializeImportButtons();
            this._initializeHelpButtons();

            this._trigger('created', null, {});
            this._trigger('statechanged', null, this._buildEventData());

            $.when.apply($, this.layers.promises).done(() => {
                this._trigger('loaded', null, {});
            });
        },

        _initializeLayers: function () {
            const _this = this;

            this.layers.photos = L.geoportalLayer.WMTS({
                layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
                apiKey: keyIgn,
            }).addTo(this.map);
            this.layers.promises.push($.Deferred(function () {
                _this.layers.photos.once('load', this.resolve);
            }));

            // Don't monitor load event, because we don't display this layer (thus, never fires)
            this.layers.slopes =  L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN',
                apiKey: keyIgn,
            }, {
                opacity: 0.25,
            }).addTo(this.map);

            this.layers.maps = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                apiKey: keyIgn,
            }, {
                opacity: 0.25,
            }).addTo(this.map);
            this.layers.promises.push($.Deferred(function () {
                _this.layers.maps.once('load', this.resolve);
            }));

            let outOfRangeDrop;
            this.map.on('zoomend', () => {
                const currentZoom = this.map.getZoom();

                let outOfRange;
                let $outOfRangeTarget;
                if (this.map.hasLayer(this.layers.photos) && (this.layers.photos.options.minZoom > currentZoom || this.layers.photos.options.maxZoom < currentZoom)) {
                    outOfRange = 'Photographies aériennes';
                    $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(2)');
                } else if (this.map.hasLayer(this.layers.maps) && (this.layers.maps.options.minZoom > currentZoom || this.layers.maps.options.maxZoom < currentZoom)) {
                    outOfRange = 'Cartes IGN';
                    $outOfRangeTarget = $('.GPlayerSwitcher_layer:eq(0)');
                } else if (this.map.hasLayer(this.layers.slopes) && (this.layers.slopes.options.minZoom > currentZoom || this.layers.slopes.options.maxZoom < currentZoom)) {
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
        },

        _initializeSearchEngine: function () {
            L.geoportalControl.SearchEngine(this.options.controls.searchEngine.leafletOptions).addTo(this.map);
        },

        _initializeMinimap: function () {
            const _this = this;

            this.layers.minimap = L.geoportalLayer.WMTS({
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                apiKey: keyIgn,
            });
            this.layers.promises.push($.Deferred(function () {
                _this.layers.minimap.once('load', this.resolve);
            }));

            new L.Control.MiniMap(this.layers.minimap, this.options.controls.minimap.leafletOptions).addTo(this.map);
        },

        _initializeLayerSwitcher: function () {
            let layerSwitcher = L.geoportalControl.LayerSwitcher(this.options.controls.layerSwitcher.leafletOptions);
            this.map.addControl(layerSwitcher);
            layerSwitcher.setVisibility(this.layers.slopes, false);
            $('.GPlayerRemove').remove();
        },

        _initializeScale: function () {
            L.control.scale(this.options.controls.scale.leafletOptions).addTo(this.map);
        },

        _initializeTraceButtons: function () {
            let automatedBtn = L.easyButton({
                id: 'btn-autotrace',
                states: [
                    {
                        stateName: 'loaded',
                        icon: 'fa-map-signs',
                        title: 'Tracer automatiquement l\'itinéraire',
                        onClick: (btn, map) => this._setMode('auto'),
                    }, {
                        stateName: 'active',
                        icon: 'fa-map-signs',
                        title: 'Tracer automatiquement l\'itinéraire',
                        onClick: (btn, map) => this._setMode(null),
                    },
                ],
            });
            this.element.on('mapmodechanged mapstatechanged', (e) => {
                if (this.mode == 'auto') {
                    automatedBtn.state('active');
                    automatedBtn.enable();
                } else {
                    automatedBtn.state('loaded');
                    automatedBtn.setEnabled(!this.track.isImport());
                }
            });

            let lineBtn = L.easyButton({
                id: 'btn-straighttrace',
                states: [
                    {
                        stateName: 'loaded',
                        icon: 'fa-location-arrow',
                        title: 'Tracer l\'itinéraire en ligne droite',
                        onClick: (btn, map) => this._setMode('straight'),
                    }, {
                        stateName: 'active',
                        icon: 'fa-location-arrow',
                        title: 'Tracer l\'itinéraire en ligne droite',
                        onClick: (btn, map) => this._setMode(null),
                    },
                ],
            });
            this.element.on('mapmodechanged mapstatechanged', (e) => {
                if (this.mode == 'straight') {
                    lineBtn.state('active');
                    lineBtn.enable();
                } else {
                    lineBtn.state('loaded');
                    lineBtn.setEnabled(!this.track.isImport());
                }
            });

            let closeLoop = L.easyButton({
                id: 'btn-closeloop',
                states: [
                    {
                        stateName: 'loaded',
                        icon: 'fa-magic',
                        title: 'Fermer la boucle',
                        onClick: (btn, map) => {
                            if (this.track.hasMarkers(1)) {
                                this._addMarker({ latlng: this.track.getFirstMarker().getLatLng() });
                            }
                        },
                    },
                ],
            });
            this.element.on('mapmodechanged mapcomputingchanged mapstatechanged', (e) => {
                closeLoop.setEnabled((this.mode !== null && this.track.hasRoutes() && !this.track.isImport() && !this.track.isLoop()));
            });

            L.easyBar([automatedBtn, lineBtn, closeLoop]).addTo(this.map);
        },

        _initializeExportButtons: function () {
            const _this = this;

            let exportPopup = L.popup().setContent(L.DomUtil.get('form-export'));
            let exportButton = L.easyButton({
                id: 'btn-export',
                states: [
                    {
                        stateName: 'loaded',
                        icon: 'fa-cloud-download',
                        title: 'Exporter',
                        onClick: (btn, map) => {
                            const bounds = this.track.getBounds();

                            this.map.flyToBounds(bounds, { padding: [50, 50] });
                            exportPopup.setLatLng(bounds.getCenter()).openOn(this.map);

                            $('.export-gpx-button:visible').click(function () {
                                const $btn = $(this);
                                $btn.attr('disabled', 'disabled');
                                _this.track.exportGpx($('.export-filename:visible').val());
                                $btn.removeAttr('disabled');
                            });

                            $('.export-kml-button:visible').click(function () {
                                const $btn = $(this);
                                $btn.attr('disabled', 'disabled');
                                _this.track.exportKml($('.export-filename:visible').val());
                                $btn.removeAttr('disabled');
                            });
                        },
                    }, {
                        stateName: 'computing',
                        icon: 'fa-spinner fa-pulse',
                        title: 'Exporter (calcul en cours...)',
                    },
                ],
            }).addTo(this.map);
            this.element.on('mapcomputingchanged mapstatechanged', (e) => {
                if (e.computing) {
                    exportButton.state('computing');
                    exportButton.disable();
                } else {
                    exportButton.state('loaded');
                    exportButton.setEnabled(this.track.hasRoutes());
                }
            });
        },

        _initializeImportButtons: function () {
            const _this = this;

            let importPopup = L.popup().setContent(L.DomUtil.get('form-import'));
            let importButton = L.easyButton({
                id: 'btn-import',
                states: [
                    {
                        stateName: 'loaded',
                        icon: 'fa-cloud-upload',
                        title: 'Importer',
                        onClick: (btn, map) => {
                            importPopup.setLatLng(this.map.getCenter()).openOn(this.map);

                            if (this.track.hasRoutes()) {
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

                                $('body').startCompute(function (next) {
                                    $.Queue.notify({ start: true, total: 1, status: 'Importation en cours...' });
                                    _this.track.importGpx(f).done(function () {
                                        $btn.removeAttr('disabled');
                                        _this._setMode(null);  // Disable any other tracing
                                    }).fail(function () {
                                        $('.import-gpx-status:visible').text(this.error);
                                        $btn.removeAttr('disabled');
                                    }).progress(function (progress) {
                                        $.Queue.notify(progress);
                                        if (importPopup) {
                                            importPopup.remove();
                                            importPopup = undefined;
                                        }
                                    }).always(() => $('body').endCompute(next));
                                });
                            });
                        },
                    }, {
                        stateName: 'computing',
                        icon: 'fa-spinner fa-pulse',
                        title: 'Importer (calcul en cours...)',
                    },
                ],
            });
            let resetButton = L.easyButton({
                id: 'btn-reset',
                states: [
                    {
                        stateName: 'loaded',
                        icon: 'fa-trash',
                        title: 'Effacer l\'itinéraire',
                        onClick: (btn, map) => {
                            this.track.clear();
                        },
                    }, {
                        stateName: 'computing',
                        icon: 'fa-spinner fa-pulse',
                        title: 'Effacer l\'itinéraire (calcul en cours...)',
                    },
                ],
            });

            L.easyBar([importButton, resetButton]).addTo(this.map);
            this.element.on('mapcomputingchanged', (e) => {
                importButton.state(this.computing ? 'computing' : 'loaded');
                resetButton.state(this.computing ? 'computing' : 'loaded');

                importButton.setEnabled(!this.computing);
                resetButton.setEnabled(!this.computing);
            });
        },

        _initializeHelpButtons: function () {
            const infoPopup = L.popup().setContent(L.DomUtil.get('about'));

            const infoBtn = L.easyButton({
                position: 'bottomright',
                states: [
                    {
                        icon: 'fa-info-circle',
                        onClick: (btn, map) => {
                            infoPopup.setLatLng(this.map.getCenter()).openOn(this.map);
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
                        onClick: (btn, map) => {
                            $.Shepherd.get(0).start(true);
                        },
                        title: 'Aide',
                    },
                ],
            });

            L.easyBar([infoBtn, helpBtn], { position: 'bottomright' }).addTo(this.map);
        },

        _create: function () {
            this.element.uniqueId();

            this.layers = {};
            this.layers.promises = [];
            this.mode = null;

            this.map = L.map(this.element.attr('id'), this.options.leafletOptions);

            this.track = L.track({ map: this.element });
            this.track.on('markerschanged', () => this._trigger('statechanged', null, this._buildEventData()));

            this.map.initView().done(() => this._onCreated());
        },

        _addMarker: function (e) {
            if (this.mode === null) {
                return;
            }

            const marker = L.Marker.routed(e.latlng.roundE8(), {
                riseOnHover: true,
                draggable: true,
                opacity: 0.5,
                color: (this.track.hasMarkers()) ? this.track.getLastMarker().getColorIndex() : this.track.getCurrentColor(),
                type: 'waypoint',
            });

            // Ignore this marker if same as previous
            if (this.track.hasMarkers() && this.track.getLastMarker().getLatLng().equals(marker.getLatLng()))
                return;

            marker.add(this.track).done(function () {
                marker.setOpacity(1);
            });
        },
    });

})(jQuery);
