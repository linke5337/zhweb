"use client";

import { LOCALES, Locale } from "@/lib/i18n";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className={cn("flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full border border-slate-200 p-1 shadow-sm", className)}>
      {LOCALES.map(({ value, label, flag }) => (
        <button
          key={value}
          onClick={() => setLocale(value as Locale)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            locale === value
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
          )}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
