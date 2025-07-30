
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

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
        // Usa o número do 'car' como o ID do documento para unificar os dados por veículo.
        // Isso assume que o arquivo de importação pode ter um registro consolidado por carro
        // ou o último registro para um carro substituirá os anteriores no batch.
        const docRef = doc(fuelingCollection); 
        batch.set(docRef, record);
    });

    await batch.commit();
}
