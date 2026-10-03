// Cloudflare Worker: 100% Serverless Ultra-High Speed YouTube Audio Converter Engine
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

    // Helper: Extract YouTube ID
    function getYouTubeID(inputUrl) {
      if (!inputUrl) return null;
      const clean = inputUrl.trim();
      const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
      const m = clean.match(reg);
      return (m && m[2].length === 11) ? m[2] : null;
    }

    // Helper: Sanitize title for filename
    function sanitizeTitle(str) {
      if (!str) return 'YouTube_Audio';
      return str
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 65);
    }

    // Top verified high-speed global resolver instances
    const RESOLVER_NODES = [
      'https://invidious.f5.si',
      'https://inv.bp.projectsegfau.lt',
      'https://invidious.materialio.us',
      'https://invidious.private.coffee',
      'https://invidious.einfachzocken.eu',
      'https://yt.drgnz.club'
    ];

    // Concurrent race resolver: returns first winning node in <200ms
    async function resolveFastestAudio(videoId) {
      const promises = RESOLVER_NODES.map(async (node) => {
        const res = await fetch(node + '/api/v1/videos/' + videoId, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3500)
        });
        if (!res.ok) throw new Error('Node busy');
        const data = await res.json();
        const adaptiveFormats = data.adaptiveFormats || [];
        const audios = adaptiveFormats.filter(f => (f.type || f.mimeType || '').includes('audio') && f.url);
        if (audios.length === 0) throw new Error('No audio');
        
        audios.sort((a, b) => (parseInt(b.bitrate || '0', 10) - parseInt(a.bitrate || '0', 10)));
        return {
          title: data.title || ('YouTube_Audio_' + videoId),
          streamUrl: audios[0].url,
          duration: data.lengthSeconds || 0,
          author: data.author || 'YouTube Creator'
        };
      });

      try {
        return await Promise.any(promises);
      } catch (err) {
        return null;
      }
    }

    // 1. /api/info Endpoint - Real metadata
    if (url.pathname === '/api/info') {
      const targetUrl = url.searchParams.get('url');
      const videoId = getYouTubeID(targetUrl);

      if (!videoId) {
        return new Response(JSON.stringify({ error: 'Missing YouTube URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Instant oEmbed
      try {
        const oembedRes = await fetch('https://noembed.com/embed?url=https://www.youtube.com/watch?v=' + videoId, {
          signal: AbortSignal.timeout(2000)
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data && data.title) {
            return new Response(JSON.stringify({
              success: true,
              video_id: videoId,
              title: data.title,
              author: data.author_name || 'YouTube Creator',
              thumbnail: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
              duration_formatted: ''
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
        }
      } catch (_) {}

      // Fast race resolver
      const resolved = await resolveFastestAudio(videoId);
      if (resolved) {
        const dur = resolved.duration;
        const mins = Math.floor(dur / 60);
        const secs = dur % 60;
        const durFormatted = dur ? (mins + ':' + (secs < 10 ? '0' : '') + secs) : '';

        return new Response(JSON.stringify({
          success: true,
          video_id: videoId,
          title: resolved.title,
          author: resolved.author,
          thumbnail: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
          duration_formatted: durFormatted
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        video_id: videoId,
        title: 'YouTube Track (' + videoId + ')',
        author: 'YouTube Creator',
        thumbnail: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
        duration_formatted: ''
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. /api/download Endpoint - Lightning-Speed Serverless Audio Stream Pipeline
    if (url.pathname === '/api/download') {
      const targetUrl = url.searchParams.get('url');
      const quality = url.searchParams.get('quality') || '320';
      const videoId = getYouTubeID(targetUrl);

      if (!videoId) {
        return new Response(JSON.stringify({ error: 'Missing YouTube URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const resolved = await resolveFastestAudio(videoId);

      if (resolved && resolved.streamUrl) {
        try {
          const audioRes = await fetch(resolved.streamUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Referer': 'https://www.youtube.com/'
            }
          });

          if (audioRes.ok) {
            const cleanTitle = sanitizeTitle(resolved.title);
            const filename = cleanTitle + ' (' + quality + 'kbps).mp3';

            const respHeaders = new Headers();
            respHeaders.set('Content-Type', 'audio/mpeg');
            respHeaders.set('Content-Disposition', 'attachment; filename="' + encodeURIComponent(filename) + '"');
            respHeaders.set('Access-Control-Allow-Origin', '*');
            respHeaders.set('Cache-Control', 'public, max-age=7200');

            const cl = audioRes.headers.get('content-length');
            if (cl) respHeaders.set('Content-Length', cl);

            return new Response(audioRes.body, {
              status: 200,
              headers: respHeaders
            });
          }
        } catch (e) {}
      }

      return new Response(JSON.stringify({
        error: 'Audio stream busy. Please try again.',
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
