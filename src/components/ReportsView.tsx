import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Filter, 
  Calendar as CalendarIcon, 
  Scissors, 
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  isWithinInterval, 
  parseISO,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
  subMonths,
  isSameDay,
  isSameMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, Service, PaymentStatus } from '../types';

interface ReportsViewProps {
  appointments: Appointment[];
  services: Service[];
  formatCurrency: (value: number) => string;
}

type PeriodType = 'week' | 'month' | 'year' | 'all';

export const ReportsView: React.FC<ReportsViewProps> = ({ appointments, services, formatCurrency }) => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');

  // Filtered appointments based on period and service
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    let interval: { start: Date; end: Date } | null = null;

    if (period === 'week') {
      interval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    } else if (period === 'month') {
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
    } else if (period === 'year') {
      interval = { start: startOfYear(now), end: endOfYear(now) };
    }

    return appointments.filter(app => {
      const appDate = parseISO(app.date);
      const matchesPeriod = interval ? isWithinInterval(appDate, interval) : true;
      const matchesService = selectedServiceId === 'all' || app.serviceId === selectedServiceId;
      const isPaid = app.status === PaymentStatus.PAID;
      return matchesPeriod && matchesService && isPaid;
    });
  }, [appointments, period, selectedServiceId]);

  // Total Profit
  const totalProfit = useMemo(() => {
    return filteredAppointments.reduce((acc, app) => {
      const service = services.find(s => s.id === app.serviceId);
      return acc + (service?.price || 0) + (app.travelFee ?? 0);
    }, 0);
  }, [filteredAppointments, services]);

  // Data for Profit by Service Chart
  const serviceData = useMemo(() => {
    const data: Record<string, { name: string; value: number }> = {};
    
    filteredAppointments.forEach(app => {
      const service = services.find(s => s.id === app.serviceId);
      if (service) {
        if (!data[service.id]) {
          data[service.id] = { name: service.name, value: 0 };
        }
        data[service.id].value += service.price + (app.travelFee ?? 0);
      }
    });

    return Object.values(data).sort((a, b) => b.value - a.value);
  }, [filteredAppointments, services]);

  // Data for Profit Over Time Chart
  const timeData = useMemo(() => {
    const now = new Date();
    
    if (period === 'week') {
      const days = eachDayOfInterval({
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 })
      });
      return days.map(day => {
        const dayProfit = filteredAppointments
          .filter(app => isSameDay(parseISO(app.date), day))
          .reduce((acc, app) => {
            const s = services.find(srv => srv.id === app.serviceId);
            return acc + (s?.price || 0) + (app.travelFee ?? 0);
          }, 0);
        return {
          label: format(day, 'EEE', { locale: ptBR }),
          profit: dayProfit
        };
      });
    }

    if (period === 'month' || period === 'all') {
      // Show last 30 days or current month
      const start = period === 'month' ? startOfMonth(now) : subMonths(now, 5);
      const end = period === 'month' ? endOfMonth(now) : endOfMonth(now);
      
      if (period === 'month') {
        const days = eachDayOfInterval({ start, end });
        return days.map(day => {
          const dayProfit = filteredAppointments
            .filter(app => isSameDay(parseISO(app.date), day))
            .reduce((acc, app) => {
              const s = services.find(srv => srv.id === app.serviceId);
              return acc + (s?.price || 0) + (app.travelFee ?? 0);
            }, 0);
          return {
            label: format(day, 'dd/MM'),
            profit: dayProfit
          };
        });
      } else {
        const months = eachMonthOfInterval({ start, end });
        return months.map(month => {
          const monthProfit = filteredAppointments
            .filter(app => isSameMonth(parseISO(app.date), month))
            .reduce((acc, app) => {
              const s = services.find(srv => srv.id === app.serviceId);
              return acc + (s?.price || 0) + (app.travelFee ?? 0);
            }, 0);
          return {
            label: format(month, 'MMM', { locale: ptBR }),
            profit: monthProfit
          };
        });
      }
    }

    if (period === 'year') {
      const months = eachMonthOfInterval({
        start: startOfYear(now),
        end: endOfYear(now)
      });
      return months.map(month => {
        const monthProfit = filteredAppointments
          .filter(app => isSameMonth(parseISO(app.date), month))
          .reduce((acc, app) => {
            const s = services.find(srv => srv.id === app.serviceId);
            return acc + (s?.price || 0);
          }, 0);
        return {
          label: format(month, 'MMM', { locale: ptBR }),
          profit: monthProfit
        };
      });
    }

    return [];
  }, [filteredAppointments, period, services]);

  const COLORS = ['#9D8BB5', '#141414', '#E4E3E0', '#8E9299', '#5A5A40'];

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-6 rounded-lg border border-iris-light/40 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-mist rounded-xl text-brand-primary">
            <Filter size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-plum">Filtros</h3>
            <p className="text-xs text-fog font-medium">Refine sua análise</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-mist p-1 rounded-md border border-iris-light/40">
            {(['week', 'month', 'year', 'all'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors duration-150 ${
                  period === p 
                    ? 'bg-white text-brand-primary shadow-sm' 
                    : 'text-dusk hover:text-plum'
                }`}
              >
                {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : 'Tudo'}
              </button>
            ))}
          </div>

          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="bg-mist border border-iris-light/50 rounded-md px-4 py-2 text-xs font-semibold text-plum focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-150"
          >
            <option value="all">Todos os Serviços</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 border-l-4 border-l-brand-primary rounded-lg border border-iris-light/40 hover:shadow-[var(--shadow-raised)] transition-shadow duration-200" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-fog text-xs font-semibold uppercase tracking-widest mb-1">Lucro Total</p>
          <h4 className="text-3xl font-sans font-bold text-plum tabular-nums">{formatCurrency(totalProfit)}</h4>
          <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> Baseado em pagamentos confirmados
          </p>
        </div>

        <div className="glass-card p-8 border-l-4 border-l-plum rounded-lg border border-iris-light/40 hover:shadow-[var(--shadow-raised)] transition-shadow duration-200" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-mist rounded-xl text-plum">
              <Scissors size={24} />
            </div>
          </div>
          <p className="text-fog text-xs font-semibold uppercase tracking-widest mb-1">Atendimentos</p>
          <h4 className="text-3xl font-sans font-bold text-plum tabular-nums">{filteredAppointments.length}</h4>
          <p className="text-xs text-dusk font-medium mt-2">No período selecionado</p>
        </div>

        <div className="glass-card p-8 border-l-4 border-l-iris-light rounded-lg border border-iris-light/40 hover:shadow-[var(--shadow-raised)] transition-shadow duration-200" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-mist rounded-xl text-fog">
              <CalendarIcon size={24} />
            </div>
          </div>
          <p className="text-fog text-xs font-semibold uppercase tracking-widest mb-1">Período</p>
          <h4 className="text-3xl font-sans font-bold text-plum capitalize">{period === 'all' ? 'Histórico' : period}</h4>
          <p className="text-xs text-dusk font-medium mt-2">Filtro ativo</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profit Over Time */}
        <div className="glass-card p-8 rounded-lg border border-iris-light/40" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-mist rounded-xl text-brand-primary">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-lg font-semibold text-plum">Evolução do Lucro</h3>
          </div>
          <div className="w-full min-w-0 h-[300px] min-h-[300px]" style={{ minWidth: 0, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#8E9299' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#8E9299' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#9D8BB5" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#9D8BB5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit by Service */}
        <div className="glass-card p-8 rounded-lg border border-iris-light/40" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-mist rounded-xl text-brand-primary">
              <PieChartIcon size={18} />
            </div>
            <h3 className="text-lg font-semibold text-plum">Lucro por Serviço</h3>
          </div>
          <div className="w-full min-w-0 h-[300px] min-h-[300px]" style={{ minWidth: 0, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <BarChart data={serviceData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#8E9299', width: 100 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8f8f8' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="glass-card overflow-hidden rounded-lg border border-iris-light/40" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-6 py-5 border-b border-iris-light/40">
          <h3 className="text-lg font-semibold text-plum">Detalhamento de Receitas</h3>
          <p className="text-xs text-fog font-medium mt-0.5">Lista de atendimentos pagos no período</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-mist border-y border-iris-light/40">
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest text-fog font-semibold">Data</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest text-fog font-semibold">Cliente</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest text-fog font-semibold">Serviço</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest text-fog font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((app) => {
                    const service = services.find(s => s.id === app.serviceId);
                    return (
                      <tr key={app.id} className="border-b border-iris-light/20 hover:bg-mist/60 transition-colors duration-100">
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-plum">{format(parseISO(app.date), 'dd/MM/yyyy')}</div>
                          <div className="text-[10px] text-dusk font-semibold">{format(parseISO(app.date), 'HH:mm')}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-semibold text-plum">{app.clientName || 'Cliente'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-sm text-dusk">{service?.name || 'Serviço'}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="text-sm font-bold text-brand-accent tabular-nums">{formatCurrency((service?.price || 0) + (app.travelFee ?? 0))}</div>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-dusk font-sans italic">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
