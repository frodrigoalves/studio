
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export interface VehicleParameters {
  carId: string;
  status: 'active' | 'inactive';
  thresholds: {
    yellow: number;
    green: number;
    gold: number;
  };
  tankCapacity?: number;
  lastUpdated: string; // ISO date string
}

/**
 * Salva uma lista de parâmetros de veículos no Firestore.
 * Cada documento terá o ID do veículo como seu ID no Firestore para fácil acesso.
 * @param parameters A lista de parâmetros de veículos a ser salva.
 */
export async function saveVehicleParameters(parameters: Omit<VehicleParameters, 'status' | 'lastUpdated'>[]): Promise<void> {
  const batch = writeBatch(db);
  const parametersCollection = collection(db, 'vehicleParameters');
  const now = new Date().toISOString();

  parameters.forEach(param => {
    // Usa o carId como o ID do documento para fácil busca e para evitar duplicatas.
    if (param.carId) { // Garante que temos um ID antes de tentar salvar
        const docRef = doc(parametersCollection, param.carId);
        // Adiciona o status 'active' e a data de atualização
        const dataToSave: Omit<VehicleParameters, 'carId'> = { 
            status: 'active' as const,
            thresholds: param.thresholds,
            tankCapacity: param.tankCapacity,
            lastUpdated: now,
        };
        batch.set(docRef, dataToSave, { merge: true }); // Usar merge: true para não sobrescrever
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

/**
 * Busca apenas os veículos ativos do Firestore.
 * @returns Uma lista de parâmetros de veículos ativos.
 */
export async function getActiveVehicles(): Promise<VehicleParameters[]> {
    const q = query(collection(db, "vehicleParameters"), where("status", "==", "active"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ carId: doc.id, ...doc.data() } as VehicleParameters));
}

/**
 * Busca o parâmetro de veículo atualizado mais recentemente.
 * @returns O parâmetro de veículo mais recente ou null se não houver nenhum.
 */
export async function getMostRecentVehicleParameter(): Promise<VehicleParameters | null> {
    const q = query(collection(db, "vehicleParameters"), orderBy("lastUpdated", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const doc = querySnapshot.docs[0];
    return { carId: doc.id, ...doc.data() } as VehicleParameters;
}
