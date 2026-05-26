# Bridge Local — Node.js Serial → HTTP POST

Script que escucha el puerto COM virtual del Arduino y retransmite cada evento JSON al backend en la nube.

## Requisitos

- Node.js >= 18 LTS
- Arduino Uno R3 conectado por USB con el firmware cargado
- Acceso a Internet

## Configuración

```bash
cp .env.example .env
```

Editar `.env`:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `COM_PORT` | Puerto COM del Arduino | `COM3` (Win) / `/dev/ttyUSB0` (Linux) |
| `BAUD_RATE` | Baudrate del serial | `9600` |
| `API_URL` | URL base del backend | `https://colina-real-api.onrender.com` |
| `API_KEY` | Clave de autenticación | `abc123...` |
| `BRIDGE_ID` | ID único de este bridge | `bridge-colina-real-01` |
| `RETRY_INTERVAL_MS` | Intervalo de reintento | `30000` |

## Ejecución

```bash
npm install
npm start        # producción
npm run dev      # desarrollo (nodemon)
```

## Comportamiento

1. Abre el puerto COM configurado a 9600 bps.
2. Por cada línea JSON del Arduino, hace HTTP POST a `POST /api/scanner/event`.
3. Si el backend no está disponible, el evento se encola en memoria (FIFO, máx 1000 eventos).
4. Cada 30 segundos intenta reenviar los eventos en cola.
5. Si el puerto COM se cierra (Arduino desconectado), intenta reconectar cada 5 segundos.

## Cómo encontrar el puerto COM del Arduino

**Windows:** Administrador de dispositivos → Puertos (COM y LPT) → "Arduino Uno (COMx)"

**Linux:** `ls /dev/ttyUSB* /dev/ttyACM*` o `dmesg | grep tty`

**macOS:** `ls /dev/cu.usbmodem* /dev/cu.usbserial*`
