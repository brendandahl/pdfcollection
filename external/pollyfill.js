if (!HTMLCanvasElement.prototype.toBlob) {
 Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: function (callback, type, quality) {

    var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
        len = binStr.length,
        arr = new Uint8Array(len);

    for (var i=0; i<len; i++ ) {
     arr[i] = binStr.charCodeAt(i);
    }

    callback( new Blob( [arr], {type: type || 'image/png'} ) );
  }
 });
}

if (!window.caches) {
  // TODO: make this a proper polyfill with index db.
  window.caches = {
    match: function () {
      return Promise.resolve();
    },
    open: function () {
      return Promise.resolve({
        put: function () { return Promise.resolve(); }
      });
    }
  }
}
