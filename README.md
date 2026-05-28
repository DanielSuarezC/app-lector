# Sistema IoT de Inventario y POS — Impresiones Colina Real

Sistema completo de inventario y punto de venta (POS) para la papelería **Impresiones Colina Real**, desarrollado como Proyecto de Aula Semestral (PAS) de Arquitectura y Sistemas Operativos. Integra hardware Arduino con un backend en la nube, un frontend Angular y un bridge local que conecta el lector de códigos de barras físico con el sistema.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HARDWARE (Local — Negocio)                       │
│                                                                     │
│  ┌──────────────────────────────────┐                               │
│  │  Arduino Uno R3                  │                               │
│  │  ├── MH-ET V3.0 (lector barras)  │                               │
│  │  │   SoftwareSerial pines 2/3    │                               │
│  │  └── ATmega328P (sensor temp)    │                               │
│  │       Canal ADC 8                │                               │
│  └──────────────┬───────────────────┘                               │
│                 │ USB Serial (9600 bps)                              │
│                 ▼                                                   │
│  ┌──────────────────────────────────┐                               │
│  │  bridge-local (Node.js + PM2)    │  Windows Service              │
│  │  serialport → HTTP POST          │  auto-start al encender PC    │
│  └──────────────┬───────────────────┘                               │
└─────────────────┼───────────────────────────────────────────────────┘
                  │ HTTPS (x-api-key)
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NUBE (Render.com)                                 │
│                                                                     │
│  ┌──────────────────────────────────┐                               │
│  │  backend (NestJS 10)             │  POST /api/scanner/event      │
│  │  API REST + SSE                  │  GET  /api/scanner/stream     │
│  └──────────────┬───────────────────┘                               │
│                 │ TypeORM                                            │
│                 ▼                                                   │
│  ┌──────────────────────────────────┐                               │
│  │  PostgreSQL 15                   │  products, sales,             │
│  │  (Render managed)                │  scanner_events,              │
│  └──────────────────────────────────┘  inventory_movements          │
└─────────────────────────────────────────────────────────────────────┘
                  │ SSE / REST API
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NUBE (Netlify)                                    │
│                                                                     │
│  ┌──────────────────────────────────┐                               │
│  │  frontend (Angular 17 SPA)       │  POS + Backoffice             │
│  │  https://colina-real.netlify.app │  + Monitor en tiempo real     │
│  └──────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estructura del Monorepo

```
app-lector/
├── firmware/          Sketch Arduino C++ (barcode + temperatura)
├── bridge-local/      Node.js: COM port → HTTP POST al backend
├── backend/           API REST NestJS 10 (inventario, ventas, scanner)
├── frontend/          SPA Angular 17 (POS, backoffice, reportes)
├── docs/              Documentación técnica y académica (SRS, ADD, ERD)
├── docker-compose.yml Levanta PostgreSQL + backend en local
└── README.md          Este archivo
```

---

## Prerrequisitos

Antes de empezar, asegúrate de tener instalado:

| Herramienta | Versión mínima | Enlace de descarga |
|---|---|---|
| Node.js | 18 LTS | https://nodejs.org |
| npm | 9+ | (incluido con Node.js) |
| Docker Desktop | 24+ | https://www.docker.com/products/docker-desktop |
| Git | 2.40+ | https://git-scm.com |
| Arduino IDE | 2.x | https://www.arduino.cc/en/software |
| Puerto COM (Arduino) | — | Ver sección Hardware |

> **Windows:** Docker Desktop requiere WSL 2 habilitado. Sigue la guía oficial si no lo tienes configurado.

---

## Inicio Rápido — Desarrollo Local

Sigue estos pasos en orden. Tiempo estimado: **10–15 minutos**.

### Paso 1 — Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO> app-lector
cd app-lector
```

### Paso 2 — Configurar variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

Abre `backend/.env` y ajusta los valores (los valores por defecto funcionan con Docker):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://colina_real_user:colina_real_dev_pass@localhost:5432/colina_real
API_KEY=dev_api_key_insecure_change_in_prod
CORS_ORIGINS=http://localhost:4200
```

Vuelve a la raíz:

```bash
cd ..
```

### Paso 3 — Levantar PostgreSQL con Docker

Desde la raíz del monorepo ejecuta:

```bash
docker-compose up -d db
```

Verifica que el contenedor esté corriendo:

```bash
docker ps
# Debe aparecer: colina_real_db (o similar) con estado "Up"
```

Espera unos 10 segundos para que PostgreSQL quede listo. Puedes verificar con:

```bash
docker-compose logs db
# Debe terminar con: "database system is ready to accept connections"
```

### Paso 4 — Iniciar el backend

```bash
cd backend
npm install
npm run start:dev
```

El backend levantará en `http://localhost:3000`. Verifica que funcione:

```bash
# En otra terminal:
curl http://localhost:3000/api/products
# Debe responder: []  (arreglo vacío — la BD está limpia)
```

La documentación Swagger estará disponible en: `http://localhost:3000/api/docs`

### Paso 5 — Iniciar el frontend

Abre una **nueva terminal** (el backend debe seguir corriendo):

```bash
cd frontend
npm install
npm start
```

El frontend abrirá en `http://localhost:4200`. Comprueba que se conecta al backend viendo la pantalla principal del POS.

### Paso 6 — Configurar el bridge local (requiere Arduino)

> Omite este paso si no tienes el Arduino conectado. El sistema funciona sin él para registrar ventas manualmente.

```bash
cd bridge-local
cp .env.example .env
```

Abre `bridge-local/.env` y configura:

```env
COM_PORT=COM3              # Cambia al puerto COM de tu Arduino (ver Administrador de Dispositivos)
BAUD_RATE=9600
API_URL=http://localhost:3000
API_KEY=dev_api_key_insecure_change_in_prod
BRIDGE_ID=bridge-colina-real-01
RETRY_INTERVAL_MS=30000
```

**Cómo encontrar el puerto COM del Arduino en Windows:**
1. Conecta el Arduino por USB.
2. Abre el Administrador de Dispositivos (`Win + X → Administrador de dispositivos`).
3. Expande `Puertos (COM y LPT)`.
4. Busca `Arduino Uno (COMx)` — anota el número `x`.

Inicia el bridge:

```bash
npm install
npm run dev       # Modo desarrollo (con nodemon — reinicia al guardar)
# o
npm start         # Modo producción
```

Verás en la consola mensajes como:
```
[Bridge] Puerto COM3 abierto a 9600 bps
[Bridge] Conectado al backend en http://localhost:3000
```

### Paso 7 — Cargar el firmware en el Arduino

1. Abre **Arduino IDE 2.x**.
2. Ve a `Archivo → Abrir` y selecciona `firmware/src/colina_real_scanner.ino`.
3. Ve a `Herramientas → Placa` y selecciona `Arduino Uno`.
4. Ve a `Herramientas → Puerto` y selecciona el mismo `COMx` del paso anterior.
5. Haz clic en **Subir** (botón con flecha →).
6. Una vez cargado, abre el Monitor Serie (`Ctrl + Shift + M`) a 9600 bps y verifica que aparezcan líneas JSON como:
   ```json
   {"type":"boot","ts":1234567890}
   {"type":"barcode","data":"7702001234567","ts":1234567891}
   ```

---

## Variables de Entorno

### Backend (`backend/.env`)

| Variable | Requerida | Valor por defecto (dev) | Descripción |
|---|---|---|---|
| `NODE_ENV` | Si | `development` | Entorno de ejecución |
| `PORT` | No | `3000` | Puerto del servidor HTTP |
| `DATABASE_URL` | Si | — | Connection string PostgreSQL completo |
| `API_KEY` | Si | — | Clave secreta para autenticar el bridge. Mínimo 16 caracteres en producción |
| `CORS_ORIGINS` | Si | `http://localhost:4200` | URL(s) permitidas para CORS (separadas por coma) |

### Bridge Local (`bridge-local/.env`)

| Variable | Requerida | Valor por defecto | Descripción |
|---|---|---|---|
| `COM_PORT` | Si | — | Puerto COM del Arduino (`COM3`, `COM5`, etc.) |
| `BAUD_RATE` | No | `9600` | Velocidad del puerto serial |
| `API_URL` | Si | — | URL base del backend (`http://localhost:3000` o URL de Render) |
| `API_KEY` | Si | — | Debe coincidir exactamente con la `API_KEY` del backend |
| `BRIDGE_ID` | No | `bridge-01` | Identificador único del bridge (útil si hay varios) |
| `RETRY_INTERVAL_MS` | No | `30000` | Milisegundos entre reintentos cuando el backend no está disponible |

---

## Servicios Rápidos POS

El POS incluye servicios sin código de barras que se registran directamente en ventas:

| Servicio | Descripción |
|---|---|
| Impresión | Impresión de documentos en blanco y negro o color |
| Fotocopia | Fotocopias de documentos |
| Escáner | Digitalización de documentos |
| Transcripción | Transcripción de textos manuscritos o digitales |
| Trámites Digitales | Gestión de formularios, envíos y trámites en línea |

Estos servicios se registran en la tabla `sales` como items con `productId: null` y `type: 'quick-service'` dentro del campo JSONB `items`.

---

## Bridge como Servicio Windows (PM2)

Para que el bridge inicie automáticamente cada vez que se enciende la PC del negocio, instálalo como servicio de Windows:

### Instalación

1. Abre **PowerShell como Administrador** (`Win + X → Windows PowerShell (Administrador)`).
2. Navega al directorio del bridge:
   ```powershell
   cd "C:\ruta\al\proyecto\bridge-local"
   ```
3. Configura el entorno (elige uno):
   ```powershell
   # Para conectar al backend en producción (Render):
   .\switch-env.ps1 prod

   # Para conectar al backend local:
   .\switch-env.ps1 local
   ```
4. Ejecuta el instalador:
   ```powershell
   .\setup-windows-service.ps1
   ```

El script automáticamente:
- Verifica e instala PM2 y `pm2-windows-service` globalmente.
- Instala las dependencias del bridge (`npm install`).
- Inicia el bridge con PM2 y guarda la configuración.
- Registra el bridge como servicio nativo de Windows.

> **Durante la instalación** el instalador preguntará:
> ```
> ? perform environment setup (recommended)? (Y/n)
> ```
> Responde **Y** (Enter). Esto configura el PATH y las variables de entorno del sistema para que el servicio encuentre Node.js al arrancar Windows.

### Comandos de gestión del bridge

```powershell
pm2 status                           # Ver estado
pm2 logs bridge-colina-real          # Ver logs en tiempo real
pm2 restart bridge-colina-real       # Reiniciar
pm2 stop bridge-colina-real          # Detener
pm2 start bridge-colina-real         # Iniciar
```

### Cambiar entre entornos

```powershell
# Conectar al backend local (desarrollo):
.\switch-env.ps1 local

# Conectar al backend en Render (producción):
.\switch-env.ps1 prod
```

### Desinstalación del servicio

Para eliminar completamente el servicio de Windows (el bridge deja de arrancar con el PC):

```powershell
# En PowerShell como Administrador, desde bridge-local/
.\setup-windows-service.ps1 -Uninstall
```

Esto detiene el proceso PM2, lo elimina de la lista de procesos y desregistra el servicio de Windows. Puedes volver a instalarlo en cualquier momento ejecutando el script sin el flag `-Uninstall`.

---

## Despliegue en Producción

### Backend — Render.com

1. Crea una cuenta en [render.com](https://render.com).
2. Haz clic en **New → Blueprint** y conecta el repositorio de GitHub.
3. Render detectará automáticamente `backend/render.yaml` y creará:
   - Un servicio web Docker con la API.
   - Una base de datos PostgreSQL gestionada.
4. Una vez desplegado, copia la `API_KEY` generada automáticamente desde el dashboard de Render (sección *Environment*).
5. Actualiza esa clave en `bridge-local/.env` y en el frontend si aplica.

URL de producción del backend: `https://colina-real-backend.onrender.com/api`

> **Nota plan gratuito:** El servicio en Render se "duerme" tras 15 minutos de inactividad. La primera petición puede tardar hasta 60 segundos en responder ("cold start").

### Frontend — Netlify

1. Crea una cuenta en [netlify.com](https://netlify.com).
2. Haz clic en **Add new site → Import an existing project** y conecta el repositorio.
3. Netlify usará automáticamente la configuración de `frontend/netlify.toml`.
4. En la sección **Environment Variables** del dashboard de Netlify, agrega:
   ```
   API_URL=https://colina-real-backend.onrender.com
   ```
5. Haz clic en **Deploy site**.

URL de producción del frontend: `https://colina-real.netlify.app`

---

## Endpoints de la API

Base URL (local): `http://localhost:3000/api`
Base URL (producción): `https://colina-real-backend.onrender.com/api`

### Scanner / Bridge

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/scanner/event` | `x-api-key` | Recibir evento del bridge (barcode, temp, boot) |
| `GET` | `/scanner/stream` | — | SSE: eventos en tiempo real |
| `GET` | `/scanner/events` | — | Listar eventos históricos del scanner |
| `GET` | `/scanner/temperatures` | — | Listar lecturas de temperatura |
| `GET` | `/scanner/status` | — | Estado del bridge (último evento, conexión) |

### Productos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/products` | — | Listar todos los productos activos |
| `POST` | `/products` | — | Crear nuevo producto |
| `GET` | `/products/low-stock` | — | Productos con stock por debajo del mínimo |
| `GET` | `/products/search?q=` | — | Buscar productos por nombre o categoría |
| `GET` | `/products/barcode/:barcode` | — | Buscar producto por código de barras |
| `GET` | `/products/:id` | — | Obtener producto por ID |
| `PUT` | `/products/:id` | — | Actualizar producto |
| `DELETE` | `/products/:id` | — | Desactivar producto (soft delete) |
| `POST` | `/products/:id/generate-barcode` | — | Generar código de barras automático |

### Ventas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/sales` | — | Registrar nueva venta |
| `GET` | `/sales` | — | Listar ventas (con paginación) |
| `GET` | `/sales/daily-summary` | — | Resumen de ventas del día actual |

### Inventario

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/inventory/:id/adjust` | — | Ajustar stock de un producto manualmente |

> La autenticación con `x-api-key` requiere enviar el header `x-api-key: <API_KEY>` en la petición.

---

## Solución de Problemas Comunes

### El backend no inicia — Error de conexión a la BD

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa:** PostgreSQL no está corriendo.
**Solución:** Ejecuta `docker-compose up -d db` desde la raíz del monorepo y espera 10 segundos.

---

### El frontend no se conecta al backend (CORS)

```
Access to XMLHttpRequest at 'http://localhost:3000' from origin 'http://localhost:4200' has been blocked
```

**Causa:** `CORS_ORIGINS` en `backend/.env` no incluye la URL del frontend.
**Solución:** Asegúrate de que `backend/.env` tenga `CORS_ORIGINS=http://localhost:4200`.

---

### El bridge no encuentra el puerto COM

```
Error: No such file or directory, cannot open COM3
```

**Causa:** El puerto COM especificado no existe o el Arduino no está conectado.
**Solución:**
1. Verifica que el cable USB esté conectado.
2. Abre el Administrador de Dispositivos y confirma el número de puerto `COMx`.
3. Actualiza `COM_PORT` en `bridge-local/.env`.

---

### El bridge envía eventos pero el backend devuelve 401

```
[Bridge] Error enviando evento: 401 Unauthorized
```

**Causa:** La `API_KEY` del bridge no coincide con la del backend.
**Solución:** Asegúrate de que `bridge-local/.env` y `backend/.env` tengan exactamente la misma `API_KEY`.

---

### npm install falla con errores de peer dependencies (frontend)

```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solución:**

```bash
npm install --legacy-peer-deps
```

Esto ya está configurado en `frontend/netlify.toml` para el despliegue en Netlify.

---

### Docker no levanta — Puerto 5432 ya en uso

```
Error starting userland proxy: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Causa:** Tienes una instancia local de PostgreSQL corriendo en el mismo puerto.
**Solución:**
- Detén el servicio local de PostgreSQL (`services.msc → PostgreSQL → Detener`), o
- Cambia el puerto en `docker-compose.yml`: `"5433:5432"` y actualiza `DATABASE_URL` en `backend/.env`.

---

### El lector de códigos de barras no escanea en el firmware

**Verificación:**
1. Abre el Monitor Serie de Arduino IDE a 9600 bps.
2. Escanea un código con el lector; debe aparecer una línea JSON.
3. Si no aparece nada, verifica que los pines del lector (TX→pin2, RX→pin3) estén correctamente conectados.

---

## Hardware Requerido

| Componente | Modelo | Conexión |
|---|---|---|
| Microcontrolador | Arduino Uno R3 | USB al PC |
| Lector de códigos de barras | MH-ET V3.0 (modo UART TTL) | TX→pin2, RX→pin3 del Arduino |
| Cable USB | USB-A a USB-B | Arduino ↔ PC |

---

## Documentación Técnica

La carpeta `docs/` contiene la documentación académica y técnica completa:

| Archivo | Descripción |
|---|---|
| `docs/SRS.md` | Especificación de Requisitos de Software |
| `docs/ADD.md` | Documento de Diseño de Arquitectura |
| `docs/ERD.md` | Diagrama Entidad-Relación |
| `docs/DATABASE.md` | Script SQL completo de la base de datos |

---

## Licencia

Proyecto académico — Universidad, Semestre 8, 2026. Daniel Suárez.
