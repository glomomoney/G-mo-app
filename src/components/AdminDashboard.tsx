import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert,
  AlertTriangle,
  Settings,
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Clock, 
  Grid, 
  Smartphone, 
  Award,
  Sliders,
  RefreshCw,
  Search,
  Bell,
  Save,
  Database,
  Cloud,
  Check,
  AlertCircle,
  Percent,
  Send,
  Sparkles,
  Globe,
  UserCheck,
  Calendar,
  Edit3,
  Megaphone,
  Zap,
  Play,
  Trash2,
  Tag,
  Car,
  Building2,
  ShieldCheck,
  FileText,
  UploadCloud,
  Eye,
  UserPlus,
  Phone,
  ExternalLink,
  Lock,
  Unlock,
  ChevronRight,
  Image,
  MessageSquare,
  Download,
  CheckCircle2,
  X,
  LogOut
} from 'lucide-react';
import WandaLogo from './WandaLogo';
import { PaymentMethod, AppNotification, NotificationScheduleConfig, AdminRole } from '../types';
import { apiRequest } from '../lib/api';
import {
  saveSettingsToFirestore,
  subscribeToSettings,
  sendNotificationToFirestore,
  subscribeToNotifications,
  saveNotificationScheduleToFirestore,
  subscribeToNotificationSchedule
} from '../lib/firebaseService';
import { fetchStaffList, createStaffMember, updateStaffMember, StaffMember } from '../services/admin.service';
import { updateDriverAccountAsAdmin } from '../services/users.service';


interface AdminDashboardProps {
  onClose: () => void;
  onLogout?: () => void;
  adminRole: AdminRole;
  driversList: any[];
  onApproveDriver: (id: string, customMessage?: string) => void;
  onRejectDriver: (id: string, reason?: string) => void;
  onUpdateDriversList?: (updatedList: any[]) => void;
  systemSettings: {
    commissionRate: number;
    surgeMultiplier: number;
    minimumWithdrawal: number;
    topupPromoActive?: boolean;
    topupPromoRate?: number;
    classRates?: Record<string, { baseFare: number; perKm: number }>;
  };
  onUpdateSettings: (settings: { 
    commissionRate: number; 
    surgeMultiplier: number; 
    minimumWithdrawal: number;
    topupPromoActive?: boolean;
    topupPromoRate?: number;
    classRates?: Record<string, { baseFare: number; perKm: number }>;
  }) => void;
  transactions: any[];
  onApproveWithdrawal: (tx: any) => void;
}

export default function AdminDashboard({
  onClose,
  onLogout,
  adminRole,
  driversList,
  onApproveDriver,
  onRejectDriver,
  onUpdateDriversList,
  systemSettings,
  onUpdateSettings,
  transactions,
  onApproveWithdrawal
}: AdminDashboardProps) {
  // Le rôle affiché/appliqué est celui du compte réellement connecté — plus un
  // sélecteur libre (qui permettait à n'importe quel staff de s'auto-élever
  // à super_admin côté UI, même si le backend refusait ensuite les écritures).
  const activeAdminRole = adminRole;
  const [tab, setTab] = useState<'kpi' | 'drivers' | 'transactions' | 'settings' | 'notifications' | 'roles'>('kpi');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWeatherAlert, setActiveWeatherAlert] = useState<string>('Normal Skies');

  // Real operational KPIs (GET /admin/kpi), polled.
  const [kpi, setKpi] = useState<{
    total_users: number;
    total_drivers: number;
    total_rides: number;
    completed_rides: number;
    cancelled_rides: number;
    total_revenue_fcfa: number;
    total_commission_fcfa: number;
    pending_withdrawals: number;
    pending_driver_approvals: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await apiRequest('/admin/kpi', { admin: true });
        if (!cancelled) setKpi(data || null);
      } catch (err) {
        console.warn('KPI fetch failed:', (err as any)?.message || err);
      }
    };

    load();
    const timer = setInterval(load, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Staff Users & Department Rules Directory — GET/POST/PATCH /admin/staff
  const [staffUsers, setStaffUsers] = useState<StaffMember[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<AdminRole>('accounting');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStaffList()
      .then((list) => { if (!cancelled) setStaffUsers(list); })
      .catch((err) => { if (!cancelled) console.warn('fetchStaffList error:', err?.message || err); });
    return () => { cancelled = true; };
  }, []);

  // Driver KYC Inspection & Profile Drawer State
  const [selectedDriverForKyc, setSelectedDriverForKyc] = useState<any | null>(null);
  const [kycSubTab, setKycSubTab] = useState<'account' | 'documents' | 'audit'>('account');
  const [driverFilterStatus, setDriverFilterStatus] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');

  // Driver Account Form State inside KYC Modal
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editVehicleModel, setEditVehicleModel] = useState('');
  const [editVehiclePlate, setEditVehiclePlate] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('ecoride');
  const [editCity, setEditCity] = useState('Douala');
  const [editCnicNumber, setEditCnicNumber] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editForensicNotes, setEditForensicNotes] = useState('');
  const [isSavingAccountDetails, setIsSavingAccountDetails] = useState(false);
  const [isSavingForensicNotes, setIsSavingForensicNotes] = useState(false);

  // Document Replacement State
  const [editingDocKey, setEditingDocKey] = useState<string | null>(null);
  const [replacementUrlInput, setReplacementUrlInput] = useState('');
  const [docReplacementFeedback, setDocReplacementFeedback] = useState<string | null>(null);

  // Driver Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [driverToReject, setDriverToReject] = useState<any | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [rejectionPreset, setRejectionPreset] = useState('');
  const [kycSuccessToast, setKycSuccessToast] = useState<string | null>(null);

  // Image Zoom Modal State
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Firebase Firestore Settings Form & Sync State
  const [formData, setFormData] = useState(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Push Notifications Management State
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>([]);
  const [notificationSegment, setNotificationSegment] = useState<'passengers' | 'drivers' | 'schedule' | 'calculator'>('passengers');
  
  // Custom Broadcast Composer State
  const [composerTarget, setComposerTarget] = useState<'passenger' | 'driver' | 'all'>('passenger');
  const [composerTitle, setComposerTitle] = useState('');
  const [composerMessage, setComposerMessage] = useState('');
  const [composerType, setComposerType] = useState<'promo' | 'info' | 'alert' | 'route_fare'>('promo');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSendFeedback, setNotifSendFeedback] = useState<string | null>(null);

  // Automated Schedule & Templates State
  const [scheduleConfig, setScheduleConfig] = useState<NotificationScheduleConfig>({
    enabled: true,
    timesPerDay: 3,
    timesList: ["08:00", "12:30", "18:00"],
    language: "fr",
    passengerTemplates: [
      {
        title: "⚡ Réduction Wallet Wanda 15%",
        message: "Économisez 15% sur toutes vos courses Wanda en payant directement avec votre Portefeuille Wallet Wanda !"
      },
      {
        title: "🎁 Bonus de Recharge +20%",
        message: "Chaque rechargement Wallet Wanda vous donne droit à 20% de crédit bonus immédiatement !"
      },
      {
        title: "🚖 Meilleur Tarif du Pays Garanti",
        message: "Nos tarifs sont les meilleurs du Cameroun ! Effectuez vos trajets BMRC <-> Bastos au meilleur prix."
      }
    ],
    driverTemplates: [
      {
        title: "🚀 Heure de Pointe - Bastos / Akwa",
        message: "Demande élevée détectée ! Connectez-vous pour accepter des courses au meilleur tarif."
      },
      {
        title: "💰 Commission Wanda Réduite",
        message: "Complétez 10 courses aujourd'hui et conservez 90% de vos gains !"
      }
    ]
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<string | null>(null);

  // Route Fare Calculator Simulator State
  const [calcFrom, setCalcFrom] = useState('BMRC');
  const [calcTo, setCalcTo] = useState('Bastos');
  const [calcDistance, setCalcDistance] = useState(7.5);
  const [calcClass, setCalcClass] = useState('ecoride');
  const [calcLang, setCalcLang] = useState<'fr' | 'en'>('fr');

  // Sync formData with systemSettings when props change
  useEffect(() => {
    setFormData(systemSettings);
  }, [systemSettings]);

  // Subscribe directly to Firestore settings, notifications & schedule collections
  useEffect(() => {
    const unsubscribeSettings = subscribeToSettings((firestoreData) => {
      if (firestoreData) {
        setFormData(prev => ({
          ...prev,
          ...firestoreData,
          classRates: {
            ...(prev.classRates || {}),
            ...(firestoreData.classRates || {})
          }
        }));
        setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    });

    const unsubscribeNotifications = subscribeToNotifications((list) => {
      setNotificationsList(list as AppNotification[]);
    });

    const unsubscribeSchedule = subscribeToNotificationSchedule((sched) => {
      if (sched) {
        setScheduleConfig(prev => ({
          ...prev,
          ...sched
        }));
      }
    });

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeSchedule) unsubscribeSchedule();
    };
  }, []);

  // Dispatch custom push notification to Firestore
  const handleSendCustomNotification = async (targetOverride?: 'passenger' | 'driver' | 'all') => {
    const target = targetOverride || composerTarget;
    if (!composerTitle.trim() || !composerMessage.trim()) {
      setNotifSendFeedback("Veuillez saisir un titre et un message.");
      return;
    }

    setIsSendingNotif(true);
    setNotifSendFeedback(null);

    try {
      await sendNotificationToFirestore({
        target,
        title: composerTitle,
        message: composerMessage,
        type: composerType,
        timestamp: new Date().toISOString(),
        language: scheduleConfig.language,
        readBy: []
      });

      setNotifSendFeedback(`Push envoyé avec succès aux ${target === 'passenger' ? 'Passagers' : target === 'driver' ? 'Chauffeurs' : 'Tous'} !`);
      setComposerTitle('');
      setComposerMessage('');
      setTimeout(() => setNotifSendFeedback(null), 5000);
    } catch (err: any) {
      setNotifSendFeedback(`Erreur lors de l'envoi : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Save Notification Schedule to Firestore
  const handleSaveNotificationSchedule = async () => {
    setIsSavingSchedule(true);
    setScheduleFeedback(null);
    try {
      await saveNotificationScheduleToFirestore(scheduleConfig);
      setScheduleFeedback(`Planning des 3 notifications quotidiennes enregistré dans Firestore !`);
      setTimeout(() => setScheduleFeedback(null), 5000);
    } catch (err: any) {
      setScheduleFeedback(`Erreur de sauvegarde : ${err?.message || 'Erreur'}`);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Trigger immediate test dispatch of daily generated message
  const handleTriggerDailyGeneratedMessage = async (templateIndex: number) => {
    setIsSendingNotif(true);
    setNotifSendFeedback(null);

    try {
      const template = scheduleConfig.passengerTemplates[templateIndex] || scheduleConfig.passengerTemplates[0];
      
      // Calculate real fare for route if included
      let routeData = undefined;
      let title = template.title;
      let message = template.message;

      if (template.includeRouteFare || templateIndex === 2) {
        const rates = formData.classRates?.[calcClass] || { baseFare: 1500, perKm: 250 };
        const baseFare = rates.baseFare;
        const perKm = rates.perKm;
        const distance = calcDistance;
        const rawFare = (baseFare + (distance * perKm)) * (formData.surgeMultiplier || 1.0);
        const walletFare = Math.round(rawFare * 0.85); // 15% discount with wallet

        routeData = {
          fromName: calcFrom,
          toName: calcTo,
          distanceKm: distance,
          estimatedFare: walletFare,
          vehicleClass: calcClass
        };

        if (scheduleConfig.language === 'en') {
          title = `⚡ Best Fare Deal Today: ${calcFrom} -> ${calcTo}`;
          message = `Ride from ${calcFrom} to ${calcTo} for only ${walletFare.toLocaleString('en-US')} FCFA with your 15% Wanda Wallet discount! Our fare is the best in the country.`;
        } else {
          title = `⚡ Meilleure Offre du Jour : ${calcFrom} -> ${calcTo}`;
          message = `Trajet de ${calcFrom} à ${calcTo} pour seulement ${walletFare.toLocaleString('fr-FR')} FCFA grâce à la réduction Wallet 15% ! Nos tarifs sont les meilleurs du pays.`;
        }
      }

      await sendNotificationToFirestore({
        target: 'passenger',
        title,
        message,
        type: 'promo',
        timestamp: new Date().toISOString(),
        language: scheduleConfig.language,
        readBy: [],
        routeData
      });

      setNotifSendFeedback(`Message généré #${templateIndex + 1} envoyé en Push direct aux passagers !`);
      setTimeout(() => setNotifSendFeedback(null), 5000);
    } catch (err: any) {
      setNotifSendFeedback(`Erreur : ${err?.message || 'Erreur'}`);
    } finally {
      setIsSendingNotif(false);
    }
  };


  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    try {
      await saveSettingsToFirestore(formData);
      onUpdateSettings(formData);
      setSaveSuccessMessage(`Enregistré dans Firestore ('settings/pricing') avec succès ! (${new Date().toLocaleTimeString('fr-FR')})`);
      setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Error saving to Firestore:', err);
      setSaveErrorMessage(`Erreur lors de la sauvegarde Firestore : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Local helper for weather/surge presets
  const triggerSimulationSurge = (weather: string, surge: number) => {
    setActiveWeatherAlert(weather);
    onUpdateSettings({
      ...systemSettings,
      surgeMultiplier: surge
    });
  };

  // Compute stats
  const totalRevenue = transactions
    .filter(t => t.status === 'success' && t.type === 'topup')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.status === 'success' && t.type === 'withdrawal')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingWithdrawalsCount = transactions.filter(t => t.status === 'pending' && t.type === 'withdrawal').length;

  // Helper to retrieve driver KYC documents
  const getDriverKYCDocuments = (driver: any) => {
    // Uniquement les documents réellement uploadés par le chauffeur — pas de
    // photo de substitution : un document manquant doit rester visiblement
    // "non fourni", jamais se faire passer pour un vrai document soumis.
    return driver.kycDocuments || {};
  };

  const isTabAllowedForRole = (tabKey: string, role: AdminRole): boolean => {
    if (role === 'super_admin') return true;
    if (role === 'accounting') return ['kpi', 'transactions', 'settings'].includes(tabKey);
    if (role === 'publicity') return ['kpi', 'notifications'].includes(tabKey);
    if (role === 'forensic') return ['kpi', 'drivers'].includes(tabKey);
    return false;
  };

  const openDriverKycModal = (driver: any) => {
    setSelectedDriverForKyc(driver);
    setEditDriverName(driver.name || '');
    setEditDriverPhone(driver.phone || '');
    setEditVehicleModel(driver.vehicleModel || '');
    setEditVehiclePlate(driver.vehiclePlate || '');
    setEditVehicleType(driver.vehicleType || 'ecoride');
    setEditCity(driver.city || 'Douala');
    setEditCnicNumber(driver.cnicNumber || '');
    setEditLicenseNumber(driver.licenseNumber || '');
    setEditForensicNotes(driver.forensicNotes || '');
    setKycSubTab('account');
  };

  const handleSaveDriverAccountDetails = async () => {
    if (!selectedDriverForKyc) return;
    setIsSavingAccountDetails(true);
    try {
      const updated = await updateDriverAccountAsAdmin(selectedDriverForKyc.id, {
        name: editDriverName,
        phone: editDriverPhone,
        vehicle_model: editVehicleModel,
        vehicle_plate: editVehiclePlate,
        vehicle_type: editVehicleType,
        cnic_number: editCnicNumber,
        license_number: editLicenseNumber,
      });
      const updatedDriver = {
        ...selectedDriverForKyc,
        name: updated.name,
        phone: updated.phone,
        vehicleModel: updated.vehicleModel,
        vehiclePlate: updated.vehiclePlate,
        vehicleType: updated.vehicleType,
        city: editCity,
        cnicNumber: updated.cnicNumber,
        licenseNumber: updated.licenseNumber
      };
      setSelectedDriverForKyc(updatedDriver);
      const newList = driversList.map(d => d.id === updatedDriver.id ? updatedDriver : d);
      if (onUpdateDriversList) onUpdateDriversList(newList);
      setKycSuccessToast("Compte chauffeur mis à jour avec succès !");
      setTimeout(() => setKycSuccessToast(null), 3000);
    } catch (err: any) {
      setKycSuccessToast(`Erreur : ${err?.message || 'échec de la sauvegarde'}`);
      setTimeout(() => setKycSuccessToast(null), 4000);
    } finally {
      setIsSavingAccountDetails(false);
    }
  };

  const handleSaveForensicNotes = async () => {
    if (!selectedDriverForKyc) return;
    setIsSavingForensicNotes(true);
    try {
      const updated = await updateDriverAccountAsAdmin(selectedDriverForKyc.id, {
        forensic_notes: editForensicNotes,
      });
      const updatedDriver = { ...selectedDriverForKyc, forensicNotes: updated.forensicNotes };
      setSelectedDriverForKyc(updatedDriver);
      const newList = driversList.map(d => d.id === updatedDriver.id ? updatedDriver : d);
      if (onUpdateDriversList) onUpdateDriversList(newList);
      setKycSuccessToast("Notes d'audit enregistrées !");
      setTimeout(() => setKycSuccessToast(null), 3000);
    } catch (err: any) {
      setKycSuccessToast(`Erreur : ${err?.message || 'échec de la sauvegarde'}`);
      setTimeout(() => setKycSuccessToast(null), 4000);
    } finally {
      setIsSavingForensicNotes(false);
    }
  };

  const handleReplaceDocument = async (docKey: string, newUrl: string, note?: string) => {
    if (!selectedDriverForKyc) return;
    const currentDocs = getDriverKYCDocuments(selectedDriverForKyc);
    const targetDoc = currentDocs[docKey] || { title: docKey };

    const updatedDoc = {
      ...targetDoc,
      url: newUrl,
      updatedByAdmin: true,
      updatedAt: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      status: 'admin_replaced',
      adminNote: note || 'Remplacé par l\'administrateur via envoi HD'
    };

    const newKycDocs = {
      ...currentDocs,
      [docKey]: updatedDoc
    };

    try {
      const updated = await updateDriverAccountAsAdmin(selectedDriverForKyc.id, {
        kyc_documents: newKycDocs,
      });
      const updatedDriver = { ...selectedDriverForKyc, kycDocuments: updated.kycDocuments };
      setSelectedDriverForKyc(updatedDriver);
      const newList = driversList.map(d => d.id === updatedDriver.id ? updatedDriver : d);
      if (onUpdateDriversList) onUpdateDriversList(newList);
      setDocReplacementFeedback(`Document "${targetDoc.title || docKey}" remplacé avec succès par l'administrateur !`);
    } catch (err: any) {
      setDocReplacementFeedback(`Erreur : ${err?.message || 'échec du remplacement'}`);
    } finally {
      setEditingDocKey(null);
      setReplacementUrlInput('');
      setTimeout(() => setDocReplacementFeedback(null), 4000);
    }
  };

  const handleAddStaffUser = async () => {
    if (!newStaffName || !newStaffEmail || !newStaffPassword) return;
    setStaffError(null);
    setIsCreatingStaff(true);
    try {
      const created = await createStaffMember({
        name: newStaffName,
        email: newStaffEmail,
        password: newStaffPassword,
        role: newStaffRole,
      });
      setStaffUsers(prev => [...prev, created]);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setShowAddStaffModal(false);
    } catch (err: any) {
      setStaffError(err?.message || 'Échec de la création du compte');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleUpdateStaffRole = async (staffId: string, newRole: AdminRole) => {
    const deptMap: Record<AdminRole, string> = {
      super_admin: 'Direction Générale (Super Admin)',
      accounting: 'Comptabilité & Finances',
      publicity: 'Publicité & Marketing',
      forensic: 'Analyse Forensic & Conformité KYC'
    };
    try {
      const updated = await updateStaffMember(staffId, { role: newRole, departmentName: deptMap[newRole] });
      setStaffUsers(prev => prev.map(u => u.id === staffId ? updated : u));
    } catch (err: any) {
      setStaffError(err?.message || 'Échec de la mise à jour du rôle');
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-md z-[1500] flex flex-col overflow-hidden text-white font-sans" id="admin-dashboard-modal">
      
      {/* Top Admin Navigation Header */}
      <header className="bg-brand-deep border-b border-brand-card px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <WandaLogo className="w-10 h-10 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)]" />
          <div>
            <h1 className="text-base font-black tracking-widest text-brand-gold flex items-center gap-2">
              WANDA ADMIN <span className="bg-brand-gold/15 text-brand-gold border border-brand-gold/25 text-[9px] font-black tracking-normal px-2 py-0.5 rounded-full uppercase">HQ Console</span>
            </h1>
            <p className="text-[10px] text-brand-text-muted italic font-bold">Gestion Flotte, Comptabilité, Publicité & Conformité Forensic</p>
          </div>
        </div>

        {/* Department Role & Server Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real role of the connected admin account — read-only display */}
          <div className="bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <ShieldCheck size={14} className="text-brand-gold" />
            <span className="text-[11px] font-bold text-brand-text-muted">Département :</span>
            <span className="text-brand-gold font-extrabold text-xs">
              {activeAdminRole === 'super_admin' ? '👑 Super Admin (Direction Générale)' :
               activeAdminRole === 'accounting' ? '💰 Comptabilité' :
               activeAdminRole === 'publicity' ? '📢 Publicité' :
               '🔍 Forensic & Conformité'}
            </span>
          </div>

          <div className="hidden lg:flex bg-brand-card/60 rounded-xl px-3 py-1.5 border border-brand-input items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="font-bold text-brand-text">Serveur : <strong className="text-emerald-400">ONLINE (Port 3000)</strong></span>
          </div>

          <button
            onClick={onClose}
            className="bg-brand-card hover:bg-brand-input border border-brand-input hover:text-brand-gold text-brand-text-muted px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer"
            id="close-admin-btn"
          >
            ← Quitter Console
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
              id="admin-logout-btn"
            >
              <LogOut size={13} /> Déconnexion
            </button>
          )}
        </div>
      </header>

      {/* Admin Panel Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side Tab Drawer */}
        <aside className="w-full md:w-64 bg-brand-deep/60 border-r border-brand-card/80 p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
          <div className="hidden md:block text-[10px] font-black uppercase text-brand-text-muted tracking-wider px-3 pb-1 border-b border-brand-input/40 mb-1">
            Menu Département
          </div>

          <button
            onClick={() => setTab('kpi')}
            disabled={!isTabAllowedForRole('kpi', activeAdminRole)}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'kpi' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'} ${!isTabAllowedForRole('kpi', activeAdminRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Grid size={16} />
            <span>Synthèse & Analytics</span>
          </button>

          <button
            onClick={() => setTab('drivers')}
            disabled={!isTabAllowedForRole('drivers', activeAdminRole)}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'drivers' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'} ${!isTabAllowedForRole('drivers', activeAdminRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Users size={16} />
            <span>Chauffeurs & Dossiers KYC</span>
            {driversList.filter(d => d.approvalStatus === 'pending').length > 0 && (
              <span className="ml-auto bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                {driversList.filter(d => d.approvalStatus === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('transactions')}
            disabled={!isTabAllowedForRole('transactions', activeAdminRole)}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'transactions' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'} ${!isTabAllowedForRole('transactions', activeAdminRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Smartphone size={16} />
            <span>Comptabilité & Retraits</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="ml-auto bg-amber-500 text-brand-midnight font-extrabold text-[9px] px-2 py-0.5 rounded-full animate-pulse">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('settings')}
            disabled={!isTabAllowedForRole('settings', activeAdminRole)}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'settings' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'} ${!isTabAllowedForRole('settings', activeAdminRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Sliders size={16} />
            <span>Tarification & Commission (15%)</span>
          </button>

          <button
            onClick={() => setTab('notifications')}
            disabled={!isTabAllowedForRole('notifications', activeAdminRole)}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'notifications' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'} ${!isTabAllowedForRole('notifications', activeAdminRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Bell size={16} />
            <span>Publicité & Broadcasts</span>
            {notificationsList.length > 0 && (
              <span className="ml-auto bg-brand-gold text-brand-midnight font-extrabold text-[9px] px-2 py-0.5 rounded-full font-mono">
                {notificationsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('roles')}
            disabled={!isTabAllowedForRole('roles', activeAdminRole)}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'roles' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'} ${!isTabAllowedForRole('roles', activeAdminRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Building2 size={16} />
            <span>Rôles & Départements</span>
            <span className="ml-auto bg-brand-gold/20 text-brand-gold text-[8px] font-black px-1.5 py-0.5 rounded uppercase">HQ</span>
          </button>
        </aside>

        {/* Right Main Content Scrollport */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW / ANALYTICS TAB */}
            {tab === 'kpi' && (
              <motion.div
                key="kpi-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Weather / Jam Simulator dispatch banner */}
                <div className="bg-brand-card border border-brand-input rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-gold font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      <Bell size={12} className="animate-bounce" />
                      Douala Simulation Dispatch Engine
                    </span>
                    <h3 className="text-sm font-black text-white">
                      Current Traffic Factor: <span className="text-brand-gold text-glow-gold font-mono">{systemSettings.surgeMultiplier.toFixed(1)}x Surge</span> • Alerts: <span className="text-emerald-400 font-semibold">{activeWeatherAlert}</span>
                    </h3>
                  </div>

                  {/* Dispatch triggers */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => triggerSimulationSurge('Normal Skies', 1.0)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${activeWeatherAlert === 'Normal Skies' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'}`}
                    >
                      ☀️ Normal (1.0x)
                    </button>
                    <button
                      onClick={() => triggerSimulationSurge('Rain in Bastos', 1.5)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${activeWeatherAlert === 'Rain in Bastos' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'}`}
                    >
                      🌧️ Heavy Rain (1.5x)
                    </button>
                    <button
                      onClick={() => triggerSimulationSurge('Ndokoti Junction Jam', 2.0)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${activeWeatherAlert === 'Ndokoti Junction Jam' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'}`}
                    >
                      🚦 Ndokoti Gridlock (2.0x)
                    </button>
                  </div>
                </div>

                {/* PROMINENT LIVE PRICING GRID OVERVIEW CARD */}
                <div className="bg-brand-deep/90 border border-brand-gold/30 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-brand-card">
                    <div>
                      <div className="text-[10px] font-black uppercase text-brand-gold tracking-widest flex items-center gap-1.5">
                        <DollarSign size={12} className="text-emerald-400" /> Grille Tarifaire Actuelle (Frais de Base & Prix au KM)
                      </div>
                      <p className="text-xs text-brand-text-muted font-medium">Tarifs en vigueur appliqués immédiatement lors du calcul des courses passagers.</p>
                    </div>
                    <button
                      onClick={() => setTab('settings')}
                      className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sliders size={13} />
                      <span>Modifier les Tarifs →</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'okada', name: 'Moto-Taxi (Okada)', defaultBase: 250, defaultPerKm: 80, icon: '🏍️' },
                      { id: 'keke', name: 'Petit Taxi (Yellow Cab)', defaultBase: 300, defaultPerKm: 100, icon: '🛺' },
                      { id: 'ecoride', name: 'EcoRide (Private Sedan)', defaultBase: 1500, defaultPerKm: 250, icon: '🚗' },
                      { id: 'comfort', name: 'VIP Ride (SUV)', defaultBase: 3000, defaultPerKm: 400, icon: '🚘' },
                    ].map((cls) => {
                      const rates = systemSettings.classRates?.[cls.id] || { baseFare: cls.defaultBase, perKm: cls.defaultPerKm };
                      const est5km = Math.round((rates.baseFare + (5 * rates.perKm)) * systemSettings.surgeMultiplier);

                      return (
                        <div key={cls.id} className="bg-brand-card/70 border border-brand-input/80 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span className="flex items-center gap-1.5"><span>{cls.icon}</span> {cls.name}</span>
                          </div>
                          <div className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between text-brand-text-muted">
                              <span>Prise en charge :</span>
                              <strong className="text-emerald-400 font-extrabold">{rates.baseFare.toLocaleString('fr-FR')} FCFA</strong>
                            </div>
                            <div className="flex justify-between text-brand-text-muted">
                              <span>Prix au KM :</span>
                              <strong className="text-brand-gold font-extrabold">{rates.perKm.toLocaleString('fr-FR')} FCFA/km</strong>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-brand-input/40 flex justify-between items-center text-[10px] text-slate-300 font-semibold">
                            <span>Ex. Course 5 km :</span>
                            <span className="text-white font-mono font-bold">{est5km.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dashboard grid of cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Total Platform Deposits</span>
                    <h3 className="text-2xl font-black text-brand-gold tracking-tight">{(totalRevenue).toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp size={12} />
                      <span>MTN MoMo & Orange Money API</span>
                    </p>
                  </div>

                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Admin Commissions (15%)</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">{(totalRevenue * systemSettings.commissionRate / 100).toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-brand-text-muted font-medium">Accumulated from completed rides</p>
                  </div>

                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Approved Fleet Size</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">{driversList.filter(d => d.approvalStatus === 'approved').length} Active</h3>
                    <p className="text-[10px] text-brand-text-muted font-medium">Approved professional chauffeurs</p>
                  </div>

                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Driver Cashouts</span>
                    <h3 className="text-2xl font-black text-brand-gold tracking-tight">{(totalWithdrawals).toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-amber-500 font-semibold">
                      {pendingWithdrawalsCount > 0 ? `● ${pendingWithdrawalsCount} payout waiting` : '✓ All payouts cleared'}
                    </p>
                  </div>
                </div>

                {/* Real operational KPIs (GET /admin/kpi) */}
                <div className="bg-brand-card border border-brand-input rounded-2xl p-5 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-text-muted">KPI Opérationnels (Temps Réel)</h4>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">Live</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Courses totales</span>
                      <h5 className="text-xl font-black text-white">{kpi ? kpi.total_rides : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Terminées</span>
                      <h5 className="text-xl font-black text-emerald-400">{kpi ? kpi.completed_rides : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Annulées</span>
                      <h5 className="text-xl font-black text-rose-400">{kpi ? kpi.cancelled_rides : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Utilisateurs</span>
                      <h5 className="text-xl font-black text-white">{kpi ? kpi.total_users : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Fleet approuvée</span>
                      <h5 className="text-xl font-black text-white">{kpi ? kpi.total_drivers : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Commissions admin</span>
                      <h5 className="text-xl font-black text-brand-gold">{kpi ? `${kpi.total_commission_fcfa.toLocaleString('fr-FR')} FCFA` : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Chauffeurs à approuver</span>
                      <h5 className="text-xl font-black text-amber-400">{kpi ? kpi.pending_driver_approvals : '—'}</h5>
                    </div>
                    <div className="bg-brand-midnight/60 border border-brand-input rounded-xl p-3 space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">Retraits en attente</span>
                      <h5 className="text-xl font-black text-amber-400">{kpi ? kpi.pending_withdrawals : '—'}</h5>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DRIVER fleet & approvals portal */}
            {tab === 'drivers' && (
              <motion.div
                key="drivers-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Header & Filter Bar */}
                <div className="bg-brand-card border border-brand-input rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Users size={18} className="text-brand-gold" />
                      <span>Gestion des Chauffeurs & Contrôle KYC</span>
                    </h3>
                    <p className="text-[11px] text-brand-text-muted mt-0.5">
                      Examinez les pièces d'identité, modifiez les comptes ou remplacez les documents illisibles reçus par WhatsApp.
                    </p>
                  </div>

                  {/* Filter Pills & Search */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <div className="flex bg-brand-midnight p-1 rounded-xl border border-brand-input text-xs font-bold">
                      <button
                        onClick={() => setDriverFilterStatus('all')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${driverFilterStatus === 'all' ? 'bg-brand-gold text-brand-midnight font-extrabold' : 'text-brand-text-muted hover:text-white'}`}
                      >
                        Tous ({driversList.length})
                      </button>
                      <button
                        onClick={() => setDriverFilterStatus('pending')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${driverFilterStatus === 'pending' ? 'bg-amber-500 text-brand-midnight font-extrabold' : 'text-brand-text-muted hover:text-white'}`}
                      >
                        En Attente ({driversList.filter(d => d.approvalStatus === 'pending').length})
                      </button>
                      <button
                        onClick={() => setDriverFilterStatus('approved')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${driverFilterStatus === 'approved' ? 'bg-emerald-500 text-white font-extrabold' : 'text-brand-text-muted hover:text-white'}`}
                      >
                        Validés ({driversList.filter(d => d.approvalStatus === 'approved').length})
                      </button>
                      <button
                        onClick={() => setDriverFilterStatus('suspended')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${driverFilterStatus === 'suspended' ? 'bg-rose-500 text-white font-extrabold' : 'text-brand-text-muted hover:text-white'}`}
                      >
                        Rejetés ({driversList.filter(d => d.approvalStatus === 'suspended').length})
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher nom, tel, plaque..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-brand-midnight border border-brand-input rounded-xl px-3 py-1.5 pl-8 text-xs text-white focus:outline-none focus:border-brand-gold w-52 font-semibold"
                      />
                      <Search className="absolute left-2.5 top-2 text-brand-text-muted" size={13} />
                    </div>
                  </div>
                </div>

                {/* Driver List */}
                <div className="space-y-3">
                  {driversList
                    .filter(driver => {
                      const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (driver.phone && driver.phone.includes(searchQuery)) ||
                        (driver.vehiclePlate && driver.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()));
                      
                      if (!matchesSearch) return false;
                      if (driverFilterStatus === 'pending') return driver.approvalStatus === 'pending';
                      if (driverFilterStatus === 'approved') return driver.approvalStatus === 'approved';
                      if (driverFilterStatus === 'suspended') return driver.approvalStatus === 'suspended';
                      return true;
                    })
                    .map((driver) => {
                      const isPending = driver.approvalStatus === 'pending';
                      const isApproved = driver.approvalStatus === 'approved';
                      const isSuspended = driver.approvalStatus === 'suspended';

                      return (
                        <div key={driver.id} className="bg-brand-card border border-brand-input rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:border-brand-gold/40 transition">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={driver.avatar}
                              alt={driver.name}
                              className="w-13 h-13 rounded-2xl object-cover border-2 border-brand-input"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-2.5">
                                <h4 className="text-sm font-extrabold text-white">{driver.name}</h4>
                                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                  isApproved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                  isPending ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse' :
                                  'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {isApproved ? 'VALIDÉ / ACTIF' : isPending ? 'EN ATTENTE KYC' : 'SUSPENDU / REJETÉ'}
                                </span>
                              </div>
                              <p className="text-xs text-brand-text-muted font-medium mt-0.5">
                                🚘 {driver.vehicleModel} • <strong className="text-white font-mono">{driver.vehiclePlate}</strong>
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-brand-text-muted font-semibold mt-1">
                                <span>📞 {driver.phone}</span>
                                <span>📍 {driver.city || 'Douala'}</span>
                                <span className="text-amber-400 font-bold">★ {driver.rating || 4.8}</span>
                              </div>

                              {driver.rejectionReason && (
                                <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg font-bold mt-2">
                                  ⚠️ Motif Rejet : {driver.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 border-brand-input/40 pt-3 md:pt-0">
                            {/* Inspect KYC & Account Button */}
                            <button
                              onClick={() => openDriverKycModal(driver)}
                              className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
                            >
                              <Eye size={14} />
                              <span>Examiner Dossier & KYC</span>
                            </button>

                            {/* Direct Action triggers */}
                            {isPending && (
                              <>
                                <button
                                  onClick={() => onApproveDriver(driver.id, `Félicitations ${driver.name}, votre compte a été validé !`)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer shadow transition"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() => {
                                    setDriverToReject(driver);
                                    setShowRejectModal(true);
                                  }}
                                  className="bg-brand-input hover:bg-brand-card text-rose-400 font-bold text-[11px] px-3 py-2 rounded-xl border border-brand-input cursor-pointer transition"
                                >
                                  Rejeter
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                onClick={() => {
                                  setDriverToReject(driver);
                                  setShowRejectModal(true);
                                }}
                                className="bg-brand-input hover:bg-brand-card text-rose-400/90 font-bold text-[10px] px-3 py-1.5 rounded-xl border border-brand-input cursor-pointer transition"
                              >
                                Suspendre Compte
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* ROLES & DEPARTMENTS MANAGEMENT TAB */}
            {tab === 'roles' && (
              <motion.div
                key="roles-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header overview */}
                <div className="bg-brand-card border border-brand-input rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Building2 size={20} className="text-brand-gold" />
                      <span>Rôles & Directives Départementales - Wanda HQ</span>
                    </h3>
                    <p className="text-xs text-brand-text-muted mt-1">
                      Définissez les règles d'accès par département. Seul le Super Admin peut affecter les rôles et attribuer les autorisations.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddStaffModal(true)}
                    className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow transition cursor-pointer shrink-0"
                  >
                    <UserPlus size={15} />
                    <span>Créer Compte Staff & Affecter Règle</span>
                  </button>
                </div>

                {/* Department Matrix Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-brand-card border border-brand-input rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                      <DollarSign size={16} />
                      <span>Département Comptabilité</span>
                    </div>
                    <p className="text-[11px] text-brand-text-muted leading-relaxed">
                      Gère le suivi des commissions de 15%, la validation des demandes de retraits de solde chauffeurs (Orange / MTN MoMo), et le simulateur de prix.
                    </p>
                  </div>

                  <div className="bg-brand-card border border-brand-input rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                      <Megaphone size={16} />
                      <span>Département Publicité & Marketing</span>
                    </div>
                    <p className="text-[11px] text-brand-text-muted leading-relaxed">
                      Crée et diffuse les campagnes de push notifications ciblées, gère les offres promotionnelles Wallet (-15%) et le planificateur automatique.
                    </p>
                  </div>

                  <div className="bg-brand-card border border-brand-input rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs uppercase tracking-wider">
                      <ShieldCheck size={16} />
                      <span>Département Forensic & Conformité</span>
                    </div>
                    <p className="text-[11px] text-brand-text-muted leading-relaxed">
                      Inspecte les pièces d'identité KYC des chauffeurs, remplace les documents flous (via envoi WhatsApp), valide ou rejette les dossiers avec motifs.
                    </p>
                  </div>
                </div>

                {/* Staff Users Directory Table */}
                <div className="bg-brand-card border border-brand-input rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-2">
                    <Users size={16} />
                    <span>Annuaire des Administrateurs & Rôles Affectés</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead>
                        <tr className="border-b border-brand-input text-[10px] text-brand-text-muted uppercase tracking-wider">
                          <th className="py-2.5 px-3">Membre Admin</th>
                          <th className="py-2.5 px-3">Email Pro</th>
                          <th className="py-2.5 px-3">Règle / Département Affecté</th>
                          <th className="py-2.5 px-3">Affecté Par</th>
                          <th className="py-2.5 px-3">Statut</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-input/40">
                        {staffUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-brand-midnight/40 transition">
                            <td className="py-3 px-3 font-extrabold text-white flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-brand-gold/15 text-brand-gold font-black flex items-center justify-center border border-brand-gold/30">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </span>
                              <span>{user.name || user.email}</span>
                            </td>
                            <td className="py-3 px-3 text-brand-text-muted font-mono">{user.email}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                user.role === 'super_admin' ? 'bg-brand-gold/20 text-brand-gold border-brand-gold/30' :
                                user.role === 'accounting' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                user.role === 'publicity' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-sky-500/20 text-sky-400 border-sky-500/30'
                              }`}>
                                {user.departmentName}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-brand-text-muted">{user.assignedBy}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${user.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {user.active ? 'ACTIF' : 'INACTIF'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateStaffRole(user.id, e.target.value as AdminRole)}
                                className="bg-brand-midnight text-brand-text font-bold border border-brand-input rounded-lg px-2 py-1 text-[11px] focus:outline-none cursor-pointer"
                              >
                                <option value="super_admin">👑 Super Admin</option>
                                <option value="accounting">💰 Comptabilité</option>
                                <option value="publicity">📢 Publicité</option>
                                <option value="forensic">🔍 Forensic</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* WALLET TRANSACTIONS PANEL */}
            {tab === 'transactions' && (
              <motion.div
                key="transactions-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <h3 className="text-sm font-black text-white">MoMo & Orange Money Audit Ledger</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-brand-text border-collapse">
                    <thead>
                      <tr className="border-b border-brand-input text-brand-text-muted text-[10px] font-black uppercase">
                        <th className="py-3 px-2">Timestamp</th>
                        <th className="py-3 px-2">Tx ID</th>
                        <th className="py-3 px-2">Account/Number</th>
                        <th className="py-3 px-2">Action Type</th>
                        <th className="py-3 px-2">Carrier API</th>
                        <th className="py-3 px-2 text-right">Amount</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-input/50 font-medium">
                      {transactions.map((tx, idx) => {
                        const isTopup = tx.type === 'topup';
                        const isPending = tx.status === 'pending';
                        
                        return (
                          <tr key={`${tx.id}-${idx}`} className="hover:bg-brand-card/20 transition">
                            <td className="py-3.5 px-2 text-brand-text-muted font-mono">{tx.date}</td>
                            <td className="py-3.5 px-2 font-mono font-bold text-white">{tx.id}</td>
                            <td className="py-3.5 px-2">{tx.phone}</td>
                            <td className="py-3.5 px-2 font-bold">
                              {isTopup ? (
                                <span className="text-emerald-400">⚡ DEPOSIT (TOPUP)</span>
                              ) : (
                                <span className="text-amber-500">📥 DRIVER CASHOUT</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2">
                              {tx.carrier === 'momo_mtn' ? (
                                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-bold">MTN MoMo</span>
                              ) : (
                                <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">Orange OM</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-right font-black text-brand-gold">
                              <div>{tx.amount.toLocaleString('fr-FR')} XAF</div>
                              {tx.bonusAmount && tx.bonusAmount > 0 && (
                                <div className="text-[10px] text-emerald-400 font-bold tracking-tight">
                                  +{tx.bonusAmount.toLocaleString('fr-FR')} bonus
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              {isPending ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => onApproveWithdrawal(tx)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] px-2 py-1 rounded cursor-pointer transition"
                                  >
                                    Clear Payout
                                  </button>
                                </div>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  ✓ Settled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* EDITABLE SETTINGS AND SLIDERS PANEL WITH FIRESTORE REAL-TIME PERSISTENCE */}
            {tab === 'settings' && (
              <motion.div
                key="settings-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-brand-card border border-brand-input rounded-2xl p-6 shadow-md space-y-6"
              >
                {/* Header & Firestore Live Sync Status Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-deep/90 border border-brand-gold/30 rounded-2xl p-4 shadow-inner">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Sliders className="text-brand-gold" size={20} />
                      <span>Gestion de Tarification & Commission Firebase</span>
                    </h3>
                    <p className="text-xs text-brand-text-muted font-medium">
                      Modifiez en temps réel les tarifs de base, prix au kilomètre et commissions stockés dans Firestore (<code className="text-brand-gold font-mono text-[11px]">settings/pricing</code>).
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono">
                        Firestore Sync {lastSyncedTime ? `(${lastSyncedTime})` : 'Actif'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveToFirestore}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>Enregistrer dans Firestore</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                {saveSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </motion.div>
                )}

                {saveErrorMessage && (
                  <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <AlertCircle size={16} className="text-rose-400 shrink-0" />
                    <span>{saveErrorMessage}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Vehicle Class Rates Configuration */}
                  <div className="bg-brand-deep/90 border border-brand-gold/20 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-input/60">
                      <div>
                        <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={14} className="text-emerald-400" />
                          <span>Tarifs de Prise en Charge (Base Fare) & Prix au Kilomètre (Rate/KM)</span>
                        </h4>
                        <p className="text-[10.5px] text-brand-text-muted font-medium mt-0.5">
                          Saisissez directement les valeurs numériques ou ajustez à l'aide des curseurs.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const reset = {
                              ...formData,
                              classRates: {
                                okada: { baseFare: 250, perKm: 80 },
                                keke: { baseFare: 300, perKm: 100 },
                                ecoride: { baseFare: 1500, perKm: 250 },
                                comfort: { baseFare: 3000, perKm: 400 },
                              }
                            };
                            setFormData(reset);
                            onUpdateSettings(reset);
                          }}
                          className="bg-brand-input hover:bg-brand-card text-brand-text-muted hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold border border-brand-card transition cursor-pointer"
                        >
                          🔄 Réinitialiser Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.classRates || {
                              okada: { baseFare: 250, perKm: 80 },
                              keke: { baseFare: 300, perKm: 100 },
                              ecoride: { baseFare: 1500, perKm: 250 },
                              comfort: { baseFare: 3000, perKm: 400 },
                            };
                            const boosted: Record<string, { baseFare: number; perKm: number }> = {};
                            Object.keys(current).forEach((k) => {
                              boosted[k] = {
                                baseFare: Math.round(current[k].baseFare * 1.15),
                                perKm: Math.round(current[k].perKm * 1.15)
                              };
                            });
                            const updated = { ...formData, classRates: boosted };
                            setFormData(updated);
                            onUpdateSettings(updated);
                          }}
                          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/30 transition cursor-pointer"
                        >
                          ⚡ +15% Heures de Pointe
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[
                        { id: 'okada', name: 'Moto-Taxi (Okada)', defaultBase: 250, defaultPerKm: 80, icon: '🏍️' },
                        { id: 'keke', name: 'Petit Taxi (Yellow Cab / Tricycle)', defaultBase: 300, defaultPerKm: 100, icon: '🛺' },
                        { id: 'ecoride', name: 'EcoRide (Berline Privée)', defaultBase: 1500, defaultPerKm: 250, icon: '🚗' },
                        { id: 'comfort', name: 'VIP Ride (SUV Luxe)', defaultBase: 3000, defaultPerKm: 400, icon: '🚘' },
                      ].map((cls) => {
                        const currentRates = formData.classRates?.[cls.id] || { baseFare: cls.defaultBase, perKm: cls.defaultPerKm };

                        const updateClassRate = (field: 'baseFare' | 'perKm', val: number) => {
                          const safeVal = isNaN(val) ? 0 : Math.max(0, val);
                          const updated = {
                            ...formData,
                            classRates: {
                              ...(formData.classRates || {}),
                              [cls.id]: {
                                ...currentRates,
                                [field]: safeVal
                              }
                            }
                          };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        };

                        const sample5km = Math.round((currentRates.baseFare + (5 * currentRates.perKm)) * (formData.surgeMultiplier || 1.0));

                        return (
                          <div key={cls.id} className="bg-brand-card/90 border border-brand-input p-4 rounded-2xl space-y-3.5 shadow-md">
                            <div className="flex items-center justify-between border-b border-brand-input/40 pb-2">
                              <span className="text-xs font-black text-white flex items-center gap-2">
                                <span className="text-base">{cls.icon}</span> {cls.name}
                              </span>
                              <span className="text-[10px] font-mono font-extrabold bg-brand-gold/15 text-brand-gold px-2 py-0.5 rounded-lg border border-brand-gold/25">
                                Base: {currentRates.baseFare} XAF | {currentRates.perKm} XAF/km
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              {/* Base Fee Field */}
                              <div className="bg-brand-deep/80 p-2.5 rounded-xl border border-brand-input/60 space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider">
                                  Frais de Prise en Charge
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10000}
                                    step={50}
                                    value={currentRates.baseFare}
                                    onChange={(e) => updateClassRate('baseFare', parseInt(e.target.value))}
                                    className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-400 outline-none"
                                  />
                                  <span className="text-[10px] font-bold text-brand-text-muted shrink-0">XAF</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={5000}
                                  step={50}
                                  value={currentRates.baseFare}
                                  onChange={(e) => updateClassRate('baseFare', parseInt(e.target.value))}
                                  className="w-full accent-emerald-400 h-1.5 bg-brand-input rounded-lg cursor-pointer"
                                />
                              </div>

                              {/* Per KM Field */}
                              <div className="bg-brand-deep/80 p-2.5 rounded-xl border border-brand-input/60 space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider">
                                  Prix au Kilomètre
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={2000}
                                    step={10}
                                    value={currentRates.perKm}
                                    onChange={(e) => updateClassRate('perKm', parseInt(e.target.value))}
                                    className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-1 text-xs font-mono font-black text-brand-gold outline-none"
                                  />
                                  <span className="text-[10px] font-bold text-brand-text-muted shrink-0">XAF/km</span>
                                </div>
                                <input
                                  type="range"
                                  min={20}
                                  max={1000}
                                  step={10}
                                  value={currentRates.perKm}
                                  onChange={(e) => updateClassRate('perKm', parseInt(e.target.value))}
                                  className="w-full accent-brand-gold h-1.5 bg-brand-input rounded-lg cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Live calculation formula preview */}
                            <div className="bg-brand-midnight/60 px-3 py-1.5 rounded-xl border border-brand-input/40 flex justify-between items-center text-[10px]">
                              <span className="text-brand-text-muted">Estimation Course 5 km (Surge {(formData.surgeMultiplier || 1.0).toFixed(1)}x) :</span>
                              <strong className="text-white font-mono font-black">{sample5km.toLocaleString('fr-FR')} FCFA</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commission percentage and Platform controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Commission Rate */}
                    <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
                          <Percent size={13} className="text-brand-gold" />
                          <span>Taux de Commission Wanda</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={formData.commissionRate}
                            onChange={(e) => {
                              const updated = { ...formData, commissionRate: parseInt(e.target.value) || 0 };
                              setFormData(updated);
                              onUpdateSettings(updated);
                            }}
                            className="w-14 bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-0.5 text-xs font-mono font-black text-brand-gold text-right outline-none"
                          />
                          <span className="text-xs font-bold text-brand-gold">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={35}
                        step={1}
                        value={formData.commissionRate}
                        onChange={(e) => {
                          const updated = { ...formData, commissionRate: parseInt(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className="w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">Déduit directement du tarif de chaque course effectuée.</span>
                    </div>

                    {/* Surge Multiplier */}
                    <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">Multiplicateur Surge</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1.0}
                            max={3.0}
                            step={0.1}
                            value={formData.surgeMultiplier}
                            onChange={(e) => {
                              const updated = { ...formData, surgeMultiplier: parseFloat(e.target.value) || 1.0 };
                              setFormData(updated);
                              onUpdateSettings(updated);
                            }}
                            className="w-14 bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-0.5 text-xs font-mono font-black text-brand-gold text-right outline-none"
                          />
                          <span className="text-xs font-bold text-brand-gold">x</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1.0}
                        max={2.5}
                        step={0.1}
                        value={formData.surgeMultiplier}
                        onChange={(e) => {
                          const updated = { ...formData, surgeMultiplier: parseFloat(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className="w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">Multiplie la tarification pendant les heures de pointe/pluie.</span>
                    </div>

                    {/* Minimum Withdrawal */}
                    <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">Seuil Retrait Chauffeur</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={500}
                            max={20000}
                            step={500}
                            value={formData.minimumWithdrawal}
                            onChange={(e) => {
                              const updated = { ...formData, minimumWithdrawal: parseInt(e.target.value) || 1000 };
                              setFormData(updated);
                              onUpdateSettings(updated);
                            }}
                            className="w-20 bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-0.5 text-xs font-mono font-black text-brand-gold text-right outline-none"
                          />
                          <span className="text-[10px] font-bold text-brand-text-muted">XAF</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1000}
                        max={10000}
                        step={500}
                        value={formData.minimumWithdrawal}
                        onChange={(e) => {
                          const updated = { ...formData, minimumWithdrawal: parseInt(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className="w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">Limite minimale pour retrait MTN MoMo / Orange Money.</span>
                    </div>
                  </div>

                  {/* Wallet Topup Promo Settings */}
                  <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center bg-brand-input/40 p-3 rounded-xl border border-brand-card">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider block">Bonus de Recharge Wallet Passager</span>
                        <span className="text-[10px] text-brand-text-muted font-medium font-medium">Activer ou désactiver les crédits bonus lors des dépôts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...formData, topupPromoActive: !(formData.topupPromoActive ?? false) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] tracking-wide uppercase transition duration-200 cursor-pointer ${
                          formData.topupPromoActive
                            ? 'bg-emerald-500 text-brand-midnight shadow-lg shadow-emerald-500/20'
                            : 'bg-brand-card border border-brand-input text-brand-text-muted hover:text-white'
                        }`}
                      >
                        {formData.topupPromoActive ? '✓ Promo Active' : '● Inactif'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">Pourcentage de Bonus Promo</span>
                        <strong className="text-brand-gold font-mono font-black text-sm">{(formData.topupPromoRate ?? 10)}% Bonus</strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={formData.topupPromoRate ?? 10}
                        onChange={(e) => {
                          const updated = { ...formData, topupPromoRate: parseInt(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        disabled={!formData.topupPromoActive}
                        className={`w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer transition ${!formData.topupPromoActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">
                        {formData.topupPromoActive 
                          ? `Les passagers reçoivent ${(formData.topupPromoRate ?? 10)}% de crédits bonus sur chaque rechargement (ex. 10 000 FCFA -> ${(10000 * (1 + (formData.topupPromoRate ?? 10)/100)).toLocaleString('fr-FR')} FCFA).`
                          : "Activez le statut ci-dessus pour offrir des crédits bonus lors des dépôts."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer with Primary Save Button */}
                <div className="bg-gradient-to-r from-brand-deep to-brand-midnight border border-brand-gold/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-gold/15 text-brand-gold rounded-xl border border-brand-gold/30 shrink-0">
                      <Database size={20} />
                    </div>
                    <div>
                      <strong className="text-white text-xs font-black block">Persistance Firestore en Temps Réel</strong>
                      <span className="text-[11px] text-brand-text-muted font-medium">
                        Cliquez ci-contre pour écrire immédiatement les paramètres de tarification dans la base de données Firestore.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveToFirestore}
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black px-6 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl transition transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Enregistrement Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Enregistrer dans Firestore ('settings/pricing')</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* NOTIFICATIONS MANAGEMENT CENTER TAB */}
            {tab === 'notifications' && (
              <motion.div
                key="notifications-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-brand-card border border-brand-input rounded-2xl p-6 shadow-md space-y-6"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-deep/90 border border-brand-gold/30 rounded-2xl p-5 shadow-inner">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Bell className="text-brand-gold animate-bounce" size={22} />
                      <span>Centre de Notifications Push & Marketing Wanda</span>
                    </h3>
                    <p className="text-xs text-brand-text-muted font-medium">
                      Gérez et diffusez des notifications push en temps réel aux Passagers et Chauffeurs, ou configurez le programme quotidien des 3 messages automatiques (Réductions Wallet 15%, Bonus 20%, Calcul de Prix de Trajet).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {notificationsList.length} Pushs diffusés
                    </span>
                  </div>
                </div>

                {/* Feedback Messages */}
                {notifSendFeedback && (
                  <div className="bg-brand-gold/15 border border-brand-gold/40 text-brand-gold p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <Sparkles size={16} className="shrink-0" />
                    <span>{notifSendFeedback}</span>
                  </div>
                )}

                {/* Sub-Segments Navigation Bar */}
                <div className="flex flex-wrap items-center gap-2 border-b border-brand-input/60 pb-3">
                  <button
                    type="button"
                    onClick={() => setNotificationSegment('passengers')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                      notificationSegment === 'passengers'
                        ? 'bg-brand-gold text-brand-midnight shadow-lg'
                        : 'bg-brand-deep/80 text-brand-text-muted hover:text-white border border-brand-input/40'
                    }`}
                  >
                    <Users size={14} />
                    <span>Segment Passagers</span>
                    <span className="bg-brand-midnight/30 text-current text-[10px] font-mono px-1.5 py-0.5 rounded-md">
                      {notificationsList.filter(n => n.target === 'passenger' || n.target === 'all').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationSegment('drivers')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                      notificationSegment === 'drivers'
                        ? 'bg-brand-gold text-brand-midnight shadow-lg'
                        : 'bg-brand-deep/80 text-brand-text-muted hover:text-white border border-brand-input/40'
                    }`}
                  >
                    <Car size={14} />
                    <span>Segment Chauffeurs</span>
                    <span className="bg-brand-midnight/30 text-current text-[10px] font-mono px-1.5 py-0.5 rounded-md">
                      {notificationsList.filter(n => n.target === 'driver' || n.target === 'all').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationSegment('schedule')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                      notificationSegment === 'schedule'
                        ? 'bg-brand-gold text-brand-midnight shadow-lg'
                        : 'bg-brand-deep/80 text-brand-text-muted hover:text-white border border-brand-input/40'
                    }`}
                  >
                    <Calendar size={14} />
                    <span>Planning Automatique 3x/Jour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationSegment('calculator')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                      notificationSegment === 'calculator'
                        ? 'bg-brand-gold text-brand-midnight shadow-lg'
                        : 'bg-brand-deep/80 text-brand-text-muted hover:text-white border border-brand-input/40'
                    }`}
                  >
                    <Zap size={14} />
                    <span>Calculateur de Tarifs Trajet (BMRC → Bastos)</span>
                  </button>
                </div>

                {/* SEGMENT 1: PASSENGERS PUSH NOTIFICATIONS */}
                {notificationSegment === 'passengers' && (
                  <div className="space-y-6">
                    <div className="bg-brand-deep/80 border border-brand-gold/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-brand-input/60">
                        <div>
                          <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                            <Megaphone size={16} />
                            <span>Composer & Diffuser une Notification aux Passagers</span>
                          </h4>
                          <p className="text-[11px] text-brand-text-muted mt-0.5 font-medium">
                            Saisissez un message personnalisé ou cliquez sur l'un des modèles pré-remplis ci-dessous.
                          </p>
                        </div>
                      </div>

                      {/* Preset Buttons for Passengers */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider block">
                          Modèles Rapides Passagers :
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setComposerTitle("⚡ Réduction Wallet Wanda -15%");
                              setComposerMessage("Économisez 15% sur toutes vos courses Wanda en payant directement avec votre Portefeuille Wallet Wanda ! Nos tarifs sont les meilleurs du pays.");
                              setComposerType("promo");
                            }}
                            className="bg-brand-midnight/80 hover:bg-brand-card p-3 rounded-xl border border-brand-gold/30 text-left transition space-y-1 group cursor-pointer"
                          >
                            <div className="text-xs font-bold text-brand-gold flex items-center gap-1">
                              <Sparkles size={12} /> Réduction Wallet 15%
                            </div>
                            <p className="text-[10px] text-brand-text-muted line-clamp-2">
                              "Économisez 15% sur toutes vos courses Wanda en payant directement avec votre Wallet..."
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setComposerTitle("🎁 Bonus de Recharge +20%");
                              setComposerMessage("Profitez d'un bonus instantané de +20% crédité sur votre compte pour chaque rechargement effectué aujourd'hui via MTN MoMo ou Orange Money !");
                              setComposerType("promo");
                            }}
                            className="bg-brand-midnight/80 hover:bg-brand-card p-3 rounded-xl border border-brand-gold/30 text-left transition space-y-1 group cursor-pointer"
                          >
                            <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <Tag size={12} /> Bonus Top-up +20%
                            </div>
                            <p className="text-[10px] text-brand-text-muted line-clamp-2">
                              "Profitez d'un bonus instantané de +20% crédité sur votre compte pour chaque rechargement..."
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const rates = formData.classRates?.[calcClass] || { baseFare: 1500, perKm: 250 };
                              const fare = Math.round(((rates.baseFare + (calcDistance * rates.perKm)) * (formData.surgeMultiplier || 1.0)) * 0.85);
                              setComposerTitle(`⚡ Meilleure Offre du Jour : ${calcFrom} -> ${calcTo}`);
                              setComposerMessage(`Trajet de ${calcFrom} à ${calcTo} pour seulement ${fare.toLocaleString('fr-FR')} FCFA grâce à la réduction Wallet 15% ! Nos tarifs sont les meilleurs du pays.`);
                              setComposerType("route_fare");
                            }}
                            className="bg-brand-midnight/80 hover:bg-brand-card p-3 rounded-xl border border-brand-gold/30 text-left transition space-y-1 group cursor-pointer"
                          >
                            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <MapPin size={12} /> Tarif Trajet {calcFrom} → {calcTo}
                            </div>
                            <p className="text-[10px] text-brand-text-muted line-clamp-2">
                              "Trajet de {calcFrom} à {calcTo} pour seulement le meilleur tarif du pays avec réduction..."
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Form Inputs */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider mb-1">
                            Titre du Push
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: ⚡ Offre du week-end : -15% sur vos courses !"
                            value={composerTitle}
                            onChange={(e) => setComposerTitle(e.target.value)}
                            className="w-full bg-brand-midnight border border-brand-input focus:border-brand-gold rounded-xl px-3.5 py-2 text-xs font-medium text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider mb-1">
                            Contenu du Message Push
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Saisissez le texte envoyé sur l'écran des passagers..."
                            value={composerMessage}
                            onChange={(e) => setComposerMessage(e.target.value)}
                            className="w-full bg-brand-midnight border border-brand-input focus:border-brand-gold rounded-xl px-3.5 py-2 text-xs font-medium text-white outline-none resize-none"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-brand-text-muted font-bold">Type :</span>
                            <select
                              value={composerType}
                              onChange={(e: any) => setComposerType(e.target.value)}
                              className="bg-brand-midnight border border-brand-input text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                            >
                              <option value="promo">🎁 Promotion & Promo</option>
                              <option value="route_fare">🚖 Tarif de Trajet</option>
                              <option value="info">ℹ️ Information</option>
                              <option value="alert">⚠️ Alerte Urgente</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendCustomNotification('passenger')}
                            disabled={isSendingNotif}
                            className="w-full sm:w-auto bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {isSendingNotif ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Envoi en cours...</span>
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                <span>Envoyer Push aux Passagers</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Passenger Push History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                        <span>Historique des Pushs Passagers</span>
                        <span className="text-brand-text-muted text-[10px] font-mono">
                          {notificationsList.filter(n => n.target === 'passenger' || n.target === 'all').length} messages
                        </span>
                      </h4>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {notificationsList.filter(n => n.target === 'passenger' || n.target === 'all').length === 0 ? (
                          <div className="p-4 text-center text-xs text-brand-text-muted bg-brand-deep/50 rounded-xl border border-brand-input/40">
                            Aucun message push diffusé aux passagers pour le moment.
                          </div>
                        ) : (
                          notificationsList.filter(n => n.target === 'passenger' || n.target === 'all').map((notif) => (
                            <div key={notif.id} className="bg-brand-deep/60 border border-brand-input/60 rounded-xl p-3 flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-brand-gold">{notif.title}</span>
                                  <span className="text-[9px] bg-brand-gold/15 text-brand-gold font-mono px-1.5 py-0.5 rounded uppercase">
                                    {notif.type}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-200">{notif.message}</p>
                                <div className="text-[10px] text-brand-text-muted font-mono">
                                  {new Date(notif.timestamp).toLocaleString('fr-FR')}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SEGMENT 2: DRIVERS PUSH NOTIFICATIONS */}
                {notificationSegment === 'drivers' && (
                  <div className="space-y-6">
                    <div className="bg-brand-deep/80 border border-brand-gold/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-brand-input/60">
                        <div>
                          <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                            <Car size={16} />
                            <span>Composer & Diffuser une Notification aux Chauffeurs</span>
                          </h4>
                          <p className="text-[11px] text-brand-text-muted mt-0.5 font-medium">
                            Envoyez des alertes de forte demande, rappels de sécurité, ou annonces de primes à la flotte de chauffeurs.
                          </p>
                        </div>
                      </div>

                      {/* Preset Buttons for Drivers */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider block">
                          Modèles Rapides Chauffeurs :
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setComposerTitle("🚀 Zone à Forte Demande - Bastos & Akwa");
                              setComposerMessage("Forte affluence enregistrée ! Connectez-vous maintenant pour recevoir des demandes de courses en continu avec multiplicateur Surge.");
                              setComposerType("info");
                            }}
                            className="bg-brand-midnight/80 hover:bg-brand-card p-3 rounded-xl border border-brand-gold/30 text-left transition space-y-1 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-brand-gold flex items-center gap-1">
                              <Zap size={12} /> Forte Demande
                            </div>
                            <p className="text-[10px] text-brand-text-muted line-clamp-2">
                              "Forte affluence enregistrée ! Connectez-vous maintenant pour recevoir..."
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setComposerTitle("💰 Prime de Course - 5 000 FCFA Offerts");
                              setComposerMessage("Effectuez 15 courses cette semaine et recevez une prime de 5 000 FCFA versée directement sur votre compte Mobile Money !");
                              setComposerType("promo");
                            }}
                            className="bg-brand-midnight/80 hover:bg-brand-card p-3 rounded-xl border border-brand-gold/30 text-left transition space-y-1 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <Award size={12} /> Prime Hebdomadaire
                            </div>
                            <p className="text-[10px] text-brand-text-muted line-clamp-2">
                              "Effectuez 15 courses cette semaine et recevez une prime de 5 000 FCFA..."
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setComposerTitle("🛡️ Rappel Sécurité & Code de la Route");
                              setComposerMessage("Chers chauffeurs, merci de porter votre ceinture / casque, vérifier vos pièces et offrir un service accueillant à vos passagers.");
                              setComposerType("info");
                            }}
                            className="bg-brand-midnight/80 hover:bg-brand-card p-3 rounded-xl border border-brand-gold/30 text-left transition space-y-1 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-blue-400 flex items-center gap-1">
                              <ShieldAlert size={12} /> Sécurité & Qualité
                            </div>
                            <p className="text-[10px] text-brand-text-muted line-clamp-2">
                              "Chers chauffeurs, merci de porter votre ceinture / casque et offrir..."
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Form Inputs */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider mb-1">
                            Titre du Push Chauffeurs
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 🚀 Alerte Bastos : Multiplicateur Surge 1.5x !"
                            value={composerTitle}
                            onChange={(e) => setComposerTitle(e.target.value)}
                            className="w-full bg-brand-midnight border border-brand-input focus:border-brand-gold rounded-xl px-3.5 py-2 text-xs font-medium text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider mb-1">
                            Contenu du Message Push
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Saisissez le message envoyé à l'application Chauffeur..."
                            value={composerMessage}
                            onChange={(e) => setComposerMessage(e.target.value)}
                            className="w-full bg-brand-midnight border border-brand-input focus:border-brand-gold rounded-xl px-3.5 py-2 text-xs font-medium text-white outline-none resize-none"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-brand-text-muted font-bold">Type :</span>
                            <select
                              value={composerType}
                              onChange={(e: any) => setComposerType(e.target.value)}
                              className="bg-brand-midnight border border-brand-input text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                            >
                              <option value="info">ℹ️ Info Chauffeur</option>
                              <option value="promo">🎁 Prime / Bonus</option>
                              <option value="alert">⚠️ Alerte Trafic / Sécurité</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendCustomNotification('driver')}
                            disabled={isSendingNotif}
                            className="w-full sm:w-auto bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {isSendingNotif ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Envoi en cours...</span>
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                <span>Envoyer Push aux Chauffeurs</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Driver Push History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                        <span>Historique des Pushs Chauffeurs</span>
                        <span className="text-brand-text-muted text-[10px] font-mono">
                          {notificationsList.filter(n => n.target === 'driver' || n.target === 'all').length} messages
                        </span>
                      </h4>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {notificationsList.filter(n => n.target === 'driver' || n.target === 'all').length === 0 ? (
                          <div className="p-4 text-center text-xs text-brand-text-muted bg-brand-deep/50 rounded-xl border border-brand-input/40">
                            Aucun message push diffusé aux chauffeurs pour le moment.
                          </div>
                        ) : (
                          notificationsList.filter(n => n.target === 'driver' || n.target === 'all').map((notif) => (
                            <div key={notif.id} className="bg-brand-deep/60 border border-brand-input/60 rounded-xl p-3 flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-brand-gold">{notif.title}</span>
                                  <span className="text-[9px] bg-brand-gold/15 text-brand-gold font-mono px-1.5 py-0.5 rounded uppercase">
                                    {notif.type}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-200">{notif.message}</p>
                                <div className="text-[10px] text-brand-text-muted font-mono">
                                  {new Date(notif.timestamp).toLocaleString('fr-FR')}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SEGMENT 3: AUTOMATED DAILY SCHEDULE & EDITABLE TEMPLATES (3 MESSAGES/DAY) */}
                {notificationSegment === 'schedule' && (
                  <div className="space-y-6">
                    <div className="bg-brand-deep/80 border border-brand-gold/30 rounded-2xl p-5 space-y-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-input/60">
                        <div>
                          <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={18} />
                            <span>Programme Quotidien des 3 Messages Automatiques</span>
                          </h4>
                          <p className="text-[11px] text-brand-text-muted mt-0.5 font-medium">
                            Chaque jour, les passagers reçoivent 3 messages générés (Réduction Wallet 15%, Bonus 20%, et Calcul du meilleur tarif du pays).
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Language Switcher */}
                          <div className="flex items-center bg-brand-midnight p-1 rounded-xl border border-brand-input/60 text-xs">
                            <button
                              type="button"
                              onClick={() => setScheduleConfig(prev => ({ ...prev, language: 'fr' }))}
                              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                                scheduleConfig.language === 'fr' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted'
                              }`}
                            >
                              🇫🇷 Français
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduleConfig(prev => ({ ...prev, language: 'en' }))}
                              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                                scheduleConfig.language === 'en' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted'
                              }`}
                            >
                              🇬🇧 English
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveNotificationSchedule}
                            disabled={isSavingSchedule}
                            className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                          >
                            {isSavingSchedule ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>Enregistrer Planning</span>
                          </button>
                        </div>
                      </div>

                      {scheduleFeedback && (
                        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                          <span>{scheduleFeedback}</span>
                        </div>
                      )}

                      {/* Times & Frequency Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-brand-midnight p-3.5 rounded-xl border border-brand-input/60 space-y-1.5">
                          <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">
                            Matin (Message #1 - Wallet Discount)
                          </label>
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-brand-gold" />
                            <input
                              type="time"
                              value={scheduleConfig.timesList[0] || "08:00"}
                              onChange={(e) => {
                                const list = [...scheduleConfig.timesList];
                                list[0] = e.target.value;
                                setScheduleConfig(prev => ({ ...prev, timesList: list }));
                              }}
                              className="bg-brand-card border border-brand-input rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="bg-brand-midnight p-3.5 rounded-xl border border-brand-input/60 space-y-1.5">
                          <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">
                            Midi (Message #2 - Top-Up Bonus)
                          </label>
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-brand-gold" />
                            <input
                              type="time"
                              value={scheduleConfig.timesList[1] || "12:30"}
                              onChange={(e) => {
                                const list = [...scheduleConfig.timesList];
                                list[1] = e.target.value;
                                setScheduleConfig(prev => ({ ...prev, timesList: list }));
                              }}
                              className="bg-brand-card border border-brand-input rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="bg-brand-midnight p-3.5 rounded-xl border border-brand-input/60 space-y-1.5">
                          <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">
                            Soir (Message #3 - Best Fare Route Deal)
                          </label>
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-brand-gold" />
                            <input
                              type="time"
                              value={scheduleConfig.timesList[2] || "18:00"}
                              onChange={(e) => {
                                const list = [...scheduleConfig.timesList];
                                list[2] = e.target.value;
                                setScheduleConfig(prev => ({ ...prev, timesList: list }));
                              }}
                              className="bg-brand-card border border-brand-input rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Editable Template Cards */}
                      <div className="space-y-4 pt-2">
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">
                          Contenu des 3 Messages Générés (Modifiables en Temps Réel)
                        </h5>

                        <div className="space-y-3">
                          {scheduleConfig.passengerTemplates.map((template, idx) => (
                            <div key={idx} className="bg-brand-midnight/90 border border-brand-input/80 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-brand-gold flex items-center gap-2">
                                  <span className="bg-brand-gold text-brand-midnight text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                                    Message #{idx + 1}
                                  </span>
                                  {idx === 0 ? "Réduction Wallet 15%" : idx === 1 ? "Bonus Recharge 20%" : "Meilleur Tarif Trajet du Pays"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleTriggerDailyGeneratedMessage(idx)}
                                  disabled={isSendingNotif}
                                  className="bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Play size={12} />
                                  <span>Tester l'Envoi Direct</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase mb-1">Titre</label>
                                  <input
                                    type="text"
                                    value={template.title}
                                    onChange={(e) => {
                                      const updatedTemplates = [...scheduleConfig.passengerTemplates];
                                      updatedTemplates[idx] = { ...template, title: e.target.value };
                                      setScheduleConfig(prev => ({ ...prev, passengerTemplates: updatedTemplates }));
                                    }}
                                    className="w-full bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase mb-1">Description / Offre</label>
                                  <input
                                    type="text"
                                    value={template.message}
                                    onChange={(e) => {
                                      const updatedTemplates = [...scheduleConfig.passengerTemplates];
                                      updatedTemplates[idx] = { ...template, message: e.target.value };
                                      setScheduleConfig(prev => ({ ...prev, passengerTemplates: updatedTemplates }));
                                    }}
                                    className="w-full bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEGMENT 4: ROUTE FARE CALCULATOR SIMULATOR (BMRC -> BASTOS & CUSTOM ROUTES) */}
                {notificationSegment === 'calculator' && (
                  <div className="space-y-6">
                    <div className="bg-brand-deep/80 border border-brand-gold/30 rounded-2xl p-5 space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-brand-input/60">
                        <div>
                          <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                            <Zap size={18} />
                            <span>Calculateur d'Offres de Trajets & Générateur de Messages (BMRC → Bastos)</span>
                          </h4>
                          <p className="text-[11px] text-brand-text-muted mt-0.5 font-medium">
                            Calcule automatiquement la distance, le tarif de base, le prix/km et la réduction Wallet de 15% pour générer une offre push irrésistible.
                          </p>
                        </div>
                      </div>

                      {/* Quick Route Preset Pills */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider block">
                          Trajets Populaires Prédéfinis :
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCalcFrom("BMRC");
                              setCalcTo("Bastos");
                              setCalcDistance(7.5);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              calcFrom === "BMRC" && calcTo === "Bastos"
                                ? 'bg-brand-gold text-brand-midnight border-brand-gold'
                                : 'bg-brand-midnight text-brand-text-muted hover:text-white border-brand-input'
                            }`}
                          >
                            📍 Yaoundé : BMRC → Bastos (7.5 km)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCalcFrom("Akwa");
                              setCalcTo("Bonapriso");
                              setCalcDistance(4.2);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              calcFrom === "Akwa" && calcTo === "Bonapriso"
                                ? 'bg-brand-gold text-brand-midnight border-brand-gold'
                                : 'bg-brand-midnight text-brand-text-muted hover:text-white border-brand-input'
                            }`}
                          >
                            📍 Douala : Akwa → Bonapriso (4.2 km)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCalcFrom("Bastos");
                              setCalcTo("Aéroport Nsimalen");
                              setCalcDistance(22.0);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              calcFrom === "Bastos" && calcTo === "Aéroport Nsimalen"
                                ? 'bg-brand-gold text-brand-midnight border-brand-gold'
                                : 'bg-brand-midnight text-brand-text-muted hover:text-white border-brand-input'
                            }`}
                          >
                            ✈️ Yaoundé : Bastos → Nsimalen (22.0 km)
                          </button>
                        </div>
                      </div>

                      {/* Custom Route Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-brand-midnight p-4 rounded-xl border border-brand-input/60">
                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase mb-1">Point de Départ</label>
                          <input
                            type="text"
                            value={calcFrom}
                            onChange={(e) => setCalcFrom(e.target.value)}
                            className="w-full bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase mb-1">Destination</label>
                          <input
                            type="text"
                            value={calcTo}
                            onChange={(e) => setCalcTo(e.target.value)}
                            className="w-full bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase mb-1">Distance (km)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={calcDistance}
                            onChange={(e) => setCalcDistance(parseFloat(e.target.value) || 1)}
                            className="w-full bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 text-xs text-brand-gold font-mono font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase mb-1">Catégorie Véhicule</label>
                          <select
                            value={calcClass}
                            onChange={(e) => setCalcClass(e.target.value)}
                            className="w-full bg-brand-card border border-brand-input text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                          >
                            <option value="okada">🏍️ Okada (Moto)</option>
                            <option value="keke">🛺 Keke (Petit Taxi)</option>
                            <option value="ecoride">🚗 EcoRide (Berline Economy)</option>
                            <option value="comfort">🚘 VIP Ride (SUV Luxe)</option>
                          </select>
                        </div>
                      </div>

                      {/* Fare Calculation Breakdown Box */}
                      {(() => {
                        const rates = formData.classRates?.[calcClass] || { baseFare: 1500, perKm: 250 };
                        const rawFare = Math.round((rates.baseFare + (calcDistance * rates.perKm)) * (formData.surgeMultiplier || 1.0));
                        const walletFare = Math.round(rawFare * 0.85); // 15% discount
                        const savings = rawFare - walletFare;

                        return (
                          <div className="bg-gradient-to-br from-brand-midnight to-brand-deep border border-brand-gold/40 rounded-2xl p-5 space-y-4 shadow-xl">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-brand-input/60">
                              <span className="text-xs font-black text-brand-gold flex items-center gap-2">
                                <Sparkles size={16} />
                                <span>Résultat du Calcul : {calcFrom} → {calcTo} ({calcDistance} km)</span>
                              </span>

                              <div className="flex items-center gap-3 font-mono">
                                <span className="text-xs text-brand-text-muted line-through">{rawFare.toLocaleString('fr-FR')} FCFA</span>
                                <span className="text-base font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
                                  {walletFare.toLocaleString('fr-FR')} FCFA (Wallet -15%)
                                </span>
                              </div>
                            </div>

                            {/* Generated Message Preview */}
                            <div className="bg-brand-midnight p-3.5 rounded-xl border border-brand-input/80 space-y-1">
                              <span className="text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider block">
                                Aperçu du Message Push Généré :
                              </span>
                              <p className="text-xs font-bold text-white leading-relaxed">
                                ⚡ <strong>Meilleure Offre du Jour : Trajet {calcFrom} → {calcTo} !</strong><br />
                                Prenez votre course pour seulement <span className="text-brand-gold font-mono">{walletFare.toLocaleString('fr-FR')} FCFA</span> au lieu de {rawFare.toLocaleString('fr-FR')} FCFA en réglant avec votre Wallet Wanda (-15% de réduction). Nos tarifs sont les meilleurs du pays !
                              </p>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setComposerTitle(`⚡ Meilleure Offre du Jour : ${calcFrom} -> ${calcTo}`);
                                  setComposerMessage(`Trajet de ${calcFrom} à ${calcTo} pour seulement ${walletFare.toLocaleString('fr-FR')} FCFA grâce à la réduction Wallet 15% ! Nos tarifs sont les meilleurs du pays.`);
                                  setComposerType("route_fare");
                                  setNotificationSegment("passengers");
                                }}
                                className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition active:scale-95 cursor-pointer"
                              >
                                <Send size={14} />
                                <span>Transférer cette offre au Segment Passagers</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>

      {/* ========================================================================= */}
      {/* DRIVER PROFILE & KYC INSPECTION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedDriverForKyc && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1600] flex items-center justify-center p-3 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-midnight border border-brand-gold/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Top Header */}
              <div className="bg-gradient-to-r from-brand-deep to-brand-card p-5 border-b border-brand-input flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedDriverForKyc.avatar}
                    alt={selectedDriverForKyc.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-gold/60 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-black text-white">{selectedDriverForKyc.name}</h3>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        selectedDriverForKyc.approvalStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        selectedDriverForKyc.approvalStatus === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {selectedDriverForKyc.approvalStatus === 'approved' ? 'VALIDÉ / CONFORME' : selectedDriverForKyc.approvalStatus === 'pending' ? 'EN ATTENTE KYC' : 'REJETÉ / SUSPENDU'}
                      </span>
                    </div>
                    <p className="text-xs text-brand-text-muted mt-0.5">
                      🚘 {selectedDriverForKyc.vehicleModel} • Plaque : <strong className="text-brand-gold font-mono">{selectedDriverForKyc.vehiclePlate}</strong> • Tel : <strong className="text-white">{selectedDriverForKyc.phone}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedDriverForKyc(null)}
                    className="bg-brand-card hover:bg-brand-input text-brand-text-muted hover:text-white p-2 rounded-xl transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-tab Switcher */}
              <div className="bg-brand-deep/80 border-b border-brand-input px-6 py-2.5 flex items-center gap-2 shrink-0 text-xs font-bold">
                <button
                  onClick={() => setKycSubTab('account')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                    kycSubTab === 'account' ? 'bg-brand-gold text-brand-midnight font-black shadow' : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  <Users size={15} />
                  <span>1. Compte & Informations</span>
                </button>

                <button
                  onClick={() => setKycSubTab('documents')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                    kycSubTab === 'documents' ? 'bg-brand-gold text-brand-midnight font-black shadow' : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  <FileText size={15} />
                  <span>2. Pièces KYC & Documents (Inspection & Remplacement)</span>
                </button>

                <button
                  onClick={() => setKycSubTab('audit')}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                    kycSubTab === 'audit' ? 'bg-brand-gold text-brand-midnight font-black shadow' : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  <ShieldCheck size={15} />
                  <span>3. Audit Forensic & Notes</span>
                </button>
              </div>

              {/* Success Feedback Toast */}
              {kycSuccessToast && (
                <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 px-6 py-2.5 text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span>{kycSuccessToast}</span>
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* SUB-TAB 1: ACCOUNT DETAILS EDITING */}
                {kycSubTab === 'account' && (
                  <div className="space-y-5">
                    <div className="bg-brand-card p-4 rounded-2xl border border-brand-input space-y-1">
                      <h4 className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-2">
                        <Edit3 size={15} />
                        <span>Modification Directe du Compte Chauffeur</span>
                      </h4>
                      <p className="text-[11px] text-brand-text-muted">
                        Correction des erreurs de saisie faites lors de l'inscription (Nom, Téléphone, Plaque d'immatriculation, Modèle).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Nom Complet Chauffeur</label>
                        <input
                          type="text"
                          value={editDriverName}
                          onChange={(e) => setEditDriverName(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Téléphone WhatsApp (+237)</label>
                        <input
                          type="text"
                          value={editDriverPhone}
                          onChange={(e) => setEditDriverPhone(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-gold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Ville de Résidence</label>
                        <select
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold cursor-pointer"
                        >
                          <option value="Douala">Douala</option>
                          <option value="Yaoundé">Yaoundé</option>
                          <option value="Bafoussam">Bafoussam</option>
                          <option value="Kribi">Kribi</option>
                          <option value="Garoua">Garoua</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Modèle de Véhicule</label>
                        <input
                          type="text"
                          value={editVehicleModel}
                          onChange={(e) => setEditVehicleModel(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Plaque d'Immatriculation</label>
                        <input
                          type="text"
                          value={editVehiclePlate}
                          onChange={(e) => setEditVehiclePlate(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-brand-gold focus:outline-none focus:border-brand-gold uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Catégorie Véhicule</label>
                        <select
                          value={editVehicleType}
                          onChange={(e) => setEditVehicleType(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold cursor-pointer"
                        >
                          <option value="keke">🛺 Kéké / Moto-Taxi 3 Roues</option>
                          <option value="okada">🏍️ Okada / Moto-Taxi 2 Roues</option>
                          <option value="ecoride">🚖 EcoRide (Taxi Jaune Classique)</option>
                          <option value="comfort">🚗 Comfort Ride (Climatisé)</option>
                          <option value="premium">✨ Wanda VIP Berline</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Numéro CNI / Passeport</label>
                        <input
                          type="text"
                          value={editCnicNumber}
                          onChange={(e) => setEditCnicNumber(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-gold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-text-muted uppercase">Numéro Permis de Conduire</label>
                        <input
                          type="text"
                          value={editLicenseNumber}
                          onChange={(e) => setEditLicenseNumber(e.target.value)}
                          className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={isSavingAccountDetails}
                        onClick={handleSaveDriverAccountDetails}
                        className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow cursor-pointer transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={15} />
                        <span>{isSavingAccountDetails ? 'Enregistrement...' : 'Enregistrer les Modifications du Compte'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: KYC DOCUMENTS INSPECTION & REPLACEMENT */}
                {kycSubTab === 'documents' && (
                  <div className="space-y-5">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
                      <Sparkles size={18} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-400 block font-black mb-0.5">Assistance Remplacement Documents Mal Téléversés :</strong>
                        <span>
                          Si le chauffeur a envoyé une photo floue, incomplète ou sombre de sa carte d'identité ou de son permis, demandez-lui d'envoyer la photo nette par <strong>WhatsApp</strong>, puis cliquez sur <strong>"Remplacer Document HD"</strong> ci-dessous pour importer le bon fichier à sa place avant de valider.
                        </span>
                      </div>
                    </div>

                    {docReplacementFeedback && (
                      <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-2xl text-xs font-extrabold flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                        <span>{docReplacementFeedback}</span>
                      </div>
                    )}

                    {/* 5 KYC Documents Grid */}
                    {(() => {
                      const docs = getDriverKYCDocuments(selectedDriverForKyc);
                      const docKeys = [
                        { key: 'nationalIdFront', title: 'Carte Nationale d\'Identité (CNI) - Recto' },
                        { key: 'nationalIdBack', title: 'Carte Nationale d\'Identité (CNI) - Verso' },
                        { key: 'driverLicense', title: 'Permis de Conduire (Catégorie B)' },
                        { key: 'vehicleInsurance', title: 'Attestation d\'Assurance Véhicule' },
                        { key: 'vehicleGreyCard', title: 'Carte Grise / Immatriculation' }
                      ];

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {docKeys.map(({ key, title }) => {
                            const doc = docs[key];
                            const isMissing = !doc;

                            return (
                              <div key={key} className={`bg-brand-card border rounded-2xl p-4 flex flex-col justify-between gap-3 space-y-1 transition ${isMissing ? 'border-rose-500/30' : 'border-brand-input hover:border-brand-gold/40'}`}>
                                <div>
                                  <div className="flex justify-between items-start gap-2 mb-2">
                                    <h5 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                                      <FileText size={15} className="text-brand-gold shrink-0" />
                                      <span>{doc?.title || title}</span>
                                    </h5>

                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      isMissing ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                                      doc.updatedByAdmin ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/25'
                                    }`}>
                                      {isMissing ? 'NON FOURNI' : doc.updatedByAdmin ? 'REMPLACÉ PAR ADMIN HD' : 'DOC ORIGINAL CHAUFFEUR'}
                                    </span>
                                  </div>

                                  {/* Image preview box */}
                                  <div className="relative rounded-xl overflow-hidden border border-brand-input h-40 group bg-brand-deep flex items-center justify-center">
                                    {isMissing ? (
                                      <div className="flex flex-col items-center gap-1.5 text-rose-400/80 px-3 text-center">
                                        <AlertTriangle size={22} />
                                        <span className="text-[10px] font-bold">Document pas encore téléversé par le chauffeur</span>
                                      </div>
                                    ) : (
                                      <>
                                        <img
                                          src={doc.url}
                                          alt={title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                          referrerPolicy="no-referrer"
                                        />
                                        {/* Overlay actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() => setZoomedImageUrl(doc.url)}
                                            className="bg-brand-gold text-brand-midnight font-bold p-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow hover:scale-105 transition cursor-pointer"
                                          >
                                            <Eye size={14} />
                                            <span>Agrandir</span>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {!isMissing && (
                                    <div className="flex justify-between items-center text-[10px] text-brand-text-muted mt-2 font-mono">
                                      <span>Mise à jour : {doc.updatedAt || 'N/A'}</span>
                                      {doc.updatedByAdmin && <span className="text-sky-400 font-bold">✓ Modifié au HQ Admin</span>}
                                    </div>
                                  )}
                                </div>

                                {/* Replace / Upload Button */}
                                <div className="pt-2 border-t border-brand-input/40 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDocKey(key);
                                      setReplacementUrlInput(doc?.url || '');
                                    }}
                                    className="bg-brand-deep hover:bg-brand-card text-brand-gold border border-brand-gold/40 font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                                  >
                                    <UploadCloud size={14} />
                                    <span>{isMissing ? 'Téléverser HD' : 'Remplacer / Téléverser HD'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* SUB-TAB 3: FORENSIC AUDIT & NOTES */}
                {kycSubTab === 'audit' && (
                  <div className="space-y-4">
                    <div className="bg-brand-card p-4 rounded-2xl border border-brand-input space-y-2">
                      <h4 className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-2">
                        <ShieldCheck size={16} />
                        <span>Notes d'Audit Forensic & Conformité</span>
                      </h4>
                      <p className="text-[11px] text-brand-text-muted">
                        Inscrivez vos remarques internes sur la vérification d'identité, les remplacements de documents effectués via WhatsApp ou les motifs de rejet.
                      </p>
                    </div>

                    <textarea
                      rows={5}
                      placeholder="Saisissez vos notes d'audit (ex: Document CNI verso remplacé par l'admin le 06/08/2026 suite à la réception d'un scan HD par WhatsApp. Permis de conduire vérifié conforme.)..."
                      value={editForensicNotes}
                      onChange={(e) => setEditForensicNotes(e.target.value)}
                      className="w-full bg-brand-deep border border-brand-input rounded-2xl p-4 text-xs font-medium text-white focus:outline-none focus:border-brand-gold leading-relaxed"
                    ></textarea>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isSavingForensicNotes}
                        onClick={handleSaveForensicNotes}
                        className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={14} />
                        <span>{isSavingForensicNotes ? 'Enregistrement...' : "Enregistrer les Notes d'Audit"}</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Action Footer for Driver Validation & Rejection */}
              <div className="bg-brand-deep p-4 border-t border-brand-input flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-xs text-brand-text-muted font-medium">
                  Statut Actuel du Dossier : <strong className="text-white uppercase">{selectedDriverForKyc.approvalStatus}</strong>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {/* Reject button */}
                  <button
                    type="button"
                    onClick={() => {
                      setDriverToReject(selectedDriverForKyc);
                      setShowRejectModal(true);
                    }}
                    className="bg-brand-card hover:bg-rose-500/20 text-rose-400 border border-rose-500/40 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <XCircle size={15} />
                    <span>Rejeter / Demander Correction</span>
                  </button>

                  {/* Validate button */}
                  <button
                    type="button"
                    onClick={() => {
                      onApproveDriver(
                        selectedDriverForKyc.id,
                        `Félicitations ${selectedDriverForKyc.name}, votre compte chauffeur Wanda a été validé !`
                      );
                      setKycSuccessToast("🎉 Compte Chauffeur Validé avec Succès ! Notification transmise.");
                      setTimeout(() => {
                        setKycSuccessToast(null);
                        setSelectedDriverForKyc(null);
                      }, 2000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>Approuver & Valider le Compte</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DOCUMENT REPLACEMENT SUB-MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingDocKey && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-midnight border border-brand-gold/50 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-brand-input">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <UploadCloud size={18} className="text-brand-gold" />
                  <span>Remplacer le Document Par un Scan HD</span>
                </h4>
                <button
                  onClick={() => setEditingDocKey(null)}
                  className="text-brand-text-muted hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Option A: Upload local image file */}
                <div className="bg-brand-card p-4 rounded-2xl border border-brand-input space-y-2">
                  <span className="font-extrabold text-brand-gold block">Option A : Téléverser un Fichier Image depuis l'Ordinateur</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            handleReplaceDocument(editingDocKey, evt.target.result as string, 'Téléversé depuis l\'ordinateur par l\'administrateur');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-xs text-brand-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-brand-gold file:text-brand-midnight hover:file:bg-amber-400 cursor-pointer"
                  />
                </div>

                {/* Option B: Enter high-res URL */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-brand-text-muted block">Option B : Entrer l'URL Directe de l'Image HD</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={replacementUrlInput}
                    onChange={(e) => setReplacementUrlInput(e.target.value)}
                    className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white outline-none focus:border-brand-gold"
                  />
                </div>

                {/* Option C: Presets */}
                <div className="bg-brand-deep/80 p-3 rounded-2xl border border-brand-input/60 space-y-2">
                  <span className="text-[10px] font-black uppercase text-brand-gold block">Raccourci Démo HD (Scan WhatsApp) :</span>
                  <button
                    type="button"
                    onClick={() => {
                      const whatsappPreset = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop";
                      handleReplaceDocument(editingDocKey, whatsappPreset, "Scan HD reçu par WhatsApp importé par l'administrateur");
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer transition"
                  >
                    <Smartphone size={15} />
                    <span>📲 Importer le Scan HD Reçu par WhatsApp</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDocKey(null)}
                  className="bg-brand-card hover:bg-brand-input text-brand-text-muted px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (replacementUrlInput) {
                      handleReplaceDocument(editingDocKey, replacementUrlInput, 'Remplacé manuellement par URL par l\'administrateur');
                    }
                  }}
                  className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black px-5 py-2 rounded-xl text-xs shadow cursor-pointer"
                >
                  Valider Remplacement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DRIVER REJECTION REASON MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showRejectModal && driverToReject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-midnight border border-rose-500/50 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-rose-500/30">
                <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
                  <ShieldAlert size={18} />
                  <span>Rejet / Motif de Non-Conformité Chauffeur</span>
                </h4>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-brand-text-muted hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-brand-text-muted">
                  Sélectionnez ou saisissez le motif de rejet pour <strong>{driverToReject.name}</strong>. Une notification explicative sera transmise sur l'application.
                </p>

                {/* Preset Choices */}
                <div className="space-y-2">
                  <label className="font-extrabold text-brand-gold block">Motifs Prédéfinis Rapides :</label>
                  <div className="space-y-1.5">
                    {[
                      "Carte Nationale d'Identité floue, illisible ou expirée",
                      "Permis de conduire non conforme ou expiré",
                      "Attestation d'assurance véhicule manquante",
                      "Plaque d'immatriculation non concordante avec le véhicule",
                      "Photo de profil non conforme aux normes Wanda"
                    ].map((reason, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRejectionPreset(reason);
                          setRejectionReasonText(reason);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          rejectionPreset === reason ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'bg-brand-card border-brand-input text-brand-text hover:text-white'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom text */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-brand-text-muted block">Message / Precision Complémentaire :</label>
                  <textarea
                    rows={3}
                    placeholder="Précisez la raison détaillée..."
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                    className="w-full bg-brand-deep border border-brand-input rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="bg-brand-card text-brand-text-muted hover:text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalReason = rejectionReasonText || "Pièces fournies non conformes.";
                    onRejectDriver(driverToReject.id, finalReason);
                    setShowRejectModal(false);
                    setDriverToReject(null);
                    if (selectedDriverForKyc && selectedDriverForKyc.id === driverToReject.id) {
                      setSelectedDriverForKyc(null);
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-2 rounded-xl text-xs shadow cursor-pointer transition"
                >
                  Confirmer le Rejet & Transmettre Notification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ADD STAFF USER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-midnight border border-brand-gold/50 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-brand-input">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-brand-gold" />
                  <span>Nouveau Membre Staff Administrateur</span>
                </h4>
                <button
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-brand-text-muted hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-brand-text-muted uppercase">Nom du Membre Staff</label>
                  <input
                    type="text"
                    placeholder="ex: Marcella Ngo"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-brand-text-muted uppercase">Adresse Email Professionnelle</label>
                  <input
                    type="email"
                    placeholder="m.ngo@wanda.cm"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-brand-text-muted uppercase">Règle / Département Affecté</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as AdminRole)}
                    className="w-full bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="accounting">💰 Département Comptabilité & Finances</option>
                    <option value="publicity">📢 Département Publicité & Marketing</option>
                    <option value="forensic">🔍 Département Forensic & Conformité KYC</option>
                    <option value="super_admin">👑 Direction Générale (Super Admin)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-brand-text-muted uppercase">Mot de Passe Initial</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mot de passe temporaire"
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      className="flex-1 bg-brand-deep border border-brand-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-gold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                        let pwd = '';
                        for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
                        setNewStaffPassword(pwd);
                      }}
                      className="bg-brand-input hover:bg-brand-card text-brand-text-muted hover:text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer transition shrink-0"
                    >
                      Générer
                    </button>
                  </div>
                </div>

                {staffError && (
                  <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px] font-bold p-2.5 rounded-xl">
                    {staffError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="bg-brand-card text-brand-text-muted hover:text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isCreatingStaff || !newStaffName || !newStaffEmail || !newStaffPassword}
                  onClick={handleAddStaffUser}
                  className="bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black px-5 py-2 rounded-xl text-xs shadow cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingStaff ? 'Création...' : 'Créer Compte Staff'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ZOOM LIGHTBOX */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {zoomedImageUrl && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[1800] flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setZoomedImageUrl(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={zoomedImageUrl}
                alt="Document Zoomed"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain border-2 border-brand-gold shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setZoomedImageUrl(null)}
                className="absolute -top-4 -right-4 bg-rose-600 text-white p-2 rounded-full shadow-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
