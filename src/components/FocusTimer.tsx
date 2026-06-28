import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flame, Sparkles } from "lucide-react";

export default function FocusTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"work" | "break" | "long">("work");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = mode === "work" ? 25 * 60 : mode === "break" ? 5 * 60 : 15 * 60;
  const currentSecondsLeft = minutes * 60 + seconds;
  const progressPercent = ((totalSeconds - currentSecondsLeft) / totalSeconds) * 100;

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished!
            handleTimerComplete();
          } else {
            setMinutes((m) => m - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, minutes, seconds]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // TTS voice announcement on completion
    if ("speechSynthesis" in window) {
      const msg = new SpeechSynthesisUtterance(
        mode === "work"
          ? "Focus block completed! Incredible effort. Take a five-minute stretch break."
          : "Break is over! Time to get back into focus zone."
      );
      msg.rate = 1.0;
      window.speechSynthesis.speak(msg);
    }

    if (mode === "work") {
      setSessionsCompleted((prev) => prev + 1);
      setMode("break");
      setMinutes(5);
      setSeconds(0);
    } else {
      setMode("work");
      setMinutes(25);
      setSeconds(0);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mode === "work") {
      setMinutes(25);
    } else if (mode === "break") {
      setMinutes(5);
    } else {
      setMinutes(15);
    }
    setSeconds(0);
  };

  const setTimerMode = (newMode: "work" | "break" | "long") => {
    setIsActive(false);
    setMode(newMode);
    if (newMode === "work") {
      setMinutes(25);
    } else if (newMode === "break") {
      setMinutes(5);
    } else {
      setMinutes(15);
    }
    setSeconds(0);
  };

  return (
    <div id="focus-timer" className="relative p-6 rounded-[32px] border border-white/10 bg-white/5 shadow-xl overflow-hidden flex flex-col items-center">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#A855F7]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#5B8CFF]/10 rounded-full blur-3xl -z-10" />

      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-[#FF6B6B]" />
        <h3 className="font-display font-black text-lg uppercase tracking-tight text-white">Focus Pomodoro</h3>
        <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-full text-white/80 font-bold">
          STREAK: {sessionsCompleted}
        </span>
      </div>

      {/* Modes Selection */}
      <div className="flex bg-white/5 rounded-full p-1 border border-white/10 gap-1 mb-6">
        <button
          onClick={() => setTimerMode("work")}
          className={`px-4 py-1.5 rounded-full text-xs font-display font-black uppercase tracking-wider transition-all duration-200 ${
            mode === "work" ? "bg-[#5B8CFF] text-white" : "text-white/60 hover:text-white"
          }`}
        >
          Work (25m)
        </button>
        <button
          onClick={() => setTimerMode("break")}
          className={`px-4 py-1.5 rounded-full text-xs font-display font-black uppercase tracking-wider transition-all duration-200 ${
            mode === "break" ? "bg-[#34D399] text-white" : "text-white/60 hover:text-white"
          }`}
        >
          Short Break
        </button>
        <button
          onClick={() => setTimerMode("long")}
          className={`px-4 py-1.5 rounded-full text-xs font-display font-black uppercase tracking-wider transition-all duration-200 ${
            mode === "long" ? "bg-[#A855F7] text-white" : "text-white/60 hover:text-white"
          }`}
        >
          Long Break
        </button>
      </div>

      {/* Circle countdown visual */}
      <div className="relative w-44 h-44 flex items-center justify-center mb-6">
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r="80"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="88"
            cy="88"
            r="80"
            stroke={mode === "work" ? "#5B8CFF" : mode === "break" ? "#34D399" : "#A855F7"}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 80}
            strokeDashoffset={2 * Math.PI * 80 * (1 - progressPercent / 100)}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>

        {/* Counter text */}
        <div className="text-center">
          <span className="block font-mono text-5xl font-black text-white tracking-tighter">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="block font-display text-[10px] uppercase font-bold tracking-widest text-white/50 mt-1">
            {isActive ? "Zone is ON" : "Timer Paused"}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4">
        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-display font-black uppercase tracking-wider text-xs transition-all duration-200 ${
            isActive
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-white hover:bg-white/90 text-black shadow-lg shadow-white/10"
          }`}
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isActive ? "Pause" : "Start Focus"}
        </button>
        
        <button
          onClick={resetTimer}
          aria-label="Reset Timer"
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {isActive && mode === "work" && (
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-display font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Guardian Zone active. Stay locked in!</span>
        </div>
      )}
    </div>
  );
}
