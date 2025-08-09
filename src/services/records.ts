
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, orderBy, limit, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';


export interface Record {
  id: string;
  date: string; // ISO String
  driver: string;
  car: string;
  plate: string;
  line: string;
  kmStart: number | null;
  kmEnd: number | null;
  status: "Finalizado" | "Em Andamento";
  startOdometerPhoto: string | null;
  endOdometerPhoto: string | null;
  startFuelLevel?: number | null;
  endFuelLevel?: number | null;
  startFuelPhoto?: string | null;
  endFuelPhoto?: string | null;
}

export type RecordAddPayload = Omit<Record, 'id'>;
export type RecordUpdatePayload = Partial<Omit<Record, 'id'>>;

async function uploadPhoto(photoBase64: string | null, recordId: string, type: string): Promise<string | null> {
    if (!photoBase64 || !photoBase64.startsWith('data:image')) {
        return null;
    }

    const storageRef = ref(storage, `trip_photos/${recordId}-${type}-${uuidv4()}.jpg`);
    
    // Convert base64 data URI to a Blob, which is more robust for uploading.
    const response = await fetch(photoBase64);
    const blob = await response.blob();
    
    try {
        const metadata = { contentType: blob.type || 'image/jpeg' };
        await uploadBytes(storageRef, blob, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error(`Detailed error payload for photo upload (${type}):`, error);
        throw error;
    }
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
  const tempDocForId = doc(collection(db, "tripRecords"));
  const recordId = tempDocForId.id;

  // Only upload photos that exist for the start of the trip
  const [startOdometerPhotoUrl, startFuelPhotoUrl] = await Promise.all([
     uploadPhoto(record.startOdometerPhoto, recordId, 'start-odometer'),
     uploadPhoto(record.startFuelPhoto, recordId, 'start-fuel'),
  ]);
  
  const dataToSave: Omit<Record, 'id'> = {
      ...record,
      kmStart: record.kmStart ? Number(record.kmStart) : null,
      kmEnd: null,
      date: new Date(record.date).toISOString(),
      startOdometerPhoto: startOdometerPhotoUrl,
      endOdometerPhoto: null, // Always null on creation
      startFuelLevel: record.startFuelLevel,
      startFuelPhoto: startFuelPhotoUrl,
      endFuelLevel: null, // Always null on creation
      endFuelPhoto: null, // Always null on creation
  };
  
  if(isNaN(dataToSave.kmStart!)) dataToSave.kmStart = null;

  await setDoc(doc(db, "tripRecords", recordId), dataToSave);
  
  const docSnap = await getDoc(doc(db, "tripRecords", recordId));
  return { id: docSnap.id, ...(docSnap.data() as Omit<Record, 'id'>) };
}

export async function updateRecord(id: string, data: RecordUpdatePayload): Promise<void> {
    
    const recordRef = doc(db, "tripRecords", id);
    const originalDocSnap = await getDoc(recordRef);
    if (!originalDocSnap.exists()) {
        throw new Error(`Record with id ${id} not found.`);
    }
    const originalData = originalDocSnap.data() as Record;

    const dataToUpdate: { [key: string]: any } = { ...data };

    if (data.kmStart !== undefined) {
        const kmStartNumber = Number(data.kmStart);
        dataToUpdate.kmStart = isNaN(kmStartNumber) ? null : kmStartNumber;
    }
    
    if (data.kmEnd !== undefined) {
        const kmEndNumber = Number(data.kmEnd);
        dataToUpdate.kmEnd = isNaN(kmEndNumber) ? null : kmEndNumber;
    }
    
     if (data.date) {
        dataToUpdate.date = new Date(data.date).toISOString();
    }
    
    // Handle photo updates only if a new base64 string is provided
    if (data.endOdometerPhoto && typeof data.endOdometerPhoto === 'string' && data.endOdometerPhoto.startsWith('data:image')) {
        if (originalData.endOdometerPhoto) {
            await deletePhoto(originalData.endOdometerPhoto);
        }
        dataToUpdate.endOdometerPhoto = await uploadPhoto(data.endOdometerPhoto, id, 'end-odometer');
    }

    if (data.endFuelPhoto && typeof data.endFuelPhoto === 'string' && data.endFuelPhoto.startsWith('data:image')) {
        if (originalData.endFuelPhoto) {
            await deletePhoto(originalData.endFuelPhoto);
        }
        dataToUpdate.endFuelPhoto = await uploadPhoto(data.endFuelPhoto, id, 'end-fuel');
    }

    // Remove base64 strings from the payload to avoid saving them in Firestore
    if (dataToUpdate.startOdometerPhoto && typeof dataToUpdate.startOdometerPhoto === 'string' && dataToUpdate.startOdometerPhoto.startsWith('data:image')) {
       delete dataToUpdate.startOdometerPhoto;
    }
     if (dataToUpdate.startFuelPhoto && typeof dataToUpdate.startFuelPhoto === 'string' && dataToUpdate.startFuelPhoto.startsWith('data:image')) {
       delete dataToUpdate.startFuelPhoto;
    }


    await updateDoc(recordRef, dataToUpdate);
}

export async function deleteRecord(id: string): Promise<void> {
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
        deletePhoto(recordData.startFuelPhoto),
        deletePhoto(recordData.endFuelPhoto),
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
