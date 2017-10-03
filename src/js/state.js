(function ($) {
    var _mode = null;
    var _computing = false;

    const $h2 = $('#data-computing h2');
    const $progress = $('#data-computing-progress');
    const $status = $('#data-computing-status');

    $.State = {};

    $.State.setMode = function (mode) {
        _mode = mode;
        $('body').trigger($.Event('map2gpx:modechange', { mode: _mode, computing: _computing }));
    };

    $.State.setComputing = function (computing) {
        _computing = computing;
        $('body').trigger($.Event('map2gpx:computingchange', { mode: _mode, computing: _computing }));
    };

    $.State.updateComputing = function (progress) {
        let p = progress.progress;
        if (Array.isArray(progress.progress))
            p = p.reduce((a, b) => a + b) / p.length;

        $progress.text(Math.round(p * 100) + '%');
        if ('status' in progress && progress.status)
            $status.text(progress.status);
        if ('step' in progress && progress.step)
            $('<div><small>' + progress.step + '</small></div>').insertAfter($h2).fadeOut(400, function () {this.remove();});

        if (Math.round(p * 100) == 42)
            $('<div><small>La grande question sur la vie, l\'univers et le reste répondue</small></div>').insertAfter($h2).fadeOut(400, function () {this.remove();});
    };

    $.State.triggerMarkersChanged = function () {
        $('body').trigger($.Event('map2gpx:markerschange', { mode: _mode, computing: _computing }));
    };

    $.State.getMode = function () { return _mode; };
    $.State.getComputing = function () { return _computing; };

})(jQuery);
