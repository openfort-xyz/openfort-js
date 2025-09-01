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
      shieldPublishableKey: 'a4b75269-65e7-49c4-a600-6b5d9d6eec66',
      shieldEncryptionKey: '/cC/ElEv1bCHxvbE/UUH+bLIf8nSLZOrxj8TkKChiY4=',
      debug: true
    },
    overrides: {
      thirdPartyAuthProvider: "firebase",
      getAccessToken: async () => {
        console.log("----- Getting access token from Firebase auth -----");
        return (await auth.currentUser?.getIdToken(/* forceRefresh */ false)) ?? null
      },
    }
  });

  const auth = firebaseApp.auth();

  const signMessage = async (message) => {
    const signature = await openfort.embeddedWallet.signMessage(message);
    if (!signature) {
      addMessage(`Error: There was an error signing the message.`);
    }
    addMessage(`Signature: ${signature}`);
  };

  const logout = async () => {
    await openfort.auth.logout();
    await auth.signOut();
  };

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const embeddedState = await openfort.embeddedWallet.getEmbeddedState();
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
