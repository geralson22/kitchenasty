import { Link } from 'react-router-dom';
import { getWhatsAppReservationUrl } from '../../utils/whatsapp.js';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string; whatsappNumber?: string } | null;
  t: (key: string) => string;
}

export default function SleekHero({ hero, t }: HeroProps) {
  return (
    <section className="relative bg-gray-950 overflow-hidden min-h-[70vh] flex items-center">
      {/* Subtle glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-primary-500/8 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
        {/* Glowing badge */}
        <div className="inline-flex items-center gap-2 bg-gray-800/80 border border-gray-700 text-cyan-400 px-4 py-1.5 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          {hero?.subtitle || t('home.heroDescription')}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
          {(hero?.title || t('home.heroTitle')).split(' ').map((word, i, arr) =>
            i === arr.length - 1 ? (
              <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400">
                {word}
              </span>
            ) : (
              <span key={i}>{word} </span>
            )
          )}
        </h1>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to={hero?.ctaPrimaryLink || '/menu'}
            className="bg-primary-600 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
          >
            {hero?.ctaPrimaryText || t('home.viewMenu')}
          </Link>
          {hero?.ctaSecondaryText && hero?.ctaSecondaryLink && (
            <Link
              to={hero.ctaSecondaryLink}
              className="bg-primary-600 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
            >
              {hero.ctaSecondaryText}
            </Link>
          )}
          {hero?.whatsappNumber && (
            <a
              href={getWhatsAppReservationUrl(t, hero.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
