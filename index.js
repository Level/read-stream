'use strict'

const { Readable } = require('readable-stream')

const kIterator = Symbol('iterator')
const kKeys = Symbol('keys')
const kValues = Symbol('values')

function ReadStream (iterator, options) {
  if (!(this instanceof ReadStream)) {
    return new ReadStream(iterator, options)
  }

  Readable.call(this, Object.assign({}, options, {
    objectMode: true
  }))

  this[kIterator] = iterator
  this[kKeys] = options ? options.keys !== false : true
  this[kValues] = options ? options.values !== false : true

  this.on('end', this.destroy.bind(this, null, null))
}

Object.setPrototypeOf(ReadStream.prototype, Readable.prototype)

Object.defineProperty(ReadStream.prototype, 'iterator', {
  get () { return this[kIterator] }
})

ReadStream.prototype._read = function () {
  if (this.destroyed) return

  this[kIterator].next((err, key, value) => {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (key === undefined && value === undefined) {
      this.push(null)
    } else if (this[kKeys] !== false && this[kValues] === false) {
      this.push(key)
    } else if (this[kKeys] === false && this[kValues] !== false) {
      this.push(value)
    } else {
      this.push({ key, value })
    }
  })
}

ReadStream.prototype._destroy = function (err, callback) {
  this[kIterator].end(function (err2) {
    callback(err || err2)
  })
}

module.exports = ReadStream
