// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY: Explicit origin allowlist only. No wildcard patterns.
// The *.vercel.app wildcard is intentionally removed — it allowed any
// attacker-controlled Vercel deployment to make authenticated API requests.
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://notenirman.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost',
  'tauri://localhost',
  'http://tauri.localhost',
  'capacitor://localhost',
])

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  let allowOrigin = 'https://notenirman.vercel.app'
  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    allowOrigin = requestOrigin
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
}

const GEMINI_MODEL = 'gemini-2.5-flash'

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(requestOrigin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization Header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase configuration is missing in Edge Function environment.")
      return new Response(JSON.stringify({ error: 'Service Unavailable: Backend configuration error' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid Session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

    if (redisUrl && redisToken) {
      const { Ratelimit } = await import('https://esm.sh/@upstash/ratelimit@1.1.3')
      const { Redis } = await import('https://esm.sh/@upstash/redis@1.28.0')

      const ratelimit = new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(5, '1 m'),
      })

      const { success } = await ratelimit.limit(user.id)
      if (!success) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      console.error("Upstash Redis credentials are not configured. Rejecting request fail-closed.")
      return new Response(JSON.stringify({ error: 'Service Unavailable: Rate limiting service unconfigured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // SECURITY: Body size limit prevents resource exhaustion and AI cost abuse
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 524_288) { // 512 KB
      return new Response(JSON.stringify({ error: 'Request body too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { prompt, systemInstruction } = await req.json()
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "prompt"' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // SECURITY: Prompt length cap — prevents AI token cost exhaustion
    const MAX_PROMPT_LENGTH = 100_000 // ~25K tokens
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(JSON.stringify({ error: 'Prompt exceeds maximum length' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error("Gemini API Key configuration is missing in Edge Function environment.")
      return new Response(JSON.stringify({ error: 'Service Unavailable: AI configuration error' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    }

    const requestBody: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }
    if (systemInstruction && typeof systemInstruction === 'string') {
      requestBody.systemInstruction = { role: 'system', parts: [{ text: systemInstruction }] }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`Gemini API error (${response.status}):`, data)
      return new Response(JSON.stringify({ error: 'AI provider error occurred while generating content' }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? ''

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("Unhandled error in gemini-proxy Edge Function:", error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred while processing your request' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

