# WP Serial Fix 🧩

Change URLs and domains in WordPress serialized data without breaking it, and repair data a bad SQL replace already corrupted. Runs entirely in your browser.

<p>
  <a href="https://jaydenyoonzk.github.io/wp-serial-fix/"><img src="https://img.shields.io/badge/Live%20tool-open-abcf37?style=for-the-badge&logo=githubpages&logoColor=black" alt="Open the live tool"></a>
  <a href="https://github.com/JaydenYoonZK/wp-serial-fix/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/JaydenYoonZK/wp-serial-fix/ci.yml?style=for-the-badge&label=tests" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JaydenYoonZK/wp-serial-fix?style=for-the-badge" alt="MIT License"></a>
</p>

<a href="https://jaydenyoonzk.github.io/wp-serial-fix/?demo">
  <img src="docs/assets/preview.png" alt="WP Serial Fix shown in light and dark themes, the hero with its before-and-after serialized-value illustration recalculating every length prefix" width="100%">
</a>

**[Open the live tool](https://jaydenyoonzk.github.io/wp-serial-fix/)** or **[see it fix a sample](https://jaydenyoonzk.github.io/wp-serial-fix/?demo)**. Nothing is uploaded.

## The problem

WordPress stores widget layouts, theme options, and page builder content as PHP serialized strings, where every string carries its exact byte length:

```
s:18:"http://old.example";
```

Move the site and run a database-wide find and replace, and the text changes but the number does not:

```
s:18:"https://new.longer.example";   ← says 18, is actually 26
```

PHP reads 18 bytes, finds data where it expected a closing quote, and `unserialize()` returns `false`. WordPress treats the option as empty and your settings silently vanish. No error, just a homepage that forgot its widgets. It is the most common way a WordPress migration goes wrong.

## What this does

- **Serialization-safe search and replace**: parses the value, replaces inside the strings, and re-emits with every length prefix recomputed from the real byte length (multibyte and emoji counted correctly). It follows the same safety principle as `wp search-replace`, with no database connection.
- **Conservative repair mode**: follows arrays and objects to recover wrong string lengths, validates the completed value, and leaves ambiguous or unrecoverable input unchanged.
- **Nested data**: descends into serialized data stored inside other serialized strings, which WordPress does constantly.
- **Objects, arrays, mixed input**: handles `O:` objects (with class name lengths), nested arrays, `R:`/`r:` references and `C:` custom-serialized objects, private and protected object properties, and pasted columns of many values at once, labeling plain text separately.

## Use it

No install: [jaydenyoonzk.github.io/wp-serial-fix](https://jaydenyoonzk.github.io/wp-serial-fix/)

Run locally:

```bash
git clone https://github.com/JaydenYoonZK/wp-serial-fix.git
cd wp-serial-fix
npm run serve   # http://localhost:8401
```

## Use the engine in your own project

`docs/serial.js` is a dependency-free ES module:

```js
import { strictReplace, repair, isSerialized } from "./serial.js";

// safe replace
strictReplace('a:1:{i:0;s:18:"http://old.example";}', "old.example", "new.example.org");

// repair already-broken data
repair('s:19:"https://new-domain.example";').text;   // valid serialized data
```

## Tests

```bash
npm test
```

39 tests cover round-tripping, exact headers, UTF-8 byte boundaries, nested serialization, references, custom-serialized objects, structure-aware repair, invalid regular expressions, resource limits, and mixed input. Coverage is measured with `npm run test:coverage`.

The parser accepts values up to 5 MiB, 100,000 nodes, and 256 structural levels. Nested serialized strings are followed to 32 levels. These limits keep accidental or hostile input from tying up the browser. PHP strings are byte streams, while a browser text box contains Unicode text, so opaque non-text binary payloads should be handled with PHP or WP-CLI instead.

## When to use WP-CLI instead

For a whole live database, `wp search-replace "old" "new"` is the right tool. WP Serial Fix is for a handful of values, one stubborn option, a page builder layout, or a cleanup, without giving a web page database access.

## License

MIT. Built and maintained by [Jayden Yoon ZK](https://github.com/JaydenYoonZK). Part of a WordPress toolkit with [WP Config Doctor](https://github.com/JaydenYoonZK/wp-config-doctor) and [WP Plugin Checkup](https://github.com/JaydenYoonZK/wp-plugin-checkup).
