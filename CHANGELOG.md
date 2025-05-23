# Changelog

## [2.0.0] - 2024-12-20

_If you are upgrading: please see [`UPGRADING.md`](UPGRADING.md)._

### Changed

- Bump `readable-stream` from 3 to 4 ([#15](https://github.com/Level/read-stream/issues/15)) ([`fc4fb51`](https://github.com/Level/read-stream/commit/fc4fb51)) (Vincent Weevers)
- Use `autoDestroy` option ([#13](https://github.com/Level/read-stream/issues/13)) ([`190f920`](https://github.com/Level/read-stream/commit/190f920)) (Vincent Weevers)

### Removed

- **Breaking:** drop support of `abstract-level` 1 ([`d29bcef`](https://github.com/Level/read-stream/commit/d29bcef)) (Vincent Weevers)
- **Breaking:** drop support of Node.js < 18 ([`77a492d`](https://github.com/Level/read-stream/commit/77a492d)) (Vincent Weevers)

## [1.1.1] - 2024-10-22

### Fixed

- Use promise API for abstract-level 2 compatibility ([#18](https://github.com/Level/read-stream/issues/18)) ([`912041a`](https://github.com/Level/read-stream/commit/912041a)) (Vincent Weevers)

## [1.1.0] - 2022-02-19

### Added

- Add TypeScript type declarations ([#3](https://github.com/Level/read-stream/issues/3)) ([`6ca9ef1`](https://github.com/Level/read-stream/commit/6ca9ef1)) (Vincent Weevers)

### Fixed

- Align LICENSE format with standardized SPDX ([`045a19d`](https://github.com/Level/read-stream/commit/045a19d)) (Vincent Weevers)
- Fix documented default of `highWaterMark` ([`db4e833`](https://github.com/Level/read-stream/commit/db4e833)) (Vincent Weevers).

## [1.0.1] - 2022-01-30

### Fixed

- Make use of `nextv()`, `keys()` and `values()` ([#2](https://github.com/Level/read-stream/issues/2)) ([`7c4fc44`](https://github.com/Level/read-stream/commit/7c4fc44)) (Vincent Weevers).
- Fix `engines.node` version in `package.json` ([`ad5a7b9`](https://github.com/Level/read-stream/commit/ad5a7b9)) (Vincent Weevers).

## [1.0.0] - 2021-12-10

_:seedling: Initial release, forked from [`level-iterator-stream`](https://github.com/Level/iterator-stream)._

[2.0.0]: https://github.com/Level/read-stream/releases/tag/v2.0.0

[1.1.1]: https://github.com/Level/read-stream/releases/tag/v1.1.1

[1.1.0]: https://github.com/Level/read-stream/releases/tag/v1.1.0

[1.0.1]: https://github.com/Level/read-stream/releases/tag/v1.0.1

[1.0.0]: https://github.com/Level/read-stream/releases/tag/v1.0.0
