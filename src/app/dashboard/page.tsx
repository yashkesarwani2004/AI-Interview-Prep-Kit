'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Globe,
  Calendar,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Loader2,
} from 'lucide-react';

interface KitItem {
  id: string;
  title: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  data: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const [kits, setKits] = useState<KitItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Section 2 - Input & Research
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState<number | string>(5);

  // Form Errors & Submitting State
  const [formErrors, setFormErrors] = useState<{ jd?: string; companyUrl?: string; days?: string }>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchKits = async () => {
    try {
      const res = await fetch('/api/kits');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.kits) {
        setKits(data.kits);
      }
    } catch (err) {
      console.error('Failed to fetch kits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, []);

  const validateForm = (): boolean => {
    const errors: { jd?: string; companyUrl?: string; days?: string } = {};

    // 1. Validate Job Description
    if (!jd || jd.trim().length === 0) {
      errors.jd = 'Job description is required and cannot be empty.';
    }

    // 2. Validate Company URL
    if (!companyUrl || companyUrl.trim().length === 0) {
      errors.companyUrl = 'Company website URL is required.';
    } else {
      try {
        const parsed = new URL(companyUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.companyUrl = 'URL must start with http:// or https://';
        }
      } catch {
        errors.companyUrl = 'Please enter a valid URL (e.g. https://company.com).';
      }
    }

    // 3. Validate Days
    const numDays = Number(days);
    if (!days || isNaN(numDays) || !Number.isInteger(numDays) || numDays < 1 || numDays > 60) {
      errors.days = 'Interview preparation timeline must be between 1 and 60 days.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd: jd.trim(),
          company_url: companyUrl.trim(),
          days: Number(days),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit interview preparation kit request');
      }

      // Reset form on success & navigate to builder or refresh
      setJd('');
      setCompanyUrl('');
      setDays(5);
      setFormErrors({});

      if (data.id) {
        router.push(`/kits/${data.id}`);
      } else {
        fetchKits();
      }
    } catch (err: any) {
      setApiError(err.message || 'Network failure while submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this kit?')) return;
    try {
      await fetch(`/api/kits/${id}`, { method: 'DELETE' });
      setKits(kits.filter((k) => k.id !== id));
    } catch (err) {
      alert('Failed to delete kit');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-sm">Loading your dashboard & interview kits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-4 max-w-5xl mx-auto">
      {/* Dashboard Top Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white">Interview Prep Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Paste a job description and company website URL to generate your personalized interview kit.
        </p>
      </div>

      {/* Section 2 — Input and Research Form */}
      <section className="glass-card p-6 md:p-8 rounded-2xl space-y-6 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Create New Interview Kit</h2>
            <p className="text-xs text-slate-400">Section 2 &mdash; Input and Research Submission</p>
          </div>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleGenerateSubmit} className="space-y-6">
          {/* Job Description Textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Job Description *</span>
            </label>
            <textarea
              rows={7}
              value={jd}
              onChange={(e) => {
                setJd(e.target.value);
                if (formErrors.jd) setFormErrors({ ...formErrors, jd: undefined });
              }}
              className={`w-full px-4 py-3 rounded-xl glass-input text-sm resize-y font-mono transition-colors ${
                formErrors.jd ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/30' : ''
              }`}
              placeholder="Paste the complete job description text here..."
            />
            {formErrors.jd && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.jd}</p>}
          </div>

          {/* Grid Inputs: Company URL & Interview Days */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Company Website URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Company Website URL *</span>
              </label>
              <input
                type="url"
                value={companyUrl}
                onChange={(e) => {
                  setCompanyUrl(e.target.value);
                  if (formErrors.companyUrl) setFormErrors({ ...formErrors, companyUrl: undefined });
                }}
                className={`w-full px-4 py-2.5 rounded-xl glass-input text-sm transition-colors ${
                  formErrors.companyUrl ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/30' : ''
                }`}
                placeholder="https://company.com"
              />
              {formErrors.companyUrl && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.companyUrl}</p>}
            </div>

            {/* Prep Days Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-pink-400" />
                <span>Days to Interview *</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  if (formErrors.days) setFormErrors({ ...formErrors, days: undefined });
                }}
                className={`w-full px-4 py-2.5 rounded-xl glass-input text-sm transition-colors ${
                  formErrors.days ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/30' : ''
                }`}
                placeholder="5"
              />
              {formErrors.days && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.days}</p>}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Interview Kit...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Interview Kit</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Saved Prep Kits Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-white">Your Saved Prep Kits</h2>
          <span className="text-xs font-mono text-slate-400">{kits.length} Total Kits</span>
        </div>

        {kits.length === 0 ? (
          <div className="glass-card p-10 text-center rounded-2xl space-y-3">
            <Layers className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Prepared Kits Saved</h3>
            <p className="text-xs text-slate-400">
              Submit the form above to generate your first custom interview preparation kit.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kits.map((kit) => {
              const data = kit.data || {};
              const qCount = data.questions?.length || 0;
              const cardCount = data.flashcards?.length || 0;
              const daysCount = data.schedule?.days_available || 5;

              return (
                <div
                  key={kit.id}
                  className="glass-card p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {kit.companyName}
                      </span>
                      <button
                        onClick={() => handleDelete(kit.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Kit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {data.source?.role || kit.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{daysCount} Days</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <span>{qCount} Questions</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                    <Link
                      href={`/kits/${kit.id}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-center text-xs font-semibold border border-indigo-500/30 flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Builder</span>
                    </Link>
                    <Link
                      href={`/kits/${kit.id}/practice`}
                      className="flex-1 py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-center text-xs font-semibold border border-purple-500/30 flex items-center justify-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Practice</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
