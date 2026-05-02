'use client';

import { useRouter } from 'next/navigation';

export default function LanguageToggle({ currentLang }: { currentLang: string }) {
  const router = useRouter();

  const toggleLang = () => {
    const newLang = currentLang === 'en' ? 'zh' : 'en';
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <button 
      onClick={toggleLang}
      className="text-sm px-3 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
    >
      {currentLang === 'en' ? '中文' : 'English'}
    </button>
  );
}
