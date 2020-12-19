/* global window, DOMException */
import $ from 'jquery';

const hasLocalStorage = (function storageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException
      && (e.code === 22 // everything except Firefox
      || e.code === 1014 // Firefox
      // test name field too, because code might not be present
      || e.name === 'QuotaExceededError' // everything except Firefox
        || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') // Firefox
      // acknowledge QuotaExceededError only if there's something already stored
      && storage.length !== 0
    );
  }
}('localStorage'));

$.localStorage = {
  get(item) {
    if (hasLocalStorage) return window.localStorage.getItem(item);
    return null;
  },

  getAsJSON(item) {
    if (hasLocalStorage && window.localStorage.getItem(item) !== null) {
      return JSON.parse(window.localStorage.getItem(item));
    }
    return null;
  },

  set(item, value) {
    if (hasLocalStorage) window.localStorage.setItem(item, value);
  },

  setAsJSON(item, value) {
    this.set(item, JSON.stringify(value));
  },
};
