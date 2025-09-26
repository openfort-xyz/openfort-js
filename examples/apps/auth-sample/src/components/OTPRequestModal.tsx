import React, { useState } from 'react';
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

type ContactMethod = 'email' | 'phone';

interface OTPRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contact: { email?: string; phone?: string }) => Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function OTPRequestModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  title = "Verification Required",
  description = "Please choose how you'd like to receive your verification code."
}: OTPRequestModalProps) {
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentValue = contactMethod === 'email' ? email : phone;
    
    if (!currentValue.trim()) {
      setError(`${contactMethod === 'email' ? 'Email' : 'Phone number'} is required`);
      return;
    }

    if (contactMethod === 'email' && !currentValue.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (contactMethod === 'phone' && !/^\+?[\d\s\-()]+$/.test(currentValue)) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setError('');
      const contactData = contactMethod === 'email' 
        ? { email: currentValue.trim() }
        : { phone: currentValue.trim() };
      
      await onSubmit(contactData);
      setEmail('');
      setPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP');
    }
  };

  const handleClose = () => {
    setEmail('');
    setPhone('');
    setError('');
    setContactMethod('email');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Method Selector */}
          <div className="space-y-2">
            <Label>Contact Method</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={contactMethod === 'email' ? 'default' : 'outline'}
                onClick={() => setContactMethod('email')}
                disabled={isLoading}
                className="flex-1"
              >
                Email
              </Button>
              <Button
                type="button"
                variant={contactMethod === 'phone' ? 'default' : 'outline'}
                onClick={() => setContactMethod('phone')}
                disabled={isLoading}
                className="flex-1"
              >
                Phone
              </Button>
            </div>
          </div>

          {/* Dynamic Input Based on Selected Method */}
          <div className="space-y-2">
            {contactMethod === 'email' ? (
              <>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
              </>
            ) : (
              <>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
              </>
            )}
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}