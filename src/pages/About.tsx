import { motion } from "motion/react";
import { Sparkles, Shield, Zap, Globe } from "lucide-react";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          About Mabless AI
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          We are building the next generation of AI-powered search and study assistants.
          Mabless AI combines the power of large language models with real-time web discovery.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          {
            icon: <Sparkles className="text-blue-500" />,
            title: "Our Mission",
            desc: "To make information more accessible and understandable for everyone, everywhere."
          },
          {
            icon: <Shield className="text-purple-500" />,
            title: "Privacy First",
            desc: "Your data is yours. We prioritize security and transparency in everything we build."
          },
          {
            icon: <Zap className="text-yellow-500" />,
            title: "Speed & Accuracy",
            desc: "Get direct answers instantly, backed by the most relevant web resources."
          },
          {
            icon: <Globe className="text-green-500" />,
            title: "Global Knowledge",
            desc: "Access information from across the web, curated and summarized for you."
          }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              {item.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{item.title}</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 p-10 bg-gradient-to-br from-blue-600 to-purple-700 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <h2 className="text-3xl font-bold mb-4 relative z-10">Join the AI Revolution</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto relative z-10">
          Mabless AI is constantly evolving. We're adding new features every week to help you learn and work smarter.
        </p>
        <button className="px-8 py-3 bg-white text-blue-600 rounded-full font-bold hover:bg-blue-50 transition-colors shadow-lg relative z-10">
          Get Started Now
        </button>
      </motion.div>
    </div>
  );
}
