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
async function confirmCheckout() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  // 1. Validar form
  const name    = document.getElementById('checkoutName').value.trim();
  const phone   = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  const notes   = document.getElementById('checkoutNotes').value.trim();

  if (!name) {
    showCheckoutError('Por favor, ingresá tu nombre');
    document.getElementById('checkoutName').focus();
    return;
  }
  if (!phone) {
    showCheckoutError('Por favor, ingresá tu teléfono');
    document.getElementById('checkoutPhone').focus();
    return;
  }

  clearCheckoutError();

  // 2. Deshabilitar botón
  const btn = document.getElementById('checkoutConfirmBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Procesando...';
  }

  // 3. Decrementar stock (atómico por ítem)
  const itemsForDecrement = Object.entries(cart).map(([key, val]) => ({
    id:   val.product.id,
    qty:  val.quantity,
    name: val.product.name,
  }));

  const result = await window.ProductsAPI.decrementMultiple(
    itemsForDecrement.map(i => ({ id: i.id, qty: i.qty }))
  );

  // 4. Si algo falló, NO continuar
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

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Confirmar pedido y abrir WhatsApp';
    }
    return;
  }

  // 5. Registrar el pedido en la DB
  const total = getCartTotal();
  const itemsCount = items.reduce((acc, i) => acc + i.quantity, 0);

  let orderId = null;
  try {
    // Insertar la cabecera del pedido
    const { data: newOrder, error: orderError } = await window.sb
      .from('orders')
      .insert({
        customer_name:    name,
        customer_phone:   phone,
        customer_address: address || null,
        customer_notes:   notes || null,
        total:            total,
        items_count:      itemsCount,
        status:           'pending',
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      throw new Error(orderError?.message || 'No se pudo crear el pedido');
    }

    orderId = newOrder.id;

    // Insertar los ítems
    const orderItems = items.map(({ product, quantity, color }) => ({
      order_id:      orderId,
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
      // Continuamos igual, el pedido cabecera ya quedó registrado
    }
  } catch (e) {
    console.warn('No se pudo registrar el pedido en la DB:', e.message);
    // Continuamos igual: aunque falle el registro, no bloqueamos al cliente
    // (el stock ya se decrementó y queremos que pueda hacer el pedido por WhatsApp)
  }

  // 6. Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'begin_checkout_whatsapp', {
      total:    total,
      products: items.map(i => i.product.name).join(', '),
      quantity: itemsCount,
      order_id: orderId,
    });
  }

  // 7. Armar mensaje de WhatsApp con datos del cliente
  let msg = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';

  // Datos del cliente
  msg += `*Mis datos:*\n`;
  msg += `Nombre: ${name}\n`;
  msg += `Telefono: ${phone}\n`;
  if (address) msg += `Dirección: ${address}\n`;
  if (notes)   msg += `Notas: ${notes}\n`;
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
  msg += '\n\n¿Cómo arreglamos el pago?';

  // 8. Limpiar carrito y cerrar
  Object.keys(cart).forEach(k => delete cart[k]);
  saveCart();
  updateFabCount();
  renderCart();
  closeCart();
  closeCheckoutModal();

  // Reset form
  document.getElementById('checkoutName').value = '';
  document.getElementById('checkoutPhone').value = '';
  document.getElementById('checkoutAddress').value = '';
  document.getElementById('checkoutNotes').value = '';

  // Reset botón
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'Confirmar pedido y abrir WhatsApp';
  }

  // 9. Refrescar productos visibles
  if (typeof window.refreshProducts === 'function') {
    window.refreshProducts();
  }

  // 10. Abrir WhatsApp
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
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