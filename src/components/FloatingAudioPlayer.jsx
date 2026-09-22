import React from 'react';
import { 
  FiClock, 
  FiDownloadCloud, 
  FiRotateCcw, 
  FiRotateCw, 
  FiX 
} from 'react-icons/fi';
import { FaPlay, FaPause, FaSpinner } from 'react-icons/fa';

export default function FloatingAudioPlayer({
  currentAudioTrack,
  audioCurrentTime,
  audioDuration,
  isAudioPlaying,
  isAudioLoading,
  audioPlaybackRate,
  isTrackCached,
  sleepTimerOption,
  formatAudioTime,
  handleAudioSeek,
  handleAudioSkip,
  handleToggleAudio,
  handleManualCacheTrack,
  handleCycleAudioSpeed,
  handleCycleSleepTimer,
  handleCloseAudio,
  onNavigateToBible
}) {
  if (!currentAudioTrack) return null;

  return (
    <div className="absolute bottom-[68px] left-3 right-3 z-40 bg-[#161F2B]/95 backdrop-blur-md border border-[#2D3C4E]/80 text-white px-3.5 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all select-none">
      {/* Scrubber / Progress Bar */}
      <div className="flex items-center gap-2 text-[8.5px] text-gray-400 mb-1">
        <span>{formatAudioTime(audioCurrentTime)}</span>
        <input
          type="range"
          min={0}
          max={audioDuration || 100}
          value={audioCurrentTime}
          onChange={(e) => handleAudioSeek(Number(e.target.value))}
          className="w-full h-1 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-[#C6A87C]"
        />
        <span>{formatAudioTime(audioDuration)}</span>
      </div>

      <div className="flex items-center justify-between">
        {/* Track Title */}
        <div 
          onClick={onNavigateToBible}
          className="flex flex-col cursor-pointer min-w-0 pr-2"
        >
          <p className="text-[12px] font-bold text-white truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A87C] animate-pulse" />
            {currentAudioTrack.book} {currentAudioTrack.chapter}
          </p>
          <p className="text-[8.5px] text-[#C6A87C] uppercase tracking-wider font-semibold">
            Studio Narration {sleepTimerOption ? `• Sleep: ${sleepTimerOption === 'chapter' ? 'End' : sleepTimerOption + 'm'}` : ''}
          </p>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCycleSleepTimer}
            title="Sleep Timer"
            className={`p-1 transition-colors active:scale-95 ${
              sleepTimerOption ? 'text-[#C6A87C]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FiClock size={13} />
          </button>

          <button
            onClick={handleManualCacheTrack}
            title={isTrackCached ? "Cached offline" : "Download chapter for offline"}
            className={`p-1 transition-colors active:scale-95 ${
              isTrackCached ? 'text-[#C6A87C]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FiDownloadCloud size={13} />
          </button>

          <button
            onClick={() => handleAudioSkip(-15)}
            title="Rewind 15s"
            className="p-1 text-gray-400 hover:text-white transition-colors active:scale-95"
          >
            <FiRotateCcw size={13} />
          </button>

          <button
            onClick={() => handleToggleAudio(currentAudioTrack.book, currentAudioTrack.chapter)}
            disabled={isAudioLoading}
            className="w-7 h-7 rounded-full bg-[#C6A87C] hover:brightness-110 text-[#14202E] flex items-center justify-center font-bold shadow-md active:scale-90 transition-transform"
          >
            {isAudioLoading ? (
              <FaSpinner size={10} className="animate-spin text-[#14202E]" />
            ) : isAudioPlaying ? (
              <FaPause size={9} className="text-[#14202E]" />
            ) : (
              <FaPlay size={9} className="ml-0.5 text-[#14202E]" />
            )}
          </button>

          <button
            onClick={() => handleAudioSkip(15)}
            title="Forward 15s"
            className="p-1 text-gray-400 hover:text-white transition-colors active:scale-95"
          >
            <FiRotateCw size={13} />
          </button>

          <button
            onClick={handleCycleAudioSpeed}
            className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-200"
            title="Playback speed"
          >
            {audioPlaybackRate}x
          </button>

          <button
            onClick={handleCloseAudio}
            title="Close player"
            className="p-1 text-gray-400 hover:text-red-400 transition-colors active:scale-95"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}