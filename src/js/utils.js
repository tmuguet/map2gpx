L.Handler.include({
    setEnabled: function (enabled) {
        if (enabled)
            this.enable();
        else
            this.disable();
    },
});

L.Control.EasyButton.include({
    setEnabled: function (enabled) {
        if (enabled)
            this.enable();
        else
            this.disable();
    },
});

L.Polyline.include({
    getLatLngsFlatten: function () {
        const latlngs = this.getLatLngs();

        if (latlngs.length > 0 && Array.isArray(latlngs[0])) {
            var result = [];
            $.each(latlngs, function (j, array) {
                result = result.concat(array);
            });

            return result;
        } else {
            return latlngs;
        }
    },
});
