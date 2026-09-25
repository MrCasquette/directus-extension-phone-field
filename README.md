# Directus Phone Field

Phone number field for Directus: country selector, as-you-type formatting, E.164 storage and server-side validation.

Built on [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) (`max` metadata: numbers are validated against real number ranges per country, not just their length).

## Features

This bundle ships three extensions that work together.

### Interface — `Phone`

- Country selector with flags, localized country names and calling codes.
- As-you-type formatting in the national format of the selected country.
- Typing an international number (`+44…`) switches the selector to the detected country.
- Input longer than the country's maximum length is rejected.
- Invalid numbers are highlighted once the field loses focus.
- Stores the number in [E.164](https://en.wikipedia.org/wiki/E.164) format (`+33612345678`).

Options:

| Option              | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| Default country     | Country preselected when the field is empty.                      |
| Preferred countries | Countries listed first in the selector, above the full list.      |

### Display — `Phone`

Shows the number with its country flag, as a clickable `tel:` link.

| Option | Description                                                        |
| ------ | ------------------------------------------------------------------ |
| Format | `International` (`+33 6 12 34 56 78`) or `National` (`06 12 34 56 78`). |

### Hook — server-side validation

Applies to every field using the `Phone` interface, on item create and update, whatever the source (app, REST, GraphQL, SDK, flows):

- Normalizes the value to E.164.
- Rejects invalid numbers with a native `FAILED_VALIDATION` error.
- Adds a default note to the field describing the expected format, unless one is already set.

Accepted write formats:

```jsonc
"+33 6 12 34 56 78"                          // any international format
"+33612345678"                               // E.164
{ "country": "FR", "number": "06 12 34 56 78" } // national number with its country
```

A national number without a country (`"06 12 34 56 78"`) is rejected, since its country cannot be inferred.

## Requirements

- Directus `^12.0.0`
- A `string` field

## Installation

### Marketplace

This bundle contains a non-sandboxed API hook: installing it from the Marketplace requires `MARKETPLACE_TRUST=all` on your Directus instance.

### Manual

```sh
npm install directus-extension-phone-field
```

Or copy the built extension (`package.json` and `dist/`) into your `extensions` folder, then restart Directus.

## Usage

1. Create a `string` field (or edit an existing one).
2. Select the `Phone` interface and configure the default and preferred countries.
3. Select the `Phone` display to render the number in layouts and relations.

## Development

```sh
pnpm install
pnpm dev        # build in watch mode
pnpm build
pnpm type-check
pnpm validate
```

## License

[MIT](./LICENSE)
