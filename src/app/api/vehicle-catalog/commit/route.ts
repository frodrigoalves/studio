import { NextRequest, NextResponse } from 'next/server';
import { parseVehiclesFromXlsx, diffCatalog } from '@/lib/catalog';
import { loadCatalog, upsertCatalogDiff } from '@/services/vehicles';

// POST multipart/form-data { file: xlsx/csv }
export async function POST(req: NextRequest) {
  try {
    // TODO: garantir role admin via middleware (auth)
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 });

    const buf  = Buffer.from(await file.arrayBuffer());
    const next = parseVehiclesFromXlsx(buf, 'BASE MEDIAS');
    const cur  = await loadCatalog();
    const { added, changed, removed } = diffCatalog(cur, next);

    // Ativos: added + changed.after
    const actives = [
      ...added,
      ...changed.map(c => ({ ...c.after, status: 'active' as const })),
    ].map(v => ({ ...v, status: 'active' as const }));

    // Inativar removidos (não deletar)
    const inactives = removed.map(v => ({ ...v, status: 'inactive' as const }));

    await upsertCatalogDiff([...actives, ...inactives]);

    return NextResponse.json({
      ok: true,
      summary: {
        added: added.length,
        changed: changed.length,
        inactivated: removed.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Falha ao aplicar catálogo' }, { status: 400 });
  }
}
