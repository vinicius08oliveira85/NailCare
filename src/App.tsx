/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Users, 
  Sparkles, 
  LayoutDashboard, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Phone,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit2,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Service, Appointment, PaymentStatus } from './types.ts';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { supabase } from './lib/supabase.ts';

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Data: YYYY-MM-DD <-> DD/MM/AAAA
const formatYMDToDDMMAAAA = (ymd: string): string => {
  if (!ymd || ymd.length < 10) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};
const parseDDMMAAAAToYMD = (s: string): string => {
  const digits = s.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return '';
  return `${y}-${m}-${d}`;
};
const maskDateDDMMAAAA = (raw: string): string => {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
};

// Mapear linha Supabase (snake_case) para tipo do app (camelCase)
function mapClient(row: { id: string; name: string; phone: string }): Client {
  return { id: row.id, name: row.name, phone: row.phone };
}
function mapService(row: { id: string; name: string; price: number }): Service {
  return { id: row.id, name: row.name, price: Number(row.price) };
}
function mapAppointment(row: { id: string; client_id: string | null; client_name: string | null; service_id: string; date: string; status: string; travel_fee?: number }): Appointment {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
    serviceId: row.service_id,
    date: row.date,
    status: row.status as PaymentStatus,
    travelFee: Number(row.travel_fee ?? 0)
  };
}

function toWhatsAppPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 0) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

const WHATSAPP_SERVICE_MESSAGES: Record<string, { visitLabel: string; ctaPart: string }> = {
  'Manicure': { visitLabel: 'Unhas da mão (Manicure)', ctaPart: 'as mãos impecáveis' },
  'Pedicure': { visitLabel: 'unhas do Pé (Pedicure)', ctaPart: 'os pés impecáveis' },
  'Combo (Mão e Pé)': { visitLabel: 'unhas da Mão e do Pé (Combo (Mão e Pé))', ctaPart: 'mãos e pés impecáveis' },
};

function whatsAppMessage(clientName: string, lastServiceDays: number | null, serviceName?: string | null): string {
  const name = clientName || 'Cliente';
  if (lastServiceDays === null) {
    return `Olá, ${name}! Tudo bem? Sou a Juliana. 🌸

Passando para te convidar a conhecer nosso espaço e dar aquele up no visual das suas unhas.

Gostaria de consultar nossos horários disponíveis para esta semana? Será um prazer te atender!`;
  }
  const n = lastServiceDays;
  const config = serviceName ? WHATSAPP_SERVICE_MESSAGES[serviceName] : undefined;
  const visitLabel = config?.visitLabel ?? (serviceName ?? 'Serviço');
  const ctaPart = config?.ctaPart ?? 'suas unhas em dia';
  return `Oi, ${name}! Como você está? Notei que sua última visita para ${visitLabel} foi há ${n} dias.

Geralmente, esse é o período ideal para trocar o esmalte e manter a saúde das suas unhas em dia. Que tal garantir seu horário para esta semana e continuar com ${ctaPart}? Estamos à disposição para encontrar o melhor momento para você!`;
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

type TabId = 'dashboard' | 'agenda' | 'clients' | 'services' | 'reports';
const HASH_TO_TAB: Record<string, TabId> = {
  '': 'dashboard',
  '#inicio': 'dashboard',
  '#agenda': 'agenda',
  '#clientes': 'clients',
  '#servicos': 'services',
  '#relatorios': 'reports',
};
const TAB_TO_HASH: Record<TabId, string> = {
  dashboard: '#inicio',
  agenda: '#agenda',
  clients: '#clientes',
  services: '#servicos',
  reports: '#relatorios',
};
function getTabFromHash(): TabId {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return HASH_TO_TAB[hash] ?? 'dashboard';
}

export default function App() {
  // State (inicial vazio; carregado do Supabase no useEffect)
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTabState] = useState<TabId>(getTabFromHash);
  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab);
    const hash = TAB_TO_HASH[tab];
    if (typeof window !== 'undefined' && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash || window.location.pathname || '/');
    }
  };

  // Manter aba sincronizada com o hash ao usar voltar/avançar do navegador
  useEffect(() => {
    const onHashChange = () => setActiveTabState(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Push: pedir permissão e inscrever para lembretes (1 dia e 1h antes). Desativado por padrão (limite de cron na Vercel); ative com VITE_PUSH_ENABLED=true.
  useEffect(() => {
    if (import.meta.env.VITE_PUSH_ENABLED !== 'true') return;
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidPublic) return;
    const urlBase64ToUint8Array = (base64: string): Uint8Array => {
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    };
    (async () => {
      try {
        if (Notification.permission === 'default') await Notification.requestPermission();
        if (Notification.permission !== 'granted') return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        });
        const apiBase = import.meta.env.VITE_APP_URL || '';
        await fetch(`${apiBase}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch (e) {
        console.warn('NailCare push subscribe:', e);
      }
    })();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'appointment' | 'client' | 'service'>('appointment');
  const [modalStatus, setModalStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
  const [modalDate, setModalDate] = useState<string>(''); // YYYY-MM-DD
  const [modalDateDisplay, setModalDateDisplay] = useState<string>(''); // DD/MM/AAAA no input
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [modalTime, setModalTime] = useState<string>(''); // HH:mm
  const [modalIncludeTravelFee, setModalIncludeTravelFee] = useState(false);
  const [clientMode, setClientMode] = useState<'existing' | 'new' | 'quick'>('existing');
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const [historyServiceId, setHistoryServiceId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Client | Service | Appointment | null>(null);

  // Carregamento inicial do Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientsRes, servicesRes, appointmentsRes] = await Promise.all([
          supabase.from('clients').select('*').order('created_at', { ascending: true }),
          supabase.from('services').select('*').order('created_at', { ascending: true }),
          supabase.from('appointments').select('*').order('created_at', { ascending: true })
        ]);
        if (cancelled) return;
        const err = clientsRes.error || servicesRes.error || appointmentsRes.error;
        if (err) {
          console.error('NailCare Supabase load error:', err);
          setDataLoading(false);
          return;
        }
        setClients((clientsRes.data ?? []).map(mapClient));
        let servicesData = (servicesRes.data ?? []).map(mapService);
        if (servicesData.length === 0) {
          const { data: inserted } = await supabase.from('services').insert([
            { name: 'Manicure', price: 35 },
            { name: 'Pedicure', price: 40 },
            { name: 'Combo (Mão e Pé)', price: 70 }
          ]).select();
          if (!cancelled && inserted?.length) servicesData = inserted.map(mapService);
        }
        setServices(servicesData);
        setAppointments((appointmentsRes.data ?? []).map(mapAppointment));
      } catch (e) {
        if (!cancelled) console.error('NailCare Supabase load error:', e);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fechar date picker ao clicar fora
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isDatePickerOpen]);

  // Realtime: sincronizar mudanças de outros dispositivos (evitar duplicar: INSERT só adiciona se o id ainda não existir)
  useEffect(() => {
    const channel = supabase
      .channel('nailcare-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
        const row = payload.new as any;
        const oldRow = payload.old as any;
        if (payload.eventType === 'INSERT' && row) setClients(prev => prev.some(c => c.id === row.id) ? prev : [...prev, mapClient(row)]);
        if (payload.eventType === 'UPDATE' && row) setClients(prev => prev.map(c => c.id === row.id ? mapClient(row) : c));
        if (payload.eventType === 'DELETE' && oldRow) setClients(prev => prev.filter(c => c.id !== oldRow.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
        const row = payload.new as any;
        const oldRow = payload.old as any;
        if (payload.eventType === 'INSERT' && row) setServices(prev => prev.some(s => s.id === row.id) ? prev : [...prev, mapService(row)]);
        if (payload.eventType === 'UPDATE' && row) setServices(prev => prev.map(s => s.id === row.id ? mapService(row) : s));
        if (payload.eventType === 'DELETE' && oldRow) setServices(prev => prev.filter(s => s.id !== oldRow.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        const row = payload.new as any;
        const oldRow = payload.old as any;
        if (payload.eventType === 'INSERT' && row) setAppointments(prev => prev.some(a => a.id === row.id) ? prev : [...prev, mapAppointment(row)]);
        if (payload.eventType === 'UPDATE' && row) setAppointments(prev => prev.map(a => a.id === row.id ? mapAppointment(row) : a));
        if (payload.eventType === 'DELETE' && oldRow) setAppointments(prev => prev.filter(a => a.id !== oldRow.id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculations
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const calculateProfit = (items: Appointment[]) => {
      return items
        .filter(a => a.status === PaymentStatus.PAID)
        .reduce((acc, curr) => {
          const service = services.find(s => s.id === curr.serviceId);
          return acc + (service?.price || 0) + (curr.travelFee ?? 0);
        }, 0);
    };

    const todayApps = appointments.filter(a => new Date(a.date) >= today && new Date(a.date) < new Date(today.getTime() + 24 * 60 * 60 * 1000));
    const weekApps = appointments.filter(a => new Date(a.date) >= startOfWeek);
    const monthApps = appointments.filter(a => new Date(a.date) >= startOfMonth);

    return {
      today: calculateProfit(todayApps),
      week: calculateProfit(weekApps),
      month: calculateProfit(monthApps),
      nextAppointment: appointments
        .filter(a => new Date(a.date) > now && a.status !== PaymentStatus.CANCELED)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    };
  }, [appointments, services]);

  // Handlers
  const handleOpenModal = (type: 'appointment' | 'client' | 'service', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'appointment') {
      setModalStatus(item?.status || PaymentStatus.PENDING);
      setClientMode(item?.clientId ? 'existing' : (item?.clientName ? 'quick' : 'existing'));
      setModalIncludeTravelFee(Number((item as Appointment)?.travelFee ?? 0) > 0);
      const date = item?.date ? new Date(item.date) : new Date();
      const ymd = date.toISOString().split('T')[0];
      setModalDate(ymd);
      setModalDateDisplay(formatYMDToDDMMAAAA(ymd));
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setModalTime(`${hours}:${minutes}`);
    }
    setIsModalOpen(true);
  };

  const addClient = async (name: string, phone: string) => {
    try {
      if (editingItem && 'phone' in editingItem) {
        const { data, error } = await supabase.from('clients').update({ name, phone }).eq('id', editingItem.id).select().single();
        if (error) throw error;
        if (data) setClients(clients.map(c => c.id === editingItem.id ? mapClient(data) : c));
      } else {
        const { data, error } = await supabase.from('clients').insert({ name, phone }).select().single();
        if (error) throw error;
        if (data) setClients(prev => [...prev, mapClient(data)]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error('NailCare addClient error:', e);
    }
  };

  const addService = async (name: string, price: number) => {
    try {
      if (editingItem && 'price' in editingItem) {
        const { data, error } = await supabase.from('services').update({ name, price }).eq('id', editingItem.id).select().single();
        if (error) throw error;
        if (data) setServices(services.map(s => s.id === editingItem.id ? mapService(data) : s));
      } else {
        const { data, error } = await supabase.from('services').insert({ name, price }).select().single();
        if (error) throw error;
        if (data) setServices(prev => [...prev, mapService(data)]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error('NailCare addService error:', e);
    }
  };

  const TRAVEL_FEE_AMOUNT = 10;
  const addAppointment = async (clientId: string | undefined, clientName: string | undefined, serviceId: string, status: PaymentStatus, travelFee: number) => {
    const combinedDate = new Date(`${modalDate}T${modalTime}`);
    const finalDate = combinedDate.toISOString();
    const payload = {
      client_id: clientId ?? null,
      client_name: clientName ?? null,
      service_id: serviceId,
      date: finalDate,
      status,
      travel_fee: travelFee
    };
    const payloadWithoutTravelFee = { ...payload };
    delete (payloadWithoutTravelFee as Record<string, unknown>).travel_fee;
    try {
      if (editingItem && 'status' in editingItem) {
        let { data, error } = await supabase.from('appointments').update(payload).eq('id', editingItem.id).select().single();
        if (error && (error.code === '42703' || /column.*travel_fee|travel_fee.*does not exist/i.test(String(error.message)))) {
          ({ data, error } = await supabase.from('appointments').update(payloadWithoutTravelFee).eq('id', editingItem.id).select().single());
        }
        if (error) throw error;
        if (data) setAppointments(appointments.map(a => a.id === editingItem.id ? mapAppointment(data) : a));
      } else {
        let { data, error } = await supabase.from('appointments').insert(payload).select().single();
        if (error && (error.code === '42703' || /column.*travel_fee|travel_fee.*does not exist/i.test(String(error.message)))) {
          ({ data, error } = await supabase.from('appointments').insert(payloadWithoutTravelFee).select().single());
        }
        if (error) throw error;
        if (data) setAppointments(prev => [...prev, mapAppointment(data)]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error('NailCare addAppointment error:', e);
    }
  };

  const updateAppointmentStatus = async (id: string, status: PaymentStatus) => {
    try {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) {
      console.error('NailCare updateAppointmentStatus error:', e);
    }
  };

  const deleteItem = async (type: 'client' | 'service' | 'appointment', id: string) => {
    try {
      if (type === 'client') {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
        setClients(prev => prev.filter(c => c.id !== id));
      } else if (type === 'service') {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        setServices(prev => prev.filter(s => s.id !== id));
      } else {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;
        setAppointments(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error('NailCare deleteItem error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-iris-light/30 px-4 h-16 min-h-16 flex justify-between items-center sticky top-0 z-50 shrink-0">
        <button
          type="button"
          onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
          className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 rounded-xl"
        >
          <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shadow-sm">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-sans font-bold tracking-tight text-plum">NailCare</h1>
        </button>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-dusk hover:bg-mist rounded-md transition-colors duration-150"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed left-0 right-0 bottom-0 top-16 z-40 bg-white/95 backdrop-blur-md flex flex-col overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-white rounded-xl shadow-2xl shadow-brand-primary/10 border border-iris-light/30 p-6 space-y-2">
              <button 
                onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-md transition-colors duration-150 ${activeTab === 'dashboard' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-dusk hover:bg-mist'}`}
              >
                <LayoutDashboard size={22} />
                <span className="font-semibold text-lg">Início</span>
              </button>
              <button 
                onClick={() => { setActiveTab('agenda'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-md transition-colors duration-150 ${activeTab === 'agenda' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-dusk hover:bg-mist'}`}
              >
                <Calendar size={22} />
                <span className="font-semibold text-lg">Agenda</span>
              </button>
              <button 
                onClick={() => { setActiveTab('clients'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-md transition-colors duration-150 ${activeTab === 'clients' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-dusk hover:bg-mist'}`}
              >
                <Users size={22} />
                <span className="font-semibold text-lg">Clientes</span>
              </button>
              <button 
                onClick={() => { setActiveTab('services'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-md transition-colors duration-150 ${activeTab === 'services' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-dusk hover:bg-mist'}`}
              >
                <Sparkles size={22} />
                <span className="font-semibold text-lg">Serviços</span>
              </button>
              <button 
                onClick={() => { setActiveTab('reports'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-md transition-colors duration-150 ${activeTab === 'reports' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-dusk hover:bg-mist'}`}
              >
                <BarChart3 size={22} />
                <span className="font-semibold text-lg">Relatórios</span>
              </button>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) */}
      <nav className="hidden md:flex w-72 bg-white/90 backdrop-blur-sm border-r border-iris-light/30 p-6 flex-col gap-8 sticky top-0 h-screen shadow-[2px_0_16px_0_rgb(157_139_181/0.08)]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shadow-sm hover:bg-brand-primary/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
            title="Ir para o início"
          >
            <Sparkles size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-sans font-bold tracking-tight text-plum">NailCare</h1>
            <p className="text-xs uppercase tracking-widest text-fog font-semibold mt-0.5">Manager</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-150 ${activeTab === 'dashboard' ? 'bg-iris-light/30 text-iris-dark font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:rounded-full before:bg-brand-primary' : 'text-dusk hover:bg-mist hover:text-plum font-medium'}`}
          >
            <LayoutDashboard size={20} />
            <span>Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-150 ${activeTab === 'agenda' ? 'bg-iris-light/30 text-iris-dark font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:rounded-full before:bg-brand-primary' : 'text-dusk hover:bg-mist hover:text-plum font-medium'}`}
          >
            <Calendar size={20} />
            <span>Agenda</span>
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-150 ${activeTab === 'clients' ? 'bg-iris-light/30 text-iris-dark font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:rounded-full before:bg-brand-primary' : 'text-dusk hover:bg-mist hover:text-plum font-medium'}`}
          >
            <Users size={20} />
            <span>Clientes</span>
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-150 ${activeTab === 'services' ? 'bg-iris-light/30 text-iris-dark font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:rounded-full before:bg-brand-primary' : 'text-dusk hover:bg-mist hover:text-plum font-medium'}`}
          >
            <Sparkles size={20} />
            <span>Serviços</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-150 ${activeTab === 'reports' ? 'bg-iris-light/30 text-iris-dark font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:rounded-full before:bg-brand-primary' : 'text-dusk hover:bg-mist hover:text-plum font-medium'}`}
          >
            <BarChart3 size={20} />
            <span>Relatórios</span>
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-iris-light/30">
          <p className="text-xs text-fog uppercase tracking-widest font-semibold mb-3">Próximo Horário</p>
          {stats.nextAppointment ? (
            <div 
              onClick={() => handleOpenModal('appointment', stats.nextAppointment)}
              className="p-4 bg-mist rounded-lg border border-iris-light/30 cursor-pointer hover:border-brand-primary/30 transition-all duration-150 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm text-plum">
                    {stats.nextAppointment?.clientName || clients.find(c => c.id === stats.nextAppointment?.clientId)?.name || 'Excluído'}
                  </p>
                  <p className="text-xs text-dusk mt-1 font-medium">
                    {new Date(stats.nextAppointment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(stats.nextAppointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                </div>
                <Edit2 size={12} className="text-fog group-hover:text-brand-primary transition-colors" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-fog italic">Nenhum agendado</p>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {dataLoading ? (
          <div className="flex items-center justify-center min-h-[40vh] text-dusk font-sans">Carregando...</div>
        ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header>
                <h2 className="text-5xl font-sans font-medium text-plum">Olá, bem-vinda</h2>
                <p className="text-dusk mt-3 text-lg font-sans italic">Seu dia está florescendo. Veja o resumo de hoje.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass-card p-5 flex flex-col gap-2 group hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                    <DollarSign size={18} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-fog font-semibold">Lucro do Dia</span>
                  <span className="text-2xl font-sans font-light tracking-tight text-plum tabular-nums">{formatCurrency(stats.today)}</span>
                </div>
                <div className="glass-card p-5 flex flex-col gap-2 group hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <div className="w-9 h-9 bg-brand-primary/10 text-brand-primary rounded-lg flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-fog font-semibold">Lucro da Semana</span>
                  <span className="text-2xl font-sans font-light tracking-tight text-plum tabular-nums">{formatCurrency(stats.week)}</span>
                </div>
                <div className="glass-card p-5 flex flex-col gap-2 group hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <div className="w-9 h-9 bg-brand-accent/10 text-brand-accent rounded-lg flex items-center justify-center">
                    <LayoutDashboard size={18} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-fog font-semibold">Lucro do Mês</span>
                  <span className="text-2xl font-sans font-light tracking-tight text-plum tabular-nums">{formatCurrency(stats.month)}</span>
                </div>
              </div>

              <section className="glass-card overflow-hidden">
                <div className="p-8 border-b border-iris-light/30 flex justify-between items-center">
                  <h3 className="text-2xl font-sans font-medium text-plum">Próximos Atendimentos</h3>
                  <button 
                    onClick={() => handleOpenModal('appointment')}
                    className="text-brand-primary hover:text-iris-dark transition-colors duration-150 text-sm font-semibold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded-md px-2 py-1"
                  >
                    <Plus size={18} /> Novo Agendamento
                  </button>
                </div>
                <div className="divide-y divide-iris-light/20">
                  {appointments
                    .filter(a => new Date(a.date) >= new Date())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 5)
                    .map(app => (
                      <div 
                        key={app.id} 
                        onClick={() => handleOpenModal('appointment', app)}
                        className="p-6 flex items-center justify-between hover:bg-mist/60 transition-colors duration-150 cursor-pointer group"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-white border border-iris-light/40 rounded-xl flex flex-col items-center justify-center text-brand-primary shadow-sm group-hover:shadow-md transition-all">
                            <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(app.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                            <span className="text-xl font-bold leading-none mt-1">{new Date(app.date).getDate()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-lg text-plum">
                              {app.clientName || clients.find(c => c.id === app.clientId)?.name || 'Excluído'}
                            </p>
                            <p className="text-sm text-dusk font-medium mt-1">
                              {services.find(s => s.id === app.serviceId)?.name} • {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider ${
                            app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {app.status}
                          </span>
                          <div className="flex gap-2 transition-all">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal('appointment', app); }}
                              className="p-2.5 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-brand-primary hover:bg-iris-light/20 active:scale-[0.97] transition-all duration-150 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteItem('appointment', app.id); }}
                              className="p-2.5 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-rose-500 hover:border-rose-200 active:scale-[0.97] transition-all duration-150 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {appointments.length === 0 && (
                    <div className="p-20 text-center">
                      <div className="w-16 h-16 bg-mist rounded-full flex items-center justify-center mx-auto mb-4 text-fog">
                        <Calendar size={32} />
                      </div>
                      <p className="text-dusk font-sans italic">Nenhum agendamento futuro encontrado.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div 
              key="agenda"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <header>
                  <h2 className="text-5xl font-sans font-medium text-plum">Agenda</h2>
                  <p className="text-dusk mt-2 text-lg font-sans italic">Seu fluxo de trabalho organizado.</p>
                </header>
                <button 
                  onClick={() => handleOpenModal('appointment')}
                  className="inline-flex items-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm px-6 py-3 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  <Plus size={20} /> Novo Agendamento
                </button>
              </div>

              <CalendarView 
                appointments={appointments}
                clients={clients}
                services={services}
                onEdit={(app) => handleOpenModal('appointment', app)}
                onDelete={(id) => deleteItem('appointment', id)}
                onAdd={(date) => handleOpenModal('appointment', { date: date.toISOString() })}
                onUpdateStatus={updateAppointmentStatus}
                formatCurrency={formatCurrency}
              />
            </motion.div>
          )}

          {activeTab === 'clients' && (
            <motion.div 
              key="clients"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <header>
                  <h2 className="text-5xl font-sans font-medium text-plum">Clientes</h2>
                  <p className="text-dusk mt-2 text-lg font-sans italic">Sua base de contatos fiel.</p>
                </header>
                <button 
                  onClick={() => handleOpenModal('client')}
                  className="inline-flex items-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm px-6 py-3 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  <Plus size={20} /> Novo Cliente
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...clients]
                  .map(client => {
                    const lastAppointment = appointments
                      .filter(a => a.clientId === client.id && new Date(a.date) <= new Date())
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    const lastServiceDays = lastAppointment
                      ? Math.floor((Date.now() - new Date(lastAppointment.date).getTime()) / 86400000)
                      : null;
                    const lastServiceName = lastAppointment
                      ? services.find(s => s.id === lastAppointment.serviceId)?.name ?? null
                      : null;
                    return { client, lastServiceDays, lastServiceName };
                  })
                  .sort((a, b) => {
                    const daysA = a.lastServiceDays ?? -1;
                    const daysB = b.lastServiceDays ?? -1;
                    return daysB - daysA;
                  })
                  .map(({ client, lastServiceDays, lastServiceName }) => {
                  const lastServiceLabel = lastServiceDays === null
                    ? 'Sem Serviço'
                    : lastServiceDays === 0
                      ? 'Hoje'
                      : lastServiceDays === 1
                        ? '1 Dia'
                        : `${lastServiceDays} Dias`;
                  const lastServiceColor =
                    lastServiceDays === null
                      ? 'bg-mist/80 text-fog border-iris-light/40'
                      : lastServiceDays < 15
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : lastServiceDays < 30
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-600 border-rose-200';
                  const waPhone = toWhatsAppPhone(client.phone);
                  const waUrl = waPhone
                    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(whatsAppMessage(client.name, lastServiceDays, lastServiceName))}`
                    : null;
                  return (
                  <div key={client.id} className="glass-card p-8 flex flex-col gap-5 group hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-200">
                    <div className="min-w-0">
                      <h4 className="text-xl font-semibold text-plum truncate">{client.name}</h4>
                      <div className="flex items-center gap-3 text-dusk mt-3 font-medium min-w-0">
                        <div className="w-8 h-8 shrink-0 bg-mist rounded-lg flex items-center justify-center text-brand-primary">
                          <Phone size={14} />
                        </div>
                        <span className="text-sm truncate">{client.phone}</span>
                      </div>
                      <div className={`mt-3 inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${lastServiceColor}`}>
                        {lastServiceLabel}
                      </div>
                    </div>
                    <div className="flex flex-nowrap gap-2 justify-end border-t border-iris-light/20 pt-4 min-w-0">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 sm:p-2.5 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-emerald-500 hover:border-emerald-200 active:scale-[0.97] transition-all duration-150 shadow-sm inline-flex items-center justify-center shrink-0"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <WhatsAppIcon size={18} />
                        </a>
                      ) : (
                        <span
                          className="p-2 sm:p-2.5 bg-white border border-iris-light/40 rounded-md text-fog cursor-not-allowed inline-flex items-center justify-center shrink-0"
                          title="Sem número para WhatsApp"
                        >
                          <WhatsAppIcon size={18} />
                        </span>
                      )}
                      <button 
                        onClick={() => setHistoryClientId(client.id)}
                        className="p-2 sm:p-2.5 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-emerald-500 hover:border-emerald-200 active:scale-[0.97] transition-all duration-150 shadow-sm shrink-0"
                        title="Ver Histórico"
                      >
                        <Clock size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal('client', client)}
                        className="p-2 sm:p-2.5 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-brand-primary hover:bg-iris-light/20 active:scale-[0.97] transition-all duration-150 shadow-sm shrink-0"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteItem('client', client.id)}
                        className="p-2 sm:p-2.5 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-rose-500 hover:border-rose-200 active:scale-[0.97] transition-all duration-150 shadow-sm shrink-0"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  );
                  })}
                {clients.length === 0 && (
                  <div className="col-span-full p-32 text-center border-2 border-dashed border-iris-light/40 rounded-3xl">
                    <div className="w-20 h-20 bg-mist rounded-full flex items-center justify-center mx-auto mb-6 text-fog">
                      <Users size={40} />
                    </div>
                    <p className="text-dusk font-sans italic text-lg">Nenhum cliente cadastrado ainda.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div 
              key="services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <header>
                  <h2 className="text-5xl font-sans font-medium text-plum">Serviços</h2>
                  <p className="text-dusk mt-2 text-lg font-sans italic">Seu cardápio de beleza.</p>
                </header>
                <button 
                  onClick={() => handleOpenModal('service')}
                  className="inline-flex items-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm px-6 py-3 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  <Plus size={20} /> Novo Serviço
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <div key={service.id} className="glass-card p-8 flex flex-col gap-5 group hover:shadow-[var(--shadow-raised)] hover:-translate-y-0.5 transition-all duration-200">
                    <div className="min-w-0">
                      <h4 className="text-xl font-semibold text-plum truncate">{service.name}</h4>
                      <div className="flex items-center gap-2 text-brand-primary mt-2 font-bold text-lg">
                        <span>{formatCurrency(service.price)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end border-t border-iris-light/20 pt-4">
                      <button 
                        onClick={() => setHistoryServiceId(service.id)}
                        className="p-3 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-emerald-500 hover:border-emerald-200 active:scale-[0.97] transition-all duration-150 shadow-sm"
                        title="Ver Histórico"
                      >
                        <Clock size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal('service', service)}
                        className="p-3 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-brand-primary hover:bg-iris-light/20 active:scale-[0.97] transition-all duration-150 shadow-sm"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteItem('service', service.id)}
                        className="p-3 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-rose-500 hover:border-rose-200 active:scale-[0.97] transition-all duration-150 shadow-sm"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-5xl font-sans font-medium text-plum">Relatórios</h2>
                <p className="text-dusk mt-2 text-lg font-sans italic">Analise o desempenho do seu negócio.</p>
              </header>

              <ReportsView 
                appointments={appointments}
                services={services}
                formatCurrency={formatCurrency}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {historyClientId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryClientId(null)}
              className="absolute inset-0 bg-plum/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white w-full max-w-2xl rounded-xl overflow-hidden border border-iris-light/30"
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-iris-light/30">
                  <div>
                    <h3 className="text-2xl font-sans font-medium text-plum">Histórico de Atendimentos</h3>
                    <p className="text-sm text-dusk font-sans italic mt-0.5">
                      {clients.find(c => c.id === historyClientId)?.name}
                    </p>
                  </div>
                  <button 
                    onClick={() => setHistoryClientId(null)}
                    className="p-3 bg-mist rounded-md text-dusk hover:text-plum transition-colors duration-150"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 space-y-4">
                  {appointments
                    .filter(a => a.clientId === historyClientId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(app => {
                      const service = services.find(s => s.id === app.serviceId);
                      return (
                        <div key={app.id} className="p-6 bg-mist rounded-xl border border-iris-light/30 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-plum text-lg">{service?.name || 'Serviço Excluído'}</p>
                            <p className="text-sm text-dusk font-medium mt-1">
                              {new Date(app.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-brand-accent">{formatCurrency((service?.price || 0) + (app.travelFee ?? 0))}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                              app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {appointments.filter(a => a.clientId === historyClientId).length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-dusk font-sans italic">Nenhum atendimento encontrado para este cliente.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {historyServiceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryServiceId(null)}
              className="absolute inset-0 bg-plum/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white w-full max-w-2xl rounded-xl overflow-hidden border border-iris-light/30"
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-iris-light/30">
                  <div>
                    <h3 className="text-2xl font-sans font-medium text-plum">Histórico do Serviço</h3>
                    <p className="text-sm text-dusk font-sans italic mt-0.5">
                      {services.find(s => s.id === historyServiceId)?.name}
                    </p>
                  </div>
                  <button 
                    onClick={() => setHistoryServiceId(null)}
                    className="p-3 bg-mist rounded-md text-dusk hover:text-plum transition-colors duration-150"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 space-y-4">
                  {appointments
                    .filter(a => a.serviceId === historyServiceId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(app => {
                      const client = clients.find(c => c.id === app.clientId);
                      return (
                        <div key={app.id} className="p-6 bg-mist rounded-xl border border-iris-light/30 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-plum text-lg">
                              {app.clientName || client?.name || 'Cliente Excluído'}
                            </p>
                            <p className="text-sm text-dusk font-medium mt-1">
                              {new Date(app.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                              app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {appointments.filter(a => a.serviceId === historyServiceId).length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-dusk font-sans italic">Nenhum atendimento encontrado para este serviço.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-plum/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white w-full max-w-md rounded-xl overflow-hidden border border-iris-light/30"
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              <div className="p-10">
                <div className="pb-6 mb-6 border-b border-iris-light/30 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-sans font-medium text-plum">
                      {modalType === 'appointment' && (editingItem ? 'Editar Agendamento' : 'Novo Agendamento')}
                      {modalType === 'client' && (editingItem ? 'Editar Cliente' : 'Cadastrar Cliente')}
                      {modalType === 'service' && (editingItem ? 'Editar Serviço' : 'Cadastrar Serviço')}
                    </h3>
                    <p className="text-sm text-dusk mt-0.5">Preencha os dados abaixo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
                    className="p-2 rounded-md text-dusk hover:text-plum hover:bg-mist transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 shrink-0"
                    title="Fechar"
                    aria-label="Fechar"
                  >
                    <X size={24} />
                  </button>
                </div>

                {modalType === 'client' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addClient(formData.get('name') as string, formData.get('phone') as string);
                  }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Nome Completo</label>
                      <input name="name" defaultValue={(editingItem as Client)?.name} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="Ex: Maria Silva" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Telefone</label>
                      <input name="phone" defaultValue={(editingItem as Client)?.phone} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="(11) 99999-9999" />
                    </div>
                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm py-3 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
                      {editingItem ? 'Salvar Alterações' : 'Salvar Cliente'}
                    </button>
                  </form>
                )}

                {modalType === 'service' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addService(formData.get('name') as string, Number(formData.get('price')));
                  }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Nome do Serviço</label>
                      <input name="name" defaultValue={(editingItem as Service)?.name} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="Ex: Esmaltação em Gel" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Valor (R$)</label>
                      <input name="price" type="number" step="0.01" defaultValue={(editingItem as Service)?.price} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="0,00" />
                    </div>
                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm py-3 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
                      {editingItem ? 'Salvar Alterações' : 'Salvar Serviço'}
                    </button>
                  </form>
                )}

                {modalType === 'appointment' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    
                    let finalClientId: string | undefined = undefined;
                    let finalClientName: string | undefined = undefined;

                    if (clientMode === 'existing') {
                      finalClientId = formData.get('clientId') as string;
                    } else if (clientMode === 'quick') {
                      finalClientName = formData.get('quickName') as string;
                    } else if (clientMode === 'new') {
                      const name = formData.get('newName') as string;
                      const phone = formData.get('newPhone') as string;
                      const { data, error } = await supabase.from('clients').insert({ name, phone }).select().single();
                      if (error) {
                        console.error('NailCare create client in appointment error:', error);
                        return;
                      }
                      if (data) {
                        setClients(prev => [...prev, mapClient(data)]);
                        finalClientId = data.id;
                      }
                    }

                    await addAppointment(
                      finalClientId,
                      finalClientName,
                      formData.get('serviceId') as string,
                      modalStatus,
                      formData.get('includeTravelFee') === 'on' ? TRAVEL_FEE_AMOUNT : 0
                    );
                  }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Opção de Cliente</label>
                      <div className="flex bg-mist p-1.5 rounded-md border border-iris-light/50 mb-4">
                        <button 
                          type="button"
                          onClick={() => setClientMode('existing')}
                          className={`flex-1 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${clientMode === 'existing' ? 'bg-white text-brand-primary shadow-sm' : 'text-dusk hover:text-plum'}`}
                        >
                          Existente
                        </button>
                        <button 
                          type="button"
                          onClick={() => setClientMode('new')}
                          className={`flex-1 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${clientMode === 'new' ? 'bg-white text-brand-primary shadow-sm' : 'text-dusk hover:text-plum'}`}
                        >
                          Cadastrar
                        </button>
                        <button 
                          type="button"
                          onClick={() => setClientMode('quick')}
                          className={`flex-1 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${clientMode === 'quick' ? 'bg-white text-brand-primary shadow-sm' : 'text-dusk hover:text-plum'}`}
                        >
                          Apenas Nome
                        </button>
                      </div>

                      {clientMode === 'existing' && (
                        <select name="clientId" defaultValue={(editingItem as Appointment)?.clientId} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 appearance-none cursor-pointer font-sans text-sm text-plum">
                          <option value="">Selecione um cliente</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}

                      {clientMode === 'new' && (
                        <div className="space-y-4">
                          <input name="newName" required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="Nome Completo" />
                          <input name="newPhone" required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="Telefone" />
                        </div>
                      )}

                      {clientMode === 'quick' && (
                        <input name="quickName" defaultValue={(editingItem as Appointment)?.clientName} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum" placeholder="Nome do Cliente" />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Serviço</label>
                      <select name="serviceId" defaultValue={(editingItem as Appointment)?.serviceId} required className="w-full px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 appearance-none cursor-pointer font-sans text-sm text-plum">
                        <option value="">Selecione um serviço</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price)})</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="includeTravelFee"
                        id="includeTravelFee"
                        checked={modalIncludeTravelFee}
                        onChange={(e) => setModalIncludeTravelFee(e.target.checked)}
                        className="w-4 h-4 rounded border-iris-light/50 text-brand-primary focus:ring-brand-primary/20"
                      />
                      <label htmlFor="includeTravelFee" className="text-sm font-medium text-plum cursor-pointer">
                        Incluir taxa de deslocamento ({formatCurrency(10)})
                      </label>
                    </div>
                    <div ref={datePickerRef} className="grid grid-cols-2 gap-4 sm:gap-6">
                      <div className="min-w-0 overflow-hidden">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Data</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          placeholder="DD/MM/AAAA"
                          value={modalDateDisplay}
                          onChange={(e) => {
                            const masked = maskDateDDMMAAAA(e.target.value);
                            setModalDateDisplay(masked);
                            const ymd = parseDDMMAAAAToYMD(masked);
                            setModalDate(ymd || '');
                          }}
                          onClick={() => {
                            if (isDatePickerOpen) {
                              setIsDatePickerOpen(false);
                            } else {
                              if (modalDate) setCalendarViewMonth(new Date(modalDate));
                              else setCalendarViewMonth(new Date());
                              setIsDatePickerOpen(true);
                            }
                          }}
                          required
                          pattern="\d{2}/\d{2}/\d{4}"
                          maxLength={10}
                          title="Clique para abrir ou fechar o calendário"
                          className="w-full min-w-0 px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 font-sans text-sm text-plum cursor-pointer" 
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Hora (24h)</label>
                        <div className="flex gap-2">
                          <select
                            value={modalTime ? (modalTime.split(':')[0] ?? '09') : '09'}
                            onChange={(e) => {
                              const [, m] = (modalTime || '09:00').split(':');
                              setModalTime(`${e.target.value.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`);
                            }}
                            required
                            className="flex-1 px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 appearance-none cursor-pointer font-sans text-sm text-plum"
                          >
                            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                              <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span className="flex items-center text-plum font-semibold">:</span>
                          <select
                            value={(() => {
                              const min = modalTime ? parseInt(modalTime.split(':')[1] ?? '0', 10) : 0;
                              const snapped = Math.round(min / 5) * 5;
                              return String(Math.min(55, Math.max(0, snapped))).padStart(2, '0');
                            })()}
                            onChange={(e) => {
                              const [h] = (modalTime || '09:00').split(':');
                              setModalTime(`${(h || '09').padStart(2, '0')}:${e.target.value.padStart(2, '0')}`);
                            }}
                            required
                            className="flex-1 px-4 py-3 rounded-md bg-mist border border-iris-light/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-150 appearance-none cursor-pointer font-sans text-sm text-plum"
                          >
                            {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                              <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[10px] text-fog mt-1.5 ml-1">Ex.: 13:05</p>
                      </div>
                      <AnimatePresence>
                        {isDatePickerOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="col-span-2 overflow-hidden"
                          >
                            <div className="mt-2 rounded-xl border border-iris-light/30 bg-mist/30 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <button
                                  type="button"
                                  onClick={() => setCalendarViewMonth((m) => subMonths(m, 1))}
                                  className="p-2 rounded-md hover:bg-white text-fog hover:text-brand-primary border border-iris-light/40 transition-colors"
                                >
                                  <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm font-semibold text-plum capitalize">
                                  {format(calendarViewMonth, 'MMMM yyyy', { locale: ptBR })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCalendarViewMonth((m) => addMonths(m, 1))}
                                  className="p-2 rounded-md hover:bg-white text-fog hover:text-brand-primary border border-iris-light/40 transition-colors"
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </div>
                              <div className="grid grid-cols-7 gap-0.5 mb-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-fog py-1">
                                    {d}
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-7 gap-0.5">
                                {eachDayOfInterval({
                                  start: startOfWeek(startOfMonth(calendarViewMonth)),
                                  end: endOfWeek(endOfMonth(calendarViewMonth)),
                                }).map((day) => {
                                  const isCurrentMonth = isSameMonth(day, calendarViewMonth);
                                  const selectedYMD = modalDate || '';
                                  const isSelected = selectedYMD && isSameDay(day, new Date(selectedYMD));
                                  const isTodayDay = isToday(day);
                                  return (
                                    <button
                                      key={day.toISOString()}
                                      type="button"
                                      onClick={() => {
                                        const ymd = format(day, 'yyyy-MM-dd');
                                        setModalDate(ymd);
                                        setModalDateDisplay(formatYMDToDDMMAAAA(ymd));
                                        setIsDatePickerOpen(false);
                                      }}
                                      className={`min-h-[36px] rounded-md text-sm font-medium transition-colors ${
                                        !isCurrentMonth ? 'text-fog/70 hover:bg-white/60' : 'text-plum'
                                      } ${isSelected ? 'bg-brand-primary text-white shadow-sm' : ''} ${
                                        isTodayDay && !isSelected ? 'bg-brand-primary/15 text-brand-primary font-bold' : ''
                                      } ${isCurrentMonth && !isSelected && !isTodayDay ? 'hover:bg-white' : ''}`}
                                    >
                                      {format(day, 'd')}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const today = new Date();
                                    const ymd = format(today, 'yyyy-MM-dd');
                                    setModalDate(ymd);
                                    setModalDateDisplay(formatYMDToDDMMAAAA(ymd));
                                    setCalendarViewMonth(today);
                                    setIsDatePickerOpen(false);
                                  }}
                                  className="flex-1 py-2 rounded-md border border-iris-light/40 text-dusk hover:bg-white hover:text-brand-primary font-semibold text-xs uppercase tracking-wider transition-colors"
                                >
                                  Hoje
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsDatePickerOpen(false)}
                                  className="px-4 py-2 rounded-md border border-iris-light/40 text-dusk hover:bg-white font-semibold text-xs uppercase tracking-wider transition-colors"
                                >
                                  Fechar
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-fog mb-2 ml-1">Status do Pagamento</label>
                      <div className="flex bg-mist p-1.5 rounded-md border border-iris-light/50">
                        <button 
                          type="button"
                          onClick={() => setModalStatus(PaymentStatus.PAID)}
                          className={`flex-1 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 ${modalStatus === PaymentStatus.PAID ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-dusk hover:text-plum'}`}
                        >
                          <CheckCircle2 size={14} /> Pago
                        </button>
                        <button 
                          type="button"
                          onClick={() => setModalStatus(PaymentStatus.PENDING)}
                          className={`flex-1 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 ${modalStatus === PaymentStatus.PENDING ? 'bg-white text-amber-700 shadow-sm border border-amber-200' : 'text-dusk hover:text-plum'}`}
                        >
                          <Clock size={14} /> Pendente
                        </button>
                        <button 
                          type="button"
                          onClick={() => setModalStatus(PaymentStatus.CANCELED)}
                          className={`flex-1 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 ${modalStatus === PaymentStatus.CANCELED ? 'bg-white text-rose-600 shadow-sm border border-rose-200' : 'text-dusk hover:text-plum'}`}
                        >
                          <XCircle size={14} /> Cancelado
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm py-3 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
                      {editingItem ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
