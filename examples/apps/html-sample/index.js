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
      debug:true
    },
  });

  const auth = firebaseApp.auth();

  const signInButton = document.getElementById('quickstart-sign-in');
  const signUpButton = document.getElementById('quickstart-sign-up');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  signInButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
      await auth.signInWithEmailAndPassword(email, password);
      addMessage('Signed in');
    } catch (error) {
      console.error('Error signing in:', error);
      addMessage(`Error: ${error.message}`);
    }
  });

  signUpButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      addMessage('Signed up and signed in');
    } catch (error) {
      console.error('Error signing up:', error);
      addMessage(`Error: ${error.message}`);
    }
  });

  auth.onIdTokenChanged(async (user) => {
    if (user) {
      addMessage('Signed in');
      const idToken = await user.getIdToken();
      const player = await openfort.auth.authenticateWithThirdPartyProvider({
        provider:'firebase',
        token:idToken,
        tokenType:'idToken'
      });
      const embeddedState = await openfort.embeddedWallet.getEmbeddedState();
      if (embeddedState === 2) window.location.href = 'recover.html';
      if (embeddedState === 4) window.location.href = 'signature.html';

      addMessage(`Openfort: ${player.id}`);
    } else {
      addMessage('Signed out');
    }
  });
});
