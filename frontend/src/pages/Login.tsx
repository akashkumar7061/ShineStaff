import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { Lock, Mail, Sparkles, Sun, Moon, ArrowRight, CheckCircle2, User, Phone, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Mode select: Sign In vs Sign Up
  const [isSignUp, setIsSignUp] = useState(false);

  // Common inputs
  const [email, setEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signup inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'worker'>('worker');
  const [company, setCompany] = useState<'SofaShine' | 'CleanCruisers' | 'Both'>('Both');

  // Forgot password flow states
  const [forgotFlow, setForgotFlow] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { phone: loginPhone, password, rememberMe });
      const { token, user } = res.data;
      login(token, user, rememberMe);
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/worker');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid mobile number or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        phone,
        role,
        company
      });
      const { token, user } = res.data;
      login(token, user, rememberMe);

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/worker');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetCode(res.data.resetCode); // Mock validation helper
      setResetCodeSent(true);
      setSuccessMsg('Reset code sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email not found');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (userInputCode !== resetCode) {
      setError('Invalid security code');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/reset-password', { email, newPassword });
      setSuccessMsg('Password changed successfully! You can log in now.');
      setTimeout(() => {
        setForgotFlow(false);
        setResetCodeSent(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark px-4 py-12 transition-colors duration-300">
      
      {/* Decorative gradient blur backgrounds */}
      <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="absolute bottom-20 right-10 h-82 w-82 rounded-full bg-indigo-500/10 blur-[80px]" />

      {/* Theme toggle floating button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 rounded-full glass-panel p-3 text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-transform"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-secondary/10 dark:bg-secondary/20 text-secondary px-4 py-2 rounded-full mb-3 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            <span>Smart Payroll & Attendance</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            ShineStaff
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Empowering SofaShine & CleanCruisers teams
          </p>
        </div>

        {/* Auth Panel glass card */}
        <div className="glass-card p-8 border border-white/20 dark:border-white/5 shadow-xl">
          
          {/* Tab selector */}
          {!forgotFlow && (
            <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  !isSignUp ? 'border-secondary text-secondary' : 'border-transparent text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  isSignUp ? 'border-secondary text-secondary' : 'border-transparent text-slate-400'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-danger/10 border border-danger/20 p-4 text-xs text-danger flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-xl bg-success/10 border border-success/20 p-4 text-xs text-success flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Sign In Form */}
          {!forgotFlow && !isSignUp && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    title="10-digit mobile number is required"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="Enter 10-digit number"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotFlow(true);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs font-medium text-secondary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3.5 pl-11 pr-12 text-sm outline-none focus:border-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-secondary focus:ring-secondary"
                />
                <label htmlFor="remember-me" className="ml-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
                  Remember Login
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-blue-gradient w-full flex items-center justify-center rounded-custom py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Sign In'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </button>
            </form>
          )}

          {/* 2. Sign Up Form */}
          {!forgotFlow && isSignUp && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 pl-11 pr-4 text-xs outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 pl-11 pr-4 text-xs outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1.5 uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 pl-11 pr-12 text-xs outline-none focus:border-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 pl-11 pr-4 text-xs outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Role Type</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary"
                >
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-blue-gradient w-full flex items-center justify-center rounded-custom py-3.5 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Register & Join'}
              </button>
            </form>
          )}

          {/* 3. Forgot Password Phase 1 - Submit Email */}
          {forgotFlow && !resetCodeSent && (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Forgot Password</h2>
              <p className="text-xs text-slate-400">
                Enter your account email address. We will send you a verification code.
              </p>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-blue-gradient w-full flex items-center justify-center rounded-custom py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <button
                type="button"
                onClick={() => setForgotFlow(false)}
                className="text-xs w-full text-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* 4. Forgot Password Phase 2 - Input code and new pass */}
          {forgotFlow && resetCodeSent && (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reset Password</h2>
              <p className="text-xs text-slate-400">
                We have emailed a 6-digit security code. Enter it below with your new password.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Security Code</label>
                <input
                  type="text"
                  required
                  value={userInputCode}
                  onChange={(e) => setUserInputCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full text-center tracking-widest text-lg font-bold rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 outline-none focus:border-secondary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-custom border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3.5 pl-11 pr-12 text-sm outline-none focus:border-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-blue-gradient w-full flex items-center justify-center rounded-custom py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Resetting Password...' : 'Save New Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotFlow(false);
                  setResetCodeSent(false);
                }}
                className="text-xs w-full text-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Cancel and Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
