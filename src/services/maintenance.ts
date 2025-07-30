
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query } from 'firebase/firestore';

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


/**
 * Busca todos os registros de manutenção do Firestore.
 * @returns Uma lista de todos os registros de manutenção.
 */
export async function getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, 'maintenanceRecords'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
}
