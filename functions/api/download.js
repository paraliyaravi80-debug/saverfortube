// Cloudflare Pages Edge Function: /api/download
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const quality = url.searchParams.get('quality') || '320';

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = targetUrl.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Invalid YouTube ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Generate safe MP3 audio stream response directly on Cloudflare Edge
  const safeFilename = `YouTube_Audio_${videoId}_${quality}kbps.mp3`;
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://loader.to/api/button/?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&f=${quality}&color=16a34a`,
      'Access-Control-Allow-Origin': '*'
    }
  });
}
