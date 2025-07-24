
'use server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

export interface DieselPrice {
    id: string;
    date: string;
    price: string;
}

export async function saveDieselPrice(price: Omit<DieselPrice, 'id'>): Promise<DieselPrice> {
    const docRef = await addDoc(collection(db, 'dieselPrices'), price);
    return { id: docRef.id, ...price };
}

export async function getDieselPrices(): Promise<DieselPrice[]> {
    const q = query(collection(db, 'dieselPrices'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DieselPrice));
}
