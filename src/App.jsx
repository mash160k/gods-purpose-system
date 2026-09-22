import React, { useState, useEffect, useRef, Component } from 'react';
import { db } from './db';
import { RAW_PLAN, PLAN_IMAGES } from './biblePlan';
import { supabase, getOrCreateUserSession, restoreAccountWithEmail } from './supabase';

import { 
  FiSearch, FiSettings, FiBookmark, FiHome, FiBookOpen, 
  FiList, FiX, FiChevronLeft, FiShare, FiHeart, FiCheck, 
  FiBell, FiMap, FiEdit2, FiUser, FiChevronRight, FiClock, 
  FiHeadphones, FiSun, FiMoon, FiRotateCcw, FiRotateCw, 
  FiDownloadCloud, FiShare2, FiEdit3, FiLogIn
} from 'react-icons/fi';
import { FaPlay, FaPause, FaSpinner } from 'react-icons/fa';

// --- HAPTIC FEEDBACK UTILITY ---
function triggerHaptic(type = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'medium') navigator.vibrate(22);
    else if (type === 'success') navigator.vibrate([15, 60, 20]);
  } catch {}
}

// --- VERIFIED PUBLIC DOMAIN HUMAN AUDIO CDN (AudioTreasure KJV) ---
const BIBLE_HUMAN_SLUGS = {
  "Genesis": "01_Genesis", "Exodus": "02_Exodus", "Leviticus": "03_Leviticus",
  "Numbers": "04_Numbers", "Deuteronomy": "05_Deuteronomy", "Joshua": "06_Joshua",
  "Judges": "07_Judges", "Ruth": "08_Ruth", "1 Samuel": "09_1Samuel",
  "2 Samuel": "10_2Samuel", "1 Kings": "11_1Kings", "2 Kings": "12_2Kings",
  "1 Chronicles": "13_1Chronicles", "2 Chronicles": "14_2Chronicles", "Ezra": "15_Ezra",
  "Nehemiah": "16_Nehemiah", "Esther": "17_Esther", "Job": "18_Job",
  "Psalms": "19_Psalms", "Proverbs": "20_Proverbs", "Ecclesiastes": "21_Ecclesiastes",
  "Song of Solomon": "22_SongofSongs", "Isaiah": "23_Isaiah", "Jeremiah": "24_Jeremiah",
  "Lamentations": "25_Lamentations", "Ezekiel": "26_Ezekiel", "Daniel": "27_Daniel",
  "Hosea": "28_Hosea", "Joel": "29_Joel", "Amos": "30_Amos",
  "Obadiah": "31_Obadiah", "Jonah": "32_Jonah", "Micah": "33_Micah",
  "Nahum": "34_Nahum", "Habakkuk": "35_Habakkuk", "Zephaniah": "36_Zephaniah",
  "Haggai": "37_Haggai", "Zechariah": "38_Zechariah", "Malachi": "39_Malachi",
  "Matthew": "40_Matthew", "Mark": "41_Mark", "Luke": "42_Luke",
  "John": "43_John", "Acts": "44_Acts", "Romans": "45_Romans",
  "1 Corinthians": "46_1Corinthians", "2 Corinthians": "47_2Corinthians",
  "Galatians": "48_Galatians", "Ephesians": "49_Ephesians", "Philippians": "50_Philippians",
  "Colossians": "51_Colossians", "1 Thessalonians": "52_1Thessalonians",
  "2 Thessalonians": "53_2Thessalonians", "1 Timothy": "54_1Timothy",
  "2 Timothy": "55_2Timothy", "Titus": "56_Titus", "Philemon": "57_Philemon",
  "Hebrews": "58_Hebrews", "James": "59_James", "1 Peter": "60_1Peter",
  "2 Peter": "61_2Peter", "1 John": "62_1John", "2 John": "63_2John",
  "3 John": "64_3John", "Jude": "65_Jude", "Revelation": "66_Revelation"
};

function getHumanAudioUrl(bookName, chapter) {
  const slug = BIBLE_HUMAN_SLUGS[bookName] || "01_Genesis";
  const ch = String(chapter || 1).padStart(2, "0");
  return `https://www.audiotreasure.com/content/KJV_FF/${slug}_${ch}.mp3`;
}

const AUDIO_CACHE_NAME = 'gps-bible-audio-v1';

async function getCachedAudioBlobUrl(remoteUrl) {
  if (typeof window === 'undefined' || !('caches' in window)) return remoteUrl;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cachedResponse = await cache.match(remoteUrl);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
    fetch(remoteUrl).then(async (response) => {
      if (response.ok) {
        const cacheClone = response.clone();
        await cache.put(remoteUrl, cacheClone);
      }
    }).catch(() => {});
  } catch (err) {
    console.warn("Audio cache note:", err);
  }
  return remoteUrl;
}

async function isAudioCached(remoteUrl) {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const match = await cache.match(remoteUrl);
    return Boolean(match);
  } catch {
    return false;
  }
}

function getVerseSeekTime(targetVerseNum, versesList, totalAudioSecs, syncOffset = 3.8) {
  if (!versesList || versesList.length === 0 || !totalAudioSecs) return 0;
  const INTRO_PAD_SECS = syncOffset;
  const adjustedTotal = Math.max(1, totalAudioSecs - INTRO_PAD_SECS);

  const verseWeights = versesList.map((v) => {
    const text = typeof v === 'string' ? v : (v?.text || '');
    const punctuationBonus = (text.match(/[,.;:?!—]/g) || []).length * 8;
    return text.length + punctuationBonus + 35;
  });

  const totalWeight = verseWeights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;

  let accumulated = 0;
  for (let i = 0; i < targetVerseNum - 1 && i < verseWeights.length; i++) {
    accumulated += verseWeights[i];
  }

  return INTRO_PAD_SECS + (accumulated / totalWeight) * adjustedTotal;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#fff', background: '#1C2A39', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#FF6584' }}>Something went wrong.</h2>
          <pre style={{ background: '#0B1521', padding: 16, borderRadius: 8, overflowX: 'auto', fontSize: 12 }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#CBA365', border: 'none', borderRadius: 20, color: '#1C2A39', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Reset All Data & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SplashScreen({ isFading, onBegin, onOpenAuth }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#D6C2A5] transition-opacity duration-700 ease-out select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <img
        src="/A splash.png"
        alt="God's Purpose System"
        className="absolute inset-0 w-full h-full object-cover object-center max-w-[430px] mx-auto pointer-events-none"
      />
      <div className="relative z-10 w-full" />
      <div className="relative z-10 w-full max-w-[430px] px-8 pb-12 space-y-3">
        <button
          onClick={() => {
            triggerHaptic('light');
            onBegin();
          }}
          className="w-full py-3.5 px-6 rounded-full bg-black/25 hover:bg-black/40 active:scale-95 backdrop-blur-sm border border-white/80 text-white font-serif text-[15px] tracking-[0.15em] uppercase font-medium shadow-lg transition-all duration-200"
        >
          Begin the Journey
        </button>
        <button
          onClick={() => {
            triggerHaptic('light');
            onBegin();
            if (onOpenAuth) setTimeout(onOpenAuth, 350);
          }}
          className="w-full py-1 text-center text-white/90 hover:text-white text-[12px] font-sans tracking-wide drop-shadow underline transition-opacity"
        >
          Already have an account? Sign in here
        </button>
      </div>
    </div>
  );
}

const HOME_BG_URL = "/home-bg-1.png";
const ABRAHAM_ACTIVE_URL = "/Patriarchs.png";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=200&fit=crop&crop=faces,center",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&h=200&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop&crop=center"
];

const DEFAULT_PLAN_ITEM = {
  day: 1,
  title: "In the Beginning",
  startBook: "Genesis",
  startChapter: 1,
  endBook: "Genesis",
  endChapter: 3,
  image: "/Reading-top.png"
};

const safePlanSource = Array.isArray(RAW_PLAN) && RAW_PLAN.length > 0 ? RAW_PLAN : [
  ["In the Beginning", "Genesis", 1, "Genesis", 3]
];

const safeImages = Array.isArray(PLAN_IMAGES) && PLAN_IMAGES.length > 0 ? PLAN_IMAGES : ["/Reading-top.png"];

const CHRONOLOGICAL_PLAN = safePlanSource.map((entry, index) => ({
  day: index + 1,
  title: entry[0] || "Scripture Reading",
  startBook: entry[1] || "Genesis",
  startChapter: Number(entry[2]) || 1,
  endBook: entry[3] || "Genesis",
  endChapter: Number(entry[4]) || 1,
  image: safeImages[index % safeImages.length] || "/Reading-top.png"
}));

const JOURNEY_ERAS = [
  { id: 1, title: 'Creation', subtitle: 'In the beginning, God...', startDay: 1, endDay: 7, img: '/Creation.png' },
  { id: 2, title: 'Patriarchs', subtitle: 'Faith in the unseen.', startDay: 8, endDay: 21, img: '/Patriarchs.png' },
  { id: 3, title: 'Exodus', subtitle: "Freedom, faith, and God's provision.", startDay: 22, endDay: 90, img: '/Exodus.png' },
  { id: 4, title: 'Kingdoms', subtitle: 'A people, a king, a greater King.', startDay: 91, endDay: 180, img: '/Kingdoms.png' },
  { id: 5, title: 'Exile', subtitle: 'Even in the darkness, He is working.', startDay: 181, endDay: 240, img: '/Exile.png' },
  { id: 6, title: 'Jesus', subtitle: 'The fulfillment of it all.', startDay: 241, endDay: 330, img: '/Jesus.png' },
  { id: 7, title: 'Early Church', subtitle: 'The mission continues.', startDay: 331, endDay: 365, img: '/Early Church.png' }
];

const FEATURED_DIRECTIONS = [
  {
    id: 'surrender',
    title: 'Surrender',
    image: '/App%20Jesus.png',
    description: `Jesus, washing His disciples' feet, came to Peter. When He went to wash Peter's feet, Peter protested, "No—you will never wash my feet." It was as though Peter was saying, "You are the Lord. I should be the one washing Yours."\n\nAs humble as that sounds, Jesus replies to Peter that if he does not allow Him to wash his feet, he has no part with Him. We can sit down and wash Jesus' feet a thousand times a day, but at the end of the day, all that can be said is, "Look what I've done."\n\nThe question is this: Have we surrendered to grace? Have we let Jesus wash our feet? Then—all that can be said at the end of the day is, "Look what Jesus has done."`
  },
  {
    id: 'happiness',
    title: 'Happiness',
    image: '/App happiness.jpg',
    description: `The path of happiness and joy is\nto see the glass half full not half empty.\nTo think of what we do have\nand not what we don't have.\nTo look at what we are gaining\nnot what we are loosing.\nTo focus on loving\ninstead of being loved.`
  },
  {
    id: 'followme',
    title: 'Follow Me',
    image: '/App footprints.jpg',
    description: `Jesus and Peter walked together one day—\nNot on the water this time, but on the beach.\nJesus was telling Peter the things he would have to endure in the future. Peter looked around and asked about another disciple named John. Jesus replied, "What is that to you? You follow me."\n\nYou may think to yourself, 'There are others who can do things better than I.' Now hear Him say to you, "What is that to you, you follow me."\n\nYou may think, 'There are already pictures painted, songs sung, books written, why should I?' But again, hear Him say, "What is that to you? You follow me." People say and do things that hurt sometimes. But when you lean in close you can hear Him whisper,\n"What is that to you, you follow me."`
  }
];

function getDayOfYear() {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) || 1;
  } catch {
    return 1;
  }
}

const CALENDAR_PURPOSES = [
  { purpose: "Trust God with something you cannot control.", verseText: "WITH GOD\nALL THINGS\nARE POSSIBLE.", verseRef: "Matthew 19:26" },
  { purpose: "Be quick to listen and slow to anger in every conversation today.", verseText: "LET EVERY PERSON\nBE QUICK TO HEAR,\nSLOW TO SPEAK.", verseRef: "James 1:19" },
  { purpose: "Speak words of encouragement to someone who needs strength today.", verseText: "A WORD FITLY\nSPOKEN IS LIKE\nAPPLES OF GOLD.", verseRef: "Proverbs 25:11" }
];

function getCalendarPurpose() {
  const dayOfYear = getDayOfYear();
  const index = Math.abs(dayOfYear - 1) % CALENDAR_PURPOSES.length;
  return CALENDAR_PURPOSES[index] || CALENDAR_PURPOSES[0];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  try {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(new Date());
  } catch {
    return 'Today';
  }
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const [activeTab, setActiveTab] = useState('Home');
  const [verses, setVerses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDirection, setSelectedDirection] = useState(null);
  const bibleContainerRef = useRef(null);

  // --- AUDIO CONTROLLER STATE ---
  const audioRef = useRef(new Audio());
  const [currentAudioTrack, setCurrentAudioTrack] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1.0);
  const [isTrackCached, setIsTrackCached] = useState(false);
  const [sleepTimerOption, setSleepTimerOption] = useState(null); 
  const sleepTimerRef = useRef(null);

  const [activeVerseDrawer, setActiveVerseDrawer] = useState(null);
  const [verseHighlights, setVerseHighlights] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_verse_highlights');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [lastPlaybackPosition, setLastPlaybackPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_last_audio_position');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [bibleTheme, setBibleTheme] = useState(() => {
    try { return localStorage.getItem('bible_reader_theme') || 'light'; }
    catch { return 'light'; }
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [booksList, setBooksList] = useState([]);
  const [currentBook, setCurrentBook] = useState('Genesis');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentVerse, setCurrentVerse] = useState(1);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    lifeVerse: 'Jeremiah 29:11',
    purposeMotto: 'Led by the Spirit into all the truth.',
    reminderTime: '07:00',
    avatarUrl: AVATAR_PRESETS[0]
  });

  const [journalInput, setJournalInput] = useState('');
  const [journalSavedMsg, setJournalSavedMsg] = useState(false);
  const [journalEntries, setJournalEntries] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_journal_entries');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [fontFamily, setFontFamily] = useState('font-serif');
  const textSizes = ['text-[13px]', 'text-[15px]', 'text-[16.5px]', 'text-[18px]', 'text-[20px]'];
  const [textSizeIndex, setTextSizeIndex] = useState(1);

  const [completedDays, setCompletedDays] = useState(() => {
    try {
      const saved = localStorage.getItem('bible_completed_days');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activePlanDay, setActivePlanDay] = useState(null);

  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [verseCopied, setVerseCopied] = useState(false);
  const [readDirections, setReadDirections] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_read_directions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const handleAutoAdvance = () => {
    if (sleepTimerOption === 'chapter') {
      handleCloseAudio();
      setSleepTimerOption(null);
      return;
    }
    if (!currentAudioTrack) return;
    const bIndex = booksList.findIndex(b => b.name === currentAudioTrack.book);
    if (bIndex === -1) return;

    const totalChaps = booksList[bIndex]?.chapters?.length || 1;
    let nextBook = currentAudioTrack.book;
    let nextChapter = currentAudioTrack.chapter + 1;

    if (nextChapter > totalChaps) {
      if (bIndex < booksList.length - 1) {
        nextBook = booksList[bIndex + 1].name;
        nextChapter = 1;
      } else return;
    }

    setCurrentBook(nextBook);
    setCurrentChapter(nextChapter);
    setCurrentVerse(1);
    handleToggleAudio(nextBook, nextChapter);
  };

  useEffect(() => {
    const audio = audioRef.current;
    const onPlay = () => setIsAudioPlaying(true);
    const onPause = () => setIsAudioPlaying(false);
    const onWaiting = () => setIsAudioLoading(true);
    const onPlaying = () => {
      setIsAudioLoading(false);
      setIsAudioPlaying(true);
    };
    const onTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsAudioLoading(false);
    };
    const onEnded = () => {
      setIsAudioPlaying(false);
      setAudioCurrentTime(0);
      handleAutoAdvance();
    };
    const onError = () => {
      setIsAudioLoading(false);
      setIsAudioPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [currentAudioTrack, booksList, sleepTimerOption]);

  // --- SLEEP TIMER WITH 4-SECOND FADE-OUT ---
  useEffect(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);

    if (typeof sleepTimerOption === 'number' && sleepTimerOption > 0) {
      const totalMs = sleepTimerOption * 60 * 1000;
      const fadeStartMs = Math.max(0, totalMs - 4000);

      sleepTimerRef.current = setTimeout(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let step = 0;
        const fadeInterval = setInterval(() => {
          step++;
          audio.volume = Math.max(0, 1 - step * 0.05);

          if (step >= 20 || audio.volume <= 0.05) {
            clearInterval(fadeInterval);
            handleCloseAudio();
            setSleepTimerOption(null);
            audio.volume = 1;
          }
        }, 200);
      }, fadeStartMs);
    }

    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepTimerOption]);

  useEffect(() => {
    if (!currentAudioTrack || audioCurrentTime <= 2) return;
    const record = {
      book: currentAudioTrack.book,
      chapter: currentAudioTrack.chapter,
      time: audioCurrentTime,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem('gps_last_audio_position', JSON.stringify(record));
      setLastPlaybackPosition(record);
    } catch {}
  }, [audioCurrentTime, currentAudioTrack]);

  // --- NATIVE LOCK SCREEN MEDIA SESSION INTEGRATION ---
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentAudioTrack) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${currentAudioTrack.book} Chapter ${currentAudioTrack.chapter}`,
      artist: "Human Audio Narration (KJV)",
      album: "God's Purpose System",
      artwork: [
        { src: '/A splash.png', sizes: '512x512', type: 'image/png' },
        { src: '/A splash.png', sizes: '192x192', type: 'image/png' }
      ]
    });

    if ('setPositionState' in navigator.mediaSession && audioDuration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, audioDuration),
          playbackRate: audioPlaybackRate,
          position: Math.min(audioCurrentTime, audioDuration)
        });
      } catch (e) {}
    }

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current.play().catch(() => {});
      setIsAudioPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => handleAudioSkip(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => handleAudioSkip(15));
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevChapter());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleAutoAdvance());

    return () => {
      if ('mediaSession' in navigator) {
        ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'].forEach(action => {
          try { navigator.mediaSession.setActionHandler(action, null); } catch {}
        });
      }
    };
  }, [currentAudioTrack, audioDuration, audioCurrentTime, audioPlaybackRate]);

  // Verse sync
  useEffect(() => {
    if (!isAudioPlaying || !audioDuration || audioDuration === 0 || verses.length === 0) return;
    if (currentAudioTrack?.book !== currentBook || currentAudioTrack?.chapter !== currentChapter) return;

    const INTRO_PAD_SECS = 3.8;
    if (audioCurrentTime < INTRO_PAD_SECS) {
      if (currentVerse !== 1) setCurrentVerse(1);
      return;
    }

    const adjustedCurrentTime = audioCurrentTime - INTRO_PAD_SECS;
    const adjustedTotalDuration = Math.max(1, audioDuration - INTRO_PAD_SECS);

    const verseWeights = verses.map((v) => {
      const text = typeof v === 'string' ? v : (v?.text || '');
      const punctuationBonus = (text.match(/[,.;:?!—]/g) || []).length * 8;
      return text.length + punctuationBonus + 35;
    });

    const totalWeight = verseWeights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return;

    let accumulatedWeight = 0;
    let detectedVerse = 1;

    for (let i = 0; i < verseWeights.length; i++) {
      accumulatedWeight += verseWeights[i];
      const expectedEndSecs = (accumulatedWeight / totalWeight) * adjustedTotalDuration;
      if (adjustedCurrentTime <= expectedEndSecs) {
        detectedVerse = i + 1;
        break;
      }
    }

    if (detectedVerse !== currentVerse) {
      setCurrentVerse(detectedVerse);
      if (activeTab === 'Bible') {
        const el = document.getElementById(`verse-${detectedVerse}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [audioCurrentTime, isAudioPlaying, audioDuration, verses, currentAudioTrack, currentBook, currentChapter, activeTab, currentVerse]);

  const handleToggleAudio = async (book, chapter) => {
    triggerHaptic('light');
    const targetBook = book || currentBook;
    const targetChapter = chapter || currentChapter;
    const audio = audioRef.current;

    if (currentAudioTrack?.book === targetBook && currentAudioTrack?.chapter === targetChapter) {
      if (isAudioPlaying) {
        audio.pause();
        setIsAudioPlaying(false);
      } else {
        audio.play().catch(e => console.warn("Audio resume error:", e));
        setIsAudioPlaying(true);
      }
      return;
    }

    audio.pause();
    try {
      setIsAudioLoading(true);
      setCurrentAudioTrack({ book: targetBook, chapter: targetChapter });

      const remoteUrl = getHumanAudioUrl(targetBook, targetChapter);
      const cached = await isAudioCached(remoteUrl);
      setIsTrackCached(cached);

      const playableSrc = await getCachedAudioBlobUrl(remoteUrl);
      audio.removeAttribute('crossorigin');
      audio.src = playableSrc;
      audio.playbackRate = audioPlaybackRate;
      audio.volume = 1;
      audio.load();

      await audio.play();
      setIsAudioPlaying(true);
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsAudioPlaying(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleManualCacheTrack = async () => {
    if (!currentAudioTrack) return;
    triggerHaptic('medium');
    const remoteUrl = getHumanAudioUrl(currentAudioTrack.book, currentAudioTrack.chapter);
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const res = await fetch(remoteUrl);
      if (res.ok) {
        await cache.put(remoteUrl, res.clone());
        setIsTrackCached(true);
        triggerHaptic('success');
        alert(`Downloaded ${currentAudioTrack.book} ${currentAudioTrack.chapter} for offline listening!`);
      }
    } catch (e) {
      console.warn("Could not cache track:", e);
    }
  };

  const handleAudioSeek = (secs) => {
    if (audioRef.current) {
      audioRef.current.currentTime = secs;
      setAudioCurrentTime(secs);
    }
  };

  const handleAudioSkip = (delta) => {
    triggerHaptic('light');
    if (audioRef.current) {
      const nextTime = Math.min(Math.max(0, audioRef.current.currentTime + delta), audioDuration || 1000);
      handleAudioSeek(nextTime);
    }
  };

  const handleCycleAudioSpeed = () => {
    triggerHaptic('light');
    const speeds = [0.8, 1.0, 1.15, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(audioPlaybackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    
    setAudioPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleCycleSleepTimer = () => {
    triggerHaptic('light');
    const options = [null, 15, 30, 45, 'chapter'];
    const next = options[(options.indexOf(sleepTimerOption) + 1) % options.length];
    setSleepTimerOption(next);
  };

  const handleToggleHighlight = (book, chapter, verseNum, color = '#E6C687') => {
    triggerHaptic('medium');
    const key = `${book}-${chapter}-${verseNum}`;
    const next = { ...verseHighlights };
    if (next[key]) delete next[key];
    else next[key] = color;
    setVerseHighlights(next);
    try { localStorage.setItem('gps_verse_highlights', JSON.stringify(next)); } catch (e) {}
    setActiveVerseDrawer(null);
  };

  const handleCloseAudio = () => {
    triggerHaptic('light');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setCurrentAudioTrack(null);
    setIsAudioPlaying(false);
    setIsAudioLoading(false);
  };

  const handleBeginJourney = () => {
    setSplashFading(true);
    setTimeout(() => setShowSplash(false), 700);
  };

  const handleCopyVerse = async (text, ref) => {
    try {
      await navigator.clipboard.writeText(`"${text}" — ${ref}`);
      triggerHaptic('success');
      setVerseCopied(true);
      setTimeout(() => setVerseCopied(false), 2000);
    } catch (e) {
      console.warn("Could not copy text:", e);
    }
  };

  const handleSaveQuickNote = async () => {
    if (!quickNoteText.trim()) return;
    triggerHaptic('success');
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      text: quickNoteText.trim()
    };
    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    try { localStorage.setItem('gps_journal_entries', JSON.stringify(updated)); } catch (e) {}
    setQuickNoteText('');
    setIsQuickNoteOpen(false);

    try {
      const user = await getOrCreateUserSession();
      if (user) {
        await supabase.from('journal_entries').insert({
          id: newEntry.id,
          user_id: user.id,
          date: newEntry.date,
          time: newEntry.time,
          text: newEntry.text
        });
      }
    } catch (err) {
      console.warn("Cloud save quick note error:", err);
    }
  };

  const markDirectionAsRead = (id) => {
    if (!readDirections.includes(id)) {
      const updated = [...readDirections, id];
      setReadDirections(updated);
      try { localStorage.setItem('gps_read_directions', JSON.stringify(updated)); } catch (e) {}
    }
  };

  useEffect(() => {
    if (bibleContainerRef.current) {
      bibleContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentBook, currentChapter]);

  // Sync with Supabase (merge)
  useEffect(() => {
    async function syncCloudData() {
      try {
        const user = await getOrCreateUserSession();
        if (!user) return;

        let localCompleted = [];
        try {
          const savedDays = localStorage.getItem('bible_completed_days');
          if (savedDays) localCompleted = JSON.parse(savedDays);
        } catch {}

        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && !pError) {
          if (profile.name && profile.name !== 'Friend') {
            const remoteProfile = {
              name: profile.name,
              email: profile.email || '',
              lifeVerse: profile.life_verse || 'Jeremiah 29:11',
              purposeMotto: profile.purpose_motto || 'Led by the Spirit into all the truth.',
              reminderTime: profile.reminder_time || '07:00',
              avatarUrl: profile.avatar_url || AVATAR_PRESETS[0]
            };
            setUserProfile(remoteProfile);
            localStorage.setItem('gps_user_profile', JSON.stringify(remoteProfile));
          }

          const cloudCompleted = Array.isArray(profile.completed_days) ? profile.completed_days : [];
          const combinedDays = Array.from(new Set([...localCompleted, ...cloudCompleted])).sort((a, b) => a - b);

          if (combinedDays.length > 0) {
            setCompletedDays(combinedDays);
            localStorage.setItem('bible_completed_days', JSON.stringify(combinedDays));

            if (combinedDays.length > cloudCompleted.length) {
              await supabase.from('profiles').update({
                completed_days: combinedDays,
                updated_at: new Date().toISOString()
              }).eq('id', user.id);
            }
          }
        } else if (localCompleted.length > 0) {
          await supabase.from('profiles').upsert({
            id: user.id,
            completed_days: localCompleted,
            updated_at: new Date().toISOString()
          });
        }

        const { data: cloudJournal, error: jError } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('id', { ascending: false });

        if (cloudJournal && !jError && cloudJournal.length > 0) {
          setJournalEntries(cloudJournal);
          localStorage.setItem('gps_journal_entries', JSON.stringify(cloudJournal));
        }
      } catch (err) {
        console.warn("Cloud sync note:", err);
      }
    }
    syncCloudData();
  }, []);

  // --- SCRIPTURE SEARCH ---
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        let matches = [];
        if (db.verses) {
          const words = trimmed.split(/\s+/).filter(w => w.length > 1);
          const primary = words[0];
          matches = await db.verses.where('tokens').startsWith(primary).limit(60).toArray();
          if (words.length > 1) {
            matches = matches.filter(v => words.every(w => v.text.toLowerCase().includes(w)));
          }
        }
        
        if (!matches || matches.length === 0) {
          const allBooks = await db.books.toArray();
          for (const book of allBooks) {
            if (!book.chapters) continue;
            for (let chIndex = 0; chIndex < book.chapters.length; chIndex++) {
              const chVerses = book.chapters[chIndex];
              if (!Array.isArray(chVerses)) continue;
              for (let vIndex = 0; vIndex < chVerses.length; vIndex++) {
                const item = chVerses[vIndex];
                const text = typeof item === 'string' ? item : (item?.text || item?.verseText || '');
                if (text.toLowerCase().includes(trimmed)) {
                  matches.push({
                    book: book.name,
                    chapter: chIndex + 1,
                    verse: typeof item === 'object' && item?.verse ? item.verse : vIndex + 1,
                    text: text
                  });
                  if (matches.length >= 40) break;
                }
              }
              if (matches.length >= 40) break;
            }
            if (matches.length >= 40) break;
          }
        }
        setSearchResults(matches.slice(0, 40));
      } catch (err) {
        console.warn("Bible search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectSearchResult = (result) => {
    triggerHaptic('light');
    setCurrentBook(result.book);
    setCurrentChapter(result.chapter);
    setCurrentVerse(result.verse);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    setTimeout(() => {
      const el = document.getElementById(`verse-${result.verse}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  };

  const openAuthModal = (mode = 'signin') => {
    triggerHaptic('light');
    setAuthMode(mode);
    setAuthError('');
    setAuthForm({ name: '', email: '', password: '' });
    setIsAuthModalOpen(true);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'signin') {
        const res = await restoreAccountWithEmail(authForm.email.trim(), authForm.password);
        if (res.success && res.user) {
          triggerHaptic('success');
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', res.user.id)
            .maybeSingle();

          if (profile) {
            const restored = {
              name: profile.name || 'Friend',
              email: authForm.email.trim(),
              lifeVerse: profile.life_verse || 'Jeremiah 29:11',
              purposeMotto: profile.purpose_motto || 'Led by the Spirit into all the truth.',
              reminderTime: profile.reminder_time || '07:00',
              avatarUrl: profile.avatar_url || AVATAR_PRESETS[0]
            };
            localStorage.setItem('gps_user_profile', JSON.stringify(restored));
            setUserProfile(restored);

            if (profile.completed_days && Array.isArray(profile.completed_days)) {
              localStorage.setItem('bible_completed_days', JSON.stringify(profile.completed_days));
              setCompletedDays(profile.completed_days);
            }
          }

          const { data: cloudJournal } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', res.user.id)
            .order('id', { ascending: false });

          if (cloudJournal) {
            localStorage.setItem('gps_journal_entries', JSON.stringify(cloudJournal));
            setJournalEntries(cloudJournal);
          }

          setIsAuthModalOpen(false);
          window.location.reload();
        } else {
          setAuthError(res.error || 'Invalid email or password.');
        }
      } else {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password
        });
        if (signUpErr) throw signUpErr;

        const newUser = signUpData?.user;
        if (newUser) {
          triggerHaptic('success');
          const newProfile = {
            name: authForm.name.trim() || 'Friend',
            email: authForm.email.trim(),
            lifeVerse: 'Jeremiah 29:11',
            purposeMotto: 'Led by the Spirit into all the truth.',
            reminderTime: '07:00',
            avatarUrl: AVATAR_PRESETS[0]
          };

          await supabase.from('profiles').upsert({
            id: newUser.id,
            name: newProfile.name,
            email: newProfile.email,
            life_verse: newProfile.lifeVerse,
            completed_days: completedDays,
            updated_at: new Date().toISOString()
          });

          localStorage.setItem('gps_user_profile', JSON.stringify(newProfile));
          setUserProfile(newProfile);
          setIsAuthModalOpen(false);
          alert("Account created and progress protected!");
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    triggerHaptic('medium');
    const finalProfile = {
      name: editForm.name.trim() || 'Friend',
      email: editForm.email.trim() || '',
      lifeVerse: editForm.lifeVerse.trim() || 'Jeremiah 29:11',
      purposeMotto: editForm.purposeMotto.trim() || 'Led by the Spirit into all the truth.',
      reminderTime: editForm.reminderTime || '07:00',
      avatarUrl: editForm.avatarUrl || AVATAR_PRESETS[0]
    };

    setUserProfile(finalProfile);
    try { localStorage.setItem('gps_user_profile', JSON.stringify(finalProfile)); } catch (err) {}
    setIsEditProfileOpen(false);

    try {
      let activeUser = null;
      if (finalProfile.email && editForm.password) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: finalProfile.email,
          password: editForm.password
        });
        if (signUpData?.user) activeUser = signUpData.user;
        else if (signUpErr?.message?.toLowerCase().includes('already registered')) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: finalProfile.email,
            password: editForm.password
          });
          if (signInData?.user) activeUser = signInData.user;
        }
      }

      if (!activeUser) activeUser = await getOrCreateUserSession();
      if (activeUser) {
        await supabase.from('profiles').upsert({
          id: activeUser.id,
          name: finalProfile.name,
          email: finalProfile.email,
          life_verse: finalProfile.lifeVerse,
          purpose_motto: finalProfile.purposeMotto,
          reminder_time: finalProfile.reminderTime,
          avatar_url: finalProfile.avatarUrl,
          completed_days: completedDays,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("Cloud save profile error:", err);
    }
  };

  const handleSaveJournal = async () => {
    if (!journalInput.trim()) return;
    triggerHaptic('success');

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      text: journalInput.trim()
    };

    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    try { localStorage.setItem('gps_journal_entries', JSON.stringify(updated)); } catch (err) {}
    setJournalInput('');
    setJournalSavedMsg(true);
    setTimeout(() => setJournalSavedMsg(false), 2500);

    try {
      const user = await getOrCreateUserSession();
      if (user) {
        await supabase.from('journal_entries').insert({
          id: newEntry.id,
          user_id: user.id,
          date: newEntry.date,
          time: newEntry.time,
          text: newEntry.text
        });
      }
    } catch (err) {
      console.warn("Cloud save journal error:", err);
    }
  };

  const handleDeleteJournal = async (id) => {
    triggerHaptic('light');
    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    try { localStorage.setItem('gps_journal_entries', JSON.stringify(updated)); } catch (err) {}

    try {
      const user = await getOrCreateUserSession();
      if (user) await supabase.from('journal_entries').delete().eq('id', id);
    } catch (err) {
      console.warn("Cloud delete error:", err);
    }
  };

  const currentJourneyDay = CHRONOLOGICAL_PLAN.find(p => !completedDays.includes(p.day)) || CHRONOLOGICAL_PLAN[0] || DEFAULT_PLAN_ITEM;
  const progressPercentage = Math.round((completedDays.length / 365) * 100);

  const currentProgressEra = JOURNEY_ERAS.find(
    era => currentJourneyDay.day >= era.startDay && currentJourneyDay.day <= era.endDay
  ) || JOURNEY_ERAS[0];

  const [expandedEraId, setExpandedEraId] = useState(currentProgressEra?.id || 1);
  const todayPurpose = getCalendarPurpose();
  const currentPlanItem = CHRONOLOGICAL_PLAN.find(p => p.day === activePlanDay);
  const currentBookIndex = booksList.findIndex(b => b.name === currentBook);
  
  const hasPrev = currentBookIndex > 0 || currentChapter > 1;
  const hasNext = currentBookIndex >= 0 && (currentBookIndex < booksList.length - 1 || currentChapter < (booksList[currentBookIndex]?.chapters?.length || 1));
  const isPlanEnd = currentPlanItem && currentBook === currentPlanItem.endBook && currentChapter === currentPlanItem.endChapter;

  useEffect(() => {
    try { localStorage.setItem('bible_reader_theme', bibleTheme); } catch (e) {}
  }, [bibleTheme]);

  const handleNextChapter = async () => {
    triggerHaptic('medium');
    if (currentPlanItem && isPlanEnd) {
      let nextCompleted = completedDays;
      if (!completedDays.includes(activePlanDay)) {
        nextCompleted = [...completedDays, activePlanDay];
        setCompletedDays(nextCompleted);
        try { localStorage.setItem('bible_completed_days', JSON.stringify(nextCompleted)); } catch (e) {}

        try {
          const user = await getOrCreateUserSession();
          if (user) {
            await supabase.from('profiles').update({
              completed_days: nextCompleted,
              updated_at: new Date().toISOString()
            }).eq('id', user.id);
          }
        } catch (err) {
          console.warn("Cloud progress sync error:", err);
        }
      }
      setActivePlanDay(null);
      setActiveTab('Home'); 
      return;
    }
    const totalChaptersInBook = booksList[currentBookIndex]?.chapters?.length || 1;
    if (currentChapter < totalChaptersInBook) {
      setCurrentChapter(currentChapter + 1);
      setCurrentVerse(1);
    } else if (currentBookIndex < booksList.length - 1) {
      setCurrentBook(booksList[currentBookIndex + 1].name);
      setCurrentChapter(1);
      setCurrentVerse(1);
    }
  };

  const handlePrevChapter = () => {
    triggerHaptic('light');
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
      setCurrentVerse(1);
    } else if (currentBookIndex > 0) {
      const prevBook = booksList[currentBookIndex - 1];
      setCurrentBook(prevBook.name);
      setCurrentChapter(prevBook.chapters.length);
      setCurrentVerse(1);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadBibleData = async () => {
      try {
        let count = 0;
        try { 
          count = await db.books.count(); 
        } catch (e) {
          console.warn("Dexie count error:", e);
        }

        if (count === 0) {
          try {
            const response = await fetch('/en_kjv.json');
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                await db.books.bulkAdd(data);
              }
            }
          } catch (fetchErr) {
            console.warn("Error fetching /en_kjv.json:", fetchErr);
          }
        }

        const allBooks = await db.books.toArray();
        if (isMounted) {
          setBooksList(allBooks || []);
          if (allBooks && allBooks.length > 0) {
            const bookData = await db.books.where('name').equals(currentBook).first();
            if (bookData?.chapters?.[currentChapter - 1]) {
              setVerses(bookData.chapters[currentChapter - 1]);
            }
          }
        }
      } catch (error) { 
        console.error("Bible data init error:", error); 
      } finally { 
        if (isMounted) setIsLoading(false); 
      }
    };

    loadBibleData();
    return () => { isMounted = false; };
  }, [currentBook, currentChapter]);

  const activeBookObj = booksList.find(b => b.name === currentBook);
  const totalChapters = activeBookObj?.chapters?.length || 1;
  const currentChapterVerses = activeBookObj?.chapters?.[currentChapter - 1] || [];
  const totalVerses = currentChapterVerses.length || 1;
  const isBibleDark = bibleTheme === 'dark';

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isCurrentChapterAudioActive = 
    currentAudioTrack?.book === currentBook && 
    currentAudioTrack?.chapter === currentChapter;

  const currentName = userProfile?.name || '';
  const firstName = currentName && currentName !== 'Friend' ? currentName.split(' ')[0] : '';
  const dynamicGreeting = firstName ? `${getGreeting()}, ${firstName}` : getGreeting();
  const hasProfile = Boolean(userProfile?.name && userProfile.name !== 'Friend');
  const isBrandNewUser = completedDays.length === 0;
  const isTodayCompleted = completedDays.includes(currentJourneyDay?.day || 1);

  const activeEra = JOURNEY_ERAS.find(
    era => currentJourneyDay.day >= era.startDay && currentJourneyDay.day <= era.endDay
  ) || JOURNEY_ERAS[0];

  const displayTitle = currentJourneyDay?.title && 
    !currentJourneyDay.title.includes(currentJourneyDay.startBook) && 
    currentJourneyDay.title !== "Scripture Reading"
      ? currentJourneyDay.title
      : (currentJourneyDay?.day === 1 
          ? "In the Beginning" 
          : currentJourneyDay?.day === 2 
            ? "The First Generations" 
            : `The Journey of Faith`);

  const estReadingMinutes = Math.max(
    4,
    Math.min(18, ((currentJourneyDay?.endChapter || 1) - (currentJourneyDay?.startChapter || 1) + 1) * 3)
  );

  const nextDays = CHRONOLOGICAL_PLAN.filter(p => p.day > (currentJourneyDay?.day || 1)).slice(0, 2);

  if (isLoading && booksList.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#060B12]">
        <div className="w-full max-w-[430px] h-[100dvh] bg-[#0E1622] flex flex-col items-center justify-center p-6 text-center text-white">
          <span className="font-['Times_New_Roman',serif] text-2xl mb-2 flex items-center gap-2 text-[#F2DFB8]">
            <span>✝</span> God's Purpose System
          </span>
          <div className="w-7 h-7 border-2 border-[#CBA365] border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#060B12] selection:bg-[#C6A87C] selection:text-white">
      {showSplash && (
        <SplashScreen 
          isFading={splashFading} 
          onBegin={handleBeginJourney} 
          onOpenAuth={() => openAuthModal('signin')}
        />
      )}

      <div className="w-full max-w-[430px] h-[100dvh] bg-[#1C2A39] relative overflow-hidden shadow-2xl flex flex-col md:border-x md:border-gray-800">
        
        {/* --- VIEW 1: HOME --- */}
        {activeTab === 'Home' && (
          <main className="flex-1 overflow-y-auto pb-32 font-sans bg-[#12161B] text-[#EDEAE4] select-none">
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

              <div className="pt-1">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div>
                    <h3 className="text-[13.5px] font-sans font-semibold text-white tracking-tight">
                      Featured Directions
                    </h3>
                    <p className="text-[9.5px] text-gray-400 mt-0.5">Short devotionals for your day</p>
                  </div>
                  <span className="text-[10px] font-sans text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
                    {readDirections.length}/{FEATURED_DIRECTIONS.length} read
                  </span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none -mx-5 px-5">
                  {FEATURED_DIRECTIONS.map((item) => {
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
        )}

        {/* --- VIEW 2: PLAN --- */}
        {activeTab === 'Plan' && (
          <main className="flex-1 overflow-y-auto pb-32 font-sans bg-[#12161B] text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between px-5 pt-8 pb-3 bg-[#0D1217]">
                <button 
                  onClick={() => { triggerHaptic('light'); setActiveTab('Home'); }} 
                  className="text-gray-400 hover:text-white flex items-center gap-1 text-xs"
                >
                  <FiChevronLeft size={18} />
                  <span>Home</span>
                </button>
                <span className="font-serif text-[14px] tracking-wide text-gray-200">Bible Journal</span>
                <div className="flex items-center gap-3 text-gray-400">
                  <FiBell size={16} />
                </div>
              </div>

              <div className="relative w-full bg-[#12161B] border-b border-[#222B35] overflow-hidden">
                <div className="relative w-full overflow-hidden bg-[#0D1217]">
                  <img src="/Reading-top.png" alt="Chronological Reading" className="w-full h-auto max-h-[270px] object-contain object-top mx-auto" />
                </div>
                <div className="bg-[#12161B] px-5 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-white tracking-tight">Goal Progress:</p>
                    <p className="text-[11px] text-gray-400 font-normal">1 for Today</p>
                  </div>
                  <div className="relative w-14 h-14 bg-[#1F2732] rounded-full flex items-center justify-center border border-white/10">
                    <span className="font-sans font-bold text-[12px] text-white">{progressPercentage}%</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div 
                  onClick={() => {
                    triggerHaptic('medium');
                    const isDone = completedDays.includes(currentJourneyDay.day);
                    let updated = isDone ? completedDays.filter(d => d !== currentJourneyDay.day) : [...completedDays, currentJourneyDay.day];
                    setCompletedDays(updated);
                    localStorage.setItem('bible_completed_days', JSON.stringify(updated));
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#161C24]/80 border border-[#26313E] cursor-pointer"
                >
                  <div className="flex-1 pr-3">
                    <p className="text-[15px] font-medium text-white tracking-tight">{currentJourneyDay.startBook} {currentJourneyDay.startChapter}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Assigned Daily Reading</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${completedDays.includes(currentJourneyDay.day) ? 'bg-[#C6A87C] border-[#C6A87C]' : 'bg-white border-white'}`}>
                    {completedDays.includes(currentJourneyDay.day) && <FiCheck size={14} className="text-[#14202E] stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setCurrentBook(currentJourneyDay.startBook);
                  setCurrentChapter(currentJourneyDay.startChapter);
                  setCurrentVerse(1);
                  setActivePlanDay(currentJourneyDay.day);
                  setActiveTab('Bible');
                }}
                className="w-full py-2.5 bg-[#C6A87C] text-[#14202E] font-bold text-[13.5px] rounded-lg shadow-md tracking-wide font-sans"
              >
                Read Day {currentJourneyDay.day}
              </button>
            </div>
          </main>
        )}

        {/* --- VIEW 3: JOURNEY --- */}
        {activeTab === 'Journey' && (
          <main className="flex-1 overflow-y-auto pb-32 font-sans bg-[#12161B] text-[#EDEAE4]">
            <div className="relative w-full h-56 overflow-hidden bg-[#0D1217] border-b border-[#222B35]">
              <img 
                src="/A Journey-top.png" 
                alt="The Journey - From Genesis to Revelation" 
                className="w-full h-full object-cover object-center block"
              />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#12161B] to-transparent pointer-events-none" />
            </div>

            <div className="px-4 relative z-20 -mt-6 mb-4">
              <div className="backdrop-blur-md rounded-2xl py-3 px-4 shadow-xl border flex items-center justify-between bg-[#161C24]/90 border-[#26313E]">
                <div className="flex-1 pr-3">
                  <p className="font-bold text-[14px] leading-none mb-1 text-white">{completedDays.length} of 365</p>
                  <p className="text-[7.5px] text-gray-400 uppercase font-semibold tracking-wider mb-1.5">Days Completed</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-[#253243] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#D9B777] to-[#C6A87C]" style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <span className="text-[8.5px] font-bold text-[#C6A87C]">{progressPercentage}%</span>
                  </div>
                </div>
                
                <div className="flex-1 px-3 border-l border-[#26313E] flex items-center gap-2">
                  <FiBookOpen size={18} className="flex-shrink-0 text-[#C6A87C]" strokeWidth={1.7} />
                  <div>
                    <p className="text-[11px] font-bold leading-tight text-white">Genesis – Revelation</p>
                    <p className="text-[7px] text-gray-400 uppercase tracking-wide">Entire Bible Journey</p>
                  </div>
                </div>

                <div className="pl-3 border-l border-[#26313E] flex flex-col items-center justify-center text-center">
                  <FiMap size={16} className="text-[#C6A87C] mb-0.5" strokeWidth={1.5} />
                  <p className="text-[6px] text-gray-400 uppercase tracking-widest font-bold leading-tight">A Greater<br/>Story Awaits</p>
                </div>
              </div>
            </div>

            <div className="px-4 relative pb-6">
              <div className="flex flex-col">
                {JOURNEY_ERAS.map((era, index) => {
                  const isCompleted = currentJourneyDay.day > era.endDay;
                  const isCurrentEra = currentJourneyDay.day >= era.startDay && currentJourneyDay.day <= era.endDay;
                  const isFuture = currentJourneyDay.day < era.startDay;
                  const isExpanded = expandedEraId === era.id;
                  const isLast = index === JOURNEY_ERAS.length - 1;
                  const eraStartPlan = CHRONOLOGICAL_PLAN[era.startDay - 1] || CHRONOLOGICAL_PLAN[0];

                  return (
                    <div key={era.id} className="flex relative z-10 w-full">
                      <div className="w-6 flex flex-col items-center flex-shrink-0">
                        <div 
                          onClick={() => {
                            triggerHaptic('light');
                            setExpandedEraId(prev => prev === era.id ? null : era.id);
                          }}
                          className={`w-5 h-5 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-[9px] z-10 transition-all cursor-pointer ${
                            isCurrentEra 
                              ? 'bg-[#C6A87C] text-[#14202E] shadow-sm ring-2 ring-[#12161B] scale-110' 
                              : isCompleted 
                                ? 'bg-[#43A047] text-white' 
                                : 'bg-[#222B35] text-gray-400'
                          }`}
                        >
                          {era.id}
                        </div>
                        
                        {!isLast && isCurrentEra && (
                          <>
                            <div className="w-px h-[48px] bg-[#C6A87C]" />
                            <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-[#C6A87C] bg-[#12161B] z-10 my-0.5 flex-shrink-0" />
                            <div className="w-px flex-1 border-l border-dashed border-[#2B3746]" />
                          </>
                        )}
                        {!isLast && isCompleted && (
                          <div className="w-px flex-1 bg-[#43A047] my-0.5" />
                        )}
                        {!isLast && isFuture && (
                          <div className="w-px flex-1 border-l border-dashed border-[#2B3746] my-0.5" />
                        )}
                      </div>

                      <div className="w-2.5 flex-shrink-0" />

                      <div className="flex-1 pb-4 w-full">
                        <div 
                          onClick={() => {
                            triggerHaptic('light');
                            setExpandedEraId(prev => prev === era.id ? null : era.id);
                          }}
                          className="flex items-center justify-between border-b border-[#222B35]/70 pb-2.5 cursor-pointer select-none active:opacity-75 transition-opacity"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A212B] border border-[#2B3746] flex-shrink-0 shadow-sm">
                              <img src={era.img} alt={era.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className={`text-[7.5px] font-bold tracking-[0.22em] uppercase mb-0.5 ${isCurrentEra ? 'text-[#C6A87C]' : 'text-gray-400'}`}>
                                DAYS {era.startDay}–{era.endDay}
                              </p>
                              <h4 className="font-serif text-[15px] leading-tight font-medium text-white">{era.title}</h4>
                              <p className="text-[9.5px] font-serif italic text-gray-400 leading-tight">{era.subtitle}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <div className="bg-[#43A047] text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <FiCheck size={9} strokeWidth={3} />
                                <span className="text-[7px] font-bold tracking-widest uppercase">COMPLETED</span>
                              </div>
                            )}
                            <FiChevronRight 
                              size={16} 
                              className={`transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-[#C6A87C]' : 'text-gray-500'
                              }`} 
                            />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 pb-1 w-full">
                            {isCurrentEra && (
                              <>
                                <div className="rounded-2xl p-3 shadow-md border mb-3 w-full bg-[#161C24]/90 border-[#26313E]">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-[#2B3746]">
                                        <img src={ABRAHAM_ACTIVE_URL} alt="Active Day" className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex flex-col justify-center min-w-0">
                                        <p className="text-[#C6A87C] text-[7.5px] font-bold tracking-[0.22em] uppercase mb-0.5">DAY {currentJourneyDay.day}</p>
                                        <h4 className="font-serif text-[15px] leading-tight mb-0.5 font-medium truncate text-white">{currentJourneyDay.startBook}</h4>
                                        <p className="text-[9.5px] text-gray-300 mb-0.5 truncate">{currentJourneyDay.title}</p>
                                        <p className="text-[8.5px] text-gray-400 italic font-serif">God provides.</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end flex-shrink-0 pl-1">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleAudio(currentJourneyDay.startBook, currentJourneyDay.startChapter);
                                          }}
                                          className="w-8 h-8 rounded-full bg-[#0D1217] border border-[#2B3746] flex items-center justify-center text-[#C6A87C] shadow-sm cursor-pointer flex-shrink-0 hover:bg-[#1f2835] active:scale-95 transition-all"
                                          title="Play audio narration"
                                        >
                                          {isAudioPlaying && currentAudioTrack?.book === currentJourneyDay.startBook && currentAudioTrack?.chapter === currentJourneyDay.startChapter ? (
                                            <FaPause size={9} />
                                          ) : (
                                            <FaPlay size={8} className="ml-0.5" />
                                          )}
                                        </div>
                                        <button 
                                          onClick={() => {
                                            triggerHaptic('medium');
                                            setCurrentBook(currentJourneyDay.startBook);
                                            setCurrentChapter(currentJourneyDay.startChapter);
                                            setCurrentVerse(1);
                                            setActivePlanDay(currentJourneyDay.day);
                                            setActiveTab('Bible');
                                          }}
                                          className="bg-[#C6A87C] hover:bg-[#BFA074] text-[#14202E] rounded-full flex items-center justify-between px-3 py-1.5 shadow-sm active:scale-95 transition-transform"
                                        >
                                          <span className="text-[10px] font-bold tracking-tight mr-1">Continue Day {currentJourneyDay.day}</span>
                                          <FiChevronRight size={13} className="text-[#14202E]" />
                                        </button>
                                      </div>
                                      <span className="text-[7.5px] text-gray-400 mt-1 mr-2 font-medium">18 min</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-0 text-xs pl-0.5">
                                  {nextDays.map(day => (
                                    <div key={day.day} className="flex items-center justify-between py-2 border-b border-[#222B35]/50">
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-400 text-[9px] w-8">Day {day.day}</span>
                                        <span className="font-semibold text-[11px] text-white">{day.startBook}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-gray-400 text-[8px] uppercase tracking-wider">{day.title}</span>
                                        <FiChevronRight size={12} className="text-gray-500" />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-2.5 rounded-xl p-2.5 flex justify-between items-center border bg-[#161C24]/60 border-[#26313E]">
                                  <div className="flex gap-2 items-center">
                                    <FiMap size={18} className="text-[#C6A87C]" strokeWidth={1.5} />
                                    <div>
                                      <p className="text-[7px] text-[#C6A87C] font-bold uppercase tracking-[0.2em]">UPCOMING MILESTONE</p>
                                      <p className="text-[11px] font-serif leading-tight font-medium text-white">The Twelve Sons</p>
                                      <p className="text-[8.5px] text-gray-400">Genesis 37</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-[8.5px] text-gray-400 italic font-serif">In 3 days</span>
                                    <FiChevronRight size={12} className="text-gray-400" />
                                  </div>
                                </div>
                              </>
                            )}

                            {isCompleted && (
                              <div className="rounded-2xl p-3 shadow-sm border mb-2 bg-[#161C24]/80 border-[#26313E] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 border border-[#2B3746]">
                                    <img src={era.img} alt={era.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="text-[7.5px] text-[#43A047] font-bold tracking-wider uppercase">Completed • Days {era.startDay}–{era.endDay}</span>
                                    <h5 className="font-serif text-[13px] text-white font-medium leading-tight mt-0.5">{era.title}</h5>
                                    <p className="text-[9px] text-gray-400">{eraStartPlan.startBook} {eraStartPlan.startChapter}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    triggerHaptic('medium');
                                    setCurrentBook(eraStartPlan.startBook);
                                    setCurrentChapter(eraStartPlan.startChapter);
                                    setCurrentVerse(1);
                                    setActiveTab('Bible');
                                  }}
                                  className="px-3.5 py-1.5 bg-[#C6A87C] text-[#14202E] text-[10px] rounded-full font-bold active:scale-95 transition-transform"
                                >
                                  Review
                                </button>
                              </div>
                            )}

                            {isFuture && (
                              <div className="rounded-2xl p-3 shadow-sm border mb-2 bg-[#161C24]/50 border-[#26313E] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 opacity-70 border border-[#2B3746]">
                                    <img src={era.img} alt={era.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="text-[7.5px] text-[#C6A87C] font-bold tracking-wider uppercase">Starts on Day {era.startDay}</span>
                                    <h5 className="font-serif text-[13px] text-gray-200 font-medium leading-tight mt-0.5">{era.title}</h5>
                                    <p className="text-[9px] text-gray-400">Coming soon on your journey</p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-serif italic text-gray-400 pr-2">
                                  {era.endDay - era.startDay + 1} Days
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {/* --- VIEW 4: BIBLE READER --- */}
        {activeTab === 'Bible' && (
          <main ref={bibleContainerRef} className={`flex-1 overflow-y-auto pb-32 ${isBibleDark ? 'bg-[#0E1622] text-[#EDEAE4]' : 'bg-[#FBF9F5] text-[#1C2A39]'}`}>
            <div className="relative w-full h-56 overflow-hidden bg-[#0B1017] border-b border-[#222B35]/70">
              <img src="/A Bible-top.png" alt="Scripture" className="w-full h-full object-cover object-center block" />
            </div>

            {isSearchOpen && (
              <div className="px-4 pt-3 pb-1 bg-[#121A24] border-b border-[#222B35] shadow-md transition-all">
                <div className="relative flex items-center">
                  <FiSearch size={14} className="absolute left-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search entire Bible (e.g. faith, light, grace)..."
                    autoFocus
                    className="w-full text-xs font-sans bg-[#1A2533] border border-white/15 text-white rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-[#C6A87C] placeholder:text-gray-400 shadow-inner"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-2.5 text-gray-400 hover:text-white p-1">
                      <FiX size={14} />
                    </button>
                  )}
                </div>

                {searchQuery.trim().length > 0 && (
                  <div className="mt-2.5 mb-2 max-h-[300px] overflow-y-auto rounded-xl bg-[#0F1621] border border-white/15 shadow-2xl divide-y divide-white/10">
                    <div className="px-3.5 py-2 bg-[#0A0F17] flex items-center justify-between text-[11px] font-sans text-gray-300">
                      {isSearching ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin" />
                          Searching entire Bible...
                        </span>
                      ) : (
                        <span>Found {searchResults.length}{searchResults.length === 40 ? '+' : ''} verses</span>
                      )}
                      <span className="text-[10px] text-gray-400">Tap to jump</span>
                    </div>

                    {searchResults.length === 0 && !isSearching ? (
                      <div className="p-4 text-center text-xs font-sans text-gray-400 italic">
                        No scripture verses found containing "{searchQuery}".
                      </div>
                    ) : (
                      searchResults.map((res, i) => (
                        <div
                          key={`${res.book}-${res.chapter}-${res.verse}-${i}`}
                          onClick={() => handleSelectSearchResult(res)}
                          className="p-3 hover:bg-[#1C283A] cursor-pointer transition-colors active:bg-[#23334A]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-sans font-bold text-[#C6A87C]">{res.book} {res.chapter}:{res.verse}</span>
                            <span className="text-[10px] font-sans text-gray-400 uppercase tracking-wider">KJV</span>
                          </div>
                          <p className="text-[12px] font-serif text-gray-200 line-clamp-2 leading-relaxed">{res.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="px-4 pt-3.5 pb-2">
              <div className={`flex justify-between items-center p-1.5 rounded-full border ${isBibleDark ? 'bg-[#152233] border-gray-700/60' : 'bg-white border-[#ECE5D8]'}`}>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { triggerHaptic('light'); setIsMenuOpen(true); }} className="px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1">
                    <span>{currentBook} {currentChapter}:{currentVerse}</span>
                    <FiChevronRight size={12} className="rotate-90 text-gray-400" />
                  </button>

                  <button
                    onClick={() => handleToggleAudio(currentBook, currentChapter)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-full font-medium ${isCurrentChapterAudioActive && isAudioPlaying ? 'bg-[#C6A87C] text-[#14202E] font-bold' : ''}`}
                  >
                    {isCurrentChapterAudioActive && isAudioPlaying ? <FaPause size={10} /> : <FiHeadphones size={13} className="text-[#C6A87C]" />}
                    <span>{isCurrentChapterAudioActive && isAudioPlaying ? 'Playing' : 'Listen'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 pr-1">
                  <button onClick={() => { triggerHaptic('light'); setIsSearchOpen(!isSearchOpen); }} className="p-2 rounded-full text-gray-400 hover:text-white">
                    <FiSearch size={16} />
                  </button>
                  <button onClick={() => { triggerHaptic('light'); setIsSettingsOpen(true); }} className="p-2 rounded-full text-gray-400 hover:text-white">
                    <FiSettings size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 pt-3 pb-4 space-y-3.5">
              {verses.map((rawItem, index) => {
                const text = typeof rawItem === 'string' ? rawItem : (rawItem?.text || rawItem?.verseText || '');
                const verseNum = typeof rawItem === 'object' && rawItem?.verse ? rawItem.verse : index + 1;
                const isSelected = verseNum === currentVerse;
                const highlightKey = `${currentBook}-${currentChapter}-${verseNum}`;
                const hasHighlight = Boolean(verseHighlights[highlightKey]);

                return (
                  <div
                    key={verseNum}
                    id={`verse-${verseNum}`}
                    onClick={() => {
                      triggerHaptic('light');
                      setCurrentVerse(verseNum);
                      setActiveVerseDrawer({ verseNum, text });
                    }}
                    className={`transition-all duration-200 rounded-xl p-2.5 -mx-2.5 cursor-pointer ${
                      isSelected
                        ? isBibleDark
                          ? 'bg-[#1C2A39] ring-1 ring-[#C6A87C]/60 text-amber-100 shadow-md scale-[1.01]'
                          : 'bg-[#F4ECE1] ring-1 ring-[#C6A87C]/50 text-[#14202E] shadow-sm scale-[1.01]'
                        : hasHighlight
                          ? 'bg-[#C6A87C]/20 border-l-4 border-[#C6A87C] pl-2'
                          : isBibleDark
                            ? 'text-gray-300 hover:bg-white/5'
                            : 'text-[#2C3E50] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <p className={`${textSizes[textSizeIndex]} ${fontFamily} leading-[1.75]`}>
                      <span className="font-sans font-bold text-[0.82em] text-[#C6A87C] mr-2.5 inline-block w-4 select-none">
                        {verseNum}
                      </span>
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* --- BOTTOM CHAPTER NAVIGATION FOOTER --- */}
            <div className="px-5 pt-4 pb-12 flex items-center justify-between gap-3 border-t border-black/5 dark:border-white/5">
              <button
                onClick={handlePrevChapter}
                disabled={!hasPrev}
                className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-all ${
                  hasPrev
                    ? isBibleDark
                      ? 'bg-[#152233] text-gray-200 border border-gray-700/60 active:scale-95'
                      : 'bg-white text-[#1C2A39] border border-[#ECE5D8] shadow-sm active:scale-95'
                    : 'opacity-30 cursor-not-allowed bg-transparent border border-white/5 text-gray-500'
                }`}
              >
                <FiChevronLeft size={16} />
                <span>Previous Chapter</span>
              </button>

              <button
                onClick={handleNextChapter}
                disabled={!hasNext && !isPlanEnd}
                className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-wide transition-all shadow-md active:scale-95 ${
                  isPlanEnd
                    ? 'bg-[#C6A87C] text-[#14202E]'
                    : !hasNext
                      ? 'opacity-30 cursor-not-allowed bg-gray-500 text-gray-300'
                      : 'bg-[#C6A87C] text-[#14202E]'
                }`}
              >
                <span>{isPlanEnd ? 'Complete Day' : 'Next Chapter'}</span>
                <FiChevronRight size={16} />
              </button>
            </div>
          </main>
        )}

        {/* --- VIEW 5: JOURNAL --- */}
        {activeTab === 'Journal' && (
          <main className="flex-1 overflow-y-auto pb-32 bg-[#FBF9F5] text-[#1C2A39]">
            <div className="bg-[#0f1724] text-white pt-10 pb-5 px-5 relative overflow-hidden rounded-b-[2rem] shadow-md z-10">
              <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                <img src={HOME_BG_URL} alt="Header Background" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#0f1724]/85 to-[#0f1724]/10" />
              <div className="relative z-10 flex justify-between items-center mb-6">
                <div className="w-5" />
                <div className="flex flex-col items-center">
                  <span className="font-['Times_New_Roman',serif] text-base tracking-wide flex items-center gap-1.5 text-white">
                    <span className="text-lg">✝</span> God's Purpose System
                  </span>
                  <span className="text-[0.45rem] tracking-widest text-gray-300 uppercase mt-0.5">Led by the Spirit into all the truth.</span>
                </div>
                <div className="flex items-center gap-2">
                  {!userProfile?.email && (
                    <button onClick={() => openAuthModal('signin')} className="text-[9.5px] text-[#C6A87C] border border-[#C6A87C]/40 bg-[#C6A87C]/10 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Sign In
                    </button>
                  )}
                  <FiBell size={18} className="text-gray-300" />
                </div>
              </div>
              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-serif text-white mb-0.5">Journal</h1>
                  <p className="text-[9px] tracking-widest text-gray-300 uppercase">A Safe Place to Meet with God</p>
                </div>
                <div className="text-right max-w-[110px]">
                  <p className="text-[10px] italic text-gray-200 mb-0.5 leading-tight">"Commit your way to the LORD..."</p>
                  <p className="text-[8px] text-[#e5cd9e] uppercase tracking-wider">Psalm 37:5</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              <div className="rounded-2xl p-4 shadow-sm border bg-white border-[#ECE5D8]">
                <p className="text-[9px] uppercase tracking-widest text-[#8C8071] font-bold mb-1">Today's Reflection</p>
                <h2 className="text-lg font-serif mb-2 text-[#14202E]">What did God show you today?</h2>
                <textarea 
                  value={journalInput}
                  onChange={(e) => setJournalInput(e.target.value)}
                  className="w-full rounded-xl p-3 h-28 text-xs resize-none outline-none border border-[#ECE5D8] focus:border-[#CBA365] bg-[#FAF8F5] text-[#14202E] leading-relaxed transition-all placeholder:text-gray-400" 
                  placeholder="Write your prayers, reflections, and thoughts here..." 
                />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <button 
                    onClick={handleSaveJournal}
                    disabled={!journalInput.trim()}
                    className={`flex-1 py-2.5 rounded-full font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                      journalInput.trim() 
                        ? 'bg-gradient-to-r from-[#e5cd9e] to-[#cba365] text-[#14202E] active:scale-95 cursor-pointer' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {journalSavedMsg ? (
                      <>
                        <FiCheck size={14} className="text-emerald-700" />
                        <span className="text-emerald-800">Saved Successfully!</span>
                      </>
                    ) : (
                      <span>Save Journal Entry</span>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C8071] mb-2.5 px-1">Past Reflections ({journalEntries.length})</h3>
                {journalEntries.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-white border border-[#ECE5D8] text-gray-400 text-xs">
                    <p className="italic font-serif">No journal entries saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {journalEntries.map((entry) => (
                      <div key={entry.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#ECE5D8]">
                        <div className="flex justify-between items-center mb-1.5 border-b border-[#ECE5D8]/50 pb-1.5">
                          <span className="text-[9.5px] font-bold text-[#CBA365] tracking-wider uppercase">{entry.date} • {entry.time}</span>
                          <button onClick={() => handleDeleteJournal(entry.id)} className="text-gray-300 hover:text-red-500 p-1">
                            <FiX size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-[#2C3E50] leading-relaxed whitespace-pre-wrap font-serif">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        )}

        {/* --- VIEW 6: PROFILE --- */}
        {activeTab === 'Profile' && (
          <main className="flex-1 overflow-y-auto pb-32 bg-[#FBF9F5] text-[#1C2A39]">
            <div className="relative w-full h-56 overflow-hidden bg-[#FAF7F2] border-b border-[#ECE5D8]">
              <img src="/A Profile-top.png" alt="Your Journey" className="w-full h-full object-cover object-center block" />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FBF9F5] to-transparent pointer-events-none" />
            </div>
            
            <div className="px-4 py-4 space-y-4">
              <div className="rounded-2xl p-4 shadow-sm border bg-white border-[#ECE5D8] flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#CBA365] shadow-sm flex-shrink-0">
                    <img src={userProfile?.avatarUrl || AVATAR_PRESETS[0]} alt="User Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#14202E] leading-tight">{userProfile?.name || 'Seeker'}</h2>
                    <p className="text-[10px] text-[#8C8071] font-serif italic mt-0.5">"{userProfile?.purposeMotto || 'Led by the Spirit into all the truth.'}"</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#FAF7F2] border border-[#E8DFD0] rounded-full text-[8px] font-bold tracking-widest text-[#CBA365] uppercase">
                      {userProfile?.lifeVerse || 'Jeremiah 29:11'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setEditForm({ ...userProfile, email: userProfile?.email || '', password: '' });
                    setIsEditProfileOpen(true);
                  }}
                  className="p-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#ECE5D8] text-[#14202E]"
                >
                  <FiEdit2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3 rounded-2xl border border-[#ECE5D8] text-center shadow-sm">
                  <p className="text-base font-bold text-[#14202E]">{completedDays.length}</p>
                  <p className="text-[8px] uppercase tracking-wider text-[#8C8071] font-semibold mt-0.5">Days Read</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#ECE5D8] text-center shadow-sm">
                  <p className="text-base font-bold text-[#CBA365]">{progressPercentage}%</p>
                  <p className="text-[8px] uppercase tracking-wider text-[#8C8071] font-semibold mt-0.5">Completed</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#ECE5D8] text-center shadow-sm">
                  <p className="text-base font-bold text-[#14202E]">{journalEntries.length}</p>
                  <p className="text-[8px] uppercase tracking-wider text-[#8C8071] font-semibold mt-0.5">Reflections</p>
                </div>
              </div>

              <div className="rounded-2xl p-4 shadow-sm border bg-white border-[#ECE5D8] space-y-3">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[#CBA365] font-bold">Cloud Protection</p>
                  <h4 className="text-sm font-serif font-bold text-[#14202E]">Survive Cache Clears</h4>
                  <p className="text-[10px] text-[#8C8071]">Link an email so your profile is never lost.</p>
                </div>

                <button
                  onClick={() => openAuthModal('signup')}
                  className="w-full py-2 bg-[#14202E] text-white rounded-xl text-xs font-semibold hover:bg-[#1E2E40]"
                >
                  Link Email & Protect Data
                </button>

                <button
                  onClick={() => openAuthModal('signin')}
                  className="w-full py-1.5 bg-[#FAF7F2] text-[#8C8071] border border-[#ECE5D8] rounded-xl text-[10px] font-semibold"
                >
                  Already linked? Restore Account
                </button>
              </div>
            </div>
          </main>
        )}

        {/* --- FLOATING AUDIO PILL PLAYER --- */}
        {currentAudioTrack && (
          <div className="absolute bottom-[68px] left-3 right-3 z-40 bg-[#161F2B]/95 backdrop-blur-md border border-[#2D3C4E]/80 text-white px-3.5 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all select-none">
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
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setCurrentBook(currentAudioTrack.book);
                  setCurrentChapter(currentAudioTrack.chapter);
                  setCurrentVerse(1);
                  setActiveTab('Bible');
                }}
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

              <div className="flex items-center gap-2">
                <button onClick={handleCycleSleepTimer} title="Sleep Timer" className={`p-1 ${sleepTimerOption ? 'text-[#C6A87C]' : 'text-gray-400 hover:text-white'}`}>
                  <FiClock size={13} />
                </button>
                <button onClick={handleManualCacheTrack} title="Download chapter" className={`p-1 ${isTrackCached ? 'text-[#C6A87C]' : 'text-gray-400 hover:text-white'}`}>
                  <FiDownloadCloud size={13} />
                </button>
                <button onClick={() => handleAudioSkip(-15)} title="Rewind 15s" className="p-1 text-gray-400 hover:text-white">
                  <FiRotateCcw size={13} />
                </button>
                <button
                  onClick={() => handleToggleAudio(currentAudioTrack.book, currentAudioTrack.chapter)}
                  disabled={isAudioLoading}
                  className="w-7 h-7 rounded-full bg-[#C6A87C] text-[#14202E] flex items-center justify-center font-bold shadow-md active:scale-90"
                >
                  {isAudioLoading ? <FaSpinner size={10} className="animate-spin text-[#14202E]" /> : isAudioPlaying ? <FaPause size={9} /> : <FaPlay size={9} className="ml-0.5" />}
                </button>
                <button onClick={() => handleAudioSkip(15)} title="Forward 15s" className="p-1 text-gray-400 hover:text-white">
                  <FiRotateCw size={13} />
                </button>
                <button 
                  onClick={handleCycleAudioSpeed} 
                  className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-200"
                  title="Playback Speed"
                >
                  {audioPlaybackRate}x
                </button>
                <button onClick={handleCloseAudio} title="Close player" className="p-1 text-gray-400 hover:text-red-400">
                  <FiX size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- GLOBAL BOTTOM NAVIGATION --- */}
        <nav className="absolute bottom-0 w-full flex justify-around items-center pb-6 pt-3 bg-[#0B1521] text-gray-400 text-xs z-30 rounded-t-3xl shadow-[0_-6px_25px_rgba(0,0,0,0.4)] pointer-events-auto">
          {[
            { id: 'Home', icon: FiHome, label: 'Today' },
            { id: 'Bible', icon: FiBookOpen, label: 'Bible' },
            { id: 'Plan', icon: FiList, label: 'Plan' },
            { id: 'Journey', icon: FiMap, label: 'Journey' },
            { id: 'Profile', icon: FiUser, label: 'Profile' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id);
                }} 
                className={`relative flex flex-col items-center justify-center p-1.5 border-none outline-none focus:outline-none focus:ring-0 bg-transparent transition-all ${
                  isActive ? 'text-[#C6A87C]' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon size={20} strokeWidth={isActive ? 2.3 : 1.7} />
                <span className={`text-[9px] mt-0.5 ${isActive ? 'font-bold text-[#C6A87C]' : 'font-normal'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-[#C6A87C] rounded-full absolute -bottom-1" />
                )}
              </button>
            );
          })}
        </nav>

        {/* --- VERSE ACTION DRAWER --- */}
        {activeVerseDrawer && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px]">
            <div className="bg-[#18212D] text-white w-full rounded-t-[2.2rem] p-5 border-t border-[#2C3B4E] shadow-2xl space-y-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-[11px] font-sans uppercase tracking-wider font-bold text-[#C6A87C]">
                  {currentBook} {currentChapter}:{activeVerseDrawer.verseNum}
                </span>
                <button onClick={() => setActiveVerseDrawer(null)} className="text-gray-400 hover:text-white p-1">
                  <FiX size={17} />
                </button>
              </div>

              <blockquote className="font-serif text-[13px] italic text-gray-200 line-clamp-3 leading-relaxed">
                "{activeVerseDrawer.text}"
              </blockquote>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    const seekTime = getVerseSeekTime(activeVerseDrawer.verseNum, verses, audioDuration || 100);
                    handleToggleAudio(currentBook, currentChapter);
                    setTimeout(() => handleAudioSeek(seekTime), 300);
                    setActiveVerseDrawer(null);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-center"
                >
                  <FaPlay size={12} className="text-[#C6A87C] mb-1.5" />
                  <span className="text-[9.5px] font-medium text-gray-300">Play Here</span>
                </button>

                <button
                  onClick={() => handleToggleHighlight(currentBook, currentChapter, activeVerseDrawer.verseNum)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-center"
                >
                  <FiBookmark size={14} className="text-[#C6A87C] mb-1.5" />
                  <span className="text-[9.5px] font-medium text-gray-300">Highlight</span>
                </button>

                <button
                  onClick={() => {
                    handleCopyVerse(activeVerseDrawer.text, `${currentBook} ${currentChapter}:${activeVerseDrawer.verseNum}`);
                    setActiveVerseDrawer(null);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-center"
                >
                  <FiShare2 size={14} className="text-[#C6A87C] mb-1.5" />
                  <span className="text-[9.5px] font-medium text-gray-300">Share</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setJournalInput(`"${activeVerseDrawer.text}" — ${currentBook} ${currentChapter}:${activeVerseDrawer.verseNum}\n\n`);
                    setActiveVerseDrawer(null);
                    setActiveTab('Journal');
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-center"
                >
                  <FiEdit3 size={14} className="text-[#C6A87C] mb-1.5" />
                  <span className="text-[9.5px] font-medium text-gray-300">Reflect</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- AUTH MODAL --- */}
        {isAuthModalOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm">
            <div className="bg-[#161C24] text-white rounded-t-[2.2rem] p-6 border-t border-[#26313E] shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex gap-4">
                  <button
                    onClick={() => { triggerHaptic('light'); setAuthMode('signin'); setAuthError(''); }}
                    className={`text-sm font-sans font-bold pb-1 ${authMode === 'signin' ? 'text-[#C6A87C] border-b-2 border-[#C6A87C]' : 'text-gray-400'}`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { triggerHaptic('light'); setAuthMode('signup'); setAuthError(''); }}
                    className={`text-sm font-sans font-bold pb-1 ${authMode === 'signup' ? 'text-[#C6A87C] border-b-2 border-[#C6A87C]' : 'text-gray-400'}`}
                  >
                    Create Account
                  </button>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <FiX size={18} />
                </button>
              </div>

              {authError && (
                <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg p-2.5">
                  {authError}
                </p>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="e.g. Lisa"
                      className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#0D1217] text-white outline-none focus:border-[#C6A87C]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#0D1217] text-white outline-none focus:border-[#C6A87C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#0D1217] text-white outline-none focus:border-[#C6A87C]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 mt-2 bg-[#C6A87C] text-[#14202E] font-bold text-xs rounded-xl shadow-md"
                >
                  {authLoading ? 'Connecting...' : authMode === 'signin' ? 'Sign In & Restore' : 'Create & Protect Progress'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- BIBLE CHAPTER PICKER MODAL --- */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1C2230] text-white w-full h-[78%] rounded-t-[2.2rem] flex flex-col shadow-2xl border-t border-gray-700/60 overflow-hidden">
              <div className="pt-3 pb-2 px-6 border-b border-gray-800 flex justify-between items-center">
                <div className="grid grid-cols-3 w-full text-center pr-6">
                  <span className="text-[#C6A87C] font-bold text-xs tracking-wider">Book</span>
                  <span className="text-[#C6A87C] font-bold text-xs tracking-wider">Chapter</span>
                  <span className="text-[#C6A87C] font-bold text-xs tracking-wider">Verse</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <FiX size={16} />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-3 divide-x divide-gray-800/80 overflow-hidden py-2">
                <div className="overflow-y-auto px-2 py-4 space-y-1 text-center scrollbar-none">
                  {booksList.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => {
                        triggerHaptic('light');
                        setCurrentBook(b.name);
                        setCurrentChapter(1);
                        setCurrentVerse(1);
                      }}
                      className={`w-full py-1.5 px-2 rounded-full text-xs font-medium ${b.name === currentBook ? 'bg-[#C6A87C] text-[#14202E] font-bold shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>

                <div className="overflow-y-auto px-2 py-4 space-y-1 text-center scrollbar-none">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => {
                        triggerHaptic('light');
                        setCurrentChapter(ch);
                        setCurrentVerse(1);
                      }}
                      className={`w-full py-1.5 rounded-full text-xs font-medium ${ch === currentChapter ? 'bg-[#C6A87C] text-[#14202E] font-bold shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                <div className="overflow-y-auto px-2 py-4 space-y-1 text-center scrollbar-none">
                  {Array.from({ length: totalVerses }, (_, i) => i + 1).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        triggerHaptic('light');
                        setCurrentVerse(v);
                        setIsMenuOpen(false);
                        setTimeout(() => {
                          const el = document.getElementById(`verse-${v}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }}
                      className={`w-full py-1.5 rounded-full text-xs font-medium ${v === currentVerse ? 'bg-[#C6A87C] text-[#14202E] font-bold shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 border-t border-gray-800 bg-[#171C28]">
                <button
                  onClick={() => { triggerHaptic('medium'); setIsMenuOpen(false); }}
                  className="w-full py-2.5 bg-[#C6A87C] text-[#14202E] font-bold text-xs rounded-full shadow-md"
                >
                  Go to {currentBook} {currentChapter}:{currentVerse}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS MODAL --- */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
            <div className="w-full rounded-t-[2rem] p-6 shadow-2xl border-t bg-[#152233] text-white border-gray-700">
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-700/40">
                <h3 className="font-serif text-lg font-bold">Reader Display Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 text-gray-400 hover:text-white">
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#C6A87C] font-bold mb-2">Reading Theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { triggerHaptic('light'); setBibleTheme('light'); }}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold ${!isBibleDark ? 'bg-[#F2DFB8] text-[#14202E] border-[#DEBE84]' : 'bg-[#0E1622] text-gray-400 border-gray-700'}`}
                    >
                      <FiSun size={16} />
                      <span>Light Mode</span>
                    </button>
                    <button
                      onClick={() => { triggerHaptic('light'); setBibleTheme('dark'); }}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold ${isBibleDark ? 'bg-[#C6A87C] text-[#14202E] border-[#C6A87C]' : 'bg-[#0E1622] text-gray-400 border-gray-700'}`}
                    >
                      <FiMoon size={16} />
                      <span>Dark Mode</span>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[#C6A87C] font-bold mb-2">Scripture Font Size</p>
                  <div className="flex items-center gap-2">
                    {['Small', 'Normal', 'Large', 'Extra'].map((size, idx) => (
                      <button
                        key={size}
                        onClick={() => { triggerHaptic('light'); setTextSizeIndex(idx); }}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium ${textSizeIndex === idx ? 'bg-[#C6A87C] text-[#14202E] border-[#C6A87C] font-bold' : 'bg-[#0E1622] text-gray-400 border-gray-700'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { triggerHaptic('light'); setIsSettingsOpen(false); }}
                className="w-full py-2.5 bg-[#C6A87C] text-[#14202E] text-xs font-bold rounded-full uppercase tracking-wider shadow-md"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}