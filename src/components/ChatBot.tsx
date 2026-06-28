import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { Task } from "../types";
import ReactMarkdown from "react-markdown";

interface ChatBotProps {
  tasks: Task[];
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

export default function ChatBot({ tasks }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Yo! I'm your Deadline Guardian AI companion. Deadlines creeping up on you? Throw them at me, I'll formulate your escape route!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          tasks: tasks,
        }),
      });

      if (!response.ok) {
        throw new Error("Chatbot API response failed");
      }

      const data = await response.json();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "My neural wires got crossed for a sec. Make sure your local server is humming, or just ask me again in a moment!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          id="chatbot-widget"
          className="w-80 md:w-96 h-[480px] bg-[#0F1115]/95 border border-white/10 backdrop-blur-xl rounded-[32px] shadow-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="bg-[#5B8CFF]/10 px-5 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5B8CFF] to-[#A855F7] flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-sans font-extrabold text-white">Guardian AI</h4>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  <span className="text-[10px] font-mono text-[#34D399] uppercase tracking-wider">Active Copilot</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs font-sans shadow-md ${
                    msg.sender === "user"
                      ? "bg-[#5B8CFF] text-white rounded-br-none"
                      : "bg-[#1E222B] border border-white/10 text-white rounded-bl-none overflow-x-auto max-w-full"
                  }`}
                >
                  {msg.sender === "user" ? (
                    msg.text
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none text-white leading-relaxed space-y-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-black [&_strong]:text-white [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-white/10 [&_td]:p-1 [&_th]:border [&_th]:border-white/10 [&_th]:p-1 [&_th]:bg-white/5 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-mono text-white/40 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start max-w-[85%] mr-auto">
                <div className="bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-2xl rounded-bl-none text-xs font-sans flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/[0.02] flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Guardian anything..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs font-sans text-white placeholder-white/40 focus:outline-none focus:border-[#5B8CFF] focus:ring-1 focus:ring-[#5B8CFF] transition-all"
            />
            <button
              type="submit"
              className="p-2.5 bg-[#5B8CFF] hover:bg-[#5B8CFF]/90 text-white rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-[#5B8CFF] to-[#A855F7] hover:shadow-xl hover:shadow-[#A855F7]/25 rounded-full flex items-center justify-center text-white transition-all duration-300 transform active:scale-90 shadow-lg relative group"
        aria-label="Toggle AI Assistant"
      >
        <MessageSquare className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#34D399] border-2 border-neutral-900 rounded-full" />
      </button>
    </div>
  );
}
