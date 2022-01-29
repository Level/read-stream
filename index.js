'use strict'

const { Readable } = require('readable-stream')

const kIterator = Symbol('iterator')
const kNext = Symbol('next')
const kNextv = Symbol('nextv')
const kLegacy = Symbol('legacy')
const kArrays = Symbol('arrays')

class LevelReadStream extends Readable {
  constructor (db, method, options) {
    const { highWaterMark, legacy, ...rest } = options || {}

    super({
      objectMode: true,
      highWaterMark: highWaterMark || 16
    })

    this[kIterator] = db[method](rest)
    this[kNext] = this[kNext].bind(this)
    this[kNextv] = this[kNextv].bind(this)

    // Temporary, undocumented option for benchmarking and old tests
    this[kLegacy] = !!legacy

    // NOTE: use autoDestroy option when it lands in readable-stream
    this.once('end', this.destroy.bind(this, null, null))
  }

  get db () {
    return this[kIterator].db
  }

  _read (size) {
    if (this.destroyed) return

    if (this[kLegacy]) {
      this[kIterator].next(this[kNext])
    } else {
      this[kIterator].nextv(size, this[kNextv])
    }
  }

  [kNext] (err, item) {
    if (this.destroyed) return
    if (err) return this.destroy(err)
    this.push(item === undefined ? null : item)
  }

  [kNextv] (err, items) {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (items.length === 0) {
      this.push(null)
    } else {
      for (const item of items) {
        this.push(item)
      }
    }
  }

  _destroy (err, callback) {
    this[kIterator].close(function (err2) {
      callback(err || err2)
    })
  }
}

class EntryStream extends LevelReadStream {
  constructor (db, options) {
    const { arrays, ...forward } = options || {}
    super(db, 'iterator', { ...forward, keys: true, values: true })
    this[kArrays] = !!arrays
  }

  [kNext] (err, key, value) {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (key === undefined && value === undefined) {
      this.push(null)
    } else {
      this.push(this[kArrays] ? [key, value] : { key, value })
    }
  }

  [kNextv] (err, entries) {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (entries.length === 0) {
      this.push(null)
    } else if (this[kArrays]) { // TODO: bench
      for (const entry of entries) {
        this.push(entry)
      }
    } else {
      for (const [key, value] of entries) {
        this.push({ key, value })
      }
    }
  }
}

class KeyStream extends LevelReadStream {
  constructor (db, options) {
    super(db, 'keys', options)
  }
}

class ValueStream extends LevelReadStream {
  constructor (db, options) {
    super(db, 'values', options)
  }
}

exports.EntryStream = EntryStream
exports.KeyStream = KeyStream
exports.ValueStream = ValueStream
