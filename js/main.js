/* =============================================
   María del Mar Blanquería — Lógica principal
   ============================================= */

// ---------- Configuración ----------
const WA_NUMBER = '91173607330';

const WA_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
</svg>`;

// ---------- Productos ----------
// Para agregar o editar productos, modificá este array.
// Campos: id, cat, name, desc, price, emoji, badge (opcional: 'new' | 'promo')
const PRODUCTS = [
  {
    id: 1,
    cat: 'cama',
    name: 'Juego de sábanas bordado',
    desc: '100% algodón percal. Bajera, encimera y 2 fundas. Disponible en 1, 2 plazas y king.',
    price: '18.500',
    emoji: '🛏️',
    badge: 'new',
  },
  {
    id: 2,
    cat: 'baño',
    name: 'Juego de toallas premium',
    desc: 'Set x4 (2 cuerpo + 2 mano). Algodón egipcio 600 gr/m². Ultra absorbentes.',
    price: '12.900',
    emoji: '🛁',
  },
  {
    id: 3,
    cat: 'almohadas',
    name: 'Almohada viscoelástica',
    desc: 'Memoria de forma, hipoalergénica. Funda removible lavable.',
    price: '9.800',
    emoji: '😴',
    badge: 'promo',
  },
  {
    id: 4,
    cat: 'cama',
    name: 'Acolchado pluma de ganso',
    desc: '90% pluma / 10% plumón. Carcasa 100% algodón percal. 2 plazas.',
    price: '32.000',
    emoji: '🌸',
  },
  {
    id: 5,
    cat: 'baño',
    name: 'Alfombra de baño',
    desc: 'Microfibra extra suave, antideslizante. Lavable en lavarropas. Varios colores.',
    price: '4.200',
    emoji: '✨',
    badge: 'new',
  },
  {
    id: 6,
    cat: 'accesorios',
    name: 'Cojín decorativo',
    desc: 'Funda algodón estampado + relleno incluido. Diseños exclusivos.',
    price: '3.500',
    emoji: '🎁',
  },
  {
    id: 7,
    cat: 'cama',
    name: 'Funda de almohada bordada',
    desc: 'Juego x2. Algodón peinado, terminación bordada a mano. Varios colores.',
    price: '5.800',
    emoji: '🌼',
  },
  {
    id: 8,
    cat: 'baño',
    name: 'Set de toallones',
    desc: 'Pack x2 toallones extra grandes. 100% algodón turco. Súper absorbentes.',
    price: '8.400',
    emoji: '🏖️',
  },
];

const CAT_LABELS = {
  cama:       'Ropa de cama',
  baño:       'Baño',
  almohadas:  'Almohadas',
  accesorios: 'Accesorios',
};

// ---------- Estado ----------
let currentPage     = 0;
let autoTimer       = null;
let filteredProducts = [...PRODUCTS];
const favorites     = new Set();

// ---------- WhatsApp ----------
function goWA(name, price) {
  const msg = encodeURIComponent(`Hola! Me interesa: ${name} $${price}`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

// ---------- Toast ----------
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ---------- Favoritos ----------
function toggleFav(id, btn) {
  if (favorites.has(id)) {
    favorites.delete(id);
    btn.textContent = '🤍';
    showToast('Eliminado de favoritos');
  } else {
    favorites.add(id);
    btn.textContent = '❤️';
    showToast('❤️ Guardado en favoritos');
  }
}

// ---------- Generar HTML de una card ----------
function cardHTML(product) {
  const { id, cat, name, desc, price, emoji, badge } = product;
  const isFav = favorites.has(id);

  const badgeHTML = badge === 'new'
    ? '<span class="cbadge bnew">Nuevo</span>'
    : badge === 'promo'
    ? '<span class="cbadge bpromo">Oferta</span>'
    : '';

  return `
    <div class="pcard">
      <div class="cimg">
        <div class="cimg-inner">${emoji}</div>
        ${badgeHTML}
        <button class="cfav" onclick="toggleFav(${id}, this)">${isFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="cbody">
        <span class="ccat">${CAT_LABELS[cat] || cat}</span>
        <h3 class="cname">${name}</h3>
        <p class="cdesc">${desc}</p>
        <div class="cfoot">
          <span class="cprice"><sup>$</sup>${price}</span>
          <button class="bconsultar" onclick="addToCart(${id})">
            🛒 Agregar
          </button>
        </div>
      </div>
    </div>`;
}

// ---------- Carrusel ----------
function getPerPage() {
  if (window.innerWidth < 560) return 1;
  if (window.innerWidth < 860) return 2;
  return 3;
}

function renderCarousel() {
  const perPage  = getPerPage();
  const track    = document.getElementById('track');
  const dotsEl   = document.getElementById('dots');
  const total    = Math.ceil(filteredProducts.length / perPage);

  if (currentPage >= total) currentPage = 0;

  // Construir páginas
  let html = '';
  for (let i = 0; i < total; i++) {
    const slice = filteredProducts.slice(i * perPage, (i + 1) * perPage);
    html += `<div style="display:flex;gap:20px;flex:0 0 100%;min-width:0">`;
    slice.forEach(p => { html += `<div style="flex:1;min-width:0">${cardHTML(p)}</div>`; });
    html += '</div>';
  }

  track.innerHTML = html;
  track.style.transform = `translateX(calc(-${currentPage} * 100%))`;

  // Dots
  let dotsHTML = '';
  for (let i = 0; i < total; i++) {
    dotsHTML += `<div class="cdot${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})"></div>`;
  }
  dotsEl.innerHTML = dotsHTML;

  document.getElementById('prevBtn').disabled = currentPage === 0;
  document.getElementById('nextBtn').disabled = currentPage === total - 1;
}

function goToPage(n) {
  currentPage = n;
  renderCarousel();
  resetAutoPlay();
}

function carPrev() {
  if (currentPage > 0) {
    currentPage--;
    renderCarousel();
    resetAutoPlay();
  }
}

function carNext() {
  const total = Math.ceil(filteredProducts.length / getPerPage());
  if (currentPage < total - 1) {
    currentPage++;
    renderCarousel();
    resetAutoPlay();
  }
}

function resetAutoPlay() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    const total = Math.ceil(filteredProducts.length / getPerPage());
    currentPage = (currentPage + 1) % total;
    renderCarousel();
  }, 4500);
}

// ---------- Filtro de categorías ----------
function filterProducts(cat) {
  currentPage      = 0;
  filteredProducts = cat === 'todos'
    ? [...PRODUCTS]
    : PRODUCTS.filter(p => p.cat === cat);

  // Actualizar botones activos
  document.querySelectorAll('.filt').forEach(btn => {
    btn.classList.remove('active');
    const txt = btn.textContent.toLowerCase();
    if (
      (cat === 'todos'      && txt === 'todos')      ||
      (cat === 'cama'       && txt.includes('cama')) ||
      (cat === 'baño'       && txt.includes('baño')) ||
      (cat === 'almohadas'  && txt.includes('almo')) ||
      (cat === 'accesorios' && txt.includes('acce'))
    ) {
      btn.classList.add('active');
    }
  });

  renderCarousel();
  resetAutoPlay();

  if (cat !== 'todos') {
    document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
  }
}

// ---------- Scroll suave al hero ----------
function scrollToProducts() {
  document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Init — esperamos que el DOM esté listo ----------
document.addEventListener('DOMContentLoaded', () => {

  // Botones de filtro
  document.querySelectorAll('.filt').forEach(btn => {
    btn.addEventListener('click', () => {
      const txt = btn.textContent.toLowerCase().trim();
      if      (txt === 'todos')           filterProducts('todos');
      else if (txt.includes('cama'))      filterProducts('cama');
      else if (txt.includes('baño'))      filterProducts('baño');
      else if (txt.includes('almo'))      filterProducts('almohadas');
      else if (txt.includes('acce'))      filterProducts('accesorios');
    });
  });

  // Links de categorías (usan data-cat en el HTML)
  document.querySelectorAll('.cat-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.dataset.cat;
      if (cat) filterProducts(cat);
    });
  });

  // Header sombra al hacer scroll
  window.addEventListener('scroll', () => {
    document.getElementById('hdr').classList.toggle('scrolled', window.scrollY > 20);
  });

  // Re-render al cambiar tamaño de pantalla
  window.addEventListener('resize', () => renderCarousel());

  // Render inicial
  renderCarousel();
  resetAutoPlay();
});
