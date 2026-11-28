import { ImageResponse } from 'next/og';
import { PAGES, pageByPath } from '@/lib/pages';
import { SITE_URL } from '@/lib/site';

// One share image per registered page, drawn at build time. Only registered pages get an image,
// so the address cannot be used to make a branded picture with arbitrary text.
export const dynamic = 'force-static';
export const dynamicParams = false;

const toPath = (segments: string[]) => (segments.length === 1 && segments[0] === 'home' ? '/' : `/${segments.join('/')}`);

export function generateStaticParams() {
  return PAGES.map(p => ({ path: p.path === '/' ? ['home'] : p.path.split('/').filter(Boolean) }));
}

const HEX = 'M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z';

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const page = pageByPath(toPath((await params).path));
  if (!page) return new Response('Not found', { status: 404 });
  const size = page.title.length > 44 ? 64 : page.title.length > 30 ? 76 : 92;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#F4F5F1', padding: 72, color: '#17181A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="52" height="52" viewBox="0 0 64 64"><path d={HEX} fill="none" stroke="#F2A43A" strokeWidth="5" strokeLinejoin="round" /></svg>
          <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: 1 }}>runivo</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 30, fontWeight: 600, color: '#4E7F1F' }}>{page.kicker}</div>
          <div style={{ fontSize: size, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.04, maxWidth: 1000 }}>{page.title}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#5F635D' }}>{`Run smarter. ${new URL(SITE_URL).host.replace(/^www\./, '')}`}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } },
  );
}
