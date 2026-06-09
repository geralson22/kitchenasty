import { Link } from 'react-router-dom';
import { getWhatsAppReservationUrl } from '../../utils/whatsapp.js';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string; whatsappNumber?: string } | null;
  t: (key: string) => string;
}

export default function BoldHero({ hero, t }: HeroProps) {
  return (
    <section className="bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[70vh]">
          {/* Left: Text */}
          <div className="flex flex-col justify-center py-16 lg:py-24 lg:pr-12">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-[0.95] tracking-tight uppercase">
              {hero?.title || t('home.heroTitle')}
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-lg leading-relaxed">
              {hero?.subtitle || t('home.heroDescription')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to={hero?.ctaPrimaryLink || '/menu'}
                className="bg-primary-600 text-white px-8 py-4 font-bold text-lg uppercase tracking-wider hover:bg-primary-700 transition-colors"
              >
                {hero?.ctaPrimaryText || t('home.viewMenu')}
              </Link>
              {hero?.ctaSecondaryText && hero?.ctaSecondaryLink && (
                <Link
                  to={hero.ctaSecondaryLink}
                  className="bg-primary-600 text-white px-8 py-4 font-bold text-lg uppercase tracking-wider hover:bg-primary-700 transition-colors"
                >
                  {hero.ctaSecondaryText}
                </Link>
              )}
              {hero?.whatsappNumber && (
                <a
                  href={getWhatsAppReservationUrl(t, hero.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-8 py-4 font-bold text-lg uppercase tracking-wider hover:bg-green-600 transition-colors"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Right: Image or gradient */}
          <div className="relative hidden lg:block">
            {hero?.backgroundImage ? (
              <img
                src={hero.backgroundImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800">
                {/* Bold geometric accent */}
                <div className="absolute bottom-0 left-0 w-2/3 h-1/2 bg-black/10" />
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-white/10" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
