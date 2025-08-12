'use client';

import React, { useEffect, useState } from 'react';
import { openfortInstance } from '../openfort';
import { getURL } from '../lib/utils';

interface AuthFormData {
  email: string;
  password: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  
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
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecoveryPasswordInput, setShowRecoveryPasswordInput] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setStatus(null);
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
        
        onAuthSuccess?.();
        onClose();
      } else {
        const data = await openfortInstance.auth.signUpWithEmailPassword({
          email: formData.email,
          password: formData.password,
        });
        if (data && "action" in data && data.action === "verify_email") {
          await openfortInstance.auth.requestEmailVerification({
            email: formData.email,
            redirectUrl: getURL() + "/",
          });
          localStorage.setItem("email", formData.email);
          setEmailConfirmation(true);
        } else {
          console.log('User registered successfully');  
          onAuthSuccess?.();
          onClose();
        }
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

  const handleCreateGuestAccount = async () => {
    setStatus(null);
    setIsLoading(true);
    setIsProcessing(true);
    try {
      await openfortInstance.auth.signUpGuest();
      
      setStatus('Guest account created successfully');
      onAuthSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating guest account:', error);
      setStatus(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="auth-title">{isLogin ? 'Login' : 'Register'}</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          {emailConfirmation ? (
            <div className="flex rounded border border-green-900 bg-green-200 p-4">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Check your email to confirm
                </h3>
                <div className="text-xs font-medium text-green-900">
                  {`You've successfully signed up. Please check your email to
                  confirm your account before signing in`}
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
          
          {status && <div className="status-message">{status}</div>}
          
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
          <p className="auth-toggle-text">
            {'Create a guest account? '}
            <button
              onClick={handleCreateGuestAccount}
              className="auth-toggle-button"
              disabled={isProcessing}
            >
              {'Create'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;