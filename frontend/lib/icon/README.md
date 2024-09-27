# Icon Library

## Guidelines

Some icons might behave differently but here are some guidelines for adding/making icons

### Mandatory

- No inline styles
- No ID attribute
- No class attribute
- Add role="img"

### Guidelines

- Mono color (black)
- Only fill, no outline
- bounds of 0 0 24 24

## Building

From the frontend project root run

```sh
npm run gen:icons
```

This wil create a "generated.tsx" file with all the icons inline.
