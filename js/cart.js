/* =============================================
   María del Mar Blanquería — Carrito de compras
   ============================================= */

// { "id_color": { product, quantity, color } }
const cart = {};

function cartKey(productId, color) {
  return color ? `${productId}_${color}` : `${productId}`;
}

// ---------- Abrir / cerrar ----------
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCart();
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ---------- Agregar producto ----------
function addToCart(productId, color) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const key = cartKey(productId, color);

  if (cart[key]) {
    cart[key].quantity += 1;
  } else {
    cart[key] = { product, quantity: 1, color: color || null };
  }

  gtag('event', 'add_to_cart', {
    product_name:     product.name,
    product_category: product.cat,
    product_price:    product.price,
    color:            color || 'sin color',
  });

  updateFabCount();
  renderCart();
}

// ---------- Quitar una unidad ----------
function removeOneFromCart(key) {
  if (!cart[key]) return;
  cart[key].quantity -= 1;
  if (cart[key].quantity <= 0) delete cart[key];
  updateFabCount();
  renderCart();
}

// ---------- Eliminar producto completo ----------
function removeFromCart(key) {
  delete cart[key];
  updateFabCount();
  renderCart();
}

// ---------- Contador botón flotante ----------
function updateFabCount() {
  const total = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  const fab = document.getElementById('cartFabCount');
  fab.textContent = total;
  fab.style.display = total > 0 ? 'flex' : 'none';
  document.getElementById('cartFab').style.opacity = total > 0 ? '1' : '0.5';
}

// ---------- Total ----------
function getCartTotal() {
  return Object.values(cart).reduce((acc, item) => {
    const price = parseFloat(item.product.price.replace('.', '').replace(',', '.'));
    return isNaN(price) ? acc : acc + price * item.quantity;
  }, 0);
}

function formatPrice(number) {
  return number.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

// ---------- Renderizar carrito ----------
function renderCart() {
  const itemsEl  = document.getElementById('cartItems');
  const totalEl  = document.getElementById('cartTotal');
  const footerEl = document.getElementById('cartFooter');
  const items    = Object.entries(cart);

  if (items.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛒</span>
        <p>Tu carrito está vacío</p>
        <p>Agregá productos desde la colección</p>
      </div>`;
    footerEl.style.display = 'none';
    return;
  }

  footerEl.style.display = 'flex';

  itemsEl.innerHTML = items.map(([key, { product, quantity, color }]) => `
    <div class="cart-item">
      <div class="cart-item-emoji">
        ${product.images && product.images.length > 0
          ? `<img src="${product.images[0]}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
          : product.emoji
        }
      </div>
      <div class="cart-item-info">
        <p class="cart-item-name">${product.name}</p>
        ${color ? `<p class="cart-item-color">🎨 ${color}</p>` : ''}
        <p class="cart-item-price">$${product.price} c/u</p>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="removeOneFromCart('${key}')">−</button>
        <span class="cart-qty">${quantity}</span>
        <button class="cart-qty-btn" onclick="addToCart(${product.id}, ${color ? `'${color}'` : 'null'})">+</button>
        <button class="cart-remove-btn" onclick="removeFromCart('${key}')" title="Eliminar">✕</button>
      </div>
    </div>
  `).join('');

  totalEl.textContent = `$${formatPrice(getCartTotal())}`;
}

// ---------- Finalizar pedido por WhatsApp ----------
function buyViaWA() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  gtag('event', 'begin_checkout_whatsapp', {
    total:    getCartTotal(),
    products: items.map(i => i.product.name).join(', '),
    quantity: items.reduce((acc, i) => acc + i.quantity, 0),
  });

  let msg = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';

  items.forEach(({ product, quantity, color }) => {
    const price    = parseFloat(product.price.replace('.', ''));
    const subtotal = isNaN(price) ? 0 : price * quantity;
    const colorStr = color ? ` — Color: ${color}` : '';
    msg += `• ${product.name}${colorStr} x${quantity} — $${isNaN(price) ? 'Consultar' : formatPrice(subtotal)}\n`;
  });

  if (getCartTotal() > 0) {
    msg += `\n*Total estimado: $${formatPrice(getCartTotal())}*`;
  }
  msg += '\n\n¿Tienen stock disponible? ¿Cómo arreglamos el pago? 😊';

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  updateFabCount();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });
});