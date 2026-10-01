"use strict";

const fs = require("node:fs");
const DataReader = require("./dataReader.js");
function FileReader(file) {
  this.file = file;
  this.fd = fs.openSync(file, "r");
  this.length = fs.fstatSync(this.fd).size;
  this.index = 0;
  this.zero = 0;
}
FileReader.prototype = new DataReader();
FileReader.prototype.byteAt = function (index) {
  const _byte = Buffer.allocUnsafe(1);
  fs.readSync(this.fd, _byte, 0, 1, this.zero + index);
  return _byte[0];
};
FileReader.prototype.readData = function (size) {
  this.checkOffset(size);
  const data = Buffer.allocUnsafe(size);
  fs.readSync(this.fd, data, 0, size, this.zero + this.index);
  this.index += size;
  return data;
};
FileReader.prototype.lastIndexOfSignature = function (signature) {
  const size = Math.min(this.length, 0x10016);
  const offset = this.length - size;
  const data = Buffer.allocUnsafe(size);
  fs.readSync(this.fd, data, 0, size, offset);
  for (let i = data.length - 4; i >= 0; i--) {
    if (data[i] === signature.charCodeAt(0) && data[i + 1] === signature.charCodeAt(1) && data[i + 2] === signature.charCodeAt(2) && data[i + 3] === signature.charCodeAt(3)) {
      return offset + i - this.zero;
    }
  }
  return -1;
};
FileReader.prototype.dispose = function () {
  fs.closeSync(this.fd);
};
FileReader.prototype.createReadStream = function (offset, size) {
  return fs.createReadStream(this.file, {
    start: offset,
    end: offset + size - 1,
    highWaterMark: 64 * 1024
  });
};
module.exports = FileReader;
