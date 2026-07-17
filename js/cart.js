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

// ---------- Finalizar pedido por WhatsApp (nuevo flujo con form) ----------
// Paso 1: abrir el modal de checkout con form de cliente
function buyViaWA() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  // Mostrar el modal de checkout
  const modal = document.getElementById('checkoutModal');
  if (!modal) {
    console.error('Modal de checkout no encontrado en el HTML');
    return;
  }

  // Renderizar resumen del pedido dentro del modal
  renderCheckoutSummary();

  // Mostrar modal
  modal.classList.add('show');
  document.getElementById('checkoutOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';

  // Focus en el primer input
  setTimeout(() => {
    const nameInput = document.getElementById('checkoutName');
    if (nameInput) nameInput.focus();
  }, 100);
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.remove('show');
  document.getElementById('checkoutOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

function renderCheckoutSummary() {
  const summaryEl = document.getElementById('checkoutSummary');
  if (!summaryEl) return;

  const items = Object.values(cart);
  const total = getCartTotal();

  summaryEl.innerHTML = `
    <div class="checkout-summary-list">
      ${items.map(({ product, quantity, color }) => {
        const subtotal = (typeof product.price === 'number') ? product.price * quantity : 0;
        return `
          <div class="checkout-summary-item">
            <span class="checkout-summary-name">
              ${product.name}${color ? ` — ${color}` : ''} <span class="checkout-summary-qty">x${quantity}</span>
            </span>
            <span class="checkout-summary-price">$${formatPrice(subtotal)}</span>
          </div>`;
      }).join('')}
    </div>
    <div class="checkout-summary-total">
      <span>Total estimado</span>
      <span>$${formatPrice(total)}</span>
    </div>`;
}

// Paso 2: validar form, registrar pedido, decrementar stock, abrir WhatsApp
// ============================================================
// Configuración de la integración con MercadoPago
// ============================================================
const MP_USE_SANDBOX = true;  // 🧪 modo prueba (cambiar a false para producción)
const MP_CREATE_PAYMENT_URL = 'https://lknbohjtsdxulhxonyru.supabase.co/functions/v1/create-payment';

// Esta clave es la "anon key" pública de Supabase (segura para frontend)
// La leemos del cliente de Supabase que ya está cargado
function getSupabaseAnonKey() {
  // window.sb.supabaseKey existe en el cliente moderno
  return window.sb?.supabaseKey || window.SUPABASE_ANON_KEY || '';
}

/**
 * Paso 1 del checkout: crear el pedido en la DB (común a ambos métodos)
 * Retorna el order_id si fue exitoso, null si falló
 */
async function createOrderInDB({ name, phone, address, notes, items, total, paymentMethod }) {
  const itemsCount = items.reduce((acc, i) => acc + i.quantity, 0);

  try {
    // Insertar cabecera del pedido
    const { data: newOrder, error: orderError } = await window.sb
      .from('orders')
      .insert({
        customer_name:    name,
        customer_phone:   phone,
        customer_address: address || null,
        customer_notes:   notes || null,
        total:            total,
        subtotal:         total,    // Por ahora subtotal == total (envío $0)
        shipping_cost:    0,
        items_count:      itemsCount,
        status:           'pending',
        payment_method:   paymentMethod,
        payment_status:   paymentMethod === 'mercadopago' ? 'pending' : null,
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      throw new Error(orderError?.message || 'No se pudo crear el pedido');
    }

    // Insertar los ítems
    const orderItems = items.map(({ product, quantity, color }) => ({
      order_id:      newOrder.id,
      product_id:    product.id,
      product_name:  product.name,
      product_emoji: product.emoji || null,
      color:         color || null,
      quantity:      quantity,
      unit_price:    product.price,
      subtotal:      (typeof product.price === 'number') ? product.price * quantity : 0,
    }));

    const { error: itemsError } = await window.sb
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.warn('Error registrando items del pedido:', itemsError.message);
    }

    return newOrder.id;
  } catch (e) {
    console.warn('No se pudo registrar el pedido en la DB:', e.message);
    return null;
  }
}

/**
 * Validación del form de checkout (común a ambos métodos)
 */
function validateCheckoutForm() {
  const name    = document.getElementById('checkoutName').value.trim();
  const phone   = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  const notes   = document.getElementById('checkoutNotes').value.trim();

  if (!name) {
    showCheckoutError('Por favor, ingresá tu nombre');
    document.getElementById('checkoutName').focus();
    return null;
  }
  if (!phone) {
    showCheckoutError('Por favor, ingresá tu teléfono');
    document.getElementById('checkoutPhone').focus();
    return null;
  }

  clearCheckoutError();
  return { name, phone, address, notes };
}

/**
 * Helper: deshabilitar/habilitar ambos botones de pago
 */
function setCheckoutButtonsState(disabled, message = null) {
  const btnWA = document.getElementById('checkoutWABtn');
  const btnMP = document.getElementById('checkoutMPBtn');

  if (btnWA) {
    btnWA.disabled = disabled;
    if (disabled && message) btnWA.dataset.originalHTML = btnWA.dataset.originalHTML || btnWA.innerHTML;
    if (!disabled && btnWA.dataset.originalHTML) {
      btnWA.innerHTML = btnWA.dataset.originalHTML;
      delete btnWA.dataset.originalHTML;
    }
  }
  if (btnMP) {
    btnMP.disabled = disabled;
    if (disabled && message) btnMP.dataset.originalHTML = btnMP.dataset.originalHTML || btnMP.innerHTML;
    if (!disabled && btnMP.dataset.originalHTML) {
      btnMP.innerHTML = btnMP.dataset.originalHTML;
      delete btnMP.dataset.originalHTML;
    }
  }
}

/**
 * Resetea el form y cierra el modal después de un checkout exitoso
 */
function resetCheckoutForm() {
  document.getElementById('checkoutName').value = '';
  document.getElementById('checkoutPhone').value = '';
  document.getElementById('checkoutAddress').value = '';
  document.getElementById('checkoutNotes').value = '';
}

/**
 * Limpia el carrito y cierra todo
 */
function clearCartAndClose() {
  Object.keys(cart).forEach(k => delete cart[k]);
  saveCart();
  updateFabCount();
  renderCart();
  closeCart();
  closeCheckoutModal();
  resetCheckoutForm();
  setCheckoutButtonsState(false);
}

// ============================================================
// FLUJO 1: CONFIRMAR POR WHATSAPP (decrementa stock al toque)
// ============================================================
async function confirmCheckoutWA() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  const formData = validateCheckoutForm();
  if (!formData) return;

  const { name, phone, address, notes } = formData;
  const btn = document.getElementById('checkoutWABtn');
  if (btn) {
    btn.dataset.originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Procesando...';
  }

  // 1. Decrementar stock (atómico)
  const itemsForDecrement = Object.entries(cart).map(([key, val]) => ({
    id:   val.product.id,
    qty:  val.quantity,
    name: val.product.name,
  }));

  const result = await window.ProductsAPI.decrementMultiple(
    itemsForDecrement.map(i => ({ id: i.id, qty: i.qty }))
  );

  if (!result.ok) {
    const failedList = result.failed.map(f => {
      const item = itemsForDecrement.find(i => i.id === f.id);
      return `• ${item?.name || 'Producto'}: ${f.reason}`;
    }).join('\n');

    alert(
      `No pudimos procesar tu pedido completo:\n\n${failedList}\n\n` +
      `Probá ajustar las cantidades o consultanos por WhatsApp.`
    );

    await refreshCartProducts();
    renderCart();
    renderCheckoutSummary();
    setCheckoutButtonsState(false);
    return;
  }

  // 2. Registrar pedido en DB
  const total = getCartTotal();
  const orderId = await createOrderInDB({
    name, phone, address, notes, items, total,
    paymentMethod: 'whatsapp',
  });

  // 3. Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'begin_checkout_whatsapp', {
      total, order_id: orderId,
      products: items.map(i => i.product.name).join(', '),
      quantity: items.reduce((acc, i) => acc + i.quantity, 0),
    });
  }

  // 4. Armar mensaje de WhatsApp
  let msg = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';
  msg += `*Mis datos:*\n`;
  msg += `👤 ${name}\n`;
  msg += `📞 ${phone}\n`;
  if (address) msg += `📍 ${address}\n`;
  if (notes)   msg += `📝 ${notes}\n`;
  msg += `\n*Pedido:*\n`;

  items.forEach(({ product, quantity, color }) => {
    const price    = product.price;
    const subtotal = (typeof price === 'number') ? price * quantity : 0;
    const colorStr = color ? ` — Color: ${color}` : '';
    msg += `• ${product.name}${colorStr} x${quantity} — $${typeof price === 'number' ? formatPrice(subtotal) : 'Consultar'}\n`;
  });

  if (total > 0) {
    msg += `\n*Total estimado: $${formatPrice(total)}*`;
  }
  msg += '\n\n¿Cómo arreglamos el pago? 😊';

  // 5. Limpiar, cerrar y abrir WhatsApp
  clearCartAndClose();
  if (typeof window.refreshProducts === 'function') {
    window.refreshProducts();
  }
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ============================================================
// FLUJO 2: PAGAR CON MERCADOPAGO
// (no decrementa stock acá: lo hace el webhook cuando MP confirma)
// ============================================================
async function confirmCheckoutMP() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  const formData = validateCheckoutForm();
  if (!formData) return;

  const { name, phone, address, notes } = formData;
  const btn = document.getElementById('checkoutMPBtn');
  if (btn) {
    btn.dataset.originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Redirigiendo a MercadoPago...';
  }

  // 1. Verificar stock disponible ANTES de crear el pedido (sin decrementar)
  // Nota: el decremento real lo hace el webhook cuando MP confirma pago
  for (const { product, quantity } of items) {
    if (typeof product.stock === 'number' && product.stock < quantity) {
      alert(`No hay stock suficiente de "${product.name}" (disponible: ${product.stock}, pedido: ${quantity}).\n\nProbá ajustar la cantidad.`);
      await refreshCartProducts();
      renderCart();
      renderCheckoutSummary();
      setCheckoutButtonsState(false);
      return;
    }
  }

  // 2. Crear el pedido en la DB con status pending
  const total = getCartTotal();
  const orderId = await createOrderInDB({
    name, phone, address, notes, items, total,
    paymentMethod: 'mercadopago',
  });

  if (!orderId) {
    alert('No pudimos registrar el pedido. Intentá de nuevo o contactanos por WhatsApp.');
    setCheckoutButtonsState(false);
    return;
  }

  // 3. Llamar a la Edge Function para crear la preferencia de pago
  try {
    const mpItems = items.map(({ product, quantity, color }) => ({
      product_id:    product.id,
      product_name:  product.name,
      product_emoji: product.emoji || null,
      color:         color || null,
      quantity:      quantity,
      unit_price:    product.price,
    }));

    // Determinar el site_url: si estamos en localhost, igual usamos prod (MP no acepta localhost)
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const siteUrl = isLocalhost
      ? 'https://mariadelmarblanqueria.com.ar'
      : location.origin;

    const anonKey = getSupabaseAnonKey();

    const response = await fetch(MP_CREATE_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        items: mpItems,
        customer: { name, phone, address, notes },
        shipping_cost: 0,
        site_url: siteUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de la Edge Function:', errorText);
      throw new Error(`Error al crear el pago: ${response.status}`);
    }

    const data = await response.json();

    if (!data.init_point && !data.sandbox_init_point) {
      throw new Error('MercadoPago no devolvió URL de pago');
    }

    // Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'begin_checkout_mercadopago', {
        total, order_id: orderId,
        products: items.map(i => i.product.name).join(', '),
      });
    }

    // 4. Limpiar carrito antes de redirigir
    // (si el cliente vuelve sin pagar, el pedido queda 'pending' en la DB)
    Object.keys(cart).forEach(k => delete cart[k]);
    saveCart();
    updateFabCount();

    // 5. Redirigir al checkout de MercadoPago
    const redirectUrl = MP_USE_SANDBOX ? data.sandbox_init_point : data.init_point;
    window.location.href = redirectUrl;
  } catch (e) {
    console.error('Error en flujo de MercadoPago:', e);
    alert(`No pudimos iniciar el pago.\n\n${e.message}\n\nPodés intentar de nuevo o pagarlo coordinando por WhatsApp.`);
    setCheckoutButtonsState(false);
  }
}

// ============================================================
// LEGACY: confirmCheckout (compatibilidad con código viejo)
// Si algún HTML viejo llama a confirmCheckout(), redirigir a WhatsApp
// ============================================================
function confirmCheckout() {
  return confirmCheckoutWA();
}

function showCheckoutError(msg) {
  const errEl = document.getElementById('checkoutError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.add('show');
  }
}

function clearCheckoutError() {
  const errEl = document.getElementById('checkoutError');
  if (errEl) errEl.classList.remove('show');
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