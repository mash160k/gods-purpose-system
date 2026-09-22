import React from 'react';
import { FiX, FiBookmark, FiShare2, FiEdit3 } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';

export default function VerseActionDrawer({
  activeVerseDrawer,
  currentBook,
  currentChapter,
  onClose,
  onPlayFromHere,
  onToggleHighlight,
  onShareVerse,
  onReflectInJournal
}) {
  if (!activeVerseDrawer) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] transition-opacity">
      <div className="bg-[#18212D] text-white w-full rounded-t-[2.2rem] p-5 border-t border-[#2C3B4E] shadow-2xl space-y-3.5">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="text-[11px] font-sans uppercase tracking-wider font-bold text-[#C6A87C]">
            {currentBook} {currentChapter}:{activeVerseDrawer.verseNum}
          </span>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1"
          >
            <FiX size={17} />
          </button>
        </div>

        <blockquote className="font-serif text-[13px] italic text-gray-200 line-clamp-3 leading-relaxed">
          "{activeVerseDrawer.text}"
        </blockquote>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Play from here */}
          <button
            onClick={() => onPlayFromHere(activeVerseDrawer.verseNum)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 transition-all text-center"
          >
            <FaPlay size={12} className="text-[#C6A87C] mb-1.5" />
            <span className="text-[9.5px] font-medium text-gray-300">Play Here</span>
          </button>

          {/* Highlight */}
          <button
            onClick={() => onToggleHighlight(currentBook, currentChapter, activeVerseDrawer.verseNum)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 transition-all text-center"
          >
            <FiBookmark size={14} className="text-[#C6A87C] mb-1.5" />
            <span className="text-[9.5px] font-medium text-gray-300">Highlight</span>
          </button>

          {/* Share Quote */}
          <button
            onClick={() => onShareVerse(activeVerseDrawer.text, `${currentBook} ${currentChapter}:${activeVerseDrawer.verseNum}`)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 transition-all text-center"
          >
            <FiShare2 size={14} className="text-[#C6A87C] mb-1.5" />
            <span className="text-[9.5px] font-medium text-gray-300">Share</span>
          </button>

          {/* Add to Journal */}
          <button
            onClick={() => onReflectInJournal(activeVerseDrawer.text, `${currentBook} ${currentChapter}:${activeVerseDrawer.verseNum}`)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 transition-all text-center"
          >
            <FiEdit3 size={14} className="text-[#C6A87C] mb-1.5" />
            <span className="text-[9.5px] font-medium text-gray-300">Reflect</span>
          </button>
        </div>
      </div>
    </div>
  );
}