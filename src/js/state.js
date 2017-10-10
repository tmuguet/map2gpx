(function ($) {
    var _mode = null;
    var _computing = false;

    var _progress = 0;
    var _total = 0;

    const $h2 = $('#data-computing h2');
    const $progress = $('#data-computing-progress');
    const $progressbar = $('#data-computing-progressbar');
    const $status = $('#data-computing-status');
    const $pending = $('#data-computing-pending');

    $.State = {};

    $.State.setMode = function (mode) {
        _mode = mode;
        $('body').trigger($.Event('map2gpx:modechange', { mode: _mode, computing: _computing }));
    };

    $.State.setComputing = function (computing) {
        if (computing && !_computing) {
            _progress = 0;
            _total = 0;
        }

        _computing = computing;
        $('body').trigger($.Event('map2gpx:computingchange', { mode: _mode, computing: _computing }));
    };

    $.State.updateComputing = function (progress, display = true) {
        if (Array.isArray(progress)) {
            $.each(progress, function () {
                $.State.updateComputing(this, false);
            });

            $.State.displayComputing();

            return;
        }

        if (progress.start) {
            _total += progress.total;
        } else if (progress.end) {
            _progress = _total;
        } else {
            _progress++;
        }

        if ('status' in progress && progress.status)
            $status.text(progress.status);
        if ('step' in progress && progress.step)
            $('<div><small>' + progress.step + '</small></div>').insertAfter($h2).fadeOut(400, function () {$(this).remove();});

        if (display)
            $.State.displayComputing();
    };

    $.State.displayComputing = function () {
        let p = 1;
        if (_total > 0)
            p = _progress / _total;

        $progress.text(Math.round(p * 100) + '%');
        $progressbar.css('width', Math.round(p * 100) + '%');

        if (Math.round(p * 100) == 42)
            $('<div><small>La grande question sur la vie, l\'univers et le reste répondue</small></div>').insertAfter($h2).fadeOut(400, function () {$(this).remove();});
    };

    $.State.triggerMarkersChanged = function () {
        $('body').trigger($.Event('map2gpx:markerschange', { mode: _mode, computing: _computing }));
    };

    $.State.getMode = function () { return _mode; };
    $.State.getComputing = function () { return _computing; };

})(jQuery);
