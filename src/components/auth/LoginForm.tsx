import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'sms' | 'email' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, verifyCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    // Only initialize if not already initialized
    if (!window.recaptchaVerifier) {
      const container = document.getElementById('recaptcha-container');
      if (container) {
        const verifier = new RecaptchaVerifier(auth, container, {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber
          }
        });
        setRecaptchaVerifier(verifier);
        window.recaptchaVerifier = verifier;
      }
    }

    return () => {
      // Cleanup reCAPTCHA on unmount
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
      }
    };
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(username, password, recaptchaVerifier);
      
      if (result === 'sms_verification_needed') {
        setVerificationMethod('sms');
      } else if (result === 'email_verification_needed') {
        setVerificationMethod('email');
      } else if (result === true) {
        // Navigate to the originally requested URL or default page
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await verifyCode(verificationCode);
      if (success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Add recaptcha container div
  const recaptchaContainerStyle = "fixed bottom-0 right-0 z-50";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1511381939415-e44015466834?ixlib=rb-1.2.1&auto=format&fit=crop&w=2072&q=80")',
          filter: 'brightness(0.6)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-30 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-8">
            <div className="w-40 h-40 bg-[#1e3a8a]/80 backdrop-blur-sm rounded-full flex items-center justify-center p-8 shadow-xl transition-transform hover:scale-105 border-2 border-yellow-500/50">
              <div className="text-yellow-400 text-2xl font-serif leading-tight text-center">
                CO<br/>KE<br/>LA<br/>TEH
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#D4B88C] mb-2">Welcome Back</h1>
          <p className="text-yellow-400">Sign in to your account</p>
        </div>

        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-xl shadow-xl border border-yellow-500/20">
          {verificationMethod ? (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-yellow-400 mb-1">
                  {verificationMethod === 'sms' ? 'SMS' : 'Email'} Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-black/30 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-gray-400"
                  placeholder="Enter verification code"
                />
                <p className="mt-2 text-sm text-yellow-400">
                  {verificationMethod === 'sms' 
                    ? 'Enter the code sent to your phone'
                    : 'Enter the code sent to your email'
                  }
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-900/50 text-red-200 border border-red-500/50 rounded-md text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white rounded-lg hover:from-yellow-700 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 shadow-lg shadow-yellow-900/20"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-yellow-400 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 bg-black/30 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-gray-400"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-yellow-400 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-black/30 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-gray-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500/70 hover:text-yellow-400"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/50 text-red-200 border border-red-500/50 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white rounded-lg hover:from-yellow-700 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 shadow-lg shadow-yellow-900/20"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          )}
        </div>
      </div>
      
      {/* Recaptcha Container */}
      <div id="recaptcha-container" className={recaptchaContainerStyle} />
    </div>
  );
}