/* =============================================
   María del Mar Blanquería — Modal de producto
   Fuente de datos: Supabase (via window.ProductsAPI)
   ============================================= */

let currentZoom    = false;
let currentSlide   = 0;
let modalImages    = [];
let selectedColor  = null;
let currentProduct = null;   // referencia al producto abierto

async function openModal(productId) {
  // Buscar primero en el PRODUCTS local (más rápido).
  // Si no está (caso raro), traerlo de Supabase.
  let product = (typeof PRODUCTS !== 'undefined' && PRODUCTS.length > 0)
    ? PRODUCTS.find(p => p.id === productId)
    : null;

  if (!product) {
    try {
      product = await window.ProductsAPI.getById(productId);
    } catch (e) {
      console.error('Error cargando producto:', e);
      return;
    }
  }
  if (!product) return;

  currentProduct = product;
  const { name, cat, desc, price, emoji, indications, images, badge, colors, features, stock } = product;

  modalImages   = images && images.length > 0 ? images : [];
  currentSlide  = 0;
  currentZoom   = false;
  selectedColor = null;

  const badgeHTML = badge === 'new'
    ? '<span class="modal-badge bnew">Nuevo</span>'
    : badge === 'promo'
    ? '<span class="modal-badge bpromo">Oferta</span>'
    : '';

  const mediaHTML = modalImages.length > 0
    ? buildSlider(badgeHTML)
    : `<div class="modal-emoji">${emoji}</div>${badgeHTML}`;

  // Características (solo si tiene)
  const featuresHTML = features && features.length > 0
    ? features.map(f => `<li>${f}</li>`).join('')
    : '';

  // Selector de color (solo si tiene)
  const colorsHTML = colors && colors.length > 0
    ? `<div class="modal-section">
        <h4 class="modal-section-title">Elegí un color</h4>
        <div class="color-options" id="colorOptions">
          ${colors.map(c => `
            <button class="color-option" onclick="selectColor('${c.replace(/'/g, "\\'")}', this)">${c}</button>
          `).join('')}
        </div>
        <p class="color-required-msg" id="colorRequiredMsg" style="display:none">
          ⚠️ Por favor elegí un color antes de agregar al carrito.
        </p>
      </div>`
    : '';

  // ---- Stock info en el modal ----
  let stockInfoHTML = '';
  if (stock === 0) {
    stockInfoHTML = '<div class="modal-stock modal-stock-out">⚠️ Producto sin stock actualmente</div>';
  } else if (stock > 0 && stock <= 3) {
    stockInfoHTML = `<div class="modal-stock modal-stock-low">⏰ ¡Solo quedan ${stock} unidades!</div>`;
  } else if (stock > 3) {
    stockInfoHTML = `<div class="modal-stock modal-stock-ok">✓ Disponible</div>`;
  }

  // ---- Precio ----
  const isConsultar  = price === null || price === undefined || price === 'Consultar';
  const priceDisplay = isConsultar
    ? '<span class="modal-price-consultar">Consultar precio</span>'
    : `<sup>$</sup>${formatPrice(price)}`;

  // ---- Botón "Agregar al carrito" ----
  const hasColors = colors && colors.length > 0;
  let addBtnHTML;
  if (stock === 0) {
    addBtnHTML = `<button class="modal-add-btn modal-add-btn-disabled" disabled>Sin stock</button>`;
  } else if (isConsultar) {
    addBtnHTML = `<button class="modal-add-btn" onclick="goWA('${name.replace(/'/g, "\\'")}', 'precio'); closeModal();">💬 Consultar precio</button>`;
  } else {
    addBtnHTML = `<button class="modal-add-btn" onclick="handleAddToCart(${productId}, ${hasColors})">🛒 Agregar al carrito</button>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-img-wrap" id="modalImgWrap">
      ${mediaHTML}
    </div>
    <div class="modal-info">
      <span class="modal-cat">${CAT_LABELS[cat] || cat}</span>
      <h2 class="modal-name">${name}</h2>
      <p class="modal-price">${priceDisplay}</p>
      ${stockInfoHTML}
      <div class="modal-divider"></div>
      <div class="modal-section">
        <h4 class="modal-section-title">Descripción</h4>
        <p class="modal-desc">${desc || ''}</p>
      </div>
      ${featuresHTML ? `
      <div class="modal-section">
        <h4 class="modal-section-title">Características</h4>
        <ul class="modal-features">${featuresHTML}</ul>
      </div>` : ''}
      ${indications ? `
      <div class="modal-section">
        <h4 class="modal-section-title">Indicaciones de lavado</h4>
        <p class="modal-desc">${indications}</p>
      </div>` : ''}
      ${colorsHTML}
      <div class="modal-actions">
        ${addBtnHTML}
        <button class="modal-wa-btn" onclick="goWA('${name.replace(/'/g, "\\'")}', '${isConsultar ? 'precio' : formatPrice(price)}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Consultar
        </button>
      </div>
    </div>
  `;

  document.getElementById('productModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ---------- Selección de color ----------
function selectColor(color, btn) {
  selectedColor = color;
  document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const msg = document.getElementById('colorRequiredMsg');
  if (msg) msg.style.display = 'none';
}

// ---------- Agregar al carrito con color ----------
function handleAddToCart(productId, requiresColor) {
  if (requiresColor && !selectedColor) {
    const msg = document.getElementById('colorRequiredMsg');
    if (msg) msg.style.display = 'block';
    return;
  }
  // addToCart vive en cart.js
  if (typeof addToCart === 'function') {
    addToCart(productId, selectedColor);
    showToast('🛒 Agregado al carrito');
    closeModal();
  } else {
    console.error('addToCart no está definido. ¿Cargaste cart.js?');
  }
}

// ---------- Slider ----------
function buildSlider(badgeHTML) {
  const slides = modalImages.map((src, i) =>
    `<div class="slider-slide ${i === 0 ? 'active' : ''}">
       <img src="${src}" alt="Foto ${i + 1}" onclick="toggleZoom()" title="Click para zoom">
     </div>`
  ).join('');

  const dots = modalImages.length > 1
    ? `<div class="slider-dots">
        ${modalImages.map((_, i) =>
          `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goSlide(${i})"></button>`
        ).join('')}
       </div>`
    : '';

  const arrows = modalImages.length > 1
    ? `<button class="slider-arrow left"  onclick="prevSlide()">&#8592;</button>
       <button class="slider-arrow right" onclick="nextSlide()">&#8594;</button>`
    : '';

  const zoomHint = `<button class="modal-zoom-hint" id="zoomHint">🔍 Click para zoom</button>`;

  return `
    <div class="slider-wrap">
      <div class="slider-track" id="sliderTrack">${slides}</div>
      ${arrows}
      ${dots}
      ${badgeHTML}
      ${zoomHint}
    </div>`;
}

function goSlide(n) {
  const slides = document.querySelectorAll('.slider-slide');
  const dots   = document.querySelectorAll('.slider-dot');
  if (!slides.length) return;
  if (currentZoom) toggleZoom();
  slides[currentSlide].classList.remove('active');
  if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function prevSlide() { goSlide(currentSlide - 1); }
function nextSlide() { goSlide(currentSlide + 1); }

function toggleZoom() {
  const img  = document.querySelector('.slider-slide.active img');
  const hint = document.getElementById('zoomHint');
  if (!img) return;
  currentZoom = !currentZoom;
  img.classList.toggle('zoomed', currentZoom);
  if (hint) hint.textContent = currentZoom ? '🔍 Click para alejar' : '🔍 Click para zoom';
}

function closeModal() {
  if (currentZoom) {
    const img = document.querySelector('.slider-slide.active img');
    if (img) {
      img.classList.remove('zoomed');
      img.style.transform = '';
    }
    currentZoom = false;
  }

  const modal   = document.getElementById('productModal');
  const overlay = document.getElementById('modalOverlay');

  if (modal)   modal.classList.remove('open');
  if (overlay) overlay.classList.remove('open');

  setTimeout(() => {
    const content = document.getElementById('modalContent');
    if (content) content.innerHTML = '';
  }, 360);

  document.body.style.overflow = '';
  currentSlide   = 0;
  selectedColor  = null;
  currentProduct = null;
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft')  prevSlide();
  });
});