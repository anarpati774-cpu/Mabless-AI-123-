import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Auth from "./components/Auth";
import { useState, useEffect } from "react";
import { Language } from "./lib/translations";

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [language, setLanguage] = useState<Language>("en");
  const [hideWebsites, setHideWebsites] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
    const savedHideWebsites = localStorage.getItem("hideWebsites") === "true";
    setHideWebsites(savedHideWebsites);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("hideWebsites", String(hideWebsites));
  }, [hideWebsites]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  const toggleHideWebsites = () => {
    setHideWebsites(prev => !prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} theme={theme} toggleTheme={toggleTheme} language={language}>
        <Routes>
          <Route path="/" element={user ? <Home theme={theme} toggleTheme={toggleTheme} language={language} changeLanguage={changeLanguage} hideWebsites={hideWebsites} toggleHideWebsites={toggleHideWebsites} /> : <Navigate to="/auth" />} />
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </Layout>
    </Router>
  );
}
