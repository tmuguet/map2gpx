(function ($) {
    var queues = 0;
    var listeners = [];

    $.fn.clearBlockingCompute = function () {
        return this.each(function () {
            queues -= $(this).queue().length;
            $(this).clearQueue();
            $.BlockingQueue.stop();
        });
    };

    $.fn.startBlockingCompute = function (cb) {
        return this.each(function () {
            $.BlockingQueue.start();
            queues++;
            $(this).queue(cb);
        });
    };

    $.fn.endBlockingCompute = function (next) {
        return this.each(function () {
            queues--;
            next();
            $.BlockingQueue.stop();
        });
    };

    $.BlockingQueue = {
        size: () => queues,
        bindTo: (o) => listeners.push(o),

        start: function () {
            if (queues == 0) {
                $.each(listeners, function () {
                    this.start();
                });
            }
        },

        stop: function () {
            if (queues == 0) {
                $.each(listeners, function () {
                    this.stop();
                });
            }
        },
    };

})(jQuery);
