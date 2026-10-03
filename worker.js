// Cloudflare Worker: Static Asset Serving + Render High-Speed MP3 Converter Backend Proxy
const BACKEND_URL = 'https://saverfortube-backend.onrender.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    // 1. /api/info Endpoint Proxy
    if (url.pathname === '/api/info') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing YouTube URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      try {
        const backendRes = await fetch(BACKEND_URL + '/api/info?url=' + encodeURIComponent(targetUrl), {
          signal: AbortSignal.timeout(6000)
        });
        if (backendRes.ok) {
          const data = await backendRes.json();
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      } catch (_) {}

      // Fallback oEmbed
      try {
        const oembedRes = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(targetUrl));
        const data = await oembedRes.json();
        return new Response(JSON.stringify({
          success: true,
          title: data.title || 'YouTube Audio Track',
          author: data.author_name || 'YouTube Creator',
          thumbnail: 'https://img.youtube.com/vi/default/hqdefault.jpg'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (_) {}
    }

    // 2. /api/download Endpoint Proxy
    if (url.pathname === '/api/download') {
      const targetUrl = url.searchParams.get('url');
      const quality = url.searchParams.get('quality') || '320';

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing YouTube URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      try {
        const streamUrl = BACKEND_URL + '/api/download?url=' + encodeURIComponent(targetUrl) + '&quality=' + quality;
        const backendRes = await fetch(streamUrl);

        if (backendRes.ok) {
          const respHeaders = new Headers();
          respHeaders.set('Content-Type', 'audio/mpeg');
          respHeaders.set('Access-Control-Allow-Origin', '*');
          respHeaders.set('Cache-Control', 'public, max-age=7200');

          const cd = backendRes.headers.get('content-disposition');
          if (cd) respHeaders.set('Content-Disposition', cd);

          const cl = backendRes.headers.get('content-length');
          if (cl) respHeaders.set('Content-Length', cl);

          return new Response(backendRes.body, {
            status: 200,
            headers: respHeaders
          });
        }
      } catch (e) {}

      return new Response(JSON.stringify({
        error: 'Engine starting up. Please retry in a few seconds.',
        success: false
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 3. Static Assets Serving
    let response = await env.ASSETS.fetch(request);

    if (response.status === 404) {
      const notFoundRequest = new Request(new URL('/404.html', request.url), request);
      response = await env.ASSETS.fetch(notFoundRequest);
      return response;
    }

    if (url.pathname.endsWith('.xml')) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Type', 'application/xml; charset=utf-8');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    if (url.pathname.endsWith('.xsl')) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Type', 'text/xsl; charset=utf-8');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  }
};
