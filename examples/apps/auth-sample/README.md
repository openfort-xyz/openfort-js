# Auth Sample

```typescript
export async function oAuthWithoutPooling() {
  const initOAuth = await openfort.initOAuth(OAuthProvider.GOOGLE, false, {
    redirectTo: 'https://example.com',
  });
  console.log(initOAuth);
  // now you can redirect the user to the initOAuth.url and when the process is done, you will be redirected to the redirectTo url with tokens
  // https://example.com?access_token=...&refresh_token=...
}

export async function oAuthWithPooling() {
  const initOAuth = await openfort.initOAuth(OAuthProvider.GOOGLE, true);
  console.log(initOAuth);
  // now you can redirect the user to the initOAuth.url and when the process is done, a message to close the window will be shown

  // you can pool the auth with the key returned from the initOAuth, this will check if the auth is ready every 0.5 seconds for 5 minutes
  // sessions live for 1 hour, so you can pool the auth again if you need to
  const auth = await openfort.poolOAuth(initOAuth.key);
  console.log(auth);
}

export async function linkOAuthWithoutPooling() {
  const initLinkOAuth = await openfort.initLinkOAuth(OAuthProvider.GOOGLE, 'playerToken', false, {
    redirectTo: 'https://example.com',
  });
  console.log(initLinkOAuth);
  // now you can redirect the user to the initLinkOAuth.url and when the process is done, you will be redirected to the redirectTo url with tokens
  // https://example.com?access_token=...&refresh_token=...
}

export async function linkOAuthWithPooling() {
  const initLinkOAuth = await openfort.initLinkOAuth(OAuthProvider.GOOGLE, 'playerToken', true);
  console.log(initLinkOAuth);
  // now you can redirect the user to the initLinkOAuth.url and when the process is done, a message to close the window will be shown

  // you can pool the auth with the key returned from the initLinkOAuth, this will check if the auth is ready every 0.5 seconds for 5 minutes
  // sessions live for 1 hour, so you can pool the auth again if you need to
  const auth = await openfort.poolOAuth(initLinkOAuth.key);
  console.log(auth);
}
```