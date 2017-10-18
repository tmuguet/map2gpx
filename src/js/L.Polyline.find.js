L.polyline_findAuto = function (startLatLng, endLatLng) {
    return $.Deferred(function () {
        const deferred = this;  // jscs:ignore safeContextKeyword

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
                    const latlngs = [];
                    $.each(results.routeInstructions, function (idx, instructions) {
                        $.each(instructions.geometry.coordinates, function (j, coords) {
                            latlngs.push(L.latLng(coords[1], coords[0]));
                        });
                    });

                    const geojson = L.polyline(latlngs);

                    deferred.resolveWith({ geojson });
                } else {
                    deferred.rejectWith({ error: 'Impossible d\'obtenir la route: pas de résultats fournis' });
                }
            },
            onFailure: function (error) {
                deferred.rejectWith({ error: 'Impossible d\'obtenir la route: ' + error.message });
            },
        };
        Gp.Services.route(options);
    });
};

L.polyline_findStraight = function (startLatLng, endLatLng, interval = 10) {
    const c1 = startLatLng.roundE8();
    const c2 = endLatLng.roundE8();
    const d = c1.distanceTo(c2);
    const azimuth = c1.bearingTo(c2);

    const latlngs = [c1];

    for (let counter = interval; counter < d; counter += interval) {
        latlngs.push(c1.getDestinationAlong(azimuth, counter));
    }

    latlngs.push(c2);

    return L.polyline(latlngs);
};
