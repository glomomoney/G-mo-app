// Upload d'un document KYC : plus de Firebase Storage — le fichier est lu en
// base64 et transmis au backend (PATCH /drivers/me -> kyc_documents). Le
// backend stocke la data URL et l'expose aux pages admin.

export const uploadDriverDocument = async (_uid: string, docKey: string, file: File): Promise<string> => {
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Le document dépasse 3 Mo. Compressez-le et réessayez.');
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
};
