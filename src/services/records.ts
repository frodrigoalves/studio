
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, orderBy } from 'firebase/firestore';

export interface Record {
  id: string;
  date: string;
  driver: string;
  car: string;
  plate: string;
  kmStart: number | null;
  kmEnd: number | null;
  status: "Finalizado" | "Em Andamento";
  startOdometerPhoto: string | null;
  endOdometerPhoto: string | null;
}

export async function addRecord(record: Omit<Record, 'id'>): Promise<Record> {
  const docRef = await addDoc(collection(db, "tripRecords"), record);
  return { id: docRef.id, ...record };
}

export async function updateRecord(id: string, record: Partial<Omit<Record, 'id'>>): Promise<void> {
    const recordRef = doc(db, "tripRecords", id);
    await updateDoc(recordRef, record);
}


export async function getRecords(): Promise<Record[]> {
    const q = query(collection(db, "tripRecords"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record));
}

export async function getRecordByPlateAndStatus(plate: string, status: "Em Andamento"): Promise<Record | null> {
    const q = query(collection(db, "tripRecords"), where("plate", "==", plate), where("status", "==", status));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Record;
}
