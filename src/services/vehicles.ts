
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';

export interface VehicleParameters {
  carId: string;
  thresholds: {
    yellow: number;
    green: number;
    gold: number;
  };
  tankCapacity?: number;
}

/**
 * Salva uma lista de parâmetros de veículos no Firestore.
 * Cada documento terá o ID do veículo como seu ID no Firestore para fácil acesso.
 * @param parameters A lista de parâmetros de veículos a ser salva.
 */
export async function saveVehicleParameters(parameters: Omit<VehicleParameters, 'tankCapacity'>[]): Promise<void> {
  const batch = writeBatch(db);
  const parametersCollection = collection(db, 'vehicleParameters');

  parameters.forEach(param => {
    // Usa o carId como o ID do documento para fácil busca e para evitar duplicatas.
    if (param.carId) { // Garante que temos um ID antes de tentar salvar
        const docRef = doc(parametersCollection, param.carId); 
        batch.set(docRef, param, { merge: true }); // Usar merge: true para não sobrescrever
    }
  });

  await batch.commit();
}


/**
 * Busca todos os parâmetros de veículos do Firestore.
 * @returns Uma lista de todos os parâmetros de veículos.
 */
export async function getVehicleParameters(): Promise<VehicleParameters[]> {
    const querySnapshot = await getDocs(collection(db, 'vehicleParameters'));
    return querySnapshot.docs.map(doc => ({ carId: doc.id, ...doc.data() } as VehicleParameters));
}
