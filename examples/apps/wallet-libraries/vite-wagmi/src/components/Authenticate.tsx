import React, {useState, useEffect, useRef} from 'react';
import Openfort, {
  EmbeddedState,
  ShieldAuthentication,
  ShieldAuthType,
} from '@openfort/openfort-js';
import {useNavigate} from 'react-router-dom';

interface AuthFormData {
  email: string;
  password: string;
}

function Authenticate({openfortInstance}: {openfortInstance: Openfort}) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const poller = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const hasConfiguredSigner = useRef<boolean>(false);

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const currentState = await openfortInstance.getEmbeddedState();
        if (currentState === EmbeddedState.READY) {
          if (poller.current) clearInterval(poller.current);
          navigate('/');
        } else if (
          currentState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED &&
          !hasConfiguredSigner.current
        ) {
          hasConfiguredSigner.current = true;
          await configureEmbeddedSigner();
        }
      } catch (err) {
        console.error('Error checking embedded state with Openfort:', err);
        if (poller.current) clearInterval(poller.current);
      }
    };

    if (!poller.current) {
      poller.current = setInterval(pollEmbeddedState, 300);
    }

    return () => {
      if (poller.current) clearInterval(poller.current);
      poller.current = null;
      hasConfiguredSigner.current = false;
    };
  }, [openfortInstance, navigate]);

  const configureEmbeddedSigner = async () => {
    try {
      const chainId = 80002;
      const shieldAuth: ShieldAuthentication = {
        auth: ShieldAuthType.OPENFORT,
        token: openfortInstance.getAccessToken()!,
      };
      await openfortInstance.configureEmbeddedSigner(chainId, shieldAuth);
    } catch (error) {
      console.error('Error configuring embedded signer:', error);
      setError('Failed to configure embedded signer. Please try again.');
      hasConfiguredSigner.current = false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await openfortInstance.logInWithEmailPassword({
          email: formData.email,
          password: formData.password,
        });
        console.log('User logged in successfully');
      } else {
        await openfortInstance.signUpWithEmailPassword({
          email: formData.email,
          password: formData.password,
        });
        console.log('User registered successfully');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => setIsLogin(!isLogin);

  return (
    <div className="auth-container">
      <h2 className="auth-title">{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-input-group">
          <label htmlFor="email" className="auth-label">
            Email:
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="auth-input"
          />
        </div>
        <div className="auth-input-group">
          <label htmlFor="password" className="auth-label">
            Password:
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="auth-input"
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={isLoading} className="auth-button">
          {isLoading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <p className="auth-toggle-text">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={toggleAuthMode} className="auth-toggle-button">
          {isLogin ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  );
}

export default Authenticate;
