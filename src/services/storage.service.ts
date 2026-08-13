import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

// Uploads one driver KYC document to `driver_kyc/{uid}/{docKey}` and
// returns its public download URL (see storage.rules — only the owning
// driver's uid may write into their own folder).
export const uploadDriverDocument = async (uid: string, docKey: string, file: File): Promise<string> => {
  const fileRef = ref(storage, `driver_kyc/${uid}/${docKey}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};
