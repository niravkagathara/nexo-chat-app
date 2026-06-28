'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, MessageSquare, Video, ArrowRight, Zap, Sun, Moon, Download } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // 1. Check login
    const token = localStorage.getItem('nexo_token');
    const userStr = localStorage.getItem('nexo_user');
    if (token && userStr) {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || '');
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // 2. Check saved theme
    const savedTheme = localStorage.getItem('nexo_theme') as 'light' | 'dark' | null;
    let activeTheme: 'light' | 'dark' = 'light';
    if (savedTheme) {
      activeTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      activeTheme = 'dark';
    }
    setTheme(activeTheme);
  }, []);

  // Sync background color to document body to avoid white/dark space issues below footer
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#060814';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('nexo_theme', nextTheme);
  };

  const handleCTA = () => {
    if (isLoggedIn) {
      router.push('/chat');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden relative ${theme === 'dark' ? 'dark bg-[#060814] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}>

      {/* Decorative Glows (Constrained within inset-0 to prevent scrollbar/white space leaks) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] transition-opacity duration-300 ${theme === 'dark' ? 'bg-indigo-600/10 opacity-100' : 'bg-indigo-500/5'
          }`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[150px] pointer-events-none transition-opacity duration-300 ${theme === 'dark' ? 'bg-blue-600/10 opacity-100' : 'bg-blue-500/5'
          }`}></div>
        <div className={`absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full blur-[130px] pointer-events-none transition-opacity duration-300 ${theme === 'dark' ? 'bg-purple-600/10 opacity-100' : 'bg-purple-500/5'
          }`}></div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col z-10">

        {/* Header */}
        <header className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 border-b ${theme === 'dark'
            ? 'bg-[#060814]/75 border-slate-800/50 shadow-sm shadow-slate-950/20'
            : 'bg-white/85 border-slate-200/80 shadow-sm shadow-slate-100/50'
          }`}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              <img src="/logo-icon.png" alt="NexoChat Logo" className="w-10 h-10 object-contain rounded-xl" />
              <span className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>NexoChat</span>
            </div>

            <nav className={`hidden md:flex items-center gap-8 text-sm font-semibold transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
              <a href="#features" className={`transition ${theme === 'dark' ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Features</a>
              <a href="#mockup" className={`transition ${theme === 'dark' ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Platform</a>
              <a href="#tech" className={`transition ${theme === 'dark' ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Tech Stack</a>
            </nav>

            <div className="flex items-center gap-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer active:scale-95 ${theme === 'dark'
                    ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-800 shadow-2xs'
                  }`}
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {/* Desktop App Download Button */}
              <a
                href="/nexo-chat-desktop.zip"
                download
                className={`hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-300 ${theme === 'dark'
                    ? 'text-slate-300 bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/70 hover:text-white'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs'
                  }`}
              >
                <Download size={14} />
                <span>Desktop App</span>
              </a>

              {/* Mobile App Download Button */}
              <a
                href="/nexo-chat-mobile.apk"
                download
                className={`hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-300 ${theme === 'dark'
                    ? 'text-slate-300 bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/70 hover:text-white'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs'
                  }`}
              >
                <Download size={14} />
                <span>Android APK</span>
              </a>

              {/* iOS App Download Button */}
              <button
                onClick={() => setShowIosModal(true)}
                className={`hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-300 cursor-pointer active:scale-95 ${theme === 'dark'
                    ? 'text-slate-300 bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/70 hover:text-white'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs'
                  }`}
              >
                <Download size={14} />
                <span>iOS App</span>
              </button>

              {isLoggedIn ? (
                <div className="flex items-center gap-4">
                  <span className={`hidden sm:inline text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Welcome back, <strong className="text-indigo-600 dark:text-indigo-400">{userName}</strong>
                  </span>
                  <button
                    onClick={() => router.push('/chat')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition"
                  >
                    Go to Chat
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-20 pb-20 md:pt-32 md:pb-28">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-sm border transition-colors ${theme === 'dark'
                ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                : 'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}>
              <Zap size={14} className="animate-pulse" />
              <span>NexoZone Chat v2.0 Available Now</span>
            </div>

            <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6 transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
              The workspace chat client for <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">modern teams</span>
            </h1>

            <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed transition-colors duration-300 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
              Connect. Collaborate. Create. Bring your developers, designers, and managers together with instant chat channels, crystal-clear WebRTC video calls, and rapid asset sharing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleCTA}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-95 transition"
              >
                {isLoggedIn ? 'Enter Workspace' : 'Get Started Now'}
                <ArrowRight size={16} />
              </button>
              <a
                href="/nexo-chat-desktop.zip"
                download
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-95 transition"
              >
                <Download size={16} />
                Download for Windows
              </a>
              <a
                href="/nexo-chat-mobile.apk"
                download
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition"
              >
                <Download size={16} />
                Download for Android (APK)
              </a>
              <button
                onClick={() => setShowIosModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-xl shadow-rose-600/20 hover:shadow-rose-600/30 active:scale-95 transition cursor-pointer"
              >
                <Download size={16} />
                Install for iOS
              </button>
              <a
                href="#features"
                className={`w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-xl text-sm font-bold shadow-sm transition ${theme === 'dark'
                    ? 'text-slate-300 bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/70 hover:text-white'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
              >
                Explore Features
              </a>
            </div>
          </div>
        </section>

        {/* Mockup Dashboard Section (Responsive Theme Styling - Hidden on mobile, visible on desktop/tablets) */}
        <section id="mockup" className="hidden md:block py-12 relative max-w-7xl mx-auto px-6">
          <div className={`relative rounded-2xl p-3 shadow-2xl transition-all duration-300 overflow-hidden group border ${theme === 'dark'
              ? 'border-slate-800 bg-slate-900/40 shadow-indigo-500/5'
              : 'border-slate-200 bg-white shadow-indigo-600/10'
            }`}>
            <div className={`absolute inset-0 bg-gradient-to-tr opacity-50 group-hover:opacity-80 transition pointer-events-none ${theme === 'dark' ? 'from-indigo-500/10 via-transparent to-purple-500/10' : 'from-indigo-500/5 via-transparent to-purple-500/5'
              }`}></div>

            {/* Header Bar */}
            <div className={`flex items-center justify-between px-4 pb-3 mb-3 text-xs border-b ${theme === 'dark' ? 'border-slate-800/50 text-slate-500' : 'border-slate-100 text-slate-400'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-rose-500/60' : 'bg-rose-400'}`}></span>
                <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-amber-500/60' : 'bg-amber-400'}`}></span>
                <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-emerald-500/60' : 'bg-emerald-400'}`}></span>
              </div>
              <div className={`px-10 py-1 rounded-md text-[10px] border ${theme === 'dark'
                  ? 'bg-[#0b0f19] border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200/60 text-slate-500'
                }`}>
                nexochat.nexozone.internal/chat
              </div>
              <div className="w-12"></div>
            </div>

            {/* Inner Layout Mockup */}
            <div className={`grid grid-cols-12 gap-3 h-[420px] rounded-xl overflow-hidden border transition-colors ${theme === 'dark'
                ? 'text-slate-400 bg-[#090d16] border-slate-800'
                : 'text-slate-600 bg-slate-50/50 border-slate-100'
              }`}>

              {/* Mock Channels Sidebar */}
              <div className={`col-span-3 p-4 flex flex-col justify-between border-r transition-colors ${theme === 'dark'
                  ? 'border-slate-800 bg-[#0b0f19]/80'
                  : 'border-slate-200 bg-slate-100/60'
                }`}>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Channels</span>
                    <span className={`text-[10px] font-bold cursor-pointer ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>+ New</span>
                  </div>
                  <div className="space-y-1.5">
                    {['# general', '# product-design', '# backend-api', '# announcements'].map((chan, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${idx === 1
                            ? (theme === 'dark' ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-300' : 'bg-indigo-600/10 border border-indigo-600/15 text-indigo-700')
                            : (theme === 'dark' ? 'hover:bg-slate-800/30 text-slate-400' : 'hover:bg-slate-200/50 text-slate-600')
                          }`}
                      >
                        <span>{chan}</span>
                        {idx === 2 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <span className={`text-xs font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Direct Messages</span>
                    <div className="space-y-1.5">
                      {[
                        { name: 'Riya Sharma', status: 'bg-emerald-500' },
                        { name: 'Arjun Mehta', status: 'bg-emerald-500' },
                        { name: 'Karan Singh', status: 'bg-amber-500' },
                      ].map((user, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-slate-800/30 cursor-pointer">
                          <span className={`w-2 h-2 rounded-full ${user.status}`}></span>
                          <span>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`pt-4 border-t flex items-center gap-2.5 ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    RS
                  </div>
                  <div className="overflow-hidden">
                    <div className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Riya Sharma</div>
                    <div className={`text-[9px] font-semibold truncate ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Online</div>
                  </div>
                </div>
              </div>

              {/* Mock Main Chat Panel */}
              <div className={`col-span-6 p-4 flex flex-col justify-between h-full transition-colors ${theme === 'dark' ? 'bg-[#070b13]' : 'bg-white'
                }`}>
                <div className={`pb-3 flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div>
                    <h3 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}># product-design</h3>
                    <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Reviewing dashboard layout drafts.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className={`p-1.5 rounded-lg border transition ${theme === 'dark'
                        ? 'bg-slate-800/50 hover:bg-slate-800 text-indigo-400 border-slate-700'
                        : 'bg-slate-50 hover:bg-slate-100 text-indigo-600 border-slate-200'
                      }`}>
                      <Video size={14} />
                    </button>
                  </div>
                </div>

                {/* Chat flow mockup */}
                <div className="flex-1 py-4 overflow-y-auto space-y-4 text-xs">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white">AM</div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Arjun Mehta</span>
                        <span className={`text-[8px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>11:04 AM</span>
                      </div>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>I finished polishing the layout animations. Riya, did you see the changes?</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center font-bold text-[10px] text-white">RS</div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Riya Sharma</span>
                        <span className={`text-[8px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>11:05 AM</span>
                      </div>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Yes! The glassmorphism headers look super clean. Let's wire up the Socket connection now.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white">KS</div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Karan Singh</span>
                        <span className={`text-[8px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>11:08 AM</span>
                      </div>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Backend channels controller is deployed to dev. WebSocket notifications should be working!</p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    placeholder="Message # product-design (disabled on preview)"
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none placeholder-slate-400 ${theme === 'dark'
                        ? 'bg-[#0b0f19] border-slate-800 text-white placeholder-slate-500'
                        : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
                      }`}
                  />
                </div>
              </div>

              {/* Mock Call / Info Panel */}
              <div className={`col-span-3 p-4 flex flex-col justify-between border-l transition-colors ${theme === 'dark'
                  ? 'border-slate-800 bg-[#0b0f19]/80'
                  : 'border-slate-200 bg-slate-100/60'
                }`}>
                <div>
                  <span className={`text-xs font-bold tracking-wider uppercase block mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Call</span>
                  <div className={`border rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm ${theme === 'dark' ? 'bg-[#070b13] border-slate-800' : 'bg-white border-slate-200/60'
                    }`}>
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-extrabold text-sm relative ${theme === 'dark'
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                        : 'bg-indigo-50 border-indigo-500 text-indigo-600'
                      }`}>
                      RS
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border ${theme === 'dark' ? 'border-slate-900' : 'border-white'}`}></span>
                    </div>
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Riya Sharma</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${theme === 'dark'
                        ? 'text-indigo-400 bg-indigo-950 border border-indigo-900'
                        : 'text-indigo-600 bg-indigo-50 border border-indigo-100'
                      }`}>Speaking...</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className={`text-xs font-bold tracking-wider uppercase block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Shared Assets</span>
                  <div className="space-y-2">
                    {[
                      { name: 'landing_mockup.png', size: '1.4 MB' },
                      { name: 'api_spec.json', size: '12 KB' },
                    ].map((file, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border shadow-2xs ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                        <div className="overflow-hidden">
                          <div className={`text-[10px] font-bold truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</div>
                          <div className={`text-[8px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{file.size}</div>
                        </div>
                        <span className={`text-[9px] cursor-pointer font-bold ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>Get</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className={`text-3xl md:text-5xl font-extrabold tracking-tight mb-4 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                Everything your team needs to collaborate
              </h2>
              <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                A comprehensive workspace feature-set built with performance and security at its core.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className={`group relative rounded-2xl border p-8 transition shadow-sm hover:shadow-md hover:scale-[1.02] duration-300 ${theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300'
                }`}>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition">
                  <MessageSquare size={22} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Channels & DMs</h3>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Organize projects, client accounts, or topics into public/private channels or have quick peer-to-peer discussions.
                </p>
              </div>

              {/* Feature 2 */}
              <div className={`group relative rounded-2xl border p-8 transition shadow-sm hover:shadow-md hover:scale-[1.02] duration-300 ${theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300'
                }`}>
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition">
                  <Video size={22} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>P2P Calling</h3>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Connect instantly with peer-to-peer WebRTC voice and video calls built natively into Nexo Chat channels.
                </p>
              </div>

              {/* Feature 3 */}
              <div className={`group relative rounded-2xl border p-8 transition shadow-sm hover:shadow-md hover:scale-[1.02] duration-300 ${theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300'
                }`}>
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition">
                  <Shield size={22} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Secure Sharing</h3>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Instantly upload assets, files, code snippets, and designs. All media is served securely under strict workspace isolation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack section */}
        <section id="tech" className={`py-16 border-y transition-colors duration-300 ${theme === 'dark' ? 'bg-[#04060e] border-slate-900' : 'bg-slate-100 border-slate-200'
          }`}>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <span className={`text-xs font-bold tracking-widest uppercase block mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'
              }`}>
              Powered by modern architecture
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-75">
              {['Next.js', 'TypeScript', 'TailwindCSS', 'NestJS', 'Prisma', 'Socket.io', 'WebRTC'].map((tech) => (
                <span key={tech} className={`text-sm font-bold transition cursor-default ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-indigo-600'
                  }`}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* Footer (Light Theme styled in light mode, Dark Theme in dark mode) */}
      <footer className={`py-12 border-t transition-colors duration-300 ${theme === 'dark'
          ? 'bg-[#030408] border-slate-900 text-slate-500'
          : 'bg-white border-slate-200 text-slate-500'
        }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="NexoChat Logo" className="w-8 h-8 object-contain rounded-lg" />
            <span className={`text-md font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>NexoChat</span>
          </div>

          <div className={`text-xs text-center md:text-right text-slate-500 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3`}>
            <span>© 2026 NexoChat. All rights reserved.</span>
            <span className="hidden sm:inline opacity-50">•</span>
            <span>
              Powered by{' '}
              <a
                href="https://nexozone.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:underline"
              >
                Nexozone IT Company
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* SEO Schema Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebApplication',
                '@id': 'https://nexochat.in/#webapp',
                'url': 'https://nexochat.in',
                'name': 'Nexo Chat',
                'applicationCategory': 'BusinessApplication',
                'operatingSystem': 'All',
                'browserRequirements': 'Requires HTML5/WebRTC compatible browser',
                'description': 'Nexo Chat is a professional real-time team messaging and WebRTC video calling platform for teams at NexoZone. Chat in channels, share files, and collaborate with crystal-clear video.',
                'publisher': {
                  '@type': 'Organization',
                  '@id': 'https://nexozone.in/#organization',
                  'name': 'NexoZone',
                  'url': 'https://nexozone.in',
                },
              },
              {
                '@type': 'Organization',
                '@id': 'https://nexozone.in/#organization',
                'name': 'NexoZone',
                'url': 'https://nexozone.in',
                'logo': 'https://nexochat.in/logo-icon.png',
                'sameAs': [
                  'https://twitter.com/nexozone',
                  'https://www.linkedin.com/company/nexozone',
                ],
              },
            ],
          }),
        }}
      />
      {/* iOS Installation Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300 animate-fadeIn">
          <div className={`relative w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border transition-all duration-300 transform scale-100 ${theme === 'dark'
              ? 'bg-[#0b0f19]/95 border-slate-800 text-slate-100 shadow-indigo-500/5'
              : 'bg-white/95 border-slate-200 text-slate-800 shadow-indigo-600/10'
            }`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <img src="/logo-icon.png" alt="NexoChat Logo" className="w-8 h-8 object-contain rounded-lg" />
                <h3 className="text-lg font-bold tracking-tight">Install on iOS (iPhone/iPad)</h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className={`p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${theme === 'dark'
                    ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-6 text-sm">
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                NexoChat runs as a Progressive Web App (PWA) on iOS. You can install it on your home screen in just a few taps:
              </p>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold">Open in Safari</h4>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ensure you are viewing this page inside the native **Safari** browser on your Apple device.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-1.5">
                      Tap the Share Button
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-500 dark:text-indigo-400">
                        <path d="M12 2a1 1 0 011 1v12a1 1 0 01-2 0V3a1 1 0 011-1z" />
                        <path d="M7.707 6.707a1 1 0 010-1.414l3.5-3.5a1 1 0 011.414 0l3.5 3.5a1 1 0 01-1.414 1.414L13 5.414V13a1 1 0 11-2 0V5.414L9.121 6.707a1 1 0 01-1.414 0z" />
                        <path d="M5 12a1 1 0 011-1h1a1 1 0 110 2H6v5h12v-5h-1a1 1 0 110-2h1a3 3 0 013 3v5a3 3 0 01-3 3H6a3 3 0 01-3-3v-5a3 3 0 013-3z" />
                      </svg>
                    </h4>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Tap the **Share** button in Safari's bottom navigation bar (or top toolbar on iPad).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-1.5">
                      Select "Add to Home Screen"
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-500 dark:text-indigo-400">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                      </svg>
                    </h4>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Scroll down the options list and select **"Add to Home Screen"**.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-sm">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold">Tap "Add"</h4>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Tap **"Add"** in the top right corner. The NexoChat icon will appear on your device's home screen.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowIosModal(false)}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition cursor-pointer active:scale-95"
              >
                Got It, Thanks!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
