# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- The hero illustration's broken-row marker is now a red circled X, matching the green circled check on the fixed row.

## [1.0.1] - 2026-07-07

### Fixed

- Status badges in the results now render styled (they were unstyled because the shared stylesheet predated the verdict styles).
- No horizontal page shift on mobile, and long inline URLs in the docs wrap instead of clipping.

## [1.0.0] - 2026-07-07

First stable release.

### Added

- Serialization-safe search and replace: parses PHP serialized data, replaces inside string values, and re-emits with every length prefix recomputed from the real UTF-8 byte length.
- Repair mode that recomputes corrupted length prefixes, handling string content that contains a quote-semicolon.
- Support for arrays, objects (with class name lengths), nested structures, and serialized-inside-serialized strings.
- Multi-value input: paste a column of values, each processed independently, with plain text labeled separately.
- Regex replace option.
- Dependency-free ES module engine (`docs/serial.js`) with 16 Node tests.
- Browser UI in the shared suite design, with light and dark themes, a `?demo` deep link, and a paste-and-process button.

[1.0.1]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.0.0
