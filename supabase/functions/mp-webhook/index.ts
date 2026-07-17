// ============================================================
// Edge Function: mp-webhook
// Recibe las notificaciones de MercadoPago cuando un pago cambia de estado
//
// MP nos manda un POST con { type, data: { id } }
// Nosotros consultamos a MP el detalle del pago y actualizamos la DB
// ============================================================

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      throw new Error("Variables de entorno faltantes");
    }

    // 1. Parsear el body que nos manda MP
    const body = await req.json();
    console.log("Webhook recibido:", JSON.stringify(body));

    // MP nos manda diferentes tipos de notificación, solo nos interesan los 'payment'
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      // No es de pago, ignoramos pero respondemos OK para que MP no reintente
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error("Webhook sin payment_id:", body);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Consultar a MP el detalle del pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error(`Error consultando pago ${paymentId}:`, errText);
      throw new Error(`MP devolvió ${mpResponse.status}: ${errText}`);
    }

    const payment = await mpResponse.json();
    console.log(`Pago ${paymentId} - status: ${payment.status} - external_reference: ${payment.external_reference}`);

    // 3. Recuperar el order_id de external_reference
    const orderId = parseInt(payment.external_reference, 10);
    if (!orderId || isNaN(orderId)) {
      console.error("external_reference inválido:", payment.external_reference);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Actualizar el pedido en la DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Buscar el pedido
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      console.error(`No se encontró el pedido ${orderId}`);
      throw new Error(`Pedido ${orderId} no encontrado`);
    }

    // Mapeo de status de MP a nuestros estados
    const mpStatus = payment.status; // 'approved', 'pending', 'in_process', 'rejected', 'cancelled', 'refunded'

    // Status del pedido (orders.status)
    let orderStatus = order.status;
    if (mpStatus === "approved") {
      orderStatus = "confirmed";
    } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
      orderStatus = "cancelled";
    }
    // Si está pending o in_process, lo dejamos como 'pending' (default)

    // 5. Actualizar el pedido
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        mp_payment_id: String(paymentId),
        payment_status: mpStatus,
        status: orderStatus,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error actualizando pedido:", updateError);
      throw updateError;
    }

    // 6. Si el pago fue APROBADO y el stock NO fue decrementado todavía, decrementarlo
    if (mpStatus === "approved" && !order.stock_decremented_for_payment) {
      console.log(`Decrementando stock del pedido ${orderId}...`);

      for (const item of order.order_items) {
        if (!item.product_id) continue;
        const { error: stockError } = await supabase.rpc("decrement_stock", {
          product_id: item.product_id,
          qty: item.quantity,
        });
        if (stockError) {
          console.error(`Error decrementando stock del producto ${item.product_id}:`, stockError);
        }
      }

      // Marcar como decrementado para no hacerlo dos veces
      await supabase
        .from("orders")
        .update({ stock_decremented_for_payment: true })
        .eq("id", orderId);
    }

    // 7. Si el pago fue rechazado/cancelado y el stock SÍ fue decrementado, restituir
    if ((mpStatus === "rejected" || mpStatus === "cancelled") && order.stock_decremented_for_payment && !order.stock_restored) {
      console.log(`Restituyendo stock del pedido ${orderId}...`);
      await supabase.rpc("restore_order_stock", { order_id_param: orderId });
    }

    return new Response(JSON.stringify({ ok: true, order_id: orderId, payment_status: mpStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error en mp-webhook:", error);
    // IMPORTANTE: devolver 200 igual para que MP no reintente infinitamente
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
