import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login for:', email);
      const success = await login(email, password);
      console.log('Login result:', success);
      if (success) {
        // Navigate to the originally requested URL or default page
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      const error = err as Error;
      console.error('Login error caught:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (error.message.includes('auth/user-not-found')) {
        setError('No account found with this email.');
      } else if (error.message.includes('auth/wrong-password')) {
        setError('Incorrect password.');
      } else if (error.message.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-stone-900 to-zinc-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-600 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-600 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
      </div>

      {/* Chocolate Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1511381939415-e44015466834?ixlib=rb-1.2.1&auto=format&fit=crop&w=2072&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between gap-12">

        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col items-start space-y-8 flex-1">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-tight">
              CHOCOLATIER.TOOL
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-amber-400 to-transparent rounded-full"></div>
            <p className="text-xl text-amber-200/80 font-light">by Peter van Heulen</p>
          </div>

          <div className="space-y-3 text-amber-100/60">
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              Professional chocolate production management
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              Recipe tracking and cost analysis
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              Order management and reporting
            </p>
          </div>

          {/* Decorative Chocolate Illustration */}
          <div className="mt-8 flex gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg rotate-12 shadow-2xl"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-700 to-amber-900 rounded-lg -rotate-6 shadow-2xl"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-700 rounded-lg rotate-3 shadow-2xl"></div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-auto lg:min-w-[450px]">
          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 mb-2">
              CHOCOLATIER.TOOL
            </h1>
            <p className="text-amber-200/80">by Peter van Heulen</p>
          </div>

          <div className="bg-stone-900/40 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-amber-500/20 relative overflow-hidden">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl"></div>

            <div className="relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl shadow-xl mb-4 rotate-3">
                  <span className="text-3xl">🍫</span>
                </div>
                <h2 className="text-2xl font-semibold text-amber-100 mb-1">Welcome</h2>
                <p className="text-amber-300/60 text-sm">Sign in to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-amber-200 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-stone-800/50 border border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-stone-400 transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-amber-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-stone-800/50 border border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-stone-400 transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/70 hover:text-amber-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/50 backdrop-blur-sm text-red-200 border border-red-500/50 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 text-white font-medium rounded-xl hover:from-amber-700 hover:via-amber-800 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer Text */}
          <p className="text-center text-amber-300/40 text-xs mt-6">
            Secure access to your chocolate production system
          </p>
        </div>
      </div>
    </div>
  );
}