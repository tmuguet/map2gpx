(function ($) {
    $.widget('map2gpx.progress', {
        options: {
            progress: 0,
            total: 0,
            started: false,
        },

        _create: function () {
            this.element.append('<h2><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br/>' +
                '<strong><span class="data-computing-progress"></span> <small>- <span class="data-computing-status">Calculs en cours...</span></small></strong>' +
                '<div class="data-computing-progressbar-container"><div class="data-computing-progressbar"></div></div></h2>');

            this.$h2 = this.element.find('h2');
            this.$progress = this.element.find('.data-computing-progress');
            this.$progressbar = this.element.find('.data-computing-progressbar');
            this.$status = this.element.find('.data-computing-status');

            if (this.options.started)
                this.start();
        },

        _buildEventData: function () {
            return { started: this.options.started };
        },

        start: function () {
            if (!this.options.started) {
                // Reset
                this.options.progress = 0;
                this.options.total = 0;
            }

            this.options.started = true;
            this.update({ start: true, total: 1, status: 'Calculs en cours...' });

            this._trigger('statechanged', null, this._buildEventData());
            this._trigger('started', null, {});
        },

        stop: function () {
            this.options.started = false;
            this.update({ end: true, status: 'Finalisation...' });

            this._trigger('statechanged', null, this._buildEventData());
            this._trigger('stopped', null, {});
        },

        started: function (started) {
            if (started === undefined) {
                return this.options.started;
            }

            if (started)
                this.start();
            else
                this.stop();
        },

        update: function (progress) {
            if (Array.isArray(progress)) {
                const _this = this;
                $.each(progress, function () {
                    _this._update(this);
                });
            } else {
                this._update(progress);
            }

            this._display();
        },

        _update: function (progress) {
            if (progress.start) {
                this.options.total += progress.total;
            } else if (progress.end) {
                this.options.progress = this.options.total;
            } else if (progress.count) {
                this.options.progress += progress.count;
            } else {
                this.options.progress++;
            }

            if ('status' in progress && progress.status)
                this.$status.text(progress.status);
            if ('step' in progress && progress.step)
                $('<div><small>' + progress.step + '</small></div>').insertAfter(this.$h2).fadeOut(400, function () {$(this).remove();});
        },

        _display: function () {
            let p = 1;
            if (this.options.total > 0)
                p = this.options.progress / this.options.total;

            this.$progress.text(Math.round(p * 100) + '%');
            this.$progressbar.css('width', Math.round(p * 100) + '%');

            if (Math.round(p * 100) == 42)
                $('<div><small>La grande question sur la vie, l\'univers et le reste répondue</small></div>').insertAfter(this.$h2).fadeOut(400, function () {$(this).remove();});
        },
    });
})(jQuery);
