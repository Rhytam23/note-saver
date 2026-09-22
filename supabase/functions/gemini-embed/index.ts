// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY: Explicit origin allowlist only. No wildcard patterns.
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


// Server-enforced model parameters
const GEMINI_EMBED_MODEL = 'gemini-embedding-2'
const TARGET_DIMENSIONS = 768
const CONFIG_VERSION = 'v1.0'

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
        limiter: Ratelimit.slidingWindow(20, '1 m'), // embeddings are cheaper; allow 20/min per user
      })

      const { success } = await ratelimit.limit(`embed:${user.id}`)
      if (!success) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      console.error('[gemini-embed] Upstash Redis credentials are not configured. Rejecting request fail-closed.')
      return new Response(JSON.stringify({ error: 'Service Unavailable: Rate limiting service unconfigured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Service Unavailable: AI configuration error' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Enforce body size limit to prevent resource exhaustion from unbounded chunk arrays
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 1_048_576) { // 1 MB
      return new Response(JSON.stringify({ error: 'Request body too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const chunks = body?.chunks

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or empty "chunks" array' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // SECURITY: Enforce maximum chunk count per request to prevent cost abuse
    const MAX_CHUNKS_PER_REQUEST = 50
    if (chunks.length > MAX_CHUNKS_PER_REQUEST) {
      return new Response(JSON.stringify({ error: `Too many chunks. Maximum ${MAX_CHUNKS_PER_REQUEST} per request.` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Process embedding requests
    const results = []
    for (const chunk of chunks) {

      const text = chunk.textContent || ''
      if (!text) continue

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: TARGET_DIMENSIONS,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data?.embedding?.values) {
        console.error(`Gemini embedding error:`, data)
        return new Response(JSON.stringify({ error: 'Embedding provider API error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const vector = data.embedding.values
      if (vector.length !== TARGET_DIMENSIONS) {
        return new Response(JSON.stringify({ error: `Dimension mismatch. Expected ${TARGET_DIMENSIONS}, got ${vector.length}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      results.push({
        chunkIndex: chunk.chunkIndex,
        vector,
        providerId: 'gemini',
        modelName: GEMINI_EMBED_MODEL,
        embeddingConfigVersion: CONFIG_VERSION,
        dimensions: TARGET_DIMENSIONS,
        contentHash: chunk.contentHash,
      })
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
