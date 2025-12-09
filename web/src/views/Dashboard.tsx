import React, { useEffect, useState } from 'react';
import { MessageCircle, Users, Zap, Activity, ArrowUpRight, ArrowDownRight, Loader2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tenantApi, statsApi, DashboardStats, ChartData, RecentAppointment } from '../services/api';

interface StatCardProps {
  title: string;
  value: string | number;
  trend: 'up' | 'down';
  trendValue: string;
  icon: React.ElementType;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendValue, icon: Icon, loading }) => (
  <div className="bg-surface border border-white/5 rounded-lg p-5 hover:border-white/10 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-900 rounded-md border border-white/5 text-zinc-400 group-hover:text-primary transition-colors">
        <Icon size={20} />
      </div>
      {!loading && (
        <div className={`flex items-center text-xs font-mono font-medium px-2 py-1 rounded ${
          trend === 'up' 
            ? 'bg-emerald-500/5 text-emerald-500' 
            : 'bg-red-500/5 text-red-500'
        }`}>
          {trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
          {trendValue}
        </div>
      )}
    </div>
    <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</h3>
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
    ) : (
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
    )}
  </div>
);

export const Dashboard: React.FC = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [appointments, setAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega tenant
  useEffect(() => {
    tenantApi.getDemoTenant().then(({ data }) => {
      setTenantId(data.tenant.id);
    });
  }, []);

  // Carrega dados quando tenant estiver disponível
  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    
    try {
      const [statsRes, chartRes, appointmentsRes] = await Promise.all([
        statsApi.getDashboardStats(tenantId),
        statsApi.getMessagesChart(tenantId, 7),
        statsApi.getRecentAppointments(tenantId, 5),
      ]);

      setStats(statsRes.data);
      setChartData(chartRes.data.data);
      setAppointments(appointmentsRes.data.appointments);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-emerald-400 bg-emerald-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'canceled': return 'text-red-400 bg-red-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'canceled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard de Operações</h1>
          <p className="text-zinc-500 text-sm mt-1">Monitoramento em tempo real do agente AutomIA</p>
        </div>
        <div className="flex space-x-2">
          <select className="bg-zinc-900 border border-white/10 text-white text-sm rounded px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none">
            <option>Últimos 7 dias</option>
            <option>Hoje</option>
            <option>Este Mês</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Interações Totais" 
          value={stats?.conversations.total ?? 0}
          trend={stats?.conversations.trend === 'down' ? 'down' : 'up'}
          trendValue={stats?.conversations.change ?? '+0%'}
          icon={MessageCircle} 
          loading={loading}
        />
        <StatCard 
          title="Agendamentos" 
          value={stats?.appointments.total ?? 0}
          trend={stats?.appointments.trend === 'down' ? 'down' : 'up'}
          trendValue={stats?.appointments.change ?? '+0%'}
          icon={Users} 
          loading={loading}
        />
        <StatCard 
          title="Eficiência da IA" 
          value={`${stats?.aiResolution.rate ?? 0}%`}
          trend="up"
          trendValue="+0.8%"
          icon={Zap} 
          loading={loading}
        />
        <StatCard 
          title="Taxa de Abandono" 
          value="2.1%"
          trend="down"
          trendValue="-0.5%"
          icon={Activity} 
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-surface border border-white/5 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-white mb-6 flex items-center">
            <Activity size={16} className="mr-2 text-primary" />
            Volume de Tráfego
          </h3>
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-zinc-500">
              <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma mensagem nos últimos 7 dias</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    tick={{fill: '#71717a', fontSize: 12}} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#52525b" 
                    tick={{fill: '#71717a', fontSize: 12}} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorMessages)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Schedule List - Dense Table Style */}
        <div className="bg-surface border border-white/5 rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
            <h3 className="text-sm font-semibold text-white">Próximos Agendamentos</h3>
            <span className="text-xs text-zinc-500 font-mono">HOJE</span>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-zinc-600">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum agendamento ainda</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-900 text-xs font-mono text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 font-normal">Cliente</th>
                    <th className="px-4 py-2 font-normal">Horário</th>
                    <th className="px-4 py-2 font-normal text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-zinc-300 font-medium">{apt.customerName || apt.summary}</td>
                      <td className="px-4 py-3 text-zinc-500 font-mono">{formatDateTime(apt.startTime)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          apt.status === 'confirmed' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' :
                          apt.status === 'pending' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' :
                          'border-red-500/20 text-red-500 bg-red-500/5'
                        }`}>
                          {getStatusLabel(apt.status).toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-3 border-t border-white/5 bg-zinc-900/30">
            <button className="w-full text-xs text-zinc-400 hover:text-white transition-colors py-1">Ver agenda completa</button>
          </div>
        </div>
      </div>
    </div>
  );
};
