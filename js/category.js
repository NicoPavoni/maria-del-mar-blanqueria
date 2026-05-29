/* =============================================
   María del Mar Blanquería — Lógica de página de categoría
   Fuente de datos: Supabase (via window.ProductsAPI)
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
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ---------- WhatsApp ----------
function goWA(name, price) {
  const msg = encodeURIComponent(`Hola! Me interesa: ${name} $${price}`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

// ---------- Helpers ----------
function formatPrice(n) {
  if (n === null || n === undefined) return '';
  return Number(n).toLocaleString('es-AR');
}

// ---------- Card HTML ----------
function cardHTML(product) {
  const { id, cat, name, desc, price, emoji, badge, images, stock } = product;
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

  // ---- Stock label ----
  let stockLabel = '';
  let outOfStock = false;
  if (stock === 0) {
    stockLabel = '<span class="stock-label stock-out">Sin stock</span>';
    outOfStock = true;
  } else if (stock > 0 && stock <= 3) {
    stockLabel = `<span class="stock-label stock-low">¡Solo quedan ${stock}!</span>`;
  }

  // ---- Precio ----
  const isConsultar = price === null || price === undefined || price === 'Consultar';
  const priceHTML   = isConsultar
    ? `<span class="cprice cprice-consultar">Consultar precio</span>`
    : `<span class="cprice"><sup>$</sup>${formatPrice(price)}</span>`;

  // ---- Botón ----
  const actionHTML = outOfStock
    ? `<button class="bconsultar bconsultar-disabled" disabled>Sin stock</button>`
    : `<button class="bconsultar" onclick="event.stopPropagation(); openModal(${id})">Ver producto</button>`;

  const cardClass = outOfStock ? 'pcard pcard-out' : 'pcard';
  const onClick   = outOfStock ? '' : `onclick="openModal(${id})"`;

  return `
    <div class="${cardClass}" ${onClick} style="cursor:${outOfStock ? 'default' : 'pointer'}">
      <div class="cimg">
        <div class="cimg-inner">${mediaHTML}</div>
        ${badgeHTML}
        <button class="cfav" onclick="event.stopPropagation(); toggleFav(${id}, this)">${isFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="cbody">
        <span class="ccat">${CAT_LABELS[cat] || cat}</span>
        <h3 class="cname">${name}</h3>
        <p class="cdesc">${desc || ''}</p>
        ${stockLabel}
        <div class="cfoot">
          ${priceHTML}
          ${actionHTML}
        </div>
      </div>
    </div>`;
}

// ---------- Estado ----------
let PRODUCTS      = [];        // se carga async desde Supabase
let currentCat    = '';
let currentSubcat = '';
let searchQuery   = '';
let currentSort   = 'default';

// ---------- Ordenar ----------
function sortProducts(products) {
  const arr = [...products];
  // Ahora los precios son números (integer) en lugar de strings
  if (currentSort === 'price-asc') {
    return arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  }
  if (currentSort === 'price-desc') {
    return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }
  if (currentSort === 'alpha-asc') {
    return arr.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }
  if (currentSort === 'alpha-desc') {
    return arr.sort((a, b) => b.name.localeCompare(a.name, 'es'));
  }
  return arr;
}

function injectSortSelect() {
  if (document.getElementById('sortSelect')) return;
  const wrap = document.querySelector('.search-wrap');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'sort-wrap';
  div.innerHTML = `
    <select id="sortSelect" class="sort-select" onchange="applySort(this.value)">
      <option value="default">Ordenar por</option>
      <option value="price-asc">Precio: menor a mayor</option>
      <option value="price-desc">Precio: mayor a menor</option>
      <option value="alpha-asc">Nombre: A → Z</option>
      <option value="alpha-desc">Nombre: Z → A</option>
    </select>`;
  wrap.parentNode.insertBefore(div, wrap.nextSibling);
}

function applySort(val) {
  currentSort = val;
  applyGridFilters();
}

// ---------- Loading state ----------
function renderLoading() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="grid-loading" style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;gap:1rem;">
      <div class="spinner"></div>
      <p style="color:var(--text-soft, #8a7060);font-size:13px;">Cargando productos...</p>
    </div>`;
}

// ---------- Render grilla ----------
async function renderGrid(cat) {
  currentCat    = cat;
  currentSubcat = '';
  currentSort   = 'default';

  renderLoading();

  // Cargar productos de Supabase según la categoría
  try {
    PRODUCTS = await window.ProductsAPI.getByCategory(cat);
    console.log(`✓ ${PRODUCTS.length} productos en categoría "${cat}"`);
  } catch (e) {
    console.error('Error cargando productos:', e);
    PRODUCTS = [];
  }

  injectSortSelect();
  applyGridFilters();

  // Auto-abrir modal si hay ?product=ID en la URL (viene del admin → "Ver en sitio")
  const urlParams = new URLSearchParams(window.location.search);
  const productIdToOpen = urlParams.get('product');
  if (productIdToOpen && typeof openModal === 'function') {
    setTimeout(() => openModal(parseInt(productIdToOpen, 10)), 200);
  }
}

function filterSubcat(subcat, btn) {
  currentSubcat = subcat;
  // Resaltar botón activo
  document.querySelectorAll('.subcat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyGridFilters();
}

// Categorías en modo "próximamente" — los productos existen pero no se muestran
const COMING_SOON_CATS = [];

function applyGridFilters() {
  const q     = searchQuery.trim().toLowerCase();
  const grid  = document.getElementById('productsGrid');
  const count = document.getElementById('gridCount');
  if (!grid) return;

  // Si la categoría está en modo próximamente
  if (COMING_SOON_CATS.includes(currentCat)) {
    if (count) count.textContent = '';
    grid.innerHTML = `
      <div class="grid-empty grid-coming-soon">
        <span class="grid-empty-icon">🌿</span>
        <h3>¡Próximamente!</h3>
        <p>Estamos preparando esta sección con mucho amor.<br>Muy pronto vas a encontrar productos especiales acá.</p>
        <a href="https://wa.me/91173607330" class="grid-coming-soon-btn" target="_blank">
          💬 Consultanos por WhatsApp
        </a>
      </div>`;
    return;
  }

  const filtered = PRODUCTS.filter(p => {
    // currentCat ya fue aplicado en la query de Supabase, pero filtramos por si acaso
    const matchSubcat = !currentSubcat || p.subcat === currentSubcat;
    const matchQuery  = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      (CAT_LABELS[p.cat] || '').toLowerCase().includes(q);
    return matchSubcat && matchQuery && !p.hidden;
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

  const sorted = sortProducts(filtered);
  grid.innerHTML = sorted.map(p => cardHTML(p)).join('');
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

// Expuesto globalmente para refrescar después de un checkout
window.refreshProducts = async function() {
  if (!currentCat) return;
  try {
    PRODUCTS = await window.ProductsAPI.getByCategory(currentCat);
    applyGridFilters();
  } catch (e) {
    console.error('Error refrescando productos:', e);
  }
};