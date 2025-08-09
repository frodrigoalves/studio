
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDoc } from 'firebase/firestore';

export interface TireRecord {
  id: string;
  carId: string;
  date: string; // ISO String
  tirePressure: number;
  tireNumber: string;
  treadDepth: number;
  rotationPerformed: boolean;
  isRetreaded: boolean;
  tirePosition: string;
  observations?: string;
}

export type TireRecordPayload = Omit<TireRecord, 'id'>;

/**
 * Salva um único registro de pneu no Firestore.
 * @param record O registro de pneu a ser salvo.
 * @returns O registro salvo com seu ID.
 */
export async function addTireRecord(record: TireRecordPayload): Promise<TireRecord> {
  const docRef = await addDoc(collection(db, 'tireRecords'), record);
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...(docSnap.data() as TireRecordPayload) };
}
