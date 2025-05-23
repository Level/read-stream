# Upgrade Guide

This document describes breaking changes and how to upgrade. For a complete list of changes including minor and patch releases, please refer to the [changelog](CHANGELOG.md).

## 2.0.0

Drops support of `abstract-level` 1 (and its callback API) as well as Node.js < 18. Stick with `level-read-stream` 1 if you need to support both `abstract-level` 1 and 2.

## 1.0.0

If you are migrating from `levelup` or `level <= 7` to an [`abstract-level`](https://github.com/Level/abstract-level) database, that database will no longer have stream methods. If you previously did:

```js
const stream = db.createReadStream(...)
```

You must now do:

```js
const { EntryStream } = require('level-read-stream')

const stream = new EntryStream(db, ...)
```

Same goes for `db.createKeyStream()` and `db.createValueStream()`. If you previously did:

```js
const keys = db.createKeyStream(...)
const values = db.createValueStream(...)
```

You must now do:

```js
const { KeyStream, ValueStream } = require('level-read-stream')

const keys = new KeyStream(db, ...)
const values = new ValueStream(db, ...)
```

The arguments (`...` in the examples above) are the same except that `EntryStream` does not take `keys` or `values` options. If you previously did e.g.:


```js
const keys = db.createReadStream({ keys: true, values: false })
```

You must now do:

```js
const keys = new KeyStream(db)
```

For TypeScript users: you will also need to `npm install @types/readable-stream`.
