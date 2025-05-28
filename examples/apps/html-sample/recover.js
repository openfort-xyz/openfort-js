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
    },
  });

  const auth = firebaseApp.auth();
  const chainId = 80002;
  const handleRecovery = async (method, idToken, password = null) => {
    if (method === 'password') {
      const shieldAuth = {
        auth: 'openfort',
        token: idToken,
        authProvider: 'firebase',
        tokenType: 'idToken',
      };
      await openfort.configureEmbeddedSigner(chainId, shieldAuth, password);
    } else if (method === 'automatic') {
      const shieldAuth = {
        auth: 'openfort',
        token: idToken,
        authProvider: 'firebase',
        tokenType: 'idToken',
      };
      await openfort.configureEmbeddedSigner(chainId, shieldAuth);
    }
    addMessage('Recovery process completed.');

    const embeddedState = openfort.getEmbeddedState();
    if (embeddedState === 4) {
      window.location.href = 'signature.html';
    }
  };

  auth.onIdTokenChanged(async (user) => {
    if (user) {
      const idToken = await user.getIdToken();
      const player = await openfort.authenticateWithThirdPartyProvider({
        provider:'firebase',
        token:idToken,
        tokenType:'idToken'
      });
      const embeddedState = openfort.getEmbeddedState();
      if (embeddedState === 4) {
        window.location.href = 'signature.html';
      }

      document
        .getElementById('password-recovery-button')
        .addEventListener('click', async () => {
          const password = document.querySelector(
            'input[name="passwordRecovery"]'
          ).value;
          await handleRecovery('password', idToken, password);
        });

      document
        .getElementById('automatic-recovery-button')
        .addEventListener('click', async () => {
          await handleRecovery('automatic', idToken);
        });
    } else {
      addMessage('Signed out');
      window.location.href = 'index.html';
    }
  });
});
