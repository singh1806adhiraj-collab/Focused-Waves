import React, { useState, useEffect } from 'react';
import { Bell, BellOff, ShieldAlert, CheckCircle2, Smartphone, Send, HelpCircle } from 'lucide-react';

export default function NotificationStatusCard() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swRegistered, setSwRegistered] = useState(false);
  const [supportStatus, setSupportStatus] = useState<string>('checking');
  const [testSuccess, setTestSuccess] = useState(false);

  // Initialize permission status and register sw
  useEffect(() => {
    if (!('Notification' in window)) {
      setSupportStatus('unsupported');
      return;
    }
    setSupportStatus('supported');
    setPermission(Notification.permission);

    // Register Service Worker for background processes
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setSwRegistered(true);
          console.log('Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
          setSwRegistered(false);
        });
    }
  }, []);

  // Request browser permissions
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      
      if (res === 'granted') {
        // Play a test notification instantly
        triggerLocalNotification('System Reminders Active!', 'Focused Waves will now send you real-time background reminders.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // Helper to trigger notification (uses SW if registered, fallback to standard window Notification)
  const triggerLocalNotification = (title: string, body: string, requireInteraction = false) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Use Service worker if active to support background dispatching
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: 'test-notification-' + Date.now(),
        requireInteraction
      });
    } else {
      // Fallback
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        requireInteraction
      });
    }
  };

  // Trigger a test notification
  const handleSendTestNotification = () => {
    if (permission !== 'granted') {
      handleRequestPermission();
      return;
    }

    setTestSuccess(true);
    triggerLocalNotification(
      '⚡ Wave Simulation Alarm!',
      'Your Deep Focus wave starts now! All distractions are locked out.',
      true
    );

    // Schedule a delayed test background notification
    setTimeout(() => {
      triggerLocalNotification(
        '🕒 Focused Waves Background Alert',
        'This reminder runs even when the app is in the background or minimized.'
      );
    }, 4000);

    setTimeout(() => setTestSuccess(false), 3000);
  };

  if (supportStatus === 'unsupported') {
    return (
      <div className="bg-slate-900 border border-red-500/10 rounded-2xl p-4 flex items-center gap-3">
        <BellOff className="h-5 w-5 text-red-400 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-white">System Reminders Not Supported</h4>
          <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">
            This browser or configuration does not support Web Push notifications. Use Chrome, Safari, or Edge on PC/Mobile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-5 relative overflow-hidden shadow-lg shadow-black/40">
      {/* Background ambient pulse */}
      <div className="absolute top-0 right-0 w-48 h-12 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Indicator Details */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${
            permission === 'granted' 
              ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
              : permission === 'denied'
              ? 'bg-rose-950/40 border border-rose-500/20 text-rose-400'
              : 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-400'
          }`}>
            {permission === 'granted' ? (
              <Bell className="h-6 w-6 animate-pulse" />
            ) : permission === 'denied' ? (
              <BellOff className="h-6 w-6" />
            ) : (
              <Smartphone className="h-6 w-6 animate-bounce" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                System Background Notifications
              </h4>
              
              {/* Permission Badge */}
              {permission === 'granted' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Reminders Active (BG & Native)
                </span>
              ) : permission === 'denied' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-950/60 border border-rose-500/30 text-[9px] font-mono font-bold text-rose-400 rounded-full">
                  ⚠️ Permissions Blocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-950/60 border border-indigo-500/30 text-[9px] font-mono font-bold text-indigo-400 rounded-full">
                  ⚡ Setup Required
                </span>
              )}

              {/* Service worker register status */}
              {swRegistered && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-950/80 border border-slate-850 text-[8px] font-mono font-medium text-slate-450 rounded-full">
                  PWA Service Worker Loaded
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              {permission === 'granted' ? (
                'Focused Waves is fully authorized to send alarm reminders on PC, Mobile, and Tablet. Reminders will pop up even in the background.'
              ) : permission === 'denied' ? (
                'System notifications are blocked by your browser. Please tap the lock icon in your address bar and reset notifications to "Allow" to receive alerts.'
              ) : (
                'Enable system notifications to allow Focused Waves to alert you of scheduled waves even when your screen is locked or the app is in the background.'
              )}
            </p>
          </div>
        </div>

        {/* Dynamic CTAs */}
        <div className="flex items-center gap-3 shrink-0">
          {permission === 'default' && (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-950/50 cursor-pointer active:scale-95"
              id="request-notif-permission-btn"
            >
              Enable Notifications
            </button>
          )}

          <button
            onClick={handleSendTestNotification}
            disabled={testSuccess}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
              permission === 'granted'
                ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-indigo-950/30 border-indigo-500/20 text-indigo-450 hover:bg-indigo-950/50'
            }`}
            id="test-notif-btn"
          >
            <Send className="h-3.5 w-3.5" />
            {testSuccess ? 'Simulation Sent!' : 'Simulate Test Alert'}
          </button>
        </div>
      </div>

      {/* Warning instruction box if denied */}
      {permission === 'denied' && (
        <div className="mt-3 bg-rose-950/20 border border-rose-500/10 p-3 rounded-2xl flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="text-[10px] text-slate-400 leading-normal">
            <strong className="text-white block mb-0.5">How to Enable Notifications on your device:</strong>
            • **PC/Mac**: Click the lock/settings icon next to the URL in your browser address bar and switch **Notifications** to **Allow**.
            <br />
            • **Mobile/Tablet (Android)**: Tap browser options (three dots) → Site Settings → Notifications → Allow.
            <br />
            • **iOS (iPhone/iPad)**: Add this app to your Home Screen (Share → Add to Home Screen), open it, and accept the notification permission prompt.
          </div>
        </div>
      )}
    </div>
  );
}
