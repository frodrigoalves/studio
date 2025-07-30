
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query } from 'firebase/firestore';

export interface FuelingRecord {
  id: string;
  date: string;
  car: string;
  liters: number;
  pricePerLiter: number;
}

export type FuelingRecordPayload = Omit<FuelingRecord, 'id'>;

/**
 * Salva ou atualiza os registros de abastecimento no Firestore.
 * Cada documento terá o ID do carro como seu ID no Firestore para fácil acesso e unificação.
 * @param records A lista de registros de abastecimento a ser salva.
 */
export async function addFuelingRecords(records: FuelingRecordPayload[]): Promise<void> {
    const batch = writeBatch(db);
    const fuelingCollection = collection(db, 'fuelingRecords');

    records.forEach(record => {
        const docRef = doc(fuelingCollection); 
        batch.set(docRef, record);
    });

    await batch.commit();
}


/**
 * Busca todos os registros de abastecimento do Firestore.
 * @returns Uma lista de todos os registros de abastecimento.
 */
export async function getFuelingRecords(): Promise<FuelingRecord[]> {
    const q = query(collection(db, 'fuelingRecords'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelingRecord));
}
