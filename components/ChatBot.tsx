"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Hi there! I'm the AccessIQ AI assistant. How can I help you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Simple keyword-based auto-responder
    setTimeout(() => {
      const lower = userMsg.text.toLowerCase();
      let botResponse =
        "I'm a simple demo bot! I can answer questions about what AccessIQ is, how to scan, or our pricing.";

      if (lower.includes("what is") || lower.includes("about")) {
        botResponse =
          "AccessIQ is an enterprise-grade web accessibility audit platform. We analyze websites to find WCAG violations and offer AI-powered remediation suggestions.";
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("free")) {
        botResponse =
          "AccessIQ is currently free during our beta phase! You can register and start auditing your web pages right away.";
      } else if (lower.includes("scan") || lower.includes("audit") || lower.includes("how to")) {
        botResponse =
          "To start scanning, simply log in, go to your Dashboard, create a new Project, and click 'Run Scan' on your desired URLs!";
      } else if (lower.includes("hello") || lower.includes("hi")) {
        botResponse = "Hello! Let me know if you have any questions about AccessIQ.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: botResponse,
        },
      ]);
    }, 600);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-linear-to-br from-orange-500 to-fuchsia-600 rounded-full shadow-lg shadow-orange-900/40 hover:scale-110 hover:shadow-orange-700/50 transition-all duration-300 group"
          aria-label="Open Chatbot"
        >
          <MessageCircle className="text-white w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[350px] sm:w-[400px] h-[500px] bg-[#0A1114]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-orange-900/20 rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="h-16 bg-linear-to-r from-orange-500/20 to-fuchsia-500/20 border-b border-white/10 flex flex-row items-center justify-between px-4 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-linear-to-r from-transparent via-orange-400/50 to-transparent" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-orange-500/20 p-2 rounded-xl border border-orange-500/30">
                <Bot className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">AccessIQ Assistant</h3>
                <p className="text-orange-400/80 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 relative z-10"
              aria-label="Close Chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === "user"
                      ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                      : "bg-[#141C20] text-orange-400 border border-white/10 shadow-inner"
                  }`}
                >
                  {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-linear-to-br from-fuchsia-600/90 to-purple-600/90 text-white shadow-lg border border-fuchsia-400/20"
                      : "bg-white/5 text-zinc-300 border border-white/5"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-[#05090A]/50 shrink-0">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 bg-[#10191D] border border-white/10 rounded-full py-1.5 px-2 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/30 transition-all shadow-inner"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent border-none text-sm text-zinc-300 px-3 py-2 outline-none placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2 rounded-full bg-orange-500 text-white hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
