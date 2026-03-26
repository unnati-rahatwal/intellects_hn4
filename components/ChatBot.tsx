"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
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
      id: "init",
      sender: "bot",
      text: "Hi there! I'm the AccessIQ AI assistant. How can I help you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "";

  const getPageContextName = () => {
    if (pathname === "/") return "Home";
    if (pathname.includes("/login")) return "Login";
    if (pathname.includes("/register")) return "Register";
    if (pathname.includes("/report")) return "Compliance Report";
    if (pathname.includes("/scans")) return "Scan Details";
    if (pathname.includes("/projects")) return "Projects";
    if (pathname.includes("/dashboard")) return "Dashboard";
    return "Page";
  };

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

    // --- CONTEXT-AWARE RESPONSE LOGIC ---
    setTimeout(() => {
      const lower = userMsg.text.toLowerCase();
      let botResponse = "I'm a simple demo bot! I can answer questions about what AccessIQ is, how to scan, or our pricing.";

      // 1. Core Feature Knowledge Base (Describing the Views)
      if (lower.includes("compliance")) {
        botResponse = "The Compliance Report details your site's WCAG violations, severity levels, and provides specific AI-powered code remediations to fix them.";
      } else if (lower.includes("dashboard")) {
        botResponse = "The AccessIQ Dashboard is your central hub. From here you can manage all your active projects, view aggregate accessibility scores, and initiate new deep scans.";
      } else if (lower.includes("executive") || lower.includes("audit")) {
        botResponse = "The Executive Audit Report provides a high-level summary of your web portfolio's health, perfect for stakeholders and compliance officers.";
      } else if (lower.includes("portfolio")) {
        botResponse = "Your Portfolio tracking interface displays all your monitored websites and their historical accessibility performance trends over time.";
      }
      
      // 2. Report / Scans Context Questions
      else if (pathname.includes("/report") || pathname.includes("/scans")) {
        if (lower.includes("violation") || lower.includes("what does this mean") || lower.includes("wcag")) {
          botResponse = "In these reports, WCAG violations show issues that fail accessibility guidelines. 'A' is severe, and 'AAA' is the highest standard. Click 'Fix Issue' to see specific code remediations for each highlighted violation.";
        } else if (lower.includes("score") || lower.includes("accessibility score")) {
          botResponse = "Your accessibility score is calculated based on the severity and frequency of issues found compared to passing WCAG 2.1 AA/AAA standards.";
        } else if (lower.includes("remedy") || lower.includes("remediation") || lower.includes("fix")) {
          botResponse = "AccessIQ generates AI-powered auto-fixes for most issues! Look for the suggested code snippets within each violation card. You can safely copy and paste those fixes.";
        } else if (lower.includes("export") || lower.includes("download")) {
          botResponse = "You can usually export your compliance report to PDF or CSV using the Export button located near the top right of the report view.";
        }
      }
      
      // 2. Dashboard Context Questions
      else if (pathname.includes("/dashboard")) {
        if (lower.includes("project") || lower.includes("create")) {
          botResponse = "To create a project, simply click the 'New Project' button, enter the root URL of your website, and we'll handle the deep-linking and discovery automatically.";
        } else if (lower.includes("metric") || lower.includes("graph") || lower.includes("chart")) {
          botResponse = "Your dashboard graphs represent average accessibility scores over time and unresolved violations across all your active web projects.";
        } else if (lower.includes("scan")) {
          botResponse = "You have the ability to run deep multi-page crawling scans right here from your project list. Just select a project and hit 'Run Scan'.";
        }
      }

      // 3. Global / General Context (Overrides if they ask general things anywhere)
      if (lower.includes("what is") || lower.includes("about")) {
        botResponse = "AccessIQ is an enterprise-grade web accessibility audit platform. We analyze websites to find WCAG violations and offer AI-powered remediation suggestions.";
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("free")) {
        botResponse = "AccessIQ is currently free during our beta phase! Enjoy full access to deep web crawling and AI remediation.";
      } else if (lower.includes("hello") || lower.includes("hi")) {
        botResponse = "Hello! Let me know what you'd like to explore on this page.";
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
          className="fixed bottom-6 right-6 z-50 p-4 bg-linear-to-br from-cyan-500 to-indigo-600 rounded-full shadow-lg shadow-cyan-900/40 hover:scale-110 hover:shadow-cyan-700/50 transition-all duration-300 group"
          aria-label="Open Contextual Chatbot"
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
        <div className="fixed bottom-6 right-6 z-50 w-[350px] sm:w-[400px] h-[500px] bg-[#0A1114]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-cyan-900/20 rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="h-16 bg-linear-to-r from-cyan-500/20 to-indigo-500/20 border-b border-white/10 flex flex-row items-center justify-between px-4 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-linear-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/30">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">AccessIQ Assistant</h3>
                <p className="text-cyan-400/80 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                  Viewing {getPageContextName()}
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
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-[#141C20] text-cyan-400 border border-white/10 shadow-inner"
                  }`}
                >
                  {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-linear-to-br from-indigo-600/90 to-indigo-600/90 text-white shadow-lg border border-indigo-400/20"
                      : "bg-white/5 text-zinc-300 border border-white/5"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-[#05090A]/50 shrink-0">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 bg-[#10191D] border border-white/10 rounded-full py-1.5 px-2 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-inner"
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
                className="p-2 rounded-full bg-cyan-500 text-white hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
