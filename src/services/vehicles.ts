
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
 * Inclui validação robusta e tratamento de erros.
 * @param parameters A lista de parâmetros de veículos a ser salva.
 * @returns Uma Promise que resolve quando o commit do lote estiver completo, ou rejeita com um erro.
 */
export async function saveVehicleParameters(parameters: Omit<VehicleParameters, 'status' | 'lastUpdated'>[]): Promise<void> {
  const batch = writeBatch(db);
  const parametersCollection = collection(db, 'vehicleParameters');
  const errors: { param: any; error: string }[] = []; // Array para registrar erros de validação
  const now = new Date().toISOString();

  parameters.forEach(param => {
    // Validação robusta
    if (!param.carId || typeof param.carId !== 'string' || param.carId.trim() === '') {
      errors.push({ param, error: 'Invalid or missing carId' });
      return; // Pula este parâmetro
    }
    if (!param.thresholds || typeof param.thresholds !== 'object') {
        errors.push({ param, error: `Invalid or missing thresholds for carId: ${param.carId}` });
        return; // Pula
    }
    if (typeof param.thresholds.yellow !== 'number' || typeof param.thresholds.green !== 'number' || typeof param.thresholds.gold !== 'number') {
        errors.push({ param, error: `Invalid threshold values for carId: ${param.carId}` });
        return; // Pula
    }
    if (param.tankCapacity !== undefined && typeof param.tankCapacity !== 'number') { // tankCapacity é opcional, só valida se existir
         errors.push({ param, error: `Invalid tankCapacity for carId: ${param.carId}` });
         return; // Pula
    }

    const docRef = doc(parametersCollection, param.carId);
    const dataToSave: Omit<VehicleParameters, 'carId'> = {
      status: 'active' as const,
      thresholds: param.thresholds,
      tankCapacity: param.tankCapacity,
      lastUpdated: now
    };
    batch.set(docRef, dataToSave, { merge: true });
  });

  if (errors.length > 0) {
      console.error("Erros de validação durante saveVehicleParameters:", errors);
      // Você pode querer lançar um erro aqui ou notificar o usuário de forma mais elegante.
  }

  try {
    await batch.commit();
    if(errors.length > 0) {
        console.log(`Salvo com sucesso ${parameters.length - errors.length} de ${parameters.length} parâmetros de veículos. ${errors.length} foram ignorados devido a erros de validação.`);
    } else {
        console.log(`Salvo com sucesso ${parameters.length} parâmetros de veículos.`);
    }
  } catch (error) {
    console.error("Erro ao commitar o lote de parâmetros de veículos:", error);
    throw new Error("Falha ao salvar parâmetros de veículos. Verifique as permissões do Firestore."); // Lança o erro novamente
  }
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
