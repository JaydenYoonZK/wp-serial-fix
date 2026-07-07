# Contributing

The most useful contributions are real serialized values this tool mishandles. PHP serialization has corners (custom `C:` serialization, references, deeply nested objects), and a failing real-world sample is the fastest way to improve the parser.

## Report a mishandled value

Open an [issue](https://github.com/JaydenYoonZK/wp-serial-fix/issues/new/choose) with:

- The serialized value (or a minimal version that reproduces the problem)
- What the tool did, and what you expected
- Where it came from, if relevant (which plugin or option)

If the value is sensitive, reduce it to a minimal reproduction first.

## Development

No build step, no dependencies. The engine is a pure ES module (`docs/serial.js`); the UI (`docs/app.js`) only touches the DOM.

```bash
npm test         # run the suite
npm run serve    # local server on :8401
```

Any parser or replace change needs a test in [`test/serial.test.mjs`](test/serial.test.mjs), ideally with the serialized value that motivated it. Preservation tests (data that must round-trip unchanged) are as valuable as the fix itself.

## Pull requests

Small and focused merges fastest. For anything structural, open an issue first.
