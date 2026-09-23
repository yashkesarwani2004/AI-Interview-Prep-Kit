'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  Globe,
  Calendar,
  AlertCircle,
  BookOpen,
  Layers,
  Award,
  Pin,
  TrendingDown,
  X,
} from 'lucide-react';
import { PrepKit, KitQuestion, KitFlashcard, QuestionCategory } from '@/shared/types';

export default function KitBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [kit, setKit] = useState<PrepKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'brief' | 'role' | 'questions' | 'flashcards' | 'schedule' | 'coverage'
  >('questions');

  // Question editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editOutline, setEditOutline] = useState('');

  // Creative Feature Modal State
  const [showWeakSpots, setShowWeakSpots] = useState(false);
  const [weakSpotsData, setWeakSpotsData] = useState<any>(null);

  const fetchKit = async () => {
    try {
      const res = await fetch(`/api/kits/${id}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.kit) {
        setKit(data.kit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKit();
  }, [id]);

  const saveKitChanges = async (newKit: PrepKit) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit: newKit }),
      });
      const data = await res.json();
      if (data.kit) {
        setKit(data.kit);
      }
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (section: string, category?: string) => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/kits/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, category }),
      });
      const data = await res.json();
      if (data.kit) {
        setKit(data.kit);
      }
    } catch (err) {
      alert('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveQuestion = (qId: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map((q) => {
      if (q.id === qId) {
        return {
          ...q,
          prompt: editPrompt,
          answer_outline: editOutline,
          isEdited: true,
        };
      }
      return q;
    });

    const updatedKit = { ...kit, questions: updatedQuestions };
    setKit(updatedKit);
    setEditingQuestionId(null);
    saveKitChanges(updatedKit);
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.filter((q) => q.id !== qId);
    const updatedKit = { ...kit, questions: updatedQuestions };
    setKit(updatedKit);
    saveKitChanges(updatedKit);
  };

  const handleAddQuestion = (category: QuestionCategory) => {
    if (!kit) return;
    const newId = `q_custom_${Date.now()}`;
    const newQuestion: KitQuestion = {
      id: newId,
      requirement_ids: kit.role.requirements[0] ? [kit.role.requirements[0].id] : [],
      category,
      prompt: 'New custom question prompt...',
      answer_outline: 'Custom outline points...',
      difficulty: 2,
      isCustom: true,
    };

    const updatedKit = { ...kit, questions: [...kit.questions, newQuestion] };
    setKit(updatedKit);
    saveKitChanges(updatedKit);
  };

  const loadWeakSpotsReport = async () => {
    try {
      const res = await fetch(`/api/practice/${id}/weak-spots`);
      const data = await res.json();
      if (data.report) {
        setWeakSpotsData(data.report);
        setShowWeakSpots(true);
      }
    } catch (err) {
      alert('Could not fetch weak spots report');
    }
  };

  if (loading || !kit) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-sm">Opening Prep Kit Builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Kit Header */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">
              <Globe className="w-3.5 h-3.5" />
              <span>{kit.source.company}</span>
              <span>&bull;</span>
              <span>{kit.source.pages_used.length} Sources Crawled</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">{kit.source.role}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadWeakSpotsReport}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-2 transition-colors"
            >
              <TrendingDown className="w-4 h-4" />
              <span>Weak Spots Report</span>
            </button>
            <Link
              href={`/kits/${id}/practice`}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Practice Mode</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 scrollbar-none gap-2">
        {(['questions', 'brief', 'role', 'flashcards', 'schedule', 'coverage'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tab 1: Question Bank (The Builder Core) */}
      {activeTab === 'questions' && (
        <div className="space-y-8">
          {(['technical', 'behavioural', 'system-design', 'company-fit'] as const).map((cat) => {
            const catQuestions = kit.questions.filter((q) => q.category === cat);

            return (
              <div key={cat} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-white capitalize">{cat.replace('-', ' ')} Questions</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 font-mono">
                      {catQuestions.length}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAddQuestion(cat)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                    <button
                      disabled={regenerating}
                      onClick={() => handleRegenerate('category', cat)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Regenerate category while preserving manual edits & pins"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate Category</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {catQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="glass-card p-5 rounded-xl space-y-3 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Diff {q.difficulty}/3
                            </span>
                            {q.isEdited && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <Edit2 className="w-2.5 h-2.5" /> Edited
                              </span>
                            )}
                            {q.isCustom && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                Custom
                              </span>
                            )}
                          </div>

                          {editingQuestionId === q.id ? (
                            <div className="space-y-3 pt-2">
                              <textarea
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg glass-input text-sm"
                                rows={2}
                              />
                              <textarea
                                value={editOutline}
                                onChange={(e) => setEditOutline(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg glass-input text-xs font-mono"
                                rows={3}
                                placeholder="Answer outline..."
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveQuestion(q.id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                                >
                                  <Save className="w-3.5 h-3.5" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingQuestionId(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-sm font-semibold text-white">{q.prompt}</h4>
                              <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50 whitespace-pre-wrap">
                                <strong className="text-indigo-300">Answer Outline:</strong> {q.answer_outline}
                              </p>
                            </>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingQuestionId(q.id);
                              setEditPrompt(q.prompt);
                              setEditOutline(q.answer_outline);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Inline"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Company Brief */}
      {activeTab === 'brief' && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white">Company Brief</h2>
            <button
              disabled={regenerating}
              onClick={() => handleRegenerate('company_brief')}
              className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-2 hover:bg-indigo-600/30 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate Brief</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase text-indigo-400 mb-1">Summary</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{kit.company_brief.summary}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-purple-400 mb-1">What They Do</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{kit.company_brief.what_they_do}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Sources Crawled</h4>
              <ul className="space-y-1 text-xs text-slate-400 font-mono">
                {kit.company_brief.sources.map((src, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <a href={src} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">
                      {src}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Role & Requirements */}
      {activeTab === 'role' && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-4">Role Requirements</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-slate-400">Extracted Requirements</h3>
            <div className="grid gap-3">
              {kit.role.requirements.map((req) => (
                <div key={req.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-slate-500 mr-2">{req.id}</span>
                    <span className="text-sm font-medium text-slate-200">{req.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      req.priority === 'must' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {req.priority}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {req.kind}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Schedule */}
      {activeTab === 'schedule' && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white">Preparation Schedule ({kit.schedule.days_available} Days)</h2>
            <button
              disabled={regenerating}
              onClick={() => handleRegenerate('schedule')}
              className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-2 hover:bg-indigo-600/30 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate Schedule</span>
            </button>
          </div>

          <div className="space-y-4">
            {kit.schedule.days.map((day) => (
              <div key={day.day} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-400">Day {day.day}</span>
                  <span className="text-xs font-mono text-slate-400">{day.minutes} Minutes</span>
                </div>
                <h4 className="text-sm font-semibold text-white">{day.focus}</h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {day.question_ids.map((qId) => (
                    <span key={qId} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      {qId}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Coverage */}
      {activeTab === 'coverage' && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-4">Coverage Analysis</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Coverage Passes Completed</span>
              <p className="text-3xl font-extrabold text-indigo-400">{kit.coverage.passes}</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Uncovered MUST Requirements</span>
              <p className={`text-3xl font-extrabold ${
                kit.coverage.uncovered_requirement_ids.length === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {kit.coverage.uncovered_requirement_ids.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Creative Feature Modal: Weak Spots Report */}
      {showWeakSpots && weakSpotsData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 rounded-2xl space-y-5 border border-amber-500/30 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <TrendingDown className="w-5 h-5" />
                <h3 className="text-lg font-bold">Interview Weak Spots Report</h3>
              </div>
              <button onClick={() => setShowWeakSpots(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <p className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-200 text-xs">
                {weakSpotsData.recommendation}
              </p>

              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Weak Requirements</h4>
                {weakSpotsData.weakRequirements.length === 0 ? (
                  <p className="text-xs text-slate-500">No weak requirements identified yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {weakSpotsData.weakRequirements.map((r: any) => (
                      <li key={r.id} className="text-xs text-red-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
