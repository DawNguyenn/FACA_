"use strict";

const FileReader = require("./fileReader.js");
module.exports = function (file, options) {
  const reader = new FileReader(file);
  try {
    this.load(reader, options);
    this._reader = reader;
    return this;
  } catch (error) {
    reader.dispose();
    throw error;
  }
};
