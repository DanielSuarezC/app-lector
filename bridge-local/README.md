# Bridge Local — Node.js Serial → HTTP POST

Script que escucha el puerto COM virtual del Arduino y retransmite cada evento JSON al backend.

## Requisitos

- Node.js >= 18 LTS
- Arduino Uno R3 conectado por USB con el firmware cargado

## Configuración

```bash
cp .env.example .env
```

Editar `.env`:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `COM_PORT` | Puerto COM del Arduino (vacío = auto-detectar) | `COM3` (Win) / `/dev/ttyUSB0` (Linux) |
| `BAUD_RATE` | Baudrate del serial | `115200` |
| `API_URL` | URL base del backend | `http://localhost:3000` |
| `API_KEY` | Clave de autenticación (debe coincidir con `backend/.env`) | `dev_key_local_123` |
| `BRIDGE_ID` | ID único de este bridge | `bridge-local-dev-01` |
| `RETRY_INTERVAL_MS` | Intervalo de reintento si el backend no responde | `30000` |
| `MAX_QUEUE_SIZE` | Máx. eventos en cola offline | `1000` |
| `LOG_LEVEL` | Nivel de logging | `debug` |

> **Importante:** el valor de `API_KEY` en `.env` debe ser exactamente igual al `API_KEY` configurado en `backend/.env`, o el backend rechazará todos los eventos del bridge.

## Ejecución local

El bridge se arranca manualmente cada vez que se necesite:

```bash
npm install       # solo la primera vez
npm start         # producción local
npm run dev       # desarrollo con recarga automática (nodemon)
```

Para detenerlo, presiona `Ctrl+C` en la terminal.

## Cómo encontrar el puerto COM del Arduino

**Windows:** Administrador de dispositivos → Puertos (COM y LPT) → "Arduino Uno (COMx)"

**Linux:** `ls /dev/ttyUSB* /dev/ttyACM*` o `dmesg | grep tty`

**macOS:** `ls /dev/cu.usbmodem* /dev/cu.usbserial*`

Si `COM_PORT` se deja vacío en `.env`, el bridge intenta auto-detectar el Arduino por VID USB (Arduino, CH340, FTDI, CP210x).

## Comportamiento

1. Abre el puerto COM configurado.
2. Por cada línea JSON del Arduino, hace HTTP POST a `POST /api/scanner/event`.
3. Si el backend no está disponible, el evento se encola en memoria (FIFO, máx `MAX_QUEUE_SIZE` eventos).
4. Cada `RETRY_INTERVAL_MS` ms intenta reenviar los eventos en cola.
5. Si el puerto COM se cierra (Arduino desconectado), intenta reconectar cada 5 segundos.

## Despliegue en servidor (PM2)

Solo para entornos de producción o servidores donde el bridge debe correr en segundo plano:

```bash
pm2 start ecosystem.config.js
pm2 save          # persiste el proceso entre reinicios del servidor
```

Para detenerlo y eliminarlo de PM2:

```bash
pm2 stop bridge-colina-real
pm2 delete bridge-colina-real
```
