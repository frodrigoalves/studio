
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';

export type ChecklistItemStatus = "ok" | "avaria" | "na";

export interface ChecklistRecord {
  id: string;
  date: string; // ISO String
  driverChapa: string;
  driverName: string;
  carId: string;
  items: Record<string, ChecklistItemStatus>;
  observations: string | null;
  hasIssue: boolean;
}

export type ChecklistRecordPayload = Omit<ChecklistRecord, 'id' | 'date'>;

/**
 * Salva um único registro de vistoria no Firestore.
 * @param record O registro de vistoria a ser salvo.
 * @returns O registro salvo com seu ID.
 */
export async function addChecklistRecord(record: ChecklistRecordPayload): Promise<ChecklistRecord> {
  const dataToSave = {
    ...record,
    date: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, 'checklistRecords'), dataToSave);
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...(docSnap.data() as Omit<ChecklistRecord, 'id'>) };
}

/**
 * Busca todos os registros de vistoria do Firestore.
 * @returns Uma lista de todos os registros de vistoria.
 */
export async function getChecklistRecords(): Promise<ChecklistRecord[]> {
    const q = query(collection(db, 'checklistRecords'), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistRecord));
}
