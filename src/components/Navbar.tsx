/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from '../lib/firebase';
import { signOut, User } from 'firebase/auth';
import { Compass, LogOut, CheckSquare, BarChart2, Activity } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: 'landing' | 'dashboard' | 'tasks';
  setActiveTab: (tab: 'landing' | 'dashboard' | 'tasks') => void;
  onOpenAuth: () => void;
}

export default function Navbar({ user, activeTab, setActiveTab, onOpenAuth }: NavbarProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveTab('landing');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group"
          id="nav-brand-container"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ring-2 ring-indigo-500/20 border border-white/10">
            <Activity className="h-4.5 w-4.5 text-white animate-pulse drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]" />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-white">
            Focused<span className="text-indigo-400">Waves</span>
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center gap-3 md:gap-6">
          {user ? (
            <>
              {/* Dynamic status pill matching the Design HTML */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full text-[11px] font-medium text-slate-400 border border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Gemini Analytics Active
              </div>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold tracking-tight transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 border border-slate-800 text-white shadow-sm shadow-indigo-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
                id="nav-tab-dashboard"
              >
                <BarChart2 className="h-4 w-4 text-indigo-400" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold tracking-tight transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-slate-900 border border-slate-800 text-white shadow-sm shadow-indigo-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
                id="nav-tab-tasks"
              >
                <CheckSquare className="h-4 w-4 text-indigo-400" />
                <span className="hidden sm:inline">Tasks</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

              {/* User Dropdown Profile info */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 hidden lg:inline-block max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-xl text-sm font-semibold transition-all"
                  id="nav-btn-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('landing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'landing'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
                id="nav-tab-landing"
              >
                <Compass className="h-4 w-4 text-indigo-400" />
                Overview
              </button>
              <button
                onClick={onOpenAuth}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold tracking-tight shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 active:scale-95 transition-all font-sans cursor-pointer"
                id="nav-btn-login"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
