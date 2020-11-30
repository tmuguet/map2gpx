const L = require('leaflet');
const $ = require('jquery');

const ImportButton = L.Control.EasyButton.extend({
  options: {
    title: 'Import a file',
    fileLabel: 'File',
    urlLabel: 'URL',
    addWaypointsLabel: 'Add waypoints',
    submitLabel: 'Import',
    cancelLabel: 'Cancel',
  },

  initialize(track, options) {
    this._track = track;
    L.Util.setOptions(this, options);

    const opts = {
      states: [
        {
          icon: 'fa-cloud-upload',
          title: this.options.title,
          onClick: () => {
            this._dialog.dialog('open');
          },
        },
      ],
    };

    L.Control.EasyButton.prototype.initialize.call(this, opts);

    this._buildPopup();
  },

  _import() {
    this._form.find('.validateTips').empty();
    this._fieldUrl.removeClass('ui-state-error');
    this._fieldFile.removeClass('ui-state-error');

    const files = this._fieldFile[0].files; // eslint-disable-line prefer-destructuring
    const url = this._fieldUrl.val();
    const waypoints = $('#import-markers').is(':checked') ? 100 : false;

    let promise;
    if (files[0]) {
      promise = this._track.loadFile(files[0], waypoints).catch((e) => {
        this._fieldFile.addClass('ui-state-error');
        this._form.find('#import-file-tips').text(e.message);
        return false;
      });
    } else {
      promise = this._track.loadUrl(url, true, waypoints).catch((e) => {
        this._fieldUrl.addClass('ui-state-error');
        this._form.find('#import-url-tips').text(e.message);
        return false;
      });
    }
    promise.then((val) => {
      if (val !== false) {
        this._map.flyToBounds(this._track.getBounds(), { padding: [20, 20] });
        this._dialog.dialog('close');
      }
    });
  },

  _buildPopup() {
    /* eslint-disable max-len */
    const content = `
<div id="dialog-import" title="${this.options.title}">
  <form enctype="multipart/form-data">
    <fieldset>
      <p id="import-file-tips" class="validateTips"></p>
      <label for="import-file">${this.options.fileLabel}</label>
      <input type="file" name="import-file" id="import-file"  accept=".gpx,.kml,.json,.geojson" class="text ui-widget-content ui-corner-all"/>
      <p id="import-url-tips" class="validateTips"></p>
      <label for="import-url">${this.options.urlLabel}</label>
      <input type="text" name="import-url" id="import-url" value="" class="text ui-widget-content ui-corner-all"/>
      <input type="submit"  tabindex="-1" style="position:absolute; top:-1000px"/>
    </fieldset>
    <fieldset>
      <span style="display: block">
        <input type="checkbox" name="import-markers" id="import-markers" class="ui-widget-content ui-corner-all" style="display: inline"/>
        <label for="import-markers" style="display: inline">${this.options.addWaypointsLabel}</label>
      </span>
    </fieldset>
  </form>
</div>`;
    /* eslint-enable max-len */
    const $content = $(content);

    const buttons = {};
    buttons[this.options.submitLabel] = () => this._import();
    buttons[this.options.cancelLabel] = () => this._dialog.dialog('close');
    this._dialog = $content.dialog({
      autoOpen: false,
      modal: true,
      buttons,
      close: () => {
        this._form[0].reset();
        this._fieldUrl.removeClass('ui-state-error');
        this._fieldFile.removeClass('ui-state-error');
        this._form.find('.validateTips').empty();
      },
    });

    this._form = this._dialog.find('form').on('submit', (event) => {
      event.preventDefault();
      this._import();
    });
    this._fieldFile = this._form.find('#import-file');
    this._fieldUrl = this._form.find('#import-url');
  },
});

module.exports = {
  ImportButton,
  importButton(track, options) {
    return new ImportButton(track, options);
  },
};
