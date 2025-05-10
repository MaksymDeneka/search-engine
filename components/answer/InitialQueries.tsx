'use client';

import { ArrowRight } from 'lucide-react';

interface InitialQueriesProps {
  questions: string[];
  handleFollowUpClick: (question: string) => void;
}

export default function InitialQueries({ questions, handleFollowUpClick }: InitialQueriesProps) {
  return (
    <div className="space-y-2">
      {questions.map((question, index) => (
        <button
          key={index}
          className="w-full flex items-center justify-between p-3 bg-neutral-800 hover:bg-gray-800 border border-stone-700 rounded-lg text-left text-gray-300 transition-colors animate-in fade-in duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
          onClick={() => handleFollowUpClick(question)}>
          <span>{question}</span>
          <ArrowRight size={16} className="text-gray-500" />
        </button>
      ))}
    </div>
  );
}
