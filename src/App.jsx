import React, { useState, useEffect, useRef, Component } from 'react';
import { db } from './db';
import { RAW_PLAN, PLAN_IMAGES } from './biblePlan';
import { supabase, getOrCreateUserSession, linkEmailToAccount, restoreAccountWithEmail } from './supabase';
import { 
  FiSearch, FiSettings, FiBookmark, FiHome, FiBookOpen, 
  FiList, FiMoreHorizontal, FiX, FiRefreshCw, FiChevronLeft, 
  FiShare, FiHeart, FiCheck, FiBell, FiMenu, FiMap, FiEdit2, 
  FiUser, FiChevronRight, FiClock, FiHeadphones, FiFileText,
  FiSun, FiMoon
} from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';

// --- ERROR BOUNDARY ---
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

// --- FULLSCREEN COVER SCREEN WITH 'BEGIN THE JOURNEY' BUTTON ---
function SplashScreen({ isFading, onBegin }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#D6C2A5] transition-opacity duration-700 ease-out select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <img
        src="/A splash.png"
        alt="God's Purpose System - There is a way home from here."
        className="absolute inset-0 w-full h-full object-cover object-center max-w-[430px] mx-auto pointer-events-none"
      />

      <div className="relative z-10 w-full" />

      <div className="relative z-10 w-full max-w-[430px] px-8 pb-14">
        <button
          onClick={onBegin}
          className="w-full py-3.5 px-6 rounded-full bg-black/25 hover:bg-black/40 active:scale-95 backdrop-blur-sm border border-white/80 text-white font-serif text-[15px] tracking-[0.15em] uppercase font-medium shadow-lg transition-all duration-200"
        >
          Begin the Journey
        </button>
      </div>
    </div>
  );
}

const HOME_BG_URL = "/home-bg-1.png";
const JOURNEY_BG_URL = "/Journeyheader.png";
const ABRAHAM_ACTIVE_URL = "/Patriarchs.png";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=200&fit=crop&crop=faces,center",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&h=200&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop&crop=center"
];

const SUGGESTED_VERSES = [
  "Jeremiah 29:11",
  "Proverbs 3:5-6",
  "Isaiah 43:1",
  "Philippians 4:13"
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

// --- FEATURED DIRECTIONS INLINED ---
const FEATURED_DIRECTIONS = [
  {
    id: 'surrender',
    title: 'Surrender',
    image: '/App%20Jesus.png',
    description: `Jesus, washing His disciples' feet, came to Peter. When He went to wash Peter's feet, Peter protested, "No—you will never wash my feet." It was as though Peter was saying, "You are the Lord. I should be the one washing Yours."

As humble as that sounds, Jesus replies to Peter that if he does not allow Him to wash his feet, he has no part with Him. We can sit down and wash Jesus' feet a thousand times a day, but at the end of the day, all that can be said is, "Look what I've done."

The question is this: Have we surrendered to grace? Have we let Jesus wash our feet? Then—all that can be said at the end of the day is, "Look what Jesus has done."`
  },
  {
    id: 'happiness',
    title: 'Happiness',
    image: '/App happiness.jpg',
    description: `The path of happiness and joy is
to see the glass half full not half empty.
To think of what we do have
and not what we don't have.
To look at what we are gaining
not what we are loosing.
To focus on loving
instead of being loved.`
  },
  {
    id: 'followme',
    title: 'Follow Me',
    image: '/App footprints.jpg',
    description: `Jesus and Peter walked together one day—
Not on the water this time, but on the beach.
Jesus was telling Peter the things he would have to endure in the future. Peter looked around and asked about another disciple named John. Jesus replied, "What is that to you? You follow me."

You may think to yourself, 'There are others who can do things better than I.' Now hear Him say to you, "What is that to you, you follow me."

You may think, 'There are already pictures painted, songs sung, books written, why should I?' But again, hear Him say, "What is that to you? You follow me." People say and do things that hurt sometimes. But when you lean in close you can hear Him whisper,
"What is that to you, you follow me."`
  },
  {
    id: 'rest',
    title: 'Rest',
    image: '/AAA4.jpeg',
    description: `The heart beats day and night year after year. The secret to its longevity? It doesn't beat until it gets to rest; it is at rest until it beats.
In trusting Jesus, instead of working towards something, we are able to work from something. Our place of rest in him. He says come unto me, and I will give you rest.`
  },
  {
    id: 'separate',
    title: 'Separate',
    image: '/AAA5.jpg',
    description: `She sat there on the couch—an older couch with one long cushion that stretched from one arm to the other.
With her glass of tea in hand, her husband suddenly sat down hard beside her. The ice was cold as the tea spilled into her lap and onto the couch.
Several weeks later, she sat once again on the couch, enjoying her glass of tea. And again— her husband suddenly sat down hard beside her.
Only this time, her tea remained in its place, her clothes were dry, and the couch unstained. The difference?
They had purchased a new couch. Unlike the old one, which had one long cushion, this new one had three separate cushions.
As she sat there on that cushion… she was unmoved.

Father, help us stay separate from the world—unmoved. To be one with You, so that we will be moved only by You.`
  },
  {
    id: 'bestill',
    title: 'Be Still',
    image: '/AAA6.jpg',
    description: `The Bible tells us, "Be still and know that I am God."

Have you ever left home and wondered if you remembered to turn off the stove eye, or if you unplugged the iron. There is an unrest until you stop and take time to call home or go back to make sure that it is off. Once you know it is off there is a rest.

Many of us go throughout our days and even our lives with an unrest, being anxious about many things. God invites us to stop, be still and take time to know.`
  },
  {
    id: 'power',
    title: 'Power',
    image: '/AAA7.jpg',
    description: `The apostle Paul prayed and prayed and prayed that God would take something hurtful out of his life. Each time, God answered him by saying, my grace is sufficient, in your weakness my strength is made perfect.

It's as if God is saying, I may never answer your prayer to be made strong, but in your weakness, I will be your strength. We don't have to struggle to be strong enough, because he is our strength. We don't have to struggle to be good enough, because he is our righteousness. He is everything we are not. When we are short he is that much longer, when we are weak he is that much stronger.

It's not in trying, but in trusting. It's not in running but in resting. It's not in wandering, but in waiting that we find the strength of the Lord.`
  },
  {
    id: 'purpose',
    title: 'Purpose',
    image: '/AAA8.jpeg',
    description: `The same God who put the stars, the sun and the moon in their place thought it was a good idea to put you here too. The same way the sun has it's purpose, you have a reason for being here. When the end comes, and we look back at our life, I'm sure we will realize that our life mattered more than we thought it did.

God had something He wanted to share with everyone, so He took it and put it inside of you. So many people die with the song, the poem, a book or simply a life well lived still inside them.`
  },
  {
    id: 'peace',
    title: 'Peace',
    image: '/AAA9.jpg',
    description: `There is a peace that goes all the way down and hits bottom. The search is over. No need to hurry to get to a certain place. No need to wait for anything else to happen. Completely at rest because we know God loves us and He is in control.`
  },
  {
    id: 'truth',
    title: 'Truth',
    image: '/AAA10.jpg',
    description: `If we don't want to be crushed by the truth, agree with it, flow with it, and roll with it. It is sure and unchanging.

If a child, on his math school work answers 2+2=5, his teacher will put an x on the answer because it isn't true.

If the child doesn't agree with the truth and later tries to build a house with the idea that 2+2=5, his house will be a shamble.

Agree with the truth. There is good success.`
  },
  {
    id: 'wisdom',
    title: 'Wisdom',
    image: '/AAA11.jpeg',
    description: `There are but 26 letters in the alphabet, but in their arrangement, make up the entire English dictionary.

How are the laws that are constant and unchangeable. Laws set up by the Creator that govern all things. Even the Earth, in the middle of immense space, is kept from chaotic movement.

The law- a house divided against itself cannot stand can be seen throughout creation in everyday life. Cleaning house while the kids are still growing and shoveling snow while it is still snowing. Trying to raise a window with one hand while pressing down on it with the other.

This truth can be seen in many varied situations, just as an A can be seen in many different words. Arranged to create sentences, paragraphs, and stories.

Wisdom recognizes these truths, laws, and writes a story of a life well lived.

"Everyone who hears my words and obeys them is like a wise man who built his house on a rock."
Jesus`
  },
  {
    id: 'newcreation',
    title: 'New Creation',
    image: '/AAA12.jpg',
    description: `Her son had been struck by lightning, what are the chances, not a cloud in the sky. The doctors had told her there was no way he could live. How would she face tomorrow without him there?

After all the hopeless tears and sleepless nights...he lived.

Her reply, the echo of a heart broken and revived again.
"You know," she said, "I used to get so upset when he would come in and get mud on clean floor. Now… I'm just thankful there is someone there to get mud on my floor."

Father, Isn't it true we are the ones.
When we think we are going to lose everything we settle for anything?
But isn't this the new creature in Christ? We are crucified...yet living. Thankful.`
  },
  {
    id: 'thankful',
    title: 'Thankful',
    image: '/AAA13.jpg',
    description: `It was a cold winter night as she drove home from work. She had driven half way home and then remembered to turn on the heater.
As she reaches to turn it on, she began to think of all the people who have no heat—little children with no blankets, living in cardboard boxes trying to stay warm.
She decided not to turn it on. How could she turn the heat on and be warm when others were so cold? It is then she hears, in her heart: " Just say thank you... and turn it on."
Being thankful, the blessing became pure to her. Father, create in us a pure heart.`
  },
  {
    id: 'letgo',
    title: 'Let Go',
    image: '/AAA14.jpg',
    description: `That little monkey was stuck and he couldn't figure out what he needed to do to get free.

The man, hiding behind a rock, has cut a hole in the coconut and placed a peanut inside, now has a string attached to the other end waiting for the little monkey.

Little one puts his hand inside to get the peanut
and he can't get his hand back out. In all his distress he can't figure out that because he was holding onto the peanut he couldn't get his hand out of the hole. If he would only let go,
he could be free.

Father, we can afford to let go of things because you have given us yourself.`
  },
  {
    id: 'obedience',
    title: 'Obedience',
    image: '/AAA15.jpg',
    description: `Sitting there at her desk, out of the blue she feels this impression to reach over and move something that is on her desk. She saw no reason to move it. It seemed fine where it was. This little voice persisted. Finally, after thinking "I don't know why I am doing this." She reaches over and moves it to another place. Lo and behold behind it was that thing she had been searching for. The lesson? There is something behind that thing God is telling you to do.`
  },
  {
    id: 'tametongue',
    title: 'Tame Tongue',
    image: '/AAA16.jpg',
    description: `The Bible says that no one can tame the tongue, the one who can is the same as a perfect man.

No one is perfect because they can tame their tongue, but they can tame their tongue because they are perfect. If someone is content in whatever state they are in, there will be no complaint on their lips.`
  },
  {
    id: 'bornagain',
    title: 'Born Again',
    image: '/AAA17.jpeg',
    description: `The most important decision anyone will ever make is the decision to be born again. As a tree branches into the seen and into the unseen, we too have a body and a spirit. We are born with a body, but unless someone is born of the spirit also, the abundant life that was meant for them since the beginning is not there.

The thief on the cross asked Jesus to remember him and Jesus said, you will be with me in paradise. The thief simply believed. Jesus forgives us and gives us a new beginning, changing our heart.

A Guiding Prayer (example)
Father in heaven I believe you sent your son Jesus to pay for my wrongs and I trust him to make me new and to give me a life that never ends with you. Take my life, I'm listening. Guide me until I meet you face to face.`
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
  {
    purpose: "Trust God with something you cannot control.",
    verseText: "WITH GOD\nALL THINGS\nARE POSSIBLE.",
    verseRef: "Matthew 19:26"
  },
  {
    purpose: "Be quick to listen and slow to anger in every conversation today.",
    verseText: "LET EVERY PERSON\nBE QUICK TO HEAR,\nSLOW TO SPEAK.",
    verseRef: "James 1:19"
  },
  {
    purpose: "Speak words of encouragement to someone who needs strength today.",
    verseText: "A WORD FITLY\nSPOKEN IS LIKE\nAPPLES OF GOLD.",
    verseRef: "Proverbs 25:11"
  },
  {
    purpose: "Release anxiety through intentional surrender in prayer this afternoon.",
    verseText: "CAST ALL YOUR\nANXIETIES ON HIM,\nFOR HE CARES.",
    verseRef: "1 Peter 5:7"
  },
  {
    purpose: "Walk intentionally with integrity in all unseen work and responsibilities.",
    verseText: "WHATEVER YOU DO,\nWORK HEARTILY,\nAS FOR THE LORD.",
    verseRef: "Colossians 3:23"
  },
  {
    purpose: "Notice and thank God for three distinct blessings around you today.",
    verseText: "GIVE THANKS IN\nALL CIRCUMSTANCES;\nTHIS IS GOD'S WILL.",
    verseRef: "1 Thessalonians 5:18"
  },
  {
    purpose: "Extend forgiveness freely just as Christ has forgiven you.",
    verseText: "BE KIND TO ONE\nANOTHER, TENDERHEARTED,\nFORGIVING.",
    verseRef: "Ephesians 4:32"
  }
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

  // Featured Directions Modal Selection
  const [selectedDirection, setSelectedDirection] = useState(null);

  // Bible Reader Scroll Ref
  const bibleContainerRef = useRef(null);

  // Bible Reader Theme & Full-Bible Search State
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
    } catch {
      return null;
    }
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
  const [textSizeIndex, setTextSizeIndex] = useState(2);

  const [completedDays, setCompletedDays] = useState(() => {
    try {
      const saved = localStorage.getItem('bible_completed_days');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activePlanDay, setActivePlanDay] = useState(null);

  // Quick Note & Verse Copy Feedback State
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [verseCopied, setVerseCopied] = useState(false);
  const [readDirections, setReadDirections] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_read_directions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Manual begin journey trigger
  const handleBeginJourney = () => {
    setSplashFading(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 700);
  };

  const handleCopyVerse = async (text, ref) => {
    try {
      await navigator.clipboard.writeText(`"${text}" — ${ref}`);
      setVerseCopied(true);
      setTimeout(() => setVerseCopied(false), 2000);
    } catch (e) {
      console.warn("Could not copy text:", e);
    }
  };

  const handleSaveQuickNote = async () => {
    if (!quickNoteText.trim()) return;
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

  // Reset scroll to top when changing chapters or books
  useEffect(() => {
    if (bibleContainerRef.current) {
      bibleContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentBook, currentChapter]);

  useEffect(() => {
    async function syncCloudData() {
      try {
        const user = await getOrCreateUserSession();
        if (!user) return;

        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && !pError && profile.name) {
          const remoteProfile = {
            name: profile.name || 'Friend',
            email: profile.email || '',
            lifeVerse: profile.life_verse || 'Jeremiah 29:11',
            purposeMotto: profile.purpose_motto || 'Led by the Spirit into all the truth.',
            reminderTime: profile.reminder_time || '07:00',
            avatarUrl: profile.avatar_url || AVATAR_PRESETS[0]
          };
          setUserProfile(remoteProfile);
          localStorage.setItem('gps_user_profile', JSON.stringify(remoteProfile));
          setIsEditProfileOpen(false);

          if (profile.completed_days && Array.isArray(profile.completed_days)) {
            setCompletedDays(profile.completed_days);
            localStorage.setItem('bible_completed_days', JSON.stringify(profile.completed_days));
          }
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
        console.warn("Supabase cloud sync note:", err);
      }
    }

    syncCloudData();
  }, []);

  // Debounced full-Bible search
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
        const allBooks = await db.books.toArray();
        const matches = [];

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
                if (matches.length >= 50) break;
              }
            }
            if (matches.length >= 50) break;
          }
          if (matches.length >= 50) break;
        }

        setSearchResults(matches);
      } catch (err) {
        console.error("Bible search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectSearchResult = (result) => {
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

  const handleRestoreAccount = async () => {
    const email = prompt("Enter your registered email:");
    if (!email) return;
    const password = prompt("Create a password to secure your backups (minimum 6 characters):");
    if (!password) return;

    const res = await restoreAccountWithEmail(email, password);
    if (res.success && res.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', res.user.id)
        .maybeSingle();

      if (profile) {
        const restored = {
          name: profile.name || 'Friend',
          email: email,
          lifeVerse: profile.life_verse || 'Jeremiah 29:11',
          purposeMotto: profile.purpose_motto || 'Led by the Spirit into all the truth.',
          reminderTime: profile.reminder_time || '07:00',
          avatarUrl: profile.avatar_url || AVATAR_PRESETS[0]
        };
        localStorage.setItem('gps_user_profile', JSON.stringify(restored));
        setUserProfile(restored);

        if (profile.completed_days) {
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

      setIsEditProfileOpen(false);
      alert("Welcome back! Your journey has been restored.");
      window.location.reload();
    } else {
      alert("Sign in failed: " + (res.error || "Please check your email and password."));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
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

    if (editForm.email && editForm.password) {
      await linkEmailToAccount(editForm.email, editForm.password);
    }

    try {
      const user = await getOrCreateUserSession();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: finalProfile.name,
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
    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    try { localStorage.setItem('gps_journal_entries', JSON.stringify(updated)); } catch (err) {}

    try {
      const user = await getOrCreateUserSession();
      if (user) {
        await supabase.from('journal_entries').delete().eq('id', id);
      }
    } catch (err) {
      console.warn("Cloud delete error:", err);
    }
  };

  const textSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
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
    if (currentChapter < totalChaptersInBook) setCurrentChapter(currentChapter + 1);
    else if (currentBookIndex < booksList.length - 1) {
      setCurrentBook(booksList[currentBookIndex + 1].name);
      setCurrentChapter(1);
    }
    setCurrentVerse(1);
  };

  const handlePrevChapter = () => {
    if (currentChapter > 1) setCurrentChapter(currentChapter - 1);
    else if (currentBookIndex > 0) {
      const prevBook = booksList[currentBookIndex - 1];
      setCurrentBook(prevBook.name);
      setCurrentChapter(prevBook.chapters.length);
    }
    setCurrentVerse(1);
  };

  useEffect(() => {
    let isMounted = true;
    const loadBibleData = async () => {
      try {
        let count = 0;
        try { count = await db.books.count(); } catch (e) { console.warn("Dexie count failed:", e); }

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
            console.warn("Could not load /en_kjv.json:", fetchErr);
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

  const renderHeader = (title, subtitle, verseText, verseRef) => (
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
        <div className="flex items-center gap-3">
          <div className="relative">
            <FiBell size={18} className="text-gray-300" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0f1724]" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-serif text-white mb-0.5">{title}</h1>
          <p className="text-[9px] tracking-widest text-gray-300 uppercase">{subtitle}</p>
        </div>
        <div className="text-right max-w-[110px]">
          <p className="text-[10px] italic text-gray-200 mb-0.5 leading-tight">"{verseText}"</p>
          <p className="text-[8px] text-[#e5cd9e] uppercase tracking-wider">{verseRef}</p>
        </div>
      </div>
    </div>
  );

  // --- UPGRADED TODAY DASHBOARD ---
  const renderHome = () => {
    const savedLocal = localStorage.getItem('gps_user_profile');
    const parsedLocal = savedLocal ? JSON.parse(savedLocal) : null;
    const currentName = userProfile?.name || parsedLocal?.name || '';
    const firstName = currentName && currentName !== 'Friend' ? currentName.split(' ')[0] : '';
    const dynamicGreeting = firstName ? `${getGreeting()}, ${firstName}` : getGreeting();
    const hasProfile = Boolean((userProfile && userProfile.name && userProfile.name !== 'Friend') || (parsedLocal && parsedLocal.name && parsedLocal.name !== 'Friend'));

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

    return (
      <main className="flex-1 overflow-y-auto pb-32 font-sans bg-[#12161B] text-[#EDEAE4] select-none">
        {/* 1. SEAMLESS RESPONSIVE HERO BANNER */}
        <div className="relative w-full aspect-[16/7] min-h-[190px] max-h-[260px] overflow-hidden bg-[#0D1217]">
          <img 
            src="/A%20Home-top.png" 
            alt="Discover the Path God Has Prepared for You"
            className="w-full h-full object-cover object-center block"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12161B] via-[#12161B]/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-[#12161B]/80 backdrop-blur-[2px] pointer-events-none" />
        </div>

        {/* 2. BODY CONTENT */}
        <div className="px-5 -mt-3 relative z-10 space-y-4">
          
          {/* GREETING & DATE HEADER */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11.5px] uppercase font-sans tracking-[0.16em] text-[#C6A87C] font-semibold">
                {getFormattedDate()}
              </p>
              <h1 className="text-[30px] font-serif font-normal text-white tracking-tight leading-tight mt-0.5">
                {dynamicGreeting}
              </h1>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">GPS Daily</span>
            </div>
          </div>

          {/* ONBOARDING CALLOUT */}
          {!hasProfile && (
            <div 
              onClick={() => setIsEditProfileOpen(true)}
              className="bg-[#161C24]/90 border border-[#C6A87C]/30 hover:border-[#C6A87C] p-3 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-md shadow-black/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C6A87C]/20 text-[#C6A87C] flex items-center justify-center flex-shrink-0">
                  <FiHeart size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Set up your Journey Profile</p>
                  <p className="text-[10px] text-gray-400">Anchor your life verse and enable cloud recovery</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#C6A87C] pr-1">Create →</span>
            </div>
          )}

          {/* PRIMARY READING CARD */}
          <div className="bg-[#161C24] border border-white/[0.08] rounded-[24px] p-5 shadow-xl shadow-black/30 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11.5px] uppercase font-bold tracking-wider text-[#C6A87C]">
                Day {currentJourneyDay?.day || 1} of 365
              </span>
              <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-full border border-white/5">
                <span className="text-[#C6A87C]">🔥</span> {completedDays.length} day streak
              </span>
            </div>

            <h2 className="text-[24px] font-serif text-white font-normal leading-snug mb-1.5">
              {displayTitle}
            </h2>

            <div className="flex items-center gap-2 text-[12px] text-gray-400 mb-5">
              <span className="text-[#C6A87C] font-semibold">
                {currentJourneyDay?.startBook} {currentJourneyDay?.startChapter}
                {currentJourneyDay?.endChapter && currentJourneyDay?.endChapter !== currentJourneyDay?.startChapter 
                  ? `–${currentJourneyDay?.endChapter}` 
                  : ''}
              </span>
              <span className="text-gray-600">•</span>
              <span>{estReadingMinutes} min read</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">Chronological</span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-[5px] bg-[#222B35] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#D9B777] to-[#C6A87C] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(progressPercentage, 3)}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-400 font-bold min-w-[28px] text-right font-sans">
                {progressPercentage}%
              </span>
            </div>

            <button
              onClick={() => {
                setActivePlanDay(currentJourneyDay.day);
                setActiveTab('Plan');
              }}
              className="w-full bg-[#C6A87C] hover:brightness-105 active:scale-[0.98] text-[#14202E] font-sans font-bold text-[13.5px] py-3 rounded-[16px] transition-all flex items-center justify-center tracking-tight shadow-md"
            >
              Continue Reading
            </button>
          </div>

          {/* VERSE FOR TODAY (WITH TAP-TO-COPY & SHARE) */}
          <div className="bg-[#161C24] border border-white/[0.08] rounded-[24px] p-5 shadow-xl shadow-black/30 relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase font-bold tracking-wider text-gray-400">
                Verse for today
              </p>
              <button
                onClick={() => handleCopyVerse(todayPurpose?.purpose, todayPurpose?.verseRef)}
                className="text-[11px] font-sans text-[#C6A87C] hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 active:scale-95 transition-all"
                title="Copy verse"
              >
                {verseCopied ? (
                  <>
                    <FiCheck size={11} className="text-[#C6A87C]" />
                    <span className="text-[10px] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <FiShare size={11} />
                    <span className="text-[10px] font-medium">Share</span>
                  </>
                )}
              </button>
            </div>

            <blockquote className="font-serif text-[15.5px] leading-[1.5] text-gray-200 font-normal mb-2.5 italic">
              "{todayPurpose?.purpose || 'With God all things are possible.'}"
            </blockquote>

            <p className="text-[12px] text-[#C6A87C] font-semibold tracking-wide">
              {todayPurpose?.verseRef || 'Matthew 19:26'}
            </p>
          </div>

          {/* NOTES WITH INLINE QUICK-ADD BUTTON */}
          <div className="bg-[#161C24] border border-white/[0.08] rounded-[22px] px-5 py-3.5 flex items-center justify-between shadow-xl shadow-black/30">
            <div 
              onClick={() => setActiveTab('Journal')}
              className="flex-1 cursor-pointer pr-3"
            >
              <p className="text-[14.5px] font-sans font-semibold text-white">Notes & Prayers</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {journalEntries.length === 0 
                  ? 'Record your thoughts for today' 
                  : `${journalEntries.length} reflection${journalEntries.length === 1 ? '' : 's'} recorded`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQuickNoteOpen(true)}
                className="w-8 h-8 rounded-full bg-[#C6A87C]/20 border border-[#C6A87C]/40 text-[#C6A87C] flex items-center justify-center font-bold text-base active:scale-90 transition-transform"
                title="Quick note"
              >
                +
              </button>
              <button 
                onClick={() => setActiveTab('Journal')}
                className="p-1.5 text-gray-500 hover:text-white"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* FEATURED DIRECTIONS SLIDER WITH SNAP SCROLL & BADGES */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-[14.5px] font-sans font-semibold text-white tracking-tight">
                  Featured Directions
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Short devotionals for your day</p>
              </div>
              <span className="text-[11px] font-sans text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
                {readDirections.length}/{FEATURED_DIRECTIONS.length} read
              </span>
            </div>

            {/* SNAP-MANDATORY SLIDER CONTAINER */}
            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none -mx-5 px-5">
              {FEATURED_DIRECTIONS.map((item) => {
                const isRead = readDirections.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDirection(item);
                      markDirectionAsRead(item.id);
                    }}
                    className={`snap-start relative flex-shrink-0 w-[136px] h-[190px] rounded-[20px] overflow-hidden cursor-pointer border transition-all duration-200 shadow-lg group bg-[#161C24] ${
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

                    {/* STATUS PILL */}
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
                      <p className="text-[13px] font-serif font-medium text-white leading-tight">
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
  };

  // --- PLAN VIEW ---
  const renderPlan = () => {
    const selectedDayNumber = activePlanDay || currentJourneyDay?.day || 1;
    const selectedPlan = CHRONOLOGICAL_PLAN.find(p => p.day === selectedDayNumber) || CHRONOLOGICAL_PLAN[0] || DEFAULT_PLAN_ITEM;
    const isCompleted = completedDays.includes(selectedDayNumber);

    let dayWindow;
    if (selectedDayNumber <= 2) {
      dayWindow = [1, 2, 3, 4, 5];
    } else if (selectedDayNumber >= 364) {
      dayWindow = [361, 362, 363, 364, 365];
    } else {
      dayWindow = [-2, -1, 0, 1, 2].map(offset => selectedDayNumber + offset);
    }

    const otLabel = `${selectedPlan.startBook} ${selectedPlan.startChapter}${
      selectedPlan.endBook !== selectedPlan.startBook || selectedPlan.endChapter !== selectedPlan.startChapter
        ? `:${selectedPlan.startChapter || 1} - ${selectedPlan.endBook !== selectedPlan.startBook ? selectedPlan.endBook + ' ' : ''}${selectedPlan.endChapter}`
        : ''
    }`;

    const ntBooks = [
      { book: "Matthew", chs: 28 }, { book: "Mark", chs: 16 }, { book: "Luke", chs: 24 },
      { book: "John", chs: 21 }, { book: "Acts", chs: 28 }, { book: "Romans", chs: 16 },
      { book: "1 Corinthians", chs: 16 }, { book: "2 Corinthians", chs: 13 }, { book: "Galatians", chs: 6 },
      { book: "Ephesians", chs: 6 }, { book: "Philippians", chs: 4 }, { book: "Colossians", chs: 4 },
      { book: "1 Thessalonians", chs: 5 }, { book: "2 Thessalonians", chs: 3 }, { book: "1 Timothy", chs: 6 },
      { book: "2 Timothy", chs: 4 }, { book: "Titus", chs: 3 }, { book: "Philemon", chs: 1 },
      { book: "Hebrews", chs: 13 }, { book: "James", chs: 5 }, { book: "1 Peter", chs: 5 },
      { book: "2 Peter", chs: 3 }, { book: "1 John", chs: 5 }, { book: "2 John", chs: 1 },
      { book: "3 John", chs: 1 }, { book: "Jude", chs: 1 }, { book: "Revelation", chs: 22 }
    ];
    const ntChIndex = (selectedDayNumber - 1) % 260;
    let runningCh = 0;
    let ntLabel = "Acts 1:1-26";
    for (const b of ntBooks) {
      if (ntChIndex < runningCh + b.chs) {
        const ch = (ntChIndex - runningCh) + 1;
        ntLabel = `${b.book} ${ch}`;
        break;
      }
      runningCh += b.chs;
    }

    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    const toggleDayCompletion = () => {
      let updated;
      if (isCompleted) {
        updated = completedDays.filter(day => day !== selectedDayNumber);
      } else {
        updated = [...completedDays, selectedDayNumber];
      }
      setCompletedDays(updated);
      try { localStorage.setItem('bible_completed_days', JSON.stringify(updated)); } catch (err) {}

      getOrCreateUserSession().then(user => {
        if (user) {
          supabase.from('profiles').update({
            completed_days: updated,
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        }
      });
    };

    return (
      <main className="flex-1 overflow-y-auto pb-28 font-sans bg-[#12161B] text-white flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between px-5 pt-8 pb-3 bg-[#0D1217]">
            <button 
              onClick={() => setActiveTab('Home')}
              className="text-gray-400 hover:text-white flex items-center gap-1 text-xs transition-colors"
            >
              <FiChevronLeft size={18} />
              <span>Home</span>
            </button>
            <span className="font-serif text-[14px] tracking-wide text-gray-200">Bible Journal</span>
            <div className="flex items-center gap-3 text-gray-400">
              <FiBell size={16} />
              <span className="text-xs border border-gray-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">i</span>
            </div>
          </div>

          <div className="relative w-full bg-[#12161B] border-b border-[#222B35] overflow-hidden">
            <div className="relative w-full overflow-hidden bg-[#0D1217]">
              <img 
                src="/Reading-top.png" 
                alt="1 Year Chronological Reading Plan - Grow in God's Word" 
                className="w-full h-auto max-h-[270px] object-contain object-top mx-auto"
              />
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#12161B] to-transparent pointer-events-none" />
            </div>

            <div className="bg-[#12161B] px-5 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-white tracking-tight leading-tight">
                  Goal Progress:
                </p>
                <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                  1 for Today
                </p>
              </div>

              <div className="relative w-14 h-14 bg-[#1F2732] rounded-full flex items-center justify-center shadow-lg border border-white/10 flex-shrink-0">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="#2D3845"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="#C6A87C"
                    strokeWidth="3.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute font-sans font-bold text-[12px] text-white">
                  {progressPercentage}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0F1318] border-y border-[#222B35] w-full">
            <div className="grid grid-cols-5 w-full">
              {dayWindow.map((d) => {
                const isSelected = d === selectedDayNumber;
                const isDayDone = completedDays.includes(d);
                const dayPlan = CHRONOLOGICAL_PLAN.find(p => p.day === d);

                return (
                  <div 
                    key={d}
                    onClick={() => setActivePlanDay(d)}
                    className="relative flex flex-col items-center justify-end cursor-pointer border-r border-[#222B35] last:border-r-0 min-h-[64px]"
                  >
                    {isSelected && (
                      <span className="absolute -top-3 bg-[#5C4BD8] text-white text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-t-md font-bold z-10 shadow-sm">
                        Next
                      </span>
                    )}

                    <div className={`w-full h-full text-center py-2 px-1 flex flex-col justify-center items-center transition-all ${
                      isSelected 
                        ? 'bg-[#222B38] border-t-2 border-[#7C6EE6]' 
                        : isDayDone
                          ? 'bg-[#213824] text-[#A6DCA3] border-b-2 border-[#3D6A42]' 
                          : 'bg-transparent text-gray-500 hover:text-gray-300'
                    }`}>
                      <p className={`text-[15px] font-bold leading-tight ${
                        isSelected 
                          ? 'text-white' 
                          : isDayDone 
                            ? 'text-[#B4E5B1]' 
                            : 'text-gray-400'
                      }`}>
                        {d}
                      </p>
                      <p className={`text-[7.5px] truncate w-full mt-0.5 font-medium ${
                        isDayDone && !isSelected 
                          ? 'text-[#7CAE78]' 
                          : 'text-gray-400'
                      }`}>
                        {dayPlan?.startBook?.slice(0, 3)} {dayPlan?.startChapter}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div 
              onClick={toggleDayCompletion}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#161C24]/80 border border-[#26313E] hover:border-[#3A4A5D] cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex-1 pr-3">
                <p className="text-[15px] font-medium text-white tracking-tight">{otLabel}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-normal">
                  {selectedPlan.title && !selectedPlan.title.includes(selectedPlan.startBook) 
                    ? selectedPlan.title 
                    : "Old Testament Reading"}
                </p>
              </div>

              <div className="flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 border ${
                  isCompleted 
                    ? 'bg-[#C6A87C] border-[#C6A87C] shadow-md shadow-amber-900/40' 
                    : 'bg-white border-white'
                }`}>
                  {isCompleted && (
                    <FiCheck size={14} className="text-[#14202E] stroke-[3]" />
                  )}
                </div>
              </div>
            </div>

            <div 
              onClick={toggleDayCompletion}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#161C24]/80 border border-[#26313E] hover:border-[#3A4A5D] cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex-1 pr-3">
                <p className="text-[15px] font-medium text-white tracking-tight">{ntLabel}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-normal">New Testament Reading</p>
              </div>

              <div className="flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 border ${
                  isCompleted 
                    ? 'bg-[#C6A87C] border-[#C6A87C] shadow-md shadow-amber-900/40' 
                    : 'bg-white border-white'
                }`}>
                  {isCompleted && (
                    <FiCheck size={14} className="text-[#14202E] stroke-[3]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <button
            onClick={() => {
              setCurrentBook(selectedPlan.startBook);
              setCurrentChapter(selectedPlan.startChapter);
              setCurrentVerse(1);
              setActivePlanDay(selectedPlan.day);
              setActiveTab('Bible');
            }}
            className="w-full py-2.5 bg-[#C6A87C] hover:bg-[#BFA074] text-[#14202E] font-bold text-[13.5px] rounded-lg shadow-md active:scale-[0.98] transition-all tracking-wide text-center font-sans"
          >
            Read Day {selectedDayNumber}
          </button>
        </div>
      </main>
    );
  };

  // --- BIBLE SCREEN ---
  const renderBible = () => {
    return (
      <main
        ref={bibleContainerRef}
        className={`flex-1 overflow-y-auto pb-28 select-text transition-colors duration-200 ${
          isBibleDark ? 'bg-[#0E1622] text-[#EDEAE4]' : 'bg-[#FBF9F5] text-[#1C2A39]'
        }`}
      >
        {/* HERO BANNER: A Bible-top.png (FULL-BLEED SIDE TO SIDE) */}
        <div className="relative w-full h-56 overflow-hidden bg-[#0B1017] border-b border-[#222B35]/70">
          <img 
            src="/A Bible-top.png" 
            alt="Your word is a lamp to my feet"
            className="w-full h-full object-cover object-center block"
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0E1622]/90 to-transparent pointer-events-none" />
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
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 text-gray-400 hover:text-white p-1"
                >
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
                    <span>
                      Found {searchResults.length}{searchResults.length === 50 ? '+' : ''} verses
                    </span>
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
                        <span className="text-[12px] font-sans font-bold text-[#C6A87C]">
                          {res.book} {res.chapter}:{res.verse}
                        </span>
                        <span className="text-[10px] font-sans text-gray-400 uppercase tracking-wider">
                          KJV
                        </span>
                      </div>
                      <p className="text-[12px] font-serif text-gray-200 line-clamp-2 leading-relaxed">
                        {res.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-3.5 pb-2">
          <div
            className={`flex justify-between items-center p-1.5 rounded-full shadow-sm border transition-colors ${
              isBibleDark ? 'bg-[#152233] border-gray-700/60' : 'bg-white border-[#ECE5D8]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMenuOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full active:scale-95 transition-all ${
                  isBibleDark ? 'bg-[#0E1622] text-[#F3D7A4]' : 'bg-[#FAF8F5] text-[#1C2A39] border border-[#ECE5D8]'
                }`}
              >
                <span>{currentBook} {currentChapter}:{currentVerse}</span>
                <FiChevronRight size={12} className="rotate-90 text-gray-400" />
              </button>

              <button
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  isBibleDark ? 'bg-[#1e2f47] text-gray-200' : 'bg-[#F4EFE6] text-[#1C2A39]'
                }`}
              >
                <FiHeadphones size={13} className="text-[#C6A87C]" />
                <span>Listen</span>
              </button>
            </div>

            <div className="flex items-center gap-1 pr-1">
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (isSearchOpen) {
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }}
                className={`p-2 rounded-full transition-colors active:scale-95 ${
                  isSearchOpen 
                    ? 'text-[#C6A87C] bg-white/10' 
                    : isBibleDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Search Scriptures"
              >
                <FiSearch size={16} />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-full transition-colors active:scale-95 ${
                  isBibleDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Reader Settings"
              >
                <FiSettings size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pt-3 pb-4">
          <div className="mb-4">
            <h2 className={`text-2xl font-serif font-bold ${isBibleDark ? 'text-white' : 'text-[#1C2A39]'}`}>
              {currentBook} {currentChapter}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-[#C6A87C] font-bold mt-0.5">
              {activePlanDay ? `DAY ${activePlanDay} READING` : 'DAY 1 READING'}
            </p>
          </div>

          <div className="space-y-3.5">
            {verses.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-12 text-center font-serif">
                Loading scriptures...
              </p>
            ) : (
              verses.map((rawItem, index) => {
                const text = typeof rawItem === 'string' ? rawItem : (rawItem?.text || rawItem?.verseText || '');
                const verseNum = typeof rawItem === 'object' && rawItem?.verse ? rawItem.verse : index + 1;
                const isSelected = verseNum === currentVerse;

                return (
                  <div
                    key={verseNum}
                    id={`verse-${verseNum}`}
                    onClick={() => setCurrentVerse(verseNum)}
                    className={`transition-all rounded-xl p-2.5 -mx-2.5 cursor-pointer ${
                      isSelected
                        ? isBibleDark
                          ? 'bg-[#1C2A39] shadow-sm ring-1 ring-[#C6A87C]/30 text-amber-100'
                          : 'bg-[#F5EDDC] shadow-sm text-[#14202E]'
                        : isBibleDark
                          ? 'text-gray-300 hover:bg-white/5'
                          : 'text-[#2C3E50] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <p className={`${textSizes[textSizeIndex]} ${fontFamily} leading-[1.75]`}>
                      <span className="font-sans font-bold text-[0.82em] text-[#C6A87C] mr-2.5 select-none inline-block w-4">
                        {verseNum}
                      </span>
                      {text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div
            className={`flex justify-between items-center mt-10 pt-4 border-t ${
              isBibleDark ? 'border-gray-800' : 'border-[#ECE5D8]'
            }`}
          >
            {hasPrev ? (
              <button
                onClick={handlePrevChapter}
                className="flex items-center gap-1 text-gray-400 hover:text-white text-xs font-semibold active:scale-95 transition-all"
              >
                <FiChevronLeft size={15} />
                <span>Previous</span>
              </button>
            ) : <div />}

            {isPlanEnd ? (
              <button
                onClick={handleNextChapter}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#1C2A39] to-[#0f1724] text-white text-xs px-4 py-2 rounded-full shadow-md active:scale-95 font-semibold"
              >
                <span>Complete Day {activePlanDay}</span>
                <FiCheck size={14} className="text-[#C6A87C]" />
              </button>
            ) : hasNext ? (
              <button
                onClick={handleNextChapter}
                className={`flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full shadow-sm border active:scale-95 transition-all ${
                  isBibleDark ? 'bg-[#152233] text-white border-gray-700' : 'bg-white text-[#1C2A39] border-[#ECE5D8]'
                }`}
              >
                <span>Next</span>
                <FiChevronRight size={15} />
              </button>
            ) : <div />}
          </div>
        </div>
      </main>
    );
  };

  // --- JOURNEY SCREEN ---
  const renderJourney = () => {
    const nextDays = CHRONOLOGICAL_PLAN.filter(p => p.day > (currentJourneyDay?.day || 1)).slice(0, 2);

    return (
      <main className="flex-1 overflow-y-auto pb-28 font-sans bg-[#12161B] text-[#EDEAE4]">
        {/* FULL-WIDTH HERO BANNER: A Journey-top.png */}
        <div className="relative w-full h-56 overflow-hidden bg-[#0D1217] border-b border-[#222B35]">
          <img 
            src="/A Journey-top.png" 
            alt="The Journey - From Genesis to Revelation" 
            className="w-full h-full object-cover object-center block"
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#12161B] to-transparent pointer-events-none" />
        </div>

        {/* PROGRESS METRICS CARD */}
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
                <p className="text-[11px] font-bold leading-tight text-white">Genesis – Acts</p>
                <p className="text-[7px] text-gray-400 uppercase tracking-wide">Entire Bible Journey</p>
              </div>
            </div>

            <div className="pl-3 border-l border-[#26313E] flex flex-col items-center justify-center text-center">
              <FiMap size={16} className="text-[#C6A87C] mb-0.5" strokeWidth={1.5} />
              <p className="text-[6px] text-gray-400 uppercase tracking-widest font-bold leading-tight">A Greater<br/>Story Awaits</p>
            </div>
          </div>
        </div>

        {/* TIMELINE ERAS */}
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
                      onClick={() => setExpandedEraId(prev => prev === era.id ? null : era.id)}
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
                      onClick={() => setExpandedEraId(prev => prev === era.id ? null : era.id)}
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
                                    <div className="w-8 h-8 rounded-full bg-[#0D1217] border border-[#2B3746] flex items-center justify-center text-[#C6A87C] shadow-sm cursor-pointer flex-shrink-0">
                                      <FaPlay size={8} className="ml-0.5" />
                                    </div>
                                    <button 
                                      onClick={() => {
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
    );
  };

  // --- JOURNAL SCREEN ---
  const renderJournal = () => (
    <main className="flex-1 overflow-y-auto pb-28 bg-[#FBF9F5] text-[#1C2A39]">
      {renderHeader("Journal", "A Safe Place to Meet with God", "Commit your way to the LORD...", "Psalm 37:5")}
      
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C8071] mb-2.5 px-1">
            Past Reflections ({journalEntries.length})
          </h3>

          {journalEntries.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-white border border-[#ECE5D8] text-gray-400 text-xs">
              <p className="italic font-serif">No journal entries saved yet.</p>
              <p className="text-[10px] mt-1 text-[#8C8071]">Your reflections will be recorded here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {journalEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#ECE5D8] transition-all"
                >
                  <div className="flex justify-between items-center mb-1.5 border-b border-[#ECE5D8]/50 pb-1.5">
                    <span className="text-[9.5px] font-bold text-[#CBA365] tracking-wider uppercase">
                      {entry.date} • {entry.time}
                    </span>
                    <button 
                      onClick={() => handleDeleteJournal(entry.id)}
                      className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                      title="Delete entry"
                    >
                      <FiX size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-[#2C3E50] leading-relaxed whitespace-pre-wrap font-serif">
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );

  // --- PROFILE SCREEN WITH FULL-BLEED TOP HERO BANNER ---
  const renderProfile = () => {
    const profile = userProfile || {
      name: 'Seeker',
      lifeVerse: 'Jeremiah 29:11',
      purposeMotto: 'Led by the Spirit into all the truth.',
      reminderTime: '07:00',
      avatarUrl: AVATAR_PRESETS[0]
    };

    return (
      <main className="flex-1 overflow-y-auto pb-28 bg-[#FBF9F5] text-[#1C2A39]">
        {/* FULL-WIDTH HERO BANNER: A Profile-top.png */}
        <div className="relative w-full h-56 overflow-hidden bg-[#FAF7F2] border-b border-[#ECE5D8]">
          <img 
            src="/A Profile-top.png" 
            alt="Your Journey. Your Story. His Purpose."
            className="w-full h-full object-cover object-center block"
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FBF9F5] to-transparent pointer-events-none" />
        </div>
        
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-2xl p-4 shadow-sm border bg-white border-[#ECE5D8] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#CBA365] shadow-sm flex-shrink-0">
                <img src={profile.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#14202E] leading-tight">{profile.name}</h2>
                <p className="text-[10px] text-[#8C8071] font-serif italic mt-0.5">"{profile.purposeMotto}"</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-[#FAF7F2] border border-[#E8DFD0] rounded-full text-[8px] font-bold tracking-widest text-[#CBA365] uppercase">
                  {profile.lifeVerse}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setEditForm({ ...profile, email: profile.email || '', password: '' });
                setIsEditProfileOpen(true);
              }}
              className="p-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#ECE5D8] text-[#14202E] transition-colors"
              title="Edit Profile"
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
              <h4 className="text-sm font-serif font-bold text-[#14202E]">Survive Cache Clears & Device Changes</h4>
              <p className="text-[10px] text-[#8C8071]">
                Link an email so your profile, streaks, and journal notes are never lost when browser cookies are deleted.
              </p>
            </div>

            <button
              onClick={async () => {
                const email = prompt("Enter your email address to anchor your account:");
                if (!email) return;
                const password = prompt("Create a password to secure your backups (minimum 6 characters):");
                if (!password) return;

                const result = await linkEmailToAccount(email, password);
                if (result.success) {
                  alert("Account secured! You can now restore your walk anytime if your browser data is wiped.");
                } else {
                  alert("Linking failed: " + result.error);
                }
              }}
              className="w-full py-2 bg-[#14202E] text-white rounded-xl text-xs font-semibold hover:bg-[#1E2E40] transition-colors"
            >
              Link Email & Protect Data
            </button>

            <button
              onClick={handleRestoreAccount}
              className="w-full py-1.5 bg-[#FAF7F2] text-[#8C8071] border border-[#ECE5D8] rounded-xl text-[10px] font-semibold hover:text-[#14202E] transition-colors"
            >
              Already linked? Restore Account
            </button>
          </div>
        </div>
      </main>
    );
  };

  if (isLoading && booksList.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#060B12]">
        <div className="w-full max-w-[430px] h-[100dvh] bg-[#0E1622] flex flex-col items-center justify-center p-6 text-center text-white">
          <span className="font-['Times_New_Roman',serif] text-2xl mb-2 flex items-center gap-2 text-[#F2DFB8]">
            <span>✝</span> God's Purpose System
          </span>
          <p className="text-xs tracking-widest uppercase text-gray-400 font-serif mb-6">
            Led by the Spirit into all the truth.
          </p>
          <div className="w-7 h-7 border-2 border-[#CBA365] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[11px] text-gray-400 italic font-serif">Preparing the scriptures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#060B12] selection:bg-[#C6A87C] selection:text-white">
      {showSplash && <SplashScreen isFading={splashFading} onBegin={handleBeginJourney} />}

      <div className="w-full max-w-[430px] h-[100dvh] bg-[#1C2A39] relative overflow-hidden shadow-2xl flex flex-col md:border-x md:border-gray-800">
        
        {activeTab === 'Home' && renderHome()}
        {activeTab === 'Plan' && renderPlan()}
        {activeTab === 'Journey' && renderJourney()}
        {activeTab === 'Bible' && renderBible()}
        {activeTab === 'Journal' && renderJournal()}
        {activeTab === 'Profile' && renderProfile()}

        {/* BOTTOM NAVIGATION */}
        <nav className="absolute bottom-0 w-full flex justify-around items-end pb-6 pt-3 bg-[#0B1521] text-gray-400 text-xs z-30 rounded-t-3xl shadow-[0_-6px_25px_rgba(0,0,0,0.18)]">
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
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center transition-all duration-200 ${isActive ? 'text-[#C6A87C] -translate-y-0.5' : 'hover:text-gray-300'}`}
              >
                <tab.icon size={19} className="mb-0.5" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[8.5px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                {isActive && <div className="w-1 h-1 bg-[#C6A87C] rounded-full mt-0.5 absolute -bottom-2" />}
              </button>
            );
          })}
        </nav>

        {/* INLINE QUICK NOTE MODAL DRAWER */}
        {isQuickNoteOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-[#161C24] text-white w-full rounded-t-[2.2rem] p-6 border-t border-[#26313E] shadow-2xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#C6A87C]">Quick Reflection</span>
                <button onClick={() => setIsQuickNoteOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <FiX size={18} />
                </button>
              </div>

              <textarea
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                placeholder="What is on your heart right now?"
                autoFocus
                className="w-full h-28 bg-[#11161D] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#C6A87C] resize-none"
              />

              <button
                onClick={handleSaveQuickNote}
                disabled={!quickNoteText.trim()}
                className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all ${
                  quickNoteText.trim()
                    ? 'bg-[#C6A87C] text-[#14202E] active:scale-95'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save to Journal
              </button>
            </div>
          </div>
        )}

        {/* FEATURED DIRECTION DEVOTIONAL MODAL */}
        {selectedDirection && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm transition-opacity">
            <div className="bg-[#151412] text-[#EDEAE4] w-full max-h-[85vh] rounded-t-[2.2rem] flex flex-col shadow-2xl border-t border-[#2B2925] overflow-hidden">
              <div className="relative pt-3 pb-3 px-6 border-b border-[#2B2925] flex justify-between items-center bg-[#1A1916]">
                <div className="w-8 h-1 bg-[#444038] rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
                <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#D89F57] font-semibold">
                  Featured Direction
                </span>
                <button 
                  onClick={() => setSelectedDirection(null)} 
                  className="text-[#8E8B85] hover:text-white p-1 rounded-full active:scale-95"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5 space-y-4">
                <div className="w-full h-44 rounded-2xl overflow-hidden border border-[#2B2925] shadow-md bg-black/40">
                  <img 
                    src={selectedDirection.image} 
                    alt={selectedDirection.title} 
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                <h2 className="text-2xl font-serif text-[#F4F1EA] font-normal">
                  {selectedDirection.title}
                </h2>

                <div className="text-[14px] font-serif leading-[1.8] text-[#D5D0C5] whitespace-pre-line pb-6">
                  {selectedDirection.description}
                </div>
              </div>

              <div className="p-4 border-t border-[#2B2925] bg-[#1A1916]">
                <button
                  onClick={() => setSelectedDirection(null)}
                  className="w-full py-2.5 bg-[#D89F57] hover:brightness-105 active:scale-[0.98] text-[#1A1610] font-sans font-medium text-xs rounded-xl shadow-md transition-all tracking-wide text-center"
                >
                  Done Reading
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BIBLE CHAPTER PICKER MODAL */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm transition-opacity">
            <div className="bg-[#1C2230] text-white w-full h-[78%] rounded-t-[2.2rem] flex flex-col shadow-2xl relative border-t border-gray-700/60 overflow-hidden">
              <div className="relative pt-3 pb-2 px-6 border-b border-gray-800">
                <div className="w-8 h-1 bg-gray-600 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
                <div className="flex justify-between items-center mt-2">
                  <div className="grid grid-cols-3 w-full text-center pr-6">
                    <span className="text-[#C6A87C] font-bold text-xs tracking-wider">Book</span>
                    <span className="text-[#C6A87C] font-bold text-xs tracking-wider">Chapter</span>
                    <span className="text-[#C6A87C] font-bold text-xs tracking-wider">Verse</span>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-1">
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-3 divide-x divide-gray-800/80 overflow-hidden py-2">
                <div className="overflow-y-auto px-2 py-4 space-y-1 text-center scrollbar-none">
                  {booksList.map((b) => {
                    const isSelected = b.name === currentBook;
                    return (
                      <button
                        key={b.name}
                        onClick={() => {
                          setCurrentBook(b.name);
                          setCurrentChapter(1);
                          setCurrentVerse(1);
                        }}
                        className={`w-full py-1.5 px-2 rounded-full text-xs transition-all font-medium ${
                          isSelected 
                            ? 'bg-[#C6A87C] text-[#14202E] font-bold shadow-md scale-105' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-y-auto px-2 py-4 space-y-1 text-center scrollbar-none">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => {
                    const isSelected = ch === currentChapter;
                    return (
                      <button
                        key={ch}
                        onClick={() => {
                          setCurrentChapter(ch);
                          setCurrentVerse(1);
                        }}
                        className={`w-full py-1.5 rounded-full text-xs transition-all font-medium ${
                          isSelected 
                            ? 'bg-[#C6A87C] text-[#14202E] font-bold shadow-md scale-105' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-y-auto px-2 py-4 space-y-1 text-center scrollbar-none">
                  {Array.from({ length: totalVerses }, (_, i) => i + 1).map((v) => {
                    const isSelected = v === currentVerse;
                    return (
                      <button
                        key={v}
                        onClick={() => {
                          setCurrentVerse(v);
                          setIsMenuOpen(false);
                          setTimeout(() => {
                            const el = document.getElementById(`verse-${v}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                        className={`w-full py-1.5 rounded-full text-xs transition-all font-medium ${
                          isSelected 
                            ? 'bg-[#C6A87C] text-[#14202E] font-bold shadow-md scale-105' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 border-t border-gray-800 bg-[#171C28]">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-2.5 bg-[#C6A87C] hover:bg-[#BFA074] text-[#14202E] font-bold text-xs rounded-full shadow-md active:scale-95 transition-transform"
                >
                  Go to {currentBook} {currentChapter}:{currentVerse}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm transition-opacity">
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
                      onClick={() => setBibleTheme('light')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                        !isBibleDark 
                          ? 'bg-[#F2DFB8] text-[#14202E] border-[#DEBE84] shadow-sm font-bold' 
                          : 'bg-[#0E1622] text-gray-400 border-gray-700 hover:text-white'
                      }`}
                    >
                      <FiSun size={16} />
                      <span>Light Mode</span>
                    </button>
                    <button
                      onClick={() => setBibleTheme('dark')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                        isBibleDark 
                          ? 'bg-[#C6A87C] text-[#14202E] border-[#C6A87C] shadow-sm font-bold' 
                          : 'bg-[#0E1622] text-gray-400 border-gray-700 hover:text-white'
                      }`}
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
                        onClick={() => setTextSizeIndex(idx + 1)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                          textSizeIndex === idx + 1
                            ? 'bg-[#C6A87C] text-[#14202E] border-[#C6A87C] font-bold'
                            : 'bg-[#0E1622] text-gray-400 border-gray-700 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2.5 bg-[#C6A87C] hover:bg-[#BFA074] text-[#14202E] text-xs font-bold rounded-full uppercase tracking-wider shadow-md active:scale-95 transition-transform"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

        {/* PROFILE EDIT MODAL */}
        {isEditProfileOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm transition-opacity">
            <div className="bg-[#FAF8F5] text-[#14202E] rounded-t-[2.2rem] p-6 max-h-[88vh] overflow-y-auto flex flex-col shadow-2xl border-t border-[#ECE5D8]">
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-[#ECE5D8]">
                <div>
                  <span className="text-[8.5px] uppercase tracking-[0.2em] text-[#CBA365] font-bold">God's Purpose System</span>
                  <h3 className="font-serif text-xl font-bold text-[#14202E] mt-0.5">
                    {!userProfile ? "Welcome to Your Journey" : "Edit Your Profile"}
                  </h3>
                  <p className="text-[10.5px] text-[#8C8071] font-serif italic mt-0.5">
                    {!userProfile ? "Personalize your daily walk with the Lord." : "Update your identity and spiritual anchor."}
                  </p>
                </div>
                {userProfile && (
                  <button onClick={() => setIsEditProfileOpen(false)} className="p-1.5 rounded-full bg-[#EAE4D7] text-[#14202E] hover:bg-[#DDD6C7]">
                    <FiX size={16} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8C8071] mb-1">What is your name?</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-[#ECE5D8] bg-white outline-none focus:border-[#CBA365] shadow-sm font-medium"
                    placeholder="e.g. James Walker"
                    required
                  />
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#ECE5D8] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#14202E]">
                      Save Your Progress Permanently
                    </label>
                    <span className="text-[8px] uppercase tracking-wider text-[#CBA365] font-bold">Recommended</span>
                  </div>
                  <p className="text-[9.5px] text-[#8C8071] leading-tight">
                    Add an email and password to sync across devices and prevent losing data when browser cache is deleted.
                  </p>
                  <input 
                    type="email" 
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#ECE5D8] bg-white outline-none focus:border-[#CBA365]"
                    placeholder="Email address (e.g. you@example.com)"
                  />
                  <input 
                    type="password" 
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#ECE5D8] bg-white outline-none focus:border-[#CBA365]"
                    placeholder="Password (minimum 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8C8071] mb-1.5">Choose an Avatar</label>
                  <div className="flex gap-3">
                    {AVATAR_PRESETS.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => setEditForm({ ...editForm, avatarUrl: url })}
                        className={`w-12 h-12 rounded-full overflow-hidden cursor-pointer border-2 transition-transform ${
                          editForm.avatarUrl === url ? 'border-[#CBA365] scale-110 shadow-md ring-2 ring-[#CBA365]/30' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8C8071] mb-1">Life Anchor Scripture</label>
                  <input 
                    type="text" 
                    value={editForm.lifeVerse}
                    onChange={(e) => setEditForm({ ...editForm, lifeVerse: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#ECE5D8] bg-white outline-none focus:border-[#CBA365] shadow-sm font-medium mb-1.5"
                    placeholder="e.g. Jeremiah 29:11"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_VERSES.map((verse) => (
                      <button
                        type="button"
                        key={verse}
                        onClick={() => setEditForm({ ...editForm, lifeVerse: verse })}
                        className={`text-[9px] px-2.5 py-1 rounded-full border transition-all ${
                          editForm.lifeVerse === verse 
                            ? 'bg-[#14202E] text-white border-[#14202E] font-bold' 
                            : 'bg-white text-[#8C8071] border-[#ECE5D8] hover:bg-gray-50'
                        }`}
                      >
                        {verse}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8C8071] mb-1">Purpose Motto / Reflection</label>
                  <input 
                    type="text" 
                    value={editForm.purposeMotto}
                    onChange={(e) => setEditForm({ ...editForm, purposeMotto: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#ECE5D8] bg-white outline-none focus:border-[#CBA365] shadow-sm"
                    placeholder="e.g. Led by the Spirit into all the truth."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8C8071] mb-1">Daily Journey Reminder</label>
                  <input 
                    type="time" 
                    value={editForm.reminderTime}
                    onChange={(e) => setEditForm({ ...editForm, reminderTime: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#ECE5D8] bg-white outline-none focus:border-[#CBA365] shadow-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-[#e5cd9e] to-[#cba365] text-[#14202E] font-bold text-xs rounded-full shadow-md active:scale-95 transition-transform"
                  >
                    {!userProfile ? "Begin My Journey" : "Save Changes"}
                  </button>

                  {!userProfile && (
                    <div className="space-y-2 mt-3 text-center">
                      <button
                        type="button"
                        onClick={handleRestoreAccount}
                        className="block w-full text-[11px] text-[#CBA365] font-semibold underline hover:text-[#14202E]"
                      >
                        Already have an account? Sign In
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const guest = {
                            name: 'Friend',
                            lifeVerse: 'Jeremiah 29:11',
                            purposeMotto: 'Led by the Spirit into all the truth.',
                            reminderTime: '07:00',
                            avatarUrl: AVATAR_PRESETS[0]
                          };
                          setUserProfile(guest);
                          try { localStorage.setItem('gps_user_profile', JSON.stringify(guest)); } catch (err) {}
                          setIsEditProfileOpen(false);
                        }}
                        className="text-[10px] text-[#8C8071] hover:text-[#14202E]"
                      >
                        Skip for now (Continue as guest)
                      </button>
                    </div>
                  )}
                </div>
              </form>
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