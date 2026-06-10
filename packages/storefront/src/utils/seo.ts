const translations: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Gocha Burgers - Order Online',
    description: 'Order fresh, made-to-order burgers online from Gocha Burgers. Browse our menu, order for delivery or pickup, and enjoy delicious meals.',
  },
  es: {
    title: 'Gocha Burgers - Pedido Online',
    description: 'Ordena hamburguesas frescas y hechas a la orden en línea desde Gocha Burgers. Explora nuestro menú, ordena para entrega o recogido, y disfruta de deliciosas comidas.',
  },
  fr: {
    title: 'Gocha Burgers - Commander en Ligne',
    description: 'Commandez des burgers frais et faits sur commande en ligne chez Gocha Burgers. Parcourez notre menu, commandez pour livraison ou à emporter, et savourez de délicieux repas.',
  },
  de: {
    title: 'Gocha Burgers - Online Bestellen',
    description: 'Bestellen Sie frische, nach Bestellung zubereitete Burger online bei Gocha Burgers. Durchsuchen Sie unser Menü, bestellen Sie für Lieferung oder Abholung und genießen Sie köstliche Mahlzeiten.',
  },
  it: {
    title: 'Gocha Burgers - Ordina Online',
    description: 'Ordina hamburger freschi e preparati su ordinazione online da Gocha Burgers. Sfoglia il nostro menu, ordina per consegna o ritiro e gusta pasti deliziosi.',
  },
  pt: {
    title: 'Gocha Burgers - Pedido Online',
    description: 'Faça pedidos de hambúrgueres frescos e feitos sob encomenda online no Gocha Burgers. Navegue pelo nosso cardápio, faça seu pedido para entrega ou retirada e aproveite refeições deliciosas.',
  },
};

export function updateMetaTags(lang: string) {
  const content = translations[lang] || translations.es;

  document.title = content.title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', content.description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', content.title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', content.description);

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', content.title);

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', content.description);
}