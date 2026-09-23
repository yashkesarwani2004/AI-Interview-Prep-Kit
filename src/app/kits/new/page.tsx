'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Globe, Calendar, FileText, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const STAGES = [
  'Crawling company website & finding hiring sources',
  'Extracting technical & behavioural requirements',
  'Generating category question banks & flashcards',
  'Running deterministic 2nd-pass coverage check',
  'Allocating day-by-day schedule & validating schema',
];

export default function NewKitPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single kit form
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);

  // Batch upload form
  const [batchJson, setBatchJson] = useState('');

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState('');

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCurrentStage(0);

    // Simulate stage progress transitions for UX feedback
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd,
          company_url: companyUrl,
          days,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate kit');
      }

      router.push(`/kits/${data.id}`);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Generation error');
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let cases = [];
      try {
        cases = JSON.parse(batchJson);
        if (!Array.isArray(cases)) throw new Error('Input must be a JSON array of cases.');
      } catch (err: any) {
        throw new Error(`Invalid JSON format: ${err.message}`);
      }

      for (const c of cases) {
        await fetch('/api/kits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jd: c.jd,
            company_url: c.company_url,
            days: c.days || 5,
          }),
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Generate Interview Prep Kit</h1>
        <p className="text-sm text-slate-400">
          Provide your target role details to generate an autonomous, structured preparation kit.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'single'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Single Job Role
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'batch'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Batch JSON Upload
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        /* Progress Indicator Screen */
        <div className="glass-card p-8 rounded-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Generating Your Interview Kit</h3>
            <p className="text-xs text-slate-400">Executing multi-stage crawl & generation pipeline...</p>
          </div>

          <div className="space-y-3 max-w-md mx-auto text-left pt-4">
            {STAGES.map((stage, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-xs">
                {idx < currentStage ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : idx === currentStage ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={idx <= currentStage ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'single' ? (
        /* Single Role Form */
        <form onSubmit={handleSingleSubmit} className="glass-card p-8 rounded-2xl space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Job Description Text</span>
            </label>
            <textarea
              required
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-y font-mono"
              placeholder="Paste the full job description text here (requirements, responsibilities, tech stack)..."
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Company Website URL</span>
              </label>
              <input
                type="url"
                required
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                placeholder="https://company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-pink-400" />
                <span>Prep Days</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Generate Kit</span>
          </button>
        </form>
      ) : (
        /* Batch Upload Form */
        <form onSubmit={handleBatchSubmit} className="glass-card p-8 rounded-2xl space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Batch JSON Array</span>
            </label>
            <textarea
              required
              rows={10}
              value={batchJson}
              onChange={(e) => setBatchJson(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-y font-mono"
              placeholder={`[\n  {\n    "jd": "Senior Engineer...",\n    "company_url": "https://acme.com",\n    "days": 5\n  }\n]`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 transition-all"
          >
            Run Batch Generation
          </button>
        </form>
      )}
    </div>
  );
}
