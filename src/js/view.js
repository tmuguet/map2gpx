L.Map.include({
    _bindViewEvents: function () {
        this.on('zoomend', function () {
            console.log('Zoomed to ', this.getZoom());
            $.localStorage.set('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
        });

        this.on('moveend', function () {
            console.log('Moved to ', this.getCenter());
            $.localStorage.setAsJSON('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
        });
    },

    _setView: function (view) {
        this.setView([view[0], view[1]], view[2]);
    },

    initView: function () {
        const _this = this;
        return $.Deferred(function () {
            const deferred = this;    // jscs:ignore safeContextKeyword

            let view = $.localStorage.getAsJSON('view') ||
                [44.96777356135154, 6.06822967529297, 13];   // Center in les Ecrins because I love this place

            if (view[2] > 17)
                view[2] = 17;

            if ('lat' in $.QueryString && 'lng' in $.QueryString) {
                view = [$.QueryString.lat, $.QueryString.lng, 15];
            }

            if ('loc' in $.QueryString) {
                // Try to find location
                const options = {
                    text: $.QueryString.loc,
                    filterOptions: { type: ['StreetAddress', 'PositionOfInterest'] },
                    apiKey: keyIgn,
                    onSuccess: function (results) {
                        if (results && 'suggestedLocations' in results && results.suggestedLocations.length > 0) {
                            _this._setView([
                                results.suggestedLocations[0].position.y,
                                results.suggestedLocations[0].position.x,
                                15,
                            ]);
                            deferred.resolveWith(_this);
                        } else {
                            console.log('No results?');
                            _this._setView(view); // Use default view
                            deferred.resolveWith(_this);
                        }
                    },
                    onFailure: function (error) {
                        // Error, or no match
                        console.log(error);
                        _this._setView(view); // Use default view
                        deferred.resolveWith(_this);
                    },
                };
                Gp.Services.autoComplete(options);
            } else {
                _this._setView(view);
                deferred.resolveWith(_this);
            }
        }).done(this._bindViewEvents);  // Bind events when we're done, so we don't store parameters from query string
    },
});
