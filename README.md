# React + TypeScript + Vite

## Main layout and role navigation

The shared application shell provides a Figma-aligned horizontal header,
responsive navigation, and page content area. Navigation is filtered for these frontend
profiles: `operations-administrator`, `guest`, `sales-customer-success`, and
`npd-lead`. A missing or unrecognized role fails closed: the menu is empty and
routes show the access-denied screen. `App` accepts an optional role only as the
integration seam for a future authenticated provider; production must pass a
role derived from claims in a validated Keycloak token, never from browser
storage, cookies, editable profile data, or URL parameters.

The search, resource-registration, logout, profile, and operations-status UI is
rendered only when its corresponding real callback or data is provided to `App`.
There are no sample resource counts, sample user names, notification counts, or
session timers in the application shell. Feature pages and API/authentication
integration still need to be connected before production use.

The frontend menu and route checks are for user experience only. The API must
continue to enforce authorization for every protected operation. No credentials
or tokens are persisted by this layout.

Run `npm test` for the local suite, `npm run test:coverage` for coverage, and
`npm run build` for the production TypeScript/build check.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
