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
                    prefix: 'fa',
                }),
                draggable: false,
                clickable: false,
                zIndexOffset: 1000,
            },

            showSlope: true,
            showTerrainSlope: true,
        },

        _create: function () {
            if (this.options.map === undefined)
                throw '"map" option cannot be undefined';

            this.$emptyElement = $(this.options.dataEmpty);

            const _this = this;

            if (!this.options.isSmallScreen) {
                this.$chart = $('<canvas width="100%" height="100%"></canvas>').appendTo(this.element);

                const datasets = [
                    {
                        label: 'Altitude',
                        data: [],
                        fill: false,
                        borderColor: 'rgba(12, 98, 173, 0.8)',
                        backgroundColor: 'rgba(12, 98, 173, 0.8)',
                        lineTension: 0,
                        pointRadius: 0,
                        yAxisId: 'alt',
                    },
                ];
                const yAxes = [
                    {
                        id: 'alt',
                        type: 'linear',
                        position: 'left',
                        beginAtZero: false,
                    },
                ];

                if (this.options.showSlope) {
                    this.slopeIdx = datasets.length;
                    datasets.push({
                        label: 'Pente de l\'itinéraire',
                        data: [],
                        fill: true,
                        pointRadius: 0,
                        yAxisID: 'slope',
                    });
                    yAxes.push({
                        id: 'slope',
                        type: 'linear',
                        position: 'right',
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
                        hidden: true,
                    });
                    yAxes.push({
                        id: 'slope2',
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            min: 0,
                            max: 45,
                        },
                    });
                }

                var hover = {};
                if (this.options.showMarker) {
                    hover = {
                        mode: 'index',
                        intersect: false,
                        onHover: ((event, active) => this._onHover(event, active)),
                    };
                }

                this.chartjs = new Chart(this.$chart, {
                    type: 'line',
                    data: {
                        datasets: datasets,
                    },
                    options: {
                        maintainAspectRatio: false,
                        onClick: ((event, active) => this._onClick(event, active)),
                        hover: hover,
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
                            yAxes: yAxes,
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
            }
        },

        _onClick: function (event, active) {
            if (active && active.length > 0) {
                const idx = active[0]._index;
                const item = this.chartjs.config.data.datasets[0].data[idx];

                if (item.route) {
                    item.route.openPopup(L.latLng(item.lat, item.lng));
                }
            }
        },

        _onHover: function (event, active) {
            if (event.type == 'mousemove') {
                if (active && active.length > 0) {
                    const idx = active[0]._index;
                    const item = this.chartjs.config.data.datasets[0].data[idx];

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

        _replotSmallScreen: function (data) {
            if (data.size > 0) {
                this.element.html('<ul>' +
                    '<li>Altitude max: ' + Math.round(data.total.altMax) + 'm; D+: ' + Math.round(data.total.denivPos) + 'm</li>' +
                    '<li>Altitude min: ' + Math.round(data.total.altMin) + 'm; D-: ' + Math.round(data.total.denivNeg) + 'm</li>' +
                    '<li>Distance: ' + Math.round(data.elevations[data.size - 1].dist * 100) / 100 + 'km</li></ul>');
            } else {
                this.element.empty();
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
                    series1.push({ x: data.elevations[j].dist, y: data.elevations[j].z, lat: data.elevations[j].lat, lng: data.elevations[j].lng, route: data.elevations[j].route });

                    if (this.options.showSlope) {
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

                        series2.push({ x: data.elevations[j].dist, y: correctedSlopeOnTrack });
                    }

                    if (this.options.showTerrainSlope) {
                        series3.push({ x: data.elevations[j].dist, y: data.elevations[j].slope });
                    }
                }

                const lastIndex = data.size - 1;

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

                    const gradient = this.$chart[0].getContext('2d').createLinearGradient(0, 0, 0, 120);
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

                        this.chartjs.config.data.datasets[this.slopeIdx].backgroundColor = gradient;
                    }
                }

                if (this.options.showTerrainSlope) {
                    this.chartjs.config.data.datasets[this.slopeTerrainIdx].data = series3;

                    const gradient2 = this.$chart[0].getContext('2d').createLinearGradient(0, 0, 0, 120);
                    gradient2.addColorStop(0, 'purple');
                    gradient2.addColorStop(1 - 40 / 45, 'red');
                    gradient2.addColorStop(1 - 35 / 45, 'orange');
                    gradient2.addColorStop(1 - 30 / 45, 'yellow');
                    gradient2.addColorStop(1, 'grey');

                    this.chartjs.config.data.datasets[this.slopeTerrainIdx].backgroundColor = gradient2;
                }

                this.chartjs.options.annotation = {};  // TODO: potential bug with annotations where old 'value' of annotations are kept in graph
                this.chartjs.update();
                this.chartjs.options.annotation = { annotations: data.annotations };
                this.chartjs.update();
            } else {
                this.chartjs.options.scales.xAxes[0].ticks.max = 1;
                for (let i = 0; i < this.chartjs.config.data.datasets.length; i++)
                    this.chartjs.config.data.datasets[i].data = [];
            }
        },

        replot: function (data) {
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
            ];

            $.each(data.steps, ((i, value) => data.annotations.push({
                id: 'distance-' + i,
                type: 'line',
                mode: 'vertical',
                scaleID: 'distance',
                value: value,
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
            })));

            if (isSmallScreen)
                this._replotSmallScreen(data);
            else
                this._replotWideScreen(data);

            if (data.size > 0)
                this.$emptyElement.slideUp();
            else
                this.$emptyElement.slideDown();
        },
    });

})(jQuery);
