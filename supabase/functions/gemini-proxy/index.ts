import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/genai@0.1.1.1' // Example import, adjust according to actual usage

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        return new Response('Missing Authorization Header', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    // Verify user session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
        return new Response('Unauthorized - Invalid Session', { status: 401, headers: corsHeaders })
    }

    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (redisUrl && redisToken) {
      // Import ratelimit dynamically to avoid throwing if keys are missing initially
      const { Ratelimit } = await import('https://esm.sh/@upstash/ratelimit@1.1.3');
      const { Redis } = await import('https://esm.sh/@upstash/redis@1.28.0');

      const ratelimit = new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
      });

      const { success } = await ratelimit.limit(user.id);
      if (!success) {
         return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
        console.warn("Upstash Redis credentials are not configured. Rate limiting is bypassed.");
    }

    const { prompt, action } = await req.json()
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if(!geminiApiKey) {
        throw new Error("Missing Gemini API Key configuration");
    }

    // Example of calling the Google Gen AI API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
