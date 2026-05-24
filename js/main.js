/* =============================================
   María del Mar Blanquería — Lógica del home
   Depende de: products-data.js (cargado antes en el HTML)
   PRODUCTS, CAT_LABELS y WA_NUMBER vienen de products-data.js
   ============================================= */

const WA_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
</svg>`;

// Categorías ocultas del carrusel — misma lista que category.js
const COMING_SOON_CATS = ['lineainfantil'];

// ---------- Estado ----------
let currentPage      = 0;
let autoTimer        = null;
let filteredProducts = PRODUCTS.filter(p => !COMING_SOON_CATS.includes(p.cat) && !p.hidden);
let currentCat       = 'todos';
let searchQuery      = '';
const favorites      = new Set();

// ---------- Búsqueda ----------
function applyFilters() {
  const q = searchQuery.trim().toLowerCase();
  filteredProducts = PRODUCTS.filter(p => {
    const matchCat     = currentCat === 'todos' || p.cat === currentCat;
    const matchQuery   = !q ||
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      (CAT_LABELS[p.cat] || '').toLowerCase().includes(q);
    const notHidden    = !COMING_SOON_CATS.includes(p.cat) && !p.hidden;
    return matchCat && matchQuery && notHidden;
  });
  currentPage = 0;
  renderCarousel();
  resetAutoPlay();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  searchQuery = '';
  const clear = document.getElementById('searchClear');
  if (clear) clear.style.display = 'none';
  applyFilters();
}

// ---------- WhatsApp ----------
function goWA(name, price) {
  gtag('event', 'click_whatsapp_consulta', {
    product_name:  name,
    product_price: price,
  });
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

// ---------- Card HTML ----------
function cardHTML(product) {
  const { id, cat, name, desc, price, emoji, indications, badge, images, colors } = product;
  const isFav      = favorites.has(id);
  const firstImage = images && images.length > 0 ? images[0] : null;

  const badgeHTML = badge === 'new'
    ? '<span class="cbadge bnew">Nuevo</span>'
    : badge === 'promo'
    ? '<span class="cbadge bpromo">Oferta</span>'
    : '';

  const mediaHTML = firstImage
    ? `<img src="${firstImage}" alt="${name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
    : `<span>${emoji}</span>`;

  const isConsultar = price === 'Consultar';
  const priceHTML   = isConsultar
    ? `<span class="cprice cprice-consultar">Consultar precio</span>`
    : `<span class="cprice"><sup>$</sup>${price}</span>`;
  const actionHTML  = `<button class="bconsultar" onclick="event.stopPropagation(); openModal(${id})">Ver producto</button>`;

  return `
    <div class="pcard" onclick="openModal(${id})" style="cursor:pointer">
      <div class="cimg">
        <div class="cimg-inner">${mediaHTML}</div>
        ${badgeHTML}
        <button class="cfav" onclick="event.stopPropagation(); toggleFav(${id}, this)">${isFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="cbody">
        <span class="ccat">${CAT_LABELS[cat] || cat}</span>
        <h3 class="cname">${name}</h3>
        <p class="cdesc">${desc}</p>
        <div class="cfoot">
          ${priceHTML}
          ${actionHTML}
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
  const perPage = getPerPage();
  const track   = document.getElementById('track');
  const dotsEl  = document.getElementById('dots');
  const total   = Math.ceil(filteredProducts.length / perPage);

  if (currentPage >= total) currentPage = 0;

  let html = '';
  for (let i = 0; i < total; i++) {
    const slice = filteredProducts.slice(i * perPage, (i + 1) * perPage);
    html += `<div style="display:flex;gap:20px;flex:0 0 100%;min-width:0;align-items:stretch">`;
    slice.forEach(p => { html += `<div style="flex:1;min-width:0;max-width:calc((100% - ${(perPage-1)*20}px) / ${perPage});display:flex;flex-direction:column">${cardHTML(p)}</div>`; });
    html += '</div>';
  }

  track.innerHTML = html;
  track.style.transform = `translateX(calc(-${currentPage} * 100%))`;

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
  currentCat = cat;

  document.querySelectorAll('.filt').forEach(btn => {
    btn.classList.remove('active');
    const txt = btn.textContent.toLowerCase();
    if (
      (cat === 'todos'         && txt === 'todos')       ||
      (cat === 'cama'          && txt.includes('cama'))  ||
      (cat === 'baño'          && txt.includes('baño'))  ||
      (cat === 'almohadas'     && txt.includes('almo'))  ||
      (cat === 'accesorios'    && txt.includes('acce'))  ||
      (cat === 'lineainfantil' && txt.includes('infan')) ||
      (cat === 'cocina'        && txt.includes('cocina'))
    ) {
      btn.classList.add('active');
    }
  });

  applyFilters();

  if (cat !== 'todos') {
    document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
  }
}

// ---------- Scroll suave a productos ----------
function scrollToProducts() {
  document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.filt').forEach(btn => {
    btn.addEventListener('click', () => {
      const txt = btn.textContent.toLowerCase().trim();
      if      (txt === 'todos')        filterProducts('todos');
      else if (txt.includes('cama'))   filterProducts('cama');
      else if (txt.includes('baño'))   filterProducts('baño');
      else if (txt.includes('almo'))   filterProducts('almohadas');
      else if (txt.includes('acce'))   filterProducts('accesorios');
      else if (txt.includes('infan'))  filterProducts('lineainfantil');
      else if (txt.includes('cocina')) filterProducts('cocina');
    });
  });

  // Buscador
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      if (searchClear) searchClear.style.display = searchQuery ? 'flex' : 'none';
      applyFilters();
    });
  }

  window.addEventListener('scroll', () => {
    document.getElementById('hdr').classList.toggle('scrolled', window.scrollY > 20);
  });

  window.addEventListener('resize', () => renderCarousel());

  renderCarousel();
  resetAutoPlay();
});