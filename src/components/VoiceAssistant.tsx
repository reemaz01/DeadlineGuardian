import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Play, Check, Sparkles, Volume2, AlertCircle } from "lucide-react";
import { TaskCategory, Task } from "../types";

interface VoiceAssistantProps {
  tasks: Task[];
  onTaskCreated: (task: { title: string; category: TaskCategory; deadline: string }) => void;
}

export default function VoiceAssistant({ tasks, onTaskCreated }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTask, setParsedTask] = useState<{
    title: string;
    category: TaskCategory;
    deadline: string;
  } | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Active warning detection
  const warningTask = tasks?.find(t => !t.completed && (t.status === "HIGH RISK" || t.status === "MISSED DEADLINE"));

  const speakActiveWarning = () => {
    if (warningTask && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      let warnText = `Attention: You have a high risk deadline approaching. "${warningTask.title}" is flagged as high risk. Please check your dashboard and act immediately.`;
      if (warningTask.status === "MISSED DEADLINE") {
        warnText = `Warning: You have missed a deadline! "${warningTask.title}" is overdue. Enlist a rescue plan immediately.`;
      }
      const utter = new SpeechSynthesisUtterance(warnText);
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  // Warning out loud on load/mount (exactly one time per session)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const hasAnnounced = sessionStorage.getItem("deadline_guardian_warning_announced");
    if (hasAnnounced) return;

    if (warningTask) {
      // Small timeout to allow user interaction context or system initialization
      const timer = setTimeout(() => {
        speakActiveWarning();
        sessionStorage.setItem("deadline_guardian_warning_announced", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tasks, warningTask]);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
        setTranscript("Listening...");
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
        if (e.error === "not-allowed") {
          setRecognitionError("Permission to use microphone was denied.");
        } else {
          setRecognitionError(`Speech recognition issue: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscript(resultText);
        parseVoiceText(resultText);
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionError("Web Speech API is not supported in this browser. Try Google Chrome!");
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setParsedTask(null);
      setTranscript("");
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    } else {
      // Direct typing mock dictation fallback
      const mockText = prompt("Type your voice command here (e.g., 'Do Chemistry assignment due tomorrow at 9 PM')");
      if (mockText) {
        setTranscript(mockText);
        parseVoiceText(mockText);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const parseVoiceText = async (text: string) => {
    if (!text.trim() || text === "Listening...") return;
    setIsParsing(true);

    try {
      const response = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          currentTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("API parse failed");
      const data = await response.json();
      setParsedTask(data);
    } catch (err) {
      console.error("Failed to parse voice with AI. Falling back to local heuristic.", err);
      // fallback
      const normalized = text.toLowerCase();
      let category: TaskCategory = "General";
      if (normalized.includes("assignment") || normalized.includes("homework") || normalized.includes("study")) {
        category = "Assignment";
      } else if (normalized.includes("meeting") || normalized.includes("sync") || normalized.includes("zoom")) {
        category = "Meeting";
      } else if (normalized.includes("interview") || normalized.includes("recruit")) {
        category = "Interview";
      } else if (normalized.includes("bill") || normalized.includes("pay") || normalized.includes("rent")) {
        category = "Bill";
      } else if (normalized.includes("personal") || normalized.includes("gym")) {
        category = "Personal";
      }

      const defaultDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      defaultDeadline.setHours(17, 0, 0, 0);

      setParsedTask({
        title: text,
        category,
        deadline: defaultDeadline.toISOString(),
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmTask = () => {
    if (parsedTask) {
      onTaskCreated(parsedTask);

      // Play synthesis voice feedback
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(
          `Awesome. I have guarded the task: ${parsedTask.title}. Deadline is set for ${new Date(parsedTask.deadline).toLocaleDateString()}.`
        );
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      }

      setParsedTask(null);
      setTranscript("");
    }
  };

  return (
    <div id="voice-assistant" className="p-6 rounded-[32px] border border-white/10 bg-white/5 relative overflow-hidden flex flex-col items-center shadow-xl">
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#A855F7]/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <h3 className="font-display font-black text-xs uppercase tracking-widest text-white mb-2 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-[#A855F7]" />
        <span>Voice Assistant</span>
      </h3>
      <p className="font-sans text-[11px] text-white/50 text-center mb-6 max-w-xs leading-relaxed font-medium">
        Tap the microphone and dictate naturally. E.g., "Add Chemistry Homework due tomorrow at 8pm"
      </p>

      {/* Mic Trigger */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 relative ${
          isListening
            ? "bg-[#FF6B6B] shadow-lg shadow-[#FF6B6B]/20 animate-pulseScale"
            : "bg-[#A855F7] hover:bg-[#A855F7]/90 shadow-lg shadow-[#A855F7]/10 hover:scale-105"
        }`}
        aria-label="Microphone input"
      >
        {isListening ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}

        {isListening && (
          <div className="absolute -inset-2 rounded-full border-2 border-[#FF6B6B]/50 animate-ping" />
        )}
      </button>

      {transcript && (
        <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10 text-center max-w-sm">
          <span className="block text-[9px] font-mono text-white/40 uppercase mb-1">Transcript</span>
          <p className="text-xs font-sans text-white/90 italic">"{transcript}"</p>
        </div>
      )}

      {recognitionError && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-400/10 text-red-400 border border-red-400/20 rounded-xl text-xs font-sans max-w-xs text-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{recognitionError}</span>
        </div>
      )}

      {isParsing && (
        <div className="mt-6 flex items-center gap-2 text-xs text-white/50 animate-pulse">
          <Sparkles className="w-4 h-4 text-[#A855F7] animate-spin" />
          <span>Guardian AI is extracting task metadata...</span>
        </div>
      )}

      {parsedTask && !isParsing && (
        <div className="mt-6 w-full p-4 rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/20 text-white space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <h4 className="font-sans font-black text-xs uppercase tracking-wider">AI Voice Extraction Preview</h4>
          </div>

          <div className="space-y-1">
            <span className="block text-[9px] uppercase font-mono tracking-wider text-white/40">Title</span>
            <p className="font-sans font-bold text-xs">{parsedTask.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[9px] uppercase font-mono tracking-wider text-white/40">Category</span>
              <span className="inline-block mt-0.5 text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-white font-medium">
                {parsedTask.category}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-mono tracking-wider text-white/40">Deadline</span>
              <p className="font-mono text-[10px] text-white/80 mt-1">
                {new Date(parsedTask.deadline).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirmTask}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-black font-sans font-bold text-xs mt-3 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Guard Task</span>
          </button>
        </div>
      )}

      {/* Manual Warning Speak Button */}
      {warningTask && (
        <div className="mt-5 w-full p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-orange-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider">Active Threat Flagged</span>
          </div>
          <p className="text-[10px] text-white/70 text-center font-medium leading-tight line-clamp-1">
            "{warningTask.title}"
          </p>
          <button
            onClick={speakActiveWarning}
            className="flex items-center justify-center gap-1.5 px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 hover:text-white rounded-lg text-[9px] font-mono font-bold uppercase transition-all"
          >
            <Volume2 className="w-3 h-3" />
            <span>Play Warning Out Loud</span>
          </button>
        </div>
      )}
    </div>
  );
}
