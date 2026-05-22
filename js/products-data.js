/* =============================================
   María del Mar Blanquería — Datos compartidos
   ÚNICO lugar para editar productos, precios e imágenes
   ============================================= */

const WA_NUMBER = '91173607330';

const CAT_LABELS = {
  cama:          'Ropa de cama',
  baño:          'Baño',
  almohadas:     'Almohadas',
  accesorios:    'Accesorios',
  lineainfantil: 'Línea Infantil',
  cocina:        'Cocina',
};

const PRODUCTS = [
  {
    id: 1,
    cat: 'cama',
    name: 'Juego de sábanas 2 1/2 plazas de algodón',
    desc: '100% algodón. Bajera, encimera y 2 fundas. Disponibles en color Verde Agua, Rosa Dior y Blancas.',
    price: '33.000',
    emoji: '🛏️',
    badge: 'new',
    images: ['assets/products/sabanas-4-piezas.jpeg'],
  },
  {
    id: 2,
    cat: 'baño',
    name: 'Juego de Toallón y Toallas',
    desc: 'Set x3. 1 Toallón de 140x70cm + 2 Toallas de 76x46cm. Ultra absorbentes y de secado rápido.',
    price: '26.000',
    emoji: '🛁',
    images: ['assets/products/juego-toallon-toallas.jpg'],
  },
  {
    id: 3,
    cat: 'cama',
    name: 'Sabanas ajustables de algodón con elástico',
    desc: 'Estuche x4 unidades. 100% algodón.',
    price: '45.000',
    emoji: '🛏️',
    badge: 'promo',
    images: [
      'assets/products/sabanas-ajustables.jpg',
      'assets/products/sabanas-ajustables-2.jpg',
    ],
  },
  {
    id: 4,
    cat: 'cama',
    name: 'Sabanas hoteleras bordadas',
    desc: 'Descripción pendiente.',
    price: '47.000',
    emoji: '🛏️',
    images: [
      'assets/products/sabanas-hoteleras-bordadas.jpg',
      'assets/products/sabanas-hoteleras-bordadas-2.jpg',
    ],
  },
  {
    id: 5,
    cat: 'baño',
    name: 'Alfombra de baño de silicona antideslizante',
    desc: 'Silicona antideslizante. Varios colores.',
    price: '6.500',
    emoji: '🛁',
    badge: 'new',
    images: ['assets/products/alfombra-bano.jpg'],
  },
  {
    id: 6,
    cat: 'baño',
    name: 'Cortina de baño teflonada con ganchos',
    desc: 'Cortina de baño teflonada en bolsa de tela + Ganchos. Diseños exclusivos.',
    price: '24.000',
    emoji: '🛁',
    images: [
      'assets/products/cortina-bano.jpg',
      'assets/products/cortina-bano-2.jpg',
      'assets/products/cortina-bano-3.jpg',
    ],
  },
  {
    id: 7,
    cat: 'cama',
    name: 'Funda de almohada bordada',
    desc: 'Juego x2. Algodón peinado, terminación bordada a mano. Varios colores.',
    price: '5.800',
    emoji: '🌼',
    images: [],
  },
  {
    id: 8,
    cat: 'baño',
    name: 'Set de toallones',
    desc: 'Pack x2 toallones extra grandes. 100% algodón turco. Súper absorbentes.',
    price: '8.400',
    emoji: '🏖️',
    images: [],
  },
  // ---------- Cocina ----------
  {
    id: 9,
    cat: 'cocina',
    name: 'Delantal de cocina',
    desc: 'Delantal de cocina resistente y lavable. Varios diseños y colores disponibles.',
    price: '19.000',
    emoji: '👨‍🍳',
    images: [
      'assets/products/delantal-cocina.jpg',
      'assets/products/delantal-cocina-2.jpg',
      'assets/products/delantal-cocina-3.jpg',
      'assets/products/delantal-cocina-4.jpg',
    ],
  },
  {
    id: 10,
    cat: 'cocina',
    name: 'Repasadores',
    desc: 'Disponibles por unidad o docena. Alta absorción. Varios diseños.',
    price: 'Consultar',
    emoji: '🧺',
    images: [],
  },
  // ---------- Línea Infantil ----------
  {
    id: 11,
    cat: 'lineainfantil',
    name: 'Sábanas infantiles en mochila — Línea Disney',
    desc: 'Juego de sábanas infantiles en mochila. Diseños Disney. Ideal para regalo.',
    price: '30.000',
    emoji: '🧸',
    badge: 'new',
    images: [
      'assets/products/sabanas-infantiles.jpg',
      'assets/products/sabanas-infantiles-2.jpg',
    ],
  },
  {
    id: 12,
    cat: 'lineainfantil',
    name: 'Frazadas Flannel infantiles',
    desc: 'Frazadas de flannel suaves y abrigadas. Varios diseños y colores para los más chiquitos.',
    price: '22.000',
    emoji: '🌟',
    images: [
      'assets/products/sabanas-infantiles-flannel.jpg',
      'assets/products/sabanas-infantiles-flannel-2.jpg',
      'assets/products/sabanas-infantiles-flannel-3.jpg',
      'assets/products/sabanas-infantiles-flannel-4.jpg',
      'assets/products/sabanas-infantiles-flannel-5.jpg',
    ],
  },
];