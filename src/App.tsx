/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  Scissors, 
  LayoutDashboard, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Phone,
  DollarSign,
  ChevronRight,
  Trash2,
  Edit2,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Service, Appointment, PaymentStatus } from './types.ts';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Fallback for randomUUID
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

export default function App() {
  // State
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('nailcare_clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('nailcare_services');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Manicure', price: 35 },
      { id: '2', name: 'Pedicure', price: 40 },
      { id: '3', name: 'Combo (Mão e Pé)', price: 70 }
    ];
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('nailcare_appointments');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'clients' | 'services' | 'reports'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'appointment' | 'client' | 'service'>('appointment');
  const [modalStatus, setModalStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
  const [modalDate, setModalDate] = useState<string>(''); // YYYY-MM-DD
  const [modalTime, setModalTime] = useState<string>(''); // HH:mm
  const [clientMode, setClientMode] = useState<'existing' | 'new' | 'quick'>('existing');
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const [historyServiceId, setHistoryServiceId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Client | Service | Appointment | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('nailcare_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('nailcare_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('nailcare_appointments', JSON.stringify(appointments));
  }, [appointments]);

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
          return acc + (service?.price || 0);
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
      const date = item?.date ? new Date(item.date) : new Date();
      setModalDate(date.toISOString().split('T')[0]);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setModalTime(`${hours}:${minutes}`);
    }
    setIsModalOpen(true);
  };

  const addClient = (name: string, phone: string) => {
    if (editingItem && 'phone' in editingItem) {
      setClients(clients.map(c => c.id === editingItem.id ? { ...c, name, phone } : c));
    } else {
      const newClient: Client = { id: generateId(), name, phone };
      setClients([...clients, newClient]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const addService = (name: string, price: number) => {
    if (editingItem && 'price' in editingItem) {
      setServices(services.map(s => s.id === editingItem.id ? { ...s, name, price } : s));
    } else {
      const newService: Service = { id: generateId(), name, price };
      setServices([...services, newService]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const addAppointment = (clientId: string | undefined, clientName: string | undefined, serviceId: string, status: PaymentStatus) => {
    // Combine date and time
    const combinedDate = new Date(`${modalDate}T${modalTime}`);
    const finalDate = combinedDate.toISOString();

    if (editingItem && 'status' in editingItem) {
      setAppointments(appointments.map(a => a.id === editingItem.id ? { ...a, clientId, clientName, serviceId, date: finalDate, status } : a));
    } else {
      const newApp: Appointment = {
        id: generateId(),
        clientId,
        clientName,
        serviceId,
        date: finalDate,
        status
      };
      setAppointments([...appointments, newApp]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const updateAppointmentStatus = (id: string, status: PaymentStatus) => {
    setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteItem = (type: 'client' | 'service' | 'appointment', id: string) => {
    if (type === 'client') setClients(clients.filter(c => c.id !== id));
    if (type === 'service') setServices(services.filter(s => s.id !== id));
    if (type === 'appointment') setAppointments(appointments.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-brand-bg/20 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-stone-100 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shadow-sm">
            <Scissors size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-brand-accent">NailCare</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-stone-500 hover:bg-brand-bg rounded-xl transition-colors"
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
            className="md:hidden fixed inset-0 top-[73px] z-40 bg-white/80 backdrop-blur-md p-6"
          >
            <div className="bg-white rounded-[32px] shadow-2xl shadow-brand-primary/10 border border-stone-100 p-6 space-y-2">
              <button 
                onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg'}`}
              >
                <LayoutDashboard size={22} />
                <span className="font-bold text-lg">Início</span>
              </button>
              <button 
                onClick={() => { setActiveTab('agenda'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 ${activeTab === 'agenda' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg'}`}
              >
                <Calendar size={22} />
                <span className="font-bold text-lg">Agenda</span>
              </button>
              <button 
                onClick={() => { setActiveTab('clients'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 ${activeTab === 'clients' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg'}`}
              >
                <Users size={22} />
                <span className="font-bold text-lg">Clientes</span>
              </button>
              <button 
                onClick={() => { setActiveTab('services'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 ${activeTab === 'services' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg'}`}
              >
                <Scissors size={22} />
                <span className="font-bold text-lg">Serviços</span>
              </button>
              <button 
                onClick={() => { setActiveTab('reports'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 ${activeTab === 'reports' ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg'}`}
              >
                <BarChart3 size={22} />
                <span className="font-bold text-lg">Relatórios</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) */}
      <nav className="hidden md:flex w-72 bg-white border-r border-stone-100 p-8 flex-col gap-10 sticky top-0 h-screen">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shadow-sm">
            <Scissors size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-accent">NailCare</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">Manager</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg hover:text-brand-primary'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-semibold">Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'agenda' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg hover:text-brand-primary'}`}
          >
            <Calendar size={20} />
            <span className="font-semibold">Agenda</span>
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'clients' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg hover:text-brand-primary'}`}
          >
            <Users size={20} />
            <span className="font-semibold">Clientes</span>
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'services' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg hover:text-brand-primary'}`}
          >
            <Scissors size={20} />
            <span className="font-semibold">Serviços</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'reports' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-stone-500 hover:bg-brand-bg hover:text-brand-primary'}`}
          >
            <BarChart3 size={20} />
            <span className="font-semibold">Relatórios</span>
          </button>
        </div>

        <div className="mt-auto pt-8 border-t border-stone-50">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-4">Próximo Horário</p>
          {stats.nextAppointment ? (
            <div 
              onClick={() => handleOpenModal('appointment', stats.nextAppointment)}
              className="p-4 bg-brand-bg rounded-2xl border border-brand-secondary/10 cursor-pointer hover:border-brand-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-brand-accent">
                    {stats.nextAppointment?.clientName || clients.find(c => c.id === stats.nextAppointment?.clientId)?.name || 'Excluído'}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1 font-medium">
                    {new Date(stats.nextAppointment.date).toLocaleDateString('pt-BR')} • {new Date(stats.nextAppointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Edit2 size={12} className="text-stone-300 group-hover:text-brand-primary transition-colors" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic">Nenhum agendado</p>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
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
                <h2 className="text-5xl font-medium text-brand-accent">Olá, bem-vinda</h2>
                <p className="text-stone-400 mt-3 text-lg font-serif italic">Seu dia está florescendo. Veja o resumo de hoje.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-card p-8 flex flex-col gap-3 group hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-500">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">Lucro do Dia</span>
                  <span className="text-4xl font-light tracking-tight text-stone-800">{formatCurrency(stats.today)}</span>
                </div>
                <div className="glass-card p-8 flex flex-col gap-3 group hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-500">
                  <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">Lucro da Semana</span>
                  <span className="text-4xl font-light tracking-tight text-stone-800">{formatCurrency(stats.week)}</span>
                </div>
                <div className="glass-card p-8 flex flex-col gap-3 group hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-500">
                  <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center">
                    <LayoutDashboard size={20} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">Lucro do Mês</span>
                  <span className="text-4xl font-light tracking-tight text-stone-800">{formatCurrency(stats.month)}</span>
                </div>
              </div>

              <section className="glass-card overflow-hidden">
                <div className="p-8 border-b border-stone-50 flex justify-between items-center">
                  <h3 className="text-2xl font-medium text-brand-accent">Próximos Atendimentos</h3>
                  <button 
                    onClick={() => handleOpenModal('appointment')}
                    className="text-brand-primary hover:text-brand-accent transition-colors text-sm font-bold flex items-center gap-2"
                  >
                    <Plus size={18} /> Novo Agendamento
                  </button>
                </div>
                <div className="divide-y divide-stone-50">
                  {appointments
                    .filter(a => new Date(a.date) >= new Date())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 5)
                    .map(app => (
                      <div 
                        key={app.id} 
                        onClick={() => handleOpenModal('appointment', app)}
                        className="p-6 flex items-center justify-between hover:bg-brand-bg/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-white border border-stone-100 rounded-2xl flex flex-col items-center justify-center text-brand-primary shadow-sm group-hover:shadow-md transition-all">
                            <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(app.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                            <span className="text-xl font-bold leading-none mt-1">{new Date(app.date).getDate()}</span>
                          </div>
                          <div>
                            <p className="font-bold text-lg text-stone-800">
                              {app.clientName || clients.find(c => c.id === app.clientId)?.name || 'Excluído'}
                            </p>
                            <p className="text-sm text-stone-400 font-medium mt-1">
                              {services.find(s => s.id === app.serviceId)?.name} • {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-[0.15em] ${
                            app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {app.status}
                          </span>
                          <div className="flex gap-2 transition-all">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal('appointment', app); }}
                              className="p-2.5 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteItem('appointment', app.id); }}
                              className="p-2.5 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
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
                      <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                        <Calendar size={32} />
                      </div>
                      <p className="text-stone-400 font-serif italic">Nenhum agendamento futuro encontrado.</p>
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
              <div className="flex justify-between items-end">
                <header>
                  <h2 className="text-5xl font-medium text-brand-accent">Agenda</h2>
                  <p className="text-stone-400 mt-2 text-lg font-serif italic">Seu fluxo de trabalho organizado.</p>
                </header>
                <button 
                  onClick={() => handleOpenModal('appointment')}
                  className="bg-brand-primary text-white px-8 py-4 rounded-2xl shadow-xl shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 transition-all font-bold"
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
              <div className="flex justify-between items-end">
                <header>
                  <h2 className="text-5xl font-medium text-brand-accent">Clientes</h2>
                  <p className="text-stone-400 mt-2 text-lg font-serif italic">Sua base de contatos fiel.</p>
                </header>
                <button 
                  onClick={() => handleOpenModal('client')}
                  className="bg-brand-primary text-white px-8 py-4 rounded-2xl shadow-xl shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 transition-all font-bold"
                >
                  <Plus size={20} /> Novo Cliente
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(client => (
                  <div key={client.id} className="glass-card p-8 flex justify-between items-start group hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-500">
                    <div>
                      <h4 className="text-xl font-bold text-stone-800">{client.name}</h4>
                      <div className="flex items-center gap-3 text-stone-400 mt-3 font-medium">
                        <div className="w-8 h-8 bg-brand-bg rounded-lg flex items-center justify-center text-brand-primary">
                          <Phone size={14} />
                        </div>
                        <span className="text-sm">{client.phone}</span>
                      </div>
                    </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setHistoryClientId(client.id)}
                          className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm"
                          title="Ver Histórico"
                        >
                          <Clock size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenModal('client', client)}
                          className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteItem('client', client.id)}
                          className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="col-span-full p-32 text-center border-2 border-dashed border-stone-100 rounded-[2.5rem]">
                    <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-200">
                      <Users size={40} />
                    </div>
                    <p className="text-stone-400 font-serif italic text-lg">Nenhum cliente cadastrado ainda.</p>
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
              <div className="flex justify-between items-end">
                <header>
                  <h2 className="text-5xl font-medium text-brand-accent">Serviços</h2>
                  <p className="text-stone-400 mt-2 text-lg font-serif italic">Seu cardápio de beleza.</p>
                </header>
                <button 
                  onClick={() => handleOpenModal('service')}
                  className="bg-brand-primary text-white px-8 py-4 rounded-2xl shadow-xl shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 transition-all font-bold"
                >
                  <Plus size={20} /> Novo Serviço
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <div key={service.id} className="glass-card p-8 flex justify-between items-center group hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-500">
                    <div>
                      <h4 className="text-xl font-bold text-stone-800">{service.name}</h4>
                      <div className="flex items-center gap-2 text-brand-primary mt-2 font-bold text-lg">
                        <span>{formatCurrency(service.price)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setHistoryServiceId(service.id)}
                        className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm"
                        title="Ver Histórico"
                      >
                        <Clock size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal('service', service)}
                        className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteItem('service', service.id)}
                        className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
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
                <h2 className="text-5xl font-medium text-brand-accent">Relatórios</h2>
                <p className="text-stone-400 mt-2 text-lg font-serif italic">Analise o desempenho do seu negócio.</p>
              </header>

              <ReportsView 
                appointments={appointments}
                services={services}
                formatCurrency={formatCurrency}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-3xl font-medium text-brand-accent">Histórico de Atendimentos</h3>
                    <p className="text-stone-400 font-serif italic mt-1">
                      {clients.find(c => c.id === historyClientId)?.name}
                    </p>
                  </div>
                  <button 
                    onClick={() => setHistoryClientId(null)}
                    className="p-3 bg-brand-bg rounded-2xl text-stone-400 hover:text-stone-600 transition-all"
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
                        <div key={app.id} className="p-6 bg-brand-bg rounded-3xl border border-stone-100 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-stone-800 text-lg">{service?.name || 'Serviço Excluído'}</p>
                            <p className="text-sm text-stone-500 font-medium mt-1">
                              {new Date(app.date).toLocaleDateString('pt-BR')} às {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-brand-accent">{formatCurrency(service?.price || 0)}</span>
                            <span className={`text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
                              app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {appointments.filter(a => a.clientId === historyClientId).length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-stone-400 font-serif italic">Nenhum atendimento encontrado para este cliente.</p>
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
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-3xl font-medium text-brand-accent">Histórico do Serviço</h3>
                    <p className="text-stone-400 font-serif italic mt-1">
                      {services.find(s => s.id === historyServiceId)?.name}
                    </p>
                  </div>
                  <button 
                    onClick={() => setHistoryServiceId(null)}
                    className="p-3 bg-brand-bg rounded-2xl text-stone-400 hover:text-stone-600 transition-all"
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
                        <div key={app.id} className="p-6 bg-brand-bg rounded-3xl border border-stone-100 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-stone-800 text-lg">
                              {app.clientName || client?.name || 'Cliente Excluído'}
                            </p>
                            <p className="text-sm text-stone-500 font-medium mt-1">
                              {new Date(app.date).toLocaleDateString('pt-BR')} às {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
                              app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {appointments.filter(a => a.serviceId === historyServiceId).length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-stone-400 font-serif italic">Nenhum atendimento encontrado para este serviço.</p>
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
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <h3 className="text-3xl font-medium text-brand-accent mb-8">
                  {modalType === 'appointment' && (editingItem ? 'Editar Agendamento' : 'Novo Agendamento')}
                  {modalType === 'client' && (editingItem ? 'Editar Cliente' : 'Cadastrar Cliente')}
                  {modalType === 'service' && (editingItem ? 'Editar Serviço' : 'Cadastrar Serviço')}
                </h3>

                {modalType === 'client' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addClient(formData.get('name') as string, formData.get('phone') as string);
                  }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Nome Completo</label>
                      <input name="name" defaultValue={(editingItem as Client)?.name} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="Ex: Maria Silva" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Telefone</label>
                      <input name="phone" defaultValue={(editingItem as Client)?.phone} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="(11) 99999-9999" />
                    </div>
                    <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold mt-6 shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
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
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Nome do Serviço</label>
                      <input name="name" defaultValue={(editingItem as Service)?.name} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="Ex: Esmaltação em Gel" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Valor (R$)</label>
                      <input name="price" type="number" step="0.01" defaultValue={(editingItem as Service)?.price} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="0,00" />
                    </div>
                    <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold mt-6 shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {editingItem ? 'Salvar Alterações' : 'Salvar Serviço'}
                    </button>
                  </form>
                )}

                {modalType === 'appointment' && (
                  <form onSubmit={(e) => {
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
                      const newClient: Client = { id: generateId(), name, phone };
                      setClients(prev => [...prev, newClient]);
                      finalClientId = newClient.id;
                    }

                    addAppointment(
                      finalClientId,
                      finalClientName,
                      formData.get('serviceId') as string,
                      modalStatus
                    );
                  }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Opção de Cliente</label>
                      <div className="flex bg-brand-bg p-1.5 rounded-[1.5rem] border border-stone-100 mb-4">
                        <button 
                          type="button"
                          onClick={() => setClientMode('existing')}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${clientMode === 'existing' ? 'bg-white text-brand-primary shadow-lg shadow-brand-primary/10' : 'text-stone-400 hover:text-stone-500'}`}
                        >
                          Existente
                        </button>
                        <button 
                          type="button"
                          onClick={() => setClientMode('new')}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${clientMode === 'new' ? 'bg-white text-brand-primary shadow-lg shadow-brand-primary/10' : 'text-stone-400 hover:text-stone-500'}`}
                        >
                          Cadastrar
                        </button>
                        <button 
                          type="button"
                          onClick={() => setClientMode('quick')}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${clientMode === 'quick' ? 'bg-white text-brand-primary shadow-lg shadow-brand-primary/10' : 'text-stone-400 hover:text-stone-500'}`}
                        >
                          Apenas Nome
                        </button>
                      </div>

                      {clientMode === 'existing' && (
                        <select name="clientId" defaultValue={(editingItem as Appointment)?.clientId} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all appearance-none cursor-pointer">
                          <option value="">Selecione um cliente</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}

                      {clientMode === 'new' && (
                        <div className="space-y-4">
                          <input name="newName" required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="Nome Completo" />
                          <input name="newPhone" required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="Telefone" />
                        </div>
                      )}

                      {clientMode === 'quick' && (
                        <input name="quickName" defaultValue={(editingItem as Appointment)?.clientName} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" placeholder="Nome do Cliente" />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Serviço</label>
                      <select name="serviceId" defaultValue={(editingItem as Appointment)?.serviceId} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all appearance-none cursor-pointer">
                        <option value="">Selecione um serviço</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price)})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Data</label>
                        <input 
                          type="date" 
                          value={modalDate}
                          onChange={(e) => setModalDate(e.target.value)}
                          required 
                          className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Hora</label>
                        <input 
                          type="time" 
                          value={modalTime}
                          onChange={(e) => setModalTime(e.target.value)}
                          required 
                          className="w-full px-6 py-4 rounded-2xl bg-brand-bg border border-stone-100 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 ml-1">Status do Pagamento</label>
                      <div className="flex bg-brand-bg p-1.5 rounded-[1.5rem] border border-stone-100">
                        <button 
                          type="button"
                          onClick={() => setModalStatus(PaymentStatus.PAID)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${modalStatus === PaymentStatus.PAID ? 'bg-white text-emerald-600 shadow-lg shadow-emerald-100' : 'text-stone-400 hover:text-stone-500'}`}
                        >
                          <CheckCircle2 size={14} /> Pago
                        </button>
                        <button 
                          type="button"
                          onClick={() => setModalStatus(PaymentStatus.PENDING)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${modalStatus === PaymentStatus.PENDING ? 'bg-white text-amber-600 shadow-lg shadow-amber-100' : 'text-stone-400 hover:text-stone-500'}`}
                        >
                          <Clock size={14} /> Pendente
                        </button>
                        <button 
                          type="button"
                          onClick={() => setModalStatus(PaymentStatus.CANCELED)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${modalStatus === PaymentStatus.CANCELED ? 'bg-white text-rose-600 shadow-lg shadow-rose-100' : 'text-stone-400 hover:text-stone-500'}`}
                        >
                          <XCircle size={14} /> Cancelado
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold mt-6 shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
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
