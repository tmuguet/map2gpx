
const isSmallScreen = (window.innerWidth <= 800 && window.innerHeight <= 600);

showLoadingMessage('Observation des faucons crécerelle...');

window.onload = function () {
    try {
        showLoadingMessage('Localisation des chamois...');

        $('#data-computing').progress().on('progressstatechanged', (e, data) => {
            if (data.started) {
                $('#data-computing').fadeIn();
            } else {
                $('#data').data('map2gpx-chart').replot($map.map('getTrack').computeStats());
                $('#data-computing').fadeOut();
            }
        });
        $.Queue.bindTo($('#data-computing'));

        const $map = $('#map').map({
            controls: {
                minimap: {
                    show: !isSmallScreen,
                },
                layerSwitcher: {
                    leafletOptions: {
                        collapsed: isSmallScreen,
                    },
                },
                scale: {
                    show: !isSmallScreen,
                },
                help: {
                    show: !isSmallScreen,
                },
            },
            created: function () {
                showLoadingMessage('Suivi des renards roux...');

                if (isSmallScreen) {
                    $('#mobile-warning')
                        .show()
                        .find('button').click(function () { popup.hide(); });
                } else {
                    $.Shepherd.tour()
                        .add('welcome', {
                            text: $('#help-welcome')[0],
                        })
                        .add('layers', {
                            text: $('#help-layers')[0],
                            attachTo: { element: $('.GPlayerName').closest('.GPwidget')[0], on: 'left' },
                        })
                        .add('search', {
                            text: $('#help-search')[0],
                            attachTo: { element: $('.GPshowAdvancedToolOpen').closest('.GPwidget')[0], on: 'right' },
                        })
                        .add('autotrace', {
                            text: $('#help-autotrace')[0],
                            attachTo: { element: $('#btn-autotrace')[0], on: 'right' },
                        })
                        .add('straighttrace', {
                            text: $('#help-straighttrace')[0],
                            attachTo: { element: $('#btn-straighttrace')[0], on: 'right' },
                        })
                        .start();
                }
            },
            loaded: () => {
                showLoadingMessage('Alignement des satellites...');
                clearInterval(interval);
                $('#loading').fadeOut();
            },
        }).on('mapmarkerschanged', function (e) {
            if (!isSmallScreen) {
                if ($map.map('getTrack').hasMarkers(2) && !$.Shepherd.has(1)) {
                    $.Shepherd.tour()
                        .add('data', {
                            text: $('#help-data')[0],
                            attachTo: { element: $('#data')[0], on: 'top' },
                        })
                        .add('closeloop', {
                            text: $('#help-closeloop')[0],
                            attachTo: { element: $('#btn-closeloop')[0], on: 'right' },
                        })
                        .add('export', {
                            text: $('#help-export')[0],
                            attachTo: { element: $('#btn-export')[0], on: 'right' },
                        })
                        .start();
                }

                if ($map.map('getTrack').hasMarkers(3) && !$.Shepherd.has(2)) {
                    $.Shepherd.tour()
                        .add('movemarker', {
                            text: $('#help-movemarker')[0],
                            attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' },
                        })
                        .add('movemarker2', {
                            text: $('#help-movemarker2')[0],
                            attachTo: { element: $('.awesome-marker').eq(-2)[0], on: 'bottom' },
                        })
                        .add('steps', {
                            text: $('#help-steps')[0],
                            attachTo: { element: $('.awesome-marker').last()[0], on: 'bottom' },
                        })
                        .add('steps2', {
                            beforeShowPromise: function () {
                                return $.Deferred(function () {
                                    const route = $map.map('getTrack').getFirstMarker().getRouteFromHere();
                                    const lngs = route.getLatLngsFlatten();
                                    const item = lngs[Math.floor(lngs.length / 2)];
                                    route.openPopup(item);
                                    this.resolve();
                                }).promise();
                            },
                            text: $('#help-steps2')[0],
                        })
                        .start();
                }
            }
        }).on('mapstatechanged', function (e) {
            $('#data').data('map2gpx-chart').replot($map.map('getTrack').computeStats());
        });

        $('#data').chart({ map: $map.map('getMap'), dataEmpty: '#data-empty', isSmallScreen });

    } catch (ex) {
        gotError = true;
        console.log('Got exception', ex);
        $('#loading').animate({ backgroundColor: '#A23336', color: '#FFFFFF' });
        $('#loading h2 i.fa').removeClass('fa-spinner fa-pulse').addClass('fa-bug');
        $('#loading h2 span').html('Une erreur s\'est produite: &quot;' + ex + '&quot;.');
        $('#loading h3').html(
            $('<div>N\'hésitez pas à ouvrir un ticket sur <a href="https://github.com/tmuguet/map2gpx" target="_blank" rel="noopener noreferrer">Github</a> ' +
                'ou à m\'envoyer un mail à <a href="mailto:hi@tmuguet.me">hi@tmuguet.me</a>.</div>').hide().slideDown()
        );
        clearInterval(interval);
    }
};
