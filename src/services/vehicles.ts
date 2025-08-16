
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, orderBy, limit, getDoc } from 'firebase/firestore';

export interface VehicleParameters {
  carId: string;
  status: 'active' | 'inactive';
  chassisType: 'CONVENCIONAL' | 'ARTICULADO' | 'PADRON' | 'UNKNOWN';
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
export async function saveVehicleParameters(parameters: Omit<VehicleParameters, 'id' | 'status' | 'lastUpdated'>[]): Promise<void> {
  const batch = writeBatch(db);
  const parametersCollection = collection(db, 'vehicleParameters');
  const now = new Date().toISOString();

  for (const param of parameters) {
     if (!param.carId) continue;
      const docRef = doc(parametersCollection, param.carId);
      const docSnap = await getDoc(docRef);

      const dataToSave: Omit<VehicleParameters, 'carId'> = {
          status: 'active',
          chassisType: param.chassisType,
          thresholds: param.thresholds,
          tankCapacity: param.tankCapacity,
          lastUpdated: now,
      };

      if (docSnap.exists()) {
        batch.update(docRef, dataToSave);
      } else {
        batch.set(docRef, dataToSave);
      }
  }

  await batch.commit();
}


/**
 * Busca todos os parâmetros de veículos do Firestore.
 * @returns Uma lista de todos os parâmetros de veículos.
 */
export async function getVehicleParameters(): Promise<VehicleParameters[]> {
    const querySnapshot = await getDocs(collection(db, 'vehicleParameters'));
    if (querySnapshot.empty) {
        return [];
    }
    // Safely map documents, ensuring doc.data() is not undefined before spreading
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            carId: doc.id,
            ...data
        } as VehicleParameters;
    });
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
    const docSnap = querySnapshot.docs[0];
    return { carId: docSnap.id, ...docSnap.data() } as VehicleParameters;
}

/**
 * Busca um único parâmetro de veículo pelo seu ID.
 * @param carId O ID do carro.
 * @returns O parâmetro do veículo ou null se não for encontrado.
 */
export async function getVehicleById(carId: string): Promise<VehicleParameters | null> {
    if (!carId) return null;
    const docRef = doc(db, 'vehicleParameters', carId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { carId: docSnap.id, ...docSnap.data() } as VehicleParameters;
    }
    return null;
}
