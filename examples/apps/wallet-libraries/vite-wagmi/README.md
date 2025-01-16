# Wagmi Kit - Vite
**Step 1**

Ensure you are using the latest `@openfort/openfort-js` by using the latest version from [`@openfort/openfort-js`](https://www.npmjs.com/package/@openfort/openfort-js) in the `package.json` file.

Clone this repository and open it in your terminal. 

```sh
mkdir -p openfort-wagmi-sample-vite && curl -L https://codeload.github.com/openfort-xyz/openfort-js/tar.gz/main | tar -xz --strip=4 -C openfort-wagmi-sample-vite openfort-js-main/examples/apps/wallet-libraries/vite-wagmi && cd openfort-wagmi-sample-vite
```

**Step 2**

Install the necessary dependencies (including [Openfort Auth](https://www.npmjs.com/package/@openfort/openfort-js)) with 

```sh
npm i 
```

**Step 3**

Update `OPENFORT_PUBLISHABLE_KEY`, `SHIELD_ENCRYPTION_PART` and `SHIELD_PUBLISHABLE_KEY` in `src/main.tsx`

```ts
// Openfort and Shield Publishable Key (you will find it in the Dashboard in the `API Keys` section)
const OPENFORT_PUBLISHABLE_KEY = 'OF_PUBLISHABLE_KEY';
const SHIELD_PUBLISHABLE_KEY = 'SHIELD_PUBLISHABLE_KEY'; 
const SHIELD_ENCRYPTION_PART = 'SHIELD_PART'; 
```

**Step 4**

In your project directory, run `npm run dev`. You can now visit http://localhost:3000 to see your app and login with Openfort!