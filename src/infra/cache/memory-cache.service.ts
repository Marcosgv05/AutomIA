import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Serviço de cache em memória (pode ser substituído por Redis em produção)
 * Usado para armazenar histórico de conversas temporariamente
 */
@Injectable()
export class MemoryCacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  
  // Limpeza automática a cada 5 minutos
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Armazena valor no cache com TTL
   * @param key Chave do cache
   * @param value Valor a armazenar
   * @param ttlSeconds Tempo de vida em segundos (padrão: 30 minutos)
   */
  set<T>(key: string, value: T, ttlSeconds: number = 1800): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Obtém valor do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Remove valor do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Verifica se chave existe e não expirou
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Adiciona item a uma lista no cache
   */
  pushToList<T>(key: string, item: T, maxItems: number = 20, ttlSeconds: number = 1800): void {
    const list = this.get<T[]>(key) || [];
    list.push(item);
    
    // Mantém apenas os últimos N itens
    const trimmedList = list.slice(-maxItems);
    
    this.set(key, trimmedList, ttlSeconds);
  }

  /**
   * Obtém lista do cache
   */
  getList<T>(key: string): T[] {
    return this.get<T[]>(key) || [];
  }

  /**
   * Limpa entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: ${cleaned} entradas removidas`);
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('Cache limpo completamente');
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return {
      entries: this.cache.size,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }
}
