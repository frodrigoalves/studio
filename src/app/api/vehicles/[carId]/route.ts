import { NextRequest, NextResponse } from 'next/server';
import { getVehicleById } from '@/services/vehicles.lookup';

export async function GET(_: NextRequest, { params }: { params: { carId: string } }) {
  const v = await getVehicleById(params.carId);
  if (!v) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(v);
}
