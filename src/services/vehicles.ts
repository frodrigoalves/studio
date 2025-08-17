
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, orderBy, limit, getDoc, serverTimestamp } from 'firebase/firestore';
import { VehicleParameters } from '@/lib/schemas';

const BATCH_LIMIT = 450;
const COLLECTION_NAME = 'vehicleParameters';

/**
 * Aplica um diff ao catálogo de veículos no Firestore.
 * Adiciona novos, atualiza existentes e inativa os removidos.
 * @param items A lista de parâmetros de veículos a serem aplicados.
 */
export async function upsertCatalogDiff(items: VehicleParameters[]): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const slice = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const v of slice) {
      const carId = (v.carId || '').replace(/\D/g, '');
      if (!carId) continue;

      const ref = doc(collection(db, COLLECTION_NAME), carId);
      const payload = {
        status: v.status ?? 'active',
        chassisType: v.chassisType,
        thresholds: {
          yellow: Number(v.thresholds?.yellow ?? 0),
          green:  Number(v.thresholds?.green  ?? 0),
          gold:   Number(v.thresholds?.gold   ?? 0),
        },
        tankCapacity: v.tankCapacity ?? null,
        _hash: v._hash ?? null,
        updatedAt: serverTimestamp(),
      };

      batch.set(ref, payload, { merge: true });
    }

    await batch.commit();
  }
}

/**
 * Carrega o catálogo completo de veículos do Firestore.
 * @returns Um Record (mapa) com carId como chave e VehicleParameters como valor.
 */
export async function loadCatalog(): Promise<Record<string, VehicleParameters>> {
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const map: Record<string, VehicleParameters> = {};
  snap.forEach(d => {
    map[d.id] = { carId: d.id, ...(d.data() as any) } as VehicleParameters;
  });
  return map;
}

/**
 * Busca todos os parâmetros de veículos do Firestore (função legada, usar loadCatalog).
 * @returns Uma lista de todos os parâmetros de veículos.
 */
export async function getVehicleParameters(): Promise<VehicleParameters[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    if (querySnapshot.empty) {
        return [];
    }
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
    const q = query(collection(db, COLLECTION_NAME), orderBy("lastUpdated", "desc"), limit(1));
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
    const normalizedCarId = carId.trim().toUpperCase();
    const docRef = doc(db, COLLECTION_NAME, normalizedCarId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = { carId: docSnap.id, ...docSnap.data() } as VehicleParameters;
        if(data.status === 'inactive') return null;
        return data;
    }
    return null;
}
