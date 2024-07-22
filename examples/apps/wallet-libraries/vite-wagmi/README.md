# Wagmi Kit
**Step 1**

Ensure you are using the latest `@openfort/openfort-js` by using the latest version from [`@openfort/openfort-js`](https://www.npmjs.com/package/@openfort/openfort-js) in the `package.json` file.

**Step 2**

Create a Openfort account on Openfort Dashboard.

**Step 3**

Update `OPENFORT_PUBLISHABLE_KEY`, `SHIELD_ENCRYPTION_PART` and `SHIELD_PUBLISHABLE_KEY` in `src/main.tsx`

```ts
// Openfort and Shield Publishable Key (you will find it in the Dashboard in the `API Keys` section)
const OPENFORT_PUBLISHABLE_KEY = 'OF_PUBLISHABLE_KEY';
const SHIELD_PUBLISHABLE_KEY = 'SHIELD_PUBLISHABLE_KEY'; 
const SHIELD_ENCRYPTION_PART = 'SHIELD_PART'; 
```

**Step 4**

```sh
yarn && yarn dev
```
