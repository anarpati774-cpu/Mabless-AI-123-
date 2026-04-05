import { useState, useEffect } from "react";
import { User, signOut } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Moon, Sun, LogOut, Sparkles, Zap, Home as HomeIcon, MoreVertical, Edit2, EyeOff, Languages, History } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, safeDispatchChatSelected } from "../lib/utils";
import { generateAIResponse } from "../lib/gemini";

import { Language, translations } from "../lib/translations";

interface SidebarProps {
  user: User;
  theme: "light" | "dark";
  toggleTheme: () => void;
  language: Language;
}

export default function Sidebar({ user, theme, toggleTheme, language }: SidebarProps) {
  const t = translations[language];
  const [chats, setChats] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [menuOpenId]);

  useEffect(() => {
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
      setChats(chatList);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for chats listener in Sidebar.");
        setChats([]);
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const createNewChat = async () => {
    try {
      const docRef = await addDoc(collection(db, "chats"), {
        userId: user.uid,
        title: "New Chat",
        isHidden: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveChatId(docRef.id);
      safeDispatchChatSelected(docRef.id);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const deleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setMenuOpenId(null);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    const path = `chats/${chatToDelete}`;
    try {
      await deleteDoc(doc(db, "chats", chatToDelete));
      if (activeChatId === chatToDelete) {
        setActiveChatId(null);
        safeDispatchChatSelected(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setChatToDelete(null);
    }
  };

  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
    safeDispatchChatSelected(chatId);
  };

  const renameChat = async (chatId: string, currentTitle: string) => {
    const newTitle = window.prompt(t.enterNewTitle, currentTitle);
    if (newTitle !== null && newTitle.trim() !== "" && newTitle !== currentTitle) {
      try {
        await updateDoc(doc(db, "chats", chatId), {
          title: newTitle.trim(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error renaming chat:", error);
      }
    }
    setMenuOpenId(null);
  };

  const hideChat = async (chatId: string) => {
    try {
      await updateDoc(doc(db, "chats", chatId), {
        isHidden: true,
        updatedAt: serverTimestamp(),
      });
      if (activeChatId === chatId) {
        setActiveChatId(null);
        safeDispatchChatSelected(null);
      }
    } catch (error) {
      console.error("Error hiding chat:", error);
    }
    setMenuOpenId(null);
  };

  const translateChat = async (chatId: string, targetLang: string) => {
    setMenuOpenId(null);
    try {
      const msgsSnap = await getDocs(collection(db, "chats", chatId, "messages"));
      
      // Show loading state or some feedback if possible
      for (const msgDoc of msgsSnap.docs) {
        const data = msgDoc.data();
        const promptText = `Translate the following text to ${targetLang}. Only return the translated text, nothing else. Keep markdown formatting:\n\n${data.content}`;
        const response = await generateAIResponse(promptText, false);
        
        if (response && response.answer) {
          await updateDoc(doc(db, "chats", chatId, "messages", msgDoc.id), {
            content: response.answer,
          });
        }
      }

      const chatSnap = await getDoc(doc(db, "chats", chatId));
      if (chatSnap.exists()) {
        const title = chatSnap.data().title;
        const titlePrompt = `Translate this chat title to ${targetLang}. Only return the translated title:\n\n${title}`;
        const titleResponse = await generateAIResponse(titlePrompt, false);
        if (titleResponse && titleResponse.answer) {
          await updateDoc(doc(db, "chats", chatId), {
            title: titleResponse.answer,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error("Error translating chat:", error);
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? 300 : 0,
        x: isOpen ? 0 : 0
      }}
      drag="x"
      dragConstraints={{ left: -300, right: 0 }}
      dragElastic={0.05}
      onDragEnd={(_, info) => {
        if (info.offset.x < -50) setIsOpen(false);
      }}
      className={cn(
        "relative h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-500 flex flex-col z-30",
        !isOpen && "border-none"
      )}
    >
      <div className={cn("p-4 flex flex-col h-full overflow-hidden min-w-[300px] transition-opacity duration-300", !isOpen ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {/* Logo Section */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-white">Mabless AI</span>
        </div>

        {/* Recent Chat Header */}
        <div className="flex items-center gap-2 px-3 mb-3 text-slate-400 dark:text-slate-500">
          <History size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">{t.chatHistory}</span>
        </div>

        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className="flex items-center gap-3 w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 mb-4"
        >
          <Plus size={22} />
          <span>{t.newChat}</span>
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          <AnimatePresence initial={false}>
            {chats.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => selectChat(chat.id)}
                className={cn(
                  "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                  activeChatId === chat.id
                    ? "bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                <MessageSquare size={18} className="shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{chat.title}</span>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameChat(chat.id, chat.title);
                    }}
                    className="p-1 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-slate-300/50 dark:hover:bg-slate-700 rounded-md transition-all text-slate-400 hover:text-blue-500"
                    title={t.rename}
                  >
                    <Edit2 size={14} />
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === chat.id ? null : chat.id);
                      }}
                      className="p-1 hover:bg-slate-300/50 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                      {menuOpenId === chat.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); renameChat(chat.id, chat.title); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                          >
                            <Edit2 size={14} />
                            {t.rename}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); hideChat(chat.id); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                          >
                            <EyeOff size={14} />
                            {t.hide}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); translateChat(chat.id, "Hindi"); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                          >
                            <Languages size={14} />
                            {t.translateToHindi}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); translateChat(chat.id, "English"); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                          >
                            <Languages size={14} />
                            {t.translateToEnglish}
                          </button>
                          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                          <button
                            onClick={(e) => deleteChat(e, chat.id)}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={14} />
                            {t.delete}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
            </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Section */}
        <div className="mt-auto pt-6 space-y-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            <span className="text-sm font-semibold">{theme === "light" ? t.darkMode : t.lightMode}</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center justify-between p-3 bg-slate-200/30 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                {user.displayName?.[0] || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate">{user.displayName}</span>
                <span className="text-[10px] text-slate-500 truncate">{user.email}</span>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={isOpen ? "Hide Sidebar" : "Show Sidebar"}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-50",
          isOpen ? "-right-5" : "left-4"
        )}
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} className="text-blue-600" />}
      </motion.button>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {chatToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.delete}</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {t.confirmDelete}
                </p>
                <div className="flex gap-3 w-full mt-4">
                  <button
                    onClick={() => setChatToDelete(null)}
                    className="flex-1 py-3 px-6 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={confirmDeleteChat}
                    className="flex-1 py-3 px-6 rounded-2xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  >
                    {t.confirm}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
