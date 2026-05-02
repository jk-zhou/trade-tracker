import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { getDict } from '@/lib/i18n';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'zh';
  const t = getDict(lang);

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> {t.back}
        </Link>
        <h1 className="text-3xl font-bold">{t.settings}</h1>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe size={18} className="text-muted-foreground" />
              {t.language}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.languageDesc}
            </p>
          </div>
          <div>
            <LanguageToggle currentLang={lang} />
          </div>
        </div>
      </div>
    </main>
  );
}
