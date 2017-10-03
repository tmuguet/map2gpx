(function ($) {
    const hasLocalStorage = (function storageAvailable(type) {
        var storage;
        try {
            storage = window[type];
            var x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return e instanceof DOMException && (
                e.code === 22 || // everything except Firefox
                e.code === 1014 || // Firefox

                // test name field too, because code might not be present
                e.name === 'QuotaExceededError' || // everything except Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') && // Firefox

                // acknowledge QuotaExceededError only if there's something already stored
                storage.length !== 0;
        }
    })('localStorage');

    $.localStorage = {
        get: function (item) {
            if (hasLocalStorage)
                return localStorage.getItem(item);
            else
                return null;
        },

        getAsJSON: function (item) {
            if (hasLocalStorage && localStorage.getItem(item) !== null)
                return JSON.parse(localStorage.getItem(item));
            else
                return null;
        },

        set: function (item, value) {
            if (hasLocalStorage)
                localStorage.setItem(item, value);
        },

        setAsJSON: function (item, value) {
            this.set(item, JSON.stringify(value));
        },
    };
})(jQuery);
