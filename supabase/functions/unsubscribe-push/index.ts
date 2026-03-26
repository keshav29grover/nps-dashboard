import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const projectUrl = Deno.env.get("PROJECT_URL") ?? ""
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? ""

const supabase = createClient(projectUrl, serviceRoleKey)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  try {
    const { endpoint } = await req.json()

    if (!projectUrl || !serviceRoleKey) {
      return json({ error: "Server secrets are missing" }, 500)
    }

    if (!endpoint || typeof endpoint !== "string") {
      return json({ error: "A valid endpoint is required" }, 400)
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)

    if (error) {
      console.error("unsubscribe-push delete failed", error)
      return json({ error: "Failed to remove subscription" }, 500)
    }

    return json({ ok: true })
  } catch (error) {
    console.error("unsubscribe-push unexpected error", error)
    return json({ error: "Invalid request payload" }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}
