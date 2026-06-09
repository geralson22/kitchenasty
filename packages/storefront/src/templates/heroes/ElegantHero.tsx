import { Link } from 'react-router-dom';
import { getWhatsAppReservationUrl } from '../../utils/whatsapp.js';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string; whatsappNumber?: string } | null;
  t: (key: string) => string;
}

export default function ElegantHero({ hero, t }: HeroProps) {
  const bgStyle = hero?.backgroundImage
    ? { backgroundImage: `url(${hero.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <section
      className="relative min-h-[70vh] flex items-center justify-center bg-gray-900"
      style={bgStyle}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Decorative top/bottom borders */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Small decorative element */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="block w-12 h-px bg-amber-300/70" />
          <span className="text-amber-300 text-xs tracking-[0.3em] uppercase font-light">{t('home.welcome')}</span>
          <span className="block w-12 h-px bg-amber-300/70" />
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {hero?.title || t('home.heroTitle')}
        </h1>

        <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto font-light leading-relaxed">
          {hero?.subtitle || t('home.heroDescription')}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to={hero?.ctaPrimaryLink || '/menu'}
            className="bg-amber-600 text-white px-8 py-3 text-sm tracking-widest uppercase hover:bg-amber-700 transition-all duration-300"
          >
            {hero?.ctaPrimaryText || t('home.viewMenu')}
          </Link>
          {hero?.ctaSecondaryText && hero?.ctaSecondaryLink && (
            <Link
              to={hero.ctaSecondaryLink}
              className="bg-amber-600 text-white px-8 py-3 text-sm tracking-widest uppercase hover:bg-amber-700 transition-all duration-300"
            >
              {hero.ctaSecondaryText}
            </Link>
          )}
          {hero?.whatsappNumber && (
            <a
              href={getWhatsAppReservationUrl(t, hero.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white px-8 py-3 text-sm tracking-widest uppercase hover:bg-green-600 transition-all duration-300"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
