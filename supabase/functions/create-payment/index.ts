// ============================================================
// Edge Function: create-payment
// Crea una preferencia de pago en MercadoPago Checkout Pro
//
// Recibe: { order_id, items, customer, shipping_cost }
// Devuelve: { init_point, preference_id }
// ============================================================

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers para permitir requests desde el navegador
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CartItem {
  product_id: number;
  product_name: string;
  product_emoji?: string | null;
  color?: string | null;
  quantity: number;
  unit_price: number;
}

interface CreatePaymentPayload {
  order_id: number;        // ID del pedido ya creado en orders
  items: CartItem[];
  customer: {
    name: string;
    phone: string;
    address?: string | null;
    notes?: string | null;
  };
  shipping_cost?: number;
  site_url: string;        // URL del sitio para los returns (ej: https://mariadelmarblanqueria.com.ar)
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Obtener variables de entorno
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN no configurado en las variables de entorno");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      throw new Error("Variables de Supabase no configuradas");
    }

    // 2. Parsear el body
    const payload: CreatePaymentPayload = await req.json();
    const { order_id, items, customer, shipping_cost = 0, site_url } = payload;

    // 3. Validaciones básicas
    if (!order_id) throw new Error("Falta order_id");
    if (!items || items.length === 0) throw new Error("El carrito está vacío");
    if (!customer?.name || !customer?.phone) throw new Error("Faltan datos del cliente");
    if (!site_url) throw new Error("Falta site_url");

    // 4. Construir el body para MercadoPago
    // Doc: https://www.mercadopago.com.ar/developers/es/reference/preferences/_checkout_preferences/post
    const mpItems = items.map((item) => ({
      id: String(item.product_id),
      title: item.color ? `${item.product_name} - ${item.color}` : item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency_id: "ARS",
    }));

    // Si hay envío, agregarlo como item separado
    if (shipping_cost > 0) {
      mpItems.push({
        id: "shipping",
        title: "Costo de envío",
        quantity: 1,
        unit_price: shipping_cost,
        currency_id: "ARS",
      });
    }

    // Split del nombre en first_name y last_name (MP lo prefiere así)
    const [first_name, ...rest] = (customer.name || "").trim().split(" ");
    const last_name = rest.join(" ") || first_name;

    const mpBody = {
      items: mpItems,
      payer: {
        name: first_name,
        surname: last_name,
        phone: {
          number: customer.phone,
        },
        address: customer.address
          ? { street_name: customer.address }
          : undefined,
      },
      back_urls: {
        success: `${site_url}/pago-exitoso.html?order_id=${order_id}`,
        failure: `${site_url}/pago-fallido.html?order_id=${order_id}`,
        pending: `${site_url}/pago-pendiente.html?order_id=${order_id}`,
      },
      auto_return: "approved",
      external_reference: String(order_id),  // Para que en el webhook sepamos qué pedido es
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      statement_descriptor: "MARIADELMARBLANQ",
      metadata: {
        order_id,
        customer_phone: customer.phone,
      },
    };

    // 5. Llamar a la API de MercadoPago
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Error de MercadoPago:", mpData);
      throw new Error(`Error de MP: ${mpData.message || JSON.stringify(mpData)}`);
    }

    // 6. Guardar el preference_id en orders
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        mp_preference_id: mpData.id,
        payment_method: "mercadopago",
        payment_status: "pending",
        shipping_cost,
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Error actualizando orden:", updateError);
      // No bloqueamos al cliente — igual le damos el link de pago
    }

    // 7. Devolver al frontend la URL para redirigir al cliente
    // init_point = producción / sandbox_init_point = sandbox
    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preference_id: mpData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error en create-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error desconocido" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
