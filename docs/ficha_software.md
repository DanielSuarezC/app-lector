# Ficha de Software — Sistema IoT Impresiones Colina Real

| **Nombre del Proyecto:** | | **Plataforma:** |
|---|---|---|
| Sistema IoT de Inventario y Punto de Venta — Impresiones Colina Real | | Web (Angular + NestJS) + Desktop-auxiliar (Node.js) |

| **Funcionalidad** | **Descripción** |
|---|---|
| Conectividad con el hardware | El módulo **bridge-local** (Node.js + `serialport`) se ejecuta en el PC donde está conectado el Arduino por USB. Escucha el puerto COM virtual, parsea los mensajes JSON y los retransmite vía HTTP POST al endpoint `/api/scanner/event` del backend en la nube. Incluye cola de reintentos offline. |
| Gestión de inventario | El **backend** (NestJS + PostgreSQL) mantiene el catálogo de productos con código de barras, nombre, precio de costo, precio de venta y stock actual. Cada evento de código de barras recibido del bridge se traduce en un incremento/decremento de stock según el contexto (recepción de mercancía o venta). |
| Punto de Venta (POS) | El **frontend** (Angular) provee una interfaz de caja registradora: el cajero escanea productos físicamente (el scanner actualiza automáticamente el carrito vía WebSocket/polling), aplica descuentos, selecciona medio de pago y genera el tiquete de venta en PDF. |
| Backoffice de inventario | Vista de administración para registrar nuevos productos (nombre, código, precios, stock inicial), ajustar inventario manualmente, visualizar alertas de stock bajo y consultar histórico de movimientos. |
| Monitoreo del nodo Arduino | Panel en tiempo real que muestra la temperatura interna del chip ATmega328P, estado de conexión del bridge y últimas lecturas de códigos de barras registradas. |
| Reportes | Módulo de reportes con filtros por fecha: ventas del día, productos más vendidos, evolución de inventario y temperatura del nodo a lo largo del tiempo. Exportación a CSV. |

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Bridge local | Node.js + serialport + axios | Node 18 LTS |
| Backend API | NestJS + TypeORM | NestJS 10 |
| Base de datos | PostgreSQL | 15 |
| Frontend | Angular + Angular Material | Angular 17 |
| Despliegue backend | Render.com (Docker) | — |
| Despliegue frontend | Netlify (SPA) | — |
| Protocolo bridge→backend | REST HTTP/HTTPS (JSON) | — |
| Protocolo backend→frontend | REST + SSE (Server-Sent Events) | — |

## Diagrama de componentes de software

```
┌─────────────────────────────────────────────────────────────────────┐
│  PC LOCAL                        │  NUBE                            │
│                                  │                                   │
│  ┌───────────────────┐           │  ┌──────────────────────────────┐│
│  │   bridge-local    │  HTTPS    │  │    Backend NestJS            ││
│  │   (Node.js)       │──POST────►│  │                              ││
│  │                   │           │  │  /api/scanner/event          ││
│  │  serialport       │           │  │  /api/products  (CRUD)       ││
│  │  retry-queue      │           │  │  /api/inventory              ││
│  └───────────────────┘           │  │  /api/sales                  ││
│                                  │  │  /api/reports                ││
│                                  │  │                              ││
│                                  │  │     TypeORM ──► PostgreSQL   ││
│                                  │  └──────────────────────────────┘│
│                                  │              │ REST/SSE           │
│                                  │              ▼                    │
│                                  │  ┌──────────────────────────────┐│
│                                  │  │    Frontend Angular          ││
│                                  │  │                              ││
│                                  │  │  /pos       (Caja POS)       ││
│                                  │  │  /inventory (Backoffice)     ││
│                                  │  │  /reports   (Reportes)       ││
│                                  │  │  /monitor   (Nodo Arduino)   ││
│                                  │  └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```
