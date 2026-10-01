"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function (o) { return typeof o; } : function (o) { return o && typeof Symbol == "function" && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { let t = typeof Symbol != "undefined" && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && typeof r.length == "number") { t && (r = t); let _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } let o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { const r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || t.return == null || t.return(); } finally { if (u) { throw o; } } } }; }
function _regeneratorRuntime() { "use strict"; const r = _regenerator(), e = r.m(_regeneratorRuntime), t = (Object.getPrototypeOf ? Object.getPrototypeOf(e) : e.__proto__).constructor; function n(r) { const e = typeof r == "function" && r.constructor; return !!e && (e === t || (e.displayName || e.name) === "GeneratorFunction"); } const o = { throw: 1, return: 2, break: 3, continue: 3 }; function a(r) { let e, t; return function (n) { e || (e = { stop: function stop() { return t(n.a, 2); }, catch: function _catch() { return n.v; }, abrupt: function abrupt(r, e) { return t(n.a, o[r], e); }, delegateYield: function delegateYield(r, o, a) { return e.resultName = o, t(n.d, _regeneratorValues(r), a); }, finish: function finish(r) { return t(n.f, r); } }, t = function t(r, _t, o) { n.p = e.prev, n.n = e.next; try { return r(_t, o); } finally { e.next = n.n; } }), e.resultName && (e[e.resultName] = n.v, e.resultName = void 0), e.sent = n.v, e.next = n.n; try { return r.call(this, e); } finally { n.p = e.prev, n.n = e.next; } }; } return (_regeneratorRuntime = function _regeneratorRuntime() { return { wrap: function wrap(e, t, n, o) { return r.w(a(e), t, n, o && o.reverse()); }, isGeneratorFunction: n, mark: r.m, awrap: function awrap(r, e) { return new _OverloadYield(r, e); }, AsyncIterator: _regeneratorAsyncIterator, async: function async(r, e, t, o, u) { return (n(e) ? _regeneratorAsyncGen : _regeneratorAsync)(a(r), e, t, o, u); }, keys: _regeneratorKeys, values: _regeneratorValues }; })(); }
function _regeneratorValues(e) { if (e != null) { let t = e[typeof Symbol == "function" && Symbol.iterator || "@@iterator"], r = 0; if (t) { return t.call(e); } if (typeof e.next == "function") { return e; } if (!isNaN(e.length)) { return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } } throw new TypeError(_typeof(e) + " is not iterable"); }
function _regeneratorKeys(e) { const n = Object(e), r = []; for (var t in n) { r.unshift(t); } return function e() { for (; r.length;) { if ((t = r.pop()) in n) { return e.value = t, e.done = !1, e; } } return e.done = !0, e; }; }
function _regeneratorAsync(n, e, r, t, o) { const a = _regeneratorAsyncGen(n, e, r, t, o); return a.next().then(function (n) { return n.done ? n.value : a.next(); }); }
function _regeneratorAsyncGen(r, e, t, o, n) { return new _regeneratorAsyncIterator(_regenerator().w(r, e, t, o), n || Promise); }
function _regeneratorAsyncIterator(t, e) { function n(r, o, i, f) { try { const c = t[r](o), u = c.value; return u instanceof _OverloadYield ? e.resolve(u.v).then(function (t) { n("next", t, i, f); }, function (t) { n("throw", t, i, f); }) : e.resolve(u).then(function (t) { c.value = t, i(c); }, function (t) { return n("throw", t, i, f); }); } catch (t) { f(t); } } let r; this.next || (_regeneratorDefine2(_regeneratorAsyncIterator.prototype), _regeneratorDefine2(_regeneratorAsyncIterator.prototype, typeof Symbol == "function" && Symbol.asyncIterator || "@asyncIterator", function () { return this; })), _regeneratorDefine2(this, "_invoke", function (t, o, i) { function f() { return new e(function (e, r) { n(t, i, e, r); }); } return r = r ? r.then(f, f) : f(); }, !0); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ let e, t, r = typeof Symbol == "function" ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { const c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", (function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) { return a; } throw y = !0, n; } return function (o, p, l) { if (f > 1) { throw TypeError("Generator is already running"); } for (y && p === 1 && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) { throw TypeError("iterator result is not an object"); } if (!t.done) { return t; } u = t.value, c < 2 && (c = 0); } else { c === 1 && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); } i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) { break; } } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; })(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; const c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { let i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _OverloadYield(e, d) { this.v = e, this.k = d; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { const t = this, e = arguments; return new Promise(function (r, o) { const a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if (typeof r == "string") { return _arrayLikeToArray(r, a); } let t = {}.toString.call(r).slice(8, -1); return t === "Object" && r.constructor && (t = r.constructor.name), t === "Map" || t === "Set" ? Array.from(r) : t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if (typeof Symbol != "undefined" && r[Symbol.iterator] != null || r["@@iterator"] != null) { return Array.from(r); } }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) { return _arrayLikeToArray(r); } }
function _arrayLikeToArray(r, a) { (a == null || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) { n[e] = r[e]; } return n; }
function _asyncIterator(r) { let n, t, o, e = 2; for (typeof Symbol != "undefined" && (t = Symbol.asyncIterator, o = Symbol.iterator); e--;) { if (t && (n = r[t]) != null) { return n.call(r); } if (o && (n = r[o]) != null) { return new AsyncFromSyncIterator(n.call(r)); } t = "@@asyncIterator", o = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(r) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) { return Promise.reject(new TypeError(r + " is not an object.")); } const n = r.done; return Promise.resolve(r.value).then(function (r) { return { value: r, done: n }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(r) { this.s = r, this.n = r.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(r) { const n = this.s.return; return void 0 === n ? Promise.resolve({ value: r, done: !0 }) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments)); }, throw: function _throw(r) { const n = this.s.return; return void 0 === n ? Promise.reject(r) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(r); }
const _require = require("node:stream"),
  PassThrough = _require.PassThrough;
const _require2 = require("node:zlib"),
  createDeflateRaw = _require2.createDeflateRaw;
const CompressedObject = require("./compressedObject.js");
const crc32 = require("./crc32.js");
const STORE = 0;
const DEFLATE = 8;
const DATA_DESCRIPTOR = 0x0008;
const UTF8 = 0x0800;
const MAX_16 = 0xffff;
const MAX_32 = 0xffffffff;
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
  const value = date || new Date();
  const year = Math.min(2107, Math.max(1980, value.getFullYear()));
  return {
    date: year - 1980 << 9 | value.getMonth() + 1 << 5 | value.getDate(),
    time: value.getHours() << 11 | value.getMinutes() << 5 | value.getSeconds() >> 1
  };
}
function writeChunk(destination, chunk) {
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
function rawData(zip, entry) {
  if (entry.dir) {
    return Buffer.alloc(0);
  }
  const clone = zip.file(entry.name);
  if (!clone) {
    throw new Error("Unable to read ZIP entry: ".concat(entry.name));
  }
  return clone.asNodeBuffer();
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
  const requested = entry.options.compression || options.compression;
  if (requested === "STORE") {
    return STORE;
  }
  if (requested === "DEFLATE") {
    return DEFLATE;
  }
  throw new Error("".concat(requested, " is not a valid compression method for generateNodeStream"));
}
function sourceFor(zip, entry, method) {
  if (isCompressed(entry._data)) {
    const expected = method === STORE ? "\x00\x00" : "\x08\x00";
    if (entry._data.compressionMethod === expected) {
      if (entry._data._fileReader && entry._data._fileReader.createReadStream) {
        return {
          reused: true,
          size: entry._data.compressedSize,
          stream: entry._data._fileReader.createReadStream(entry._data._fileOffset, entry._data.compressedSize)
        };
      }
      const _data = asBuffer(entry._data.getCompressedContent());
      return {
        data: _data,
        reused: true,
        size: _data.length
      };
    }
  }
  const data = rawData(zip, entry);
  return {
    data,
    reused: false,
    size: data.length
  };
}
function utf8Flag(name, comment) {
  return Buffer.byteLength(name, "utf8") !== name.length || Buffer.byteLength(comment, "utf8") !== comment.length ? UTF8 : 0;
}
function localHeader(entry) {
  const header = Buffer.alloc(30 + entry.name.length);
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
  const buffer = Buffer.alloc(16);
  buffer.writeUInt32LE(0x08074b50, 0);
  write32(buffer, entry.crc32, 4);
  write32(buffer, entry.compressedSize, 8);
  write32(buffer, entry.uncompressedSize, 12);
  return buffer;
}
function centralHeader(entry) {
  const buffer = Buffer.alloc(46 + entry.name.length + entry.comment.length);
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
  const buffer = Buffer.alloc(22 + comment.length);
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
function orderedNames(zip, fileOrder) {
  if (typeof fileOrder === "function") {
    return fileOrder(zip.files);
  }
  if (Array.isArray(fileOrder)) {
    return [].concat(_toConsumableArray(fileOrder), _toConsumableArray(Object.keys(zip.files).filter(function (name) {
      return !fileOrder.includes(name);
    })));
  }
  return Object.keys(zip.files);
}
function writeEntry(_x, _x2, _x3, _x4, _x5) {
  return _writeEntry.apply(this, arguments);
}
function _writeEntry() {
  _writeEntry = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(zip, destination, entry, offset, options) {
    let name, comment, method, source, usesDescriptor, dateTime, metadata, _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, chunk, deflater, _iteratorAbruptCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _chunk;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) { switch (_context.prev = _context.next) {
        case 0:
          name = Buffer.from(entry.name, "utf8");
          comment = Buffer.from(entry.comment || "", "utf8");
          if (!(name.length > MAX_16 || comment.length > MAX_16)) {
            _context.next = 4;
            break;
          }
          throw new RangeError("ZIP filename or comment exceeds the classic ZIP limit");
        case 4:
          method = compressionMethod(entry, options);
          source = sourceFor(zip, entry, method);
          usesDescriptor = !source.reused && method === DEFLATE;
          dateTime = dosDateTime(entry.date);
          metadata = {
            comment,
            compressedSize: source.reused || method === STORE ? source.size : 0,
            crc32: source.reused ? entry._data.crc32 >>> 0 : crc32(source.data) >>> 0,
            date: dateTime.date,
            dir: entry.dir,
            dosPermissions: entry.dosPermissions,
            flags: utf8Flag(entry.name, entry.comment || ""),
            method,
            name,
            offset,
            time: dateTime.time,
            uncompressedSize: source.reused ? entry._data.uncompressedSize : source.size,
            usesDescriptor
          };
          _context.next = 11;
          return writeChunk(destination, localHeader(metadata));
        case 11:
          if (!(source.reused || method === STORE)) {
            _context.next = 48;
            break;
          }
          if (!source.stream) {
            _context.next = 44;
            break;
          }
          _iteratorAbruptCompletion = false;
          _didIteratorError = false;
          _context.prev = 15;
          _iterator = _asyncIterator(source.stream);
        case 17:
          _context.next = 19;
          return _iterator.next();
        case 19:
          if (!(_iteratorAbruptCompletion = !(_step = _context.sent).done)) {
            _context.next = 26;
            break;
          }
          chunk = _step.value;
          _context.next = 23;
          return writeChunk(destination, chunk);
        case 23:
          _iteratorAbruptCompletion = false;
          _context.next = 17;
          break;
        case 26:
          _context.next = 32;
          break;
        case 28:
          _context.prev = 28;
          _context.t0 = _context.catch(15);
          _didIteratorError = true;
          _iteratorError = _context.t0;
        case 32:
          _context.prev = 32;
          _context.prev = 33;
          if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
            _context.next = 37;
            break;
          }
          _context.next = 37;
          return _iterator.return();
        case 37:
          _context.prev = 37;
          if (!_didIteratorError) {
            _context.next = 40;
            break;
          }
          throw _iteratorError;
        case 40:
          return _context.finish(37);
        case 41:
          return _context.finish(32);
        case 42:
          _context.next = 46;
          break;
        case 44:
          _context.next = 46;
          return writeChunk(destination, source.data);
        case 46:
          _context.next = 82;
          break;
        case 48:
          deflater = createDeflateRaw({
            level: options.compressionOptions.level
          });
          deflater.end(source.data);
          _iteratorAbruptCompletion2 = false;
          _didIteratorError2 = false;
          _context.prev = 52;
          _iterator2 = _asyncIterator(deflater);
        case 54:
          _context.next = 56;
          return _iterator2.next();
        case 56:
          if (!(_iteratorAbruptCompletion2 = !(_step2 = _context.sent).done)) {
            _context.next = 64;
            break;
          }
          _chunk = _step2.value;
          metadata.compressedSize += _chunk.length;
          _context.next = 61;
          return writeChunk(destination, _chunk);
        case 61:
          _iteratorAbruptCompletion2 = false;
          _context.next = 54;
          break;
        case 64:
          _context.next = 70;
          break;
        case 66:
          _context.prev = 66;
          _context.t1 = _context.catch(52);
          _didIteratorError2 = true;
          _iteratorError2 = _context.t1;
        case 70:
          _context.prev = 70;
          _context.prev = 71;
          if (!(_iteratorAbruptCompletion2 && _iterator2.return != null)) {
            _context.next = 75;
            break;
          }
          _context.next = 75;
          return _iterator2.return();
        case 75:
          _context.prev = 75;
          if (!_didIteratorError2) {
            _context.next = 78;
            break;
          }
          throw _iteratorError2;
        case 78:
          return _context.finish(75);
        case 79:
          return _context.finish(70);
        case 80:
          _context.next = 82;
          return writeChunk(destination, descriptor(metadata));
        case 82:
          return _context.abrupt("return", metadata);
        case 83:
        case "end":
          return _context.stop();
      } }
    }, _callee, null, [[15, 28, 32, 42], [33,, 37, 41], [52, 66, 70, 80], [71,, 75, 79]]);
  }));
  return _writeEntry.apply(this, arguments);
}
function writeArchive(_x6, _x7, _x8) {
  return _writeArchive.apply(this, arguments);
}
function _writeArchive() {
  _writeArchive = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2(zip, destination, options) {
    let names, offset, entries, _iterator3, _step3, name, _entry, centralOffset, _i, _entries, entry, header, comment;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) { switch (_context2.prev = _context2.next) {
        case 0:
          names = orderedNames(zip, options.fileOrder);
          if (!(names.length > MAX_16)) {
            _context2.next = 3;
            break;
          }
          throw new RangeError("ZIP64 is required for more than 65535 entries");
        case 3:
          offset = 0;
          entries = [];
          _iterator3 = _createForOfIteratorHelper(names);
          _context2.prev = 6;
          _iterator3.s();
        case 8:
          if ((_step3 = _iterator3.n()).done) {
            _context2.next = 19;
            break;
          }
          name = _step3.value;
          if (Object.prototype.hasOwnProperty.call(zip.files, name)) {
            _context2.next = 12;
            break;
          }
          return _context2.abrupt("continue", 17);
        case 12:
          _context2.next = 14;
          return writeEntry(zip, destination, zip.files[name], offset, options);
        case 14:
          _entry = _context2.sent;
          entries.push(_entry);
          offset += 30 + _entry.name.length + _entry.compressedSize + (_entry.usesDescriptor ? 16 : 0);
        case 17:
          _context2.next = 8;
          break;
        case 19:
          _context2.next = 24;
          break;
        case 21:
          _context2.prev = 21;
          _context2.t0 = _context2.catch(6);
          _iterator3.e(_context2.t0);
        case 24:
          _context2.prev = 24;
          _iterator3.f();
          return _context2.finish(24);
        case 27:
          centralOffset = offset;
          _i = 0, _entries = entries;
        case 29:
          if (!(_i < _entries.length)) {
            _context2.next = 38;
            break;
          }
          entry = _entries[_i];
          header = centralHeader(entry);
          _context2.next = 34;
          return writeChunk(destination, header);
        case 34:
          offset += header.length;
        case 35:
          _i++;
          _context2.next = 29;
          break;
        case 38:
          comment = Buffer.from(options.comment || zip.comment || "", "utf8");
          if (!(comment.length > MAX_16)) {
            _context2.next = 41;
            break;
          }
          throw new RangeError("ZIP comment exceeds the classic ZIP limit");
        case 41:
          _context2.next = 43;
          return writeChunk(destination, endRecord(entries.length, offset - centralOffset, centralOffset, comment));
        case 43:
        case "end":
          return _context2.stop();
      } }
    }, _callee2, null, [[6, 21, 24, 27]]);
  }));
  return _writeArchive.apply(this, arguments);
}
module.exports = function generateNodeStream() {
  const _this = this;
  const options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const destination = new PassThrough({
    highWaterMark: options.highWaterMark || 64 * 1024
  });
  const settings = {
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
