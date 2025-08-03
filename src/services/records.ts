
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';


export interface Record {
  id: string;
  date: string;
  driver: string;
  car: string;
  plate: string;
  line: string;
  kmStart: number | null;
  kmEnd: number | null;
  status: "Finalizado" | "Em Andamento";
  startOdometerPhoto: string | null;
  endOdometerPhoto: string | null;
}

export type RecordAddPayload = Omit<Record, 'id'>;
export type RecordUpdatePayload = Partial<Omit<Record, 'id' | 'driver' | 'car' | 'plate' | 'line' | 'kmStart' | 'startOdometerPhoto' | 'date'>>;

async function uploadPhoto(photoBase64: string | null, recordId: string, type: string): Promise<string | null> {
    if (!photoBase64 || !photoBase64.startsWith('data:image')) {
        return null;
    }

    const storageRef = ref(storage, `trip_photos/${recordId}-${type}-${uuidv4()}.jpg`);
    
    const base64String = photoBase64.split(',')[1];
    
    await uploadString(storageRef, base64String, 'base64');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

async function deletePhoto(photoUrl: string | null) {
    if (!photoUrl) return;
    try {
        const photoRef = ref(storage, photoUrl);
        await deleteObject(photoRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.log(`Photo not found, skipping delete: ${photoUrl}`);
        } else {
            console.error(`Failed to delete photo: ${photoUrl}`, error);
            // Don't rethrow, as we want to continue to delete the Firestore doc
        }
    }
}


export async function addRecord(record: RecordAddPayload): Promise<Record> {
  // Use um ID pré-gerado para consistência entre Firestore e Storage
  const tempDocForId = doc(collection(db, "tripRecords"));
  const recordId = tempDocForId.id;

  // Primeiro, faça o upload da foto inicial para o Storage
  const startOdometerPhotoUrl = await uploadPhoto(record.startOdometerPhoto, recordId, 'start-odometer');

  // Prepare os dados para salvar no Firestore, usando a URL da foto, não a string base64
  const dataToSave: Omit<Record, 'id'> = {
      ...record,
      kmStart: record.kmStart ? Number(record.kmStart) : null,
      kmEnd: record.kmEnd ? Number(record.kmEnd) : null,
      date: new Date(record.date).toISOString(),
      startOdometerPhoto: startOdometerPhotoUrl,
      endOdometerPhoto: null, // Foto final será adicionada na atualização
  };
  
  if(isNaN(dataToSave.kmStart!)) dataToSave.kmStart = null;
  if(isNaN(dataToSave.kmEnd!)) dataToSave.kmEnd = null;

  // Crie o documento no Firestore usando o ID pré-gerado
  await setDoc(doc(db, "tripRecords", recordId), dataToSave);
  
  // Retorne o registro completo
  const docSnap = await getDoc(doc(db, "tripRecords", recordId));
  return { id: docSnap.id, ...(docSnap.data() as Omit<Record, 'id'>) };
}

export async function updateRecord(id: string, data: RecordUpdatePayload): Promise<void> {
    
    const endOdometerPhotoUrl = await uploadPhoto(data.endOdometerPhoto || null, id, 'end-odometer');
    
    const recordRef = doc(db, "tripRecords", id);
    const dataToUpdate: { [key: string]: any } = { ...data };

    if (endOdometerPhotoUrl) {
        dataToUpdate.endOdometerPhoto = endOdometerPhotoUrl;
    } else {
        delete dataToUpdate.endOdometerPhoto;
    }

    if (data.kmEnd !== undefined) {
        const kmEndNumber = Number(data.kmEnd);
        dataToUpdate.kmEnd = isNaN(kmEndNumber) ? null : kmEndNumber;
    }

    await updateDoc(recordRef, dataToUpdate);
}

export async function deleteRecord(id: string, startPhotoUrl: string | null, endOdometerUrl: string | null): Promise<void> {
    const recordRef = doc(db, "tripRecords", id);
    
    const recordSnap = await getDoc(recordRef);
    if (!recordSnap.exists()) {
      console.warn(`Record with id ${id} not found for deletion.`);
      return; 
    }
    const recordData = recordSnap.data() as Record;

    await Promise.all([
        deletePhoto(recordData.startOdometerPhoto),
        deletePhoto(recordData.endOdometerPhoto),
    ]);

    await deleteDoc(recordRef);
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

export async function getLastTripRecordForCar(carId: string): Promise<Record | null> {
    const q = query(
        collection(db, "tripRecords"),
        where("car", "==", carId),
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
