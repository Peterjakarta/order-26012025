import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import MFASetup from './MFASetup';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize reCAPTCHA on mount
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const initializeRecaptcha = async () => {
      try {
        // Clear any existing reCAPTCHA
        if (window.recaptchaVerifier) {
          await window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        }

        // Create container if it doesn't exist
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          const div = document.createElement('div');
          div.id = 'recaptcha-container';
          div.className = 'mt-4 flex justify-center';
          document.querySelector('form')?.appendChild(div);
        }

        // Initialize reCAPTCHA
        await import('../../lib/firebase').then(({ initRecaptcha }) => {
          if (mounted) {
            initRecaptcha().then(() => {
              if (mounted) {
                setRecaptchaReady(true);
                setError(null);
              }
            }).catch((err) => {
              console.error('reCAPTCHA initialization error:', err);
              if (mounted) {
                setError('Security verification failed to load. Please refresh the page.');
                if (retryCount < maxRetries) {
                  retryCount++;
                  setTimeout(initializeRecaptcha, retryDelay * retryCount);
                }
              }
            });
          }
        });
      } catch (err) {
        console.error('Error initializing reCAPTCHA:', err);
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          setTimeout(initializeRecaptcha, retryDelay * retryCount);
        }
      }
    };

    // Delay initialization slightly to ensure DOM is ready
    setTimeout(initializeRecaptcha, 100);

    return () => {
      mounted = false;
      // Clean up reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Input validation
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }

      if (!password) {
        setError('Please enter your password.');
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
      }

      // Ensure reCAPTCHA is ready
      if (!recaptchaReady || !window.recaptchaVerifier) {
        setError('Please wait for security verification to load.');
        return;
      }

      setError(null);
      setLoading(true);

      const { requiresMFA } = await login(email, password);
      
      if (requiresMFA) {
        setShowMFASetup(true);
      } else {
        // Navigate to the originally requested URL or default page
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message === 'MFA required') {
          setShowMFASetup(true);
          return;
        }

        if (err.message.includes('auth/user-not-found')) {
          setError('No account found with this email address.');
        } else if (err.message.includes('auth/wrong-password')) {
          setError('Incorrect password. Please try again.');
        } else if (err.message.includes('auth/invalid-email')) {
          setError('Please enter a valid email address.');
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('Too many failed attempts. Please try again later.');
        } else if (err.message.includes('auth/network-request-failed')) {
          setError('Network error. Please check your connection and try again.');
        } else if (err.message.includes('recaptcha')) {
          setError('Security verification failed. Please refresh the page and try again.');
          // Re-initialize reCAPTCHA
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined;
          }
          setRecaptchaReady(false);
          // Retry initialization
          setTimeout(() => {
            import('../../lib/firebase').then(({ initRecaptcha }) => {
              initRecaptcha().catch(console.error);
            });
          }, 1000);
        } else {
          setError('An error occurred during login. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFAComplete = () => {
    setShowMFASetup(false);
    // Navigate to the originally requested URL or default page
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

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
      
      {showMFASetup ? (
        <div className="relative z-30 w-full max-w-md">
          <MFASetup
            onComplete={handleMFAComplete}
            onCancel={() => setShowMFASetup(false)}
          />
        </div>
      ) : (
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-yellow-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-black/30 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-gray-400"
                  placeholder="Enter your email"
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

              {/* reCAPTCHA container */}
              <div id="recaptcha-container" className="mt-4 flex justify-center" />

              {error && (
                <div className="p-4 bg-red-900/50 text-red-200 border border-red-500/50 rounded-md text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !recaptchaReady}
                className="w-full py-2 px-4 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white rounded-lg hover:from-yellow-700 hover:to-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="flex items-center gap-2 text-yellow-400/70 text-sm">
                <Shield className="w-4 h-4" />
                <span>Protected with Two-Factor Authentication</span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}