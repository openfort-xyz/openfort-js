'use client'

import React, {useState, useEffect, useRef} from 'react';
import  {
  EmbeddedState,
} from '@openfort/openfort-js';
import { sepolia } from 'viem/chains';
import { useRouter } from 'next/navigation';
import { openfortInstance } from '../../openfort';
import { configureEmbeddedSigner } from '../../lib/utils';

interface AuthFormData {
  email: string;
  password: string;
}

function Authenticate() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const poller = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const hasConfiguredSigner = useRef<boolean>(false);

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const currentState = await openfortInstance.getEmbeddedState();
        if (currentState === EmbeddedState.READY) {
          if (poller.current) clearInterval(poller.current);
          setIsProcessing(false);
          router.push('/');
        } else if (
          currentState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED &&
          !hasConfiguredSigner.current
        ) {
          hasConfiguredSigner.current = true;
          await configureEmbeddedSigner(sepolia.id);
        }
      } catch (err) {
        console.error('Error checking embedded state with Openfort:', err);
        if (poller.current) clearInterval(poller.current);
        setIsProcessing(false);
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
  }, [openfortInstance, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsProcessing(true);

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
      setIsProcessing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

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
            disabled={isProcessing}
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
            disabled={isProcessing}
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button 
          type="submit" 
          disabled={isLoading || isProcessing} 
          className="auth-button relative flex items-center justify-center"
        >
          {isProcessing 
            ? 'Setting up your account...' 
            : isLoading 
              ? isLogin ? 'Logging in...' : 'Creating account...'
              : isLogin ? 'Login' : 'Register'
          }
        </button>
      </form>
      <p className="auth-toggle-text">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button 
          onClick={toggleAuthMode} 
          className="auth-toggle-button"
          disabled={isProcessing}
        >
          {isLogin ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  );
}

export default Authenticate;