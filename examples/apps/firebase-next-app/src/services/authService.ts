import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup, 
    UserCredential, 
    User,
    onIdTokenChanged
  } from 'firebase/auth';
  import { app } from '../utils/firebaseConfig'; 

  const auth = getAuth(app);
  
  const onIdTokenChange = (callback: (user: User| null) => void) => {
    return onIdTokenChanged(auth, async(user) => {
      if (user) {
        callback(user);
      } else {
        callback(null);
      }
    });
  };

  // Sign up function
  const signUp = async (email: string, password: string): Promise<UserCredential> => {
    return createUserWithEmailAndPassword(auth, email, password);
  };
  
  // Sign in function
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  };
  
  // Sign in with Google
  const signInWithGoogle = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };
  
  // Sign out function
  const signOutUser = async (): Promise<void> => {
    return signOut(auth);
  };
  
  export const authService = {
    signUp,
    signIn,
    signInWithGoogle,
    logout: signOutUser,
    onIdTokenChanged: onIdTokenChange,
  };
  