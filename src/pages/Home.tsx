import { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, where } from "firebase/firestore";
import { Send, Mic, MicOff, Sparkles, Globe, ChevronRight, BookOpen, User as UserIcon, Bot, MessageSquare, Plus, Settings, X, Paperclip, Image as ImageIcon, Home as HomeIcon, History, Copy, Check, ShieldAlert, Timer, Instagram, Ghost, Share2, Beaker } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { generateAIResponse, generateTestAI, generateChatTitle } from "../lib/gemini";
import { cn, safeDispatchChatSelected } from "../lib/utils";
import SettingsModal from "../components/SettingsModal";

import { Language, translations } from "../lib/translations";

import { handleFirestoreError, OperationType } from "../lib/firestore-errors.ts";

interface HomeProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
  language: Language;
  changeLanguage: (lang: Language) => void;
  hideWebsites: boolean;
  toggleHideWebsites: () => void;
}

export default function Home({ theme, toggleTheme, language, changeLanguage, hideWebsites, toggleHideWebsites }: HomeProps) {
  const t = translations[language];
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [focusTime, setFocusTime] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [interceptedApp, setInterceptedApp] = useState<string | null>(null);
  const [showFocusToast, setShowFocusToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (studyMode) {
      setFocusTime(0);
      setBlockedCount(0);
      interval = setInterval(() => {
        setFocusTime((prev) => prev + 1);
        
        // Randomly simulate blocking a distraction every 30-60 seconds
        if (Math.random() < 0.05) {
          const apps = ["Instagram", "Snapchat", "ShareChat"];
          const app = apps[Math.floor(Math.random() * apps.length)];
          setInterceptedApp(app);
          setBlockedCount((prev) => prev + 1);
          setShowFocusToast(true);
          setTimeout(() => setShowFocusToast(false), 4000);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [studyMode]);

  useEffect(() => {
    const handleChatSelected = (e: any) => {
      setActiveChatId(e.detail);
    };
    window.addEventListener("chat-selected", handleChatSelected);
    return () => window.removeEventListener("chat-selected", handleChatSelected);
  }, []);

  useEffect(() => {
    if (!activeChatId || !user) {
      setMessages([]);
      return;
    }

    const path = `chats/${activeChatId}/messages`;
    const q = query(
      collection(db, "chats", activeChatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgList);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for messages listener. This is expected if the chat was deleted or user logged out.");
        setMessages([]);
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [activeChatId, user]);

  useEffect(() => {
    if (!user) return;
    const path = "chats";
    const q = query(
      collection(db, "chats"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((chat: any) => chat.isHidden !== true);
      setRecentChats(chatList.slice(0, 4)); // Show only top 4 recent chats on main screen
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for recent chats listener.");
        setRecentChats([]);
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(",")[1];
      setSelectedFile({
        data,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e?: React.FormEvent, text?: string) => {
    e?.preventDefault();
    const messageText = text || input;
    if (!messageText.trim() && !selectedFile) return;
    if (!user) return;

    let chatId = activeChatId;

    // Create new chat if none active
    if (!chatId) {
      try {
        const generatedTitle = await generateChatTitle(messageText);
        const chatRef = await addDoc(collection(db, "chats"), {
          userId: user.uid,
          title: generatedTitle,
          isHidden: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        chatId = chatRef.id;
        setActiveChatId(chatId);
        safeDispatchChatSelected(chatId);
      } catch (error) {
        console.error("Error creating chat:", error);
        return;
      }
    }

    const userMessage = {
      chatId,
      userId: user.uid,
      role: "user",
      content: messageText,
      ...(selectedFile && {
        fileName: selectedFile.name,
        fileType: selectedFile.mimeType,
      }),
      studyMode, // Track if this was sent in study mode
      createdAt: serverTimestamp(),
    };

    const currentFile = selectedFile;
    setInput("");
    setSelectedFile(null);
    setIsLoading(true);

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), userMessage);
      
      if (messages.length === 0) {
        const generatedTitle = await generateChatTitle(messageText);
        await updateDoc(doc(db, "chats", chatId), {
          title: generatedTitle,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "chats", chatId), {
          updatedAt: serverTimestamp(),
        });
      }

      const aiResponse = await generateAIResponse(messageText, studyMode, currentFile ? { data: currentFile.data, mimeType: currentFile.mimeType } : undefined);

      const assistantMessage = {
        chatId,
        userId: "assistant",
        role: "assistant",
        content: aiResponse.answer,
        explanation: aiResponse.explanation || null,
        websites: aiResponse.websites || [],
        relatedQuestions: aiResponse.relatedQuestions || [],
        studyMode, // Track if this was sent in study mode
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "chats", chatId, "messages"), assistantMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      // Use direct instantiation from window if possible to avoid 'Illegal constructor'
      const recognition = (window as any).SpeechRecognition 
        ? new (window as any).SpeechRecognition() 
        : new (window as any).webkitSpeechRecognition();
        
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "hi" ? "hi-IN" : "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      setIsListening(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateTest = async () => {
    if (!activeChatId || messages.length === 0) return;
    setIsGeneratingTest(true);
    try {
      const context = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
      const questions = await generateTestAI(context);
      
      if (questions && questions.length > 0) {
        await addDoc(collection(db, "tests"), {
          userId: user!.uid,
          chatId: activeChatId,
          title: `Test: ${recentChats.find(c => c.id === activeChatId)?.title || "Study Session"}`,
          questions,
          createdAt: serverTimestamp()
        });
        alert(t.testGenerated);
      }
    } catch (error) {
      console.error("Error generating test:", error);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === "en" ? "Good Morning" : "शुभ प्रभात";
    if (hour < 17) return language === "en" ? "Good Afternoon" : "शुभ दोपहर";
    return language === "en" ? "Good Evening" : "शुभ संध्या";
  };

  const features = [
    {
      icon: <BookOpen className="text-blue-500" size={24} />,
      title: language === "en" ? "Study Mode" : "अध्ययन मोड",
      desc: language === "en" ? "Deep dive into topics with structured learning." : "संरचित सीखने के साथ विषयों में गहराई से उतरें।",
      action: () => setStudyMode(true)
    },
    {
      icon: <Mic className="text-purple-500" size={24} />,
      title: language === "en" ? "Voice Chat" : "वॉयस चैट",
      desc: language === "en" ? "Talk naturally with AI using your voice." : "अपनी आवाज़ का उपयोग करके एआई के साथ स्वाभाविक रूप से बात करें।",
      action: () => toggleVoice()
    },
    {
      icon: <ImageIcon className="text-emerald-500" size={24} />,
      title: language === "en" ? "Image Analysis" : "छवि विश्लेषण",
      desc: language === "en" ? "Upload images for instant insights and descriptions." : "त्वरित अंतर्दृष्टि और विवरण के लिए चित्र अपलोड करें।",
      action: () => fileInputRef.current?.click()
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-8 py-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{language === "en" ? "Chat" : "चैट"}</h1>
          <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl gap-1">
            <button
              onClick={() => setStudyMode(false)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                !studyMode
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <MessageSquare size={14} />
              {t.chatMode}
            </button>
            <button
              onClick={() => setStudyMode(true)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                studyMode
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <BookOpen size={14} />
              {t.studyMode}
            </button>
          </div>
          
          {studyMode && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 px-4 py-1.5 bg-blue-600/10 dark:bg-blue-400/10 border border-blue-600/20 dark:border-blue-400/20 rounded-xl"
            >
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Timer size={14} />
                <span>{formatTime(focusTime)}</span>
              </div>
              <div className="w-px h-4 bg-blue-600/20 dark:bg-blue-400/20" />
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <ShieldAlert size={14} />
                <span>{blockedCount} {t.distractionsBlocked}</span>
              </div>
              <div className="w-px h-4 bg-blue-600/20 dark:bg-blue-400/20" />
              <button
                onClick={handleGenerateTest}
                disabled={isGeneratingTest || messages.length === 0}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-600/10 px-2 py-1 rounded-lg transition-all disabled:opacity-50"
              >
                <Beaker size={14} />
                <span>{isGeneratingTest ? t.generatingTest : t.generateTest}</span>
              </button>
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveChatId(null);
              safeDispatchChatSelected(null);
            }}
            className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
            title={t.home}
          >
            <HomeIcon size={20} />
          </button>
          
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
            <Sparkles size={16} />
            <span>{t.aiPowered}</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {user && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          language={language}
          changeLanguage={changeLanguage}
          hideWebsites={hideWebsites}
          toggleHideWebsites={toggleHideWebsites}
        />
      )}

      {/* Focus Toast */}
      <AnimatePresence>
        {showFocusToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-24 left-1/2 z-50 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 dark:border-slate-200"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">{t.distractionIntercepted}</p>
              <p className="text-xs opacity-70 flex items-center gap-1">
                {interceptedApp === "Instagram" && <Instagram size={12} />}
                {interceptedApp === "Snapchat" && <Ghost size={12} />}
                {interceptedApp === "ShareChat" && <Share2 size={12} />}
                {interceptedApp} notification blocked
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[80%] text-center space-y-12 py-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl"
            >
              <span className="text-white font-bold text-5xl">M</span>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {getGreeting()}, {user?.displayName?.split(' ')[0]}!
                </h2>
                <h1 className="text-5xl font-black mb-4 text-slate-800 dark:text-white tracking-tight">
                  How can I help you today?
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto font-medium text-lg">
                  {language === "en" 
                    ? "Explore the power of Mabless AI. Start a conversation or try one of the features below." 
                    : "Mabless AI की शक्ति का अन्वेषण करें। बातचीत शुरू करें या नीचे दी गई सुविधाओं में से एक को आज़माएं।"}
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 p-2 bg-slate-100 dark:bg-slate-900 rounded-[2rem] w-fit mx-auto border border-slate-200 dark:border-slate-800 shadow-inner">
                <button
                  onClick={() => setStudyMode(false)}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-sm font-bold transition-all",
                    !studyMode
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xl scale-105"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <MessageSquare size={20} />
                  {t.chatMode}
                </button>
                <button
                  onClick={() => setStudyMode(true)}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-sm font-bold transition-all",
                    studyMode
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xl scale-105"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <BookOpen size={20} />
                  {t.studyMode}
                </button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
              {features.map((feature, idx) => (
                <motion.button
                  key={idx}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  onClick={feature.action}
                  className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:border-blue-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.button>
              ))}
            </div>

            {recentChats.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full max-w-5xl px-4 text-left"
              >
                <div className="flex items-center gap-2 mb-6 text-slate-400 dark:text-slate-500">
                  <History size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-widest">{t.chatHistory}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentChats.map((chat) => (
                    <motion.button
                      key={chat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setActiveChatId(chat.id);
                        safeDispatchChatSelected(chat.id);
                      }}
                      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-blue-500 hover:shadow-lg transition-all flex items-center gap-4 group"
                    >
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <MessageSquare size={20} />
                      </div>
                      <div className="flex-1 truncate">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{chat.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                          {chat.updatedAt ? chat.updatedAt.toDate().toLocaleDateString() : "Just now"}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col gap-4 group/msg",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div className="relative group/bubble">
              <div className={cn(
                "max-w-[80%] p-5 rounded-3xl shadow-sm text-sm leading-relaxed",
                msg.role === "user" 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
              )}>
                {msg.fileName && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-black/10 rounded-xl text-xs font-bold">
                    <Paperclip size={14} />
                    <span className="truncate">{msg.fileName}</span>
                  </div>
                )}
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => copyToClipboard(msg.content, msg.id)}
                className={cn(
                  "absolute top-2 opacity-0 group-hover/bubble:opacity-100 transition-all p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20",
                  msg.role === "user" ? "right-full mr-2" : "left-full ml-2",
                  msg.role !== "user" && "dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white"
                )}
                title={copiedId === msg.id ? t.copied : t.copy}
              >
                {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            {msg.role === "assistant" && msg.websites && msg.websites.length > 0 && !hideWebsites && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {msg.websites.map((site: any, i: number) => (
                  <a
                    key={i}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-blue-500 hover:shadow-md transition-all group flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:underline truncate">
                        {site.title}
                      </h4>
                      <Globe size={14} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium">
                      {site.description}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl rounded-tl-none shadow-sm">
              <div className="flex gap-1.5">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-8 pb-8 pt-2">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-16 left-0 right-0 flex justify-center"
            >
              <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-xl border border-blue-500/30 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center text-blue-600">
                  <ImageIcon size={18} />
                </div>
                <span className="text-xs font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}

          <div className="relative flex items-center bg-slate-200/50 dark:bg-slate-900 border border-slate-300/50 dark:border-slate-800 rounded-[2rem] p-2 shadow-sm focus-within:shadow-md transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "p-3 rounded-xl transition-all",
                selectedFile 
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-500 hover:text-blue-500"
              )}
            >
              <Plus size={22} className={cn("transition-transform", selectedFile && "rotate-45")} />
            </button>
            
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "p-3 rounded-full transition-all",
                isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "text-slate-500 hover:text-blue-500"
              )}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.typeMessage}
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-base font-medium"
              disabled={isLoading}
            />
            
            <motion.button
              type="submit"
              disabled={(!input.trim() && !selectedFile) || isLoading}
              whileHover={(!input.trim() && !selectedFile) || isLoading ? {} : { scale: 1.1 }}
              whileTap={(!input.trim() && !selectedFile) || isLoading ? {} : { scale: 0.9 }}
              animate={(!input.trim() && !selectedFile) || isLoading ? { scale: 1 } : { scale: [1, 1.1, 1] }}
              transition={(!input.trim() && !selectedFile) || isLoading ? {} : { repeat: Infinity, duration: 2 }}
              className={cn(
                "p-3 transition-all",
                (!input.trim() && !selectedFile) || isLoading
                  ? "text-slate-300 dark:text-slate-700"
                  : "text-blue-600 dark:text-blue-400 drop-shadow-sm"
              )}
            >
              <Send size={24} />
            </motion.button>
          </div>
          <p className="text-[11px] text-center mt-3 text-slate-400 dark:text-slate-600 font-medium">
            Mabless AI can make mistakes. Check important info.
          </p>
        </form>
      </div>
    </div>
  );
}
