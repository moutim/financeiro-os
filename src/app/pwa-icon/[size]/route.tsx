import { renderAppIcon, PWA_ICON_SIZES } from '@/lib/appIcon';

// PNGs do manifest (/pwa-icon/192 e /pwa-icon/512), gerados no build
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return PWA_ICON_SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  return renderAppIcon(Number(size));
}
