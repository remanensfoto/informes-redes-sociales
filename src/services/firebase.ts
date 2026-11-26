import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DEFAULT_AGENCY_SETTINGS } from '../data/demoData';
import type { AgencySettings, ClientReport } from '../types/report';
import {
  sanitizeAgencySettingsPayload,
  sanitizeReportPayload,
} from '../utils/analytics';

export const ADMIN_EMAIL = 'remanensfoto@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function isVerifiedAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified) return false;
  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (isVerifiedAdminUser(user)) return true;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

export async function fetchAgencySettings(): Promise<AgencySettings | null> {
  const path = 'agencySettings/default';
  try {
    const snap = await getDoc(doc(db, 'agencySettings', 'default'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      agencyName: String(data.agencyName || DEFAULT_AGENCY_SETTINGS.agencyName),
      agencyTagline: String(data.agencyTagline || ''),
      agencyLogoDataUrl: String(data.agencyLogoDataUrl || ''),
      ownerId: data.ownerId ? String(data.ownerId) : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveAgencySettings(
  settings: AgencySettings,
  ownerId: string
): Promise<void> {
  const path = 'agencySettings/default';
  const ref = doc(db, 'agencySettings', 'default');
  const sanitized = sanitizeAgencySettingsPayload(settings, ownerId);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        agencyName: sanitized.agencyName,
        agencyTagline: sanitized.agencyTagline,
        agencyLogoDataUrl: sanitized.agencyLogoDataUrl,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function docToClientReport(id: string, data: Record<string, unknown>): ClientReport {
  const clientName = String(data.clientName || 'Cliente');
  const startDate =
    typeof data.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate)
      ? data.startDate
      : '2026-11-01';
  const endDate =
    typeof data.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.endDate)
      ? data.endDate
      : '2026-11-30';
  const clientKey =
    typeof data.clientKey === 'string' && data.clientKey.trim()
      ? data.clientKey
      : clientName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'cliente';

  return {
    id,
    clientKey,
    clientName,
    clientIndustry: String(data.clientIndustry || ''),
    startDate,
    endDate,
    period: String(data.period || ''),
    currency: (data.currency as ClientReport['currency']) || 'USD',
    executiveSummary: String(data.executiveSummary || ''),
    clientLogoDataUrl: String(data.clientLogoDataUrl || ''),
    isPublished: Boolean(data.isPublished),
    facebook: data.facebook as ClientReport['facebook'],
    instagram: data.instagram as ClientReport['instagram'],
    tiktok: data.tiktok as ClientReport['tiktok'],
    simulatorDefaults: data.simulatorDefaults as ClientReport['simulatorDefaults'],
    ownerId: data.ownerId ? String(data.ownerId) : undefined,
    isLocalDemo: false,
  };
}

export async function fetchPublishedReports(): Promise<ClientReport[]> {
  const path = 'reports';
  try {
    const q = query(collection(db, path), where('isPublished', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docToClientReport(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllReportsForAdmin(): Promise<ClientReport[]> {
  const path = 'reports';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map((d) => docToClientReport(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchSingleReport(reportId: string): Promise<ClientReport | null> {
  const path = `reports/${reportId}`;
  try {
    const snap = await getDoc(doc(db, 'reports', reportId));
    if (!snap.exists()) return null;
    return docToClientReport(snap.id, snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveClientReport(
  report: ClientReport,
  ownerId: string
): Promise<void> {
  const path = `reports/${report.id}`;
  const ref = doc(db, 'reports', report.id);
  const sanitized = sanitizeReportPayload(report, ownerId);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const { ownerId: _ignoredOwner, ...updatableFields } = sanitized;
      await updateDoc(ref, {
        ...updatableFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClientReport(reportId: string): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
