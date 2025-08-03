
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, orderBy, limit, addDoc, getDoc } from 'firebase/firestore';

export interface FuelingRecord {
  id: string;
  attendantChapa: string;
  attendantName: string;
  carId: string;
  odometer: number;
  pump: number;
  liters: number;
  date: string; // ISO String
  pricePerLiter?: number;
}

export type FuelingRecordPayload = Omit<FuelingRecord, 'id'>;
export type FuelingRecordAddPayload = Omit<FuelingRecord, 'id' | 'date'>;

/**
 * Salva um único registro de abastecimento no Firestore.
 * @param record O registro de abastecimento a ser salvo.
 * @returns O registro de abastecimento salvo com seu ID.
 */
export async function addFuelingRecord(record: FuelingRecordAddPayload): Promise<FuelingRecord> {
  const dataToSave = {
    ...record,
    date: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, 'fuelingRecords'), dataToSave);
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...(docSnap.data() as FuelingRecordPayload) };
}


/**
 * Salva uma lista de registros de abastecimento no Firestore.
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
    const q = query(collection(db, 'fuelingRecords'), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelingRecord));
}

/**
 * Busca o registro de abastecimento mais recente.
 * @returns O registro de abastecimento mais recente ou null se não houver nenhum.
 */
export async function getMostRecentFuelingRecord(): Promise<FuelingRecord | null> {
    const q = query(collection(db, "fuelingRecords"), orderBy("date", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as FuelingRecord;
}
