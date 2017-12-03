
const _interpolateTrackData = function (deferred, coords, coordsLeft, depth) {

    if (coords.length > 500) {
        return $.Deferred(function () {
            const _this = this;
            const coords1 = coords.slice(0, 500);
            const coords2 = coords.slice(499);

            _interpolateTrackData(deferred, coords1, coords2.concat(coordsLeft.slice(1)), depth + 1)
                .done(_this.resolve)
                .fail(_this.reject);
        });
    }

    const l = new L.Polyline(coords);

    if (coords.length < 100) {
        const straight = L.polyline_findStraight(coords[0], coords[coords.length - 1]);

        if (coords.length <= 4 || l.distanceTo(straight) < 10) {
            deferred.notify({ line: straight, count: coords.length - 1 });
            return $.Deferred(function () { this.resolve({ line: straight, mode: 'straight', coordsLeft }); });
        }
    }

    return $.Deferred(function () {
        const _this = this;

        L.polyline_findAuto(coords[0], coords[coords.length - 1])
            .done(function (geojson) {
                const d = l.distanceTo(geojson);
                if (d < 10) {
                    deferred.notify({ line: geojson, count: coords.length - 1 });
                    _this.resolve({ line: geojson, mode: 'auto', coordsLeft });
                } else {
                    const coords1 = coords.slice(0, Math.floor(coords.length / 2) + 1);
                    const coords2 = coords.slice(Math.floor(coords.length / 2));

                    _interpolateTrackData(deferred, coords1, coords2.concat(coordsLeft.slice(1)), depth + 1)
                        .done(_this.resolve)
                        .fail(_this.reject);
                }
            })
            .fail(function () {
                const coords1 = coords.slice(0, Math.floor(coords.length / 2) + 1);
                const coords2 = coords.slice(Math.floor(coords.length / 2));

                _interpolateTrackData(deferred, coords1, coords2.concat(coordsLeft.slice(1)), depth + 1)
                    .done(_this.resolve)
                    .fail(_this.reject);
            });
    });
};

L.polyline_interpolate = function (coords) {
    return $.Deferred(function () {

        const _this = this;
        const lines = [];

        const onDone = function (line) {
            lines.push(line);

            if (line.coordsLeft.length > 0) {
                _interpolateTrackData(_this, line.coordsLeft, [], 0)
                    .done(onDone)
                    .fail(_this.reject);
            } else {
                _this.resolve(lines);
            }
        };

        _interpolateTrackData(this, coords, [], 0)
            .done(onDone)
            .fail(this.reject);
    });
};
