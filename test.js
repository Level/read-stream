'use strict'

const test = require('tape')
const { MemoryLevel } = require('memory-level')
const { EntryStream, KeyStream, ValueStream } = require('.')
const { Writable, pipeline } = require('readable-stream')
const addSecretListener = require('secret-event-listener')

let db
const kLastIterator = Symbol('lastIterator')
const data = [
  { key: 'a', value: '1' },
  { key: 'b', value: '2' },
  { key: 'c', value: '3' }
]

test('setup', function (t) {
  db = new MemoryLevel()

  // Keep track of last created iterator for test purposes
  for (const method of ['iterator', 'keys', 'values']) {
    const original = db[method]

    db[method] = function (...args) {
      const it = db[kLastIterator] = original.apply(this, args)
      return it
    }
  }

  db.open(function (err) {
    t.error(err, 'no error')
    db.batch(data.map(x => ({ type: 'put', ...x })), function (err) {
      t.error(err, 'no error')
      t.end()
    })
  })
})

test('EntryStream', function (t) {
  t.plan(2)

  pipeline(new EntryStream(db), new Concat((acc) => {
    t.same(acc, data)
  }), t.ifError.bind(t))
})

test('EntryStream (legacy next)', function (t) {
  t.plan(2)

  pipeline(new EntryStream(db, { legacy: true }), new Concat((acc) => {
    t.same(acc, data)
  }), t.ifError.bind(t))
})

test('KeyStream', function (t) {
  t.plan(2)

  pipeline(new KeyStream(db), new Concat((acc) => {
    t.same(acc, data.map(x => x.key))
  }), t.ifError.bind(t))
})

test('KeyStream (legacy next)', function (t) {
  t.plan(2)

  pipeline(new KeyStream(db, { legacy: true }), new Concat((acc) => {
    t.same(acc, data.map(x => x.key))
  }), t.ifError.bind(t))
})

test('ValueStream', function (t) {
  t.plan(2)

  pipeline(new ValueStream(db), new Concat((acc) => {
    t.same(acc, data.map(x => x.value))
  }), t.ifError.bind(t))
})

test('ValueStream (legacy next)', function (t) {
  t.plan(2)

  pipeline(new ValueStream(db, { legacy: true }), new Concat((acc) => {
    t.same(acc, data.map(x => x.value))
  }), t.ifError.bind(t))
})

for (const Ctor of [EntryStream, KeyStream, ValueStream]) {
  const name = Ctor.name

  test(name + ': normal event order', function (t) {
    const stream = new Ctor(db)

    const order = monitor(stream, function () {
      t.same(order.filter(withoutDataEvents), ['_close', 'end', 'close'])
      t.end()
    })

    stream.resume()
  })

  test(name + ': error from iterator.next', function (t) {
    const stream = new Ctor(db, { legacy: true })

    const order = monitor(stream, function () {
      t.same(order, ['_close', 'error: next', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].next = function (cb) {
      process.nextTick(cb, new Error('next'))
    }

    stream.resume()
  })

  test(name + ': error from iterator.nextv', function (t) {
    const stream = new Ctor(db)

    const order = monitor(stream, function () {
      t.same(order, ['_close', 'error: nextv', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator]._nextv = function (size, options, cb) {
      process.nextTick(cb, new Error('nextv'))
    }

    stream.resume()
  })

  test(name + ': destroy', function (t) {
    const stream = new Ctor(db)
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'close'])
      t.end()
    })

    stream.destroy()
  })

  test(name + ': destroy(err)', function (t) {
    const stream = new Ctor(db)
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'error: user', 'close'])
      t.end()
    })

    stream.destroy(new Error('user'))
  })

  test(name + ': destroy(err, callback)', function (t) {
    const stream = new Ctor(db)
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'callback', 'close'])
      t.end()
    })

    stream.destroy(new Error('user'), function (err) {
      order.push('callback')
      t.is(err.message, 'user', 'got error')
    })
  })

  test(name + ': destroy(null, callback)', function (t) {
    const stream = new Ctor(db)
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'callback', 'close'])
      t.end()
    })

    stream.destroy(null, function (err) {
      order.push('callback')
      t.ifError(err, 'no error')
    })
  })

  test(name + ': destroy() during iterator.next', function (t) {
    const stream = new Ctor(db, { legacy: true })
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].next = function () {
      stream.destroy()
    }

    stream.resume()
  })

  test(name + ': destroy() during iterator.nextv', function (t) {
    const stream = new Ctor(db)
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].nextv = function () {
      stream.destroy()
    }

    stream.resume()
  })

  test(name + ': destroy(err) during iterator.next', function (t) {
    const stream = new Ctor(db, { legacy: true })
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'error: user', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].next = function (cb) {
      stream.destroy(new Error('user'))
    }

    stream.resume()
  })

  test(name + ': destroy(err) during iterator.nextv', function (t) {
    const stream = new Ctor(db)
    const order = monitor(stream, function () {
      t.same(order, ['_close', 'error: user', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].nextv = function (size, options, cb) {
      stream.destroy(new Error('user'))
    }

    stream.resume()
  })

  test(name + ': destroy(err, callback) during iterator.next', function (t) {
    const stream = new Ctor(db, { legacy: true })

    const order = monitor(stream, function () {
      t.same(order, ['_close', 'callback', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].next = function (cb) {
      stream.destroy(new Error('user'), function (err) {
        order.push('callback')
        t.is(err.message, 'user', 'got error')
      })
    }

    stream.resume()
  })

  test(name + ': destroy(err, callback) during iterator.nextv', function (t) {
    const stream = new Ctor(db)

    const order = monitor(stream, function () {
      t.same(order, ['_close', 'callback', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].nextv = function (size, options, cb) {
      stream.destroy(new Error('user'), function (err) {
        order.push('callback')
        t.is(err.message, 'user', 'got error')
      })
    }

    stream.resume()
  })

  test(name + ': destroy(null, callback) during iterator.next', function (t) {
    const stream = new Ctor(db, { legacy: true })

    const order = monitor(stream, function () {
      t.same(order, ['_close', 'callback', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].next = function (cb) {
      stream.destroy(null, function (err) {
        order.push('callback')
        t.ifError(err, 'no error')
      })
    }

    stream.resume()
  })

  test(name + ': destroy(null, callback) during iterator.nextv', function (t) {
    const stream = new Ctor(db)

    const order = monitor(stream, function () {
      t.same(order, ['_close', 'callback', 'close'], 'event order')
      t.end()
    })

    db[kLastIterator].nextv = function (size, options, cb) {
      stream.destroy(null, function (err) {
        order.push('callback')
        t.ifError(err, 'no error')
      })
    }

    stream.resume()
  })

  test(name + ': destroy during iterator.next 1', function (t) {
    const stream = new Ctor(db, { legacy: true })
    const iterator = db[kLastIterator]
    const next = iterator.next.bind(iterator)
    iterator.next = function (cb) {
      t.pass('should be called once')
      next(cb)
      stream.destroy()
    }
    stream.on('data', function (data) {
      t.fail('should not be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy during iterator.nextv 1', function (t) {
    const stream = new Ctor(db)
    const iterator = db[kLastIterator]
    const nextv = iterator.nextv.bind(iterator)
    iterator.nextv = function (size, cb) {
      t.pass('should be called once')
      nextv(size, cb)
      stream.destroy()
    }
    stream.on('data', function (data) {
      t.fail('should not be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy during iterator.next 2', function (t) {
    const stream = new Ctor(db, { legacy: true })
    const iterator = db[kLastIterator]
    const next = iterator.next.bind(iterator)
    let count = 0
    iterator.next = function (cb) {
      t.pass('should be called')
      next(cb)
      if (++count === 2) {
        stream.destroy()
      }
    }
    stream.on('data', function (data) {
      t.pass('should be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy during iterator.nextv 2', function (t) {
    const stream = new Ctor(db)
    const iterator = db[kLastIterator]
    const nextv = iterator.nextv.bind(iterator)
    let count = 0
    iterator.nextv = function (size, cb) {
      t.pass('should be called')
      nextv(size, cb)
      if (++count === 2) {
        stream.destroy()
      }
    }
    stream.on('data', function (data) {
      t.pass('should be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy after iterator.next 1', function (t) {
    const stream = new Ctor(db, { legacy: true })
    const iterator = db[kLastIterator]
    const next = iterator.next.bind(iterator)
    iterator.next = function (cb) {
      next(function (err, key, value) {
        stream.destroy()
        cb(err, key, value)
        t.pass('should be called')
      })
    }
    stream.on('data', function (data) {
      t.fail('should not be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy after iterator.nextv 1', function (t) {
    const stream = new Ctor(db)
    const iterator = db[kLastIterator]
    const nextv = iterator.nextv.bind(iterator)
    iterator.nextv = function (size, cb) {
      nextv(size, function (err, key, value) {
        stream.destroy()
        cb(err, key, value)
        t.pass('should be called')
      })
    }
    stream.on('data', function (data) {
      t.fail('should not be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy after iterator.next 2', function (t) {
    const stream = new Ctor(db, { legacy: true })
    const iterator = db[kLastIterator]
    const next = iterator.next.bind(iterator)
    let count = 0
    iterator.next = function (cb) {
      next(function (err, key, value) {
        if (++count === 2) {
          stream.destroy()
        }
        cb(err, key, value)
        t.pass('should be called')
      })
    }
    stream.on('data', function (data) {
      t.pass('should be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy after iterator.nextv 2', function (t) {
    const stream = new Ctor(db)
    const iterator = db[kLastIterator]
    const nextv = iterator.nextv.bind(iterator)
    let count = 0
    iterator.nextv = function (size, cb) {
      nextv(size, function (err, key, value) {
        if (++count === 2) {
          stream.destroy()
        }
        cb(err, key, value)
        t.pass('should be called')
      })
    }
    stream.on('data', function (data) {
      t.pass('should be called')
    })
    stream.on('close', t.end.bind(t))
  })

  test(name + ': destroy during data listener', function (t) {
    const stream = new Ctor(db)
    stream.once('data', function (data) {
      stream.destroy()
      t.ok(data, 'has data')
      t.end()
    })
  })

  test(name + ': has reference to db', function (t) {
    const stream = new Ctor(db)

    stream.on('close', function () {
      t.is(stream.db, db, 'has reference to db')
      t.end()
    })

    stream.resume()
  })
}

// Note: also serves as teardown of above tests
test('it is safe to close db on end of stream', function (t) {
  // Set highWaterMark to 0 so that we don't preemptively fetch.
  const stream = new EntryStream(db, { highWaterMark: 0 })

  stream.on('end', function () {
    // Although the underlying iterator is still alive at this point (before
    // the 'close' event has been emitted) it's safe to close the db because
    // leveldown (v5) ends any open iterators before closing.
    db.close(function (err) {
      t.ifError(err, 'no error')
      t.end()
    })
  })

  stream.resume()
})

function monitor (stream, onClose) {
  const order = []

  ;['_next', '_nextv', '_close'].forEach(function (method) {
    const original = db[kLastIterator][method]

    db[kLastIterator][method] = function () {
      order.push(method)
      original.apply(this, arguments)
    }
  })

  ;['data', 'end', 'error', 'close'].forEach(function (event) {
    // Add listener without side effects (like triggering flowing mode)
    addSecretListener(stream, event, function (err) {
      if (event === 'error') order.push('error: ' + err.message)
      else order.push(event)
    })
  })

  if (onClose) {
    addSecretListener(stream, 'close', onClose)
  }

  return order
}

function withoutDataEvents (event) {
  return event !== '_next' && event !== '_nextv' && event !== 'data'
}

class Concat extends Writable {
  constructor (fn) {
    super({ objectMode: true })

    this.acc = []
    this.fn = fn
  }

  _write (data, _, next) {
    this.acc.push(data)
    next()
  }

  _final (callback) {
    this.fn(this.acc)
    callback()
  }
}
