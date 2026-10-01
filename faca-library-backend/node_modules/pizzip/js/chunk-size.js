"use strict";

module.exports = function chunkSize(value) {
  var fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1024 * 1024;
  var size = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(size) || size < 64 || size > 0x7fffffff) {
    throw new RangeError("chunkSize must be an integer between 64 and 2147483647 bytes");
  }
  return size;
};