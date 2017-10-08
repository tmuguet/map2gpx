(function ($) {
    var queues = 0;

    $.fn.clearCompute = function () {
        return this.each(function () {
            queues -= $(this).queue().length;
            $(this).clearQueue();
        });
    };

    $.fn.startCompute = function (cb) {
        return this.each(function () {
            $.State.setComputing(true);
            queues++;
            $(this).queue(cb);
        });
    };

    $.fn.endCompute = function (next) {
        return this.each(function () {
            queues--;
            next();

            if (queues == 0)
                $.State.setComputing(false);
        });
    };

    $.Queue = {
        size: () => queues,
    };

})(jQuery);
