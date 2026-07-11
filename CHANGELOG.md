# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.0] - 2026-07-11

### Added

- Structure-aware repair explores valid string boundaries inside arrays and objects, verifies the completed serialized value, and refuses ambiguous or unrecoverable input instead of guessing.
- Parser safeguards cap input size, node count, structural depth, nested serialized strings, and regular expression length.
- Regression coverage now includes exact numeric headers, UTF-8 boundaries, malformed object and custom-object headers, nested repairs, misleading token text inside strings, whitespace preservation, references, and depth exhaustion.

### Changed

- Continuous integration now tests supported Node.js releases 20, 22, and 24 on Linux, with Windows and macOS coverage retained.
- Documentation now distinguishes value-level browser work from full database replacement and documents the engine's text and resource boundaries.

### Fixed

- String, object, array, custom-object, scalar, and reference headers are validated exactly instead of accepting numeric prefixes followed by junk.
- UTF-8 lengths can no longer end in the middle of a multibyte character, including class names and custom payloads.
- Search and replace preserves whitespace around serialized values, and an empty engine-level search is now a no-op.
- Repair failures are reported as failures in the result summary instead of being labeled as already valid.

## [1.2.25] - 2026-07-11

### Fixed

- The cursor dust now lands directly on the pointer. The trail canvas is a replaced element, so inset alone did not stretch it and it laid out at its intrinsic retina-scaled size; on high-density displays every spark drew at a multiple of the cursor's position, drifting further from it toward the bottom right of the page. The canvas is now explicitly stretched to the viewport, verified at retina density.

## [1.2.24] - 2026-07-11

### Added

- A magical cursor trail. Tiny chartreuse sparks with the occasional twinkling four point star follow the pointer and burn out about a second after it rests. Dark mode gets pale glowing dust, light mode a deeper green so it stays visible on cream. It runs on a single fixed canvas, spawn rate follows how far the pointer travels, and the animation loop stops the moment the last spark dies, so an idle page costs nothing. Touch devices never load it and reduced motion turns it off entirely.

## [1.2.23] - 2026-07-11

### Changed

- The film grain is finer and milder. Each grain dot is now half its previous size, one device pixel on typical phone screens, and the overall intensity is reduced by about a quarter in both themes. Finer grain dithers banding more efficiently per unit of opacity, so gradients stay smooth while the texture recedes to a whisper. README previews regenerated.

## [1.2.22] - 2026-07-11

### Fixed

- The theme toggle no longer glitches when tapped on phones. Touch browsers pin the hover state to the last-tapped control, so after a tap the toggle sat stuck mid-twist with its hover halo on, layered over the press spin. All decorative hover styling for buttons, the toggle, and the scroll-to-top control now only exists on devices that can actually hover; touch devices get the clean press feedback alone. Controls also opt out of the double-tap zoom gesture, so taps respond without hesitation.

## [1.2.21] - 2026-07-11

### Fixed

- The film grain now actually renders on iPhone and iPad. WebKit does not apply SVG filters when an SVG is rasterized as a CSS background image, so the turbulence-based tile painted a faint dark veil with no noise at all on iOS, leaving gradient banding fully visible there. The grain is now a small pre-rendered raster tile that every browser draws identically, and it renders pixel-crisp on high-density screens instead of being smoothed into blur when the display upscales it. Gradient banding is dithered away in both themes with no soft or low-quality look. README previews regenerated.

## [1.2.20] - 2026-07-11

### Fixed

- The key press finally travels. During a click the pointer is still hovering, and the hover lift rule outranked the press rule, so the cap held its raised position while the shadows switched to pressed geometry, which read as the base jumping up instead of the cap going down. The press is now declared after the hover lift at matching specificity and wins the cascade, so the cap visibly sinks 3px into its anchored base on every click.
- Dark mode's primary button no longer loses its 3D edge on hover. A leftover rule from before the key redesign replaced the whole hover shadow with a flat glow.
- In light mode the pressed shadow now outranks the hover shadow mid click, so the primary button's base geometry stays correct through the press.
- Tapping controls on phones no longer flashes the system's default grey tap rectangle over the design's own pressed states. Keyboard focus outlines are unaffected.

## [1.2.19] - 2026-07-11

### Changed

- The 3D key buttons are rebuilt on realistic press physics. The base and its ground shadow are now anchored in place through every state: at rest the cap sits proud on a 5px base, hovering lifts the cap 1px while the base bottom stays put, and pressing sinks the cap 3px into the base with 2px of it still showing beneath the sunken cap, its ground shadow never moving and the shading inside the cap deepening. Before, the whole assembly moved together and the press read as the base rising instead of the cap sinking. Under reduced motion the cap stays still and only the shading responds. README previews are regenerated with the new resting stance.

## [1.2.18] - 2026-07-10

### Changed

- Pressing a button now reads as the cap sinking into its socket. Before, the dark bottom edge collapsed as the button traveled down, which looked like the base rising to meet it. The edge now stays put beneath the sunken cap and a soft shadow falls across the cap's top, so the press feels like a real key going down.

## [1.2.17] - 2026-07-10

### Added

- A whisper of film grain now sits over the whole page in both themes. Large soft gradients band into visible steps on most displays; the static monochrome noise dithers those steps away and gives the surface a subtle print-like tooth. It is one tiled SVG turbulence texture with no blend mode and no animation, so it composites for free, stays out of pointer input, and is dropped entirely in print. README previews are regenerated with the new surface.

## [1.2.16] - 2026-07-10

### Fixed

- The theme toggle now turns and swells on hover on every page, the playful twist that until now only the WHMCS Emoji Compatibility Guide showed. All pages always shared the same hover rule, but a more specific button rule was overriding its transform with the standard key lift on the other tools. The toggle's hover and press rules now outrank the tactile key rules everywhere.
- Hovers and tooltips respond during the theme crossfade again. The crossfade overlay intercepts pointer input by default, which deadened the page, most noticeably the toggle's own hover twist and tooltip, for half a second after every theme switch. The live page underneath now stays interactive while the fade plays, matching how immediate the toggle felt before the fade shipped.

## [1.2.15] - 2026-07-10

### Fixed

- Tooltip arrows are visible again. The arrow is a bordered square whose colored wedge sat entirely behind the tooltip bubble, which paints later and shares the same ink color, so the bubble swallowed the arrow and nothing bridged the gap to the button. The arrow now sits with its tip in the gap, 4px off the button, and its base tucked one pixel under the bubble edge, painting above the bubble so the two read as a single speech-bubble shape. Both variants are fixed, the standard bubble above a button and the theme toggle's bubble below it.

## [1.2.14] - 2026-07-10

### Fixed

- The theme crossfade no longer stutters on phones. The browser's default crossfade blends the old and new page snapshots with a plus-lighter blend inside an isolated compositing group, which means two full-screen render passes every frame. Desktop GPUs absorb that, phone GPUs drop frames. The new page now sits fully opaque underneath while the old snapshot simply fades out above it, which reads identically on an opaque page and costs a single alpha layer. Decorative drift animations also pause for the half second the fade runs, freeing GPU headroom on mobile without any visible freeze.

## [1.2.13] - 2026-07-10

### Fixed

- Text no longer flashes and re-settles mid fade when switching between light and dark mode. Text color inherits, so during the old per-element fade every element kept re-easing its parent's already animating color, which made type lag behind the page and snap late. The switch now crossfades the whole page as a single composited snapshot through the View Transitions API, so text and background move together in one smooth pass. The theme toggle is excluded, so its sun and moon morph still plays live. Browsers without view transitions fall back to fading backgrounds, borders and shadows only, with text changing in one clean step.

## [1.2.12] - 2026-07-10

### Fixed

- The inline code chip inside alerts no longer renders as a dead grey block in light mode. Its 35% black wash was tuned for dark backgrounds; over the light pink alert it read as mud. In light mode the chip is now a crisp near-white card with a hairline red keyline, so the decoded payload stands out cleanly.

### Changed

- Switching themes now fades the whole page between night and day over half a second instead of snapping instantly, which could startle or dazzle, especially dark to light at night. The fade covers colors only (backgrounds, text, borders, shadows, SVG fills), and the theme toggle is excluded so its sun and moon morph keeps its own spring timing.

## [1.2.11] - 2026-07-10

### Fixed

- The theme toggle now shows the crescent moon on phones. The previous build morphed the mark by animating SVG geometry (the circle's radius and the mask position) from CSS, which desktop browsers support but iOS Safari does not apply, so dark mode on a phone showed a plain dot instead of a moon. The switch is rebuilt on opacity and transform only, the sun spins away as a true crescent path spins in, which every mobile browser animates. Same look on desktop, now correct everywhere.

## [1.2.10] - 2026-07-10

### Changed

- The theme toggle is redesigned from an emoji swap into a morphing mark. One vector drawing plays the whole switch: the sun's core grows into the moon while a masked bite slides in to carve the crescent, the eight rays spring away with an overshoot, and the mark tilts to seat the crescent, all reversed when switching back. The moon is brand chartreuse at night and the sun is warm amber by day, the round button trades the key edge for a soft brand halo on hover, and a tooltip appears below it saying which mode a click will switch to, on hover and keyboard focus only, never on touch. The morph is disabled under reduced-motion preferences.
- The README preview is regenerated.

## [1.2.9] - 2026-07-10

### Fixed

- The back-to-top button no longer casts a heavy black smudge in light mode. Its shadow was a single wide dark-theme blur that was never re-tuned for a cream background. Each theme now gets a layered shadow of its own: a tight warm contact shadow plus a soft chartreuse halo in light mode, and a grounded contact shadow with a gentle chartreuse under-glow in dark, with matching hover and pressed variants.

## [1.2.8] - 2026-07-10

### Changed

- Removed the pulsing status dot from the privacy pill. The animated dot has become one of the most recognizable template cliches on the web, and it was redundant next to the lock icon that already carries the meaning. The pill now leads with the lock alone, with its padding evened out.
- The README preview is regenerated.

## [1.2.7] - 2026-07-10

### Added

- Tactile depth across the interface. Every button is now built like a physical key: a hard edge shadow beneath it, a soft ambient shadow, and a hairline top bevel. Hovering lifts the key slightly, and pressing travels it down while the edge collapses underneath, a real press you can feel. Primary buttons carry a chartreuse edge and glow, secondary buttons use a warm brand-brown edge in light mode and a deep neutral one in dark, disabled buttons stay flat since a dead control should not look pressable, and the movement is disabled under reduced-motion preferences while the shadow feedback remains. Cards gain a quiet layered elevation per theme.
- The README preview is regenerated.

## [1.2.6] - 2026-07-10

### Fixed

- The menu's hover state no longer turns grey, and no longer sticks. Hovering used a grey panel tone that clashed with the brand language, and on phones a tap glued that grey pill to the last-tapped item because touch browsers keep a sticky hover. Hover styling now only applies on devices with a real pointer and uses a faint chartreuse brand tint, while the active item keeps the stronger chartreuse wash and always wins when it is both hovered and active.
- The active menu item now also carries `aria-current`, so screen readers hear which section you are in, kept in sync with the highlight by the same scroll logic.

## [1.2.5] - 2026-07-10

### Changed

- Light mode brings the brand home. The signature chartreuse #abcf37 button with dark ink text, the same button dark mode has always had, is now the primary action in light mode too, and chartreuse drives the accent washes, the menu band, the page glow, and the decorative scene. The airy cream background and crisp white cards return, links use a fresh deep green that passes AA on every chartreuse wash, and the verdict colors return to the vivid set with bright washes. Every rendered text pair measures 4.5:1 or better on the live page (the brand button measures above 10:1), and the dark theme is untouched.
- The README preview is regenerated for the new palette.

## [1.2.4] - 2026-07-10

### Changed

- Light mode now uses the studio palette chosen from design references: sand background #EEE3CF, warm ivory cards, coral #FE6E54 primary buttons with dark ink text (mirroring dark mode's dark-on-chartreuse buttons), a deep coral accent for links and highlights, sage #93A86C washes with the dark green #375554 as success text, a pale gold #FCDB99 wash under warning pills, teal #40A5A0 washes with indigo #363D6E as info text, and a coral, sage, and teal decorative scene. Every rendered text pair measures 4.5:1 or better on the live page, and the dark theme is untouched.
- The README preview is regenerated for the new palette.

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

[1.3.0]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.3.0
[1.2.25]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.25
[1.2.24]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.24
[1.2.23]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.23
[1.2.22]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.22
[1.2.21]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.21
[1.2.20]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.20
[1.2.19]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.19
[1.2.18]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.18
[1.2.17]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.17
[1.2.16]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.16
[1.2.15]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.15
[1.2.14]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.14
[1.2.13]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.13
[1.2.12]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.12
[1.2.11]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.11
[1.2.10]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.10
[1.2.9]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.9
[1.2.8]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.8
[1.2.7]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.7
[1.2.6]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.6
[1.2.5]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.5
[1.2.4]: https://github.com/JaydenYoonZK/wp-serial-fix/releases/tag/v1.2.4
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
