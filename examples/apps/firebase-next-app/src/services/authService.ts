import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { app } from '../utils/firebaseConfig'

const auth = getAuth(app)

const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      callback(user)
    } else {
      callback(null)
    }
  })
}

// Sign up function
const signUp = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password)
}

// Sign in function
const signIn = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password)
}

// Sign in with Google
const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

// Sign out function
const signOutUser = async (): Promise<void> => {
  return signOut(auth)
}

export const authService = {
  signUp,
  signIn,
  signInWithGoogle,
  logout: signOutUser,
  onAuthStateChanged,
}
