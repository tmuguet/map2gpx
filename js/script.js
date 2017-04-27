window.onload = function() {

    var markers = [];   // Cache of defined markers
    var routes = [];    // Cache of computed routes
    var altitudes = {}; // Cache of computed altitudes for each points of routes computed so far
    var slopes = {}; // Cache of computed slopes for each points of routes computed so far

    // Central map
    var map = L.map('map', {
        loadingControl: true,
        doubleClickZoom: false
    }).setView([44.97755, 6.141186], 13);   // Center in les Ecrins because I love this place
    L.geoportalLayer.WMTS({
        layer: "ORTHOIMAGERY.ORTHOPHOTOS",
        apiKey: keyIgn
    }).addTo(map);
    var slopes =  L.geoportalLayer.WMTS({
        layer: "GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN",
        apiKey: keyIgn
    }, {
        opacity: 0.25
    }).addTo(map);
    L.geoportalLayer.WMTS({
        layer: "GEOGRAPHICALGRIDSYSTEMS.MAPS",
        apiKey: keyIgn
    }, {
        opacity: 0.25
    }).addTo(map);

    // Add controls
    // Mini-map
    var miniMapLayer = L.geoportalLayer.WMTS({
        layer: "GEOGRAPHICALGRIDSYSTEMS.MAPS",
        apiKey: keyIgn
    });
    var miniMap = new L.Control.MiniMap(miniMapLayer, {
        'position': 'bottomleft',
        'zoomLevelOffset': -4
    }).addTo(map);
    var layerSwitcher = L.geoportalControl.LayerSwitcher({
        collapsed : false
    });
    map.addControl(layerSwitcher);
    layerSwitcher.setVisibility(slopes, false);

    map.addControl(L.control.scale({
        'imperial': false,
        'position': 'bottomright'
    }));

    var closeLoop = L.easyButton({
        states: [{
            stateName: 'loaded',
            icon: 'fa-magic',
            title: 'Fermer la boucle',
            onClick: function(btn, map) {
                if (markers.length > 1) {
                    var first = markers[0];
                    addMarker({
                        latlng: first.getLatLng()
                    });
                }
            }
        }, {
            stateName: 'computing',
            icon: 'fa-spinner fa-pulse',
            title: 'Fermer la boucle (calcul en cours...)'
        }]
    }).addTo(map);
    var exportPopup = L.popup().setContent('<input type="text" value="nom" class="export-filename"/><br/><button class="export-gpx-button"><span class="ico gpx"></span></button><button class="export-kml-button"><span class="ico kml"></span></button>');
    var exportButton = L.easyButton({
        states: [{
            stateName: 'loaded',
            icon: 'fa-cloud-download',
            title: 'Exporter',
            onClick: function(btn, map) {
                exportPopup.setLatLng(markers[0].getLatLng()).openOn(map);
                var o = this;
                $(".export-gpx-button:visible").click(function() {
                    var btn = $(this);
                    btn.attr("disabled", "disabled");
                    $.when(exportGpx($(".export-filename:visible").val())).then(function() {
                        btn.removeAttr("disabled");
                    });
                });
                $(".export-kml-button:visible").click(function() {
                    var btn = $(this);
                    btn.attr("disabled", "disabled");
                    $.when(exportKml($(".export-filename:visible").val())).then(function() {
                        btn.removeAttr("disabled");
                    });
                });
            }
        }, {
            stateName: 'computing',
            icon: 'fa-spinner fa-pulse',
            title: 'Exporter (calcul en cours...)'
        }]
    }).addTo(map);
    var infoPopup = L.popup().setContent(L.DomUtil.get("about"));
    var infoButton = L.easyButton({
        position: 'bottomright',
        states: [{
            icon: 'fa-info-circle',
            onClick: function(btn, map) {
                infoPopup.setLatLng(map.getCenter()).openOn(map);
            },
            title: 'A propos & crédits'
        }]
    }).addTo(map);

    var welcomePopup = L.popup().setContent(L.DomUtil.get("welcome"));
    welcomePopup.setLatLng(map.getCenter()).openOn(map);

    // Map interactions
    map.on('dblclick', addMarker);


    // Logic
    function updateButtons(enabled) {
        if (enabled) {
            closeLoop.state('loaded');
            exportButton.state('loaded');
            if (markers.length > 1) {
                closeLoop.enable();
                exportButton.enable();
            } else {
                closeLoop.disable();
                exportButton.disable();
            }
        } else {
            closeLoop.state('computing');
            exportButton.state('computing');
            closeLoop.disable();
            exportButton.disable();
        }
    }
    updateButtons(true);

    function latlngToTilePixel(latlng, crs, zoom, tileSize, pixelOrigin) {
        const layerPoint = crs.latLngToPoint(latlng, zoom).floor()
        const tile = layerPoint.divideBy(tileSize).floor()
        const tileCorner = tile.multiplyBy(tileSize).subtract(pixelOrigin)
        const tilePixel = layerPoint.subtract(pixelOrigin).subtract(tileCorner)
        return [tile, tilePixel];
    }

    function computeRoute(start, end, index) {
        return $.Deferred(function() {
            var self = this;
            if (index === undefined) index = -1; // push to the end
            var options = {
                distanceUnit: "m",
                endPoint: {
                    x: end.lng,
                    y: end.lat
                },
                exclusions: [],
                geometryInInstructions: true,
                graph: "Pieton",
                routePreferences: "fastest",
                startPoint: {
                    x: start.lng,
                    y: start.lat
                },
                viaPoints: [],
                apiKey: keyIgn,
                onSuccess: function(results) {
                    if (results) {
                        var geojson = L.geoJSON([], {
                            color: "#ED7F10",
                            weight: 5,
                            opacity: 0.75
                        }).addTo(map);

                        var _geometry = {
                            type: "FeatureCollection",
                            features: []
                        };
                        var counter = 1;
                        $.each(results.routeInstructions, function(idx, instructions) {
                            counter++;
                            _geometry.features.push({
                                id: counter,
                                type: "Feature",
                                geometry: instructions.geometry
                            });
                        });
                        geojson.addData(_geometry);

                        if (index == -1) {
                            // Adding route at the end
                            routes.push(geojson);
                        } else {
                            // Replace route at index
                            routes[index] = geojson;
                        }

                        var promises = fetchAltitudeOfFeature(geojson).concat(fetchSlopeOfFeature(geojson));
                        // Resolve this deffered when all altitudes+slopes are computed
                        $.when.apply($, promises).then(function() {
                            geojson.eachLayer(function(layer) {
                                $.each(layer.feature.geometry.coordinates, function(j, coords) {
                                    if (coords[0] + '/' + coords[1] in altitudes) {
                                        coords[2] = altitudes[coords[0] + '/' + coords[1]]; // updates ref
                                    }
                                    if (coords[0] + '/' + coords[1] in slopes) {
                                        coords[3] = slopes[coords[0] + '/' + coords[1]]; // updates ref
                                    }
                                });
                            });
                            replot().then(function() {
                                self.resolve();
                            });
                        });
                    }
                },
                onFailure: function(error) {
                    console.log(error.message);
                    self.resolve();
                }
            };
            Gp.Services.route(options);
        });
    }

    function addMarker(e) {
        updateButtons(false); // Disabled while computations
        var promises = [];

        var marker = L.marker(e.latlng, {
            riseOnHover: true,
            draggable: true,
        }).bindPopup("<input type='button' value='Supprimer ce marqueur' class='marker-delete-button'/>");
        marker.on("popupopen", function() {
            var o = this;
            $(".marker-delete-button:visible").click(function() {
                map.removeLayer(o); // Routes will be deleted when marker gets deleted
            });
        });
        markers.push(marker);
        marker.addTo(map);

        if (markers.length > 1) {
            // Compute route between this new marker and the previous one
            var markerIndex = markers.length - 1;
            var start = markers[markerIndex - 1].getLatLng(); // previous
            var end = markers[markerIndex].getLatLng(); // this
            promises.push(computeRoute(start, end)); // should be inserted at index markerIndex-1
        }

        marker.on('moveend', function(event) {
            // Update routes when moving this marker
            updateButtons(false);
            var promises = [];

            var markerIndex = markers.indexOf(event.target);
            if (markerIndex > -1 && routes.length > 0) {
                if (markerIndex < markers.length - 1) {
                    // Re-compute route starting at this marker
                    var routeFrom = routes[markerIndex];

                    map.removeLayer(routeFrom);

                    var start = markers[markerIndex].getLatLng();
                    var end = markers[markerIndex + 1].getLatLng();
                    promises.push(computeRoute(start, end, markerIndex));
                }

                if (markerIndex > 0) {
                    // Re-compute route ending at this marker
                    var routeTo = routes[markerIndex - 1];

                    map.removeLayer(routeTo);

                    var start = markers[markerIndex - 1].getLatLng();
                    var end = markers[markerIndex].getLatLng();
                    promises.push(computeRoute(start, end, markerIndex - 1));
                }
            }

            $.when.apply($, promises).then(function() {
                updateButtons(true);
            });
        });

        marker.on('remove', function(event) {
            // Remove/update routes when removing this marker
            updateButtons(false);
            var promises = [];

            var markerIndex = markers.indexOf(event.target);
            if (markerIndex > -1) {
                if (markerIndex == 0) {
                    if (routes.length > 0) {
                        // Remove route starting at this marker
                        var routeFrom = routes[0];

                        map.removeLayer(routeFrom);
                        routes.splice(0, 1);

                        promises.push(replot());
                    }
                } else if (markerIndex == markers.length - 1) {
                    // Remove route ending at this marking
                    var routeTo = routes[markerIndex - 1];

                    map.removeLayer(routeTo);
                    routes.splice(markerIndex - 1, 1);

                    promises.push(replot());
                } else {
                    // Remove route ending at this marker & route starting at this marker
                    var routeTo = routes[markerIndex - 1];
                    var routeFrom = routes[markerIndex];
                    map.removeLayer(routeTo);
                    map.removeLayer(routeFrom);

                    routes.splice(markerIndex, 1); // Remove route starting at this marker

                    // Re-compute new route between previous & next markers
                    var start = markers[markerIndex - 1].getLatLng();
                    var end = markers[markerIndex + 1].getLatLng();
                    promises.push(computeRoute(start, end, markerIndex - 1));
                }
                markers.splice(markerIndex, 1);
            }
            $.when.apply($, promises).then(function() {
                updateButtons(true);
            });
        });

        $.when.apply($, promises).then(function() {
            updateButtons(true);
        });
    }

    function fetchAltitudeOfFeature(geojson) {
        var geometry = []; // Batch
        var promises = [];
        geojson.eachLayer(function(layer) {
            $.each(layer.feature.geometry.coordinates, function(j, coords) {
                if (!(coords[0] + '/' + coords[1] in altitudes)) { // Ignore already cached values
                    geometry.push({
                        lon: coords[0],
                        lat: coords[1]
                    });
                    if (geometry.length == 50) {
                        // Launch batch
                        promises.push(fetchAltitude(geometry));
                        geometry = [];
                    }
                }
            });
        });
        if (geometry.length > 0) {
            // Launch last batch
            promises.push(fetchAltitude(geometry));
        }
        return promises;
    }

    function fetchAltitude(geometry) {
        return $.Deferred(function() {
            var self = this;
            var options = {
                apiKey: keyIgn,
                sampling: geometry.length,
                positions: geometry,
                onSuccess: function(result) {
                    if (result) {
                        $.each(result.elevations, function(i, val) {
                            var key = val.lon + '/' + val.lat;
                            altitudes[key] = val.z;
                        });
                    }
                    self.resolve();
                },
                /** callback onFailure */
                onFailure: function(error) {
                    console.log(error.message);
                    self.resolve();
                }
            };
            // Request altitude service
            Gp.Services.getAltitude(options);
        });
    }

    function fetchSlopeOfFeature(geojson) {
        var tiles = {};
        geojson.eachLayer(function(layer) {
            $.each(layer.feature.geometry.coordinates, function(j, coords) {
                var tile = latlngToTilePixel(L.latLng(coords[1], coords[0]), map.options.crs, 16, 256, map.getPixelOrigin());

                if (!(tile[0].x in tiles))
                    tiles[tile[0].x] = {};
                if (!(tile[0].y in tiles[tile[0].x]))
                    tiles[tile[0].x][tile[0].y] = [];

                tiles[tile[0].x][tile[0].y].push({lat: coords[1], lon: coords[0], z: coords[2], x: tile[1].x, y: tile[1].y});
            });
        });

        var promises = [];
        $.each(tiles, function(x, _y) {
            $.each(_y, function(y, val) {
                promises.push(fetchSlope(x, y, val));
            });
        });
        return promises;
    }

    function fetchSlope(tilex, tiley, coords) {
        return $.Deferred(function() {
            var self = this;

            var data = {
                tilematrix: 16, tilerow: tiley, tilecol: tilex, lon: '', lat: '', x: '', y: ''
            };

            $.each(coords, function(idx, coord) {
                if (idx > 0) {
                    data.lon += '|';
                    data.lat += '|';
                    data.x += '|';
                    data.y += '|';
                }

                data.lon += coord.lon.toString();
                data.lat += coord.lat.toString();
                data.x += coord.x.toString();
                data.y += coord.y.toString();
            });

            $.getJSON("slope.php", data, function (r) {
                if (r.results) {
                    $.each(r.results, function(i, val) {
                        var key = val.lon + '/' + val.lat;
                        slopes[key] = val.slope;
                    });
                }
                self.resolve();
            });
        });
    }

    function exportGpx(filename) {
        return $.Deferred(function() {
            var self = this;
            try {
                var isFileSaverSupported = !! new Blob;
            } catch (e) {}
            if (!isFileSaverSupported) { /* can't check this until Blob polyfill loads above */
                return false;
            }
            var promises = [];
            $.each(routes, function(i, geojson) {
                Array.prototype.push.apply(promises, fetchAltitudeOfFeature(geojson));
            });

            $.when.apply($, promises).then(function() {
                var xml = '<?xml version="1.0"?>\n';
                xml += '<gpx creator="Foobar" version="1.0" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n';
                xml += '    <trk>\n';
                xml += '        <name>' + filename + '</name>\n';
                xml += '        <trkseg>\n';
                $.each(routes, function(i, group) {
                    group.eachLayer(function(layer) {
                        $.each(layer.feature.geometry.coordinates, function(j, coords) {
                            xml += '            <trkpt lat="' + coords[1] + '" lon="' + coords[0] + '">';
                            if (coords[0] + '/' + coords[1] in altitudes) {
                                xml += '<ele>' + altitudes[coords[0] + '/' + coords[1]] + '</ele>';
                            }
                            xml += '</trkpt>\n';
                        });
                    });
                });
                xml += '        </trkseg>\n    </trk>\n</gpx>\n';
                var blob = new Blob([xml], {
                    type: "application/gpx+xml;charset=utf-8"
                });
                saveAs(blob, filename + ".gpx");
                self.resolve();
            });
        });
    }

    function exportKml(filename) {
        return $.Deferred(function() {
            var self = this;
            try {
                var isFileSaverSupported = !! new Blob;
            } catch (e) {}
            if (!isFileSaverSupported) { /* can't check this until Blob polyfill loads above */
                return false;
            }
            var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n';
            xml += '    <Document>\n';
            xml += '        <name>' + filename + '.kml</name>\n';
            xml += '        <Placemark>\n';
            xml += '            <name>' + filename + '</name>\n';
            xml += '            <LineString>\n';
            xml += '                <tessellate>1</tessellate>\n';
            xml += '                <coordinates>\n';
            xml += '                    ';
            $.each(routes, function(i, group) {
                group.eachLayer(function(layer) {
                    $.each(layer.feature.geometry.coordinates, function(j, coords) {
                        xml += coords[0] + ',' + coords[1] + ',0 ';
                    });
                });
            });
            xml += '\n                </coordinates>\n';
            xml += '            </LineString>\n';
            xml += '        </Placemark>\n';
            xml += '    </Document>\n';
            xml += '</kml>\n';
            var blob = new Blob([xml], {
                type: "text/plain;charset=utf-8"
            });
            saveAs(blob, filename + ".kml");
            self.resolve();
        });
    }

    function computeElevationMeasure() {
        var elevations = [];
        $.each(routes, function(i, group) {
            group.eachLayer(function(layer) {
                $.each(layer.feature.geometry.coordinates, function(j, coords) {
                    elevations.push({lat: coords[1], lon: coords[0], z: coords[2], slope: coords[3]});
                });
            });
        });

        if (elevations.length == 0) {
            return elevations;
        }

        var _decimalToRadian = function (location) {
            // from https://github.com/IGNF/geoportal-extensions/blob/master/src/Leaflet/Controls/Utils/PositionFormater.js
            var d = 0.01745329251994329577;
            var multiplier = Math.pow( 10, 8 );
            return Math.round( location * d * multiplier ) / multiplier;
        };

        /** Returns the distance from c1 to c2 using the haversine formula */
        var _haversineDistance = function (c1, c2) {
            var lat1 = _decimalToRadian(c1[1]);
            var lat2 = _decimalToRadian(c2[1]);
            var deltaLatBy2 = (lat2 - lat1) / 2;
            var deltaLonBy2 = _decimalToRadian(c2[0] - c1[0]) / 2;
            var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
            Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
            Math.cos(lat1) * Math.cos(lat2);
            return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        // Calcul de la distance au départ pour chaque point + arrondi des lat/lon
        var distance = 0;
        var altMin = elevations[0];
        var altMax = elevations[0];
        var denivPos = 0;
        var denivNeg = 0;
        elevations[0].dist = 0;
        elevations[0].slopeOnTrack = 0;

        var elevationsResampled = [];
        elevationsResampled.push(elevations[0]);

        var j=0;
        for (var i = 1; i < elevations.length; i++) {
            var localDistance = _haversineDistance([elevations[i].lon, elevations[i].lat], [elevationsResampled[j].lon, elevationsResampled[j].lat]); // m
            if (localDistance > 10) {
                distance += localDistance / 1000;   // km

                elevationsResampled.push(elevations[i]);
                j++;

                elevationsResampled[j].dist = distance;
                elevationsResampled[j].slopeOnTrack = Math.atan((Math.round(elevationsResampled[j].z) - Math.round(elevationsResampled[j-1].z)) / localDistance) * 180 / Math.PI;

                if (j > 5) {
                    var previous = (elevationsResampled[j-5].slopeOnTrack + elevationsResampled[j-4].slopeOnTrack + elevationsResampled[j-3].slopeOnTrack + elevationsResampled[j-2].slopeOnTrack + elevationsResampled[j-1].slopeOnTrack) / 5
                    elevationsResampled[j].slopeOnTrack = (previous + elevationsResampled[j].slopeOnTrack) / 2;
                }

                if (elevationsResampled[j].z < altMin.z)
                    altMin = elevationsResampled[j];
                if (elevationsResampled[j].z > altMax.z)
                    altMax = elevationsResampled[j];

                if (elevationsResampled[j].z < elevationsResampled[j-1].z)
                    denivNeg += (Math.round(elevationsResampled[j-1].z) - Math.round(elevationsResampled[j].z));
                else
                    denivPos += (Math.round(elevationsResampled[j].z) - Math.round(elevationsResampled[j-1].z));
            }
        }

        $("#data-distance").text(Math.round(distance*100)/100 + "km");
        $("#data-alt-min").text(Math.round(altMin.z) + "m");
        $("#data-alt-max").text(Math.round(altMax.z) + "m");
        $("#data-deniv-pos").text(Math.round(denivPos) + "m");
        $("#data-deniv-neg").text(Math.round(denivNeg) + "m");

        return elevationsResampled;
    }

    var plotMarker = null;

    var ctx = $("#chart");
    var chart = new Chart(ctx, {
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
        },{
            label: 'Pente de l\'itinéraire',
            data: [],
            fill: true,
            //lineTension: 0,
            pointRadius: 0,
            yAxisID: 'slope'
        },{
            label: 'Pente',
            data: [],
            fill: true,
            //lineTension: 0,
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
            onHover: function(event, active) {
                if (event.type == "mousemove") {
                    if (active && active.length > 0) {
                        var idx = active[0]._index;
                        var item = chart.config.data.datasets[0].data[idx];

                        if (plotMarker == null) {
                            plotMarker = L.marker(L.latLng(item.lat, item.lon), {
                                icon : new L.Icon.Default("orange"),
                                draggable : false,
                                clickable : false,
                                zIndexOffset : 1000
                            });

                            plotMarker.addTo(map);
                        } else {
                            plotMarker.setLatLng(L.latLng(item.lat, item.lon));
                            plotMarker.update();
                        }
                    } else {
                        if (plotMarker) {
                            map.removeLayer(plotMarker);
                            plotMarker = null;
                        }
                    }
                } else if (event.type == "mouseout") {
                    if (plotMarker) {
                        map.removeLayer(plotMarker);
                        plotMarker = null;
                    }
                }
            }
        },
        scales: {
            xAxes: [{
                type: 'linear',
                position: 'bottom',
                min: 0
            }],
            yAxes: [{
                id: 'alt',
                type: 'linear',
                position: 'left',
              }, {
                id: 'slope',
                type: 'linear',
                position: 'right'
              }, {
                id: 'slope2',
                type: 'linear',
                position: 'right',
                min: 0,
                max: 45
              }]
        },
        legend: {
            position: 'left'
        },
        tooltips: {
            mode: 'index',
            intersect: false,
            callbacks: {
                title: function(tooltipItems, data) {
                    return 'Distance: ' + Math.floor(tooltipItems[0].xLabel*100)/100 + "km";
                },
                label: function(tooltipItems, data) {
                    return data.datasets[tooltipItems.datasetIndex].label +': ' + (tooltipItems.datasetIndex == 0 ? Math.round(tooltipItems.yLabel*100)/100 + 'm' : Math.round(tooltipItems.yLabel) + '°');
                }
            }

        }
    }
    });
    function replot() {
        return $.Deferred(function() {
            var self = this;
            var elevations = computeElevationMeasure();

            var data = [];
            var data2 = [];
            var data3 = [];
            var maxSlope = 0;
            var minSlope = 0;
            for (var j = 0 ; j < elevations.length; j++) {
                data.push({x: elevations[j].dist, y: elevations[j].z, lat: elevations[j].lat, lon: elevations[j].lon});
                data2.push({x: elevations[j].dist, y: elevations[j].slopeOnTrack, lat: elevations[j].lat, lon: elevations[j].lon});
                data3.push({x: elevations[j].dist, y: elevations[j].slope, lat: elevations[j].lat, lon: elevations[j].lon});

                if (elevations[j].slopeOnTrack > maxSlope)
                    maxSlope = elevations[j].slopeOnTrack;
                if (elevations[j].slopeOnTrack < minSlope)
                    minSlope = elevations[j].slopeOnTrack;
            }
            if (data.length > 0) {
                chart.options.scales.xAxes[0].max = data[data.length-1].x;
                chart.config.data.datasets[0].data = data;
                chart.config.data.datasets[1].data = data2;
                chart.config.data.datasets[2].data = data3;

                var gradient = document.getElementById('chart').getContext('2d').createLinearGradient(0, 0, 0, 125);
                maxSlope = Math.ceil(maxSlope/10)*10;
                minSlope = Math.floor(minSlope/10)*10;

                var totalSlope = -minSlope + maxSlope;

                if (maxSlope >= 45) {
                    gradient.addColorStop((maxSlope-45)/totalSlope, 'purple');
                }
                if (maxSlope >= 40) {
                    gradient.addColorStop((maxSlope-40)/totalSlope, 'red');
                }
                if (maxSlope >= 35) {
                    gradient.addColorStop((maxSlope-35)/totalSlope, 'orange');
                }
                if (maxSlope >= 30) {
                    gradient.addColorStop((maxSlope-30)/totalSlope, 'yellow');
                }

                gradient.addColorStop(maxSlope/totalSlope, 'grey');

                if (minSlope <= -30) {
                    gradient.addColorStop((maxSlope+30)/totalSlope, 'yellow');
                }
                if (minSlope <= -35) {
                    gradient.addColorStop((maxSlope+35)/totalSlope, 'orange');
                }
                if (minSlope <= -40) {
                    gradient.addColorStop((maxSlope+40)/totalSlope, 'red');
                }
                if (minSlope <= -45) {
                    gradient.addColorStop((maxSlope+45)/totalSlope, 'purple');
                }
                chart.config.data.datasets[1].backgroundColor = gradient;


                var gradient2 = document.getElementById('chart').getContext('2d').createLinearGradient(0, 0, 0, 125);
                gradient2.addColorStop(0, 'purple');
                gradient2.addColorStop(1-40/45, 'red');
                gradient2.addColorStop(1-35/45, 'orange');
                gradient2.addColorStop(1-30/45, 'yellow');
                gradient2.addColorStop(1, 'grey');
                chart.config.data.datasets[2].backgroundColor = gradient2;
            } else {
                chart.options.scales.xAxes[0].max = 1;
                chart.config.data.datasets[0].data = [];
                chart.config.data.datasets[1].data = [];
                chart.config.data.datasets[2].data = [];
            }
            chart.update();
            self.resolve();
        });
    }
    replot();
}
