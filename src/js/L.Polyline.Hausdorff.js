L.Polyline.include({
    distanceTo: function (o) {
        const xLatLng = this.getLatLngsFlatten();
        const yLatLng = o.getLatLngsFlatten();

        const distances = {};

        const sizeX = xLatLng.length;
        const sizeY = yLatLng.length;

        var supX = Number.MIN_VALUE;
        var supY = Number.MIN_VALUE;

        for (let x = 0; x < sizeX; x++) {
            var infY = Number.MAX_VALUE;
            for (let y = 0; y < sizeY; y++) {
                distances[x + '/' + y] = xLatLng[x].distanceTo(yLatLng[y]);
                if (distances[x + '/' + y] < infY)
                    infY = distances[x + '/' + y];
            }

            if (infY > supX)
                supX = infY;
        }

        for (let y = 0; y < sizeY; y++) {
            var infX = Number.MAX_VALUE;
            for (let x = 0; x < sizeX; x++) {
                if (distances[x + '/' + y] < infX)
                    infX = distances[x + '/' + y];
            }

            if (infX > supY)
                supY = infX;
        }

        return Math.max(supX, supY);
    },
});
