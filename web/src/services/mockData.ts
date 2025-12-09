import { KnowledgeFile, ChatSession, ChatMessage } from '../types';

export const mockFiles: KnowledgeFile[] = [
  { id: '1', name: 'Politica_de_Troca.pdf', type: 'pdf', size: '2.4 MB', uploadDate: '2024-12-01', status: 'trained' },
  { id: '2', name: 'Tabela_Precos_2024.docx', type: 'docx', size: '1.1 MB', uploadDate: '2024-12-02', status: 'trained' },
  { id: '3', name: 'FAQ_Atendimento.txt', type: 'txt', size: '450 KB', uploadDate: '2024-12-03', status: 'processing' },
];

export const mockSessions: ChatSession[] = [
  { id: '1', contactName: 'Alice Souza', contactNumber: '+55 11 99999-1234', lastMessage: 'Gostaria de agendar uma visita.', lastTime: '10:42', unread: 2, status: 'active', aiPaused: false },
  { id: '2', contactName: 'Bruno Tech', contactNumber: '+55 11 98888-5678', lastMessage: 'Obrigado pelo suporte!', lastTime: '09:15', unread: 0, status: 'active', aiPaused: true },
  { id: '3', contactName: 'Carla Dias', contactNumber: '+55 21 97777-9090', lastMessage: 'Qual o valor do plano?', lastTime: 'Ontem', unread: 0, status: 'active', aiPaused: false },
];

export const mockMessages: Record<string, ChatMessage[]> = {
  '1': [
    { id: 'm1', text: 'Olá, bom dia! Como posso ajudar?', sender: 'ai', timestamp: '10:30' },
    { id: 'm2', text: 'Bom dia. Vocês atendem aos sábados?', sender: 'user', timestamp: '10:32' },
    { id: 'm3', text: 'Sim! Atendemos das 09h às 13h aos sábados. Gostaria de agendar algo?', sender: 'ai', timestamp: '10:33' },
    { id: 'm4', text: 'Gostaria de agendar uma visita.', sender: 'user', timestamp: '10:42' },
  ],
  '2': [
    { id: 'm1', text: 'Meu sistema não está logando.', sender: 'user', timestamp: '09:00' },
    { id: 'm2', text: 'Vou transferir para um especialista humano agora mesmo.', sender: 'ai', timestamp: '09:01' },
    { id: 'm3', text: 'Olá Bruno, sou o Roberto. Qual erro aparece?', sender: 'agent', timestamp: '09:05' },
    { id: 'm4', text: 'Obrigado pelo suporte!', sender: 'user', timestamp: '09:15' },
  ]
};

export const chartData = [
  { name: 'Seg', messages: 400 },
  { name: 'Ter', messages: 580 },
  { name: 'Qua', messages: 800 },
  { name: 'Qui', messages: 750 },
  { name: 'Sex', messages: 920 },
  { name: 'Sab', messages: 300 },
  { name: 'Dom', messages: 150 },
];
