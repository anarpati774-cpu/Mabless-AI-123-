import { motion } from "motion/react";
import { Bot, Globe, BookOpen, Mic, Moon, Smartphone, History, Star } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <Bot className="text-blue-500" />,
      title: "AI Chatbot",
      desc: "Advanced conversational AI that understands context and provides direct, accurate answers."
    },
    {
      icon: <Globe className="text-purple-500" />,
      title: "Website Suggestions",
      desc: "Automatically suggests the top 3 most relevant websites for every query you make."
    },
    {
      icon: <BookOpen className="text-green-500" />,
      title: "Study Mode",
      desc: "Toggle detailed explanations, step-by-step guides, and examples for complex topics."
    },
    {
      icon: <Mic className="text-red-500" />,
      title: "Voice Input",
      desc: "Speak naturally to your assistant. High-accuracy speech-to-text integration."
    },
    {
      icon: <Moon className="text-yellow-500" />,
      title: "Dark/Light Mode",
      desc: "Beautifully designed themes that are easy on the eyes, day or night."
    },
    {
      icon: <Smartphone className="text-indigo-500" />,
      title: "Mobile Friendly",
      desc: "Fully responsive design that works perfectly on Android, iOS, and desktop."
    },
    {
      icon: <History className="text-orange-500" />,
      title: "Chat History",
      desc: "Save and revisit your previous conversations anytime with our smart sidebar."
    },
    {
      icon: <Star className="text-pink-500" />,
      title: "Smart Suggestions",
      desc: "Get related follow-up questions to dive deeper into any subject."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold mb-4">Powerful Features</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Mabless AI is packed with tools designed to make your research and learning process seamless.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {f.icon}
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
