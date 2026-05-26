# IoT Inventario & POS — Impresiones Colina Real

Monorepo del sistema IoT de inventario y punto de venta para la papelería **Impresiones Colina Real**, desarrollado como Proyecto de Aula Semestral (PAS) de Arquitectura y Sistemas Operativos.

## Arquitectura

```
Arduino Uno R3
  ├── MH-ET V3.0 (barcode scanner) → SoftwareSerial pins 2/3
  └── ATmega328P internal temp sensor → ADC channel 8
         │ USB Serial
         ▼
bridge-local (Node.js)
  └── serialport → HTTP POST
         │
         ▼
backend (NestJS) ← → PostgreSQL
         │
         ▼
frontend (Angular) — POS + Backoffice
```

## Estructura del Monorepo

| Carpeta | Descripción |
|---|---|
| `/firmware` | Sketch Arduino C++ (barcode + temperatura) |
| `/bridge-local` | Script Node.js: COM port → HTTP POST al backend |
| `/backend` | API REST NestJS (inventario, ventas, scanner) |
| `/frontend` | SPA Angular (POS, backoffice, reportes) |
| `/docs` | Documentación académica y técnica del PAS |

## Inicio Rápido

### Bridge Local (PC con Arduino conectado)
```bash
cd bridge-local
cp .env.example .env   # configurar COM_PORT y API_URL
npm install
npm start
```

### Backend (desarrollo local)
```bash
cd backend
cp .env.example .env   # configurar DATABASE_URL y API_KEY
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Hardware requerido
- Arduino Uno R3
- Lector de código de barras MH-ET V3.0 (modo UART TTL)

## Despliegue
- **Backend**: Render.com (ver `backend/render.yaml`)
- **Frontend**: Netlify (ver `frontend/netlify.toml`)
