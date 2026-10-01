"use strict";

var fs = require("node:fs");
var os = require("node:os");
var path = require("node:path");
var CompressedObject = require("./compressedObject.js");
var FileReader = require("./fileReader.js");
function toBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === "string") {
    return Buffer.from(data, "binary");
  }
  return Buffer.from(data);
}
function writeAll(fd, buffer, offset) {
  var written = 0;
  while (written < buffer.length) {
    var count = fs.writeSync(fd, buffer, written, buffer.length - written, offset + written);
    if (!count) {
      throw new Error("Could not write filesystem ZIP storage");
    }
    written += count;
  }
}
function readExactly(fd, buffer, offset, size) {
  var read = 0;
  while (read < size) {
    var count = fs.readSync(fd, buffer, read, size - read, offset + read);
    if (!count) {
      throw new Error("Corrupted zip : unexpected end of file");
    }
    read += count;
  }
}
function DiskData(storage, offset, size) {
  this.storage = storage;
  this.offset = offset;
  this.size = size;
  this._pizzipDiskData = true;
}
DiskData.prototype.getContent = function () {
  return this.storage.read(this.offset, this.size);
};
DiskData.prototype.createReadStream = function (chunkSize) {
  return this.storage.createReadStream(this.offset, this.size, chunkSize);
};
function FilesystemStorage(options) {
  this.chunkSize = require("./chunk-size.js")(options.chunkSize);
  var directory = options.directory || os.tmpdir();
  if (!fs.statSync(directory).isDirectory()) {
    throw new Error("Filesystem ZIP storage directory does not exist: " + directory);
  }
  this.path = fs.mkdtempSync(path.join(directory, "pizzip-"));
  this.file = path.join(this.path, "entries");
  try {
    this.fd = fs.openSync(this.file, "wx+", 384);
  } catch (error) {
    fs.rmSync(this.path, {
      recursive: true,
      force: true
    });
    throw error;
  }
  this.size = 0;
  this.closed = false;
  this.filter = options.filter || null;
}
FilesystemStorage.prototype.assertOpen = function () {
  if (this.closed) {
    throw new Error("Filesystem ZIP storage has been disposed");
  }
};
FilesystemStorage.prototype.shouldStore = function (name) {
  return !this.filter || this.filter(name);
};
FilesystemStorage.prototype.createReadStream = function (offset, size) {
  var chunkSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.chunkSize;
  return FileReader.createFdReadStream(this, offset, size, chunkSize, "Filesystem ZIP storage has been disposed");
};
FilesystemStorage.prototype.write = function (data, encoding) {
  this.assertOpen();
  var offset = this.size;
  if (typeof data === "string") {
    data = Buffer.from(data, encoding);
  }
  var buffer = toBuffer(data);
  writeAll(this.fd, buffer, offset);
  this.size += buffer.length;
  return new DiskData(this, offset, buffer.length);
};
FilesystemStorage.prototype.read = function (offset, size) {
  this.assertOpen();
  var buffer = Buffer.allocUnsafe(size);
  readExactly(this.fd, buffer, offset, size);
  return buffer;
};
FilesystemStorage.prototype.copyFrom = function (fd, offset, size) {
  this.assertOpen();
  var destOffset = this.size;
  if (!size) {
    return new DiskData(this, destOffset, 0);
  }
  var buffer = Buffer.allocUnsafe(Math.min(this.chunkSize, size));
  var remaining = size;
  var src = offset;
  var dest = destOffset;
  while (remaining > 0) {
    var want = Math.min(buffer.length, remaining);
    readExactly(fd, buffer, src, want);
    writeAll(this.fd, buffer.subarray(0, want), dest);
    src += want;
    dest += want;
    remaining -= want;
  }
  this.size += size;
  return new DiskData(this, destOffset, size);
};
FilesystemStorage.prototype.wrapCompressed = function (diskData, source) {
  var result = CompressedObject.from(source, function () {
    return diskData.getContent();
  });
  result._fileReader = this;
  result._fileOffset = diskData.offset;
  return result;
};
FilesystemStorage.prototype.compressed = function (data, source) {
  return this.wrapCompressed(this.write(data), source);
};
FilesystemStorage.prototype.compressedFromReader = function (source) {
  source._fileReader.assertOpen();
  return this.wrapCompressed(this.copyFrom(source._fileReader.fd, source._fileOffset, source.compressedSize), source);
};
FilesystemStorage.prototype.dispose = function () {
  if (this.closed) {
    return;
  }
  this.closed = true;
  fs.closeSync(this.fd);
  fs.rmSync(this.path, {
    recursive: true,
    force: true
  });
};
FilesystemStorage.DiskData = DiskData;
module.exports = FilesystemStorage;