import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { MessageCircle, CalendarCheck, Zap, ArrowUp, ArrowDown, Minus, Loader2, RefreshCw, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tenantApi, statsApi, DashboardStats, ChartData, RecentAppointment } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  loading?: boolean;
  isDark?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon: Icon, loading, isDark = true }) => (
  <Card>
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
        {loading ? (
          <div className="h-8 mt-1 flex items-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <h3 className={`text-2xl font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</h3>
        )}
      </div>
      <div className="p-2 bg-indigo-500/20 rounded-lg">
        <Icon className="w-5 h-5 text-indigo-500" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      {loading ? (
        <span className="text-slate-500">Carregando...</span>
      ) : (
        <>
          <span className={`flex items-center font-medium ${
            trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4 mr-1" /> : 
             trend === 'down' ? <ArrowDown className="w-4 h-4 mr-1" /> : 
             <Minus className="w-4 h-4 mr-1" />}
            {change}
          </span>
          <span className="text-slate-500 ml-2">vs. semana passada</span>
        </>
      )}
    </div>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [appointments, setAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Dashboard</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Visão geral do desempenho do seu agente.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
            isDark 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total de Conversas"
          value={stats?.conversations.total ?? 0}
          change={stats?.conversations.change ?? '0%'}
          trend={stats?.conversations.trend ?? 'neutral'}
          icon={MessageCircle}
          loading={loading}
          isDark={isDark}
        />
        <StatCard
          title="Agendamentos"
          value={stats?.appointments.total ?? 0}
          change={stats?.appointments.change ?? '0%'}
          trend={stats?.appointments.trend ?? 'neutral'}
          icon={CalendarCheck}
          loading={loading}
          isDark={isDark}
        />
        <StatCard
          title="Taxa de Resolução IA"
          value={`${stats?.aiResolution.rate ?? 0}%`}
          change={`${stats?.aiResolution.aiMessages ?? 0} msgs`}
          trend="neutral"
          icon={Zap}
          loading={loading}
          isDark={isDark}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Volume de Mensagens (7 dias)</h3>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma mensagem nos últimos 7 dias</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)', color: '#f8fafc' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          messages: 'Total',
                          inbound: 'Recebidas',
                          outbound: 'Enviadas',
                        };
                        return [value, labels[name] || name];
                      }}
                    />
                    <Area type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorMessages)" name="messages" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Últimos Agendamentos</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <CalendarCheck className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhum agendamento ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className={`p-3 rounded-lg border ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700/50' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {apt.summary}
                        </p>
                        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {apt.customerName}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(apt.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
