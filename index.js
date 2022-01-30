'use strict'

const { Readable } = require('readable-stream')

const kIterator = Symbol('iterator')
const kNext = Symbol('next')
const kNextv = Symbol('nextv')
const kLegacy = Symbol('legacy')

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
    super(db, 'iterator', { ...options, keys: true, values: true })
  }

  [kNext] (err, key, value) {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (key === undefined && value === undefined) {
      this.push(null)
    } else {
      this.push({ key, value })
    }
  }

  [kNextv] (err, entries) {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (entries.length === 0) {
      this.push(null)
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
