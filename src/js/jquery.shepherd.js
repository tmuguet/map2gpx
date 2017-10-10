(function ($) {
    const tutorials = [];

    $.Shepherd = {};
    $.Shepherd.Step = function () {
        var _name;
        var _shepherd;
        var _opts;

        var init = function (name, settings) {
            _name = name;
            _opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
            });
            return this;
        };

        return {
            init,
        };
    };

    $.Shepherd.step = function (name, settings) {
        return $.Shepherd.Step().init(name, settings);
    };

    $.Shepherd.Tour = function () {
        var _tour;
        var _steps = 0;

        const init = function (settings) {
            const opts = $.extend({}, settings, {
                defaults: {
                    classes: 'shepherd-element shepherd-open shepherd-theme-arrows',
                    showCancelLink: true,
                },
            });
            _tour = new Shepherd.Tour(opts);
            return this;
        };

        const add = function (name, settings) {
            const currentStep = _steps;

            const opts = $.extend({}, settings, {
                classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
            });

            opts.buttons = [
                {
                    text: 'Fermer',
                    classes: 'shepherd-button-secondary',
                    action: () => {
                        $.localStorage.set('tutorial' + tutorials.indexOf(this), -1);
                        this.cancel();
                    },
                }, {
                    text: 'Suivant',
                    classes: 'shepherd-button-example-primary',
                    action: () => {
                        const currentShepherdIndex = tutorials.indexOf(this);

                        if (currentShepherdIndex < 0)
                            console.log('Could not find current shepherd, something is probably wrong');

                        $.localStorage.set('tutorial' + currentShepherdIndex, currentStep + 1);   // Restore next step

                        this.next();

                        if (currentStep == _steps - 1) {
                            // Last step of current tutorial
                            if (currentShepherdIndex >= 0 && currentShepherdIndex < tutorials.length - 1) {
                                // Another tutorial is available, start it
                                tutorials[currentShepherdIndex + 1].start(true);
                            }
                        }
                    },
                },
            ];

            _tour.addStep(name, opts);
            _steps++;
            return this;
        };

        const start = function (forceShow = false) {
            var id = 0;

            if (!forceShow) {
                const currentShepherdIndex = tutorials.indexOf(this);
                if ($.localStorage.get('tutorial' + currentShepherdIndex) !== null) {
                    id = parseInt($.localStorage.get('tutorial' + currentShepherdIndex));
                }
            }

            if (id >= 0 && id < _steps) {
                _tour.show(id);
            }

            return this;
        };

        const cancel = function () {
            _tour.cancel();
            return this;
        };

        const next = function () {
            _tour.next();
            return this;
        };

        return {
            init,
            add,
            start,
            cancel,
            next,
        };
    };

    $.Shepherd.tour = function (settings) {
        const tour = $.Shepherd.Tour().init(settings);
        tutorials.push(tour);
        return tour;
    };

    $.Shepherd.get = function (idx) {
        return tutorials[idx];
    };

    $.Shepherd.has = function (idx) {
        return (tutorials.length > idx);
    };

})(jQuery);
