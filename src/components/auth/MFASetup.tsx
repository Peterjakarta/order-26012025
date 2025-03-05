import React, { useState, useEffect } from 'react';
import { Phone, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { getAuth, RecaptchaVerifier, PhoneAuthProvider, signInWithPhoneNumber } from 'firebase/auth';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  useEffect(() => {
    // Initialize reCAPTCHA verifier
    const auth = getAuth();
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        }
      });
    }

    return () => {
      // Cleanup reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  const sendVerificationCode = async () => {
    try {
      setError(null);
      setLoading(true);

      const auth = getAuth();
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedNumber,
        window.recaptchaVerifier!
      );

      setVerificationId(confirmationResult.verificationId);
      setStep('code');
    } catch (err) {
      console.error('Error sending verification code:', err);
      setError('Failed to send verification code. Please check your phone number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    try {
      setError(null);
      setLoading(true);

      const auth = getAuth();
      const credential = PhoneAuthProvider.credential(verificationId!, verificationCode);
      
      // Link the phone credential to the current user
      const user = auth.currentUser;
      if (!user) throw new Error('No user found');
      
      await user.linkWithCredential(credential);
      onComplete();
    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Setup Two-Factor Authentication</h2>
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {step === 'phone' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <button
                onClick={sendVerificationCode}
                disabled={loading || !phoneNumber}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send Code'
                )}
              </button>
            </div>
          </div>

          <div id="recaptcha-container"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              maxLength={6}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={verifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify Code'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>
          We'll send a verification code to your phone number. Standard message and data rates may apply.
        </p>
      </div>
    </div>
  );
}