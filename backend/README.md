# Backend — NestJS API

API REST para el sistema IoT de inventario y POS de Impresiones Colina Real.

## Stack

- NestJS 10 + TypeORM 0.3 + PostgreSQL 15
- Swagger auto-generado en `/api/docs`
- Docker listo para Render.com

## Desarrollo local

```bash
# Opción 1: Docker Compose (recomendada — levanta PostgreSQL automáticamente)
docker-compose up -d   # desde la raíz del monorepo

# Opción 2: Manual
cp .env.example .env   # configurar DATABASE_URL
npm install
npm run start:dev
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `PORT` | Puerto del servidor (default: 3000) |
| `NODE_ENV` | `development` o `production` |
| `API_KEY` | Clave para autenticar el bridge-local |
| `CORS_ORIGINS` | URLs permitidas (separadas por coma) |

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/scanner/event` | Recibir evento del bridge (requiere x-api-key) |
| GET | `/api/scanner/stream` | SSE: eventos en tiempo real |
| GET/POST | `/api/products` | Listar / crear productos |
| GET | `/api/products/low-stock` | Productos con stock bajo |
| POST | `/api/sales` | Registrar venta |
| GET | `/api/sales/daily-summary` | Resumen del día |
| POST | `/api/inventory/:id/adjust` | Ajustar stock manualmente |

## Despliegue en Render.com

1. Conectar repositorio en [render.com](https://render.com)
2. Importar `backend/render.yaml` (Infrastructure as Code)
3. Render creará automáticamente el servicio web y la base de datos PostgreSQL
