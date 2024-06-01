import React, {useState, useEffect} from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import {useAuthentication} from '../../hooks/useAuthentication';
import Spinner from '../Shared/Spinner';

enum AuthMode {
  LOGIN = 'login',
  SIGNUP = 'signup',
  PASSWORD_RECOVERY = 'passwordRecovery',
  EMAIL_VERIFICATION = 'emailVerification',
}

interface LoginSignupFormProps {
  verifyEmail?: boolean;
}

const LoginSignupForm: React.FC<LoginSignupFormProps> = ({
  verifyEmail = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState(
    verifyEmail ? AuthMode.EMAIL_VERIFICATION : AuthMode.LOGIN
  );
  const {signIn, signUp, requestPasswordReset, requestEmailVerification} =
    useAuthentication();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verifyEmail) {
      setAuthMode(AuthMode.EMAIL_VERIFICATION);
    }
  }, [verifyEmail]);

  const handleToggle = (mode: AuthMode) => setAuthMode(mode);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    event.preventDefault();
    try {
      switch (authMode) {
        case AuthMode.LOGIN:
          await signIn(email, password);
          break;
        case AuthMode.SIGNUP:
          await signUp(email, password);
          await requestEmailVerification(
            email,
            `${window.location.href}callback`
          );
          alert('Verification email sent. Please check your inbox.');
          break;
        case AuthMode.PASSWORD_RECOVERY:
          await requestPasswordReset(
            email,
            `${window.location.href}recover-password`
          );
          alert('Password recovery email sent. Please check your inbox.');
          break;
        case AuthMode.EMAIL_VERIFICATION:
          await requestEmailVerification(
            email,
            `${window.location.href}callback`
          );
          alert('Verification email sent. Please check your inbox.');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Failed to ${authMode}:`, error);
      alert(`Failed to ${authMode}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    switch (authMode) {
      case AuthMode.LOGIN:
      case AuthMode.SIGNUP:
        return (
          <>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
            </div>
          </>
        );
      case AuthMode.PASSWORD_RECOVERY:
      case AuthMode.EMAIL_VERIFICATION:
        return (
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h2 className="text-left mb-2 font-semibold text-xl">
        {authMode === AuthMode.LOGIN && 'Sign In'}
        {authMode === AuthMode.SIGNUP && 'Sign Up'}
        {authMode === AuthMode.PASSWORD_RECOVERY && 'Password Recovery'}
        {authMode === AuthMode.EMAIL_VERIFICATION && 'Email Verification'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderFormContent()}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex space-x-5 justify-center p-2 bg-black text-white rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50"
        >
          {loading ? (
            <Spinner />
          ) : authMode === AuthMode.LOGIN ? (
            'Sign In'
          ) : authMode === AuthMode.SIGNUP ? (
            'Sign Up'
          ) : (
            'Submit'
          )}
        </button>
        {authMode === AuthMode.LOGIN && <GoogleSignInButton />}
      </form>
      <div className="mt-4">
        {authMode === AuthMode.LOGIN && (
          <>
            <button
              onClick={() => handleToggle(AuthMode.SIGNUP)}
              className="text-indigo-600 hover:underline"
            >
              Need to create an account?
            </button>
            <button
              onClick={() => handleToggle(AuthMode.PASSWORD_RECOVERY)}
              className="ml-4 text-indigo-600 hover:underline"
            >
              Forgot password?
            </button>
          </>
        )}
        {authMode === AuthMode.SIGNUP && (
          <button
            onClick={() => handleToggle(AuthMode.LOGIN)}
            className="text-indigo-600 hover:underline"
          >
            Already have an account?
          </button>
        )}
        {authMode === AuthMode.PASSWORD_RECOVERY && (
          <button
            onClick={() => handleToggle(AuthMode.LOGIN)}
            className="text-indigo-600 hover:underline"
          >
            Remembered your password? Sign in.
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginSignupForm;
