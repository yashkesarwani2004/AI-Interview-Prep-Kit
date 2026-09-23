'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Star, CheckCircle, ChevronRight, Award } from 'lucide-react';
import { PrepKit, KitFlashcard } from '@/shared/types';

export default function PracticeModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [kit, setKit] = useState<PrepKit | null>(null);
  const [cards, setCards] = useState<KitFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadPracticeData() {
      try {
        const kitRes = await fetch(`/api/kits/${id}`);
        if (kitRes.status === 401) {
          router.push('/login');
          return;
        }
        const kitData = await kitRes.json();

        const progRes = await fetch(`/api/practice/${id}`);
        const progData = await progRes.json();

        if (kitData.kit) {
          setKit(kitData.kit);
          let loadedCards: KitFlashcard[] = kitData.kit.flashcards || [];

          if (progData.progress && progData.progress.ratings) {
            setRatings(progData.progress.ratings);
            // Spaced Repetition Sort: lowest confidence cards first
            loadedCards.sort((a, b) => {
              const rA = progData.progress.ratings[a.id] || 0;
              const rB = progData.progress.ratings[b.id] || 0;
              return rA - rB;
            });
          }

          setCards(loadedCards);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPracticeData();
  }, [id]);

  const handleRate = async (rating: number) => {
    if (!cards[currentIndex]) return;
    const cardId = cards[currentIndex].id;

    // Optimistic state update
    const updatedRatings = { ...ratings, [cardId]: rating };
    setRatings(updatedRatings);

    try {
      await fetch(`/api/practice/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, rating }),
      });
    } catch (err) {
      console.error(err);
    }

    // Move to next card
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading || !kit || cards.length === 0) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-sm">Preparing Flashcard Session...</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/kits/${id}`}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Builder</span>
        </Link>
        <span className="text-xs font-mono text-indigo-400">
          Card {currentIndex + 1} of {cards.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
        <div
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Flashcard Area */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="glass-card min-h-[320px] rounded-3xl p-8 flex flex-col justify-between cursor-pointer border border-slate-800 hover:border-purple-500/40 transition-all shadow-2xl relative"
      >
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="uppercase font-semibold tracking-wider">
            {isFlipped ? 'Answer Key' : 'Flashcard Prompt'}
          </span>
          <RotateCw className="w-4 h-4 text-purple-400" />
        </div>

        <div className="my-auto text-center space-y-4">
          <h3 className="text-xl md:text-2xl font-bold text-white leading-snug">
            {isFlipped ? currentCard.back : currentCard.front}
          </h3>
          <p className="text-xs text-slate-500">
            {isFlipped ? 'Click card to flip back' : 'Click card to reveal answer'}
          </p>
        </div>

        {ratings[currentCard.id] && (
          <div className="text-center text-xs text-amber-400 font-medium flex items-center justify-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Previous Rating: {ratings[currentCard.id]}/5</span>
          </div>
        )}
      </div>

      {/* Self-Assessment Confidence Buttons */}
      <div className="glass-card p-6 rounded-2xl space-y-3 text-center">
        <span className="text-xs font-semibold uppercase text-slate-400">Rate Your Confidence</span>
        <div className="flex justify-center space-x-2 pt-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => handleRate(score)}
              className={`w-12 h-12 rounded-xl font-bold text-sm flex items-center justify-center transition-all hover:scale-105 ${
                score <= 2
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/40 border border-red-500/30'
                  : score === 3
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/30'
              }`}
            >
              {score}★
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
