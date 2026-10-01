"use strict";

const base64 = require("./base64.js");

/**
Usage:
   zip = new PizZip();
   zip.file("hello.txt", "Hello, World!").file("tempfile", "nothing");
   zip.folder("images").file("smile.gif", base64Data, {base64: true});
   zip.file("Xmas.txt", "Ho ho ho !", {date : new Date("December 25, 2007 00:00:01")});
   zip.remove("tempfile");

   base64zip = zip.generate();

**/

/**
 * Representation a of zip file in js
 * @constructor
 * @param {String=|ArrayBuffer=|Uint8Array=} data the data to load, if any (optional).
 * @param {Object=} options the options for creating this objects (optional).
 */
function ZipLoom(data, options) {
  // if this constructor is used without `new`, it adds `new` before itself:
  if (!(this instanceof ZipLoom)) {
    return new ZipLoom(data, options);
  }

  // object containing the files :
  // {
  //   "folder/" : {...},
  //   "folder/data.txt" : {...}
  // }
  this.files = {};
  this.comment = null;
  this._storage = null;
  this._reader = null;
  if (options && options.storage && options.storage.type === "filesystem") {
    this._storage = new (require("./filesystem-storage.js"))(options.storage);
  }

  // Where we are in the hierarchy
  this.root = "";
  if (data) {
    this.load(data, options);
  }
  this.clone = function () {
    const _this = this;
    const newObj = new ZipLoom();
    Object.keys(this.files).forEach(function (file) {
      newObj.file(file, _this.files[file].asUint8Array());
    });
    return newObj;
  };
  this.shallowClone = function () {
    const newObj = new ZipLoom();
    for (const i in this) {
      if (typeof this[i] !== "function") {
        newObj[i] = this[i];
      }
    }
    return newObj;
  };
  this.dispose = function () {
    if (this._reader) {
      this._reader.dispose();
    }
    if (this._storage) {
      this._storage.dispose();
    }
  };
}
ZipLoom.prototype = require("./object.js");
ZipLoom.prototype.load = require("./load.js");
ZipLoom.prototype.loadFile = require("./loadFile.js");
ZipLoom.support = require("./support.js");
ZipLoom.defaults = require("./defaults.js");

/**
 * @deprecated
 * This namespace will be removed in a future version without replacement.
 */
ZipLoom.utils = require("./deprecatedPublicUtils.js");
ZipLoom.base64 = {
  /**
   * @deprecated
   * This method will be removed in a future version without replacement.
   */
  encode: function encode(input) {
    return base64.encode(input);
  },
  /**
   * @deprecated
   * This method will be removed in a future version without replacement.
   */
  decode: function decode(input) {
    return base64.decode(input);
  }
};
ZipLoom.compressions = require("./compressions.js");
ZipLoom.prototype.generateNodeStream = require("./node-stream.js");
module.exports = ZipLoom;
module.exports.default = ZipLoom;
