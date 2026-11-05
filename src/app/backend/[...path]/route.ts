import { NextRequest, NextResponse } from 'next/server';
// Server-side API gateway for same-origin browser requests.
// Explicit method forwarding avoids exposing the internal Docker hostname.
async function proxy(request: NextRequest, context: {params: Promise<{path:string[]}>}) {
  const {path} = await context.params;
  const base = process.env.API_INTERNAL_URL;
  if (!base) return NextResponse.json({error:'API not configured'},{status:503});
  // Health endpoints intentionally bypass the API version prefix so Docker and
  // infrastructure can probe them without coupling to a public API version.
  const prefix = path[0] === 'health' ? '' : '/v1';
  const url = new URL(`${prefix}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`, base);
  const headers = new Headers();
  for (const name of ['content-type','accept','authorization','cookie','idempotency-key']) {
    const value = request.headers.get(name); if (value) headers.set(name,value);
  }
  try {
    const response = await fetch(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),cache:'no-store',signal:AbortSignal.timeout(15000)});
    const outgoing = new Headers();
    for (const name of ['content-type','set-cookie','cache-control']) {
      const value=response.headers.get(name);if(value) outgoing.set(name,value);
    }
    return new NextResponse(response.body,{status:response.status,headers:outgoing});
  } catch { return NextResponse.json({error:'Upstream unavailable'},{status:502}); }
}
export {proxy as GET,proxy as POST,proxy as PUT,proxy as PATCH,proxy as DELETE};
