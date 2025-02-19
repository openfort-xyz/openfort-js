'use client'

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { sepolia } from 'viem/chains';
import { MissingRecoveryPasswordError } from '@openfort/openfort-js';

import { openfortInstance } from '../../openfort';
import { configureEmbeddedSigner } from '../../lib/utils';

interface AuthFormData {
  email: string;
  password: string;
}

function Authenticate() {

  useEffect(() => {
    if (openfortInstance) {
      setIsProcessing(true);
      openfortInstance.getUser().then((user) => {
        if(user) {
          setShowRecoveryPasswordInput(true);
        }
      }).catch((e)=>{}).finally(() => {
        setIsProcessing(false);
      });
    }
  }, [openfortInstance]);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
  });
  const [recoveryPasswordInput, setRecoveryPasswordInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecoveryPasswordInput, setShowRecoveryPasswordInput] = useState(false);
  const { chainId } = useAccount();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecoveryPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecoveryPasswordInput(e.target.value);
  };

  const handleRecoveryPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsProcessing(true);

    try {
      await configureEmbeddedSigner(chainId ?? sepolia.id, recoveryPasswordInput);
      setShowRecoveryPasswordInput(false);
    } catch (error) {
      console.error('Recovery password error:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
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

      try {
        await configureEmbeddedSigner(chainId ?? sepolia.id);
      } catch (error) {
        if (error instanceof MissingRecoveryPasswordError) {
          setError('Please set a recovery password to use the embedded signer');
          setShowRecoveryPasswordInput(true);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
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
            disabled={isProcessing || showRecoveryPasswordInput}
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
            disabled={isProcessing || showRecoveryPasswordInput}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || isProcessing || showRecoveryPasswordInput}
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

      {showRecoveryPasswordInput && (
        <form onSubmit={handleRecoveryPasswordSubmit} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="recoveryPassword" className="auth-label">
              Recovery Password:
            </label>
            <input
              type="password"
              id="recoveryPassword"
              name="recoveryPassword"
              value={recoveryPasswordInput}
              onChange={handleRecoveryPasswordChange}
              required
              className="auth-input"
              disabled={isLoading} // Only disable during loading
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || isProcessing}
            className="auth-button relative flex items-center justify-center"
          >
            {isProcessing
              ? 'Setting up your account...'
              : isLoading
              ? 'Submitting recovery password...'
              : 'Submit Recovery Password'
            }
          </button>
        </form>
      )}
      {error && <div className="auth-error">{error}</div>}

      {!showRecoveryPasswordInput && (
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
      )}
    </div>
  );
}

export default Authenticate;
