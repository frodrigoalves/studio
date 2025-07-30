
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, writeBatch } from 'firebase/firestore';

export interface FuelingRecord {
  id: string;
  date: string;
  car: string;
  liters: number;
  pricePerLiter: number;
}

export type FuelingRecordPayload = Omit<FuelingRecord, 'id'>;

export async function addFuelingRecords(records: FuelingRecordPayload[]): Promise<void> {
    const batch = writeBatch(db);
    const fuelingCollection = collection(db, 'fuelingRecords');

    records.forEach(record => {
        const docRef = doc(fuelingCollection); // Automatically generate a new ID
        batch.set(docRef, record);
    });

    await batch.commit();
}
