/**
 * Adapter para salvar estado de autenticação do Baileys no PostgreSQL
 * Compatível com useMultiFileAuthState do Baileys
 * 
 * Resolve o problema de perda de sessões em ambientes efêmeros como Railway
 */
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

// Import dinâmico para Baileys (ES Module)
let initAuthCreds: any, BufferJSON: any, AuthenticationCreds: any, SignalDataTypeMap: any;

const loadBaileys = async () => {
  if (!initAuthCreds) {
    const baileys = await import('@whiskeysockets/baileys');
    initAuthCreds = baileys.initAuthCreds;
    BufferJSON = baileys.BufferJSON;
    AuthenticationCreds = baileys.AuthenticationCreds;
    SignalDataTypeMap = baileys.SignalDataTypeMap;
  }
};

const prisma = new PrismaClient();
const logger = new Logger('AuthStateDB');

/**
 * Usa banco de dados como armazenamento de auth state
 * Compatível com useMultiFileAuthState do Baileys
 */
export async function useDatabaseAuthState(sessionId: string) {
  // Carrega Baileys dinamicamente antes de usar
  await loadBaileys();
  
  logger.log(`Inicializando auth state do banco para sessão ${sessionId}`);

  // Função para escrever dados
  const writeData = async (key: string, data: any) => {
    try {
      // Ignora chaves de app state que podem causar problemas
      if (key.startsWith('app-state-sync-key-') || key.startsWith('app-state-sync-version-')) {
        logger.debug(`Ignorando chave de app state: ${key}`);
        return;
      }

      const serialized = JSON.stringify(data, BufferJSON.replacer);

      await prisma.whatsappAuth.upsert({
        where: {
          sessionId_dataKey: {
            sessionId,
            dataKey: key,
          },
        },
        update: {
          dataValue: serialized,
          updatedAt: new Date(),
        },
        create: {
          sessionId,
          dataKey: key,
          dataValue: serialized,
        },
      });
    } catch (error: any) {
      logger.error(`Erro ao salvar ${key} para ${sessionId}: ${error.message}`);
    }
  };

  // Função para ler dados
  const readData = async (key: string) => {
    try {
      const row = await prisma.whatsappAuth.findUnique({
        where: {
          sessionId_dataKey: {
            sessionId,
            dataKey: key,
          },
        },
      });

      if (!row) return null;

      return JSON.parse(row.dataValue, BufferJSON.reviver);
    } catch (error: any) {
      logger.error(`Erro ao ler ${key} para ${sessionId}: ${error.message}`);
      return null;
    }
  };

  // Função para remover dados
  const removeData = async (key: string) => {
    try {
      await prisma.whatsappAuth.deleteMany({
        where: {
          sessionId,
          dataKey: key,
        },
      });
    } catch (error: any) {
      logger.error(`Erro ao remover ${key} para ${sessionId}: ${error.message}`);
    }
  };

  // Carrega ou cria credenciais
  let creds: AuthenticationCreds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
          const data: { [id: string]: any } = {};
          for (const id of ids) {
            let value = await readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = BufferJSON.reviver('', value);
            }
            data[id] = value;
          }
          return data;
        },
        set: async (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) {
                await writeData(key, value);
              } else {
                await removeData(key);
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    },
  };
}

/**
 * Remove todas as credenciais de uma sessão
 */
export async function clearAuthState(sessionId: string): Promise<number> {
  try {
    const result = await prisma.whatsappAuth.deleteMany({
      where: { sessionId },
    });
    logger.log(`🗑️ ${result.count} registros de auth removidos para ${sessionId}`);
    return result.count;
  } catch (error: any) {
    logger.error(`Erro ao limpar auth state de ${sessionId}: ${error.message}`);
    return 0;
  }
}

/**
 * Lista todas as sessões que têm dados salvos no banco
 */
export async function listAuthSessions() {
  try {
    const sessions = await prisma.whatsappAuth.groupBy({
      by: ['sessionId'],
      _count: {
        dataKey: true,
      },
      _max: {
        updatedAt: true,
      },
      orderBy: {
        _max: {
          updatedAt: 'desc',
        },
      },
    });

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      keysCount: s._count.dataKey,
      lastUpdate: s._max.updatedAt,
    }));
  } catch (error: any) {
    logger.error(`Erro ao listar sessões: ${error.message}`);
    return [];
  }
}

/**
 * Verifica se uma sessão tem credenciais salvas no banco
 */
export async function hasAuthState(sessionId: string): Promise<boolean> {
  try {
    const count = await prisma.whatsappAuth.count({
      where: { sessionId },
    });
    return count > 0;
  } catch (error: any) {
    logger.error(`Erro ao verificar auth state de ${sessionId}: ${error.message}`);
    return false;
  }
}
