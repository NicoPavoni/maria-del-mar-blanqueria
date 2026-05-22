/* =============================================
   María del Mar Blanquería — Lógica de página de categoría
   Depende de: products-data.js (cargado antes)
   ============================================= */

// ---------- Favoritos ----------
const favorites = new Set();

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

// ---------- Toast ----------
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ---------- WhatsApp ----------
function goWA(name, price) {
  const msg = encodeURIComponent(`Hola! Me interesa: ${name} $${price}`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

// ---------- Card HTML ----------
function cardHTML(product) {
  const { id, cat, name, desc, price, emoji, badge, images } = product;
  const isFav      = favorites.has(id);
  const firstImage = images && images.length > 0 ? images[0] : null;

  const badgeHTML = badge === 'new'
    ? '<span class="cbadge bnew">Nuevo</span>'
    : badge === 'promo'
    ? '<span class="cbadge bpromo">Oferta</span>'
    : '';

  const mediaHTML = firstImage
    ? `<img src="${firstImage}" alt="${name}">`
    : `<span>${emoji}</span>`;

  const isConsultar = price === 'Consultar';
  const priceHTML   = isConsultar
    ? `<span class="cprice cprice-consultar">Consultar precio</span>`
    : `<span class="cprice"><sup>$</sup>${price}</span>`;
  const actionHTML  = isConsultar
    ? `<button class="bconsultar" onclick="event.stopPropagation(); goWA('${name.replace(/'/g, "\\'")}', 'precio')">💬 Consultar</button>`
    : `<button class="bconsultar" onclick="event.stopPropagation(); addToCart(${id})">🛒 Agregar</button>`;

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

// ---------- Estado ----------
let currentCat   = '';
let searchQuery  = '';

// ---------- Render grilla ----------
function renderGrid(cat) {
  currentCat = cat;
  applyGridFilters();
}

function applyGridFilters() {
  const q      = searchQuery.trim().toLowerCase();
  const grid   = document.getElementById('productsGrid');
  const count  = document.getElementById('gridCount');

  const filtered = PRODUCTS.filter(p => {
    const matchCat   = !currentCat || p.cat === currentCat;
    const matchQuery = !q ||
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      (CAT_LABELS[p.cat] || '').toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  if (count) {
    count.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="grid-empty">
        <span class="grid-empty-icon">🔍</span>
        <p>No encontramos productos con ese término.<br>Probá con otra búsqueda o <a href="https://wa.me/91173607330" style="color:var(--terra)">consultanos por WhatsApp</a>.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => cardHTML(p)).join('');
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  searchQuery = '';
  const clear = document.getElementById('searchClear');
  if (clear) clear.style.display = 'none';
  applyGridFilters();
}

// ---------- Header scroll ----------
window.addEventListener('scroll', () => {
  const hdr = document.getElementById('hdr');
  if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 20);
});

// ---------- Buscador ----------
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      if (searchClear) searchClear.style.display = searchQuery ? 'flex' : 'none';
      applyGridFilters();
    });
  }
});