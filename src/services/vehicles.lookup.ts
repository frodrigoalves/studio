'use server';

import { cache } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import { VehicleParameters } from '@/lib/schemas';

// Cache SSR para reduzir leituras repetidas na mesma request
export const getVehicleById = cache(async (carId: string): Promise<VehicleParameters | null> => {
  const id = (carId || '').replace(/\D/g, '');
  if (!id) return null;

  const ref = doc(collection(db, 'vehicleParameters'), id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = { carId: snap.id, ...(snap.data() as any) } as VehicleParameters;
  if (data.status === 'inactive') return null;
  return data;
});
