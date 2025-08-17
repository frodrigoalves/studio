import { NextRequest, NextResponse } from 'next/server';
import { parseVehiclesFromXlsx, diffCatalog } from '@/lib/catalog';
import { loadCatalog } from '@/services/vehicles';

// POST multipart/form-data { file: xlsx/csv }
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const next = parseVehiclesFromXlsx(buf, 'BASE MEDIAS'); // cai na 1ª aba se não existir
    const cur  = await loadCatalog();
    const diff = diffCatalog(cur, next);

    return NextResponse.json(diff);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Falha ao validar' }, { status: 400 });
  }
}
