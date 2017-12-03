
const _interpolateTrackData = function (deferred, coords, coordsLeft, depth) {

    // Avoid interpolating when too long
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

    if (coords.length <= 4) {
        // We'll not be able to interpolate (came down to too few samples); just find a straight line and use it
        const straight = L.polyline_findStraight(coords[0], coords[coords.length - 1]);
        deferred.notify({ line: straight, count: coords.length - 1 });
        return $.Deferred(function () { this.resolve({ line: straight, mode: 'straight', coordsLeft, count: coords.length }); });
    }

    return $.Deferred(function () {
        const _this = this;

        L.polyline_findAuto(coords[0], coords[coords.length - 1])
            .done(function (geojson) {
                var found = false;
                const haversineDistance = coords[0].distanceTo(coords[coords.length - 1]);
                const threshold = Math.max(10, 2 * haversineDistance / 100);

                if (l.distanceTo(geojson) < threshold) {
                    // Found it
                    deferred.notify({ line: geojson, count: coords.length - 1 });
                    _this.resolve({ line: geojson, mode: 'auto', coordsLeft, count: coords.length });
                    found = true;
                } else if (coords.length < 100) {
                    // Test if straight line is better
                    const straight = L.polyline_findStraight(coords[0], coords[coords.length - 1]);
                    if (l.distanceTo(straight) < threshold) {
                        // Found it
                        deferred.notify({ line: straight, count: coords.length - 1 });
                        _this.resolve({ line: straight, mode: 'straight', coordsLeft, count: coords.length });
                        found = true;
                    }
                }

                if (!found) {
                    // Could not find; interpolate on half of the track
                    const coords1 = coords.slice(0, Math.floor(coords.length / 2) + 1);
                    const coords2 = coords.slice(Math.floor(coords.length / 2));    // and concatenate rest of the track to the pending coordinates

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
                // Still some paths to interpolate.

                // Don't try to interpolate the whole line.coordsLeft thing (usually won't work), use previously path found
                const sizeToInterpolate = Math.min(line.count * 3, line.coordsLeft.length);
                const coords1 = line.coordsLeft.slice(0, sizeToInterpolate + 1);
                const coords2 = line.coordsLeft.slice(sizeToInterpolate);

                _interpolateTrackData(_this, coords1, coords2, 0)
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
