'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { sepolia } from 'viem/chains';
import { MissingRecoveryPasswordError } from '@openfort/openfort-js';

import { openfortInstance } from '../../openfort';
import { configureEmbeddedSigner, getURL } from '../../lib/utils';
import { useSearchParams } from 'next/navigation';

interface AuthFormData {
  email: string;
  password: string;
}

function Authenticate() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (openfortInstance) {
      setIsProcessing(true);
      openfortInstance.user.get().then((user) => {
        if(user) {
          setShowRecoveryPasswordInput(true);
        }
      }).catch(()=>{}).finally(() => {
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
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecoveryPasswordInput, setShowRecoveryPasswordInput] = useState(false);
  const { chainId } = useAccount();


  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const email = localStorage.getItem("email");
        const state = searchParams.get('state');
        if (
          email && 
          state
        ) {
          await openfortInstance.auth.verifyEmail({
            email: email,
            state: state,
          });
          localStorage.removeItem("email");
          setStatus('Email verified! You can now sign in.');
        }
      } catch (error) {
        setStatus('Error verifying email');
        console.log('Error verifying email:', error);
      }
    };
    verifyEmail();
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecoveryPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecoveryPasswordInput(e.target.value);
  };

  const handleRecoveryPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);
    setIsProcessing(true);

    try {
      await configureEmbeddedSigner(chainId ?? sepolia.id, recoveryPasswordInput);
      setShowRecoveryPasswordInput(false);
    } catch (error) {
      console.error('Recovery password error:', error);
      setStatus(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);
    setIsProcessing(true);

    try {
      if (isLogin) {
        await openfortInstance.auth.logInWithEmailPassword({
          email: formData.email,
          password: formData.password,
        });
        console.log('User logged in successfully');
        
        // Only configure embedded signer after successful login
        try {
          await configureEmbeddedSigner(chainId ?? sepolia.id);
        } catch (error) {
          if (error instanceof MissingRecoveryPasswordError) {
            setStatus('Please set a recovery password to use the embedded signer');
            setShowRecoveryPasswordInput(true);
          } else {
            throw error;
          }
        }
      } else {
        const data = await openfortInstance.auth.signUpWithEmailPassword({
          email: formData.email,
          password: formData.password,
        });
        if (data && "action" in data && data.action === "verify_email") {
          await openfortInstance.auth.requestEmailVerification({
            email: formData.email,
            redirectUrl: getURL() + "/authentication",
          });
          localStorage.setItem("email", formData.email);
          setEmailConfirmation(true);
          // Don't configure embedded signer here - user needs to verify email first
        }
        console.log('User registered successfully');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setStatus(null);
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">{isLogin ? 'Login' : 'Register'}</h2>
        {emailConfirmation ? (
          <div className="flex rounded border border-green-900 bg-green-200 p-4">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                Check your email to confirm
              </h3>
              <div className="text-xs font-medium text-green-900">
                {`You've successfully signed up. Please check your email to
            confirm your account before signing in to the Openfort dashboard`}
              </div>
            </div>
          </div>
        ) : (
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
        )}

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
            className="relative flex items-center justify-center"
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
      {status && <div>{status}</div>}

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
