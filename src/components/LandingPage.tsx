import { Sparkles, ArrowRight, ShieldCheck, Zap, Activity, BarChart2, CheckSquare } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const features = [
    {
      icon: <Sparkles className="h-6 w-6 text-indigo-400" />,
      title: "Real-Time AI Task Analysis",
      description: "When creating a task, Wave AI instantly calculates required cognitive effort, optimizes start clocks, and defines dynamic urgency indices."
    },
    {
      icon: <Activity className="h-6 w-6 text-indigo-400 animate-pulse" />,
      title: "Wave Alert System",
      description: "A persistent, time-locking workspace notification pops up the minute your scheduled task begins. Lock out distraction and execute immediately."
    },
    {
      icon: <Zap className="h-6 w-6 text-amber-500" />,
      title: "AI Progress Validation",
      description: "Log your progress stages (Started, 25%, 50%, Completed) to receive hyper-personalized, motivational prompt summaries and next actionable items."
    },
    {
      icon: <BarChart2 className="h-6 w-6 text-indigo-400" />,
      title: "Deadline Risk Forecasts",
      description: "Our predictive forecasting engine assesses active project arrays in bulk to flag bottleneck parameters before they threaten your deliverables."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
      title: "Adaptive Recovery Frameworks",
      description: "Missed a milestone? Instantly generate micro-prioritization loops, revised sprint grids, and clear resolution guidelines."
    },
    {
      icon: <CheckSquare className="h-6 w-6 text-indigo-400" />,
      title: "Minimalist Executive Dashboard",
      description: "Curated negative space, responsive dark palettes, and high-fidelity progress statistics compiled to optimize deep cognitive focus."
    }
  ];

  return (
    <div className="bg-slate-950 text-slate-200 min-h-[calc(100vh-61px)] flex flex-col justify-between" id="landing-container">
      {/* Hero Section */}
      <div className="relative py-20 px-6 md:py-32 overflow-hidden bg-gradient-to-b from-indigo-950/10 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-slate-950 opacity-30 flex justify-center -z-10">
          <div className="w-[600px] h-[300px] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full text-[11px] font-medium text-slate-400 border border-slate-800 uppercase tracking-widest">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Circadian Flow Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-none font-sans">
            Unleash High-Frequency <br />
            Productivity with <span className="text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-2xl border border-indigo-500/20">Focused Waves</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A state-of-the-art dark workspace backing your task execution with predictive deadline forecasts, live wave alerts, and automated AI recovery pathways.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm tracking-wide shadow-xl shadow-indigo-500/20 flex items-center gap-2 cursor-pointer group hover:shadow-indigo-500/35 transition-all w-full sm:w-auto text-center justify-center font-sans"
              id="landing-cta-primary"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#features-section"
              className="px-8 py-3.5 bg-[#090d16] hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-semibold rounded-xl text-sm transition-all text-center w-full sm:w-auto"
              id="landing-cta-secondary"
            >
              Explore Capabilities
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features-section" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-indigo-400">Integrated Capabilities</h2>
          <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans">
            Supercharged by Google Gemini AI
          </h3>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every task, progress update, and deadline trigger feeds our secure server-side AI interface to construct actionable guidance tailored to your cognitive pacing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col items-start hover:border-slate-700/50 hover:bg-slate-900/65 transition-all"
            >
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mb-5 relative">
                {feature.icon}
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 font-sans">{feature.title}</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA section */}
      <div className="py-16 px-6 bg-gradient-to-t from-indigo-950/5 via-slate-950 to-slate-950 border-t border-slate-900">
        <div className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-800 rounded-3xl p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          {/* Radial flare background */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
          
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
            Ready to Surf Your Execution Waves?
          </h3>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Sign in securely with Google. Set your milestones, validate daily streaks, and stay organized under high-fidelity cognitive flow maps.
          </p>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"
              id="landing-cta-bottom"
            >
              Acquire Free Sandbox Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 px-6 bg-slate-950 text-center text-xs text-slate-500 font-mono flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto w-full">
        <p>&copy; 2026 Focused Waves. Engineered for developer-tier pacing.</p>
        <p className="flex items-center gap-1.5 mt-2 md:mt-0">
          Powered by Gemini Flash & Cloud Firestore
        </p>
      </footer>
    </div>
  );
}
