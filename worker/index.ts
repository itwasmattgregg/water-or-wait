import {
  AdviceError,
  buildAdvice,
  queryFromUrl,
} from '../src/lib/adviceService'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      ...CORS,
    },
  })
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: CORS })
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'water-or-wait', version: 1 })
    }

    if (url.pathname === '/api/v1/advice' || url.pathname === '/api/advice') {
      if (request.method !== 'GET') {
        return json({ ok: false, error: 'Method not allowed' }, 405)
      }
      try {
        const result = await buildAdvice(queryFromUrl(url))
        return json(result)
      } catch (err) {
        const status = err instanceof AdviceError ? err.status : 502
        const message =
          err instanceof Error ? err.message : 'Failed to compute advice'
        console.error(JSON.stringify({ level: 'error', message, status }))
        return json({ ok: false, error: message }, status)
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return json(
        {
          ok: false,
          error: 'Not found',
          endpoints: ['GET /api/health', 'GET /api/v1/advice'],
        },
        404,
      )
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
