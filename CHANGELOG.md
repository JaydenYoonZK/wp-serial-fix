# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.3] - 2026-07-10

### Changed

- Light mode is redesigned around a warm editorial palette inspired by premium product sites: terracotta coral becomes the accent for buttons, links, and highlights, the success wash turns sage, the danger red deepens toward crimson so it stays clearly apart from the coral, type warms one step browner, the menu band turns soft sage, and the decorative scene (orbs, spheres, cube wireframes) moves to coral, sage, and warm brown. The cream background and the whole dark theme are untouched, and every rendered text pair measures 4.5:1 or better on the live page.
- The README preview is regenerated for the new light palette.

## [1.2.2] - 2026-07-10

### Changed

- Light mode's palette is rebuilt around fresh hues instead of darkened earth tones. The accent is now a vivid deep green, success is emerald, the warning orange is clear instead of brown, and the red is brighter. Chip and pill washes are tinted from bright brand colors rather than from the dark text colors, so they read as lively pastels instead of a gray film, and the light-mode decorative constants (page glow, cube wireframes, spheres) moved from olive to brand chartreuse. Every rendered text pair was re-measured at 4.5:1 or better on the live page; dark mode is untouched.
- The README preview is regenerated to show the new light palette beside dark mode.

## [1.2.1] - 2026-07-10

### Added

- CI now runs the test suite and browser module syntax checks on Linux, Windows, and macOS.
- Security reporting is documented through GitHub private vulnerability reports.
- Regression tests cover invalid regular expressions for both plain text and serialized values.

### Fixed

- Invalid regex input now returns a controlled per-value error instead of throwing and breaking the browser interaction on plain text.
- The README stars badge now links to the repository page instead of the zero-star `/stargazers` page that GitHub returns as 404.
- The browser tool cache-busts its serialization engine import so Pages serves the current audited code.

## [1.2.0] - 2026-07-09

### Added

- A Content Security Policy on the browser tool. Everything runs locally and the page makes no network request, so the policy sets `connect-src 'none'`, which means the browser itself refuses to send your pasted database values anywhere. Verified in a browser: the tool works and an outbound request is blocked.

### Fixed

- The parser now validates scalar values, so malformed data like `i:notanumber;` or `b:5;` is no longer accepted as valid serialized data. It round-tripped harmlessly before, but a plain-text line that merely resembled a broken scalar could flip the multi-value paste flow into the wrong mode. Real PHP scalars, including the special doubles `INF`, `-INF`, and `NAN` and scientific notation, still parse.

### Changed

- Accessibility: the paste box now has a real label instead of one hidden with `display:none`.
- 19 tests, up from 18.

### Notes

This release followed a full audit of the serialization engine with adversarial inputs. No other defect was found: byte-accurate lengths for multibyte and emoji, NUL-delimited private and protected object keys, references, custom-serialized objects, nested serialized-inside-serialized values, and the strict parser trusting the length prefix through quote-semicolon content all behave correctly, and repair stays linear on large input.

## [1.1.6] - 2026-07-09

### Changed

- Light mode's status colors are livelier and now measurably meet WCAG AA. The olive green, brown amber, and muted red came from darkening alone, which made them muddy; they are replaced with fully saturated deep equivalents (accent #4c7a00, green #1d7a25, orange #ba4700, red #c62a22), the soft chip tints were eased to match, primary buttons in light mode use white text on the deep accent, and light muted text was deepened one step. Measured on the rendered page, every status pill, link, button label, and muted text now sits at 4.5:1 or better; the previous accent and the muted text on tinted chips quietly failed. Dark mode is untouched.

## [1.1.5] - 2026-07-09

### Added

- The hero illustration now has a light-mode version. It is the same inline drawing recolored through the theme tokens, so it follows the theme toggle instantly and always stays in step with the palette. Dark mode is unchanged.

## [1.1.4] - 2026-07-09

### Fixed

- Clicking a menu item now always highlights the item you clicked. The highlight was driven by an observer watching a band in the middle of the viewport, but a menu jump lands the section heading at the top, outside that band, so the green pill often stayed on a section the page had merely scrolled past. The active item is now computed directly from the scroll position: the last section whose heading sits above the reading line under the header, with the last section winning at the very bottom of the page.

## [1.1.3] - 2026-07-09

### Changed

- The menu now sits in its own tinted band under the brand bar on every screen size, giving the header a clear hierarchy: brand and theme toggle on top, menu below, every item always visible. The whole header is sticky again on all devices, and section jumps measure the header instead of assuming its height, so they land exactly below it however many rows the menu wraps to.

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

[1.2.3]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.3
[1.2.2]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.2
[1.2.1]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.1
[1.1.6]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.6
[1.1.5]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.5
[1.1.4]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.4
[1.1.3]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.3
[1.1.2]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.2
[1.1.1]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.1
[1.2.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.0
[1.1.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.1.0
[1.0.1]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.0.0
