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
function _regeneratorRuntime() { "use strict"; var r = _regenerator(), e = r.m(_regeneratorRuntime), t = (Object.getPrototypeOf ? Object.getPrototypeOf(e) : e.__proto__).constructor; function n(r) { var e = "function" == typeof r && r.constructor; return !!e && (e === t || "GeneratorFunction" === (e.displayName || e.name)); } var o = { "throw": 1, "return": 2, "break": 3, "continue": 3 }; function a(r) { var e, t; return function (n) { e || (e = { stop: function stop() { return t(n.a, 2); }, "catch": function _catch() { return n.v; }, abrupt: function abrupt(r, e) { return t(n.a, o[r], e); }, delegateYield: function delegateYield(r, o, a) { return e.resultName = o, t(n.d, _regeneratorValues(r), a); }, finish: function finish(r) { return t(n.f, r); } }, t = function t(r, _t, o) { n.p = e.prev, n.n = e.next; try { return r(_t, o); } finally { e.next = n.n; } }), e.resultName && (e[e.resultName] = n.v, e.resultName = void 0), e.sent = n.v, e.next = n.n; try { return r.call(this, e); } finally { n.p = e.prev, n.n = e.next; } }; } return (_regeneratorRuntime = function _regeneratorRuntime() { return { wrap: function wrap(e, t, n, o) { return r.w(a(e), t, n, o && o.reverse()); }, isGeneratorFunction: n, mark: r.m, awrap: function awrap(r, e) { return new _OverloadYield(r, e); }, AsyncIterator: _regeneratorAsyncIterator, async: function async(r, e, t, o, u) { return (n(e) ? _regeneratorAsyncGen : _regeneratorAsync)(a(r), e, t, o, u); }, keys: _regeneratorKeys, values: _regeneratorValues }; })(); }
function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(_typeof(e) + " is not iterable"); }
function _regeneratorKeys(e) { var n = Object(e), r = []; for (var t in n) r.unshift(t); return function e() { for (; r.length;) if ((t = r.pop()) in n) return e.value = t, e.done = !1, e; return e.done = !0, e; }; }
function _regeneratorAsync(n, e, r, t, o) { var a = _regeneratorAsyncGen(n, e, r, t, o); return a.next().then(function (n) { return n.done ? n.value : a.next(); }); }
function _regeneratorAsyncGen(r, e, t, o, n) { return new _regeneratorAsyncIterator(_regenerator().w(r, e, t, o), n || Promise); }
function _regeneratorAsyncIterator(t, e) { function n(r, o, i, f) { try { var c = t[r](o), u = c.value; return u instanceof _OverloadYield ? e.resolve(u.v).then(function (t) { n("next", t, i, f); }, function (t) { n("throw", t, i, f); }) : e.resolve(u).then(function (t) { c.value = t, i(c); }, function (t) { return n("throw", t, i, f); }); } catch (t) { f(t); } } var r; this.next || (_regeneratorDefine2(_regeneratorAsyncIterator.prototype), _regeneratorDefine2(_regeneratorAsyncIterator.prototype, "function" == typeof Symbol && Symbol.asyncIterator || "@asyncIterator", function () { return this; })), _regeneratorDefine2(this, "_invoke", function (t, o, i) { function f() { return new e(function (e, r) { n(t, i, e, r); }); } return r = r ? r.then(f, f) : f(); }, !0); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
var _marked = /*#__PURE__*/_regeneratorRuntime().mark(slices);
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _wrapAsyncGenerator(e) { return function () { return new AsyncGenerator(e.apply(this, arguments)); }; }
function AsyncGenerator(e) { var t, n; function resume(t, n) { try { var r = e[t](n), o = r.value, u = o instanceof _OverloadYield; Promise.resolve(u ? o.v : o).then(function (n) { if (u) { var i = "return" === t && o.k ? t : "next"; if (!o.k || n.done) return resume(i, n); n = e[i](n).value; } settle(!!r.done, n); }, function (e) { resume("throw", e); }); } catch (e) { settle(2, e); } } function settle(e, r) { 2 === e ? t.reject(r) : t.resolve({ value: r, done: e }), (t = t.next) ? resume(t.key, t.arg) : n = null; } this._invoke = function (e, r) { return new Promise(function (o, u) { var i = { key: e, arg: r, resolve: o, reject: u, next: null }; n ? n = n.next = i : (t = n = i, resume(e, r)); }); }, "function" != typeof e["return"] && (this["return"] = void 0); }
AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function () { return this; }, AsyncGenerator.prototype.next = function (e) { return this._invoke("next", e); }, AsyncGenerator.prototype["throw"] = function (e) { return this._invoke("throw", e); }, AsyncGenerator.prototype["return"] = function (e) { return this._invoke("return", e); };
function _awaitAsyncGenerator(e) { return new _OverloadYield(e, 0); }
function _asyncGeneratorDelegate(t) { var e = {}, n = !1; function pump(e, r) { return n = !0, r = new Promise(function (n) { n(t[e](r)); }), { done: !1, value: new _OverloadYield(r, 1) }; } return e["undefined" != typeof Symbol && Symbol.iterator || "@@iterator"] = function () { return this; }, e.next = function (t) { return n ? (n = !1, t) : pump("next", t); }, "function" == typeof t["throw"] && (e["throw"] = function (t) { if (n) throw n = !1, t; return pump("throw", t); }), "function" == typeof t["return"] && (e["return"] = function (t) { return n ? (n = !1, t) : pump("return", t); }), e; }
function _OverloadYield(e, d) { this.v = e, this.k = d; }
function _asyncIterator(r) { var n, t, o, e = 2; for ("undefined" != typeof Symbol && (t = Symbol.asyncIterator, o = Symbol.iterator); e--;) { if (t && null != (n = r[t])) return n.call(r); if (o && null != (n = r[o])) return new AsyncFromSyncIterator(n.call(r)); t = "@@asyncIterator", o = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(r) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var n = r.done; return Promise.resolve(r.value).then(function (r) { return { value: r, done: n }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(r) { this.s = r, this.n = r.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, "return": function _return(r) { var n = this.s["return"]; return void 0 === n ? Promise.resolve({ value: r, done: !0 }) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments)); }, "throw": function _throw(r) { var n = this.s["return"]; return void 0 === n ? Promise.reject(r) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(r); }
var _require = require("node:stream"),
  PassThrough = _require.PassThrough,
  Readable = _require.Readable,
  Transform = _require.Transform,
  Writable = _require.Writable,
  pipeline = _require.pipeline;
var _require2 = require("node:zlib"),
  createDeflateRaw = _require2.createDeflateRaw,
  createInflateRaw = _require2.createInflateRaw;
var CompressedObject = require("./compressedObject.js");
var crc32 = require("./crc32.js");
var fileOrder = require("./file-order.js");
var STORE = 0;
var DEFLATE = 8;
var DATA_DESCRIPTOR = 0x0008;
var UTF8 = 0x0800;
var MAX_16 = 0xffff;
var MAX_32 = 0xffffffff;
function write16(buffer, value, offset) {
  if (value < 0 || value > MAX_16) {
    throw new RangeError("ZIP64 is required for this ZIP field");
  }
  buffer.writeUInt16LE(value, offset);
}
function write32(buffer, value, offset) {
  if (value < 0 || value > MAX_32) {
    throw new RangeError("ZIP64 is required for this ZIP field");
  }
  buffer.writeUInt32LE(value >>> 0, offset);
}
function dosDateTime(date) {
  var value = date || new Date();
  var year = Math.min(2107, Math.max(1980, value.getFullYear()));
  return {
    date: year - 1980 << 9 | value.getMonth() + 1 << 5 | value.getDate(),
    time: value.getHours() << 11 | value.getMinutes() << 5 | value.getSeconds() >> 1
  };
}
function writeChunk(_x3, _x4) {
  return _writeChunk.apply(this, arguments);
}
function _writeChunk() {
  _writeChunk = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2(destination, chunk) {
    var offset;
    return _regeneratorRuntime().wrap(function _callee2$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          offset = 0;
        case 1:
          if (!(offset < chunk.length)) {
            _context3.next = 7;
            break;
          }
          _context3.next = 4;
          return writeBuffer(destination, chunk.subarray(offset, offset + destination._zipChunkSize));
        case 4:
          offset += destination._zipChunkSize;
          _context3.next = 1;
          break;
        case 7:
        case "end":
          return _context3.stop();
      }
    }, _callee2);
  }));
  return _writeChunk.apply(this, arguments);
}
function writeBuffer(destination, chunk) {
  if (destination.destroyed) {
    return Promise.reject(new Error("ZIP stream was destroyed"));
  }
  if (destination.write(chunk)) {
    return Promise.resolve();
  }
  return new Promise(function (resolve, reject) {
    function done(callback, value) {
      destination.removeListener("drain", onDrain);
      destination.removeListener("error", onError);
      destination.removeListener("close", onClose);
      callback(value);
    }
    function onDrain() {
      done(resolve);
    }
    function onError(error) {
      done(reject, error);
    }
    function onClose() {
      done(reject, new Error("ZIP stream closed before drain"));
    }
    destination.once("drain", onDrain);
    destination.once("error", onError);
    destination.once("close", onClose);
  });
}
function rawData(entry) {
  if (entry.dir) {
    return Buffer.alloc(0);
  }
  return entry.asNodeBuffer();
}
function asBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") {
    return Buffer.from(value, "binary");
  }
  throw new TypeError("ZIP entry has unsupported compressed data");
}
function isCompressed(data) {
  return data instanceof CompressedObject;
}
function compressionMethod(entry, options) {
  if (entry.dir) {
    return STORE;
  }
  var requested = entry.options.compression || options.compression;
  if (requested === "STORE") {
    return STORE;
  }
  if (requested === "DEFLATE") {
    return DEFLATE;
  }
  throw new Error("".concat(requested, " is not a valid compression method for generateNodeStream"));
}
function slices(data, chunkSize) {
  var offset;
  return _regeneratorRuntime().wrap(function slices$(_context) {
    while (1) switch (_context.prev = _context.next) {
      case 0:
        offset = 0;
      case 1:
        if (!(offset < data.length)) {
          _context.next = 7;
          break;
        }
        _context.next = 4;
        return data.subarray(offset, offset + chunkSize);
      case 4:
        offset += chunkSize;
        _context.next = 1;
        break;
      case 7:
      case "end":
        return _context.stop();
    }
  }, _marked);
}
function entryChunks(_x, _x2) {
  return _entryChunks.apply(this, arguments);
}
function _entryChunks() {
  _entryChunks = _wrapAsyncGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(entry, chunkSize) {
    var data;
    return _regeneratorRuntime().wrap(function _callee$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          data = entry._data;
          if (!isCompressed(data)) {
            _context2.next = 9;
            break;
          }
          if (!(data._fileReader && data._fileReader.createReadStream)) {
            _context2.next = 6;
            break;
          }
          return _context2.delegateYield(_asyncGeneratorDelegate(_asyncIterator(data._fileReader.createReadStream(data._fileOffset, data.compressedSize, chunkSize)), _awaitAsyncGenerator), "t0", 4);
        case 4:
          _context2.next = 7;
          break;
        case 6:
          return _context2.delegateYield(_asyncGeneratorDelegate(_asyncIterator(slices(asBuffer(data.getCompressedContent()), chunkSize)), _awaitAsyncGenerator), "t1", 7);
        case 7:
          _context2.next = 14;
          break;
        case 9:
          if (!(data && data.createReadStream)) {
            _context2.next = 13;
            break;
          }
          return _context2.delegateYield(_asyncGeneratorDelegate(_asyncIterator(data.createReadStream(chunkSize)), _awaitAsyncGenerator), "t2", 11);
        case 11:
          _context2.next = 14;
          break;
        case 13:
          return _context2.delegateYield(_asyncGeneratorDelegate(_asyncIterator(slices(rawData(entry), chunkSize)), _awaitAsyncGenerator), "t3", 14);
        case 14:
        case "end":
          return _context2.stop();
      }
    }, _callee);
  }));
  return _entryChunks.apply(this, arguments);
}
function sourceFor(entry, reused, chunkSize) {
  return {
    stream: Readable.from(entryChunks(entry, chunkSize), {
      objectMode: false,
      highWaterMark: chunkSize
    }),
    inflate: !reused && isCompressed(entry._data) && entry._data.compressionMethod === "\x08\x00"
  };
}
function utf8Flag(name, comment) {
  return Buffer.byteLength(name, "utf8") !== name.length || Buffer.byteLength(comment, "utf8") !== comment.length ? UTF8 : 0;
}
function localHeader(entry) {
  var header = Buffer.alloc(30 + entry.name.length);
  header.writeUInt32LE(0x04034b50, 0);
  write16(header, entry.usesDescriptor ? 20 : 10, 4);
  write16(header, entry.flags | (entry.usesDescriptor ? DATA_DESCRIPTOR : 0), 6);
  write16(header, entry.method, 8);
  write16(header, entry.time, 10);
  write16(header, entry.date, 12);
  write32(header, entry.usesDescriptor ? 0 : entry.crc32, 14);
  write32(header, entry.usesDescriptor ? 0 : entry.compressedSize, 18);
  write32(header, entry.usesDescriptor ? 0 : entry.uncompressedSize, 22);
  write16(header, entry.name.length, 26);
  write16(header, 0, 28);
  entry.name.copy(header, 30);
  return header;
}
function descriptor(entry) {
  var buffer = Buffer.alloc(16);
  buffer.writeUInt32LE(0x08074b50, 0);
  write32(buffer, entry.crc32, 4);
  write32(buffer, entry.compressedSize, 8);
  write32(buffer, entry.uncompressedSize, 12);
  return buffer;
}
function centralHeader(entry) {
  var buffer = Buffer.alloc(46 + entry.name.length + entry.comment.length);
  buffer.writeUInt32LE(0x02014b50, 0);
  write16(buffer, 0x0014, 4);
  write16(buffer, entry.usesDescriptor ? 20 : 10, 6);
  write16(buffer, entry.flags | (entry.usesDescriptor ? DATA_DESCRIPTOR : 0), 8);
  write16(buffer, entry.method, 10);
  write16(buffer, entry.time, 12);
  write16(buffer, entry.date, 14);
  write32(buffer, entry.crc32, 16);
  write32(buffer, entry.compressedSize, 20);
  write32(buffer, entry.uncompressedSize, 24);
  write16(buffer, entry.name.length, 28);
  write16(buffer, 0, 30);
  write16(buffer, entry.comment.length, 32);
  write16(buffer, 0, 34);
  write16(buffer, 0, 36);
  write32(buffer, entry.dir ? 0x10 : entry.dosPermissions || 0, 38);
  write32(buffer, entry.offset, 42);
  entry.name.copy(buffer, 46);
  entry.comment.copy(buffer, 46 + entry.name.length);
  return buffer;
}
function endRecord(entries, size, offset, comment) {
  var buffer = Buffer.alloc(22 + comment.length);
  buffer.writeUInt32LE(0x06054b50, 0);
  write16(buffer, 0, 4);
  write16(buffer, 0, 6);
  write16(buffer, entries, 8);
  write16(buffer, entries, 10);
  write32(buffer, size, 12);
  write32(buffer, offset, 16);
  write16(buffer, comment.length, 20);
  comment.copy(buffer, 22);
  return buffer;
}
function writeEntry(_x5, _x6, _x7, _x8) {
  return _writeEntry.apply(this, arguments);
}
function _writeEntry() {
  _writeEntry = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3(destination, entry, offset, options) {
    var name, comment, method, reused, usesDescriptor, dateTime, metadata, source, stages, streamOptions, compressionOptions, written, onClose;
    return _regeneratorRuntime().wrap(function _callee3$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          onClose = function _onClose() {
            var _iterator = _createForOfIteratorHelper(stages),
              _step;
            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                var stage = _step.value;
                stage.destroy(new Error("ZIP stream was destroyed"));
              }
            } catch (err) {
              _iterator.e(err);
            } finally {
              _iterator.f();
            }
          };
          name = Buffer.from(entry.name, "utf8");
          comment = Buffer.from(entry.comment || "", "utf8");
          if (!(name.length > MAX_16 || comment.length > MAX_16)) {
            _context4.next = 5;
            break;
          }
          throw new RangeError("ZIP filename or comment exceeds the classic ZIP limit");
        case 5:
          method = compressionMethod(entry, options);
          reused = isCompressed(entry._data) && entry._data.compressionMethod === (method === STORE ? "\x00\x00" : "\x08\x00");
          usesDescriptor = !reused;
          dateTime = dosDateTime(entry.date);
          metadata = {
            comment: comment,
            compressedSize: reused ? entry._data.compressedSize : 0,
            crc32: reused ? entry._data.crc32 >>> 0 : 0,
            date: dateTime.date,
            dir: entry.dir,
            dosPermissions: entry.dosPermissions,
            flags: utf8Flag(entry.name, entry.comment || ""),
            method: method,
            name: name,
            offset: offset,
            time: dateTime.time,
            uncompressedSize: reused ? entry._data.uncompressedSize : 0,
            usesDescriptor: usesDescriptor
          };
          _context4.next = 12;
          return writeChunk(destination, localHeader(metadata));
        case 12:
          source = sourceFor(entry, reused, options.chunkSize);
          stages = [source.stream];
          streamOptions = {
            highWaterMark: options.chunkSize,
            chunkSize: options.chunkSize
          };
          if (source.inflate) {
            stages.push(createInflateRaw(streamOptions));
          }
          if (!reused) {
            stages.push(new Transform({
              highWaterMark: options.chunkSize,
              transform: function transform(chunk, encoding, callback) {
                metadata.crc32 = crc32(chunk, metadata.crc32) >>> 0;
                metadata.uncompressedSize += chunk.length;
                if (isCompressed(entry._data) && metadata.uncompressedSize > entry._data.uncompressedSize) {
                  callback(new Error("Bug : uncompressed data size mismatch"));
                  return;
                }
                if (metadata.uncompressedSize > MAX_32) {
                  callback(new RangeError("ZIP64 is required for this ZIP field"));
                  return;
                }
                callback(null, chunk);
              }
            }));
            if (method === DEFLATE) {
              compressionOptions = entry.options.compressionOptions || options.compressionOptions;
              stages.push(createDeflateRaw(_objectSpread({
                // Only level is part of the ZIP API; zlib flush/dictionary options
                // can produce data that ZIP readers cannot decompress.
                level: compressionOptions.level
              }, streamOptions)));
            }
          }
          written = 0;
          stages.push(new Writable({
            highWaterMark: options.chunkSize,
            write: function write(chunk, encoding, callback) {
              written += chunk.length;
              if (written > MAX_32) {
                callback(new RangeError("ZIP64 is required for this ZIP field"));
                return;
              }
              writeChunk(destination, chunk).then(function () {
                return callback();
              }, callback);
            }
          }));
          destination.once("close", onClose);
          _context4.prev = 20;
          _context4.next = 23;
          return new Promise(function (resolve, reject) {
            pipeline.apply(void 0, stages.concat([function (error) {
              return error ? reject(error) : resolve();
            }]));
            if (destination.destroyed) {
              onClose();
            }
          });
        case 23:
          _context4.prev = 23;
          destination.removeListener("close", onClose);
          return _context4.finish(23);
        case 26:
          if (!(reused && written !== metadata.compressedSize)) {
            _context4.next = 28;
            break;
          }
          throw new Error("Bug : compressed data size mismatch");
        case 28:
          if (reused) {
            _context4.next = 34;
            break;
          }
          if (!(isCompressed(entry._data) && metadata.uncompressedSize !== entry._data.uncompressedSize)) {
            _context4.next = 31;
            break;
          }
          throw new Error("Bug : uncompressed data size mismatch");
        case 31:
          metadata.compressedSize = written;
          _context4.next = 34;
          return writeChunk(destination, descriptor(metadata));
        case 34:
          return _context4.abrupt("return", metadata);
        case 35:
        case "end":
          return _context4.stop();
      }
    }, _callee3, null, [[20,, 23, 26]]);
  }));
  return _writeEntry.apply(this, arguments);
}
function writeArchive(_x9, _x0, _x1) {
  return _writeArchive.apply(this, arguments);
}
function _writeArchive() {
  _writeArchive = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee4(zip, destination, options) {
    var names, offset, entries, _iterator2, _step2, name, _entry, centralOffset, _i, _entries, entry, header, comment;
    return _regeneratorRuntime().wrap(function _callee4$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          names = fileOrder(zip.files, options.fileOrder);
          if (!(names.length > MAX_16)) {
            _context5.next = 3;
            break;
          }
          throw new RangeError("ZIP64 is required for more than 65535 entries");
        case 3:
          offset = 0;
          entries = [];
          _iterator2 = _createForOfIteratorHelper(names);
          _context5.prev = 6;
          _iterator2.s();
        case 8:
          if ((_step2 = _iterator2.n()).done) {
            _context5.next = 19;
            break;
          }
          name = _step2.value;
          if (Object.prototype.hasOwnProperty.call(zip.files, name)) {
            _context5.next = 12;
            break;
          }
          return _context5.abrupt("continue", 17);
        case 12:
          _context5.next = 14;
          return writeEntry(destination, zip.files[name], offset, options);
        case 14:
          _entry = _context5.sent;
          entries.push(_entry);
          offset += 30 + _entry.name.length + _entry.compressedSize + (_entry.usesDescriptor ? 16 : 0);
        case 17:
          _context5.next = 8;
          break;
        case 19:
          _context5.next = 24;
          break;
        case 21:
          _context5.prev = 21;
          _context5.t0 = _context5["catch"](6);
          _iterator2.e(_context5.t0);
        case 24:
          _context5.prev = 24;
          _iterator2.f();
          return _context5.finish(24);
        case 27:
          centralOffset = offset;
          _i = 0, _entries = entries;
        case 29:
          if (!(_i < _entries.length)) {
            _context5.next = 38;
            break;
          }
          entry = _entries[_i];
          header = centralHeader(entry);
          _context5.next = 34;
          return writeChunk(destination, header);
        case 34:
          offset += header.length;
        case 35:
          _i++;
          _context5.next = 29;
          break;
        case 38:
          comment = Buffer.from(options.comment || zip.comment || "", "utf8");
          if (!(comment.length > MAX_16)) {
            _context5.next = 41;
            break;
          }
          throw new RangeError("ZIP comment exceeds the classic ZIP limit");
        case 41:
          _context5.next = 43;
          return writeChunk(destination, endRecord(entries.length, offset - centralOffset, centralOffset, comment));
        case 43:
        case "end":
          return _context5.stop();
      }
    }, _callee4, null, [[6, 21, 24, 27]]);
  }));
  return _writeArchive.apply(this, arguments);
}
module.exports = function generateNodeStream() {
  var _this = this;
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var chunkSize = require("./chunk-size.js")(options.chunkSize, this._chunkSize);
  var destination = new PassThrough({
    highWaterMark: options.highWaterMark === undefined ? chunkSize : options.highWaterMark
  });
  destination._zipChunkSize = chunkSize;
  var settings = {
    chunkSize: chunkSize,
    comment: options.comment,
    compression: (options.compression || "STORE").toUpperCase(),
    compressionOptions: options.compressionOptions || {},
    fileOrder: options.fileOrder
  };
  queueMicrotask(function () {
    writeArchive(_this, destination, settings).then(function () {
      return destination.end();
    }, function (error) {
      return destination.destroy(error);
    });
  });
  return destination;
};