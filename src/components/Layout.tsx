import { ReactNode } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { User } from "firebase/auth";
import { useLocation } from "react-router-dom";

import { Language } from "../lib/translations";

interface LayoutProps {
  children: ReactNode;
  user: User | null | undefined;
  theme: "light" | "dark";
  toggleTheme: () => void;
  language: Language;
}

export default function Layout({ children, user, theme, toggleTheme, language }: LayoutProps) {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isChatPage = location.pathname === "/";

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {user && isChatPage && <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} language={language} />}
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isChatPage && <Navbar user={user} theme={theme} toggleTheme={toggleTheme} language={language} />}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
