'use strict';

require('dotenv').config();

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// ---------------------------------------------------------------------------
// Configuración desde variables de entorno
// ---------------------------------------------------------------------------
const CONFIG = {
  comPort:         process.env.COM_PORT          || 'COM3',
  baudRate:        parseInt(process.env.BAUD_RATE, 10) || 9600,
  apiUrl:          process.env.API_URL            || 'http://localhost:3000',
  apiKey:          process.env.API_KEY            || '',
  bridgeId:        process.env.BRIDGE_ID          || 'bridge-local-01',
  retryIntervalMs: parseInt(process.env.RETRY_INTERVAL_MS, 10) || 30000,
  maxQueueSize:    parseInt(process.env.MAX_QUEUE_SIZE, 10) || 1000,
  logLevel:        process.env.LOG_LEVEL          || 'info',
};

// ---------------------------------------------------------------------------
// Logger mínimo con niveles
// ---------------------------------------------------------------------------
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[CONFIG.logLevel] ?? LEVELS.info;

const log = {
  error: (...a) => currentLevel >= 0 && console.error(`[ERROR]`, ...a),
  warn:  (...a) => currentLevel >= 1 && console.warn(`[WARN] `, ...a),
  info:  (...a) => currentLevel >= 2 && console.info(`[INFO] `, ...a),
  debug: (...a) => currentLevel >= 3 && console.info(`[DEBUG]`, ...a),
};

// ---------------------------------------------------------------------------
// Cola offline: FIFO, tamaño máximo configurable
// ---------------------------------------------------------------------------
const offlineQueue = [];

function enqueue(payload) {
  if (offlineQueue.length >= CONFIG.maxQueueSize) {
    log.warn(`Cola llena (${CONFIG.maxQueueSize}), descartando evento más antiguo`);
    offlineQueue.shift();
  }
  offlineQueue.push(payload);
  log.debug(`Evento encolado. Cola: ${offlineQueue.length} eventos`);
}

// ---------------------------------------------------------------------------
// HTTP client con timeout y autenticación
// ---------------------------------------------------------------------------
const httpClient = axios.create({
  baseURL: CONFIG.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': CONFIG.apiKey,
    'x-bridge-id': CONFIG.bridgeId,
  },
});

async function postEvent(payload) {
  const response = await httpClient.post('/api/scanner/event', payload);
  return response.data;
}

// ---------------------------------------------------------------------------
// Procesar evento recibido del Arduino
// ---------------------------------------------------------------------------
async function handleArduinoMessage(line) {
  line = line.trim();
  if (!line) {
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    log.warn(`Línea no es JSON válido: ${line}`);
    return;
  }

  if (!parsed.type) {
    log.warn(`Evento sin campo 'type': ${line}`);
    return;
  }

  // Ignorar mensaje de boot (solo informativo)
  if (parsed.type === 'boot') {
    log.info(`Arduino listo. Firmware: ${parsed.firmware || 'desconocido'}`);
    return;
  }

  // Enriquecer con timestamp real y bridgeId
  const payload = {
    ...parsed,
    ts: Math.floor(Date.now() / 1000),
    bridgeId: CONFIG.bridgeId,
  };

  log.debug(`Evento recibido: ${JSON.stringify(payload)}`);

  try {
    await postEvent(payload);
    log.info(`✓ Enviado [${payload.type}] ${payload.data ?? payload.value}`);
  } catch (err) {
    const msg = err.response
      ? `HTTP ${err.response.status}`
      : err.message;
    log.warn(`✗ Backend no disponible (${msg}). Encolando evento.`);
    enqueue(payload);
  }
}

// ---------------------------------------------------------------------------
// Worker de reintentos: procesa la cola cada RETRY_INTERVAL_MS
// ---------------------------------------------------------------------------
async function flushQueue() {
  if (offlineQueue.length === 0) {
    return;
  }

  log.info(`Reintentando cola: ${offlineQueue.length} eventos pendientes`);
  const batch = offlineQueue.splice(0, offlineQueue.length);

  for (const payload of batch) {
    try {
      await postEvent(payload);
      log.info(`✓ Reintento exitoso [${payload.type}]`);
    } catch {
      // Volver a encolar si sigue fallando
      enqueue(payload);
      break; // Detener el batch si el backend sigue caído
    }
  }
}

// ---------------------------------------------------------------------------
// Inicialización del puerto serial
// ---------------------------------------------------------------------------
function startSerialPort() {
  const port = new SerialPort({
    path: CONFIG.comPort,
    baudRate: CONFIG.baudRate,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.open((err) => {
    if (err) {
      log.error(`No se pudo abrir ${CONFIG.comPort}: ${err.message}`);
      log.error('Verifica que el Arduino esté conectado y que COM_PORT sea correcto.');
      setTimeout(startSerialPort, 5000); // Reintentar en 5s
      return;
    }
    log.info(`Puerto serial abierto: ${CONFIG.comPort} @ ${CONFIG.baudRate} bps`);
  });

  parser.on('data', (line) => {
    handleArduinoMessage(line).catch((err) => log.error('handleArduinoMessage:', err));
  });

  port.on('error', (err) => {
    log.error(`Error de puerto serial: ${err.message}`);
  });

  port.on('close', () => {
    log.warn('Puerto serial cerrado. Reconectando en 5 segundos...');
    setTimeout(startSerialPort, 5000);
  });
}

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------
log.info('=== Bridge Local — Impresiones Colina Real ===');
log.info(`Puerto: ${CONFIG.comPort} | API: ${CONFIG.apiUrl} | Bridge: ${CONFIG.bridgeId}`);

startSerialPort();
setInterval(flushQueue, CONFIG.retryIntervalMs);

// Graceful shutdown
process.on('SIGINT', () => {
  log.info('Cerrando bridge...');
  if (offlineQueue.length > 0) {
    log.warn(`Hay ${offlineQueue.length} eventos en cola que no fueron enviados.`);
  }
  process.exit(0);
});
