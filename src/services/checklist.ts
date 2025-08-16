
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDoc, getDocs, query, orderBy, doc, setDoc, limit, where, updateDoc, select } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { analyzeVehicleDamage } from '@/ai/flows/damage-analysis-flow';

// This is a simplified type for the AI flow input. The actual type is in the flow file.
type DamageAnalysisInput = {
    previousPhotos: { front: string; rear: string; left: string; right: string; };
    currentPhotos: { front: string; rear: string; left: string; right: string; };
};

// This is a simplified type for the AI flow output. The actual type is in the flow file.
type DamageAnalysisOutput = {
    hasNewDamage: boolean;
    damageDescription: string;
    severity: "low" | "medium" | "high" | "none";
    confidenceScore: number;
};


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
  frontDiagonalPhoto: string | null;
  rearDiagonalPhoto: string | null;
  leftSidePhoto: string | null;
  rightSidePhoto: string | null;
}

// Type for the view on the Vigia Digital page
export interface ChecklistRecordWithDamage extends ChecklistRecord {
    damageAnalysis: DamageAnalysisOutput & { acknowledged?: boolean };
    previousChecklistPhotos?: PreviousChecklistPhotos;
}

// Type used when adding a new checklist record from the form
export type ChecklistRecordPayload = Omit<ChecklistRecord, 'id' | 'date' | 'damageAnalysis'> & {
    frontDiagonalPhoto: string | null; // Base64 string from form
    rearDiagonalPhoto: string | null;  // Base64 string from form
    leftSidePhoto: string | null;    // Base64 string from form
    rightSidePhoto: string | null;   // Base64 string from form
};


async function uploadPhoto(photoBase64: string | null, recordId: string, type: string): Promise<string | null> {
    if (!photoBase64 || !photoBase64.startsWith('data:image')) {
        return null;
    }
    
    // Convert base64 data URI to a Blob, which is more robust for uploading.
    const response = await fetch(photoBase64);
    const blob = await response.blob();

    const storageRef = ref(storage, `checklist_photos/${recordId}-${type}-${uuidv4()}`);
    
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


/**
 * Busca o último checklist registrado para um carro específico, retornando apenas as fotos.
 * @param carId O ID do carro.
 * @returns O último registro de vistoria (apenas com campos de foto) ou null se não houver.
 */
async function getLastChecklistForCar(carId: string): Promise<ChecklistRecord | null> {
    const q = query(
        collection(db, "checklistRecords"),
        where("carId", "==", carId),
        orderBy("date", "desc"),
        limit(1),
        select("frontDiagonalPhoto", "rearDiagonalPhoto", "leftSidePhoto", "rightSidePhoto")
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as ChecklistRecord;
}


async function runDamageAnalysisInBackground(recordId: string, currentRecord: ChecklistRecord, previousChecklist: ChecklistRecord) {
    try {
        console.log(`Analyzing damage for car ${currentRecord.carId} between current checklist and previous one from ${previousChecklist.date}`);
        const analysisInput: DamageAnalysisInput = {
            previousPhotos: {
                front: previousChecklist.frontDiagonalPhoto!,
                rear: previousChecklist.rearDiagonalPhoto!,
                left: previousChecklist.leftSidePhoto!,
                right: previousChecklist.rightSidePhoto!,
            },
            currentPhotos: {
                front: currentRecord.frontDiagonalPhoto!,
                rear: currentRecord.rearDiagonalPhoto!,
                left: currentRecord.leftSidePhoto!,
                right: currentRecord.rightSidePhoto!,
            }
        };
        const damageAnalysisResult = await analyzeVehicleDamage(analysisInput);
        
        if (damageAnalysisResult) {
            const recordRef = doc(db, 'checklistRecords', recordId);
            await updateDoc(recordRef, {
                damageAnalysis: { ...damageAnalysisResult, acknowledged: false }
            });
            console.log(`Damage analysis complete for ${recordId}. Result: ${damageAnalysisResult.hasNewDamage}`);
        }

    } catch (error) {
        console.error(`Error during background damage analysis for ${recordId}:`, error);
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
        frontDiagonalPhotoUrl,
        rearDiagonalPhotoUrl, 
        leftSidePhotoUrl, 
        rightSidePhotoUrl
    ] = await Promise.all([
        uploadPhoto(record.frontDiagonalPhoto, recordId, 'front-diagonal'),
        uploadPhoto(record.rearDiagonalPhoto, recordId, 'rear-diagonal'),
        uploadPhoto(record.leftSidePhoto, recordId, 'left-side'),
        uploadPhoto(record.rightSidePhoto, recordId, 'right-side'),
    ]);

    // Create a clean object to save to Firestore, without the base64 photo data
    const dataToSave: Omit<ChecklistRecord, 'id'> = {
        date: new Date().toISOString(),
        driverChapa: record.driverChapa,
        driverName: record.driverName,
        carId: record.carId,
        items: record.items,
        observations: record.observations,
        hasIssue: record.hasIssue,
        signature: record.signature,
        frontDiagonalPhoto: frontDiagonalPhotoUrl,
        rearDiagonalPhoto: rearDiagonalPhotoUrl,
        leftSidePhoto: leftSidePhotoUrl,
        rightSidePhoto: rightSidePhotoUrl,
    };
    
    await setDoc(doc(db, 'checklistRecords', recordId), dataToSave);
    
    // --- Start Damage Analysis in Background ---
    const previousChecklist = await getLastChecklistForCar(record.carId);
    const hasAllCurrentPhotos = dataToSave.frontDiagonalPhoto && dataToSave.rearDiagonalPhoto && dataToSave.leftSidePhoto && dataToSave.rightSidePhoto;
    const hasAllPreviousPhotos = previousChecklist?.frontDiagonalPhoto && previousChecklist?.rearDiagonalPhoto && previousChecklist?.leftSidePhoto && previousChecklist?.rightSidePhoto;

    if (previousChecklist && hasAllCurrentPhotos && hasAllPreviousPhotos) {
        // Don't await this call. Let it run in the background.
        const currentRecordForAnalysis = { ...dataToSave, id: recordId };
        runDamageAnalysisInBackground(recordId, currentRecordForAnalysis, previousChecklist);
    }
    // --- End Damage Analysis Logic ---
    
    const docSnap = await getDoc(doc(db, 'checklistRecords', recordId));
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
