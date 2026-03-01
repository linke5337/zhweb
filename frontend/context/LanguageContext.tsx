"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Locale, Translations } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "ja",
  setLocale: () => {},
  t: translations.ja,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("zhweb_locale") as Locale;
    if (saved && ["ja", "zh", "en"].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("zhweb_locale", l);
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] as Translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
