import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  Trash2,
  RefreshCw,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Bot,
  User
} from 'lucide-react';
import { tenantApi, calendarApi, GoogleAccount, Appointment } from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  source: 'google' | 'ai';
  htmlLink?: string;
}

export const Calendar: React.FC = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendário selecionado para visualização
  const [activeCalendarId, setActiveCalendarId] = useState<string>('');

  // Modal de criar evento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [creating, setCreating] = useState(false);

  // Busca eventos do calendário
  const fetchEvents = useCallback(async (calendarId: string, start: Date, end: Date) => {
    if (!calendarId) return;
    try {
      const { data } = await calendarApi.getEvents(
        calendarId,
        start.toISOString(),
        end.toISOString()
      );
      setCalendarEvents(data.events);
    } catch (err: any) {
      console.error('Erro ao buscar eventos:', err);
    }
  }, []);

  // Carrega dados
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await tenantApi.getDemoTenant();
        setTenantId(data.tenant.id);

        const accountsRes = await calendarApi.listAccounts(data.tenant.id);
        setAccounts(accountsRes.data.accounts);

        // Seleciona o primeiro calendário automaticamente
        const firstCalendar = accountsRes.data.accounts[0]?.calendars[0];
        if (firstCalendar) {
          setActiveCalendarId(firstCalendar.id);
          setSelectedCalendarId(firstCalendar.id);
        }

        const appointmentsRes = await calendarApi.listAppointments(data.tenant.id);
        setAppointments(appointmentsRes.data.appointments);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Conecta conta Google
  const handleConnectGoogle = () => {
    if (!tenantId) return;
    window.open(calendarApi.getAuthUrl(tenantId), '_blank');
  };

  // Sincroniza calendários
  const handleSync = async (accountId: string) => {
    if (!tenantId) return;
    try {
      await calendarApi.syncCalendars(accountId, tenantId);
      // Recarrega contas
      const { data } = await calendarApi.listAccounts(tenantId);
      setAccounts(data.accounts);
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar');
    }
  };

  // Cria evento
  const handleCreateEvent = async () => {
    if (!tenantId || !selectedCalendarId || !eventSummary || !eventDate) return;

    try {
      setCreating(true);
      const startTime = new Date(`${eventDate}T${eventStartTime}:00`);
      const endTime = new Date(`${eventDate}T${eventEndTime}:00`);

      await calendarApi.createEvent({
        tenantId,
        googleCalendarId: selectedCalendarId,
        summary: eventSummary,
        description: eventDescription,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Recarrega agendamentos e eventos
      const { data } = await calendarApi.listAppointments(tenantId);
      setAppointments(data.appointments);

      // Recarrega eventos do calendário visual
      if (activeCalendarId) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        fetchEvents(activeCalendarId, start, end);
      }

      setShowCreateModal(false);
      setEventSummary('');
      setEventDescription('');
      setEventDate('');
      setEventStartTime('09:00');
      setEventEndTime('10:00');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar evento');
    } finally {
      setCreating(false);
    }
  };

  // Cancela agendamento
  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    try {
      await calendarApi.cancelAppointment(id);
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'canceled' } : a));
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar');
    }
  };

  // Formata data/hora
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handler para quando o calendário muda de período
  const handleDatesSet = useCallback((dateInfo: { start: Date; end: Date }) => {
    if (activeCalendarId) {
      fetchEvents(activeCalendarId, dateInfo.start, dateInfo.end);
    }
  }, [activeCalendarId, fetchEvents]);

  // Handler para clicar em uma data no calendário
  const handleDateClick = (info: { dateStr: string }) => {
    setEventDate(info.dateStr);
    setShowCreateModal(true);
  };

  // Handler para clicar em um evento
  const handleEventClick = (info: { event: { extendedProps: { htmlLink?: string } } }) => {
    const htmlLink = info.event.extendedProps?.htmlLink;
    if (htmlLink) {
      window.open(htmlLink, '_blank');
    }
  };

  // Converte eventos para formato do FullCalendar
  const fullCalendarEvents = calendarEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.source === 'ai' ? '#8b5cf6' : '#3b82f6',
    borderColor: event.source === 'ai' ? '#7c3aed' : '#2563eb',
    extendedProps: {
      source: event.source,
      htmlLink: event.htmlLink,
    },
  }));

  // Pega todos os calendários de todas as contas
  const allCalendars = accounts.flatMap(acc => 
    acc.calendars.map(cal => ({ ...cal, accountEmail: acc.email }))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-2xl font-bold ${true ? 'text-slate-100' : 'text-slate-900'}`}>Agenda</h1>
          <p className={`mt-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Gerencie seus agendamentos do Google Calendar.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleConnectGoogle}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Mail className="w-5 h-5" />
            Conectar Google
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={allCalendars.length === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Contas Google */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${true ? 'text-slate-200' : 'text-slate-800'}`}>Contas Google Conectadas</h3>
        
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma conta Google conectada.</p>
            <p className="text-slate-500 text-sm mt-1">Clique em "Conectar Google" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className={`rounded-lg p-4 border ${true ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className={`font-medium ${true ? 'text-slate-200' : 'text-slate-900'}`}>{account.email}</p>
                      <p className="text-xs text-slate-500">
                        {account.calendars.length} calendário(s) sincronizado(s)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSync(account.id)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sincronizar
                  </button>
                </div>
                
                {account.calendars.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${true ? 'border-slate-700' : 'border-slate-200'}`}>
                    <p className="text-xs text-slate-500 mb-2">Calendários:</p>
                    <div className="flex flex-wrap gap-2">
                      {account.calendars.map((cal) => (
                        <span
                          key={cal.id}
                          className={`px-2 py-1 rounded text-xs ${
                            cal.isDefault
                              ? 'bg-indigo-500/20 text-indigo-500'
                              : true ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {cal.summary || cal.calendarId}
                          {cal.isDefault && ' (Principal)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendário Visual */}
      {allCalendars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${true ? 'text-slate-200' : 'text-slate-800'}`}>Calendário</h3>
            <div className="flex items-center gap-4">
              {/* Legenda */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className={true ? 'text-slate-400' : 'text-slate-600'}>Seus eventos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-violet-500"></div>
                  <span className={true ? 'text-slate-400' : 'text-slate-600'}>Agendados pela IA</span>
                </div>
              </div>
              {/* Seletor de calendário */}
              <select
                value={activeCalendarId}
                onChange={(e) => setActiveCalendarId(e.target.value)}
                className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              >
                {allCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary || cal.calendarId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`calendar-wrapper rounded-lg p-4 ${true ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              locale="pt-br"
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
              }}
              events={fullCalendarEvents}
              datesSet={handleDatesSet}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              height="auto"
              dayMaxEvents={3}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
            />
          </div>
        </div>
      )}

      {/* Agendamentos */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${true ? 'text-slate-200' : 'text-slate-800'}`}>Agendamentos Recentes</h3>
        
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className={`rounded-lg p-4 border ${
                  apt.status === 'canceled' 
                    ? 'border-red-500/20 opacity-60' 
                    : true ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                } ${true ? 'bg-slate-800/50' : 'bg-slate-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {apt.status === 'confirmed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : apt.status === 'canceled' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className={`font-medium ${true ? 'text-slate-200' : 'text-slate-900'}`}>
                        {apt.payload?.summary || 'Sem título'}
                      </span>
                    </div>
                    
                    <div className={`flex items-center gap-4 text-sm mt-2 ${true ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDateTime(apt.startTime)}
                      </span>
                      {apt.googleCalendar && (
                        <span className="text-slate-500">
                          {apt.googleCalendar.summary}
                        </span>
                      )}
                    </div>

                    {apt.payload?.description && (
                      <p className="text-sm text-slate-500 mt-2">{apt.payload.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {apt.payload?.htmlLink && (
                      <a
                        href={apt.payload.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                        title="Abrir no Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {apt.status !== 'canceled' && (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        title="Cancelar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-full max-w-md mx-4 border ${true ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-xl font-bold mb-4 ${true ? 'text-slate-100' : 'text-slate-900'}`}>Novo Agendamento</h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Calendário</label>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">Selecione um calendário</option>
                  {allCalendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary || cal.calendarId} ({cal.accountEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Título</label>
                <input
                  type="text"
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  placeholder="Ex: Consulta com Dr. João"
                  className={`w-full rounded-lg px-4 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Descrição</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Detalhes do agendamento..."
                  rows={3}
                  className={`w-full rounded-lg px-4 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                    true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Data</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Início</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Fim</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`px-4 py-2 transition-colors ${true ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={creating || !selectedCalendarId || !eventSummary || !eventDate}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
