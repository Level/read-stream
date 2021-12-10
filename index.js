'use strict'

const { Readable } = require('readable-stream')

const kIterator = Symbol('iterator')
const kNext = Symbol('next')

class LevelReadStream extends Readable {
  constructor (db, options) {
    const { highWaterMark, ...rest } = options

    super({
      objectMode: true,
      highWaterMark: highWaterMark || 16
    })

    this[kIterator] = db.iterator(rest)
    this[kNext] = this[kNext].bind(this)

    // NOTE: use autoDestroy option when it lands in readable-stream
    this.once('end', this.destroy.bind(this, null, null))
  }

  get db () {
    return this[kIterator].db
  }

  _read () {
    if (this.destroyed) return
    this[kIterator].next(this[kNext])
  }

  _destroy (err, callback) {
    this[kIterator].end(function (err2) {
      callback(err || err2)
    })
  }
}

class Entry {
  constructor (key, value) {
    this.key = key
    this.value = value
  }
}

class EntryStream extends LevelReadStream {
  constructor (db, options) {
    super(db, { ...options, keys: true, values: true })
  }

  [kNext] (err, key, value) {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (key === undefined && value === undefined) {
      this.push(null)
    } else {
      this.push(new Entry(key, value))
    }
  }
}

class KeyStream extends LevelReadStream {
  constructor (db, options) {
    super(db, { ...options, keys: true, values: false })
  }

  [kNext] (err, key) {
    if (this.destroyed) return
    if (err) return this.destroy(err)
    this.push(key === undefined ? null : key)
  }
}

class ValueStream extends LevelReadStream {
  constructor (db, options) {
    super(db, { ...options, keys: false, values: true })
  }

  [kNext] (err, _, value) {
    if (this.destroyed) return
    if (err) return this.destroy(err)
    this.push(value === undefined ? null : value)
  }
}

exports.EntryStream = EntryStream
exports.KeyStream = KeyStream
exports.ValueStream = ValueStream
