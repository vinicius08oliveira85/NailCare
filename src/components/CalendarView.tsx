import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Appointment, Client, Service, PaymentStatus } from '../types';

interface CalendarViewProps {
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  onEdit: (app: Appointment) => void;
  onDelete: (id: string) => void;
  onAdd: (date: Date) => void;
  onUpdateStatus: (id: string, status: PaymentStatus) => void;
  formatCurrency: (value: number) => string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  appointments, 
  clients, 
  services, 
  onEdit, 
  onDelete, 
  onAdd,
  onUpdateStatus,
  formatCurrency
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-3xl font-medium text-brand-accent capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-3 hover:bg-brand-bg rounded-xl transition-colors text-stone-400 hover:text-brand-primary border border-stone-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 hover:bg-brand-bg rounded-xl transition-colors text-stone-500 font-bold text-xs uppercase tracking-widest border border-stone-100"
          >
            Hoje
          </button>
          <button 
            onClick={nextMonth}
            className="p-3 hover:bg-brand-bg rounded-xl transition-colors text-stone-400 hover:text-brand-primary border border-stone-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const rows = [];
    let days = [];

    calendarDays.forEach((day, i) => {
      const dayAppointments = appointments.filter(app => isSameDay(parseISO(app.date), day));
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = isSameDay(day, selectedDate);
      const isTodayDay = isToday(day);

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[120px] p-2 border border-stone-50 transition-all cursor-pointer relative group ${
            !isCurrentMonth ? 'bg-stone-50/30 text-stone-300' : 'bg-white text-stone-800'
          } ${isSelected ? 'ring-2 ring-brand-primary ring-inset z-10' : 'hover:bg-brand-bg/20'}`}
          onClick={() => setSelectedDate(day)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              isTodayDay ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : ''
            }`}>
              {format(day, 'd')}
            </span>
            {dayAppointments.length > 0 && (
              <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-md">
                {dayAppointments.length}
              </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1 overflow-hidden">
            {dayAppointments.slice(0, 3).map(app => (
              <div 
                key={app.id}
                className={`text-[9px] px-2 py-1 rounded-md truncate font-bold border ${
                  app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-700 border-rose-100' :
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {format(parseISO(app.date), 'HH:mm')} {app.clientName || clients.find(c => c.id === app.clientId)?.name || 'Excluído'}
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="text-[9px] text-stone-400 font-bold px-2">
                + {dayAppointments.length - 3} mais
              </div>
            )}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onAdd(day); }}
            className="absolute bottom-2 right-2 p-1.5 bg-brand-primary text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <Plus size={12} />
          </button>
        </div>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(
          <div className="grid grid-cols-7" key={day.toString()}>
            {days}
          </div>
        );
        days = [];
      }
    });

    return <div className="border border-stone-100 rounded-[32px] overflow-hidden shadow-sm bg-white">{rows}</div>;
  };

  const renderSelectedDayDetails = () => {
    const dayAppointments = appointments
      .filter(app => isSameDay(parseISO(app.date), selectedDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="mt-10 space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="text-2xl font-medium text-brand-accent">
            Atendimentos de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h4>
          <button 
            onClick={() => onAdd(selectedDate)}
            className="bg-brand-primary text-white px-6 py-3 rounded-2xl shadow-lg shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 transition-all text-sm font-bold"
          >
            <Plus size={18} /> Novo Horário
          </button>
        </div>

        {dayAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dayAppointments.map(app => {
              const client = clients.find(c => c.id === app.clientId);
              const service = services.find(s => s.id === app.serviceId);
              return (
                <div key={app.id} className="glass-card p-6 flex flex-col justify-between group hover:border-brand-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-bg rounded-2xl flex flex-col items-center justify-center text-brand-primary">
                        <Clock size={16} />
                        <span className="text-xs font-bold">{format(parseISO(app.date), 'HH:mm')}</span>
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">{app.clientName || client?.name || 'Excluído'}</p>
                        <p className="text-xs text-stone-400 font-medium">{service?.name || 'Serviço Excluído'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEdit(app)}
                        className="p-2 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(app.id)}
                        className="p-2 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-stone-50">
                    <span className="text-sm font-bold text-brand-accent">{formatCurrency(service?.price || 0)}</span>
                    <div className="flex gap-1 bg-brand-bg p-1 rounded-xl">
                      <button 
                        onClick={() => onUpdateStatus(app.id, PaymentStatus.PAID)}
                        className={`p-1.5 rounded-lg transition-all ${app.status === PaymentStatus.PAID ? 'bg-emerald-500 text-white shadow-md' : 'text-stone-400 hover:text-emerald-500'}`}
                        title="Pago"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(app.id, PaymentStatus.PENDING)}
                        className={`p-1.5 rounded-lg transition-all ${app.status === PaymentStatus.PENDING ? 'bg-amber-500 text-white shadow-md' : 'text-stone-400 hover:text-amber-500'}`}
                        title="Pendente"
                      >
                        <Clock size={14} />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(app.id, PaymentStatus.CANCELED)}
                        className={`p-1.5 rounded-lg transition-all ${app.status === PaymentStatus.CANCELED ? 'bg-rose-500 text-white shadow-md' : 'text-stone-400 hover:text-rose-500'}`}
                        title="Cancelado"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center glass-card">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-200">
              <Clock size={32} />
            </div>
            <p className="text-stone-400 font-serif italic">Nenhum atendimento para este dia.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderSelectedDayDetails()}
    </div>
  );
};
