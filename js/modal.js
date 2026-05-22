/* =============================================
   María del Mar Blanquería — Modal de producto
   ============================================= */

let currentZoom    = false;
let currentSlide   = 0;
let modalImages    = [];

function openModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const { name, cat, desc, price, emoji, images, badge } = product;

  // Normalizar imágenes
  modalImages  = images && images.length > 0 ? images : [];
  currentSlide = 0;
  currentZoom  = false;

  // Badge
  const badgeHTML = badge === 'new'
    ? '<span class="modal-badge bnew">Nuevo</span>'
    : badge === 'promo'
    ? '<span class="modal-badge bpromo">Oferta</span>'
    : '';

  // Slider de imágenes o emoji
  const mediaHTML = modalImages.length > 0
    ? buildSlider(badgeHTML)
    : `<div class="modal-emoji">${emoji}</div>${badgeHTML}`;

  // Características desde la descripción
  const features    = desc.split('.').map(s => s.trim()).filter(s => s.length > 3);
  const featuresHTML = features.map(f => `<li>${f}.</li>`).join('');

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-img-wrap" id="modalImgWrap">
      ${mediaHTML}
    </div>
    <div class="modal-info">
      <span class="modal-cat">${CAT_LABELS[cat] || cat}</span>
      <h2 class="modal-name">${name}</h2>
      <p class="modal-price">${price === 'Consultar' ? '<span class="modal-price-consultar">Consultar precio</span>' : '<sup>$</sup>' + price}</p>
      <div class="modal-divider"></div>
      <div class="modal-section">
        <h4 class="modal-section-title">Descripción</h4>
        <p class="modal-desc">${desc}</p>
      </div>
      <div class="modal-section">
        <h4 class="modal-section-title">Características</h4>
        <ul class="modal-features">${featuresHTML}</ul>
      </div>
      <div class="modal-actions">
        ${price === 'Consultar'
          ? `<button class="modal-add-btn" onclick="goWA('${name.replace(/'/g, "\'")}', 'precio'); closeModal();">💬 Consultar precio</button>`
          : `<button class="modal-add-btn" onclick="addToCart(${productId}); showToast('🛒 Agregado'); closeModal();">🛒 Agregar al carrito</button>`
        }
        <button class="modal-wa-btn" onclick="goWA('${name.replace(/'/g, "\\'")}', '${price}')">
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

  // Quitar zoom si estaba activo
  if (currentZoom) toggleZoom();

  slides[currentSlide].classList.remove('active');
  if (dots[currentSlide]) dots[currentSlide].classList.remove('active');

  currentSlide = (n + slides.length) % slides.length;

  slides[currentSlide].classList.add('active');
  if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function prevSlide() { goSlide(currentSlide - 1); }
function nextSlide() { goSlide(currentSlide + 1); }

// ---------- Zoom ----------
function toggleZoom() {
  const img  = document.querySelector('.slider-slide.active img');
  const hint = document.getElementById('zoomHint');
  if (!img) return;

  currentZoom = !currentZoom;
  img.classList.toggle('zoomed', currentZoom);
  if (hint) hint.textContent = currentZoom ? '🔍 Click para alejar' : '🔍 Click para zoom';
}

// ---------- Cerrar ----------
function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentZoom  = false;
  currentSlide = 0;
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft')  prevSlide();
  });
});