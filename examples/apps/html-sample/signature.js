document.addEventListener('DOMContentLoaded', async () => {
  const firebaseApp = firebase.initializeApp({
    apiKey: 'AIzaSyCCUPOkncFnbTjAdXAOr0rMJSlZ7pZ6eoE',
    authDomain: 'non-custodial-sample.firebaseapp.com',
    projectId: 'non-custodial-sample',
    appId: '1:1053697688933:web:593d3e0db64b08af2b0d8c',
  });

  const openfort = new Openfort({
    baseConfiguration: {
      publishableKey: 'pk_test_505bc088-905e-5a43-b60b-4c37ed1f887a',
    },
    shieldConfiguration: {
      shieldPublishableKey: '56ca3248-d8a4-499c-b07b-aa9d50a2b577',
      shieldEncryptionKey: 'ApIULM96wggoEnYQ5x+TO5KRiYiHZdcNQ7wKtV1dvulp',
      debug: true,
    },
  });

  const auth = firebaseApp.auth();

  const signMessage = async (message) => {
    const signature = await openfort.signMessage(message);
    if (!signature) {
      addMessage(`Error: There was an error signing the message.`);
    }
    addMessage(`Signature: ${signature}`);
  };

  const logout = async () => {
    await openfort.logout();
    await auth.signOut();
  };

  auth.onIdTokenChanged(async (user) => {
    if (user) {
      const idToken = await user.getIdToken();
      await openfort.authenticateWithThirdPartyProvider(
        'firebase',
        idToken,
        'idToken'
      );
      const embeddedState = openfort.getEmbeddedState();
      console.log(embeddedState);
      if (embeddedState !== 4) {
        window.location.href = 'index.html';
      }

      document
        .getElementById('sign-message-button')
        .addEventListener('click', async () => {
          await signMessage('Hello Message');
        });

      document
        .getElementById('logout-button')
        .addEventListener('click', async () => {
          await logout();
        });
    } else {
      addMessage('Signed out');
      window.location.href = 'index.html';
    }
  });
});
