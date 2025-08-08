
'use server';

import { auth } from '@/lib/firebase';
import { 
    signInWithEmailAndPassword, 
    signOut,
    type User
} from 'firebase/auth';


/**
 * Signs in a user with email and password.
 * @param email The user's email.
 * @param password The user's password.
 * @returns The signed-in user object.
 */
export async function signInUser(email: string, password: string): Promise<User> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error: any) {
        // Re-throw the error to be handled by the calling function (e.g., in the UI)
        console.error("Error signing in:", error);
        throw error;
    }
}


/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<void> {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
}
