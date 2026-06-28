'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield, Sparkles, MessageSquare, Video, ArrowRight, Moon, Sun,
  Eye, EyeOff, Mail, Lock, User, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const strength = mode === 'register' ? getPasswordStrength(password) : getPasswordStrength(newPassword);

  // Theme setup
  useEffect(() => {
    const saved = (localStorage.getItem('nexo_theme') || localStorage.getItem('nexo_landing_theme')) as 'light' | 'dark' | null;
    const active = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(active);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.style.backgroundColor = theme === 'dark' ? '#0b0f19' : '#f8fafc';
    localStorage.setItem('nexo_theme', theme);
  }, [theme]);

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('nexo_token')) router.push('/chat');
  }, [router]);

  // Handle errors from URL (e.g. Google auth failed)
  useEffect(() => {
    const err = params.get('error');
    if (err === 'google_auth_failed') {
      setError('Google sign-in failed. Please try again or use email/password.');
    } else if (err === 'google_user_not_found') {
      setError('No NexoChat account found for this Google email. Please sign up first using "Sign up with Google".');
    } else if (err === 'google_user_already_exists') {
      setError('An account with this email already exists. Please log in using your password or "Continue with Google".');
    }
  }, [params]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ─── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); clearMessages();
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('nexo_token', data.token);
      localStorage.setItem('nexo_user', JSON.stringify(data.user));
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ─── Register ────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); clearMessages();
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      localStorage.setItem('nexo_token', data.token);
      localStorage.setItem('nexo_user', JSON.stringify(data.user));
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please provide your email'); return; }
    setLoading(true); clearMessages();
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      setSuccess(data.message);
      setTimeout(() => setMode('reset'), 1500);
    } catch (err: any) {
      setError(err.message || 'Email recovery request failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset Password ──────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !resetCode || !newPassword) { setError('Please fill in all fields'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); clearMessages();
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setSuccess('Password reset! Redirecting to login...');
      setTimeout(() => { setMode('login'); setPassword(''); clearMessages(); }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogleLogin = (targetMode?: string) => {
    setGoogleLoading(true);
    const activeMode = targetMode || mode;
    window.location.href = `${API_URL}/auth/google?mode=${activeMode}`;
  };

  const inputCls = 'w-full px-4 py-3 pl-11 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition';
  const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

  const switchMode = (m: Mode) => { setMode(m); clearMessages(); };

  return (
    <main className={`min-h-screen flex bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>

      {/* ── Left panel: Branding ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0b0f19] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 z-10">
          <img src="/logo-icon.png" alt="NexoChat Logo" className="w-10 h-10 object-contain rounded-xl" />
          <span className="text-xl font-bold tracking-tight">NexoChat</span>
        </div>

        <div className="my-auto z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-tight">Nexo Chat</h1>
          <p className="text-slate-400 text-lg mb-10">
            Connect. Collaborate. Create. The workspace messaging client for Nexozone teams.
          </p>
          <div className="space-y-6">
            {[
              { Icon: MessageSquare, title: 'Channels & Direct Messages', desc: 'Organize projects in group channels or start personal discussions.' },
              { Icon: Video, title: 'P2P Video & Voice Calls', desc: 'High-definition WebRTC calling built directly into your channels.' },
              { Icon: Shield, title: 'Instant Asset Sharing', desc: 'Upload images and project documentation securely in real time.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <Icon className="text-indigo-400" size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="text-slate-400 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="z-10 text-xs text-slate-500 flex items-center gap-2">
          <span>© 2026 NexoChat.</span>
          <span className="opacity-50">•</span>
          <span>Powered by <a href="https://nexozone.in/" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">Nexozone IT</a></span>
        </div>
      </div>

      {/* ── Right panel: Forms ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 bg-white dark:bg-[#070b13] relative overflow-y-auto">

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          className="absolute top-6 right-6 p-2.5 rounded-xl border transition-all cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-amber-400 shadow-sm"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="max-w-md w-full mx-auto space-y-7">

          {/* Header */}
          <div className="text-center lg:text-left">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="flex items-center gap-3">
                <img src="/logo-icon.png" alt="NexoChat Logo" className="w-12 h-12 object-contain rounded-xl shadow-md" />
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">NexoChat</span>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' && 'Welcome back 👋'}
              {mode === 'register' && 'Create account 🚀'}
              {mode === 'forgot' && 'Forgot password 🔑'}
              {mode === 'reset' && 'Set new password 🛠️'}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login' && 'Sign in to your Nexo Chat workspace'}
              {mode === 'register' && 'Register your details to get started'}
              {mode === 'forgot' && "We'll send a code to your email — expires in 15 minutes"}
              {mode === 'reset' && 'Enter the code from your email and choose a new password'}
            </p>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-medium">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Google */}
              <button
                type="button"
                onClick={() => handleGoogleLogin('login')}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm cursor-pointer disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                <span className="text-xs text-slate-400 font-medium">or continue with email</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              </div>

              <div>
                <label htmlFor="login-email" className={labelCls}>Work Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="login-email" type="email" required placeholder="name@nexozone.com"
                    value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="login-password" className={labelCls.replace(' mb-1.5','')}>Password</label>
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} className={`${inputCls} pr-11`} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 cursor-pointer">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
              </button>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => switchMode('register')}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer">
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <form className="space-y-4" onSubmit={handleRegister}>
              {/* Google */}
              <button type="button" onClick={() => handleGoogleLogin('register')} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm cursor-pointer disabled:opacity-60">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Redirecting...' : 'Sign up with Google'}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                <span className="text-xs text-slate-400 font-medium">or use email</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              </div>

              <div>
                <label className={labelCls}>Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required placeholder="Arjun Mehta"
                    value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Work Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required placeholder="name@nexozone.com"
                    value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="Min 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} className={`${inputCls} pr-11`} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${strength.score >= i ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">Password strength: <span className={`font-bold ${strength.score >= 4 ? 'text-emerald-500' : strength.score >= 3 ? 'text-blue-500' : strength.score >= 2 ? 'text-amber-500' : 'text-rose-500'}`}>{strength.label}</span></p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="Repeat password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inputCls} pr-11`} />
                  {confirmPassword && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {confirmPassword === password
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <AlertCircle size={16} className="text-rose-500" />}
                    </span>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 cursor-pointer mt-2">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? 'Creating account...' : <><span>Create Account</span><ArrowRight size={16} /></>}
              </button>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer">
                  Sign In
                </button>
              </p>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label className={labelCls}>Your Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required placeholder="name@nexozone.com"
                    value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3 text-xs text-indigo-700 dark:text-indigo-300 flex gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                A 6-digit verification code will be sent to your email. It expires in 15 minutes.
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => switchMode('login')}
                  className="w-1/2 py-3 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
                  Back to Login
                </button>
                <button type="submit" disabled={loading}
                  className="w-1/2 flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 cursor-pointer">
                  {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Code'}
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                Already have a code?{' '}
                <button type="button" onClick={() => switchMode('reset')}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer">
                  Enter it here
                </button>
              </p>
            </form>
          )}

          {/* ── RESET PASSWORD ── */}
          {mode === 'reset' && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className={labelCls}>Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@nexozone.com" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>6-Digit Verification Code</label>
                <input type="text" required placeholder="123456" maxLength={6}
                  value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition text-center tracking-[0.5em] font-mono font-bold text-xl" />
              </div>

              <div>
                <label className={labelCls}>New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showNewPassword ? 'text' : 'password'} required placeholder="Min 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inputCls} pr-11`} />
                  <button type="button" onClick={() => setShowNewPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${strength.score >= i ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => switchMode('forgot')}
                  className="w-1/2 py-3 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="w-1/2 flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 cursor-pointer">
                  {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
