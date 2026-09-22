import React from 'react';
import { 
  FiLogIn, 
  FiCheck, 
  FiHeart, 
  FiHeadphones, 
  FiShare, 
  FiChevronRight 
} from 'react-icons/fi';

export default function HomeView({
  userProfile,
  completedDays,
  currentJourneyDay,
  progressPercentage,
  activeEra,
  displayTitle,
  estReadingMinutes,
  isBrandNewUser,
  isTodayCompleted,
  lastPlaybackPosition,
  todayPurpose,
  verseCopied,
  journalEntries,
  readDirections,
  featuredDirections,
  formatAudioTime,
  getFormattedDate,
  dynamicGreeting,
  hasProfile,
  triggerHaptic,
  openAuthModal,
  setIsEditProfileOpen,
  setActivePlanDay,
  setCurrentBook,
  setCurrentChapter,
  setCurrentVerse,
  setActiveTab,
  handleToggleAudio,
  handleAudioSeek,
  handleCopyVerse,
  setIsQuickNoteOpen,
  setSelectedDirection,
  markDirectionAsRead
}) {
  return (
    <main className="flex-1 overflow-y-auto pb-32 font-sans bg-[#12161B] text-[#EDEAE4] select-none">
      {/* Responsive Hero Banner: Anchored Top */}
      <div className="relative w-full aspect-[4/3] max-h-[310px] overflow-hidden bg-[#0D1217]">
        <img 
          src="/A%20Home-top.png?v=2" 
          alt="Discover the Path God Has Prepared for You" 
          className="w-full h-full object-cover object-top block"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12161B] via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#12161B] to-transparent pointer-events-none" />
      </div>

      <div className="px-5 -mt-3 relative z-10 space-y-4">
        
        {/* Greeting & Story Initiation */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10.5px] uppercase font-sans tracking-[0.16em] text-[#C6A87C] font-semibold">
              {getFormattedDate()}
            </p>
            <h1 className="text-[24px] font-serif font-normal text-white tracking-tight leading-snug mt-0.5">
              {dynamicGreeting}
            </h1>

            {isBrandNewUser && (
              <div className="mt-2 pb-0.5">
                <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-[#C6A87C]">
                  YOUR JOURNEY STARTS HERE
                </p>
                <p className="text-[12.5px] text-gray-300 font-serif leading-relaxed mt-0.5">
                  Walk through the entire Bible in 365 days, in chronological order—following God's story from Genesis to Revelation.
                </p>
              </div>
            )}
          </div>

          {!userProfile?.email && (
            <button
              onClick={() => openAuthModal('signin')}
              className="mt-1 text-[10px] text-[#C6A87C] border border-[#C6A87C]/30 bg-[#C6A87C]/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider hover:bg-[#C6A87C]/20 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
            >
              <FiLogIn size={11} />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Primary Reading Card with Liquid Glass Bevel Edge */}
        <div className="relative bg-[#161C24] border border-white/[0.08] rounded-[24px] p-5 shadow-xl shadow-black/40 overflow-hidden ring-1 ring-white/[0.05]">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-[#C6A87C]">
              Day {currentJourneyDay?.day || 1} of 365
            </span>
            
            {completedDays.length > 0 && (
              <span className="text-[10.5px] text-gray-400 font-medium flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-full border border-white/5">
                <span className="text-[#C6A87C]">🔥</span> {completedDays.length} day journey
              </span>
            )}
          </div>

          {/* Card Title & Milestone Badge */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0 pr-1">
              <h2 className="text-[20px] font-serif text-white font-normal leading-snug truncate">
                {displayTitle}
              </h2>
              <div className="flex items-center gap-2 text-[11.5px] text-gray-400 mt-1">
                <span className="text-[#C6A87C] font-semibold">
                  {currentJourneyDay?.startBook} {currentJourneyDay?.startChapter}
                  {currentJourneyDay?.endChapter && currentJourneyDay?.endChapter !== currentJourneyDay?.startChapter 
                    ? `–${currentJourneyDay?.endChapter}` 
                    : ''}
                </span>
                <span className="text-gray-600">•</span>
                <span>{estReadingMinutes} min read</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">{activeEra?.title || 'Milestone'}</span>
              </div>
            </div>

            <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden border border-[#C6A87C]/30 flex-shrink-0 shadow-md bg-black/40">
              <img 
                src={activeEra?.img || '/Creation.png'} 
                alt={activeEra?.title || 'Milestone'} 
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {!isBrandNewUser && (
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[4.5px] bg-[#222B35] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#D9B777] to-[#C6A87C] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(progressPercentage, 3)}%` }}
                />
              </div>
              <span className="text-[10.5px] text-gray-400 font-bold min-w-[28px] text-right font-sans">
                {progressPercentage}%
              </span>
            </div>
          )}

          {/* Dynamic Buttons */}
          {isBrandNewUser ? (
            <div className="space-y-2 mt-1.5">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setActivePlanDay(1);
                  setCurrentBook('Genesis');
                  setCurrentChapter(1);
                  setCurrentVerse(1);
                  setActiveTab('Bible');
                }}
                className="w-full bg-[#C6A87C] hover:brightness-105 active:scale-[0.98] text-[#14202E] font-sans font-bold text-[13px] py-2.5 px-4 rounded-[14px] transition-all flex items-center justify-center tracking-wider uppercase shadow-md"
              >
                Start Day 1
              </button>

              <button
                onClick={() => openAuthModal('signin')}
                className="w-full text-center text-[11px] text-gray-400 hover:text-[#C6A87C] font-medium py-1 transition-colors flex items-center justify-center gap-1"
              >
                <span>Already walking with us?</span>
                <span className="text-[#C6A87C] font-bold underline">Sign In to Restore</span>
              </button>
            </div>
          ) : isTodayCompleted ? (
            <div className="space-y-1.5 mt-1.5">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActivePlanDay(currentJourneyDay.day);
                  setActiveTab('Plan');
                }}
                className="w-full bg-emerald-700/80 text-white font-sans font-bold text-[12px] py-2 px-4 rounded-[13px] flex items-center justify-center gap-1.5 border border-emerald-500/40"
              >
                <FiCheck size={14} /> Today's Journey Complete
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('Journal');
                }}
                className="w-full bg-white/[0.05] hover:bg-white/10 active:scale-[0.98] text-[#C6A87C] font-sans font-semibold text-[11.5px] py-1.5 px-3 rounded-[12px] transition-all flex items-center justify-center tracking-tight border border-white/10"
              >
                View Today's Reflection →
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('medium');
                setActivePlanDay(currentJourneyDay.day);
                setActiveTab('Plan');
              }}
              className="w-full mt-1.5 bg-[#C6A87C] hover:brightness-105 active:scale-[0.98] text-[#14202E] font-sans font-bold text-[12.5px] py-2.5 px-4 rounded-[14px] transition-all flex items-center justify-center tracking-tight shadow-md"
            >
              Continue Reading
            </button>
          )}
        </div>

        {/* Profile Setup Callout */}
        {!hasProfile && (
          <div 
            onClick={() => {
              triggerHaptic('light');
              setIsEditProfileOpen(true);
            }}
            className="bg-[#161C24]/90 border border-[#C6A87C]/30 hover:border-[#C6A87C] p-4 rounded-2xl cursor-pointer active:scale-[0.99] transition-all shadow-md shadow-black/20"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#C6A87C]/15 text-[#C6A87C] flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiHeart size={15} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white leading-snug">
                  Make This Journey Personal
                </p>
                <p className="text-[10.5px] text-gray-400 mt-0.5 leading-relaxed">
                  Set your Life Verse, save reflections, track your journey, and protect your progress across all device cache clears.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#C6A87C] text-[#14202E] font-sans font-bold text-[10.5px] uppercase tracking-wider shadow-sm">
                    Set Up My Profile →
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAuthModal('signin');
                    }}
                    className="text-[10.5px] text-gray-400 hover:text-white underline ml-1"
                  >
                    or Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resume Audio Bar */}
        {lastPlaybackPosition && (
          <div 
            onClick={() => {
              triggerHaptic('light');
              setCurrentBook(lastPlaybackPosition.book);
              setCurrentChapter(lastPlaybackPosition.chapter);
              handleToggleAudio(lastPlaybackPosition.book, lastPlaybackPosition.chapter);
              setTimeout(() => handleAudioSeek(lastPlaybackPosition.time), 400);
              setActiveTab('Bible');
            }}
            className="bg-[#161C24] border border-[#C6A87C]/40 p-3.5 rounded-[20px] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C6A87C]/15 border border-[#C6A87C]/30 text-[#C6A87C] flex items-center justify-center flex-shrink-0">
                <FiHeadphones size={16} />
              </div>
              <div>
                <p className="text-[9.5px] uppercase font-bold tracking-wider text-[#C6A87C]">Resume Narration</p>
                <p className="text-[13.5px] font-serif text-white font-medium">
                  {lastPlaybackPosition.book} {lastPlaybackPosition.chapter}
                </p>
                <p className="text-[9.5px] text-gray-400">Continue at {formatAudioTime(lastPlaybackPosition.time)}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#C6A87C] px-3 py-1 rounded-full bg-[#C6A87C]/10 border border-[#C6A87C]/20">
              Resume ▶
            </span>
          </div>
        )}

        {/* Verse for Today */}
        <div className="bg-[#161C24] border border-white/[0.08] rounded-[24px] p-5 shadow-xl shadow-black/30 relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] uppercase font-bold tracking-wider text-gray-400">
              Verse for today
            </p>
            <button
              onClick={() => handleCopyVerse(todayPurpose?.purpose, todayPurpose?.verseRef)}
              className="text-[10.5px] font-sans text-[#C6A87C] hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 active:scale-95 transition-all"
              title="Copy verse"
            >
              {verseCopied ? (
                <>
                  <FiCheck size={11} className="text-[#C6A87C]" />
                  <span className="text-[9.5px] font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <FiShare size={11} />
                  <span className="text-[9.5px] font-medium">Share</span>
                </>
              )}
            </button>
          </div>

          <blockquote className="font-serif text-[14.5px] leading-[1.5] text-gray-200 font-normal mb-2 italic">
            "{todayPurpose?.purpose || 'With God all things are possible.'}"
          </blockquote>

          <p className="text-[11.5px] text-[#C6A87C] font-semibold tracking-wide">
            {todayPurpose?.verseRef || 'Matthew 19:26'}
          </p>
        </div>

        {/* Notes & Quick-Add Button */}
        <div className="bg-[#161C24] border border-white/[0.08] rounded-[22px] px-4.5 py-3.5 flex items-center justify-between shadow-xl shadow-black/30">
          <div 
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('Journal');
            }}
            className="flex-1 cursor-pointer pr-3"
          >
            <p className="text-[13.5px] font-sans font-semibold text-white">Notes & Prayers</p>
            <p className="text-[10.5px] text-gray-400 mt-0.5">
              {journalEntries.length === 0 
                ? 'Record your thoughts for today' 
                : `${journalEntries.length} reflection${journalEntries.length === 1 ? '' : 's'} recorded`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsQuickNoteOpen(true);
              }}
              className="w-[30px] h-[30px] rounded-full bg-[#C6A87C]/20 border border-[#C6A87C]/40 text-[#C6A87C] flex items-center justify-center font-bold text-sm active:scale-90 transition-transform"
              title="Quick note"
            >
              +
            </button>
            <button 
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('Journal');
              }}
              className="p-1 text-gray-500 hover:text-white"
            >
              <FiChevronRight size={17} />
            </button>
          </div>
        </div>

        {/* Featured Directions Slider */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div>
              <h3 className="text-[13.5px] font-sans font-semibold text-white tracking-tight">
                Featured Directions
              </h3>
              <p className="text-[9.5px] text-gray-400 mt-0.5">Short devotionals for your day</p>
            </div>
            <span className="text-[10px] font-sans text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
              {readDirections.length}/{featuredDirections.length} read
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none -mx-5 px-5">
            {featuredDirections.map((item) => {
              const isRead = readDirections.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedDirection(item);
                    markDirectionAsRead(item.id);
                  }}
                  className={`snap-start relative flex-shrink-0 w-[130px] h-[180px] rounded-[20px] overflow-hidden cursor-pointer border transition-all duration-200 shadow-lg group bg-[#161C24] ${
                    isRead 
                      ? 'border-white/[0.08] opacity-85' 
                      : 'border-[#C6A87C]/30 hover:border-[#C6A87C] hover:scale-[1.02]'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      if (!e.target.dataset.retried) {
                        e.target.dataset.retried = 'true';
                        e.target.src = item.image.includes('%20')
                          ? decodeURIComponent(item.image)
                          : encodeURI(item.image);
                      }
                    }}
                  />

                  <div className="absolute top-2.5 right-2.5">
                    {isRead ? (
                      <div className="w-5 h-5 rounded-full bg-[#14202E]/80 backdrop-blur-sm border border-[#C6A87C] flex items-center justify-center text-[10px] text-[#C6A87C]">
                        <FiCheck size={10} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[10px] text-[#C6A87C]">
                        ✦
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 pt-12 pb-3.5 px-3 bg-gradient-to-t from-[#0A1017] via-[#0A1017]/75 to-transparent">
                    <p className="text-[12.5px] font-serif font-medium text-white leading-tight">
                      {item.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}