/* =============================================
   María del Mar Blanquería — Carrito de compras
   =============================================
   Flujo MVP:
   1. Cliente agrega productos al carrito
   2. Ve el resumen con cantidades y total
   3. Hace click en "Finalizar pedido"
   4. Se abre WhatsApp con el detalle armado
   5. La vendedora confirma stock y arregla el pago
   ============================================= */

// ---------- Estado del carrito ----------
// { id: { product, quantity } }
const cart = {};

// ---------- Abrir / cerrar carrito ----------
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
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  if (cart[productId]) {
    cart[productId].quantity += 1;
  } else {
    cart[productId] = { product, quantity: 1 };
  }

  // Analytics: producto agregado al carrito
  gtag('event', 'add_to_cart', {
    product_name:     product.name,
    product_category: product.cat,
    product_price:    product.price,
  });

  updateFabCount();
  showToast(`🛒 ${product.name} agregado`);
  renderCart();
}

// ---------- Quitar una unidad ----------
function removeOneFromCart(productId) {
  if (!cart[productId]) return;

  cart[productId].quantity -= 1;
  if (cart[productId].quantity <= 0) {
    delete cart[productId];
  }

  updateFabCount();
  renderCart();
}

// ---------- Eliminar producto completo ----------
function removeFromCart(productId) {
  delete cart[productId];
  updateFabCount();
  renderCart();
}

// ---------- Actualizar contador del botón flotante ----------
function updateFabCount() {
  const total = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  const fab = document.getElementById('cartFabCount');
  fab.textContent = total;
  fab.style.display = total > 0 ? 'flex' : 'none';

  // Mostrar/ocultar el botón flotante
  document.getElementById('cartFab').style.opacity = total > 0 ? '1' : '0.5';
}

// ---------- Calcular total ----------
function getCartTotal() {
  return Object.values(cart).reduce((acc, item) => {
    // Precio viene como string "18.500" → lo convertimos
    const price = parseFloat(item.product.price.replace('.', '').replace(',', '.'));
    return acc + price * item.quantity;
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
  const items    = Object.values(cart);

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

  itemsEl.innerHTML = items.map(({ product, quantity }) => `
    <div class="cart-item">
      <div class="cart-item-emoji">${product.emoji}</div>
      <div class="cart-item-info">
        <p class="cart-item-name">${product.name}</p>
        <p class="cart-item-price">$${product.price} c/u</p>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="removeOneFromCart(${product.id})">−</button>
        <span class="cart-qty">${quantity}</span>
        <button class="cart-qty-btn" onclick="addToCart(${product.id})">+</button>
        <button class="cart-remove-btn" onclick="removeFromCart(${product.id})" title="Eliminar">✕</button>
      </div>
    </div>
  `).join('');

  totalEl.textContent = `$${formatPrice(getCartTotal())}`;
}

// ---------- Finalizar pedido por WhatsApp ----------
function buyViaWA() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  // Analytics: pedido iniciado por WhatsApp
  gtag('event', 'begin_checkout_whatsapp', {
    total:    getCartTotal(),
    products: items.map(i => i.product.name).join(', '),
    quantity: items.reduce((acc, i) => acc + i.quantity, 0),
  });

  // Armar el mensaje con el detalle del pedido
  let msg = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';

  items.forEach(({ product, quantity }) => {
    const subtotal = parseFloat(product.price.replace('.', '')) * quantity;
    msg += `• ${product.name} x${quantity} — $${formatPrice(subtotal)}\n`;
  });

  msg += `\n*Total estimado: $${formatPrice(getCartTotal())}*`;
  msg += '\n\n¿Tienen stock disponible? ¿Cómo arreglamos el pago? 😊';

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar contador oculto
  updateFabCount();

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });
});
