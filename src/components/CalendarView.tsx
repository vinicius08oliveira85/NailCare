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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-3xl font-sans font-medium text-plum capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-3 hover:bg-mist rounded-md transition-colors duration-150 text-fog hover:text-brand-primary border border-iris-light/40"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 hover:bg-mist rounded-md transition-colors duration-150 text-dusk font-semibold text-xs uppercase tracking-widest border border-iris-light/40"
          >
            Hoje
          </button>
          <button 
            onClick={nextMonth}
            className="p-3 hover:bg-mist rounded-md transition-colors duration-150 text-fog hover:text-brand-primary border border-iris-light/40"
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
          <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-widest text-fog py-2">
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
          className={`min-h-[120px] p-2 border border-iris-light/30 transition-all duration-150 cursor-pointer relative group ${
            !isCurrentMonth ? 'bg-mist/50 text-fog' : 'bg-white text-plum'
          } ${isSelected ? 'ring-2 ring-brand-primary ring-inset z-10' : 'hover:bg-mist/60'}`}
          onClick={() => setSelectedDate(day)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              isTodayDay ? 'bg-brand-primary text-white shadow-[var(--shadow-raised)]' : ''
            }`}>
              {format(day, 'd')}
            </span>
            {dayAppointments.length > 0 && (
              <span className="text-[10px] font-semibold bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-md">
                {dayAppointments.length}
              </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1 overflow-hidden">
            {dayAppointments.slice(0, 3).map(app => (
              <div 
                key={app.id}
                className={`text-[9px] px-2 py-1 rounded-full truncate font-semibold border ${
                  app.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  app.status === PaymentStatus.CANCELED ? 'bg-rose-50 text-rose-700 border-rose-100' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {format(parseISO(app.date), 'HH:mm')} {app.clientName || clients.find(c => c.id === app.clientId)?.name || 'Excluído'}
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="text-[9px] text-fog font-semibold px-2">
                + {dayAppointments.length - 3} mais
              </div>
            )}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onAdd(day); }}
            className="absolute bottom-2 right-2 p-1.5 bg-brand-primary text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg active:scale-[0.97]"
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

    return <div className="border border-iris-light/30 rounded-3xl overflow-hidden bg-white" style={{ boxShadow: 'var(--shadow-card)' }}>{rows}</div>;
  };

  const renderSelectedDayDetails = () => {
    const dayAppointments = appointments
      .filter(app => isSameDay(parseISO(app.date), selectedDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="mt-10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h4 className="text-2xl font-sans font-medium text-plum">
            Atendimentos de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h4>
          <button 
            onClick={() => onAdd(selectedDate)}
            className="inline-flex items-center gap-2 bg-brand-primary hover:bg-iris-dark text-white font-semibold text-sm px-5 py-2.5 rounded-md shadow-[0_2px_8px_0_rgb(157_139_181/0.35)] hover:shadow-[0_4px_16px_0_rgb(157_139_181/0.45)] active:scale-[0.98] transition-all duration-150"
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
                <div key={app.id} className="glass-card p-6 flex flex-col justify-between group hover:border-brand-primary/30 transition-all duration-150 border border-iris-light/30 rounded-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-mist rounded-xl flex flex-col items-center justify-center text-brand-primary">
                        <Clock size={16} />
                        <span className="text-xs font-bold">{format(parseISO(app.date), 'HH:mm')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-plum">{app.clientName || client?.name || 'Excluído'}</p>
                        <p className="text-xs text-dusk font-medium">{service?.name || 'Serviço Excluído'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEdit(app)}
                        className="p-2 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-brand-primary hover:bg-iris-light/20 active:scale-[0.97] transition-all duration-150 shadow-sm"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(app.id)}
                        className="p-2 bg-white border border-iris-light/40 rounded-md text-dusk hover:text-rose-500 hover:border-rose-200 active:scale-[0.97] transition-all duration-150 shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-iris-light/20">
                    <span className="text-sm font-bold text-brand-accent">{formatCurrency(service?.price || 0)}</span>
                    <div className="flex gap-1 bg-mist p-1 rounded-md">
                      <button 
                        onClick={() => onUpdateStatus(app.id, PaymentStatus.PAID)}
                        className={`p-1.5 rounded-md transition-all duration-150 ${app.status === PaymentStatus.PAID ? 'bg-emerald-500 text-white shadow-sm' : 'text-fog hover:text-emerald-500'}`}
                        title="Pago"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(app.id, PaymentStatus.PENDING)}
                        className={`p-1.5 rounded-md transition-all duration-150 ${app.status === PaymentStatus.PENDING ? 'bg-amber-500 text-white shadow-sm' : 'text-fog hover:text-amber-500'}`}
                        title="Pendente"
                      >
                        <Clock size={14} />
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(app.id, PaymentStatus.CANCELED)}
                        className={`p-1.5 rounded-md transition-all duration-150 ${app.status === PaymentStatus.CANCELED ? 'bg-rose-500 text-white shadow-sm' : 'text-fog hover:text-rose-500'}`}
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
          <div className="p-16 text-center glass-card border border-iris-light/30 rounded-xl">
            <div className="w-16 h-16 bg-mist rounded-full flex items-center justify-center mx-auto mb-4 text-fog">
              <Clock size={32} />
            </div>
            <p className="text-dusk font-sans italic">Nenhum atendimento para este dia.</p>
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
