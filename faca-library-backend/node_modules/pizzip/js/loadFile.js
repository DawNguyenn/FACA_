"use strict";

var FileReader = require("./fileReader.js");
module.exports = function (file, options) {
  var reader = new FileReader(file, {
    chunkSize: options && options.chunkSize !== undefined ? options.chunkSize : this._chunkSize
  });
  var snapshot = Object.assign({}, this.files);
  var comment = this.comment;
  try {
    this.load(reader, options);
    this._readers.add(reader);
    return this;
  } catch (error) {
    for (var _i = 0, _Object$keys = Object.keys(this.files); _i < _Object$keys.length; _i++) {
      var name = _Object$keys[_i];
      delete this.files[name];
    }
    Object.assign(this.files, snapshot);
    this.comment = comment;
    reader.dispose();
    throw error;
  }
};