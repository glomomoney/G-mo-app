import { jsPDF } from 'jspdf';
import { PaymentMethod } from '../types';

export interface ReceiptData {
  id: string;
  date: string;
  pickupName: string;
  destName: string;
  fare: number;
  paymentMethod: PaymentMethod | string;
  vehicleClass: string;
  driverName: string;
  driverPhone?: string;
  driverPlate?: string;
  passengerName?: string;
  passengerPhone?: string;
  distanceKm?: number;
  tipAmount?: number;
  waitingTimeSeconds?: number;
  waitingFee?: number;
  pointsRedeemed?: number;
  pointsEarned?: number;
  status?: string;
}

export interface ReceiptOptions {
  slangMode?: boolean;
  language?: 'fr' | 'en';
}

export const getPaymentMethodLabel = (method: string, isFr: boolean = false): string => {
  switch (method) {
    case 'momo_mtn':
      return 'MTN Mobile Money';
    case 'orange_money':
      return 'Orange Money';
    case 'wallet':
      return 'Wanda Wallet';
    case 'cash':
      return isFr ? 'Espèces (Cash)' : 'Cash Payment';
    default:
      return method || 'Cash';
  }
};

/**
 * Generates and downloads a professional, branded PDF receipt using jsPDF.
 */
export function generateAndDownloadRideReceipt(data: ReceiptData, options: ReceiptOptions = {}): jsPDF {
  const isFr = options.language === 'fr' || options.slangMode;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette Definition
  const brandMidnight = [11, 15, 25];    // #0B0F19
  const brandGold = [234, 179, 8];       // #EAB308
  const darkGray = [30, 41, 59];         // #1E293B
  const lightGray = [100, 116, 139];     // #64748B
  const bgTable = [241, 245, 249];       // #F1F5F9
  const emeraldGreen = [16, 185, 129];   // #10B981

  const cleanId = data.id.replace(/^hist_/, '').replace(/^wnd_/i, '');
  const invoiceNumber = `WND-${cleanId.toUpperCase()}`;

  // ==========================================
  // HEADER BANNER & BRANDING
  // ==========================================
  // Primary dark background box (0 to 46mm)
  doc.setFillColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.rect(0, 0, 210, 46, 'F');

  // Gold accent separator bar (46 to 48.5mm)
  doc.setFillColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.rect(0, 46, 210, 2.5, 'F');

  // Left Corporate Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('WANDA TAXI', 15, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 187, 202);
  doc.text('Smart Urban Transit & Municipal Mobility Platform', 15, 23);
  doc.text('Web: ai.studio/build/wanda | Customer Support: +237 677 00 00 00', 15, 28);
  doc.text('RC/DLA/2026/B/1452 | Cameroon Taxpayer ID (NIU): M0726145290A', 15, 33);
  doc.text('Douala & Yaoundé Municipal Licensing Compliance Unit', 15, 38);

  // Right Receipt Header Details
  doc.setFontSize(14);
  doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'REÇU OFFICIEL DE TRAJET' : 'OFFICIAL RIDE RECEIPT', 125, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${isFr ? 'N° Facture' : 'Receipt No'}: ${invoiceNumber}`, 125, 24);
  doc.text(`${isFr ? 'Date du Trajet' : 'Date of Trip'}: ${data.date}`, 125, 29);
  doc.text(`${isFr ? 'Statut' : 'Status'}: ${data.status ? data.status.toUpperCase() : 'SETTLED & COMPLETED'}`, 125, 34);
  doc.text(`${isFr ? 'Mode de Paiement' : 'Payment Method'}: ${getPaymentMethodLabel(data.paymentMethod, isFr)}`, 125, 39);

  // ==========================================
  // SECTION 1: PASSENGER & SERVICE DETAILS
  // ==========================================
  let currentY = 58;

  // Box 1: Passenger Info
  doc.setFillColor(bgTable[0], bgTable[1], bgTable[2]);
  doc.roundedRect(15, currentY, 86, 28, 2, 2, 'F');

  doc.setFontSize(9.5);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'INFORMATIONS PASSAGER' : 'PASSENGER DETAILS', 19, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${isFr ? 'Nom' : 'Name'}: ${data.passengerName || 'Passager Wanda'}`, 19, currentY + 12);
  doc.text(`${isFr ? 'Téléphone' : 'Contact'}: ${data.passengerPhone || 'N/A'}`, 19, currentY + 17);
  doc.text(`${isFr ? 'Catégorie' : 'Category'}: ${isFr ? 'Compte Personnel / Professionnel' : 'Standard / Business Account'}`, 19, currentY + 22);

  // Box 2: Driver & Transport Info
  doc.setFillColor(bgTable[0], bgTable[1], bgTable[2]);
  doc.roundedRect(109, currentY, 86, 28, 2, 2, 'F');

  doc.setFontSize(9.5);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'CHAUFFEUR & VÉHICULE' : 'DRIVER & VEHICLE TIER', 113, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${isFr ? 'Chauffeur' : 'Driver'}: ${data.driverName}`, 113, currentY + 12);
  doc.text(`${isFr ? 'Classe' : 'Vehicle Tier'}: ${data.vehicleClass}`, 113, currentY + 17);
  doc.text(`${isFr ? 'Immatriculation' : 'License Plate'}: ${data.driverPlate || 'LT-8492-DL (Certifié)'}`, 113, currentY + 22);

  currentY += 34;

  // ==========================================
  // SECTION 2: TRIP LOGISTICS & ROUTE
  // ==========================================
  doc.setFontSize(10);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'ITINÉRAIRE DE TRANSPORT' : 'TRIP LOGISTICS & ROUTE', 15, currentY);

  currentY += 4;

  // Route Container Box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, currentY, 180, 26, 2, 2, 'D');

  // Pickup Pin Circle (Green)
  doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.circle(21, currentY + 8, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.text(`${isFr ? 'Lieu de Départ (A)' : 'Pickup Station (A)'}:`, 26, currentY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const pickupText = doc.splitTextToSize(data.pickupName, 115);
  doc.text(pickupText, 66, currentY + 8.5);

  // Connector dotted line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(21, currentY + 11, 21, currentY + 16);

  // Dropoff Pin Circle (Gold)
  doc.setFillColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.circle(21, currentY + 19, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.text(`${isFr ? 'Lieu d\'Arrivée (B)' : 'Destination (B)'}:`, 26, currentY + 19.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const destText = doc.splitTextToSize(data.destName, 115);
  doc.text(destText, 66, currentY + 19.5);

  // Distance Chip (Right side of box)
  if (data.distanceKm) {
    doc.setFillColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
    doc.roundedRect(152, currentY + 6, 38, 14, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.text(isFr ? 'DISTANCE' : 'DISTANCE', 171, currentY + 11, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`${data.distanceKm} KM`, 171, currentY + 16, { align: 'center' });
  }

  currentY += 34;

  // ==========================================
  // SECTION 3: FINANCES & ITEMIZED BREAKDOWN
  // ==========================================
  doc.setFontSize(10);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'DÉTAIL DES FRAIS ET FACTURATION' : 'FINANCIAL SUMMARY & FARE BREAKDOWN', 15, currentY);

  currentY += 5;

  // Table Header Box
  doc.setFillColor(bgTable[0], bgTable[1], bgTable[2]);
  doc.rect(15, currentY, 180, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(isFr ? 'DESCRIPTION DE LA PRESTATION' : 'DESCRIPTION OF CHARGES', 18, currentY + 5);
  doc.text(isFr ? 'MÉTHODE DE PAIEMENT' : 'BILLING METHOD', 110, currentY + 5);
  doc.text(isFr ? 'MONTANT (FCFA)' : 'SUBTOTAL (FCFA)', 162, currentY + 5);

  currentY += 7.5;

  // Calculation items
  const tip = data.tipAmount || 0;
  const waitingFee = data.waitingFee || 0;
  const discount = (data.pointsRedeemed || 0) * 10;
  const baseFareCalculated = Math.max(0, data.fare - tip - waitingFee + discount);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  // Row 1: Base Ride Fare
  currentY += 6;
  doc.text(`${isFr ? 'Course de transport' : 'Base Transport Fare'} (${data.vehicleClass})`, 18, currentY);
  doc.text(getPaymentMethodLabel(data.paymentMethod, isFr), 110, currentY);
  doc.text(`${baseFareCalculated.toLocaleString('fr-FR')} FCFA`, 162, currentY);

  // Row 2: Waiting Time (if applicable)
  if (waitingFee > 0 || (data.waitingTimeSeconds && data.waitingTimeSeconds > 0)) {
    currentY += 6;
    const mins = Math.floor((data.waitingTimeSeconds || 0) / 60);
    const secs = (data.waitingTimeSeconds || 0) % 60;
    doc.text(`${isFr ? 'Frais d\'attente chauffeur' : 'Driver Waiting Fee'} (${mins}m ${secs}s)`, 18, currentY);
    doc.text(getPaymentMethodLabel(data.paymentMethod, isFr), 110, currentY);
    doc.text(`+${waitingFee.toLocaleString('fr-FR')} FCFA`, 162, currentY);
  }

  // Row 3: Discount / Wanda Points (if applicable)
  if (discount > 0) {
    currentY += 6;
    doc.text(`${isFr ? 'Réduction Points Wanda' : 'Wanda Points Loyalty Discount'} (${data.pointsRedeemed} pts)`, 18, currentY);
    doc.text('Promotion / Loyalty', 110, currentY);
    doc.text(`-${discount.toLocaleString('fr-FR')} FCFA`, 162, currentY);
  }

  // Row 4: Driver Tip (if applicable)
  if (tip > 0) {
    currentY += 6;
    doc.text(isFr ? 'Pourboire Chauffeur (100% reversé)' : 'Driver Tip Accrued (100% to driver)', 18, currentY);
    doc.text(getPaymentMethodLabel(data.paymentMethod, isFr), 110, currentY);
    doc.text(`+${tip.toLocaleString('fr-FR')} FCFA`, 162, currentY);
  }

  // Row 5: Regulatory VAT / Taxes
  currentY += 6;
  doc.text(isFr ? 'Taxe Réglementaire de Transport / TVA' : 'Municipal Transit Regulatory Fee / VAT', 18, currentY);
  doc.text(isFr ? 'Exonéré / Inclus' : 'Included / Exempt', 110, currentY);
  doc.text('0 FCFA', 162, currentY);

  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, currentY, 195, currentY);

  // Totals Box
  currentY += 4;
  doc.setFillColor(bgTable[0], bgTable[1], bgTable[2]);
  doc.roundedRect(110, currentY, 85, 26, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${isFr ? 'Sous-total Course' : 'Base Subtotal'}:`, 114, currentY + 6);
  doc.text(`${baseFareCalculated.toLocaleString('fr-FR')} FCFA`, 162, currentY + 6);

  if (tip > 0 || waitingFee > 0 || discount > 0) {
    doc.text(`${isFr ? 'Ajustements & Forfaits' : 'Extras & Discounts'}:`, 114, currentY + 12);
    const adj = tip + waitingFee - discount;
    doc.text(`${adj >= 0 ? '+' : ''}${adj.toLocaleString('fr-FR')} FCFA`, 162, currentY + 12);
  } else {
    doc.text(`${isFr ? 'Taxes & Frais Service' : 'Taxes & Service'}:`, 114, currentY + 12);
    doc.text('0 FCFA', 162, currentY + 12);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.text(`${isFr ? 'TOTAL ACQUITTE' : 'TOTAL CHARGED'}:`, 114, currentY + 20);

  doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.text(`${data.fare.toLocaleString('fr-FR')} FCFA`, 162, currentY + 20);

  currentY += 34;

  // ==========================================
  // SECTION 4: COMPLIANCE NOTICE & BARCODE
  // ==========================================
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, currentY, 195, currentY);

  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.text(isFr ? 'Avis de Conformité & Validité Juridique' : 'Compliance Notice & Legal Status', 15, currentY);

  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  
  if (isFr) {
    doc.text('Ce reçu est délivré automatiquement par Wanda Taxi, plateforme de transport urbain certifiée au Cameroun.', 15, currentY);
    doc.text('Il sert de justificatif de paiement valable pour les comptabilités d\'entreprise et notes de frais. Pour toute vérification,', 15, currentY + 3.5);
    doc.text('scannez le code de sécurité ci-contre ou contactez le support Wanda au +237 677 00 00 00.', 15, currentY + 7);
  } else {
    doc.text('This receipt is electronically issued by Wanda Taxi, a certified urban transportation platform in Cameroon.', 15, currentY);
    doc.text('It serves as an official proof of payment valid for corporate tax and expense auditing purposes.', 15, currentY + 3.5);
    doc.text('For authenticity verification, present the security token below or contact support at +237 677 00 00 00.', 15, currentY + 7);
  }

  // Simulated Verification Barcode (Procedural lines)
  const barcodeX = 142;
  const barcodeY = currentY - 2;
  doc.setDrawColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.setLineWidth(0.35);

  const pattern = [1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1];
  let px = barcodeX;
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i] * 0.8;
    if (i % 2 === 0) {
      doc.rect(px, barcodeY, width, 10, 'F');
    }
    px += width + 0.6;
  }

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.text(`VERIFY: ${invoiceNumber}`, barcodeX, barcodeY + 13);

  // Footer Thank You Message
  currentY += 18;

  doc.setFillColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
  doc.roundedRect(15, currentY, 180, 10, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.text(
    isFr ? 'Merci d\'avoir choisi Wanda Taxi ! Tu Wanda on tes transporte en toute sécurité.' : 'Thank you for riding with Wanda Taxi! Safe, smart & reliable journeys every time.',
    105,
    currentY + 6.2,
    { align: 'center' }
  );

  // Auto save file
  const fileName = `Wanda_Receipt_${invoiceNumber}.pdf`;
  doc.save(fileName);

  return doc;
}
