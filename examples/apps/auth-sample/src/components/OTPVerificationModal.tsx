import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (otpCode: string) => Promise<void>;
  onResendOTP: () => Promise<void>;
  email: string;
  isLoading?: boolean;
}

export function OTPVerificationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onResendOTP, 
  email, 
  isLoading = false 
}: OTPVerificationModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.trim()) {
      setError('Verification code is required');
      return;
    }

    if (otpCode.trim().length < 9) {
      setError('Please enter the complete verification code');
      return;
    }

    try {
      setError('');
      await onSubmit(otpCode.trim());
      setOtpCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    try {
      setIsResending(true);
      setError('');
      await onResendOTP();
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    setOtpCode('');
    setError('');
    setCountdown(0);
    onClose();
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9); // Only numbers, max 6 digits
    setOtpCode(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Verification Code</DialogTitle>
          <DialogDescription>
            We've sent a 9-digit verification code to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otpCode">Verification Code</Label>
            <Input
              ref={inputRef}
              id="otpCode"
              type="text"
              placeholder="000000000"
              value={otpCode}
              onChange={handleOtpChange}
              disabled={isLoading}
              className="w-full text-center text-2xl tracking-widest"
              maxLength={9}
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={handleResend}
              disabled={isResending || countdown > 0}
              className="text-sm"
            >
              {isResending 
                ? 'Sending...' 
                : countdown > 0 
                  ? `Resend code in ${countdown}s` 
                  : 'Resend code'
              }
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || otpCode.length < 9}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}