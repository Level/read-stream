'use strict'

const { Readable } = require('readable-stream')

const kIterator = Symbol('iterator')
const kNextv = Symbol('nextv')
const kDestroy = Symbol('destroy')

class LevelReadStream extends Readable {
  constructor (db, method, options) {
    const { highWaterMark, ...rest } = options || {}

    super({
      objectMode: true,
      highWaterMark: highWaterMark || 1000
    })

    this[kIterator] = db[method](rest)
    this[kNextv] = this[kNextv].bind(this)
    this[kDestroy] = this.destroy.bind(this)

    // NOTE: use autoDestroy option when it lands in readable-stream
    this.once('end', this.destroy.bind(this, null, null))
  }

  get db () {
    return this[kIterator].db
  }

  _read (size) {
    if (this.destroyed) return
    this[kIterator].nextv(size).then(
      this[kNextv],
      this[kDestroy]
    )
  }

  [kNextv] (items) {
    if (this.destroyed) return

    if (items.length === 0) {
      this.push(null)
    } else {
      for (const item of items) {
        this.push(item)
      }
    }
  }

  _destroy (err, callback) {
    this[kIterator].close().then(
      err ? () => callback(err) : callback,
      callback
    )
  }
}

class EntryStream extends LevelReadStream {
  constructor (db, options) {
    super(db, 'iterator', { ...options, keys: true, values: true })
  }

  [kNextv] (entries) {
    if (this.destroyed) return

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
