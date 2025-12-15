document.addEventListener('DOMContentLoaded', async () => {
  const firebaseApp = firebase.initializeApp({
    apiKey: 'AIzaSyCCUPOkncFnbTjAdXAOr0rMJSlZ7pZ6eoE',
    authDomain: 'non-custodial-sample.firebaseapp.com',
    projectId: 'non-custodial-sample',
    appId: '1:1053697688933:web:593d3e0db64b08af2b0d8c',
  })

  const openfort = new Openfort({
    baseConfiguration: {
      publishableKey: 'pk_test_505bc088-905e-5a43-b60b-4c37ed1f887a',
    },
    shieldConfiguration: {
      shieldPublishableKey: 'a4b75269-65e7-49c4-a600-6b5d9d6eec66',
      shieldEncryptionKey: '/cC/ElEv1bCHxvbE/UUH+bLIf8nSLZOrxj8TkKChiY4=',
      debug: true,
    },
    overrides: {
      thirdPartyAuthProvider: 'firebase',
      getAccessToken: async () => {
        console.log('----- Getting access token from Firebase auth -----')
        return (await auth.currentUser?.getIdToken(/* forceRefresh */ false)) ?? null
      },
    },
  })

  const getEncryptionSession = async () => {
    // This application is using the backend of another sample in this repository to host the automatic recovery endpoint: https://www.openfort.io/docs/configuration/recovery-methods#automatic-recovery
    // You can find the source code for the backend in the auth-sample: https://github.com/openfort-xyz/openfort-js/tree/main/examples/apps/auth-sample
    // or you can use the following backend quickstart https://github.com/openfort-xyz/openfort-backend-quickstart
    const response = await fetch('https://create-next-app.openfort.io/api/protected-create-encryption-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    return data.session
  }

  const auth = firebaseApp.auth()
  const chainId = 80002
  const handleRecovery = async (method, _idToken, password = null) => {
    if (method === 'password') {
      await openfort.embeddedWallet.configure({
        chainId: chainId,
        recoveryParams: {
          recoveryMethod: 'password',
          password: password,
        },
      })
    } else if (method === 'automatic') {
      await openfort.embeddedWallet.configure({
        chainId: chainId,
        recoveryParams: {
          recoveryMethod: 'automatic',
          encryptionSession: await getEncryptionSession(),
        },
      })
    }
    addMessage('Recovery process completed.')

    const embeddedState = await openfort.embeddedWallet.getEmbeddedState()
    if (embeddedState === 4) {
      window.location.href = 'signature.html'
    }
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const idToken = await user.getIdToken()
      await openfort.getAccessToken()
      const embeddedState = await openfort.embeddedWallet.getEmbeddedState()
      if (embeddedState === 4) {
        window.location.href = 'signature.html'
      }

      document.getElementById('password-recovery-button').addEventListener('click', async () => {
        const password = document.querySelector('input[name="passwordRecovery"]').value
        await handleRecovery('password', idToken, password)
      })

      document.getElementById('automatic-recovery-button').addEventListener('click', async () => {
        await handleRecovery('automatic', idToken)
      })
    } else {
      addMessage('Signed out')
      window.location.href = 'index.html'
    }
  })
})
