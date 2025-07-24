
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, orderBy, limit } from 'firebase/firestore';

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

export type RecordAddPayload = Omit<Record, 'id'>;
export type RecordUpdatePayload = Partial<Omit<Record, 'id'>>;

export async function addRecord(record: RecordAddPayload): Promise<Record> {
  const dataToSave = {
      ...record,
      kmStart: record.kmStart ? Number(record.kmStart) : null,
      kmEnd: record.kmEnd ? Number(record.kmEnd) : null,
  };

  if(isNaN(dataToSave.kmStart!)) dataToSave.kmStart = null;
  if(isNaN(dataToSave.kmEnd!)) dataToSave.kmEnd = null;

  const docRef = await addDoc(collection(db, "tripRecords"), dataToSave);
  const docSnap = await getDoc(docRef);
  return { id: docSnap.id, ...(docSnap.data() as Omit<Record, 'id'>) };
}

export async function updateRecord(id: string, data: RecordUpdatePayload): Promise<void> {
    const recordRef = doc(db, "tripRecords", id);
    const dataToUpdate: { [key: string]: any } = { ...data };

    if (dataToUpdate.kmEnd !== undefined) {
        dataToUpdate.kmEnd = dataToUpdate.kmEnd ? Number(dataToUpdate.kmEnd) : null;
         if(isNaN(dataToUpdate.kmEnd!)) dataToUpdate.kmEnd = null;
    }
    
    if (dataToUpdate.kmStart !== undefined) {
        dataToUpdate.kmStart = dataToUpdate.kmStart ? Number(dataToUpdate.kmStart) : null;
        if(isNaN(dataToUpdate.kmStart!)) dataToUpdate.kmStart = null;
    }

    await updateDoc(recordRef, dataToUpdate);
}


export async function getRecords(): Promise<Record[]> {
    const q = query(collection(db, "tripRecords"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record));
}

export async function getRecordByPlateAndStatus(plate: string, status: "Em Andamento"): Promise<Record | null> {
    const q = query(
        collection(db, "tripRecords"), 
        where("plate", "==", plate), 
        where("status", "==", status),
        orderBy("date", "desc"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Record;
}
