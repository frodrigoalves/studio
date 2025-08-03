
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDoc, getDocs, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

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
  signature: string | null;
  // Photo fields
  odometerPhoto?: string | null;
  fuelGaugePhoto?: string | null;
  frontDiagonalPhoto?: string | null;
  rearDiagonalPhoto?: string | null;
  leftSidePhoto?: string | null;
  rightSidePhoto?: string | null;
}

export type ChecklistRecordPayload = Omit<ChecklistRecord, 'id' | 'date'>;

async function uploadPhoto(photoBase64: string | null, recordId: string, type: string): Promise<string | null> {
    if (!photoBase64 || !photoBase64.startsWith('data:image')) {
        return null;
    }
    const storageRef = ref(storage, `checklist_photos/${recordId}-${type}-${uuidv4()}.jpg`);
    const base64String = photoBase64.split(',')[1];
    
    try {
        await uploadString(storageRef, base64String, 'base64');
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error(`Failed to upload photo for ${recordId}, type: ${type}`, error);
        return null; // Return null on failure to prevent breaking the main function
    }
}

/**
 * Salva um único registro de vistoria no Firestore.
 * @param record O registro de vistoria a ser salvo.
 * @returns O registro salvo com seu ID.
 */
export async function addChecklistRecord(record: ChecklistRecordPayload): Promise<ChecklistRecord> {
    const tempDocRef = doc(collection(db, "checklistRecords"));
    const recordId = tempDocRef.id;

    const [
        odometerPhotoUrl, frontDiagonalPhotoUrl,
        rearDiagonalPhotoUrl, leftSidePhotoUrl, rightSidePhotoUrl
    ] = await Promise.all([
        uploadPhoto(record.odometerPhoto || null, recordId, 'odometer'),
        uploadPhoto(record.frontDiagonalPhoto || null, recordId, 'front-diagonal'),
        uploadPhoto(record.rearDiagonalPhoto || null, recordId, 'rear-diagonal'),
        uploadPhoto(record.leftSidePhoto || null, recordId, 'left-side'),
        uploadPhoto(record.rightSidePhoto || null, recordId, 'right-side'),
    ]);

    const dataToSave: ChecklistRecord = {
        id: recordId,
        ...record,
        date: new Date().toISOString(),
        odometerPhoto: odometerPhotoUrl,
        frontDiagonalPhoto: frontDiagonalPhotoUrl,
        rearDiagonalPhoto: rearDiagonalPhotoUrl,
        leftSidePhoto: leftSidePhotoUrl,
        rightSidePhoto: rightSidePhotoUrl,
    };

    const docRef = doc(db, 'checklistRecords', recordId);
    await setDoc(docRef, dataToSave);
    
    const docSnap = await getDoc(docRef);
    return docSnap.data() as ChecklistRecord;
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
