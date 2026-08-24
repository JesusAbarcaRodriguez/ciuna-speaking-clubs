import "../../i18n/config";
import { useTranslation } from "react-i18next";

const OPTIONS = [
  { lang: "es", flag: "🇨🇷", label: "ES" },
  { lang: "en", flag: "🇺🇸", label: "EN" },
] as const;

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "es";

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-full px-1 py-1 shadow-sm border border-gray-100">
      {OPTIONS.map((opt) => (
        <button
          key={opt.lang}
          onClick={() => i18n.changeLanguage(opt.lang)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            current === opt.lang ? "bg-brand text-white" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span>{opt.flag}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
