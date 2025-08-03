
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDoc, getDocs, query, orderBy, doc, setDoc, limit, where, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { analyzeVehicleDamage, type DamageAnalysisInput, type DamageAnalysisOutput } from '@/ai/flows/damage-analysis-flow';

export type ChecklistItemStatus = "ok" | "avaria" | "na";

interface PreviousChecklistPhotos {
    front: string;
    rear: string;
    left: string;
    right: string;
}

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
  damageAnalysis?: DamageAnalysisOutput & { acknowledged?: boolean };
  // Photo fields
  odometerPhoto?: string | null;
  frontDiagonalPhoto?: string | null;
  rearDiagonalPhoto?: string | null;
  leftSidePhoto?: string | null;
  rightSidePhoto?: string | null;
}

// Type for the view on the Vigia Digital page
export interface ChecklistRecordWithDamage extends ChecklistRecord {
    damageAnalysis: DamageAnalysisOutput & { acknowledged?: boolean };
    previousChecklistPhotos?: PreviousChecklistPhotos;
}

export type ChecklistRecordPayload = Omit<ChecklistRecord, 'id' | 'date' | 'damageAnalysis'>;

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
 * Busca o último checklist registrado para um carro específico.
 * @param carId O ID do carro.
 * @returns O último registro de vistoria ou null se não houver.
 */
async function getLastChecklistForCar(carId: string): Promise<ChecklistRecord | null> {
    const q = query(
        collection(db, "checklistRecords"),
        where("carId", "==", carId),
        orderBy("date", "desc"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as ChecklistRecord;
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

    const dataToSave: Omit<ChecklistRecord, 'id'> = {
        ...record,
        date: new Date().toISOString(),
        odometerPhoto: odometerPhotoUrl,
        frontDiagonalPhoto: frontDiagonalPhotoUrl,
        rearDiagonalPhoto: rearDiagonalPhotoUrl,
        leftSidePhoto: leftSidePhotoUrl,
        rightSidePhoto: rightSidePhotoUrl,
    };
    
    // --- Damage Analysis Logic ---
    let damageAnalysisResult: DamageAnalysisOutput | undefined = undefined;
    const previousChecklist = await getLastChecklistForCar(record.carId);

    const hasAllCurrentPhotos = dataToSave.frontDiagonalPhoto && dataToSave.rearDiagonalPhoto && dataToSave.leftSidePhoto && dataToSave.rightSidePhoto;
    const hasAllPreviousPhotos = previousChecklist?.frontDiagonalPhoto && previousChecklist?.rearDiagonalPhoto && previousChecklist?.leftSidePhoto && previousChecklist?.rightSidePhoto;

    if (previousChecklist && hasAllCurrentPhotos && hasAllPreviousPhotos) {
        console.log(`Analyzing damage for car ${record.carId} between current checklist and previous one from ${previousChecklist.date}`);
        try {
            const analysisInput: DamageAnalysisInput = {
                previousPhotos: {
                    front: previousChecklist.frontDiagonalPhoto!,
                    rear: previousChecklist.rearDiagonalPhoto!,
                    left: previousChecklist.leftSidePhoto!,
                    right: previousChecklist.rightSidePhoto!,
                },
                currentPhotos: {
                    front: dataToSave.frontDiagonalPhoto!,
                    rear: dataToSave.rearDiagonalPhoto!,
                    left: dataToSave.leftSidePhoto!,
                    right: dataToSave.rightSidePhoto!,
                }
            };
            damageAnalysisResult = await analyzeVehicleDamage(analysisInput);
        } catch (error) {
            console.error("Error during damage analysis AI flow:", error);
            // Don't block the main process if AI fails
        }
    }
    // --- End Damage Analysis Logic ---

    const finalRecord: Omit<ChecklistRecord, 'id'> = {
        ...dataToSave,
        damageAnalysis: damageAnalysisResult ? { ...damageAnalysisResult, acknowledged: false } : undefined,
    };
    
    // Remove base64 photos before saving to DB
    delete (finalRecord as any).odometerPhoto;
    delete (finalRecord as any).frontDiagonalPhoto;
    delete (finalRecord as any).rearDiagonalPhoto;
    delete (finalRecord as any).leftSidePhoto;
    delete (finalRecord as any).rightSidePhoto;

    finalRecord.odometerPhoto = odometerPhotoUrl;
    finalRecord.frontDiagonalPhoto = frontDiagonalPhotoUrl;
    finalRecord.rearDiagonalPhoto = rearDiagonalPhotoUrl;
    finalRecord.leftSidePhoto = leftSidePhotoUrl;
    finalRecord.rightSidePhoto = rightSidePhotoUrl;
    
    const docRef = doc(db, 'checklistRecords', recordId);
    await setDoc(docRef, finalRecord);
    
    const docSnap = await getDoc(docRef);
    return { id: docSnap.id, ...docSnap.data() } as ChecklistRecord;
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


/**
 * Busca todos os registros de vistoria que possuem um resultado de análise de dano.
 * @returns Uma lista de registros de vistoria com análise de dano.
 */
export async function getChecklistRecordsWithDamage(): Promise<ChecklistRecordWithDamage[]> {
    const q = query(collection(db, 'checklistRecords'), where("damageAnalysis.hasNewDamage", "==", true), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    
    const records: ChecklistRecordWithDamage[] = [];

    for (const docSnap of querySnapshot.docs) {
        const currentRecord = { id: docSnap.id, ...docSnap.data() } as ChecklistRecordWithDamage;
        
        // Find the previous checklist to get its photos for comparison view
        const prevQ = query(
            collection(db, "checklistRecords"),
            where("carId", "==", currentRecord.carId),
            where("date", "<", currentRecord.date),
            orderBy("date", "desc"),
            limit(1)
        );
        const prevSnapshot = await getDocs(prevQ);

        if (!prevSnapshot.empty) {
            const prevRecord = prevSnapshot.docs[0].data() as ChecklistRecord;
            currentRecord.previousChecklistPhotos = {
                front: prevRecord.frontDiagonalPhoto || '',
                rear: prevRecord.rearDiagonalPhoto || '',
                left: prevRecord.leftSidePhoto || '',
                right: prevRecord.rightSidePhoto || '',
            };
        }
        records.push(currentRecord);
    }

    return records;
}

/**
 * Marca um alerta de dano como "ciente" no Firestore.
 * @param recordId O ID do registro de vistoria a ser atualizado.
 */
export async function acknowledgeDamage(recordId: string): Promise<void> {
    const recordRef = doc(db, "checklistRecords", recordId);
    await updateDoc(recordRef, {
        "damageAnalysis.acknowledged": true
    });
}

    