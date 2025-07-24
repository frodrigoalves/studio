
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, orderBy, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';


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
export type RecordUpdatePayload = Partial<Omit<Record, 'id' | 'driver' | 'car' | 'plate' | 'kmStart' | 'startOdometerPhoto' | 'date'>>;

async function uploadPhoto(photoBase64: string | null, recordId: string, type: 'start' | 'end'): Promise<string | null> {
    if (!photoBase64) return null;

    const storageRef = ref(storage, `odometer_photos/${recordId}-${type}-${uuidv4()}.jpg`);
    
    // A foto já está em base64 com o prefixo 'data:image/jpeg;base64,'
    // O uploadString espera a string base64 pura, então removemos o prefixo.
    const base64String = photoBase64.split(',')[1];
    
    await uploadString(storageRef, base64String, 'base64');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}


export async function addRecord(record: RecordAddPayload): Promise<Record> {
  
  const tempDocRef = doc(collection(db, "tripRecords"));
  
  const startOdometerPhotoUrl = await uploadPhoto(record.startOdometerPhoto, tempDocRef.id, 'start');

  const dataToSave = {
      ...record,
      kmStart: record.kmStart ? Number(record.kmStart) : null,
      kmEnd: record.kmEnd ? Number(record.kmEnd) : null,
      date: new Date(record.date).toISOString().split('T')[0],
      startOdometerPhoto: startOdometerPhotoUrl,
      endOdometerPhoto: null // End photo is always null on creation
  };

  if(isNaN(dataToSave.kmStart!)) dataToSave.kmStart = null;
  if(isNaN(dataToSave.kmEnd!)) dataToSave.kmEnd = null;

  const docRef = await addDoc(collection(db, "tripRecords"), dataToSave);
  const docSnap = await getDoc(docRef);
  return { id: docSnap.id, ...(docSnap.data() as Omit<Record, 'id'>) };
}

export async function updateRecord(id: string, data: RecordUpdatePayload): Promise<void> {
    
    const endOdometerPhotoUrl = await uploadPhoto(data.endOdometerPhoto || null, id, 'end');
    
    const recordRef = doc(db, "tripRecords", id);
    const dataToUpdate: { [key: string]: any } = { ...data };

    if (endOdometerPhotoUrl) {
        dataToUpdate.endOdometerPhoto = endOdometerPhotoUrl;
    }

    if (data.kmEnd !== undefined) {
        const kmEndNumber = Number(data.kmEnd);
        dataToUpdate.kmEnd = isNaN(kmEndNumber) ? null : kmEndNumber;
    }

    // Remove a propriedade da foto em base64 para não salvar no firestore
    delete dataToUpdate.endOdometerPhotoFile;

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
