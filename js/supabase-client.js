// =============================================================
// Cliente de Supabase + funciones de acceso a datos
// =============================================================
// Versión defensiva: si este script se carga 2 veces por error,
// no rompe nada (chequea si ya existe `window.sb` antes de declararlo).
// =============================================================

(function () {
  'use strict';

  // Si ya está cargado, no hacer nada
  if (window.sb && window.ProductsAPI) {
    console.warn('supabase-client.js: ya estaba cargado, skip.');
    return;
  }

  // Validar que el CDN y la config estén disponibles
  if (!window.supabase || !window.supabase.createClient) {
    console.error('supabase-client.js: el CDN de Supabase no está cargado.');
    return;
  }
  if (!window.SUPABASE_CONFIG) {
    console.error('supabase-client.js: window.SUPABASE_CONFIG no está definido. ¿Cargaste config.js?');
    return;
  }

  const sbClient = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  window.sb = sbClient;

  function flattenProduct(p) {
    if (!p) return null;
    return {
      id:          p.id,
      name:        p.name,
      desc:        p.description,
      description: p.description,
      price:       p.price,
      cat:         p.cat,
      subcat:      p.subcat,
      stock:       p.stock,
      emoji:       p.emoji,
      badge:       p.badge,
      indications: p.indications,
      hidden:      p.hidden,
      colors:   (p.product_colors   || []).sort((a,b)=>a.sort_order-b.sort_order).map(c => c.name),
      features: (p.product_features || []).sort((a,b)=>a.sort_order-b.sort_order).map(f => f.text),
      images:   (p.product_images   || []).sort((a,b)=>a.sort_order-b.sort_order).map(i => i.url),
    };
  }

  window.ProductsAPI = {
    async getAll() {
      const { data, error } = await sbClient
        .from('products')
        .select(`*, product_colors(name, sort_order), product_features(text, sort_order), product_images(url, sort_order)`)
        .eq('hidden', false)
        .order('id', { ascending: true });
      if (error) { console.error('Error cargando productos:', error); return []; }
      return (data || []).map(flattenProduct);
    },

    async getByCategory(cat) {
      const { data, error } = await sbClient
        .from('products')
        .select(`*, product_colors(name, sort_order), product_features(text, sort_order), product_images(url, sort_order)`)
        .eq('hidden', false)
        .eq('cat', cat)
        .order('id', { ascending: true });
      if (error) { console.error('Error cargando categoría:', error); return []; }
      return (data || []).map(flattenProduct);
    },

    async getById(id) {
      const { data, error } = await sbClient
        .from('products')
        .select(`*, product_colors(name, sort_order), product_features(text, sort_order), product_images(url, sort_order)`)
        .eq('id', id)
        .single();
      if (error) { console.error('Error cargando producto:', error); return null; }
      return flattenProduct(data);
    },

    async decrementStock(productId, qty) {
      const { data, error } = await sbClient.rpc('decrement_stock', { product_id: productId, qty: qty });
      if (error) { console.error('Error decrementando stock:', error); return { ok: false, message: 'Error de conexión' }; }
      if (data === false) return { ok: false, message: 'Stock insuficiente' };
      return { ok: true, message: 'OK' };
    },

    async decrementMultiple(items) {
      const failed = [];
      for (const item of items) {
        const result = await this.decrementStock(item.id, item.qty);
        if (!result.ok) failed.push({ ...item, reason: result.message });
      }
      return { ok: failed.length === 0, failed };
    }
  };

  window.WA_NUMBER = '91173607330';

  window.CAT_LABELS = {
    cama:     'Dormitorio',
    bano:     'Baño',
    cocina:   'Cocina',
    deco:     'Deco',
    infantil: 'Línea Infantil',
  };

  window.SUBCAT_LABELS = {
    sabanas:    'Sábanas',
    frazadas:   'Frazadas',
    almohadas:  'Almohadas',
    acolchados: 'Acolchados',
    Alfombras:  'Alfombras',
  };

  console.log('✓ supabase-client.js cargado');
})();