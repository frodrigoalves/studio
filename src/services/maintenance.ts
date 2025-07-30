
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

export interface MaintenanceRecord {
  id: string;
  car: string;
  reason: string;
  startDate: string; 
}

export type MaintenanceRecordPayload = Omit<MaintenanceRecord, 'id'>;


export async function addMaintenanceRecords(records: MaintenanceRecordPayload[]): Promise<void> {
    const batch = writeBatch(db);
    const maintenanceCollection = collection(db, 'maintenanceRecords');

    records.forEach(record => {
        const docRef = doc(maintenanceCollection); 
        batch.set(docRef, record);
    });

    await batch.commit();
}
