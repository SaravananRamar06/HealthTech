'use client';

// Owner: P1. Patient Vault Dashboard
// Client-only zustand store integration. Hydrates after mount.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVault } from '@/lib/vault';
import { analyzeRecord } from '@/lib/analyze';
import { useIsMounted } from '@/lib/useIsMounted';
import { useToast } from '@/components/ui/Toast';
import { AskCareBridgeDrawer } from '@/components/ai/AskCareBridgeDrawer';
import { ClinicalBriefModal } from '@/components/ai/ClinicalBriefModal';
import { AppointmentPrepModal } from '@/components/ai/AppointmentPrepModal';
import { AIConsentModal } from '@/components/ai/AIConsentModal';
import { ReconciliationPanel } from '@/components/ai/ReconciliationPanel';
import { RecordQualityPanel } from '@/components/ai/RecordQualityPanel';
import {
  AllergyList,
  ConditionList,
  MedicineList,
  LabTrend,
  Timeline,
  FlagList,
} from '@/components/record';
import {
  FileText,
  Share2,
  PlusCircle,
  RotateCcw,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Search,
  X,
  Edit3,
  Pill,
  HeartPulse,
  Activity,
  Calendar,
  ShieldAlert,
  ArrowUpDown,
  User,
  Check,
} from 'lucide-react';

export default function VaultPage() {
  const router = useRouter();
  const mounted = useIsMounted();
  const { showToast } = useToast();

  // Navigation & Search State
  const [activeTab, setActiveTab] = useState<'all' | 'medications' | 'allergies' | 'conditions' | 'labs' | 'timeline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'newest'>('default');
  const [showAskAssistant, setShowAskAssistant] = useState(false);
  const [showClinicalBrief, setShowClinicalBrief] = useState(false);
  const [showAppointmentPrep, setShowAppointmentPrep] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [aiMode, setAiMode] = useState<'gemini' | 'local'>('local');

  // Add Item State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<'medication' | 'allergy' | 'condition' | 'lab' | 'event'>('medication');
  const [formData, setFormData] = useState({
    name: '',
    substance: '',
    reaction: '',
    strength: '',
    dosage: '',
    prescriber: '',
    test: '',
    value: '',
    unit: '',
    refRange: '',
    date: '2026-10-10',
    title: '',
    eventType: 'visit' as 'visit' | 'procedure' | 'admission',
    facility: '',
    since: '',
  });

  // Profile Edit State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    dateOfBirth: '',
    sex: 'female' as 'female' | 'male' | 'other',
    emergencyName: '',
    emergencyPhone: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const {
    record,
    loadDemo,
    updateProfile,
    updateItem,
    removeItem,
    setAllergyStatus,
    addPatientReportedItem,
    deleteAllData,
  } = useVault();

  // Initialize profile form when opening modal
  const handleOpenEditProfile = () => {
    if (!record) return;
    setProfileForm({
      name: record.profile.name,
      dateOfBirth: record.profile.dateOfBirth,
      sex: record.profile.sex,
      emergencyName: record.profile.emergencyContact?.name || '',
      emergencyPhone: record.profile.emergencyContact?.phone || '',
    });
    setProfileErrors({});
    setShowEditProfile(true);
  };

  // Validate & Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!profileForm.name.trim() || profileForm.name.trim().length < 2) {
      errors.name = 'Patient name must be at least 2 characters';
    }

    if (!profileForm.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(profileForm.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        errors.dateOfBirth = 'Please enter a valid past date';
      }
    }

    if (profileForm.emergencyName && !profileForm.emergencyPhone) {
      errors.emergencyPhone = 'Phone number is required when contact name is provided';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    updateProfile({
      name: profileForm.name.trim(),
      dateOfBirth: profileForm.dateOfBirth,
      sex: profileForm.sex,
      emergencyContact: profileForm.emergencyName.trim()
        ? {
            name: profileForm.emergencyName.trim(),
            phone: profileForm.emergencyPhone.trim(),
          }
        : null,
    });

    setShowEditProfile(false);
    showToast('Patient profile updated successfully', 'success');
  };

  // Save New Health Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (addType === 'medication' && !formData.name.trim()) {
      showToast('Medication name is required', 'error');
      return;
    }
    if (addType === 'allergy' && !formData.substance.trim()) {
      showToast('Allergen substance is required', 'error');
      return;
    }
    if (addType === 'condition' && !formData.name.trim()) {
      showToast('Condition name is required', 'error');
      return;
    }
    if (addType === 'lab' && (!formData.test.trim() || !formData.value)) {
      showToast('Test name and numeric value are required', 'error');
      return;
    }
    if (addType === 'event' && !formData.title.trim()) {
      showToast('Event title is required', 'error');
      return;
    }

    addPatientReportedItem(addType, formData);

    const label =
      addType === 'medication'
        ? formData.name
        : addType === 'allergy'
        ? formData.substance
        : addType === 'condition'
        ? formData.name
        : addType === 'lab'
        ? formData.test
        : formData.title;

    showToast(`Added "${label}" to health records`, 'success');

    // Reset Form
    setFormData({
      name: '',
      substance: '',
      reaction: '',
      strength: '',
      dosage: '',
      prescriber: '',
      test: '',
      value: '',
      unit: '',
      refRange: '',
      date: '2026-10-10',
      title: '',
      eventType: 'visit',
      facility: '',
      since: '',
    });
    setShowAddForm(false);
  };

  // Handle Item Deletion with Toast
  const handleRemove = (id: string, label: string) => {
    if (confirm(`Are you sure you want to remove "${label}" from your health vault?`)) {
      removeItem(id);
      showToast(`Removed "${label}"`, 'info');
    }
  };

  // Handle Stopping a Medication
  const handleStopMed = (id: string, name: string) => {
    updateItem(id, { status: 'stopped' });
    showToast(`Marked ${name} as stopped/discontinued`, 'info');
  };

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    if (!record) return null;

    const q = searchQuery.toLowerCase().trim();

    const matches = (str: string | null | undefined) =>
      str ? str.toLowerCase().includes(q) : false;

    // Filter items
    let meds = record.medications.filter(
      (m) =>
        matches(m.name) ||
        matches(m.dosage) ||
        matches(m.strength) ||
        m.ingredients.some((ing) => matches(ing)) ||
        matches(m.prescriber)
    );

    let allergies = record.allergies.filter(
      (a) => matches(a.substance) || matches(a.reaction)
    );

    let conditions = record.conditions.filter((c) => matches(c.name));

    let labs = record.labs.filter(
      (l) => matches(l.test) || matches(l.unit) || matches(l.date)
    );

    let events = record.events.filter(
      (e) => matches(e.title) || matches(e.facility) || matches(e.date)
    );

    // Apply Sorting
    if (sortBy === 'name') {
      meds = [...meds].sort((a, b) => a.name.localeCompare(b.name));
      allergies = [...allergies].sort((a, b) => a.substance.localeCompare(b.substance));
      conditions = [...conditions].sort((a, b) => a.name.localeCompare(b.name));
      labs = [...labs].sort((a, b) => a.test.localeCompare(b.test));
      events = [...events].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'newest') {
      labs = [...labs].sort((a, b) => b.date.localeCompare(a.date));
      events = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    const totalMatches =
      meds.length + allergies.length + conditions.length + labs.length + events.length;

    return {
      medications: meds,
      allergies,
      conditions,
      labs,
      events,
      totalMatches,
    };
  }, [record, searchQuery, sortBy]);

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--forest-800)] border-t-transparent" />
          <p className="text-sm font-medium text-[color:var(--muted-grey)]">Accessing local vault...</p>
        </div>
      </main>
    );
  }

  // Synthetic demo date (2026-10-10)
  const today = '2026-10-10';
  const flags = record ? analyzeRecord(record, today) : [];
  const pendingCount = record?.pendingReview?.length || 0;

  return (
    <main className="app-shell space-y-6">
      {/* Disclaimer Top Banner */}
      <div className="notice-banner flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 px-4 py-2.5 text-[13px] text-amber-950 shadow-2xs backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            Synthetic Demonstration Data · Local browser storage only · <strong>Do not enter real medical records</strong>
          </span>
        </div>
        <span className="font-mono text-[12px] font-bold text-amber-800 bg-amber-200/60 rounded px-2 py-0.5">
          Prototype
        </span>
      </div>

      {!record ? (
        /* Empty State */
        <div className="glass-panel empty-state rounded-3xl p-10 text-center shadow-xs space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-[color:var(--brand-ink)] text-2xl font-bold shadow-xs">
            <ShieldCheck className="h-8 w-8 text-[color:var(--teal-text)]" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[color:var(--brand-ink)]">Your Health Vault is Empty</h2>
            <p className="text-sm text-[color:var(--muted-grey)] leading-relaxed">
              Import medical records from photos or PDFs, or load the synthetic demo patient (Meena Krishnan) to explore the clinical reconciliation engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                loadDemo('start');
                showToast('Loaded demo persona (unreconciled state)', 'info');
              }}
              className="rounded-xl bg-[var(--forest-800)] px-5 py-3 text-sm font-semibold text-[#e4eee5] shadow-sm hover:bg-[var(--forest-700)] transition-colors"
            >
              Load Demo (Unreconciled Start)
            </button>
            <button
              type="button"
              onClick={() => {
                loadDemo('complete');
                showToast('Loaded demo persona (fully reconciled)', 'info');
              }}
              className="rounded-xl border border-[var(--border-card)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              Load Demo (Fully Reconciled)
            </button>
            <Link
              href="/vault/import"
              className="rounded-xl border border-[var(--border-card)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              Import Documents
            </Link>
          </div>
        </div>
      ) : (
        /* Populated Vault */
        <>
          {/* Patient Header & Quick Bar */}
          <header className="glass-panel patient-header rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--forest-800)] text-[#e4eee5] text-xl font-bold shadow-xs">
                  {record.profile.name.charAt(0)}
                </div>
                <div className="patient-identity">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[13px] font-bold text-[color:var(--brand-ink)]">
                      PATIENT VAULT
                    </span>
                    <span className="text-[13px] text-[color:var(--muted-grey)]">Stored in this browser</span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--brand-ink)]">
                      {record.profile.name}
                    </h1>
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-card)] bg-white px-2 py-1 text-[13px] font-medium text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] hover:text-[color:var(--brand-ink)] transition-colors shadow-2xs"
                      title="Edit Profile"
                    >
                      <Edit3 className="h-3 w-3 text-[color:var(--teal-text)]" />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                  <p className="text-[13px] text-[color:var(--muted-grey)] mt-0.5">
                    DOB: <strong className="text-[color:var(--brand-ink)]">{record.profile.dateOfBirth}</strong> · Sex: <strong className="text-[color:var(--brand-ink)] capitalize">{record.profile.sex}</strong>
                    {record.profile.emergencyContact && (
                      <span className="ml-2">
                        · Emergency Contact: <strong>{record.profile.emergencyContact.name}</strong> ({record.profile.emergencyContact.phone})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="vault-actions flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setShowAskAssistant(true)} className="rounded-xl border border-[var(--border-card)] bg-white px-3 py-2.5 text-[13px] font-bold text-[color:var(--brand-ink)]">Ask Assistant</button>
                <button type="button" onClick={() => setShowClinicalBrief(true)} className="rounded-xl border border-[var(--border-card)] bg-white px-3 py-2.5 text-[13px] font-bold text-[color:var(--brand-ink)]">Clinical Brief</button>
                <button type="button" onClick={() => setShowAppointmentPrep(true)} className="rounded-xl border border-[var(--border-card)] bg-white px-3 py-2.5 text-[13px] font-bold text-[color:var(--brand-ink)]">Appointment Prep</button>
                <button type="button" onClick={() => setShowConsentModal(true)} className="rounded-xl border border-[var(--border-card)] bg-white px-3 py-2.5 text-[13px] font-bold text-[color:var(--brand-ink)]">AI: {aiMode === 'local' ? 'Local' : 'Gemini'}</button>
                <Link
                  href="/vault/import"
                  className="relative inline-flex items-center gap-1.5 rounded-xl bg-[var(--forest-800)] px-4 py-2.5 text-[13px] font-bold text-white shadow-xs hover:bg-[var(--forest-700)] transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-[#8ccab5]" />
                  <span>Import Records</span>
                  {pendingCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[12px] font-bold text-white shadow-xs">
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/vault/share"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-card)] bg-white px-4 py-2.5 text-[13px] font-bold text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] transition-colors shadow-2xs"
                >
                  <Share2 className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
                  <span>Share Summary</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--teal-text)]/40 bg-[var(--mint-100)]/70 px-3.5 py-2.5 text-[13px] font-bold text-[color:var(--brand-ink)] hover:bg-[var(--mint-100)] transition-colors shadow-2xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
                  <span>{showAddForm ? 'Cancel' : 'Add Item'}</span>
                </button>

                <div className="hidden sm:block h-6 w-px bg-[#cdd4c8] mx-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset to Meena Krishnan starting demo state?')) {
                      loadDemo('start');
                      showToast('Reset to starting demo state', 'info');
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-card)] bg-white px-2.5 py-2.5 text-[13px] text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] transition-colors"
                  title="Reset Demo State"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Revoke all shares and delete all stored health records from this browser?')) {
                      try {
                        await deleteAllData();
                        showToast('All shares revoked and browser storage wiped', 'info');
                      } catch {
                        showToast('Could not revoke all shares or clear storage. Data kept; please retry.', 'error');
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-2.5 text-[13px] text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Wipe Storage"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Wipe</span>
                </button>
              </div>
            </div>

            {/* Interactive Profile Edit Drawer */}
            {showEditProfile && (
              <form
                onSubmit={handleSaveProfile}
                className="mt-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-muted)] p-5 space-y-4 shadow-xs animate-slide-up"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-strong)] pb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[color:var(--teal-text)]" />
                    <span className="text-[13px] font-bold text-[color:var(--brand-ink)] uppercase tracking-wide">
                      Edit Synthetic Patient Profile
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(false)}
                    className="text-[color:var(--muted-grey)] hover:text-[color:var(--brand-ink)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-[13px]">
                  <div>
                    <label htmlFor="vault-page-field-1" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                      Full Name *
                    </label>
                    <input id="vault-page-field-1"
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                    />
                    {profileErrors.name && (
                      <p className="text-[12px] text-rose-600 mt-1">{profileErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="vault-page-field-2" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                      Date of Birth *
                    </label>
                    <input id="vault-page-field-2"
                      type="date"
                      required
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                    />
                    {profileErrors.dateOfBirth && (
                      <p className="text-[12px] text-rose-600 mt-1">{profileErrors.dateOfBirth}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="vault-page-field-3" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                      Biological Sex *
                    </label>
                    <select id="vault-page-field-3"
                      value={profileForm.sex}
                      onChange={(e) => setProfileForm({ ...profileForm, sex: e.target.value as 'female' | 'male' | 'other' })}
                      className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="vault-page-field-4" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                      Emergency Contact Name
                    </label>
                    <input id="vault-page-field-4"
                      type="text"
                      value={profileForm.emergencyName}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyName: e.target.value })}
                      placeholder="e.g. Priya Krishnan"
                      className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="vault-page-field-5" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                      Emergency Contact Phone
                    </label>
                    <input id="vault-page-field-5"
                      type="tel"
                      value={profileForm.emergencyPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyPhone: e.target.value })}
                      placeholder="e.g. +91 98401 23456"
                      className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                    />
                    {profileErrors.emergencyPhone && (
                      <p className="text-[12px] text-rose-600 mt-1">{profileErrors.emergencyPhone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-strong)]">
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(false)}
                    className="rounded-xl px-4 py-2 text-[13px] font-semibold text-[color:var(--muted-grey)] hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--forest-800)] px-5 py-2 text-[13px] font-bold text-white shadow-2xs hover:bg-[var(--forest-700)] transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* Expandable Add Patient-Reported Item Form */}
            {showAddForm && (
              <form
                onSubmit={handleSaveRecord}
                className="mt-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-muted)] p-5 space-y-4 shadow-xs animate-slide-up"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-strong)] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[color:var(--teal-text)]" />
                    <span className="text-[13px] font-bold text-[color:var(--brand-ink)] uppercase tracking-wide">
                      Add Patient-Reported Fact
                    </span>
                    <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[12px] font-bold text-[color:var(--brand-ink)]">
                      Provenance: Patient-reported
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                    {(['medication', 'allergy', 'condition', 'lab', 'event'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddType(t)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all ${
                          addType === t
                            ? 'bg-[var(--forest-800)] text-white shadow-xs'
                            : 'bg-white text-[color:var(--muted-grey)] border border-[var(--border-card)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        {t === 'event' ? 'Encounter' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 text-[13px]">
                  {addType === 'medication' && (
                    <>
                      <div>
                        <label htmlFor="vault-page-field-6" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Medication Name *
                        </label>
                        <input id="vault-page-field-6"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Escitalopram / Metformin"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-7" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Strength
                        </label>
                        <input id="vault-page-field-7"
                          type="text"
                          value={formData.strength}
                          onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                          placeholder="e.g. 10 mg / 500 mg"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-8" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Dosage / Instructions
                        </label>
                        <input id="vault-page-field-8"
                          type="text"
                          value={formData.dosage}
                          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                          placeholder="e.g. 1 tablet daily at bedtime"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-9" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Prescribing Doctor (Optional)
                        </label>
                        <input id="vault-page-field-9"
                          type="text"
                          value={formData.prescriber}
                          onChange={(e) => setFormData({ ...formData, prescriber: e.target.value })}
                          placeholder="e.g. Dr. A. Iyer"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'allergy' && (
                    <>
                      <div>
                        <label htmlFor="vault-page-field-10" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Allergen Substance *
                        </label>
                        <input id="vault-page-field-10"
                          type="text"
                          required
                          value={formData.substance}
                          onChange={(e) => setFormData({ ...formData, substance: e.target.value })}
                          placeholder="e.g. Amoxicillin / Sulfa drugs"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-11" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Known Reaction
                        </label>
                        <input id="vault-page-field-11"
                          type="text"
                          value={formData.reaction}
                          onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                          placeholder="e.g. Urticaria, swelling, rash"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'condition' && (
                    <>
                      <div>
                        <label htmlFor="vault-page-field-12" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Condition / Diagnosis *
                        </label>
                        <input id="vault-page-field-12"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Type 2 Diabetes / Migraine"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-13" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Diagnosed Since (Year/Date)
                        </label>
                        <input id="vault-page-field-13"
                          type="text"
                          value={formData.since}
                          onChange={(e) => setFormData({ ...formData, since: e.target.value })}
                          placeholder="e.g. 2018 or Jan 2020"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'lab' && (
                    <>
                      <div>
                        <label htmlFor="vault-page-field-14" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Test Name *
                        </label>
                        <input id="vault-page-field-14"
                          type="text"
                          required
                          value={formData.test}
                          onChange={(e) => setFormData({ ...formData, test: e.target.value })}
                          placeholder="e.g. HbA1c / Serum Creatinine"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-15" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Numeric Value *
                        </label>
                        <input id="vault-page-field-15"
                          type="number"
                          step="any"
                          required
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          placeholder="e.g. 7.4"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-16" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Unit of Measurement
                        </label>
                        <input id="vault-page-field-16"
                          type="text"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="e.g. % or mg/dL"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-17" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Reference Range
                        </label>
                        <input id="vault-page-field-17"
                          type="text"
                          value={formData.refRange}
                          onChange={(e) => setFormData({ ...formData, refRange: e.target.value })}
                          placeholder="e.g. 4.0 - 5.6 %"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="vault-page-field-18" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Test Date
                        </label>
                        <input id="vault-page-field-18"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'event' && (
                    <>
                      <div>
                        <label htmlFor="vault-page-field-19" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Encounter / Procedure Title *
                        </label>
                        <input id="vault-page-field-19"
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Annual Diabetes Review"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-20" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Encounter Type
                        </label>
                        <select id="vault-page-field-20"
                          value={formData.eventType}
                          onChange={(e) => setFormData({ ...formData, eventType: e.target.value as 'visit' | 'procedure' | 'admission' })}
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        >
                          <option value="visit">Outpatient Visit</option>
                          <option value="procedure">Procedure</option>
                          <option value="admission">Hospital Admission</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-21" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Clinic / Hospital Facility
                        </label>
                        <input id="vault-page-field-21"
                          type="text"
                          value={formData.facility}
                          onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                          placeholder="e.g. Apollo Speciality Clinic"
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="vault-page-field-22" className="block text-[12px] font-bold text-[color:var(--brand-ink)] mb-1">
                          Date
                        </label>
                        <input id="vault-page-field-22"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-strong)]">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl px-4 py-2 text-[13px] font-semibold text-[color:var(--muted-grey)] hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[var(--forest-800)] px-5 py-2 text-[13px] font-bold text-white shadow-2xs hover:bg-[var(--forest-700)] transition-colors"
                  >
                    Save to Vault
                  </button>
                </div>
              </form>
            )}

            {/* Pending Review Queue Banner */}
            {pendingCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-[13px] text-amber-950 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900 font-bold">
                    {pendingCount}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-amber-950 block">
                      {pendingCount} item(s) awaiting your review
                    </span>
                    <p className="text-amber-900/80 text-[12px] mt-0.5">
                      Extracted facts are held in your private staging queue and will never be shared until you confirm them.
                    </p>
                  </div>
                </div>
                <Link
                  href="/vault/import"
                  className="rounded-xl bg-amber-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-amber-950 transition-colors shadow-2xs shrink-0"
                >
                  Open Review Queue →
                </Link>
              </div>
            )}
          </header>

          {/* Interactive KPI Summary Cards */}
          <section className="kpi-grid grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                id: 'medications',
                label: 'Medications',
                count: record.medications.filter((m) => m.status === 'active').length,
                subtext: 'active regimens',
                icon: Pill,
                color: 'text-[color:var(--teal-text)]',
              },
              {
                id: 'allergies',
                label: 'Allergies',
                count: record.allergies.length,
                subtext: record.allergyStatus === 'has-allergies' ? 'has allergies' : record.allergyStatus === 'none-known' ? 'none known' : 'status unknown',
                icon: ShieldAlert,
                color: 'text-rose-700',
              },
              {
                id: 'conditions',
                label: 'Conditions',
                count: record.conditions.length,
                subtext: 'documented',
                icon: HeartPulse,
                color: 'text-amber-700',
              },
              {
                id: 'labs',
                label: 'Lab Tests',
                count: record.labs.length,
                subtext: 'recorded values',
                icon: Activity,
                color: 'text-emerald-700',
              },
              {
                id: 'timeline',
                label: 'Encounters',
                count: record.events.length,
                subtext: 'clinical visits',
                icon: Calendar,
                color: 'text-[color:var(--brand-ink)]',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              const isSelected = activeTab === kpi.id;
              return (
                <button
                  key={kpi.id}
                  type="button"
                  onClick={() => setActiveTab(kpi.id as typeof activeTab)}
                  aria-pressed={isSelected}
                  className={`flex flex-col justify-between text-left rounded-2xl p-4 transition-all duration-200 border ${
                    isSelected
                      ? 'bg-white border-[var(--teal-text)] shadow-sm ring-2 ring-[var(--teal-text)]/20'
                      : 'bg-white/80 border-[var(--border-card)] hover:bg-white hover:border-[var(--border-strong)] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[12px] font-bold text-[color:var(--muted-grey)] uppercase tracking-wider">
                      {kpi.label}
                    </span>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-[color:var(--brand-ink)] tracking-tight">
                      {kpi.count}
                    </span>
                    <span className="text-[12px] text-[color:var(--muted-grey)] block mt-0.5 capitalize">
                      {kpi.subtext}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          {/* Clinical Reconciliation Flags */}
          {flags.length > 0 && (
            <section className="glass-panel record-section rounded-2xl p-6 shadow-xs">
              <FlagList flags={flags} />
            </section>
          )}

          {/* Search Bar & Sorting Controls */}
          <div className="search-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl border border-[var(--border-card)] p-3 shadow-2xs">
            {/* Live Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted-grey)]" />
              <input
                type="text"
                value={searchQuery}
                aria-label="Search health records"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across medications, allergies, labs, conditions..."
                className="w-full pl-10 pr-9 py-2 text-[13px] rounded-xl border border-transparent bg-[var(--background)] text-[color:var(--brand-ink)] placeholder-[#737d74] focus:border-[var(--teal-text)] focus:bg-white focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-grey)] hover:text-[color:var(--brand-ink)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-[13px] text-[color:var(--muted-grey)]">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sort:</span>
              </div>
              <select
                aria-label="Sort health records"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl border border-[var(--border-card)] bg-[var(--background)] px-3 py-2 text-[13px] text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:bg-white focus:outline-none font-medium"
              >
                <option value="default">Default Order</option>
                <option value="name">Alphabetical (A-Z)</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="record-tabs flex items-center gap-1.5 overflow-x-auto pb-1 text-[13px]">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'medications', label: `Medications (${record.medications.filter((m) => m.status === 'active').length})` },
              { id: 'allergies', label: `Allergies (${record.allergies.length})` },
              { id: 'conditions', label: `Conditions (${record.conditions.length})` },
              { id: 'labs', label: `Labs (${record.labs.length})` },
              { id: 'timeline', label: `Timeline (${record.events.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                aria-pressed={activeTab === tab.id}
                className={`rounded-xl px-3.5 py-2 font-bold whitespace-nowrap transition-all shadow-2xs ${
                  activeTab === tab.id
                    ? 'bg-[var(--forest-800)] text-[#e4eee5] shadow-xs'
                    : 'bg-white text-[color:var(--muted-grey)] border border-[var(--border-card)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Search Results Feedback */}
          {searchQuery && filteredData && (
            <div className="flex items-center justify-between rounded-xl bg-[var(--mint-100)]/60 border border-[var(--border-strong)] px-4 py-2 text-[13px] text-[color:var(--brand-ink)]">
              <span>
                Found <strong>{filteredData.totalMatches}</strong> matching records for &quot;{searchQuery}&quot;
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="font-bold underline hover:text-[color:var(--teal-text)]"
              >
                Clear filter
              </button>
            </div>
          )}

          <div className="record-grid">
          {/* 1. Allergies Section */}
          {(activeTab === 'all' || activeTab === 'allergies') && filteredData && (!searchQuery.trim() || filteredData.allergies.length > 0) && (
            <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
                  Allergies &amp; Adverse Drug Reactions
                </h2>
                <span className="text-[13px] text-[color:var(--muted-grey)]">
                  {filteredData.allergies.length} documented
                </span>
              </div>
              <AllergyList
                allergies={filteredData.allergies}
                status={record.allergyStatus}
                onStatusChange={setAllergyStatus}
                onRemove={(id) => {
                  const item = record.allergies.find((a) => a.id === id);
                  handleRemove(id, item?.substance || 'Allergy');
                }}
              />
            </section>
          )}

          {/* 2. Medications Section */}
          {(activeTab === 'all' || activeTab === 'medications') && filteredData && (
            <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
                  Current &amp; Prescribed Medications
                </h2>
                <span className="text-[13px] text-[color:var(--muted-grey)]">
                  {filteredData.medications.filter((m) => m.status === 'active').length} active
                </span>
              </div>
              <MedicineList
                medications={filteredData.medications}
                onStop={(id) => {
                  const item = record.medications.find((m) => m.id === id);
                  handleStopMed(id, item?.name || 'Medication');
                }}
                onRemove={(id) => {
                  const item = record.medications.find((m) => m.id === id);
                  handleRemove(id, item?.name || 'Medication');
                }}
              />
            </section>
          )}

          {/* 3. Conditions Section */}
          {(activeTab === 'all' || activeTab === 'conditions') && filteredData && (
            <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
                  Documented Conditions
                </h2>
                <span className="text-[13px] text-[color:var(--muted-grey)]">
                  {filteredData.conditions.length} recorded
                </span>
              </div>
              <ConditionList
                conditions={filteredData.conditions}
                onRemove={(id) => {
                  const item = record.conditions.find((c) => c.id === id);
                  handleRemove(id, item?.name || 'Condition');
                }}
              />
            </section>
          )}

          {/* 4. Lab Results Section */}
          {(activeTab === 'all' || activeTab === 'labs') && filteredData && (
            <section className="glass-panel record-section record-wide rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
                  Laboratory Results &amp; Trends
                </h2>
                <span className="text-[13px] text-[color:var(--muted-grey)]">
                  {filteredData.labs.length} tests recorded
                </span>
              </div>
              <LabTrend
                labs={filteredData.labs}
                onRemove={(id) => {
                  const item = record.labs.find((l) => l.id === id);
                  handleRemove(id, item?.test || 'Lab Result');
                }}
              />
            </section>
          )}

          {/* 5. Care Events Timeline */}
          {(activeTab === 'all' || activeTab === 'timeline') && filteredData && (
            <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
                  Care Timeline &amp; Encounters
                </h2>
                <span className="text-[13px] text-[color:var(--muted-grey)]">
                  {filteredData.events.length} events
                </span>
              </div>
              <Timeline
                events={filteredData.events}
                onRemove={(id) => {
                  const item = record.events.find((e) => e.id === id);
                  handleRemove(id, item?.title || 'Care Event');
                }}
              />
            </section>
          )}

          {/* 6. Source Documents on File */}
          <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
              <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
                Source Documents on File ({record.documents.length})
              </h2>
              <Link
                href="/vault/import"
                className="text-[13px] font-bold text-[color:var(--teal-text)] hover:underline"
              >
                + Add more documents
              </Link>
            </div>

            {record.documents.length === 0 ? (
              <p className="text-sm text-[color:var(--muted-grey)] italic py-2">No documents attached yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {record.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex min-w-0 flex-col justify-between rounded-xl border border-[var(--border-card)] bg-white p-4 shadow-2xs hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[color:var(--brand-ink)] truncate">{doc.title}</span>
                        <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[12px] font-bold uppercase text-[color:var(--brand-ink)] shrink-0">
                          {doc.docType}
                        </span>
                      </div>
                      <div className="text-[13px] text-[color:var(--muted-grey)] mt-2 space-y-0.5">
                        {doc.facility && <p>Facility: {doc.facility}</p>}
                        {doc.clinician && <p>Clinician: {doc.clinician}</p>}
                        {doc.date && <p>Date: {doc.date}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          </div>
        </>
      )}
      {record && <>
        <section className="glass-panel record-section rounded-2xl p-6"><ReconciliationPanel record={record} onUpdateMedicationStatus={(id, status) => updateItem(id, { status })} /></section>
        <section className="glass-panel record-section rounded-2xl p-6"><RecordQualityPanel record={record} /></section>
        {showAskAssistant && <AskCareBridgeDrawer isOpen onClose={() => setShowAskAssistant(false)} record={record} aiMode={aiMode} onOpenConsent={() => setShowConsentModal(true)} />}
        {showClinicalBrief && <ClinicalBriefModal isOpen onClose={() => setShowClinicalBrief(false)} record={record} aiMode={aiMode} onNavigateToShare={() => { setShowClinicalBrief(false); router.push('/vault/share'); }} />}
        {showAppointmentPrep && <AppointmentPrepModal isOpen onClose={() => setShowAppointmentPrep(false)} record={record} aiMode={aiMode} />}
      </>}
      {showConsentModal && <AIConsentModal isOpen onClose={() => setShowConsentModal(false)} currentMode={aiMode} onConsent={setAiMode} />}
    </main>
  );
}
