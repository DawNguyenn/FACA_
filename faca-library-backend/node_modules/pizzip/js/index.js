"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var base64 = require("./base64.js");

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
function PizZip(data, options) {
  // if this constructor is used without `new`, it adds `new` before itself:
  if (!(this instanceof PizZip)) {
    return new PizZip(data, options);
  }

  // object containing the files :
  // {
  //   "folder/" : {...},
  //   "folder/data.txt" : {...}
  // }
  this.files = {};
  this.comment = null;
  this._chunkSize = require("./chunk-size.js")(options && options.chunkSize);
  this._storage = null;
  this._readers = new Set();
  if (options && options.storage && options.storage.type === "filesystem") {
    this._storage = new (require("./filesystem-storage.js"))(_objectSpread(_objectSpread({}, options.storage), {}, {
      chunkSize: this._chunkSize
    }));
  }
  this.dispose = function () {
    var _iterator = _createForOfIteratorHelper(this._readers),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var reader = _step.value;
        reader.dispose();
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    this._readers.clear();
    if (this._storage) {
      this._storage.dispose();
    }
  };

  // Where we are in the hierarchy
  this.root = "";
  if (data) {
    try {
      this.load(data, options);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  this.clone = function () {
    var _this = this;
    var newObj = new PizZip();
    Object.keys(this.files).forEach(function (file) {
      newObj.file(file, _this.files[file].asUint8Array());
    });
    return newObj;
  };
  this.shallowClone = function () {
    var newObj = new PizZip();
    for (var i in this) {
      if (typeof this[i] !== "function") {
        newObj[i] = this[i];
      }
    }
    return newObj;
  };
}
PizZip.prototype = require("./object.js");
PizZip.prototype.load = require("./load.js");
PizZip.prototype.loadFile = require("./loadFile.js");
PizZip.support = require("./support.js");
PizZip.defaults = require("./defaults.js");

/**
 * @deprecated
 * This namespace will be removed in a future version without replacement.
 */
PizZip.utils = require("./deprecatedPublicUtils.js");
PizZip.base64 = {
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
PizZip.compressions = require("./compressions.js");
PizZip.prototype.generateNodeStream = require("./node-stream.js");
module.exports = PizZip;
module.exports["default"] = PizZip;