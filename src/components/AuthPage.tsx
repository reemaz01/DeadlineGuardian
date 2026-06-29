import React, { useState } from "react";
import { ShieldAlert, Mail, Lock, User, AlertCircle, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthPageProps {
  onLogin: (user: { email: string; name: string; isDemo?: boolean }) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation & feedback states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validate form fields
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin) {
      // Full name validation
      if (!fullName) {
        newErrors.fullName = "Full name is required";
      } else if (fullName.trim().length < 2) {
        newErrors.fullName = "Full name must be at least 2 characters";
      }

      // Confirm password validation
      if (!confirmPassword) {
        newErrors.confirmPassword = "Confirm password is required";
      } else if (confirmPassword !== password) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrors({});

    if (!validate()) return;

    setIsLoading(true);
    // Simulate server validation delay
    setTimeout(() => {
      setIsLoading(false);
      if (isLogin) {
        // Simple mock authentication for arbitrary accounts
        onLogin({
          email: email.toLowerCase(),
          name: email.split("@")[0].toUpperCase(),
          isDemo: email.toLowerCase() === "demo@guardian.ai",
        });
      } else {
        setSuccessMsg("Registration successful! Logging in now...");
        setTimeout(() => {
          onLogin({
            email: email.toLowerCase(),
            name: fullName,
            isDemo: false,
          });
        }, 1200);
      }
    }, 1000);
  };

  // Trigger simulated Forgot Password
  const handleForgotPassword = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: "Please enter a valid email to receive a recovery link." });
      return;
    }
    setErrors({});
    setSuccessMsg(`Simulated: A password recovery link was sent to ${email}`);
  };

  // Instant Demo login
  const handleDemoLogin = () => {
    onLogin({
      email: "demo@guardian.ai",
      name: "Demo Champion",
      isDemo: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white selection:bg-[#5B8CFF] selection:text-black font-sans relative flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-[#5B8CFF]/10 to-[#A855F7]/10 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-400/5 to-emerald-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="w-full max-w-[460px] relative z-10 flex flex-col items-center">
        {/* App Title Header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#5B8CFF] to-[#A855F7] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#5B8CFF]/20">
            <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl tracking-tight uppercase text-white">
              Deadline <span className="text-[#5B8CFF]">Guardian</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-[#A855F7]/90 uppercase font-extrabold mt-1">
              THE LAST-MINUTE LIFE SAVER
            </p>
          </div>
        </div>

        {/* Auth Glass Card */}
        <div className="w-full bg-[#15181F]/85 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          {/* Top subtle highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Toggle Tab Row */}
          <div className="flex bg-neutral-950/40 p-1.5 rounded-2xl border border-white/5 mb-8 relative">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrors({});
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 relative z-10 ${
                isLogin ? "text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Sign In
              {isLogin && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#252A35] border border-white/10 shadow-md rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrors({});
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 relative z-10 ${
                !isLogin ? "text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Sign Up
              {!isLogin && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#252A35] border border-white/10 shadow-md rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Success Notification Alert */}
            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] text-xs flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1 bg-emerald-500/20 rounded-lg shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="font-sans font-medium">{successMsg}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "login-fields" : "signup-fields"}
                initial={{ opacity: 0, x: isLogin ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 12 : -12 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Full name (Sign Up only) */}
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest font-bold">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`w-full bg-neutral-950/50 border ${
                          errors.fullName ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#5B8CFF]/50"
                        } rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#5B8CFF]/20 transition-all font-sans`}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.fullName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest font-bold">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-neutral-950/50 border ${
                        errors.email ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#5B8CFF]/50"
                      } rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#5B8CFF]/20 transition-all font-sans`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest font-bold">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[10px] font-sans text-[#5B8CFF] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-neutral-950/50 border ${
                        errors.password ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#5B8CFF]/50"
                      } rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#5B8CFF]/20 transition-all font-sans`}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password (Sign Up only) */}
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest font-bold">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-neutral-950/50 border ${
                          errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#5B8CFF]/50"
                        } rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#5B8CFF]/20 transition-all font-sans`}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Remember Me Toggle */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/10 bg-neutral-950/50 text-[#5B8CFF] focus:ring-[#5B8CFF]/50 w-4 h-4 cursor-pointer focus:ring-0"
                  />
                  <span>Remember me on this browser</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] hover:brightness-110 text-white font-sans font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#5B8CFF]/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? "Authenticating..." : isLogin ? "Secure Login" : "Register Account"}</span>
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-white/5" />
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest font-bold">OR QUICK ACCESS</span>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          {/* Try Demo Mode Button */}
          <button
            onClick={handleDemoLogin}
            className="w-full h-11 bg-neutral-950/60 hover:bg-[#15181F] text-[#34D399] border border-emerald-500/25 hover:border-emerald-500/40 rounded-xl font-sans font-bold text-xs uppercase tracking-widest transition-all hover:shadow-md hover:shadow-emerald-500/5 flex items-center justify-center gap-2"
          >
            <span>Try Demo Mode</span>
            <span className="bg-emerald-500/20 text-[#34D399] text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30">
              demo123
            </span>
          </button>
        </div>

        {/* Footnote */}
        <p className="text-[10px] font-mono text-white/30 mt-6 leading-relaxed uppercase tracking-wider">
          🔐 Encrypted Session Guardian Interface
        </p>
      </div>
    </div>
  );
}
