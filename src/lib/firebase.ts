/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const fbApiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY;

if (!fbApiKey) {
  console.warn("VITE_FIREBASE_API_KEY environment variable is not defined. Please add VITE_FIREBASE_API_KEY inside your Settings/Secrets menu to authenticate with Firebase.");
}

const firebaseConfig = {
  apiKey: fbApiKey || "MISSING_API_KEY",
  authDomain: "graphical-rite-x7k72.firebaseapp.com",
  projectId: "graphical-rite-x7k72",
  storageBucket: "graphical-rite-x7k72.firebasestorage.app",
  messagingSenderId: "311055735326",
  appId: "1:311055735326:web:4067c853e83b51fe9aec0f"
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db = getFirestore(app, "ai-studio-c9aec333-d47c-4e45-93e7-74da3bac3d85");

// Initialize Auth
export const auth = getAuth(app);

// Validate Connection to Firestore on startup
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

