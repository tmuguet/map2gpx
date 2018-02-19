(function ($) {
    var queues = 0;
    var listeners = [];

    $.fn.clearCompute = function () {
        return this.each(function () {
            queues -= $(this).queue().length;
            $(this).clearQueue();
            $.Queue.stop();
        });
    };

    $.fn.startCompute = function (cb) {
        return this.each(function () {
            $.Queue.start();
            queues++;
            $(this).queue(cb);
        });
    };

    $.fn.endCompute = function (next) {
        return this.each(function () {
            queues--;
            next();
            $.Queue.stop();
        });
    };

    $.Queue = {
        size: () => queues,
        bindTo: (o) => listeners.push(o),

        start: function () {
            if (queues == 0) {
                $.each(listeners, function () {
                    this.progress('start');
                });
            }
        },

        stop: function () {
            if (queues == 0) {
                $.each(listeners, function () {
                    this.progress('stop');
                });
            }
        },

        notify: function (progress) {
            $.each(listeners, function () {
                this.progress('update', progress);
            });
        },

        failed: function (error) {
            $.each(listeners, function () {
                this.progress('failed', error);
            });
        },
    };

})(jQuery);
