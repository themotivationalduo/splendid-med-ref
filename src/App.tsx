/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  AlertTriangle,
  Info,
  Pill,
  Activity,
  ShieldAlert,
  BookOpen,
  ChevronRight,
  Stethoscope,
  HeartPulse,
  Database,
  Bookmark,
  Printer,
  Download,
  FileText,
  Layers,
  Heart,
  UserCheck,
  CheckCircle2,
  X,
  Share2,
  ChevronLeft,
  Globe,
  Loader2,
  Sun,
  Moon,
  ChevronDown,
  Filter,
  History
} from "lucide-react";
import { UnifiedMedicalData, MedicalEntity } from "./types";
import { MEDICAL_DATABASE } from "./data/medicalDatabase";
import { auth, db, ensureAnonymousAuth } from "./lib/firebase";
import { showToast } from "./components/Toast";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ClinicalCalculators } from "./components/ClinicalCalculators";
import { DrugInteractionGraph } from "./components/DrugInteractionGraph";
import {
  PharmacologySkeletonLoader,
  DictionaryGridSkeletonLoader,
  IcdSearchSkeletonLoader
} from "./components/SkeletonLoaders";
import { fetchDirectMedicationData } from "./lib/medicationService";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  // Theme Support (Light & Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem("splendid_theme");
      if (savedTheme) return savedTheme === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("splendid_theme", isDarkMode ? "dark" : "light");
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // PWA Direct Installation Handler
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    try {
      return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast("Splendid Med-Ref successfully installed!", "📱", "success");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (deferredPrompt) {
      showToast("Launching app installer...", "📲", "info");
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast("App installed successfully!", "📱", "success");
      } else {
        showToast("Installation cancelled", "ℹ️", "info");
      }
      setDeferredPrompt(null);
    } else if (isInstalled) {
      showToast("App is already installed on your device!", "✅", "success");
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        showToast("To install on iOS: tap Share icon then 'Add to Home Screen'", "📲", "info", 5000);
      } else {
        showToast("Direct installation prompt initialized! Tap browser menu -> 'Install App' if needed.", "📲", "info", 4000);
      }
    }
  }, [deferredPrompt, isInstalled]);

  type NavTab = "dictionary" | "foundations" | "pathology" | "pharmacology" | "diagnostics" | "tools" | "bookmarks";

  const getTabFromPath = (path: string): NavTab => {
    const clean = path.toLowerCase().replace(/^\/+|\/+$/g, '');
    if (clean === "pharmacology") return "pharmacology";
    if (clean === "foundations") return "foundations";
    if (clean === "pathology") return "pathology";
    if (clean === "diagnostics") return "diagnostics";
    if (clean === "tools") return "tools";
    if (clean === "bookmarks") return "bookmarks";
    if (clean === "dictionary") return "dictionary";
    return "dictionary";
  };

  const [activeNavTab, setActiveNavTab] = useState<NavTab>(() => {
    return getTabFromPath(window.location.pathname);
  });

  const navigateToTab = useCallback((tab: NavTab, pushHistory = true) => {
    setActiveNavTab(tab);
    const targetPath = `/${tab}`;
    if (pushHistory && window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const tabFromUrl = getTabFromPath(window.location.pathname);
      setActiveNavTab(tabFromUrl);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const currentTab = getTabFromPath(window.location.pathname);
    const targetPath = `/${currentTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ tab: currentTab }, '', targetPath);
    }
  }, []);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Search & Dictionary State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<MedicalEntity | null>(null);
  const [isDictionarySearching, setIsDictionarySearching] = useState(false);

  // Transient skeleton loading effect on search query or category filter change
  useEffect(() => {
    setIsDictionarySearching(true);
    const timer = setTimeout(() => {
      setIsDictionarySearching(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory]);

  // Recent Searches / Viewed Entities State
  const [recentEntityIds, setRecentEntityIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("splendid_recent_entities");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    if (selectedEntity) {
      showToast(`Viewing profile: ${selectedEntity.title}`, "🩺", "info");
      setRecentEntityIds(prev => {
        const filtered = prev.filter(id => id !== selectedEntity.id);
        const updated = [selectedEntity.id, ...filtered].slice(0, 5);
        try {
          localStorage.setItem("splendid_recent_entities", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [selectedEntity]);

  // Tab-Specific Dropdown & Search States
  const [foundationsSearch, setFoundationsSearch] = useState("");
  const [selectedFoundationCategory, setSelectedFoundationCategory] = useState("all");

  const [pathologySearch, setPathologySearch] = useState("");

  const [drugSearch, setDrugSearch] = useState("");
  
  const [diagnosticsSearch, setDiagnosticsSearch] = useState("");
  const [selectedDiagnosticCategory, setSelectedDiagnosticCategory] = useState("all");

  const [bookmarkSearch, setBookmarkSearch] = useState("");

  // Live API State (for Pharmacology / Drug Lookup)
  const [liveDrugName, setLiveDrugName] = useState("Ibuprofen");
  const [selectedDrugCategory, setSelectedDrugCategory] = useState("All");
  const [apiData, setApiData] = useState<UnifiedMedicalData | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Polypharmacy Multi-Drug Regimen & Patient Physiological State
  const [patientAge, setPatientAge] = useState<number>(72);
  const [patientWeight, setPatientWeight] = useState<number>(62);

  const [polypharmacyRegimen, setPolypharmacyRegimen] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('splendid_polypharmacy_regimen');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return ["Warfarin", "Aspirin", "Ibuprofen", "Lisinopril", "Metformin"];
  });

  useEffect(() => {
    try {
      localStorage.setItem('splendid_polypharmacy_regimen', JSON.stringify(polypharmacyRegimen));
    } catch (e) {
      // ignore
    }
  }, [polypharmacyRegimen]);

  // Dynamically ensure looked-up drug is in polypharmacy regimen
  useEffect(() => {
    if (liveDrugName) {
      setPolypharmacyRegimen(prev => {
        const exists = prev.some(d => d.toLowerCase() === liveDrugName.toLowerCase());
        if (!exists) {
          return [liveDrugName, ...prev];
        }
        return prev;
      });
    }
  }, [liveDrugName]);

  // Anonymous Auth & Firestore State
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

  // Bookmarks State with localStorage & Firestore persistence
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('splendid_med_bookmarks');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return ["asthma", "ibuprofen"];
  });

  // Initialize Auth & load cloud bookmarks
  useEffect(() => {
    let isMounted = true;
    ensureAnonymousAuth().then(user => {
      if (user && isMounted) {
        setCurrentUserUid(user.uid);
        const docRef = doc(db, 'users', user.uid, 'data', 'bookmarks');
        getDoc(docRef).then(snap => {
          if (snap.exists() && snap.data()?.items && isMounted) {
            setBookmarks(snap.data().items);
          }
        }).catch(() => {});
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Save bookmarks to localStorage and Firestore when updated
  useEffect(() => {
    try {
      localStorage.setItem('splendid_med_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      // ignore
    }

    if (currentUserUid) {
      const docRef = doc(db, 'users', currentUserUid, 'data', 'bookmarks');
      setDoc(docRef, { items: bookmarks, updatedAt: new Date().toISOString() }).catch(() => {});
    }
  }, [bookmarks, currentUserUid]);

  // ICD-11 Live Search State
  const [icdQuery, setIcdQuery] = useState("");
  const [icdResults, setIcdResults] = useState<any[]>([]);
  const [icdLoading, setIcdLoading] = useState(false);

  // Fetch live API data when drugQuery changes
  useEffect(() => {
    let isCurrent = true;
    const fetchLiveMedData = async () => {
      if (!liveDrugName) return;
      setApiLoading(true);
      setApiError(null);
      try {
        let json: any = null;
        try {
          const response = await fetch(`/api/medication?name=${encodeURIComponent(liveDrugName)}`);
          const text = await response.text();
          const isHtml = text.trim().startsWith("<");
          
          if (response.ok && !isHtml) {
            json = JSON.parse(text);
          }
        } catch {
          json = null;
        }

        if (!json) {
          // Fallback to direct client-side open API query (RxNorm + openFDA + MedlinePlus)
          json = await fetchDirectMedicationData(liveDrugName);
        }

        if (isCurrent && json) {
          setApiData(json);
        }
      } catch (err) {
        if (isCurrent) {
          try {
            const fallbackData = await fetchDirectMedicationData(liveDrugName);
            setApiData(fallbackData);
          } catch (fallbackErr) {
            setApiError(err instanceof Error ? err.message : "Failed to connect to gateway");
          }
        }
      } finally {
        if (isCurrent) {
          setApiLoading(false);
        }
      }
    };
    fetchLiveMedData();
    return () => { isCurrent = false; };
  }, [liveDrugName]);

  // Optimized Scroll Handler (prevents duplicate state sets)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 25 && currentScrollY > 60) {
      setNavVisible(prev => prev ? false : prev);
    } else if (currentScrollY < lastScrollY.current - 15 || currentScrollY <= 40) {
      setNavVisible(prev => !prev ? true : prev);
    }
    lastScrollY.current = currentScrollY;
  }, []);

  const toggleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBookmarks(prev => {
      const exists = prev.includes(id);
      const entity = MEDICAL_DATABASE.find(item => item.id === id);
      const title = entity ? entity.title : id;
      if (exists) {
        showToast(`Removed from Bookmarks: ${title}`, "🔖", "info");
        return prev.filter(b => b !== id);
      } else {
        showToast(`Saved to Bookmarks: ${title}`, "⭐", "success");
        return [...prev, id];
      }
    });
  }, []);

  // Memoized Filtered Entities
  const filteredEntities = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term && selectedCategory === 'all') return MEDICAL_DATABASE;

    return MEDICAL_DATABASE.filter(entity => {
      const matchesCat = selectedCategory === 'all' || entity.category === selectedCategory;
      const matchesSearch = !term ||
        entity.title.toLowerCase().includes(term) ||
        entity.summary.toLowerCase().includes(term) ||
        (entity.icdCode && entity.icdCode.toLowerCase().includes(term));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  const diseases = useMemo(() => {
    return MEDICAL_DATABASE.filter(e => e.category === 'disease');
  }, []);

  const filteredDiseases = useMemo(() => {
    if (!pathologySearch.trim()) return diseases;
    const term = pathologySearch.toLowerCase().trim();
    return diseases.filter(d => 
      d.title.toLowerCase().includes(term) ||
      d.summary.toLowerCase().includes(term) ||
      (d.icdCode && d.icdCode.toLowerCase().includes(term))
    );
  }, [diseases, pathologySearch]);

  const activeDisease = useMemo(() => {
    if (selectedEntity && selectedEntity.category === 'disease') {
      return selectedEntity;
    }
    return filteredDiseases[0] || diseases[0];
  }, [selectedEntity, filteredDiseases, diseases]);

  const handlePrintSummary = useCallback(() => {
    showToast("Preparing clinical summary for export...", "🖨️", "info");
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none transition-colors duration-200">
      {/* Mirror Glass Fast Rotating Capsule Emoji Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] text-white p-6 cursor-pointer select-none"
            onClick={() => setShowSplash(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center text-center max-w-xs"
            >
              <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                {/* Subtle Professional Glow */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
                
                {/* Mirror Glass Card with Fast Smooth Rotating Capsule Emoji */}
                <div className="relative w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/40 flex items-center justify-center">
                  <motion.span
                    className="text-6xl select-none inline-block transform-gpu"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.0, ease: "linear" }}
                  >
                    💊
                  </motion.span>
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white">
                Splendid Med-Ref
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
                Clinical Knowledge & Diagnostics
              </p>

              <div className="mt-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[11px] text-slate-300 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                <span className="font-medium">Initializing Clinical Engine...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="h-13 bg-[#0F172A] dark:bg-slate-950 flex items-center justify-between px-4 shrink-0 shadow-md z-30 sticky top-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          {/* Main Top Header Icon Badge */}
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20">
              <HeartPulse className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0F172A] dark:border-slate-950 rounded-full flex items-center justify-center shadow-sm">
              <Stethoscope className="w-2 h-2 text-white" />
            </span>
          </div>

          <div>
            <h1 className="text-white font-bold tracking-tight text-sm leading-tight flex items-center gap-1">
              SPLENDID <span className="text-blue-400">MED-REF</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Clinical Knowledge Base & Rx</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-800/80 rounded-full border border-slate-700/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-slate-300 text-[11px] font-medium">FHIR / RxNorm Active</span>
          </div>

          {/* Theme Support Toggle Button */}
          <button
            onClick={() => {
              const next = !isDarkMode;
              setIsDarkMode(next);
              showToast(next ? "Switched to Dark Mode" : "Switched to Light Mode", next ? "🌙" : "☀️", "info");
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg transition-all border border-slate-700 shadow-2xs"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline text-amber-300">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline text-slate-300">Dark Mode</span>
              </>
            )}
          </button>

          {/* Direct App Installation Button */}
          <button 
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg transition-colors border border-emerald-500/50 shadow-2xs cursor-pointer"
            title="Install Splendid Med-Ref App"
          >
            <Download className="w-3.5 h-3.5 text-white animate-bounce-slow" />
            <span className="hidden sm:inline">{isInstalled ? "Installed" : "Install App"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative z-10 p-3 md:p-5 pb-28"
      >
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* TAB 1: MEDICAL DICTIONARY & INDEX */}
          {activeNavTab === "dictionary" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="space-y-4">
               {/* Search Hero */}
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
                <div className="max-w-xl mx-auto text-center space-y-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dynamic Medical Dictionary & Index</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Lightning-fast instant search across diseases, pharmacological guides, anatomy systems, diagnostic tests, and surgical procedures.
                  </p>
                  
                  {/* Recent Searches Chips (Top 5 Recently Viewed Entities) */}
                  {recentEntityIds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 pb-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1 shrink-0">
                        <History className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Recent:
                      </span>
                      {recentEntityIds.map(id => {
                        const entity = MEDICAL_DATABASE.find(e => e.id === id);
                        if (!entity) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setSelectedEntity(entity);
                              showToast(`Loaded recent: ${entity.title}`, "🕒", "info");
                            }}
                            className="px-2.5 py-1 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200/80 dark:border-slate-700 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                            title={`Open ${entity.title}`}
                          >
                            <span className="truncate max-w-[130px]">{entity.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Bar & Dropdown Entity Jump Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search terms, ICD-11 codes, drug names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 pl-9 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      />
                      <Search className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
                      {searchTerm && (
                        <button onClick={() => {
                          setSearchTerm("");
                          showToast("Dictionary search cleared", "🧹", "info");
                        }} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Jump Drop-Down Selector */}
                    <div className="relative">
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50/80 dark:bg-slate-800/90 border border-blue-200/80 dark:border-slate-700 rounded-lg text-xs text-blue-900 dark:text-blue-200">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 shrink-0">Jump To:</span>
                        <select
                          id="dictionary-entity-jump-select"
                          aria-label="Quick Jump to Entity"
                          value={selectedEntity?.id || ""}
                          onChange={(e) => {
                            const found = MEDICAL_DATABASE.find(item => item.id === e.target.value);
                            if (found) setSelectedEntity(found);
                          }}
                          className="w-full bg-transparent text-xs font-semibold text-blue-950 dark:text-white focus:outline-none cursor-pointer truncate pr-1"
                        >
                          <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">
                            -- Select Medical Topic ({filteredEntities.length}) --
                          </option>
                          {filteredEntities.map(entity => (
                            <option key={entity.id} value={entity.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              [{entity.category.toUpperCase()}] {entity.title}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ICD-11 Search Integration */}
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-slate-800/60 border border-blue-200/60 dark:border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">ICD-11 Clinical Search</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded shadow-2xs">ICD-11</span>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!icdQuery.trim()) return;
                    setIcdLoading(true);
                    try {
                      const res = await fetch(`/api/icd/search?q=${encodeURIComponent(icdQuery)}`);
                      const text = await res.text();
                      if (text.trim().startsWith("<")) {
                        showToast("WHO ICD API endpoint returned HTML. Ensure server environment is configured.", "⚠️", "warning");
                        setIcdResults([]);
                        return;
                      }
                      const data = JSON.parse(text);
                      if (!res.ok) {
                        showToast(data.error || "ICD-11 search failed", "🚨", "error");
                        setIcdResults([]);
                        return;
                      }
                      setIcdResults(data.destination || data.result || data.matchingEntities || []);
                    } catch (err: any) {
                      console.error("Error:", err);
                      setIcdResults([]);
                    } finally {
                      setIcdLoading(false);
                    }
                  }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Query ICD-11 (e.g. Asthma, Diabetes, Hypertension)..."
                      value={icdQuery}
                      onChange={(e) => setIcdQuery(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={icdLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {icdLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Query ICD-11
                    </button>
                  </form>

                  {icdLoading ? (
                    <IcdSearchSkeletonLoader />
                  ) : icdResults.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-slate-700 p-2.5 max-h-48 overflow-y-auto space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">WHO ICD-11 Search Results ({icdResults.length})</div>
                      {icdResults.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800/70 rounded border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{item.title || item.label || 'Clinical Entity'}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">URI: {item.id || item.uri || 'N/A'}</div>
                          </div>
                          <span className="font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                            {item.code || 'ICD-11'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Category Dropdown & Pills */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Category Dropdown Select */}
                  <div className="relative w-full sm:w-64">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 shrink-0">Category:</span>
                      <select
                        id="dictionary-category-select"
                        aria-label="Select Category"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate"
                      >
                        {[
                          { id: 'all', label: 'All Categories' },
                          { id: 'disease', label: 'Diseases & Pathology' },
                          { id: 'drug', label: 'Pharmacology' },
                          { id: 'anatomy', label: 'Anatomy & Physiology' },
                          { id: 'diagnostic', label: 'Diagnostics & Labs' },
                          { id: 'procedure', label: 'Treatment Protocols' },
                          { id: 'terminology', label: 'Terminology Index' },
                        ].map(cat => (
                          <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'disease', label: 'Diseases' },
                      { id: 'drug', label: 'Drugs' },
                      { id: 'anatomy', label: 'Anatomy' },
                      { id: 'diagnostic', label: 'Labs' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Entity Grid */}
              {isDictionarySearching ? (
                <DictionaryGridSkeletonLoader count={6} />
              ) : filteredEntities.length === 0 ? (
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-8 text-center space-y-2 border border-slate-200 dark:border-slate-800">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No medical terms found</p>
                  <p className="text-xs text-slate-500">Try adjusting your search query or selecting "All Categories".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredEntities.map((entity) => {
                    const isBookmarked = bookmarks.includes(entity.id);
                    return (
                      <div
                        key={entity.id}
                        onClick={() => setSelectedEntity(entity)}
                        className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/85 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between group text-slate-900 dark:text-slate-100"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              entity.category === 'disease' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50' :
                              entity.category === 'drug' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50' :
                              entity.category === 'anatomy' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50' :
                              entity.category === 'diagnostic' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50' :
                              'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50'
                            }`}>
                              {entity.category}
                            </span>
                            <button
                              onClick={(e) => toggleBookmark(entity.id, e)}
                              className={`p-1 rounded-md transition-colors ${isBookmarked ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-300'}`}
                            >
                              <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                            {entity.title}
                          </h3>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                            {entity.summary}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          <span className="font-mono text-slate-400 dark:text-slate-500">{entity.icdCode || entity.rxcui ? `Code: ${entity.icdCode || entity.rxcui}` : 'Standard Profile'}</span>
                          <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                            View Guide <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: FOUNDATIONS (8 FOUNDATIONAL MEDICAL CATEGORIES) */}
          {activeNavTab === "foundations" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="space-y-4">
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Comprehensive Medical Knowledge Foundations</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Structured around eight foundational categories spanning the full domain of clinical medicine.
                    </p>
                  </div>

                  {/* Foundations Dropdown Selector & Search Filter Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    {/* Drop-down Selector */}
                    <div className="relative w-full sm:w-60">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 dark:bg-slate-800/90 border border-blue-200/80 dark:border-slate-700 rounded-lg text-xs font-semibold text-blue-900 dark:text-blue-200 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 shrink-0">Select:</span>
                        <select
                          id="foundations-category-select"
                          aria-label="Select Foundational Category"
                          value={selectedFoundationCategory}
                          onChange={(e) => setSelectedFoundationCategory(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-blue-950 dark:text-white focus:outline-none cursor-pointer truncate pr-1"
                        >
                          <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All 8 Foundations</option>
                          <option value="01" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">01 Pathology & Conditions</option>
                          <option value="02" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">02 Pharmacology & Rx</option>
                          <option value="03" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">03 Diagnostics & Labs</option>
                          <option value="04" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">04 Procedures & Surgery</option>
                          <option value="05" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">05 Specialty Domains</option>
                          <option value="06" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">06 Anatomy & Physiology</option>
                          <option value="07" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">07 Terminology & Coding</option>
                          <option value="08" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">08 Ethics & SOAP Notes</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* Search Bar Input */}
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search foundations..."
                        value={foundationsSearch}
                        onChange={(e) => setFoundationsSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      {foundationsSearch && (
                        <button onClick={() => setFoundationsSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {[
                    {
                      num: "01",
                      title: "Diseases, Disorders & Conditions (Pathology)",
                      desc: "Etiology, pathophysiology, signs & symptoms, disease progression, and prognosis.",
                      color: "border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200"
                    },
                    {
                      num: "02",
                      title: "Pharmacology & Toxicology",
                      desc: "Drug profiles, dosing & administration, ADRs, drug-drug interactions, and toxicology protocols.",
                      color: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
                    },
                    {
                      num: "03",
                      title: "Diagnostics & Investigations",
                      desc: "Physical exams, lab reference ranges (CBC, BMP, LFTs), imaging modalities, and biopsies.",
                      color: "border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200"
                    },
                    {
                      num: "04",
                      title: "Clinical Procedures & Surgery",
                      desc: "Procedural steps, ACLS/BLS/ATLS emergency algorithms, and post-operative care.",
                      color: "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200"
                    },
                    {
                      num: "05",
                      title: "Medical Specialty Domains",
                      desc: "Cardiology, Pulmonology, Pediatrics, OB-GYN, Geriatrics, and Psychiatry (DSM-5).",
                      color: "border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200"
                    },
                    {
                      num: "06",
                      title: "Human Anatomy & Physiology",
                      desc: "Structural musculoskeletal/circulatory layout and homeostatic physiological systems.",
                      color: "border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-200"
                    },
                    {
                      num: "07",
                      title: "Medical Terminology & Coding Systems",
                      desc: "Medical root words, abbreviations, ICD-11 taxonomy, CPT codes, and drug codes.",
                      color: "border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
                    },
                    {
                      num: "08",
                      title: "Ethics, Law & Patient Care",
                      desc: "Bioethics (autonomy, beneficence), informed consent, HIPAA, and SOAP note documentation.",
                      color: "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                    },
                  ]
                    .filter(cat => selectedFoundationCategory === "all" || cat.num === selectedFoundationCategory)
                    .filter(cat => !foundationsSearch.trim() || cat.title.toLowerCase().includes(foundationsSearch.toLowerCase()) || cat.desc.toLowerCase().includes(foundationsSearch.toLowerCase()))
                    .map((cat, idx) => (
                      <div key={idx} className={`p-3.5 rounded-xl border ${cat.color} space-y-2 backdrop-blur-sm shadow-2xs`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 shadow-2xs text-slate-900 dark:text-white">{cat.num}</span>
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white">{cat.title}</h3>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">{cat.desc}</p>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: PATHOLOGY & CONDITIONS */}
          {activeNavTab === "pathology" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="space-y-4">
              {/* Pathology Dropdown Index & Search Header */}
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-3 text-slate-900 dark:text-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Pathology & Disease Profiles
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">Standardized clinical templates and pathophysiology guides</p>
                  </div>

                  {/* Dropdown Select & Search Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    {/* Pathology Index Drop-Down Selector */}
                    <div className="relative w-full sm:w-72">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 dark:bg-slate-800/90 border border-blue-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-blue-900 dark:text-blue-200 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 shrink-0">Pathology Index:</span>
                        <select
                          id="pathology-index-select"
                          aria-label="Pathology Index"
                          value={activeDisease?.id || ''}
                          onChange={(e) => {
                            const found = diseases.find(d => d.id === e.target.value);
                            if (found) setSelectedEntity(found);
                          }}
                          className="w-full bg-transparent text-xs font-bold text-blue-950 dark:text-white focus:outline-none cursor-pointer truncate pr-2"
                        >
                          {filteredDiseases.map(disease => (
                            <option key={disease.id} value={disease.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-normal">
                              {disease.title} {disease.icdCode ? `[ICD-11: ${disease.icdCode}]` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* Quick Search for Pathology */}
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search disease or ICD..."
                        value={pathologySearch}
                        onChange={e => setPathologySearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {pathologySearch && (
                        <button onClick={() => setPathologySearch('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Horizontal Scrollable Disease Chips Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                  {filteredDiseases.map(d => {
                    const isSelected = activeDisease?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedEntity(d)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{d.title}</span>
                        {d.icdCode && (
                          <span className={`text-[10px] px-1 rounded font-mono ${isSelected ? 'bg-blue-500 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            {d.icdCode}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {filteredDiseases.length === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 py-1 italic">No pathology profiles matching "{pathologySearch}"</div>
                  )}
                </div>
              </div>

              {/* Full-Width Scrollable Active Disease Profile View */}
              <div className="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm max-h-[700px] overflow-y-auto space-y-5 pr-2 text-slate-900 dark:text-slate-100">
                {activeDisease ? (
                  <>
                    {/* Header / Meta Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            Pathology Profile
                          </span>
                          {activeDisease.icdCode && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded-md">
                              ICD-11: {activeDisease.icdCode}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{activeDisease.title}</h2>
                        <p className="text-xs text-slate-600 mt-1">{activeDisease.summary}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={e => toggleBookmark(activeDisease.id, e)}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            bookmarks.includes(activeDisease.id)
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${bookmarks.includes(activeDisease.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span>{bookmarks.includes(activeDisease.id) ? 'Saved' : 'Save'}</span>
                        </button>

                        <button
                          onClick={handlePrintSummary}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="hidden sm:inline">Print</span>
                        </button>
                      </div>
                    </div>

                    {/* Prognosis & Classification Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">ICD-11 Code</div>
                        <div className="text-sm font-mono font-bold text-blue-600">{activeDisease.icdCode || 'N/A'}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Clinical Classification</div>
                        <div className="text-xs font-semibold text-slate-800 capitalize">{activeDisease.category}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Prognosis</div>
                        <div className="text-[11px] font-medium text-slate-800">{activeDisease.details.prognosis || 'Favorable with timely clinical intervention'}</div>
                      </div>
                    </div>

                    {/* Pathophysiology & Etiology */}
                    <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                      <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Stethoscope className="text-blue-600 w-4 h-4" /> Pathophysiology & Etiology Overview
                      </h3>
                      {activeDisease.details.overview && (
                        <p className="text-xs text-slate-700 leading-relaxed">{activeDisease.details.overview}</p>
                      )}
                      {activeDisease.details.etiology && (
                        <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 text-[11px] text-blue-900 space-y-1">
                          <span className="font-bold uppercase tracking-wider block text-[10px] text-blue-800">Cellular Mechanism & Etiology:</span>
                          <p className="leading-relaxed">{activeDisease.details.etiology}</p>
                        </div>
                      )}
                    </div>

                    {/* Symptoms & Clinical Presentation */}
                    {activeDisease.details.symptoms && activeDisease.details.symptoms.length > 0 && (
                      <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Activity className="text-rose-500 w-4 h-4" /> Key Clinical Symptoms & Presentation
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {activeDisease.details.symptoms.map((symptom, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-medium rounded-lg">
                              • {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Etiology & Causes */}
                    {activeDisease.details.causes && activeDisease.details.causes.length > 0 && (
                      <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <AlertTriangle className="text-amber-500 w-4 h-4" /> Etiology & Predisposing Causes
                        </h3>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {activeDisease.details.causes.map((cause, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{cause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Diagnostic Criteria */}
                    {activeDisease.details.diagnostics && activeDisease.details.diagnostics.length > 0 && (
                      <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <FileText className="text-teal-600 w-4 h-4" /> Diagnostic Criteria & Imaging / Labs
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeDisease.details.diagnostics.map((diag, idx) => (
                            <div key={idx} className="p-2.5 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-teal-900 flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{diag}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Treatment Protocols */}
                    {activeDisease.details.treatment && activeDisease.details.treatment.length > 0 && (
                      <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Pill className="text-emerald-600 w-4 h-4" /> Standard Management & Clinical Protocols
                        </h3>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {activeDisease.details.treatment.map((rx, idx) => (
                            <li key={idx} className="flex items-start gap-2 p-2 bg-emerald-50/40 border border-emerald-100/80 rounded-lg">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{rx}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Potential Complications */}
                    {activeDisease.details.complications && activeDisease.details.complications.length > 0 && (
                      <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <ShieldAlert className="text-rose-600 w-4 h-4" /> Potential Complications
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {activeDisease.details.complications.map((comp, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-lg">
                              ⚠️ {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">Select a pathology condition to view its complete disease profile.</div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: PHARMACOLOGY & RX */}
          {activeNavTab === "pharmacology" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Category Dropdown & Sidebar */}
              <div className="lg:col-span-1 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-3 text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">Pharmacology Categories</h3>
                </div>

                {/* Drop-Down Category Selector */}
                <div className="relative">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 dark:bg-slate-800/90 border border-emerald-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-emerald-900 dark:text-emerald-200 shadow-2xs">
                    <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 shrink-0">Class:</span>
                    <select
                      id="pharma-category-select"
                      aria-label="Pharmacology Category"
                      value={selectedDrugCategory}
                      onChange={(e) => setSelectedDrugCategory(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-emerald-950 dark:text-white focus:outline-none cursor-pointer truncate pr-1"
                    >
                      {[
                        "All",
                        "Analgesics & NSAIDs",
                        "Antibiotics & Anti-infectives",
                        "Antihypertensives & Cardiorespiratory",
                        "Endocrine & Metabolic",
                        "Gastrointestinal",
                        "CNS & Psych",
                        "Respiratory & Anti-inflammatory"
                      ].map(cat => (
                        <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 pointer-events-none" />
                  </div>
                </div>

                {/* Vertical List of Categories */}
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  {[
                    "All",
                    "Analgesics & NSAIDs",
                    "Antibiotics & Anti-infectives",
                    "Antihypertensives & Cardiorespiratory",
                    "Endocrine & Metabolic",
                    "Gastrointestinal",
                    "CNS & Psych",
                    "Respiratory & Anti-inflammatory"
                  ].map(cat => {
                    const count = cat === "All" ? 30 : (
                      cat === "Analgesics & NSAIDs" ? 5 :
                      cat === "Antibiotics & Anti-infectives" ? 4 :
                      cat === "Antihypertensives & Cardiorespiratory" ? 7 :
                      cat === "Endocrine & Metabolic" ? 2 :
                      cat === "Gastrointestinal" ? 2 :
                      cat === "CNS & Psych" ? 5 : 5
                    );
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedDrugCategory(cat)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          selectedDrugCategory === cat 
                            ? 'bg-emerald-600 text-white shadow-2xs' 
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          selectedDrugCategory === cat ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm text-slate-900 dark:text-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">Interactive Pharmacology & Rx Database</h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-300">Showing topics for category: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedDrugCategory}</span></p>
                    </div>

                    {/* Drop-Down Active Drug Selector & Search Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Active Agent Drop-down Select */}
                      <div className="relative w-full sm:w-60">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-2xs">
                          <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 shrink-0">Agent:</span>
                          <select
                            id="pharma-active-agent-select"
                            aria-label="Select Active Drug Agent"
                            value={liveDrugName}
                            onChange={(e) => setLiveDrugName(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-slate-950 dark:text-white focus:outline-none cursor-pointer truncate pr-1"
                          >
                            {(selectedDrugCategory === "All" ? [
                              "Ibuprofen", "Lisinopril", "Aspirin", "Metformin", "Atorvastatin",
                              "Amoxicillin", "Azithromycin", "Omeprazole", "Levothyroxine", "Gabapentin",
                              "Amlodipine", "Sertraline", "Simvastatin", "Montelukast", "Albuterol",
                              "Warfarin", "Furosemide", "Prednisone", "Citalopram", "Tramadol",
                              "Doxycycline", "Escitalopram", "Ciprofloxacin", "Pantoprazole", "Meloxicam",
                              "Duloxetine", "Hydrochlorothiazide", "Metoprolol", "Losartan", "Acetaminophen"
                            ] : (
                              selectedDrugCategory === "Analgesics & NSAIDs" ? ["Ibuprofen", "Aspirin", "Acetaminophen", "Tramadol", "Meloxicam"] :
                              selectedDrugCategory === "Antibiotics & Anti-infectives" ? ["Amoxicillin", "Azithromycin", "Doxycycline", "Ciprofloxacin"] :
                              selectedDrugCategory === "Antihypertensives & Cardiorespiratory" ? ["Lisinopril", "Amlodipine", "Metoprolol", "Losartan", "Hydrochlorothiazide", "Simvastatin", "Atorvastatin"] :
                              selectedDrugCategory === "Endocrine & Metabolic" ? ["Metformin", "Levothyroxine"] :
                              selectedDrugCategory === "Gastrointestinal" ? ["Omeprazole", "Pantoprazole"] :
                              selectedDrugCategory === "CNS & Psych" ? ["Gabapentin", "Sertraline", "Citalopram", "Escitalopram", "Duloxetine"] :
                              ["Montelukast", "Albuterol", "Prednisone", "Warfarin", "Furosemide"]
                            ))
                              .filter(drug => !drugSearch.trim() || drug.toLowerCase().includes(drugSearch.toLowerCase()))
                              .map(drug => (
                                <option key={drug} value={drug} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                  {drug}
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
                        </div>
                      </div>

                      {/* Drug Search Input */}
                      <div className="relative w-full sm:w-44">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search drug..."
                          value={drugSearch}
                          onChange={(e) => setDrugSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                        {drugSearch && (
                          <button onClick={() => setDrugSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Drug Topics Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-3 mb-4 max-w-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {(selectedDrugCategory === "All" ? [
                      "Ibuprofen", "Lisinopril", "Aspirin", "Metformin", "Atorvastatin",
                      "Amoxicillin", "Azithromycin", "Omeprazole", "Levothyroxine", "Gabapentin",
                      "Amlodipine", "Sertraline", "Simvastatin", "Montelukast", "Albuterol",
                      "Warfarin", "Furosemide", "Prednisone", "Citalopram", "Tramadol",
                      "Doxycycline", "Escitalopram", "Ciprofloxacin", "Pantoprazole", "Meloxicam",
                      "Duloxetine", "Hydrochlorothiazide", "Metoprolol", "Losartan", "Acetaminophen"
                    ] : (
                      selectedDrugCategory === "Analgesics & NSAIDs" ? ["Ibuprofen", "Aspirin", "Acetaminophen", "Tramadol", "Meloxicam"] :
                      selectedDrugCategory === "Antibiotics & Anti-infectives" ? ["Amoxicillin", "Azithromycin", "Doxycycline", "Ciprofloxacin"] :
                      selectedDrugCategory === "Antihypertensives & Cardiorespiratory" ? ["Lisinopril", "Amlodipine", "Metoprolol", "Losartan", "Hydrochlorothiazide", "Simvastatin", "Atorvastatin"] :
                      selectedDrugCategory === "Endocrine & Metabolic" ? ["Metformin", "Levothyroxine"] :
                      selectedDrugCategory === "Gastrointestinal" ? ["Omeprazole", "Pantoprazole"] :
                      selectedDrugCategory === "CNS & Psych" ? ["Gabapentin", "Sertraline", "Citalopram", "Escitalopram", "Duloxetine"] :
                      ["Montelukast", "Albuterol", "Prednisone", "Warfarin", "Furosemide"]
                    ))
                      .filter(drug => !drugSearch.trim() || drug.toLowerCase().includes(drugSearch.toLowerCase()))
                      .map(drug => (
                        <button
                          key={drug}
                          onClick={() => setLiveDrugName(drug)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                            liveDrugName.toLowerCase() === drug.toLowerCase() ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {drug}
                        </button>
                      ))}
                  </div>

                {apiLoading ? (
                  <PharmacologySkeletonLoader />
                ) : apiError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-700 text-xs">
                    {apiError}
                  </div>
                ) : apiData ? (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl gap-3">
                      <div>
                        <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">Active Pharmaceutical Agent</div>
                        <h3 className="text-lg font-bold capitalize">{apiData.query}</h3>
                      </div>
                      {apiData.rxcui && (
                        <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[11px] font-mono">
                          ID: <span className="text-emerald-400 font-bold">{apiData.rxcui}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-2">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500" /> Indications & Usage
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          {apiData.fdaLabel?.indications_and_usage?.[0] || "No specific indications available for this query."}
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-2">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Warnings & Contraindications
                        </h4>
                        <p className="text-[11px] text-rose-900 bg-rose-50 p-2.5 rounded-md border border-rose-100 leading-relaxed">
                          {apiData.fdaLabel?.warnings?.[0] || apiData.fdaLabel?.contraindications?.[0] || "No critical warnings logged for this agent."}
                        </p>
                      </div>
                    </div>

                    {/* Interaction Checker */}
                    <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                      <h4 className="font-bold text-xs mb-3 flex items-center gap-1.5 text-amber-400">
                        <HeartPulse className="w-4 h-4" /> Drug-Drug Interaction Checker
                      </h4>
                      {apiData.interactions && apiData.interactions.length > 0 ? (
                        <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                          {apiData.interactions.map((inter, i) => (
                            <div key={i} className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-[11px] space-y-0.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-amber-300">{apiData.query} + {inter.interacting_drug}</span>
                                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold uppercase text-[9px]">{inter.severity}</span>
                              </div>
                              <p className="text-slate-400 text-[10px]">{inter.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No high-severity interactions reported for {apiData.query}.</p>
                      )}
                    </div>

                    {/* D3.js Force-Directed Interaction Network Graph */}
                    <DrugInteractionGraph 
                      initialDrug={liveDrugName} 
                      drugList={polypharmacyRegimen}
                      onDrugListChange={setPolypharmacyRegimen}
                      patientAge={patientAge}
                      patientWeight={patientWeight}
                      onPatientMetricsChange={({ age, weight }) => {
                        setPatientAge(age);
                        setPatientWeight(weight);
                      }}
                    />

                    {/* Clinical Records Section */}
                    {apiData.fhirResources && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-blue-600" /> Clinical Records & Parameters
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">MedicationStatement</span>
                            <div className="text-[11px] text-slate-700">
                              <div>Status: {apiData.fhirResources.medicationStatements?.[0]?.status || 'active'}</div>
                              <div>Code: {apiData.fhirResources.medicationStatements?.[0]?.medicationCodeableConcept?.text}</div>
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-rose-600 uppercase">Condition ({apiData.fhirResources.conditions?.length || 0})</span>
                            <div className="text-[11px] text-slate-700 truncate">
                              {apiData.fhirResources.conditions?.[0]?.code?.text || 'None logged'}
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Observation ({apiData.fhirResources.observations?.length || 0})</span>
                            <div className="text-[11px] text-slate-700 truncate">
                              {apiData.fhirResources.observations?.[0]?.valueString || 'No safety observations'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: DIAGNOSTICS & ANATOMY */}
          {activeNavTab === "diagnostics" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="space-y-4">
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Diagnostic Criteria & Laboratory Reference</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">Standardized clinical guidelines for laboratory interpretation</p>
                  </div>

                  {/* Dropdown & Search Controls for Diagnostics */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    {/* Category Drop-Down */}
                    <div className="relative w-full sm:w-56">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/80 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700 rounded-lg text-xs font-semibold text-purple-900 dark:text-purple-200 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300 shrink-0">Domain:</span>
                        <select
                          id="diagnostics-category-select"
                          aria-label="Diagnostics Domain Category"
                          value={selectedDiagnosticCategory}
                          onChange={(e) => setSelectedDiagnosticCategory(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-purple-950 dark:text-white focus:outline-none cursor-pointer truncate pr-1"
                        >
                          <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Domains</option>
                          <option value="diagnostic" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Diagnostic Labs & Testing</option>
                          <option value="anatomy" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Human Anatomy & Systems</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search diagnostics..."
                        value={diagnosticsSearch}
                        onChange={(e) => setDiagnosticsSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                      {diagnosticsSearch && (
                        <button onClick={() => setDiagnosticsSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MEDICAL_DATABASE
                    .filter(e => e.category === 'diagnostic' || e.category === 'anatomy')
                    .filter(e => selectedDiagnosticCategory === "all" || e.category === selectedDiagnosticCategory)
                    .filter(e => !diagnosticsSearch.trim() || e.title.toLowerCase().includes(diagnosticsSearch.toLowerCase()) || e.summary.toLowerCase().includes(diagnosticsSearch.toLowerCase()))
                    .map(item => (
                      <div key={item.id} className="p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-2xs space-y-2">
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50 rounded-full text-[9px] font-bold uppercase">{item.category}</span>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{item.summary}</p>
                        {item.details.diagnostics && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-1">
                            {item.details.diagnostics.map((d, i) => (
                              <div key={i} className="text-[10px] text-slate-700 dark:text-slate-300 flex items-center gap-1 font-mono">
                                <span className="w-1 h-1 rounded-full bg-purple-500 shrink-0" />
                                <span>{d}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: CLINICAL CALCULATORS & TOOLS */}
          {activeNavTab === "tools" && (
            <ClinicalCalculators />
          )}

          {/* TAB 6: SAVED & BOOKMARKS */}
          {activeNavTab === "bookmarks" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="space-y-4">
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Saved Bookmarks & Quick Reference Guides</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">Your personalized clinical collection for rapid bedside review</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search Bar for Bookmarks */}
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search bookmarks..."
                        value={bookmarkSearch}
                        onChange={(e) => setBookmarkSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      {bookmarkSearch && (
                        <button onClick={() => setBookmarkSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={handlePrintSummary}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-2xs shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" /> Export All
                    </button>
                  </div>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No bookmarks saved yet. Click the bookmark icon on any medical entry.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bookmarks
                      .filter(id => {
                        if (!bookmarkSearch.trim()) return true;
                        const entity = MEDICAL_DATABASE.find(e => e.id === id);
                        if (!entity) return false;
                        return entity.title.toLowerCase().includes(bookmarkSearch.toLowerCase()) || entity.summary.toLowerCase().includes(bookmarkSearch.toLowerCase());
                      })
                      .map(id => {
                        const entity = MEDICAL_DATABASE.find(e => e.id === id);
                        if (!entity) return null;
                        return (
                          <div key={entity.id} className="p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded text-[9px] font-bold uppercase">{entity.category}</span>
                                <button onClick={() => toggleBookmark(entity.id)} className="text-amber-500 hover:text-slate-400">
                                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                                </button>
                              </div>
                              <h3 className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">{entity.title}</h3>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{entity.summary}</p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[11px]">
                              <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">{entity.icdCode || entity.rxcui || 'Clinical Guide'}</span>
                              <button 
                                onClick={() => { setSelectedEntity(entity); navigateToTab("dictionary"); }}
                                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                              >
                                Open Profile <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* Scrollable Pop-up View for Selected Entity Guide */}
      {selectedEntity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-5 overflow-y-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 backdrop-blur-2xl border border-blue-200/80 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedEntity(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Index
              </button>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold uppercase">
                    {selectedEntity.category} Profile
                  </span>
                  {selectedEntity.icdCode && <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">ICD-11: {selectedEntity.icdCode}</span>}
                  {selectedEntity.rxcui && <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">RxCUI: {selectedEntity.rxcui}</span>}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{selectedEntity.title}</h2>
              </div>
              <button
                onClick={() => toggleBookmark(selectedEntity.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  bookmarks.includes(selectedEntity.id)
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${bookmarks.includes(selectedEntity.id) ? 'fill-current' : ''}`} />
                {bookmarks.includes(selectedEntity.id) ? 'Bookmarked' : 'Save Bookmark'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/60 rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Executive Summary</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{selectedEntity.summary}</p>
                  {selectedEntity.details.overview && (
                    <p className="text-xs text-slate-700 leading-relaxed mt-2">{selectedEntity.details.overview}</p>
                  )}
                </div>

                {selectedEntity.details.symptoms && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-2.5 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Clinical Symptoms & Manifestations
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {selectedEntity.details.symptoms.map((sym, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-700 p-1.5 bg-rose-50/50 rounded-md">
                          <span className="w-1 h-1 rounded-full bg-rose-500" />
                          {sym}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntity.details.causes && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2.5 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Causes & Etiology
                    </h4>
                    <ul className="space-y-1.5">
                      {selectedEntity.details.causes.map((cause, i) => (
                        <li key={i} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                          <span className="font-bold text-blue-500">•</span> {cause}
                        </li>
                      ))}
                    </ul>
                    {selectedEntity.details.etiology && (
                      <p className="text-[11px] text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 italic">{selectedEntity.details.etiology}</p>
                    )}
                  </div>
                )}

                {selectedEntity.details.diagnostics && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-2.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Diagnostic Criteria & Testing
                    </h4>
                    <ul className="space-y-1.5">
                      {selectedEntity.details.diagnostics.map((diag, i) => (
                        <li key={i} className="text-[11px] text-slate-700 p-1.5 bg-purple-50/50 rounded-md flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          {diag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedEntity.details.treatment && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-2.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> Treatment Protocols
                    </h4>
                    <ul className="space-y-1.5">
                      {selectedEntity.details.treatment.map((tr, i) => (
                        <li key={i} className="text-[11px] text-emerald-900 flex items-start gap-1.5">
                          <span className="font-bold text-emerald-600">✓</span> {tr}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedEntity.details.dosage && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-blue-600" /> Dosage & Administration
                    </h4>
                    <div className="text-[11px] text-blue-900">
                      <div className="font-bold mb-0.5">Dosage:</div>
                      <p className="bg-white/80 p-2 rounded-md border border-blue-100">{selectedEntity.details.dosage}</p>
                    </div>
                    <div className="text-[11px] text-blue-900">
                      <div className="font-bold mb-0.5">Administration:</div>
                      <p className="bg-white/80 p-2 rounded-md border border-blue-100">{selectedEntity.details.administration}</p>
                    </div>
                  </div>
                )}

                {selectedEntity.details.sideEffects && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Side Effects & Contraindications
                    </h4>
                    <div className="space-y-1.5">
                      {selectedEntity.details.sideEffects.map((se, i) => (
                        <div key={i} className="text-[11px] text-amber-900 bg-white/80 p-1.5 rounded-md border border-amber-100">
                          • {se}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntity.details.complications && (
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-800 mb-2">Potential Complications</h4>
                    <ul className="space-y-1">
                      {selectedEntity.details.complications.map((c, i) => (
                        <li key={i} className="text-[11px] text-rose-900">⚠️ {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar (Mirror Glass style, auto-hide on scroll) */}
      <AnimatePresence>
        {navVisible && (
          <motion.nav 
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl border border-white/50 dark:border-slate-700/80 shadow-2xl shadow-slate-900/15 dark:shadow-black/40 rounded-full p-1 flex items-center gap-0.5 max-w-[92vw] overflow-x-auto no-scrollbar"
          >
            {[
              { id: 'dictionary', label: 'Dictionary', shortLabel: 'Dict', emoji: '📚', title: 'Medical Dictionary' },
              { id: 'foundations', label: 'Foundations', shortLabel: 'Found', emoji: '🏛️', title: 'Foundational Medical Sciences' },
              { id: 'pathology', label: 'Pathology', shortLabel: 'Path', emoji: '🩺', title: 'Pathology Index' },
              { id: 'pharmacology', label: 'Pharmacology', shortLabel: 'Pharm', emoji: '💊', title: 'Pharmacology & Interaction Graph' },
              { id: 'diagnostics', label: 'Diagnostics', shortLabel: 'Diag', emoji: '📋', title: 'Diagnostics & Anatomy' },
              { id: 'tools', label: 'Tools', shortLabel: 'Tools', emoji: '🧮', title: 'Clinical Calculators & Tools' },
              { id: 'bookmarks', label: 'Bookmarks', shortLabel: 'Saved', emoji: '⭐', title: 'Saved Bookmarks' },
            ].map(tab => {
              const isActive = activeNavTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    navigateToTab(tab.id as any);
                    showToast(`Navigated to ${tab.title}`, tab.emoji, "info");
                  }}
                  title={tab.title}
                  className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 dark:bg-blue-600 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs">{tab.emoji}</span>
                  <span className={`text-[10px] sm:text-[11px] font-bold ${isActive ? 'inline' : 'hidden sm:inline'}`}>
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
