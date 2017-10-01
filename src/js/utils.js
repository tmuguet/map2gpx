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
