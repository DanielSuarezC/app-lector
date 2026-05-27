'use strict';

require('dotenv').config();

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// ---------------------------------------------------------------------------
// Configuración desde variables de entorno
// ---------------------------------------------------------------------------
const CONFIG = {
  comPort:         process.env.COM_PORT          || null,   // null = auto-detectar
  baudRate:        parseInt(process.env.BAUD_RATE, 10) || 115200,
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
// Auto-detección del Arduino por VID/PID o fabricante
// VIDs conocidos: 2341 = Arduino SA, 1a86 = CH340 (clones), 0403 = FTDI, 10c4 = CP210x
// ---------------------------------------------------------------------------
const ARDUINO_VENDOR_IDS = new Set(['2341', '1a86', '0403', '10c4', '1eaf']);
const ARDUINO_MFR_RE = /arduino|ch340|ch341|ftdi|silicon\s*labs|qinheng/i;

async function findArduinoPort() {
  let ports;
  try {
    ports = await SerialPort.list();
  } catch (err) {
    log.error(`No se pudo listar puertos seriales: ${err.message}`);
    return null;
  }

  if (ports.length === 0) {
    log.warn('No se encontraron puertos seriales disponibles.');
    return null;
  }

  log.debug(
    `Puertos disponibles: ${ports
      .map((p) => `${p.path} [VID=${p.vendorId || '?'} MFR=${p.manufacturer || '?'}]`)
      .join(', ')}`
  );

  // 1. Buscar por vendorId conocido (más confiable)
  for (const port of ports) {
    const vid = (port.vendorId || '').toLowerCase().replace(/^0x/, '');
    if (ARDUINO_VENDOR_IDS.has(vid)) {
      log.info(`Arduino detectado por VID (${vid}): ${port.path}`);
      return port.path;
    }
  }

  // 2. Buscar por nombre de fabricante
  for (const port of ports) {
    if (ARDUINO_MFR_RE.test(port.manufacturer || '')) {
      log.info(`Arduino detectado por fabricante (${port.manufacturer}): ${port.path}`);
      return port.path;
    }
  }

  log.warn('No se identificó ningún Arduino en los puertos disponibles.');
  return null;
}

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
  if (!line) return;

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

  if (parsed.type === 'boot') {
    log.info(`Arduino listo. Firmware: ${parsed.firmware || 'desconocido'}`);
    return;
  }

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
    const msg = err.response ? `HTTP ${err.response.status}` : err.message;
    log.warn(`✗ Backend no disponible (${msg}). Encolando evento.`);
    enqueue(payload);
  }
}

// ---------------------------------------------------------------------------
// Worker de reintentos: procesa la cola cada RETRY_INTERVAL_MS
// ---------------------------------------------------------------------------
async function flushQueue() {
  if (offlineQueue.length === 0) return;

  log.info(`Reintentando cola: ${offlineQueue.length} eventos pendientes`);
  const batch = offlineQueue.splice(0, offlineQueue.length);

  for (const payload of batch) {
    try {
      await postEvent(payload);
      log.info(`✓ Reintento exitoso [${payload.type}]`);
    } catch {
      enqueue(payload);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Inicialización del puerto serial
// Orden de resolución del puerto:
//   1. COM_PORT en .env (override manual)
//   2. Auto-detección por VID/PID o fabricante
//   3. Reintento en 10 s si no se encuentra ninguno
// ---------------------------------------------------------------------------
async function startSerialPort() {
  let portPath = CONFIG.comPort;

  if (portPath) {
    log.info(`Puerto forzado por variable de entorno: ${portPath}`);
  } else {
    portPath = await findArduinoPort();
    if (!portPath) {
      log.error('No se encontró ningún Arduino. Reintentando en 10 segundos...');
      setTimeout(startSerialPort, 10000);
      return;
    }
  }

  const port = new SerialPort({
    path: portPath,
    baudRate: CONFIG.baudRate,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.open((err) => {
    if (err) {
      log.error(`No se pudo abrir ${portPath}: ${err.message}`);
      log.error('Verifica que el Arduino esté conectado y no esté ocupado por otro programa.');
      setTimeout(startSerialPort, 5000);
      return;
    }
    log.info(`Puerto serial abierto: ${portPath} @ ${CONFIG.baudRate} bps`);
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
log.info(`API: ${CONFIG.apiUrl} | Bridge: ${CONFIG.bridgeId} | Baud: ${CONFIG.baudRate}`);
log.info(CONFIG.comPort ? `Puerto: ${CONFIG.comPort} (fijo)` : 'Puerto: auto-detect');

startSerialPort();
setInterval(flushQueue, CONFIG.retryIntervalMs);

process.on('SIGINT', () => {
  log.info('Cerrando bridge...');
  if (offlineQueue.length > 0) {
    log.warn(`Hay ${offlineQueue.length} eventos en cola que no fueron enviados.`);
  }
  process.exit(0);
});
