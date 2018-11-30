/* global L */

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

      labelAltitude: 'Altitude',
      labelSlope: "Pente de l'itinéraire",
      labelTerrainSlope: 'Pente du terrain',
      labelDistance: 'Distance',
      labelAltitudeMax: 'Altitude max',
      labelHeightDiffUp: 'D+',
      labelAltitudeMin: 'Altitude min',
      labelHeightDiffDown: 'D-',
    },

    _create() {
      if (this.options.map === undefined) throw new Error('"map" option cannot be undefined');

      this.$emptyElement = $(this.options.dataEmpty);

      if (!this.options.isSmallScreen) {
        this.$chart = $('<canvas width="100%" height="100%"></canvas>').appendTo(this.element);

        const datasets = [
          {
            label: this.options.labelAltitude,
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
            label: this.options.labelSlope,
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
            label: this.options.labelTerrainSlope,
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

        let hover = {};
        if (this.options.showMarker) {
          hover = {
            mode: 'index',
            intersect: false,
            onHover: (event, active) => this._onHover(event, active),
          };
        }

        this.chartjs = new Chart(this.$chart, {
          type: 'line',
          data: {
            datasets,
          },
          options: {
            maintainAspectRatio: false,
            onClick: (event, active) => this._onClick(event, active),
            hover,
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
              yAxes,
            },
            legend: {
              position: 'left',
            },
            tooltips: {
              mode: 'index',
              intersect: false,
              callbacks: {
                title: tooltipItems => `${this.options.labelDistance}: ${Math.floor(tooltipItems[0].xLabel * 100) / 100}km`,
                label: (tooltipItems, data) => `${data.datasets[tooltipItems.datasetIndex].label}: ${
                  tooltipItems.datasetIndex == 0
                    ? `${Math.round(tooltipItems.yLabel * 100) / 100}m`
                    : `${Math.round(tooltipItems.yLabel)}°`
                }`,
              },
            },
            annotation: {
              annotations: [],
            },
          },
        });
      }
    },

    _onClick(event, active) {
      if (active && active.length > 0) {
        const idx = active[0]._index;
        const item = this.chartjs.config.data.datasets[0].data[idx];

        if (item.route) {
          item.route.openPopup(L.latLng(item.lat, item.lng));
        }
      }
    },

    _onHover(event, active) {
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
        } else if (this.plotMarker) {
          this.options.map.removeLayer(this.plotMarker);
          this.plotMarker = null;
        }
      } else if (event.type == 'mouseout') {
        if (this.plotMarker) {
          this.options.map.removeLayer(this.plotMarker);
          this.plotMarker = null;
        }
      }
    },

    _replotSmallScreen(data) {
      if (data.size > 0) {
        this.element.html(
          `${'<ul>' + '<li>Altitude max: '}${Math.round(data.total.altMax)}m; D+: ${Math.round(
            data.total.denivPos,
          )}m</li>`
            + `<li>Altitude min: ${Math.round(data.total.altMin)}m; D-: ${Math.round(data.total.denivNeg)}m</li>`
            + `<li>Distance: ${Math.round(data.elevations[data.size - 1].dist * 100) / 100}km</li></ul>`,
        );
      } else {
        this.element.empty();
      }
    },

    _replotWideScreen(stats, annotations) {
      const series1 = [];
      const series2 = [];
      const series3 = [];

      let maxSlope = 0;
      let minSlope = 0;

      const latlngs = stats.getLatLngs();
      const size = latlngs.length;

      if (size > 0) {
        for (let j = 0; j < size; j++) {
          series1.push({
            x: latlngs[j].dist,
            y: latlngs[j].z,
            lat: latlngs[j].lat,
            lng: latlngs[j].lng,
          });

          if (this.options.showSlope) {
            if (latlngs[j].slopeOnTrack > maxSlope) maxSlope = latlngs[j].slopeOnTrack;
            if (latlngs[j].slopeOnTrack < minSlope) minSlope = latlngs[j].slopeOnTrack;

            series2.push({ x: latlngs[j].dist, y: latlngs[j].slopeOnTrack });
          }

          if (this.options.showTerrainSlope) {
            series3.push({ x: latlngs[j].dist, y: latlngs[j].slope });
          }
        }

        const lastIndex = size - 1;

        this.chartjs.options.scales.xAxes[0].ticks.max = series1[lastIndex].x;
        this.chartjs.config.data.datasets[0].data = series1;
        annotations[0].value = stats.getAltMax();
        annotations[0].label.content = `${this.options.labelAltitudeMax}: ${Math.round(stats.getAltMax())}m; ${
          this.options.labelHeightDiffUp
        }: ${Math.round(stats.getHeightDiffUp())}m`;
        annotations[1].value = stats.getAltMin();
        annotations[1].label.content = `${this.options.labelAltitudeMin}: ${Math.round(stats.getAltMin())}m; ${
          this.options.labelHeightDiffDown
        }: ${Math.round(stats.getHeightDiffDown())}m`;
        annotations[2].value = series1[lastIndex].x;
        annotations[2].label.content = `${this.options.labelDistance}: ${Math.round(series1[lastIndex].x * 100)
          / 100}km`;

        if (this.options.showSlope) {
          this.chartjs.config.data.datasets[this.slopeIdx].data = series2;

          const gradient = this.$chart[0].getContext('2d').createLinearGradient(0, 0, 0, 120);
          maxSlope = Math.ceil(maxSlope / 10) * 10;
          minSlope = Math.floor(minSlope / 10) * 10;

          const totalSlope = -minSlope + maxSlope;
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

          const gradient2 = this.$chart[0].getContext('2d').createLinearGradient(0, 0, 0, 120);
          gradient2.addColorStop(0, 'purple');
          gradient2.addColorStop(1 - 40 / 45, 'red');
          gradient2.addColorStop(1 - 35 / 45, 'orange');
          gradient2.addColorStop(1 - 30 / 45, 'yellow');
          gradient2.addColorStop(1, 'grey');

          this.chartjs.config.data.datasets[this.slopeTerrainIdx].backgroundColor = gradient2;
        }

        this.chartjs.options.annotation = {}; // TODO: potential bug with annotations where old 'value' of annotations are kept in graph
        this.chartjs.update();
        this.chartjs.options.annotation = { annotations };
        this.chartjs.update();
      } else {
        this.chartjs.options.scales.xAxes[0].ticks.max = 1;
        for (let i = 0; i < this.chartjs.config.data.datasets.length; i++) this.chartjs.config.data.datasets[i].data = [];
      }
    },

    replot(stats, steps) {
      const annotations = [
        {
          id: 'altmax',
          type: 'line',
          mode: 'horizontal',
          scaleID: 'alt',
          value: 0,
          borderColor: 'rgba(12, 173, 98, 0.5)',
          borderWidth: 1,
          label: {
            enabled: true,
            position: 'left',
            backgroundColor: 'rgba(0,0,0,0.4)',
            fontSize: 10,
            fontStyle: 'normal',
            yAdjust: 10,
          },
        },
        {
          id: 'altmin',
          type: 'line',
          mode: 'horizontal',
          scaleID: 'alt',
          value: 0,
          borderColor: 'rgba(12, 173, 98, 0.5)',
          borderWidth: 1,
          label: {
            enabled: true,
            position: 'left',
            backgroundColor: 'rgba(0,0,0,0.4)',
            fontSize: 10,
            fontStyle: 'normal',
            yAdjust: -10,
          },
        },
        {
          id: 'distance',
          type: 'line',
          mode: 'vertical',
          scaleID: 'distance',
          value: 0,
          borderColor: 'rgba(0, 0, 0, 0.5)',
          borderWidth: 1,
          label: {
            enabled: true,
            position: 'left',
            backgroundColor: 'rgba(0,0,0,0.4)',
            fontSize: 10,
            fontStyle: 'normal',
            xAdjust: -50,
          },
        },
      ];

      steps.forEach((value, i) => annotations.push({
        id: `distance-${i}`,
        type: 'line',
        mode: 'vertical',
        scaleID: 'distance',
        value,
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
      }));

      //   if (this.options.isSmallScreen)
      //     this._replotSmallScreen(stats, annotations);
      //   else
      this._replotWideScreen(stats, annotations);

      if (stats.getLatLngs().length > 0) this.$emptyElement.slideUp();
      else this.$emptyElement.slideDown();
    },
  });
}(jQuery));
