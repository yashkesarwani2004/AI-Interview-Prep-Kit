import Link from 'next/link';
import { ArrowRight, Bot, Target, Calendar, Edit3, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          <span>AI-Powered Interview Preparation</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Turn Any Job Description Into a{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Personalised Prep Kit
          </span>
        </h1>
        <p className="text-lg text-slate-400">
          Paste a job description, enter the company URL, and set your prep timeline. Our autonomous crawler and multi-stage AI generate structured company briefs, targeted question banks, flashcards, and a day-by-day study schedule.
        </p>
        <div className="flex justify-center space-x-4 pt-4">
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <span>Create Your First Kit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-xl glass-card text-slate-300 hover:text-white font-semibold hover:bg-slate-800/60 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 pt-6">
        <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Autonomous Crawling</h3>
          <p className="text-sm text-slate-400">
            Crawls company websites dynamically, ranks hiring pages, parses engineering blogs, and respects site terms with SSRF protection.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">2nd-Pass Coverage Guarantee</h3>
          <p className="text-sm text-slate-400">
            Deterministic code verifies that every must-have job requirement has question coverage, triggering automatic second-pass generation loops.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
            <Edit3 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">The Reshapeable Builder</h3>
          <p className="text-sm text-slate-400">
            Inline edit, reorder, add/delete questions, and regenerate single sections without discarding your manual edits or custom items.
          </p>
        </div>
      </div>
    </div>
  );
}
