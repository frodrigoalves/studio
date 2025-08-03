
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDoc, getDocs, query, orderBy, doc, setDoc, limit, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { analyzeVehicleDamage, type DamageAnalysisInput, type DamageAnalysisOutput } from '@/ai/flows/damage-analysis-flow';

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
  damageAnalysis?: DamageAnalysisOutput;
  // Photo fields
  odometerPhoto?: string | null;
  frontDiagonalPhoto?: string | null;
  rearDiagonalPhoto?: string | null;
  leftSidePhoto?: string | null;
  rightSidePhoto?: string | null;
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
    
    // Remove os campos de foto em base64 antes de salvar no Firestore
    delete (dataToSave as any).signature; 


    // --- Damage Analysis Logic ---
    let damageAnalysisResult: DamageAnalysisOutput | undefined = undefined;
    const previousChecklist = await getLastChecklistForCar(record.carId);

    if (previousChecklist && previousChecklist.frontDiagonalPhoto && dataToSave.frontDiagonalPhoto) {
        console.log(`Analyzing damage for car ${record.carId} between current checklist and previous one from ${previousChecklist.date}`);
        try {
            const analysisInput: DamageAnalysisInput = {
                previousPhotos: {
                    front: previousChecklist.frontDiagonalPhoto,
                    rear: previousChecklist.rearDiagonalPhoto!,
                    left: previousChecklist.leftSidePhoto!,
                    right: previousChecklist.rightSidePhoto!,
                },
                currentPhotos: {
                    front: dataToSave.frontDiagonalPhoto,
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

    const finalRecord: ChecklistRecord = {
        id: recordId,
        ...dataToSave,
        damageAnalysis: damageAnalysisResult,
        signature: record.signature, // Re-add signature for final object
    };
    
    const docRef = doc(db, 'checklistRecords', recordId);
    await setDoc(docRef, finalRecord);
    
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
