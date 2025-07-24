
'use server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, getDoc } from 'firebase/firestore';

export interface DieselPrice {
    id: string;
    date: string;
    price: string;
}

export async function saveDieselPrice(price: Omit<DieselPrice, 'id'>): Promise<DieselPrice> {
    const docRef = await addDoc(collection(db, 'dieselPrices'), price);
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...(docSnap.data() as Omit<DieselPrice, 'id'>) };
}

export async function getDieselPrices(): Promise<DieselPrice[]> {
    const q = query(collection(db, 'dieselPrices'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DieselPrice));
}
