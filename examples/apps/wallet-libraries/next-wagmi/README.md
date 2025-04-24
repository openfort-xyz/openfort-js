# Wagmi Kit - Next.js
**Step 1**

Ensure you are using the latest `@openfort/openfort-js` by using the latest version from [`@openfort/openfort-js`](https://www.npmjs.com/package/@openfort/openfort-js) in the `package.json` file. Check out the deployed app [here](https://wagmi.openfort.xyz/)!

Clone this repository and open it in your terminal. 

```sh
mkdir -p openfort-wagmi-sample-next && curl -L https://codeload.github.com/openfort-xyz/openfort-js/tar.gz/main | tar -xz --strip=4 -C openfort-wagmi-sample-next openfort-js-main/examples/apps/wallet-libraries/next-wagmi && cd openfort-wagmi-sample-next
```

**Step 2**

Install the necessary dependencies (including [Openfort Auth](https://www.npmjs.com/package/@openfort/openfort-js)) with 

```sh
npm i 
```

**Step 3**

Initialize your environment variables by copying the `.env.example` file to an `.env.local` file. Then, in `.env.local`, [paste your Openfort ID from the dashboard](https://www.openfort.io/docs/configuration/api-keys).

```sh
# In your terminal, create .env.local from .env.example
cp .env.example .env.local

# Add your Openfort keys to .env.local
NEXT_PUBLIC_OPENFORT_PUBLIC_KEY=
NEXT_PUBLIC_SHIELD_API_KEY=

NEXTAUTH_SHIELD_ENCRYPTION_SHARE=
NEXTAUTH_SHIELD_SECRET_KEY=
```

If you want to sponsor transactions, you can add policies to your `.env.local` file. You can create gas sponsorship policies [from your Openfort dashboard](https://www.openfort.io/docs/development/gas-sponsorship).


```sh
NEXT_PUBLIC_POLICY_SEPOLIA=
NEXT_PUBLIC_POLICY_BASE_SEPOLIA=
```

**Step 4**

In your project directory, run `npm run dev`. You can now visit http://localhost:3000 to see your app and login with Openfort!
