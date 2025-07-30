
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

export interface VehicleParameters {
  vehicleId: string;
  thresholds: {
    yellow: number;
    green: number;
    gold: number;
  };
}

/**
 * Salva uma lista de parâmetros de veículos no Firestore.
 * Cada documento terá o ID do veículo como seu ID no Firestore para fácil acesso.
 * @param parameters A lista de parâmetros de veículos a ser salva.
 */
export async function saveVehicleParameters(parameters: VehicleParameters[]): Promise<void> {
  const batch = writeBatch(db);
  const parametersCollection = collection(db, 'vehicleParameters');

  parameters.forEach(param => {
    // Usa o vehicleId como o ID do documento para fácil busca e para evitar duplicatas.
    const docRef = doc(parametersCollection, param.vehicleId); 
    batch.set(docRef, param);
  });

  await batch.commit();
}
