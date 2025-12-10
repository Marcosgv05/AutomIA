import React from 'react';

export type View = 'dashboard' | 'connection' | 'chat' | 'calendar' | 'config' | 'blacklist';

export interface NavItem {
  id: View;
  label: string;
  icon: React.ElementType;
  inDevelopment?: boolean;
}

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: string;
}

export interface ChatSession {
  id: string;
  contactName: string;
  contactNumber: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  status: 'active' | 'archived';
  aiPaused: boolean;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt';
  size: string;
  uploadDate: string;
  status: 'trained' | 'processing' | 'error';
}
