# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.2] - 2026-07-09

### Fixed

- On phones the menu no longer hides items behind an invisible horizontal scroll. Below 720px it wraps onto its own row under the brand with every item visible and centered, and the bar scrolls away with the page instead of pinning several rows to a small screen; the back-to-top button brings it back into reach. Desktop keeps the single sticky row, and section jumps account for the new offsets.

## [1.1.1] - 2026-07-09

### Fixed

- The Paste button works on iPhone and iPad again. The previous touch flow skipped the iOS clipboard confirmation and waited for a manual paste that most people never discover, so the button looked dead. The clipboard is now requested the same way on every device: iOS shows its Paste confirmation at the tap point, and confirming it fills the box and processes it in one motion. If the read is declined, the box is focused with a hint and processing runs by itself as soon as a paste lands. An empty clipboard now says so.

## [1.1.0] - 2026-07-09

### Added

- Handles PHP references (`R:` and `r:`) and custom-serialized objects (`C:`) instead of failing on them. References are preserved verbatim, and a custom object's opaque payload is left untouched while string values around it are still replaced. This widens the range of real serialized data the tool can safely process, including object graphs that share values.

### Changed

- The Paste button is always the green primary action and replaces the box in one click.
- The hero illustration is now a symmetric before-and-after: matched status icons lead each row, a green arrow carries the transformation, and the caption anchors the bottom.

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

[1.1.2]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.2
[1.1.1]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.1
[1.1.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.0
[1.0.1]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.0.0
