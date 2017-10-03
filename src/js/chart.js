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

                for (let j = 0; j < data.size; j++) {
                    series1.push({ x: data.elevations[j].dist, y: data.elevations[j].z, lat: data.elevations[j].lat, lng: data.elevations[j].lng });
                    series2.push({ x: data.elevations[j].dist, y: data.elevations[j].slopeOnTrack, lat: data.elevations[j].lat, lng: data.elevations[j].lng });
                    series3.push({ x: data.elevations[j].dist, y: data.elevations[j].slope, lat: data.elevations[j].lat, lng: data.elevations[j].lng });
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
                const maxSlope = Math.ceil(data.total.slopeMax / 10) * 10;
                const minSlope = Math.floor(data.total.slopeMin / 10) * 10;

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

            data.annotations = Array.concat([
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
            ], data.annotations);

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
                    }

                    elevations = elevations.concat(e);
                    total.distance += route.getDistance();

                    total.altMin = Math.min(total.altMin, route.getAltMin());
                    total.altMax = Math.max(total.altMax, route.getAltMax());

                    total.slopeMax = Math.max(total.slopeMax, route.getSlopeMax());
                    total.slopeMin = Math.min(total.slopeMin, route.getSlopeMin());

                    total.denivNeg += route.getDenivNeg();
                    total.denivPos += route.getDenivPos();

                    // Compute stats on current step
                    local.distance += route.getDistance();

                    local.altMin = Math.min(local.altMin, route.getAltMin());
                    local.altMax = Math.max(local.altMax, route.getAltMax());

                    local.slopeMax = Math.max(local.slopeMax, route.getSlopeMax());
                    local.slopeMin = Math.min(local.slopeMin, route.getSlopeMin());

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
