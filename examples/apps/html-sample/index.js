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

  const signInButton = document.getElementById('quickstart-sign-in');
  const signUpButton = document.getElementById('quickstart-sign-up');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const EMBEDDED_STATE_SIGNER_NOT_CONFIGURED = 2;
  const EMBEDDED_STATE_READY_FOR_SIGNATURE = 4;

  signInButton.addEventListener('click', async () => {
    const { email, password } = getCredentials();
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      addMessage(`Error: ${error.message}`);
    }
  });

  signUpButton.addEventListener('click', async () => {
    const { email, password } = getCredentials();
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      addMessage('Signed up and signed in');
    } catch (error) {
      console.error('Error signing up:', error);
      addMessage(`Error: ${error.message}`);
    }
  });

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      addMessage('Signed in');
      const player = await openfort.user.get();
      const embeddedState = await openfort.embeddedWallet.getEmbeddedState();
      addMessage(`Openfort: ${player.id}`);

      if (embeddedState === EMBEDDED_STATE_SIGNER_NOT_CONFIGURED) window.location.href = 'recover.html';
      if (embeddedState === EMBEDDED_STATE_READY_FOR_SIGNATURE) window.location.href = 'signature.html';
    } else {
      addMessage('Signed out');
    }
  });

  function getCredentials() {
    return {
      email: emailInput.value,
      password: passwordInput.value
    };
  }
});
