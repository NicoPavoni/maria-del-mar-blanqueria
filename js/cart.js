/* =============================================
   María del Mar Blanquería — Carrito de compras
   Fuente de datos: Supabase (via window.ProductsAPI)
   ============================================= */

const CART_KEY = 'mdm_cart';

// ---------- Estado ----------
// cart = { "id_color": { product, quantity, color } }
const cart = {};

// ---------- Persistencia ----------
function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveCart() {
  try {
    // Guardamos solo lo mínimo (productId, quantity, color) para reducir tamaño
    const toSave = {};
    Object.entries(cart).forEach(([key, val]) => {
      toSave[key] = {
        productId: val.product.id,
        quantity:  val.quantity,
        color:     val.color
      };
    });
    localStorage.setItem(CART_KEY, JSON.stringify(toSave));
  } catch {}
}

/**
 * Hidrata el carrito desde localStorage usando Supabase para traer
 * los datos actualizados de cada producto (puede haber cambios de precio,
 * stock o que el producto fue ocultado/eliminado).
 */
async function hydrateCart() {
  const saved = loadCart();
  const entries = Object.entries(saved);
  if (entries.length === 0) return;

  // Traer cada producto en paralelo
  const promises = entries.map(async ([key, val]) => {
    const product = await window.ProductsAPI.getById(val.productId);
    return { key, val, product };
  });

  const results = await Promise.all(promises);

  for (const { key, val, product } of results) {
    if (!product || product.hidden) {
      // El producto ya no existe o fue ocultado — lo sacamos del carrito
      continue;
    }
    cart[key] = {
      product,
      quantity: val.quantity,
      color:    val.color
    };
  }

  saveCart();           // re-guardar limpiando ítems eliminados
  updateFabCount();
}

// ---------- Helpers ----------
function cartKey(productId, color) {
  return color ? `${productId}_${color}` : `${productId}`;
}

function formatPrice(n) {
  if (n === null || n === undefined) return '';
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });
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
async function addToCart(productId, color) {
  // 1. Validar contra Supabase en tiempo real
  const product = await window.ProductsAPI.getById(productId);
  if (!product) {
    showToast('Producto no disponible');
    return;
  }
  if (product.hidden) {
    showToast('Este producto ya no está disponible');
    return;
  }

  const key = cartKey(productId, color);
  const currentQty = cart[key] ? cart[key].quantity : 0;
  const newQty     = currentQty + 1;

  // 2. Validar stock real
  if (product.stock <= 0) {
    showToast(`Sin stock de ${product.name}`);
    return;
  }
  if (newQty > product.stock) {
    showToast(`Solo quedan ${product.stock} unidades disponibles`);
    return;
  }

  // 3. Agregar / incrementar
  if (cart[key]) {
    cart[key].quantity = newQty;
    cart[key].product  = product;   // refrescar por si cambió precio o nombre
  } else {
    cart[key] = { product, quantity: 1, color: color || null };
  }
  saveCart();

  // 4. Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'add_to_cart', {
      product_name:     product.name,
      product_category: product.cat,
      product_price:    product.price,
      color:            color || 'sin color',
    });
  }

  updateFabCount();
  renderCart();
}

// ---------- Vaciar carrito ----------
function clearCart() {
  if (!confirm('¿Vaciar el carrito? Se eliminarán todos los productos.')) return;
  Object.keys(cart).forEach(k => delete cart[k]);
  saveCart();
  updateFabCount();
  renderCart();
}

// ---------- Quitar una unidad ----------
function removeOneFromCart(key) {
  if (!cart[key]) return;
  cart[key].quantity -= 1;
  if (cart[key].quantity <= 0) delete cart[key];
  saveCart();
  updateFabCount();
  renderCart();
}

// ---------- Eliminar producto completo ----------
function removeFromCart(key) {
  delete cart[key];
  saveCart();
  updateFabCount();
  renderCart();
}

// ---------- Contador del botón flotante ----------
function updateFabCount() {
  const total = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  const fab = document.getElementById('cartFabCount');
  if (!fab) return;
  fab.textContent = total;
  fab.style.display = total > 0 ? 'flex' : 'none';
  const fabBtn = document.getElementById('cartFab');
  if (fabBtn) fabBtn.style.opacity = total > 0 ? '1' : '0.5';
}

// ---------- Total ----------
function getCartTotal() {
  return Object.values(cart).reduce((acc, item) => {
    // price ahora es number (integer)
    const price = item.product.price;
    return (typeof price === 'number') ? acc + price * item.quantity : acc;
  }, 0);
}

// ---------- Renderizar carrito ----------
function renderCart() {
  const itemsEl  = document.getElementById('cartItems');
  const totalEl  = document.getElementById('cartTotal');
  const footerEl = document.getElementById('cartFooter');
  const clearBtn = document.getElementById('cartClearBtn');
  if (!itemsEl || !totalEl || !footerEl) return;

  const items = Object.entries(cart);

  if (items.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛒</span>
        <p>Tu carrito está vacío</p>
        <p>Agregá productos desde la colección</p>
      </div>`;
    footerEl.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  if (clearBtn) clearBtn.style.display = 'inline-flex';
  footerEl.style.display = 'flex';

  itemsEl.innerHTML = items.map(([key, { product, quantity, color }]) => {
    // Aviso visual si la cantidad supera el stock disponible (puede pasar si el stock cambió)
    const stockWarning = (typeof product.stock === 'number' && quantity > product.stock)
      ? `<p class="cart-item-warning">⚠️ Solo hay ${product.stock} disponibles</p>`
      : '';

    return `
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
        <p class="cart-item-price">$${formatPrice(product.price)} c/u</p>
        ${stockWarning}
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="removeOneFromCart('${key}')">−</button>
        <span class="cart-qty">${quantity}</span>
        <button class="cart-qty-btn" onclick="addToCart(${product.id}, ${color ? `'${color.replace(/'/g, "\\'")}'` : 'null'})">+</button>
        <button class="cart-remove-btn" onclick="removeFromCart('${key}')" title="Eliminar">✕</button>
      </div>
    </div>`;
  }).join('');

  totalEl.textContent = `$${formatPrice(getCartTotal())}`;
}

// ---------- Finalizar pedido por WhatsApp ----------
async function buyViaWA() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  const btn = document.getElementById('cartBuyBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Verificando stock...';
  }

  // 1. Construir lista para decrementMultiple
  const itemsForDecrement = Object.entries(cart).map(([key, val]) => ({
    id: val.product.id,
    qty: val.quantity,
    key, // para identificar después en los errores
    name: val.product.name,
  }));

  // 2. Intentar decrementar (atómico por ítem)
  const result = await window.ProductsAPI.decrementMultiple(
    itemsForDecrement.map(i => ({ id: i.id, qty: i.qty }))
  );

  // 3. Si algo falló, mostrar mensaje detallado y NO abrir WhatsApp
  if (!result.ok) {
    const failedList = result.failed.map(f => {
      const item = itemsForDecrement.find(i => i.id === f.id);
      return `• ${item?.name || 'Producto'}: ${f.reason}`;
    }).join('\n');

    alert(
      `No pudimos procesar tu pedido completo:\n\n${failedList}\n\n` +
      `Probá ajustar las cantidades o consultanos por WhatsApp.`
    );

    // Refrescar info de productos en el carrito para que el cliente vea los nuevos stocks
    await refreshCartProducts();
    renderCart();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Finalizar pedido por WhatsApp
      `;
    }
    return;
  }

  // 4. Todo OK — armar el mensaje
  if (typeof gtag !== 'undefined') {
    gtag('event', 'begin_checkout_whatsapp', {
      total:    getCartTotal(),
      products: items.map(i => i.product.name).join(', '),
      quantity: items.reduce((acc, i) => acc + i.quantity, 0),
    });
  }

  let msg = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';

  items.forEach(({ product, quantity, color }) => {
    const price    = product.price;
    const subtotal = (typeof price === 'number') ? price * quantity : 0;
    const colorStr = color ? ` — Color: ${color}` : '';
    msg += `• ${product.name}${colorStr} x${quantity} — $${typeof price === 'number' ? formatPrice(subtotal) : 'Consultar'}\n`;
  });

  if (getCartTotal() > 0) {
    msg += `\n*Total estimado: $${formatPrice(getCartTotal())}*`;
  }
  msg += '\n\n¿Cómo arreglamos el pago? 😊';

  // 5. Limpiar carrito
  Object.keys(cart).forEach(k => delete cart[k]);
  saveCart();
  updateFabCount();
  renderCart();

  // 6. Cerrar drawer
  closeCart();

  // 7. Refrescar productos visibles en la página
  if (typeof window.refreshProducts === 'function') {
    window.refreshProducts();
  }

  // 8. Abrir WhatsApp
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

/**
 * Refresca el dato product dentro de cada item del carrito,
 * trayéndolo otra vez de Supabase. Se llama después de un fallo
 * de checkout para que el cliente vea los stocks actualizados.
 */
async function refreshCartProducts() {
  const keys = Object.keys(cart);
  const promises = keys.map(async (key) => {
    const productId = cart[key].product.id;
    const fresh = await window.ProductsAPI.getById(productId);
    if (fresh && !fresh.hidden) {
      cart[key].product = fresh;
    } else {
      delete cart[key];  // producto desapareció o fue ocultado
    }
  });
  await Promise.all(promises);
  saveCart();
  updateFabCount();
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  // Hidratar carrito desde localStorage (async porque consulta Supabase)
  // Esperamos a que window.ProductsAPI esté disponible
  if (window.ProductsAPI) {
    await hydrateCart();
    renderCart();
  } else {
    console.warn('ProductsAPI no disponible aún, carrito no hidratado');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });
});