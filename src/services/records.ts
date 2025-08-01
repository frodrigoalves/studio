
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
  // New unified journey fields
  fuelGaugePhoto?: string | null;
  frontDiagonalPhoto?: string | null;
  rearDiagonalPhoto?: string | null;
  leftSidePhoto?: string | null;
  rightSidePhoto?: string | null;
}

export type RecordAddPayload = Omit<Record, 'id'>;
export type RecordUpdatePayload = Partial<Omit<Record, 'id' | 'driver' | 'car' | 'plate' | 'line' | 'kmStart' | 'startOdometerPhoto' | 'date'>>;

async function uploadPhoto(photoBase64: string | null, recordId: string, type: string): Promise<string | null> {
    if (!photoBase64 || !photoBase64.startsWith('data:image')) {
        return null;
    }

    const storageRef = ref(storage, `journey_photos/${recordId}-${type}-${uuidv4()}.jpg`);
    
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
        }
    }
}


export async function addRecord(record: RecordAddPayload): Promise<Record> {
  
  const tempDocRef = doc(collection(db, "tripRecords"));
  
  // Handle both old and new photo fields
  const startOdometerPhotoUrl = await uploadPhoto(record.startOdometerPhoto, tempDocRef.id, 'start-odometer');
  const endOdometerPhotoUrl = await uploadPhoto(record.endOdometerPhoto, tempDocRef.id, 'end-odometer');
  const fuelGaugePhotoUrl = await uploadPhoto(record.fuelGaugePhoto || null, tempDocRef.id, 'fuel-gauge');
  const frontDiagonalPhotoUrl = await uploadPhoto(record.frontDiagonalPhoto || null, tempDocRef.id, 'front-diagonal');
  const rearDiagonalPhotoUrl = await uploadPhoto(record.rearDiagonalPhoto || null, tempDocRef.id, 'rear-diagonal');
  const leftSidePhotoUrl = await uploadPhoto(record.leftSidePhoto || null, tempDocRef.id, 'left-side');
  const rightSidePhotoUrl = await uploadPhoto(record.rightSidePhoto || null, tempDocRef.id, 'right-side');

  const dataToSave: Omit<Record, 'id'> = {
      ...record,
      kmStart: record.kmStart ? Number(record.kmStart) : null,
      kmEnd: record.kmEnd ? Number(record.kmEnd) : null,
      date: new Date(record.date).toISOString(),
      startOdometerPhoto: startOdometerPhotoUrl,
      endOdometerPhoto: endOdometerPhotoUrl,
      fuelGaugePhoto: fuelGaugePhotoUrl,
      frontDiagonalPhoto: frontDiagonalPhotoUrl,
      rearDiagonalPhoto: rearDiagonalPhotoUrl,
      leftSidePhoto: leftSidePhotoUrl,
      rightSidePhoto: rightSidePhotoUrl,
  };

  if(isNaN(dataToSave.kmStart!)) dataToSave.kmStart = null;
  if(isNaN(dataToSave.kmEnd!)) dataToSave.kmEnd = null;

  const docRef = await addDoc(collection(db, "tripRecords"), dataToSave);
  const docSnap = await getDoc(docRef);
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

export async function deleteRecord(id: string, startPhotoUrl: string | null, endPhotoUrl: string | null): Promise<void> {
    const recordRef = doc(db, "tripRecords", id);
    
    const recordSnap = await getDoc(recordRef);
    const recordData = recordSnap.data() as Record;

    // Delete all associated photos
    await Promise.all([
        deletePhoto(recordData.startOdometerPhoto),
        deletePhoto(recordData.endOdometerPhoto),
        deletePhoto(recordData.fuelGaugePhoto || null),
        deletePhoto(recordData.frontDiagonalPhoto || null),
        deletePhoto(recordData.rearDiagonalPhoto || null),
        deletePhoto(recordData.leftSidePhoto || null),
        deletePhoto(recordData.rightSidePhoto || null),
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
