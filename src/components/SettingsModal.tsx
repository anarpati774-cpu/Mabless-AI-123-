import { User, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { X, User as UserIcon, Moon, Sun, History, EyeOff, Beaker, BarChart3, Mail, LogOut, ChevronRight, MessageSquare, Languages, Shield, Eye, Trash2, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { Language, translations } from "../lib/translations";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  theme: "light" | "dark";
  toggleTheme: () => void;
  language: Language;
  changeLanguage: (lang: Language) => void;
  hideWebsites: boolean;
  toggleHideWebsites: () => void;
}

type SettingTab = "account" | "theme" | "language" | "history" | "hidden" | "privacy" | "test" | "progress" | "contact";

export default function SettingsModal({ isOpen, onClose, user, theme, toggleTheme, language, changeLanguage, hideWebsites, toggleHideWebsites }: SettingsModalProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<SettingTab>("account");
  const [stats, setStats] = useState({ totalMessages: 0, totalChats: 0 });
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [hiddenChats, setHiddenChats] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testScore, setTestScore] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchStats();
      fetchRecentChats();
      fetchHiddenChats();
      fetchTests();
    }
  }, [isOpen, user]);

  const fetchTests = async () => {
    try {
      const q = query(
        collection(db, "tests"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const deleteTest = async (testId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t.confirmDelete)) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "tests", testId));
      fetchTests();
    } catch (error) {
      console.error("Error deleting test:", error);
    }
  };

  const shareTest = async (test: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const summary = `Mabless AI Study Test: ${test.title}\nQuestions: ${test.questions.length}\nCreated: ${new Date(test.createdAt?.seconds * 1000).toLocaleDateString()}\n\nTake your learning further with Mabless AI!`;
    try {
      await navigator.clipboard.writeText(summary);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    } catch (error) {
      console.error("Error sharing test:", error);
    }
  };

  const fetchStats = async () => {
    try {
      // Count chats that have at least one studyMode message
      const chatsQuery = query(collection(db, "chats"), where("userId", "==", user.uid));
      const chatsSnap = await getDocs(chatsQuery);
      
      let studyChatCount = 0;
      let studyMessageCount = 0;

      for (const chatDoc of chatsSnap.docs) {
        const msgsQuery = query(
          collection(db, "chats", chatDoc.id, "messages"),
          where("studyMode", "==", true)
        );
        const msgsSnap = await getDocs(msgsQuery);
        if (msgsSnap.size > 0) {
          studyChatCount++;
          studyMessageCount += msgsSnap.size;
        }
      }

      setStats({
        totalChats: studyChatCount,
        totalMessages: studyMessageCount
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentChats = async () => {
    try {
      const q = query(
        collection(db, "chats"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      const chats = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.isHidden !== true)
        .slice(0, 5);
      setRecentChats(chats);
    } catch (error) {
      console.error("Error fetching recent chats:", error);
    }
  };

  const fetchHiddenChats = async () => {
    try {
      const q = query(
        collection(db, "chats"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      const chats = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.isHidden === true);
      setHiddenChats(chats);
    } catch (error) {
      console.error("Error fetching hidden chats:", error);
    }
  };

  const unhideChat = async (chatId: string) => {
    try {
      const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, "chats", chatId), {
        isHidden: false,
        updatedAt: serverTimestamp()
      });
      fetchHiddenChats();
      fetchRecentChats();
    } catch (error) {
      console.error("Error unhiding chat:", error);
    }
  };

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const start = Date.now();
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + process.env.GEMINI_API_KEY);
      const end = Date.now();
      if (response.ok) {
        setTestResult(`${language === "en" ? "Success" : "सफलता"}! Latency: ${end - start}ms`);
      } else {
        setTestResult(language === "en" ? "Connection failed. Check API key." : "कनेक्शन विफल। API कुंजी की जाँच करें।");
      }
    } catch (error) {
      setTestResult("Error: " + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const tabs = [
    { id: "account", label: t.account, icon: UserIcon },
    { id: "theme", label: t.theme, icon: theme === "light" ? Moon : Sun },
    { id: "language", label: t.language, icon: Languages },
    { id: "history", label: t.chatHistory, icon: History },
    { id: "hidden", label: t.hiddenChats, icon: EyeOff },
    { id: "privacy", label: t.privacy, icon: Shield },
    { id: "test", label: t.test, icon: Beaker },
    { id: "progress", label: t.progress, icon: BarChart3 },
    { id: "contact", label: t.contact, icon: Mail },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[600px] rounded-[2.5rem] shadow-2xl overflow-hidden flex border border-slate-200 dark:border-slate-800"
          >
            {/* Sidebar */}
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
                <span className="font-bold text-lg">{t.settings}</span>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingTab)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                    )}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-semibold transition-all mt-auto"
              >
                <LogOut size={18} />
                {t.signOut}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="flex-1 overflow-y-auto p-10">
                {activeTab === "account" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.account}</h2>
                    <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800">
                      <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                        {user.displayName?.[0] || "U"}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-bold">{user.displayName}</p>
                        <p className="text-slate-500">{user.email}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                            {t.proMember}
                          </span>
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-full">
                            {t.verified}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "theme" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.appearance}</h2>
                    <div className="grid grid-cols-2 gap-6">
                      <button
                        onClick={() => theme !== "light" && toggleTheme()}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all text-left space-y-4",
                          theme === "light" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-orange-500">
                          <Sun size={24} />
                        </div>
                        <div>
                          <p className="font-bold">{t.lightMode}</p>
                          <p className="text-sm text-slate-500">Clean and bright interface</p>
                        </div>
                      </button>
                      <button
                        onClick={() => theme !== "dark" && toggleTheme()}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all text-left space-y-4",
                          theme === "dark" ? "border-blue-600 bg-blue-900/20" : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        <div className="w-12 h-12 bg-slate-800 rounded-xl shadow-md flex items-center justify-center text-blue-400">
                          <Moon size={24} />
                        </div>
                        <div>
                          <p className="font-bold">{t.darkMode}</p>
                          <p className="text-sm text-slate-500">Easy on the eyes at night</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "language" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.selectLanguage}</h2>
                    <div className="grid grid-cols-2 gap-6">
                      <button
                        onClick={() => changeLanguage("en")}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all text-left space-y-4",
                          language === "en" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-md flex items-center justify-center text-blue-600">
                          <span className="font-bold text-xl">EN</span>
                        </div>
                        <div>
                          <p className="font-bold">{t.english}</p>
                          <p className="text-sm text-slate-500">Default application language</p>
                        </div>
                      </button>
                      <button
                        onClick={() => changeLanguage("hi")}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all text-left space-y-4",
                          language === "hi" ? "border-blue-600 bg-blue-900/20" : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-md flex items-center justify-center text-blue-600">
                          <span className="font-bold text-xl">HI</span>
                        </div>
                        <div>
                          <p className="font-bold">{t.hindi}</p>
                          <p className="text-sm text-slate-500">हिंदी भाषा समर्थन</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.chatHistory}</h2>
                    <div className="space-y-3">
                      {recentChats.map((chat) => (
                        <div key={chat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                              <MessageSquare size={20} />
                            </div>
                            <div>
                              <p className="font-bold truncate max-w-[300px]">{chat.title}</p>
                              <p className="text-xs text-slate-500">{new Date(chat.updatedAt?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <ChevronRight className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      ))}
                      {recentChats.length === 0 && <p className="text-center py-12 text-slate-500">{t.noHistory}</p>}
                    </div>
                  </div>
                )}

                {activeTab === "hidden" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.hiddenChats}</h2>
                    <div className="space-y-3">
                      {hiddenChats.map((chat) => (
                        <div key={chat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                              <EyeOff size={20} />
                            </div>
                            <div>
                              <p className="font-bold truncate max-w-[250px]">{chat.title}</p>
                              <p className="text-xs text-slate-500">{new Date(chat.updatedAt?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => unhideChat(chat.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/30"
                          >
                            <Eye size={16} />
                            {t.unhide}
                          </button>
                        </div>
                      ))}
                      {hiddenChats.length === 0 && <p className="text-center py-12 text-slate-500">{t.noHiddenChats}</p>}
                    </div>
                  </div>
                )}

                {activeTab === "privacy" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.privacyLayout}</h2>
                    <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{t.hideSidebar}</p>
                          <p className="text-sm text-slate-500">Keep the interface clean for focused work</p>
                        </div>
                        <button className="w-12 h-6 bg-slate-300 dark:bg-slate-700 rounded-full relative transition-all">
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{t.autoHideHistory}</p>
                          <p className="text-sm text-slate-500">Hide recent chats from the sidebar</p>
                        </div>
                        <button className="w-12 h-6 bg-blue-600 rounded-full relative transition-all">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{t.hideWebsites}</p>
                          <p className="text-sm text-slate-500">{t.hideWebsitesDesc}</p>
                        </div>
                        <button 
                          onClick={toggleHideWebsites}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all",
                            hideWebsites ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            hideWebsites ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "test" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold">{t.test}</h2>
                      <button
                        onClick={runTest}
                        disabled={isTesting}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <Beaker size={14} />
                        {isTesting ? t.testing : t.runDiagnostic}
                      </button>
                    </div>

                    {testResult && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn("text-xs font-bold px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800", testResult.includes("Success") || testResult.includes("सफलता") ? "text-green-500" : "text-red-500")}
                      >
                        {testResult}
                      </motion.p>
                    )}

                    <div className="space-y-4">
                      {selectedTest ? (
                        <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">{selectedTest.title}</h3>
                            <button 
                              onClick={() => {
                                setSelectedTest(null);
                                setTestAnswers({});
                                setTestScore(null);
                              }}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="space-y-8">
                            {selectedTest.questions.map((q: any, qIdx: number) => (
                              <div key={qIdx} className="space-y-4">
                                <p className="font-bold text-slate-800 dark:text-slate-200">
                                  {qIdx + 1}. {q.question}
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                  {q.options.map((opt: string, oIdx: number) => (
                                    <button
                                      key={oIdx}
                                      disabled={testScore !== null}
                                      onClick={() => setTestAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                                      className={cn(
                                        "w-full text-left px-4 py-3 rounded-xl border transition-all text-sm",
                                        testAnswers[qIdx] === opt
                                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
                                        testScore !== null && opt === q.correctAnswer && "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600",
                                        testScore !== null && testAnswers[qIdx] === opt && opt !== q.correctAnswer && "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600"
                                      )}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                                {testScore !== null && testAnswers[qIdx] !== q.correctAnswer && (
                                  <p className="text-xs text-red-500 font-medium">
                                    {t.incorrect} <span className="font-bold">{q.correctAnswer}</span>
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            {testScore === null ? (
                              <button
                                onClick={() => {
                                  let score = 0;
                                  selectedTest.questions.forEach((q: any, idx: number) => {
                                    if (testAnswers[idx] === q.correctAnswer) score++;
                                  });
                                  setTestScore(score);
                                }}
                                disabled={Object.keys(testAnswers).length < selectedTest.questions.length}
                                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/30"
                              >
                                {t.finishTest}
                              </button>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">
                                  {t.score}: {testScore} / {selectedTest.questions.length}
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedTest(null);
                                    setTestAnswers({});
                                    setTestScore(null);
                                  }}
                                  className="text-blue-600 font-bold hover:underline"
                                >
                                  {t.viewTests}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {tests.map((test) => (
                            <div 
                              key={test.id} 
                              onClick={() => setSelectedTest(test)}
                              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                                  <Beaker size={20} />
                                </div>
                                <div>
                                  <p className="font-bold truncate max-w-[300px]">{test.title}</p>
                                  <p className="text-xs text-slate-500">
                                    {test.questions.length} {language === "en" ? "Questions" : "प्रश्न"} • {new Date(test.createdAt?.seconds * 1000).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => shareTest(test, e)}
                                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                  title={t.share}
                                >
                                  <Share2 size={18} />
                                </button>
                                <button 
                                  onClick={(e) => deleteTest(test.id, e)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                  title={t.delete}
                                >
                                  <Trash2 size={18} />
                                </button>
                                <button className="px-4 py-2 bg-white dark:bg-slate-800 text-blue-600 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                  {t.startTest}
                                </button>
                              </div>
                            </div>
                          ))}
                          {tests.length === 0 && (
                            <div className="text-center py-12 space-y-4">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                                <Beaker size={32} />
                              </div>
                              <p className="text-slate-500">{t.noTests}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "progress" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.yourProgress}</h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{t.totalChats}</p>
                        <p className="text-4xl font-bold text-blue-600">{stats.totalChats}</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{t.messagesSent}</p>
                        <p className="text-4xl font-bold text-purple-600">{stats.totalMessages}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="font-bold">{t.weeklyGoal}</p>
                        <p className="text-sm font-bold text-blue-600">75%</p>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "75%" }}
                          className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                        />
                      </div>
                      <p className="text-xs text-slate-500">You've sent {stats.totalMessages} messages in Study Mode. Keep it up!</p>
                    </div>
                  </div>
                )}

                {activeTab === "contact" && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold">{t.getInTouch}</h2>
                    <div className="space-y-4">
                      <a href="mailto:support@mabless.ai" className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                          <Mail size={24} />
                        </div>
                        <div>
                          <p className="font-bold">{t.emailSupport}</p>
                          <p className="text-sm text-slate-500">support@mabless.ai</p>
                        </div>
                      </a>
                      <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <p className="font-bold">{t.followUs}</p>
                        <div className="flex gap-4">
                          {["Twitter", "Discord", "GitHub"].map(platform => (
                            <button key={platform} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all">
                              {platform}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Share Toast */}
          <AnimatePresence>
            {shareToast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700"
              >
                <Share2 size={18} className="text-blue-400" />
                <span className="text-sm font-bold">{t.shareSuccess}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
