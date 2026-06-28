'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showStatus, setShowStatus] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial connection status
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center p-3 text-xs font-bold transition-all duration-500 shadow-md text-center transform ${
        showStatus ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${
        isOnline
          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
          : 'bg-rose-600 text-white dark:bg-rose-500 animate-pulse'
      }`}
    >
      <div className="flex items-center gap-2 max-w-md mx-auto">
        {isOnline ? (
          <>
            <Wifi size={14} className="shrink-0" />
            <span>Connection restored. You are back online!</span>
          </>
        ) : (
          <>
            <WifiOff size={14} className="shrink-0" />
            <span>No internet connection. Please check your network connection.</span>
          </>
        )}
      </div>
    </div>
  );
}
