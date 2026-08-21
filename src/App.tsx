/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { jsPDF } from "jspdf";
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
  Check,
  X,
  Share2,
  ChevronLeft,
  Globe,
  Loader2,
  Sun,
  Moon,
  ChevronDown,
  Filter,
  History,
  Trash2
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
  IcdSearchSkeletonLoader,
  PathologyProfileSkeletonLoader
} from "./components/SkeletonLoaders";
import { fetchDirectMedicationData } from "./lib/medicationService";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
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
  const [isPathologyLoading, setIsPathologyLoading] = useState(false);

  // Transient subtle skeleton screen effect when switching disease entities or search
  useEffect(() => {
    setIsPathologyLoading(true);
    const timer = setTimeout(() => {
      setIsPathologyLoading(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [selectedEntity?.id, pathologySearch]);

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

  const [allergies, setAllergies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('splendid_patient_allergies');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return ["Sulfa drugs", "Ibuprofen"];
  });

  useEffect(() => {
    try {
      localStorage.setItem('splendid_patient_allergies', JSON.stringify(allergies));
    } catch (e) {
      // ignore
    }
  }, [allergies]);

  const [newAllergy, setNewAllergy] = useState("");

  const [acknowledgedConflicts, setAcknowledgedConflicts] = useState<{ drug: string; allergy: string; timestamp: string }[]>(() => {
    try {
      const saved = localStorage.getItem('splendid_acknowledged_conflicts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('splendid_acknowledged_conflicts', JSON.stringify(acknowledgedConflicts));
    } catch (e) {
      // ignore
    }
  }, [acknowledgedConflicts]);

  const handleAcknowledgeConflict = (drug: string, allergy: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    setAcknowledgedConflicts(prev => {
      const exists = prev.some(c => c.drug.toLowerCase() === drug.toLowerCase() && c.allergy.toLowerCase() === allergy.toLowerCase());
      if (exists) return prev;
      return [...prev, { drug, allergy, timestamp }];
    });
    showToast(`Reviewed & Acknowledged conflict for ${drug}`, "✔️", "success");
  };

  const handleReinstateConflict = (drug: string, allergy: string) => {
    setAcknowledgedConflicts(prev => prev.filter(c => !(c.drug.toLowerCase() === drug.toLowerCase() && c.allergy.toLowerCase() === allergy.toLowerCase())));
    showToast(`Conflict warning for ${drug} reinstated`, "🔄", "info");
  };

  const [clinicalNotes, setClinicalNotes] = useState<{ id: string; content: string; timestamp: string }[]>(() => {
    try {
      const saved = localStorage.getItem('splendid_clinical_notes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        id: "1",
        content: "Proceeding with cautious polypharmacy. Renal parameters (Serum Creatinine/eGFR) are monitored bi-weekly.",
        timestamp: "09:12 AM, Aug 21"
      }
    ];
  });

  const [newClinicalNote, setNewClinicalNote] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem('splendid_clinical_notes', JSON.stringify(clinicalNotes));
    } catch (e) {
      // ignore
    }
  }, [clinicalNotes]);

  const handleAddClinicalNote = () => {
    if (!newClinicalNote.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    const note = {
      id: Date.now().toString(),
      content: newClinicalNote.trim(),
      timestamp
    };
    setClinicalNotes(prev => [note, ...prev]);
    setNewClinicalNote("");
    showToast("New clinical note appended to chart.", "📝", "success");
  };

  const handleDeleteClinicalNote = (id: string) => {
    setClinicalNotes(prev => prev.filter(note => note.id !== id));
    showToast("Clinical note removed.", "🗑️", "info");
  };

  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const prevConflictsCount = useRef(-1);
  const prevRegimenLength = useRef(-1);

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
    // Determine the conflicts count dynamically to avoid dependencies lag
    const NSAID_DRUGS = ["ibuprofen", "aspirin", "naproxen", "meloxicam", "diclofenac", "acetaminophen"];
    const ACEI_DRUGS = ["lisinopril", "losartan", "valsartan", "enalapril", "captopril", "spironolactone"];
    const ANTICOAGULANTS = ["warfarin", "heparin", "apixaban", "rivaroxaban", "dabigatran"];
    
    let currentConflicts = 0;
    polypharmacyRegimen.forEach(drug => {
      const dLower = drug.toLowerCase().trim();
      allergies.forEach(allergy => {
        const aLower = allergy.toLowerCase().trim();
        let isConflicting = false;
        
        if (dLower === aLower || dLower.includes(aLower) || aLower.includes(dLower)) {
          isConflicting = true;
        } else if (aLower === "nsaid" || aLower === "nsaids") {
          if (NSAID_DRUGS.includes(dLower)) {
            isConflicting = true;
          }
        } else if (aLower === "ace inhibitor" || aLower === "ace inhibitors" || aLower === "acei" || aLower === "arb" || aLower === "arbs" || aLower === "lisinopril") {
          if (ACEI_DRUGS.includes(dLower)) {
            isConflicting = true;
          }
        } else if (aLower === "sulfa" || aLower === "sulfa drugs" || aLower === "sulfonamides") {
          if (dLower.includes("sulfa") || dLower === "furosemide" || dLower === "hydrochlorothiazide") {
            isConflicting = true;
          }
        } else if (aLower === "anticoagulants" || aLower === "anticoagulant" || aLower === "warfarin") {
          if (ANTICOAGULANTS.includes(dLower)) {
            isConflicting = true;
          }
        }

        if (isConflicting) {
          const isAcked = acknowledgedConflicts.some(
            c => c.drug.toLowerCase() === drug.toLowerCase() && c.allergy.toLowerCase() === allergy.toLowerCase()
          );
          if (!isAcked) {
            currentConflicts++;
          }
        }
      });
    });

    // Check if it is initial mount
    if (prevConflictsCount.current === -1 || prevRegimenLength.current === -1) {
      prevConflictsCount.current = currentConflicts;
      prevRegimenLength.current = polypharmacyRegimen.length;
      return;
    }

    // 1. If conflicts count changes, trigger color-pulse animation
    if (currentConflicts !== prevConflictsCount.current) {
      setPulseTrigger(prev => prev + 1);
    }

    // 2. If a new drug is added AND triggers an active conflict, trigger a shake
    if (polypharmacyRegimen.length > prevRegimenLength.current && currentConflicts > prevConflictsCount.current) {
      setShakeTrigger(prev => prev + 1);
    } else if (currentConflicts > prevConflictsCount.current) {
      // Also shake if a new allergy is added that conflicts with an existing drug
      setShakeTrigger(prev => prev + 1);
    }

    prevConflictsCount.current = currentConflicts;
    prevRegimenLength.current = polypharmacyRegimen.length;
  }, [polypharmacyRegimen, allergies, acknowledgedConflicts]);

  const handleAllergyAdd = (allergyName: string) => {
    const clean = allergyName.trim();
    if (!clean) return;
    if (allergies.some(a => a.toLowerCase() === clean.toLowerCase())) {
      showToast(`${clean} is already logged as an allergy`, "⚠️", "warning");
      return;
    }
    setAllergies([...allergies, clean]);
    setNewAllergy("");
    showToast(`Added "${clean}" to patient allergies`, "🚨", "success");
  };

  const handleAllergyRemove = (allergyToRemove: string) => {
    setAllergies(allergies.filter(a => a.toLowerCase() !== allergyToRemove.toLowerCase()));
    showToast(`Removed "${allergyToRemove}" allergy`, "🗑️", "info");
  };

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

  // Memoized Patient Allergy Conflicts Engine with Cross-Sensitivity logic
  const allergyConflicts = useMemo(() => {
    const list: { drug: string; allergy: string; reason: string }[] = [];
    
    const NSAID_DRUGS = ["ibuprofen", "aspirin", "naproxen", "meloxicam", "diclofenac", "acetaminophen"];
    const ACEI_DRUGS = ["lisinopril", "losartan", "valsartan", "enalapril", "captopril", "spironolactone"];
    const ANTICOAGULANTS = ["warfarin", "heparin", "apixaban", "rivaroxaban", "dabigatran"];
    
    polypharmacyRegimen.forEach(drug => {
      const dLower = drug.toLowerCase().trim();
      allergies.forEach(allergy => {
        const aLower = allergy.toLowerCase().trim();
        
        // Direct matches or substrings
        if (dLower === aLower || dLower.includes(aLower) || aLower.includes(dLower)) {
          list.push({
            drug,
            allergy,
            reason: `Direct contradiction: "${drug}" conflicts with patient's allergy to "${allergy}"`
          });
          return;
        }
        
        // Group & Class matching
        if (aLower === "nsaid" || aLower === "nsaids") {
          if (NSAID_DRUGS.includes(dLower)) {
            list.push({
              drug,
              allergy,
              reason: `Cross-sensitivity: "${drug}" is a class-conflicting NSAID`
            });
          }
        }
        if (aLower === "ace inhibitor" || aLower === "ace inhibitors" || aLower === "acei" || aLower === "arb" || aLower === "arbs" || aLower === "lisinopril") {
          if (ACEI_DRUGS.includes(dLower)) {
            list.push({
              drug,
              allergy,
              reason: `Cross-sensitivity: "${drug}" is a class-conflicting ACE Inhibitor / ARB`
            });
          }
        }
        if (aLower === "sulfa" || aLower === "sulfa drugs" || aLower === "sulfonamides") {
          if (dLower.includes("sulfa") || dLower === "furosemide" || dLower === "hydrochlorothiazide") {
            list.push({
              drug,
              allergy,
              reason: `Cross-sensitivity: "${drug}" contains a cross-reactive sulfonamide chemical structure`
            });
          }
        }
        if (aLower === "anticoagulants" || aLower === "anticoagulant" || aLower === "warfarin") {
          if (ANTICOAGULANTS.includes(dLower)) {
            list.push({
              drug,
              allergy,
              reason: `Cross-sensitivity: "${drug}" is a class-conflicting anticoagulant`
            });
          }
        }
      });
    });
    
    return list;
  }, [polypharmacyRegimen, allergies]);

  const activeAllergyConflicts = useMemo(() => {
    return allergyConflicts.filter(conflict => {
      return !acknowledgedConflicts.some(
        ack => ack.drug.toLowerCase() === conflict.drug.toLowerCase() && ack.allergy.toLowerCase() === conflict.allergy.toLowerCase()
      );
    });
  }, [allergyConflicts, acknowledgedConflicts]);

  const handlePrintSummary = useCallback(() => {
    showToast("Preparing clinical summary for export...", "🖨️", "info");
    window.print();
  }, []);

  const handleDownloadClinicalPDF = useCallback(() => {
    try {
      showToast("Compiling clinical data into PDF report...", "📄", "info");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Color palette definitions
      const primaryColor = [15, 23, 42]; // Slate 900
      const secondaryColor = [71, 85, 105]; // Slate 600
      const dangerColor = [225, 29, 72]; // Rose 600
      const successColor = [5, 150, 105]; // Emerald 600
      const dividerColor = [226, 232, 240]; // Slate 200

      // Title & Header Banner
      doc.setFillColor(15, 23, 42); // slate 900
      doc.rect(0, 0, 210, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SPLENDID MED-REF CLINICAL REPORT", 14, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate 400
      doc.text("Clinical Decision Support & Polypharmacy EMR Synced Summary", 14, 22);
      
      // Timestamp
      const currentDateStr = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      });
      doc.text(`Generated: ${currentDateStr}`, 196, 22, { align: "right" });

      // Patient Health Chart Card
      let y = 42;
      doc.setFillColor(248, 250, 252); // slate 50
      doc.rect(14, y, 182, 22, "F");
      doc.setDrawColor(203, 213, 225); // slate 300
      doc.rect(14, y, 182, 22, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PATIENT HEALTH CHART SUMMARY", 18, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Chart ID: #PM-88126`, 18, y + 11);
      doc.text(`Demographics: Male, ${patientAge} Years | ${patientWeight} kg`, 18, y + 16);
      
      doc.text(`Clinical Conditions: Stage 3 CKD`, 110, y + 11);
      doc.text(`eGFR Clearance: 45 mL/min (Moderate Impairment)`, 110, y + 16);

      // Documented Allergies Section
      y += 30;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("DOCUMENTED DRUG ALLERGIES / CROSS-SENSITIVITIES", 14, y);
      
      doc.setDrawColor(226, 232, 240); // slate 200
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      if (allergies.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("No drug allergies documented for this patient profile.", 14, y);
        y += 6;
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(190, 24, 74); // Rose danger text
        
        const chunkedAllergies = [];
        const tempArray = [...allergies];
        while (tempArray.length > 0) {
          chunkedAllergies.push(tempArray.splice(0, 3));
        }

        chunkedAllergies.forEach((row) => {
          let xOffset = 14;
          row.forEach((allergy) => {
            doc.setFillColor(254, 242, 242);
            doc.rect(xOffset, y - 4, 54, 6, "F");
            doc.setDrawColor(254, 205, 211);
            doc.rect(xOffset, y - 4, 54, 6, "D");
            doc.text(`* Allergy to: ${allergy}`, xOffset + 3, y);
            xOffset += 61;
          });
          y += 8;
        });
      }

      // Polypharmacy Medication Regimen Section
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("CURRENT ACTIVE POLYPHARMACY REGIMEN", 14, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      if (polypharmacyRegimen.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("No active medications in current regimen.", 14, y);
        y += 6;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        
        const chunkedRegimen = [];
        const tempRegArray = [...polypharmacyRegimen];
        while (tempRegArray.length > 0) {
          chunkedRegimen.push(tempRegArray.splice(0, 3));
        }

        chunkedRegimen.forEach((row) => {
          let xOffset = 14;
          row.forEach((drug) => {
            doc.setFillColor(248, 250, 252);
            doc.rect(xOffset, y - 4, 54, 6, "F");
            doc.setDrawColor(226, 232, 240);
            doc.rect(xOffset, y - 4, 54, 6, "D");
            doc.setFont("helvetica", "bold");
            doc.text(drug, xOffset + 3, y);
            xOffset += 61;
          });
          y += 8;
        });
      }

      // Active Allergy Conflicts Section
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("CRITICAL ACTIVE ALLERGY CONFLICT WARNINGS", 14, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      if (activeAllergyConflicts.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105); // emerald
        doc.text("PASSED: No active or unacknowledged clinical allergy conflicts detected in this profile.", 14, y);
        y += 8;
      } else {
        activeAllergyConflicts.forEach((conflict) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFillColor(254, 242, 242);
          doc.rect(14, y - 4, 182, 12, "F");
          doc.setDrawColor(248, 113, 113);
          doc.rect(14, y - 4, 182, 12, "D");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(153, 27, 27); // dark red
          doc.text(`[WARNING] Conflict: ${conflict.drug} vs Patient Allergy to ${conflict.allergy}`, 18, y + 1);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(127, 29, 29);
          doc.text(conflict.reason, 18, y + 5);
          y += 15;
        });
      }

      // Reviewed / Acknowledged Warnings Section
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("CLINICIAN-REVIEWED & ACKNOWLEDGED CONFLICTS", 14, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      if (acknowledgedConflicts.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("No conflicts have been marked as reviewed or acknowledged during this session.", 14, y);
        y += 8;
      } else {
        acknowledgedConflicts.forEach((ack) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFillColor(240, 253, 250); // green 50
          doc.rect(14, y - 4, 182, 12, "F");
          doc.setDrawColor(110, 231, 183); // emerald border
          doc.rect(14, y - 4, 182, 12, "D");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(6, 95, 70); // emerald 800
          doc.text(`[ACKNOWLEDGED] Resolved: ${ack.drug} vs Allergy to ${ack.allergy}`, 18, y + 1);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`Status: Verified & Acknowledged by clinician on ${ack.timestamp}`, 18, y + 5);
          y += 15;
        });
      }

      // Clinical Notes / Justification Annotations
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("CLINICAL CHART NOTES & JUSTIFICATIONS", 14, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      if (clinicalNotes.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("No custom clinical chart notes or justifications appended.", 14, y);
        y += 8;
      } else {
        clinicalNotes.forEach((note) => {
          const lines = doc.splitTextToSize(note.content, 174);
          const boxHeight = 8 + (lines.length * 4);
          if (y + boxHeight > 275) {
            doc.addPage();
            y = 20;
          }
          doc.setFillColor(248, 250, 252); // slate 50
          doc.rect(14, y - 4, 182, boxHeight, "F");
          doc.setDrawColor(226, 232, 240); // slate 200
          doc.rect(14, y - 4, 182, boxHeight, "D");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(lines, 18, y + 1);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(`Recorded: ${note.timestamp}`, 18, y + (lines.length * 4) + 1);
          y += boxHeight + 4;
        });
      }

      // Disclaimer & Signature Block
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 196, y);
      
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("CLINICAL REVIEWER SIGN-OFF", 14, y);
      
      doc.setFont("helvetica", "normal");
      doc.text("Authorized Clinician Signature: ____________________________________", 14, y + 8);
      doc.text("Review Date: ________________________", 124, y + 8);

      // Disclaimer footer text
      y += 18;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      const disclaimerLines = [
        "Splendid Med-Ref Clinical Systems provides drug interaction and cross-sensitivity information for decision support purposes only.",
        "The clinical supervisor retains full and final legal responsibility for patient therapeutics and dosage determinations."
      ];
      disclaimerLines.forEach((line, i) => {
        doc.text(line, 14, y + (i * 3.5));
      });

      // Save the generated document
      doc.save(`Clinical_Report_PM-88126_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("PDF clinical report downloaded!", "📄", "success");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast("Failed to compile clinical PDF.", "❌", "error");
    }
  }, [patientAge, patientWeight, allergies, polypharmacyRegimen, activeAllergyConflicts, acknowledgedConflicts, clinicalNotes]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none transition-colors duration-200">
      {/* Mirror Glass Fast Rotating Capsule Emoji Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] text-white p-6 select-none"
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
          
          {/* PERSISTENT PATIENT ALLERGY & CROSS-SENSITIVITY BANNER */}
          <motion.div 
            id="patient-allergy-banner"
            layout="position"
            key={`allergy-banner-${pulseTrigger}-${shakeTrigger}`}
            initial={false}
            animate={{
              x: shakeTrigger > 0 ? [0, -10, 10, -10, 10, -5, 5, 0] : 0,
            }}
            transition={{
              x: { duration: 0.45, ease: "easeInOut" }
            }}
            className={`w-full backdrop-blur-xl border rounded-xl p-4 transition-all duration-300 ${
              activeAllergyConflicts.length > 0 
                ? 'border-rose-500/60 dark:border-rose-800/80 shadow-lg shadow-rose-500/5 animate-allergy-pulse-danger' 
                : 'border-slate-200/80 dark:border-slate-800/80 shadow-xs animate-allergy-pulse-safe'
            }`}
          >
            {/* Upper Info Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">Pt</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Active Patient Chart: #PM-88126</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono">EMR Synced</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Male, {patientAge} Years | {patientWeight} kg | ClCr (eGFR): <span className="font-bold text-amber-600 dark:text-amber-400">45 mL/min</span> (Stage 3 CKD)
                  </p>
                </div>
              </div>

              {/* Conflict Status Tag & Download Action */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadClinicalPDF}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Generate and download full clinical report PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {activeAllergyConflicts.length > 0 ? (
                  <div className="px-2.5 py-1 bg-rose-500/10 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{activeAllergyConflicts.length} Allergy Conflict{activeAllergyConflicts.length > 1 ? 's' : ''} Detected</span>
                  </div>
                ) : (
                  <div className="px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>No Allergy Conflicts</span>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Row: Documented Allergies & Input */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3">
              {/* Left & Middle: Allergies Badges List */}
              <div className="lg:col-span-2 space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Documented Drug Allergies / Cross-Sensitivities:</span>
                </div>
                
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map(allergy => {
                      // Check if this specific allergy has any active conflict
                      const hasConflict = activeAllergyConflicts.some(c => c.allergy.toLowerCase() === allergy.toLowerCase());
                      return (
                        <span 
                          key={allergy}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                            hasConflict 
                              ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60 ring-2 ring-rose-500 animate-pulse'
                              : 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {hasConflict && <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />}
                          <span>{allergy}</span>
                          <button 
                            onClick={() => handleAllergyRemove(allergy)}
                            className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded transition-colors ml-1"
                            title={`Remove ${allergy}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No documented drug allergies. Add allergies to evaluate safety.</p>
                )}

                {/* Quick Presets for Allergies */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Quick Add:</span>
                  {["Penicillin", "Sulfa drugs", "NSAIDs", "Aspirin", "Lisinopril"].map(preset => {
                    const exists = allergies.some(a => a.toLowerCase() === preset.toLowerCase());
                    return (
                      <button
                        key={preset}
                        onClick={() => handleAllergyAdd(preset)}
                        disabled={exists}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                          exists 
                            ? 'bg-slate-50 dark:bg-slate-850 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                            : 'bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                        }`}
                      >
                        + {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Input To Add Custom Allergy */}
              <div className="space-y-2">
                <label htmlFor="custom-allergy-input" className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                  Add Custom Allergen:
                </label>
                <div className="flex gap-1.5">
                  <input 
                    id="custom-allergy-input"
                    type="text"
                    value={newAllergy}
                    onChange={e => setNewAllergy(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAllergyAdd(newAllergy)}
                    placeholder="e.g. Warfarin, Sulfa, Statin"
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-rose-400 shadow-2xs"
                  />
                  <button 
                    onClick={() => handleAllergyAdd(newAllergy)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-750 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Active Conflicts Alerts Drawer */}
            <AnimatePresence initial={false}>
              {activeAllergyConflicts.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3.5 pt-3 border-t border-rose-200/50 dark:border-rose-900/40 space-y-2">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                      ⚠️ Critical Safety Warnings:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {activeAllergyConflicts.map((conflict, index) => (
                        <motion.div 
                          key={`${conflict.drug}-${conflict.allergy}-${shakeTrigger}`}
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ 
                            scale: 1, 
                            opacity: 1,
                            x: shakeTrigger > 0 ? [0, -8, 8, -8, 8, -4, 4, 0] : 0
                          }}
                          transition={{ 
                            x: { duration: 0.45, ease: "easeInOut" },
                            default: { duration: 0.25 }
                          }}
                          className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-100 dark:border-rose-900/50 text-[11px] text-rose-900 dark:text-rose-200 flex items-start justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-rose-950 dark:text-rose-200">
                                {conflict.drug} vs Allergy to {conflict.allergy}
                              </span>
                              <p className="text-rose-800/90 dark:text-rose-300/90 leading-relaxed text-[10px]">
                                {conflict.reason}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleAcknowledgeConflict(conflict.drug, conflict.allergy)}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-rose-600/10 hover:bg-rose-600/20 dark:bg-rose-400/10 dark:hover:bg-rose-400/20 text-rose-800 dark:text-rose-300 border border-rose-500/20 text-[10px] font-bold transition-all cursor-pointer"
                            title="Acknowledge conflict and mark as reviewed"
                          >
                            <Check className="w-3 h-3" />
                            <span className="hidden sm:inline">Review</span>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resolved / Acknowledged Conflicts History List */}
            {acknowledgedConflicts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/60">
                <details className="group">
                  <summary className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Reviewed & Acknowledged Warnings ({acknowledgedConflicts.length})
                    </span>
                    <span className="text-[9px] lowercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 group-open:hidden">
                      click to expand history
                    </span>
                  </summary>
                  <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                    {acknowledgedConflicts.map((ack, index) => (
                      <div 
                        key={index}
                        className="p-2.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-lg border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start justify-between gap-2 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300 line-through decoration-slate-400">
                              {ack.drug} vs {ack.allergy}
                            </span>
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1 rounded font-medium">
                              Resolved
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Reviewed on {ack.timestamp}
                          </p>
                        </div>
                        <button
                          onClick={() => handleReinstateConflict(ack.drug, ack.allergy)}
                          className="px-2 py-0.5 rounded bg-slate-200/80 hover:bg-rose-100 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-400 dark:hover:text-rose-300 text-[10px] font-bold transition-colors cursor-pointer border border-slate-300/40"
                          title="Reinstate this conflict warning as active"
                        >
                          Reinstate
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* PERSISTENT CLINICAL NOTES SECTION */}
            <div className="mt-3.5 pt-3.5 border-t border-slate-200/45 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Clinical Chart Notes & Justifications:</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Notes Input Controls */}
                <div className="md:col-span-1 space-y-2">
                  <textarea
                    value={newClinicalNote}
                    onChange={e => setNewClinicalNote(e.target.value)}
                    placeholder="Append clinician annotation, clinical justification, or polypharmacy tolerance rationale..."
                    className="w-full h-20 p-2.5 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-blue-400 transition-all resize-none shadow-2xs"
                  />
                  <button
                    onClick={handleAddClinicalNote}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg border border-blue-500 transition-colors cursor-pointer shadow-xs"
                  >
                    + Append Clinical Note
                  </button>
                </div>

                {/* Notes List Feed */}
                <div className="md:col-span-2 space-y-2 max-h-32 overflow-y-auto pr-1.5 scrollbar-thin">
                  {clinicalNotes.length > 0 ? (
                    clinicalNotes.map(note => (
                      <div 
                        key={note.id}
                        className="p-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/50 rounded-lg flex items-start justify-between gap-3 text-[11px] text-slate-700 dark:text-slate-300 shadow-2xs hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-0.5 leading-relaxed">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">
                            Recorded on {note.timestamp}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClinicalNote(note.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-450 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-5">
                      <p className="text-[10.5px] text-slate-450 italic">No custom clinical notes recorded. Use the text box to document clinical justifications.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          
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
              {isPathologyLoading ? (
                <PathologyProfileSkeletonLoader />
              ) : (
                <div className="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm max-h-[700px] overflow-y-auto space-y-5 pr-2 text-slate-900 dark:text-slate-100">
                  {activeDisease ? (
                    <>
                      {/* Header / Meta Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 text-[10px] font-bold rounded-md uppercase tracking-wider">
                              Pathology Profile
                            </span>
                            {activeDisease.icdCode && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded-md">
                                ICD-11: {activeDisease.icdCode}
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeDisease.title}</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{activeDisease.summary}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={e => toggleBookmark(activeDisease.id, e)}
                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              bookmarks.includes(activeDisease.id)
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Bookmark className={`w-4 h-4 ${bookmarks.includes(activeDisease.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            <span>{bookmarks.includes(activeDisease.id) ? 'Saved' : 'Save'}</span>
                          </button>

                          <button
                            onClick={handlePrintSummary}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Print</span>
                          </button>
                        </div>
                      </div>

                      {/* Prognosis & Classification Metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">ICD-11 Code</div>
                          <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{activeDisease.icdCode || 'N/A'}</div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">Clinical Classification</div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">{activeDisease.category}</div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">Prognosis</div>
                          <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200">{activeDisease.details.prognosis || 'Favorable with timely clinical intervention'}</div>
                        </div>
                      </div>

                      {/* Pathophysiology & Etiology */}
                      <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Stethoscope className="text-blue-600 dark:text-blue-400 w-4 h-4" /> Pathophysiology & Etiology Overview
                        </h3>
                        {activeDisease.details.overview && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{activeDisease.details.overview}</p>
                        )}
                        {activeDisease.details.etiology && (
                          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                            <span className="font-bold uppercase tracking-wider block text-[10px] text-blue-800 dark:text-blue-300">Cellular Mechanism & Etiology:</span>
                            <p className="leading-relaxed">{activeDisease.details.etiology}</p>
                          </div>
                        )}
                      </div>

                      {/* Symptoms & Clinical Presentation */}
                      {activeDisease.details.symptoms && activeDisease.details.symptoms.length > 0 && (
                        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Activity className="text-rose-500 dark:text-rose-400 w-4 h-4" /> Key Clinical Symptoms & Presentation
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {activeDisease.details.symptoms.map((symptom, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs font-medium rounded-lg">
                                • {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Etiology & Causes */}
                      {activeDisease.details.causes && activeDisease.details.causes.length > 0 && (
                        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <AlertTriangle className="text-amber-500 dark:text-amber-400 w-4 h-4" /> Etiology & Predisposing Causes
                          </h3>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {activeDisease.details.causes.map((cause, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-amber-500 dark:text-amber-400 font-bold">•</span>
                                <span>{cause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Diagnostic Criteria */}
                      {activeDisease.details.diagnostics && activeDisease.details.diagnostics.length > 0 && (
                        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileText className="text-teal-600 dark:text-teal-400 w-4 h-4" /> Diagnostic Criteria & Imaging / Labs
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeDisease.details.diagnostics.map((diag, idx) => (
                              <div key={idx} className="p-2.5 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 rounded-lg text-xs text-teal-900 dark:text-teal-200 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span>{diag}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Treatment Protocols */}
                      {activeDisease.details.treatment && activeDisease.details.treatment.length > 0 && (
                        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Pill className="text-emerald-600 dark:text-emerald-400 w-4 h-4" /> Standard Management & Clinical Protocols
                          </h3>
                          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                            {activeDisease.details.treatment.map((rx, idx) => (
                              <li key={idx} className="flex items-start gap-2 p-2 bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-900/40 rounded-lg">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                                <span>{rx}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Potential Complications */}
                      {activeDisease.details.complications && activeDisease.details.complications.length > 0 && (
                        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <ShieldAlert className="text-rose-600 dark:text-rose-400 w-4 h-4" /> Potential Complications
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {activeDisease.details.complications.map((comp, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg">
                                ⚠️ {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">Select a pathology condition to view its complete disease profile.</div>
                  )}
                </div>
              )}
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
                      allergies={allergies}
                      acknowledgedConflicts={acknowledgedConflicts}
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
