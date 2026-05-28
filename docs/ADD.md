# ADD — Documento de Diseño de Arquitectura
## Sistema IoT Colina Real
## Impresiones Colina Real

**Versión**: 1.0
**Fecha**: 2026-05-28
**Autor**: Daniel Suárez
**Institución**: Universidad — Semestre 8 (PAS Sistemas Operativos)

---

## Tabla de Contenidos

1. [Introducción y Objetivos de Arquitectura](#1-introducción-y-objetivos-de-arquitectura)
2. [Restricciones de Arquitectura](#2-restricciones-de-arquitectura)
3. [Vista de Contexto del Sistema](#3-vista-de-contexto-del-sistema)
4. [Vista de Componentes](#4-vista-de-componentes)
5. [Vista de Despliegue](#5-vista-de-despliegue)
6. [Vista de Datos](#6-vista-de-datos)
7. [Decisiones de Arquitectura (ADRs)](#7-decisiones-de-arquitectura-adrs)
8. [Seguridad](#8-seguridad)
9. [Patrones de Diseño Utilizados](#9-patrones-de-diseño-utilizados)

---

## 1. Introducción y Objetivos de Arquitectura

### 1.1 Propósito

Este documento describe las decisiones arquitectónicas del Sistema IoT de Inventario y POS de Impresiones Colina Real. Su objetivo es proporcionar una referencia técnica clara para el desarrollo, mantenimiento y evaluación académica del sistema.

### 1.2 Objetivos de Arquitectura

Los siguientes atributos de calidad guían las decisiones de diseño del sistema:

| Objetivo | Descripción | Prioridad |
|---|---|---|
| **Disponibilidad** | El sistema debe estar disponible durante el horario comercial (7 a.m.–9 p.m.) sin interrupciones no planificadas. | Alta |
| **Rendimiento** | La latencia del flujo escáner → pantalla POS debe ser menor a 1 segundo end-to-end. | Alta |
| **Mantenibilidad** | El código debe seguir convenciones estándar de cada framework para facilitar cambios futuros. | Media |
| **Resiliencia** | Si el backend no está disponible, el bridge debe seguir capturando y encolando eventos. | Alta |
| **Simplicidad de despliegue** | El sistema debe poderse desplegar en producción con los planes gratuitos de Render y Netlify. | Media |
| **Seguridad** | Las comunicaciones deben ser cifradas y autenticadas. Las credenciales no deben estar en el código fuente. | Alta |

---

## 2. Restricciones de Arquitectura

| Restricción | Origen | Impacto |
|---|---|---|
| El bridge debe correr en la PC Windows del negocio | Hardware: el Arduino se conecta físicamente por USB | Imposible mover esta capa a la nube |
| Plan gratuito de Render | Presupuesto del proyecto académico | Cold starts de hasta 60 s; límite de 750 horas/mes |
| Plan gratuito de PostgreSQL en Render | Presupuesto del proyecto académico | Base de datos eliminada si el servicio deja de usarse por 90 días |
| Node.js 18+ | Requisito de serialport y NestJS 10 | Versiones anteriores no son compatibles |
| Angular 17 con standalone components | Elección del framework frontend | Sin NgModules tradicionales; usar `@Component` standalone |
| Un solo Arduino por instancia | Hardware disponible | No hay soporte multi-dispositivo en v1.0 |

---

## 3. Vista de Contexto del Sistema

El siguiente diagrama muestra los actores externos y sus interacciones con el sistema:

```
                              ┌────────────────────────────────────────┐
                              │         SISTEMA COLINA REAL            │
                              │                                        │
  ┌──────────────┐  Escanea   │  ┌──────────────────────────────────┐  │
  │  Cajero /    │────────────►  │  Frontend Angular SPA            │  │
  │  Operador    │  (Navegador)  │  POS + Backoffice + Monitor      │  │
  └──────────────┘            │  └────────────────┬─────────────────┘  │
                              │                   │ HTTPS REST/SSE     │
  ┌──────────────┐  Administra │  ┌────────────────▼─────────────────┐  │
  │  Dueño /     │────────────►  │  Backend NestJS API              │  │
  │  Administrador│  (Navegador) │  REST + SSE + TypeORM            │  │
  └──────────────┘            │  └────────────────┬─────────────────┘  │
                              │                   │ SQL/TCP            │
  ┌──────────────┐  Conectado │  ┌────────────────▼─────────────────┐  │
  │  Arduino     │  por USB   │  │  PostgreSQL 15                   │  │
  │  Uno R3      │───────────►   │  (Render managed)                │  │
  │  (Escáner    │            │  └──────────────────────────────────┘  │
  │  + Temp)     │            │                   ▲                   │
  └──────────────┘            │  ┌────────────────┴─────────────────┐  │
         │ USB Serial          │  │  Bridge Local (Node.js + PM2)    │  │
         └────────────────────►  │  serialport → HTTP POST          │  │
                              │  └──────────────────────────────────┘  │
                              └────────────────────────────────────────┘

  Actores externos:
  - Cajero / Operador: usa el POS para cobrar
  - Dueño / Administrador: gestiona productos y consulta reportes
  - Arduino Uno R3: genera eventos de barcode, temperatura y boot
```

---

## 4. Vista de Componentes

### 4.1 Frontend (Angular SPA)

```
frontend/src/app/
├── core/
│   ├── services/
│   │   ├── api.service.ts         ← Wrapper HttpClient con base URL
│   │   ├── scanner.service.ts     ← Suscripción SSE al backend
│   │   └── cart.service.ts        ← Estado del carrito POS (BehaviorSubject)
│   └── interceptors/
│       └── error.interceptor.ts   ← Manejo global de errores HTTP
│
├── features/
│   ├── pos/                       ← Pantalla principal de punto de venta
│   │   ├── pos.component.ts       ← Carrito + botones de pago
│   │   └── quick-services/        ← Botones de servicios rápidos
│   ├── products/                  ← CRUD de productos
│   ├── sales/                     ← Historial y detalle de ventas
│   ├── monitor/                   ← Vista de eventos en tiempo real (SSE)
│   └── inventory/                 ← Ajustes de stock
│
└── shared/
    ├── components/                ← Componentes reutilizables (tabla, modal, etc.)
    └── models/                    ← Interfaces TypeScript (Product, Sale, ScannerEvent)
```

**Tecnologías:**
- Angular 17 (standalone components, signals)
- Angular Material para UI
- RxJS para manejo de streams reactivos
- EventSource API nativa para SSE

**Comunicación:**
- REST API via `HttpClient` con interceptor de errores global
- SSE via `EventSource` para el monitor en tiempo real

---

### 4.2 Backend (NestJS API)

```
backend/src/
├── main.ts                        ← Bootstrap, Swagger, CORS, ValidationPipe
├── app.module.ts                  ← Módulo raíz (TypeORM, ConfigModule)
│
├── scanner/
│   ├── scanner.module.ts
│   ├── scanner.controller.ts      ← POST /event, GET /stream, GET /events, GET /temperatures
│   ├── scanner.service.ts         ← Lógica de negocio + emisión de SSE
│   ├── scanner-event.entity.ts    ← Entidad TypeORM ↔ tabla scanner_events
│   └── dto/
│       └── create-event.dto.ts    ← Validación con class-validator
│
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts     ← CRUD + búsqueda + generate-barcode
│   ├── products.service.ts
│   ├── product.entity.ts          ← Entidad TypeORM ↔ tabla products
│   └── dto/
│       ├── create-product.dto.ts
│       └── update-product.dto.ts
│
├── sales/
│   ├── sales.module.ts
│   ├── sales.controller.ts        ← POST /, GET /, GET /daily-summary
│   ├── sales.service.ts           ← Lógica de venta + descuento de stock
│   ├── sale.entity.ts             ← Entidad TypeORM ↔ tabla sales (JSONB items)
│   └── dto/
│       └── create-sale.dto.ts
│
└── inventory/
    ├── inventory.module.ts
    ├── inventory.controller.ts    ← POST /:id/adjust
    ├── inventory.service.ts
    └── inventory-movement.entity.ts  ← Entidad TypeORM ↔ tabla inventory_movements
```

**Tecnologías:**
- NestJS 10 (módulos, controladores, servicios, DTOs)
- TypeORM 0.3 (migraciones automáticas en dev, sincronizar en producción)
- class-validator + class-transformer para validación de DTOs
- Swagger (OpenAPI 3) auto-generado via `@nestjs/swagger`
- Docker con imagen Node 20 Alpine

**Patrones aplicados:**
- Módulo por dominio (scanner, products, sales, inventory)
- Repository pattern via TypeORM
- DTO para validación de entrada y transformación de datos
- Guard para autenticación de API Key en el endpoint del bridge

---

### 4.3 Bridge Local (Node.js Service)

```
bridge-local/src/
├── index.js                       ← Entry point: orquesta serial, HTTP, cola
├── serial.js                      ← Manejo del puerto COM con serialport
├── http-client.js                 ← POST al backend con reintentos
└── queue.js                       ← Cola FIFO en memoria para eventos pendientes

bridge-local/
├── ecosystem.config.js            ← Configuración PM2
├── setup-windows-service.ps1      ← Instalador del servicio Windows
├── switch-env.ps1                 ← Cambia entre .env.local y .env.production
├── .env.example                   ← Plantilla de variables de entorno
├── .env.local                     ← Config para desarrollo local
└── logs/
    ├── bridge-out.log             ← Salida estándar (PM2)
    └── bridge-error.log           ← Errores (PM2)
```

**Tecnologías:**
- Node.js 18+
- `serialport` para lectura del puerto COM USB
- `node-fetch` o `https` nativo para HTTP POST
- PM2 + `pm2-startup` para servicio Windows

**Flujo de datos:**
```
Arduino USB → serialport readline → parsear JSON → cola en memoria
                                                          │
                                              Si backend disponible:
                                                     HTTP POST /api/scanner/event
                                                          │
                                              Si backend no disponible:
                                                     Retener en cola (max 1000)
                                                     Reintentar cada 30 s
```

---

### 4.4 Firmware (Arduino C++)

```
firmware/src/
└── colina_real_scanner.ino        ← Sketch principal
```

**Estructura del sketch:**

```cpp
// setup():
//   - Inicializar Serial (9600 bps) para comunicación con PC
//   - Inicializar SoftwareSerial (pines 2/3) para lector MH-ET V3.0
//   - Enviar evento {"type":"boot","ts":millis()}

// loop():
//   - Si hay datos en SoftwareSerial (lector):
//       Leer código de barras
//       Enviar {"type":"barcode","data":"<codigo>","ts":millis()}
//   - Cada 30 000 ms:
//       Leer ADC canal 8 (temperatura interna)
//       Calcular temperatura en Celsius
//       Enviar {"type":"temp","value":<temp>,"unit":"C","ts":millis()}
```

**Tecnologías:**
- Arduino C++ (AVR-GCC)
- Librería `SoftwareSerial` (incluida en Arduino IDE)
- Sin librerías externas adicionales

---

## 5. Vista de Despliegue

### 5.1 Entorno de Desarrollo

```
PC del Desarrollador
├── Docker Desktop
│   └── Contenedor: postgres:15-alpine
│       └── Puerto: 5432 (mapeado al host)
│
├── Terminal 1 — backend
│   └── node backend/src/main.js (nodemon)
│       └── Puerto: 3000
│
├── Terminal 2 — frontend
│   └── ng serve
│       └── Puerto: 4200
│
└── Terminal 3 — bridge (opcional, si hay Arduino)
    └── node bridge-local/src/index.js (nodemon)
        └── Conectado a COM3 (u otro)

Arduino Uno R3 → USB → PC (COMx)
```

Comandos para levantar el entorno de desarrollo:
```bash
# Desde la raíz:
docker-compose up -d db
cd backend && npm run start:dev
cd frontend && npm start
cd bridge-local && npm run dev   # Solo si hay Arduino
```

### 5.2 Entorno de Producción

```
Internet
├── Netlify CDN (cdn.netlify.com)
│   └── frontend/dist → Archivos estáticos HTML/JS/CSS
│       └── URL: https://colina-real.netlify.app
│
└── Render.com (Ohio, us-east-1)
    ├── Servicio Web Docker (plan Free)
    │   └── NestJS API
    │       └── URL: https://colina-real-backend.onrender.com
    │
    └── PostgreSQL 15 (plan Free)
        └── Red interna de Render (acceso solo desde el servicio web)
        └── CONNECTION_STRING: postgresql://...@...render.com:5432/colina_real

PC del Negocio (Windows 10/11)
└── PM2 Windows Service
    └── bridge-local (Node.js)
        └── Arduino USB → COM3
        └── POST → https://colina-real-backend.onrender.com/api/scanner/event
```

**Notas de producción:**
- El frontend nunca habla directamente con la base de datos; toda comunicación pasa por el backend.
- El certificado TLS del backend y el CDN son gestionados automáticamente por Render y Netlify respectivamente.
- El bridge se despliega manualmente en la PC del negocio siguiendo el procedimiento del README.

---

## 6. Vista de Datos

### 6.1 Modelo de Datos

Ver `docs/ERD.md` para el diagrama completo. Resumen de entidades:

| Tabla | Propósito | Relaciones |
|---|---|---|
| `products` | Catálogo de productos con stock y precios | 1:N con `inventory_movements` |
| `sales` | Transacciones de venta (ítems como JSONB) | Sin FK (usa snapshots) |
| `scanner_events` | Eventos raw del Arduino (barcode, temp, boot) | Sin FK |
| `inventory_movements` | Auditoría de cambios de stock | N:1 con `products` |

**Decisión de diseño clave — JSONB para items de venta:**

Los ítems de cada venta se almacenan como un arreglo JSONB en la columna `items` de `sales`, en lugar de una tabla separada `sale_items`. Esto preserva el snapshot exacto del precio al momento de la venta, independientemente de cambios futuros en el producto. Ver ADR-004.

### 6.2 Flujo de Datos

#### Flujo de venta completo:

```
[Cajero escanea producto]
         │
         ▼
[Arduino envía JSON por Serial]
         │
         ▼
[Bridge recibe → POST /api/scanner/event]
         │
         ▼
[Backend guarda en scanner_events]
         │ SSE
         ▼
[Frontend recibe evento via EventSource]
         │
         ▼
[POS busca producto por barcode: GET /api/products/barcode/:barcode]
         │
         ▼
[Producto agregado al carrito (estado local Angular)]
         │
[Cajero confirma cobro]
         │
         ▼
[Frontend: POST /api/sales con carrito completo]
         │
         ▼
[Backend (transacción DB):
  1. INSERT INTO sales
  2. UPDATE products SET stock = stock - qty
  3. INSERT INTO inventory_movements (type=sale)]
         │
         ▼
[Respuesta: venta creada con número de transacción]
```

#### Flujo de evento de temperatura:

```
[Arduino lee ADC cada 30 s]
         │
         ▼
[Bridge: POST /api/scanner/event (type: temp)]
         │
         ▼
[Backend: INSERT INTO scanner_events]
         │ SSE
         ▼
[Monitor frontend: muestra temperatura actualizada]
```

---

## 7. Decisiones de Arquitectura (ADRs)

### ADR-001: NestJS como framework backend

**Estado**: Aceptado
**Fecha**: Inicio del proyecto

**Contexto**: Se necesita un framework Node.js para construir la API REST. Las opciones evaluadas fueron Express.js, Fastify y NestJS.

**Decisión**: Usar NestJS 10.

**Justificación**:
- Arquitectura modular opinada que facilita la organización del código en proyectos de mediana complejidad.
- Integración nativa con TypeORM, class-validator y Swagger sin configuración adicional.
- Soporte de primera clase para TypeScript.
- Curva de aprendizaje adecuada para el alcance académico del proyecto.

**Consecuencias**: Mayor verbosidad de código que Express puro (boilerplate de módulos/controladores), pero mayor consistencia y mantenibilidad.

---

### ADR-002: Angular + Material Design para el frontend

**Estado**: Aceptado
**Fecha**: Inicio del proyecto

**Contexto**: Se necesita un framework SPA para el frontend. Las opciones evaluadas fueron React, Vue y Angular.

**Decisión**: Usar Angular 17 con Angular Material.

**Justificación**:
- Angular provee una solución completa (routing, HTTP, formularios, DI) sin necesidad de integrar librerías externas.
- Angular Material provee componentes POS (tablas, botones, formularios) bien adaptados al caso de uso.
- TypeScript nativo y tipado estricto reducen errores de integración con la API.
- Familiaridad del equipo de desarrollo con el framework.

**Consecuencias**: Bundle inicial más grande que React/Vue; compensado con lazy loading de rutas.

---

### ADR-003: SSE para tiempo real (en lugar de WebSockets)

**Estado**: Aceptado
**Fecha**: Implementación del módulo scanner

**Contexto**: El monitor en tiempo real necesita recibir eventos del backend sin polling. Se evaluaron WebSockets y Server-Sent Events.

**Decisión**: Usar SSE (Server-Sent Events).

**Justificación**:
- El flujo de datos es unidireccional: solo del servidor al cliente. SSE es el protocolo adecuado para este patrón.
- SSE usa HTTP estándar, compatible sin configuración adicional con Render.com (los WebSockets requieren planes de pago en algunos proveedores).
- La API `EventSource` del navegador incluye reconexión automática nativa.
- Menor complejidad de implementación que WebSockets para un flujo unidireccional.

**Consecuencias**: No es posible enviar mensajes del cliente al servidor por este canal. No aplica para el caso de uso actual.

---

### ADR-004: PostgreSQL JSONB para items de venta

**Estado**: Aceptado
**Fecha**: Diseño del módulo de ventas

**Contexto**: Los ítems de una venta podrían almacenarse en una tabla normalizada `sale_items` o en un campo JSONB dentro de `sales`.

**Decisión**: Usar JSONB en la columna `items` de la tabla `sales`.

**Justificación**:
- **Integridad de datos históricos**: el snapshot de precio, nombre y categoría al momento de la venta queda inmutable. Si el precio de un producto cambia, las ventas pasadas no se ven afectadas.
- **Simplicidad de consulta**: leer una venta completa es un solo `SELECT` sin `JOIN`.
- **Flexibilidad**: los servicios rápidos (sin `productId`) pueden almacenarse junto con productos físicos en la misma estructura.

**Consecuencias**: No es posible hacer `JOIN` entre ventas e ítems individuales para análisis complejos. Para el alcance del POS (resúmenes diarios, historial) esto es suficiente.

---

### ADR-005: Bridge local como proceso Node.js independiente

**Estado**: Aceptado
**Fecha**: Diseño del subsistema hardware

**Contexto**: La conexión entre el Arduino (USB local) y el backend (HTTPS en la nube) requiere un componente que corra en la PC del negocio.

**Decisión**: Bridge como proceso Node.js independiente del frontend y el backend.

**Justificación**:
- Node.js tiene soporte maduro para puertos seriales vía `serialport`.
- Un proceso independiente puede correrse como servicio de Windows sin depender de que el navegador esté abierto.
- Separación de responsabilidades: el bridge solo hace una cosa (serial → HTTP).
- El mismo lenguaje (JavaScript/Node.js) que el backend facilita el mantenimiento.

**Consecuencias**: Requiere instalación manual en la PC del negocio. Documentado en el README con el script `setup-windows-service.ps1`.

---

### ADR-006: PM2 como gestor de procesos Windows

**Estado**: Aceptado
**Fecha**: Implementación del bridge como servicio

**Contexto**: El bridge debe iniciarse automáticamente con Windows y reiniciarse si falla.

**Decisión**: Usar PM2 + `pm2-startup` para registrar el bridge como servicio de Windows.

**Justificación**:
- PM2 es el estándar de facto para procesos Node.js en producción.
- `pm2-startup` integra PM2 con Windows Service Manager (SCM) sin necesidad de código adicional.
- PM2 provee: reinicio automático, límite de memoria, logging rotativo y gestión de múltiples procesos.
- Alternativas (NSSM, node-windows) requieren más configuración o no tienen integración nativa con Node.js.

**Consecuencias**: Requiere permisos de Administrador para la instalación inicial. Una vez instalado, el bridge corre de forma completamente transparente para el usuario del negocio.

---

## 8. Seguridad

### Modelo de amenazas

| Amenaza | Mitigación |
|---|---|
| Acceso no autorizado al endpoint del bridge | API Key en header `x-api-key`; backend devuelve 401 sin clave válida |
| Exposición de credenciales en el código | Variables de entorno (`.env`); `.gitignore` excluye archivos `.env` |
| Inyección SQL | TypeORM con queries parametrizadas; nunca interpolación de strings en SQL |
| Cross-Site Scripting (XSS) | Angular escapa automáticamente el HTML en templates; headers CSP opcionales |
| Cross-Origin requests no autorizados | CORS configurado explícitamente en el backend (`CORS_ORIGINS`) |
| Man-in-the-Middle | HTTPS en producción (TLS 1.3 automático en Render y Netlify) |
| Acceso físico no autorizado al POS | Control de acceso físico al dispositivo (fuera del alcance del software v1.0) |

### Consideraciones para v2.0

- Agregar autenticación de usuarios (JWT) para el frontend.
- Rate limiting en el endpoint del bridge para prevenir abuso.
- Rotación periódica de API Keys.
- Cifrado en reposo de datos sensibles en PostgreSQL.

---

## 9. Patrones de Diseño Utilizados

| Patrón | Dónde se usa | Descripción |
|---|---|---|
| **Módulo** | NestJS backend | Cada dominio (scanner, products, sales, inventory) es un módulo independiente con sus propias responsabilidades |
| **Repository** | TypeORM entities | Abstracción de la capa de datos; los servicios no escriben SQL directamente |
| **DTO (Data Transfer Object)** | DTOs de NestJS | Separación entre el modelo de BD y los datos que entran/salen por la API; validación con decoradores |
| **Guard** | ApiKeyGuard en NestJS | Protección declarativa del endpoint POST /scanner/event |
| **Observer / Pub-Sub** | SSE en NestJS + EventSource en Angular | El backend emite eventos; múltiples clientes se suscriben sin acoplamiento |
| **Queue (cola FIFO)** | bridge-local/queue.js | Desacopla la captura de eventos de su envío al backend; garantiza entrega eventual |
| **BehaviorSubject** | CartService en Angular | Estado reactivo del carrito POS; todos los componentes que lo consumen reciben actualizaciones automáticas |
| **Snapshot** | JSONB items en sales | Los ítems de venta son snapshots inmutables del estado del producto en el momento de la transacción |
| **Facade** | ApiService en Angular | Encapsula todos los llamados HTTP del frontend; los componentes no usan HttpClient directamente |
| **Decorator** | NestJS (Controller, Injectable, Entity) y Angular (Component, Injectable) | Configuración declarativa de clases vía metadatos TypeScript |
