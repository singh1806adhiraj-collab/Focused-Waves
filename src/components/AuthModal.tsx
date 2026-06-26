/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { X, AlertCircle, Sparkles, CheckCircle2, Chrome } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to prevent sticky loops and let user pick accounts easily
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Save profile in user db
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Google Wavemaker',
          email: user.email || '',
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${user.uid}`);
      }

      setSuccess(`Logged in successfully as ${user.displayName || 'User'}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setError('');
        setSuccess('');
      }, 1000);
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Google login popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login window was closed before completion.');
      } else {
        setError('Google login failed: ' + (err.message || err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200 font-sans"
        id="auth-modal-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-950 rounded-xl transition-colors cursor-pointer"
          aria-label="Close"
          id="auth-modal-close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-950/40 text-indigo-400 rounded-2xl mb-3 border border-indigo-500/10">
            <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">
            Welcome to Focused Waves
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Sign in securely using Google to access your intelligent focus dashboard.
          </p>
        </div>

        {/* Error/Success Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-955/20 border border-red-500/10 text-red-200 rounded-xl text-xs mb-4">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="font-sans text-slate-300 leading-relaxed">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-950/50 border border-emerald-800/10 text-emerald-250 rounded-xl text-xs mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="font-sans text-slate-200 leading-relaxed">{success}</p>
          </div>
        )}

        {/* Google Sign-In Option */}
        <div className="space-y-4 py-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 px-4 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] border border-slate-200 font-sans"
            id="auth-google-btn"
          >
            <Chrome className="h-4 w-4 text-indigo-600 shrink-0" />
            {loading ? 'Connecting Google Account...' : 'Sign In with Google'}
          </button>

          <p className="text-[10px] text-center text-slate-500 leading-relaxed font-sans max-w-xs mx-auto">
            By signing in, you agree to our Terms of Service. Your data is protected by secure end-to-end Firestore configurations.
          </p>
        </div>
      </div>
    </div>
  );
}
