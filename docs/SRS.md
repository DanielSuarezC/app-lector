# SRS — Especificación de Requisitos de Software
## Sistema IoT de Inventario y Punto de Venta
## Impresiones Colina Real

**Versión**: 1.0
**Fecha**: 2026-05-28
**Autor**: Daniel Suárez
**Institución**: Universidad — Semestre 8 (PAS Sistemas Operativos)

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Descripción General del Sistema](#2-descripción-general-del-sistema)
3. [Requisitos Específicos](#3-requisitos-específicos)

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requisitos funcionales y no funcionales del **Sistema IoT de Inventario y Punto de Venta** para la papelería Impresiones Colina Real. El sistema integra hardware físico (Arduino Uno R3 con lector de códigos de barras) con una plataforma de software distribuida en la nube para automatizar el control de inventario y las operaciones de caja del negocio.

Este SRS está dirigido a:
- Desarrolladores que implementen o mantengan el sistema.
- Evaluadores académicos del Proyecto de Aula Semestral (PAS).
- El propietario del negocio, como cliente final del sistema.

### 1.2 Alcance

El sistema, denominado **Colina Real IoT POS**, abarca:

- **Control de inventario en tiempo real**: registro automático de entradas/salidas de productos mediante código de barras.
- **Punto de venta (POS)**: registro de ventas de productos físicos y servicios rápidos (impresión, fotocopia, escáner, transcripción, trámites digitales).
- **Monitoreo en tiempo real**: visualización en el navegador de los eventos del lector de barras y del sensor de temperatura del Arduino, mediante Server-Sent Events (SSE).
- **Reportes de ventas**: resúmenes diarios, historial de transacciones y alertas de stock bajo.
- **Bridge local**: proceso Node.js que conecta el puerto USB del Arduino con el backend en la nube, garantizando la entrega de eventos incluso con conectividad intermitente.

Fuera del alcance de este sistema:
- Contabilidad o facturación electrónica (DIAN).
- Integración con proveedores o cadena de suministro.
- Gestión de múltiples sucursales (la versión 1.0 es monopuesto).
- Aplicación móvil nativa.

### 1.3 Definiciones y Acrónimos

| Término | Definición |
|---|---|
| **POS** | Point of Sale (Punto de Venta). Sistema para registrar transacciones comerciales. |
| **IoT** | Internet of Things. Conexión de dispositivos físicos a Internet. |
| **Arduino** | Microcontrolador de placa única (Arduino Uno R3) usado para leer el escáner y el sensor de temperatura. |
| **Bridge** | Proceso Node.js que actúa como puente entre el Arduino (USB local) y el backend en la nube. |
| **SSE** | Server-Sent Events. Protocolo HTTP para envío de eventos en tiempo real del servidor al cliente. |
| **SPA** | Single Page Application. La arquitectura del frontend Angular. |
| **API REST** | Interfaz de programación de aplicaciones basada en el protocolo HTTP con convenciones REST. |
| **ORM** | Object-Relational Mapper. En este proyecto se usa TypeORM para abstraer las consultas SQL. |
| **UUID** | Universally Unique Identifier. Identificador usado como clave primaria en todas las tablas. |
| **JSONB** | Tipo de datos binario JSON de PostgreSQL, usado para almacenar los ítems de una venta. |
| **PAS** | Proyecto de Aula Semestral. Proyecto académico evaluado en el semestre. |
| **COM Port** | Puerto de comunicación serial virtual que Windows asigna al Arduino al conectarlo por USB. |
| **PM2** | Process Manager 2. Gestor de procesos Node.js usado para ejecutar el bridge como servicio de Windows. |
| **Soft Delete** | Eliminación lógica (el registro se marca como inactivo pero no se borra físicamente de la BD). |
| **Cold Start** | Retardo inicial de un servicio en Render que se ha "dormido" por inactividad. |

### 1.4 Referencias

| Referencia | Descripción |
|---|---|
| ADD v1.0 | Documento de Diseño de Arquitectura del sistema (ver `docs/ADD.md`) |
| ERD v1.0 | Diagrama Entidad-Relación (ver `docs/ERD.md`) |
| Lineamientos PAS | Lineamientos académicos del Proyecto de Aula Semestral |
| NestJS Docs | https://docs.nestjs.com — Framework backend |
| Angular Docs | https://angular.dev — Framework frontend |
| Arduino Reference | https://www.arduino.cc/reference/en |
| Render.com Docs | https://render.com/docs |
| Netlify Docs | https://docs.netlify.com |

---

## 2. Descripción General del Sistema

### 2.1 Perspectiva del Producto

El sistema Colina Real IoT POS es una solución nueva, desarrollada a medida para Impresiones Colina Real. Sustituye el registro manual en cuaderno que el negocio utilizaba previamente para el control de inventario y las ventas.

El sistema opera en una arquitectura distribuida de cuatro capas:

1. **Capa de hardware**: Arduino Uno R3 con lector de códigos de barras MH-ET V3.0 y sensor de temperatura interno, ubicado físicamente en el negocio.
2. **Capa de bridge**: Proceso Node.js corriendo en la PC del negocio, que captura los eventos del Arduino vía puerto USB y los reenvía al backend en la nube.
3. **Capa de backend**: API REST NestJS desplegada en Render.com, que persiste y sirve toda la lógica de negocio.
4. **Capa de frontend**: SPA Angular desplegada en Netlify, accesible desde cualquier navegador, que provee las interfaces de POS, backoffice y monitoreo.

El sistema depende de:
- Una conexión a Internet en la PC del negocio (para el bridge).
- El servicio de base de datos PostgreSQL gestionado por Render.
- Los planes gratuitos de Render y Netlify para el despliegue en producción.

### 2.2 Funciones del Producto

El sistema realiza las siguientes funciones principales:

1. **Gestión de inventario**: alta, baja lógica y edición de productos; control de stock con alertas de mínimo; generación automática de códigos de barras.
2. **Punto de venta**: cobro de productos escaneados o buscados manualmente; registro de servicios rápidos (sin código de barras); múltiples métodos de pago (efectivo, tarjeta, transferencia, Nequi); aplicación de descuentos.
3. **Integración con hardware**: recepción de eventos del lector de barras y sensor de temperatura en tiempo real; reconexión automática si el Arduino se desconecta.
4. **Monitoreo en tiempo real**: visualización de eventos del scanner y lecturas de temperatura en el navegador sin necesidad de recargar la página (SSE).
5. **Reportes**: resumen de ventas diarias (total, número de transacciones, método de pago predominante); historial de ventas; movimientos de inventario; alertas de stock bajo.
6. **Ajuste manual de inventario**: correcciones de stock con registro de motivo (recepción de mercancía, ajuste por daño, etc.).

### 2.3 Características de los Usuarios

| Perfil | Descripción | Nivel técnico |
|---|---|---|
| **Cajero / Operador** | Empleado o dueño del negocio que usa el POS para registrar ventas y consultar inventario. | Básico: manejo de navegador web y escáner físico. |
| **Administrador** | Dueño del negocio que gestiona productos, consulta reportes y configura el sistema. | Básico-medio: carga archivos, edita formularios en la interfaz web. |
| **Desarrollador / Técnico** | Persona que mantiene, despliega o extiende el sistema. | Avanzado: conoce Node.js, Angular, Docker, PostgreSQL. |

### 2.4 Restricciones

1. **Restricción de plataforma del bridge**: el bridge-local corre exclusivamente en la PC Windows del negocio donde está conectado el Arduino. No puede ser reemplazado por un servicio en la nube, ya que necesita acceso al puerto USB físico.
2. **Restricción del plan gratuito de Render**: el backend puede experimentar "cold starts" de hasta 60 segundos después de períodos de inactividad. Esto es aceptable para el volumen de uso del negocio.
3. **Restricción de una sola instancia del bridge**: el firmware Arduino y el bridge están diseñados para un único punto de venta. Escalar a múltiples cajas requeriría modificaciones arquitectónicas.
4. **Sin soporte offline completo**: si el backend no está disponible, el bridge encola hasta 1000 eventos en memoria; las ventas en el frontend no se pueden completar sin conexión al backend.
5. **Restricción del sensor de temperatura**: el sensor de temperatura es el sensor interno del ATmega328P (no un sensor externo dedicado); su precisión es de ±10°C y solo es indicativo.
6. **Restricción de facturación**: el sistema no genera facturas electrónicas válidas para la DIAN colombiana (fuera del alcance v1.0).

### 2.5 Suposiciones y Dependencias

**Suposiciones:**
- La PC del negocio tiene Windows 10 u 11 y acceso a Internet estable.
- El Arduino Uno R3 está permanentemente conectado a la PC del negocio durante el horario comercial.
- Los usuarios finales tienen acceso a un navegador web moderno (Chrome, Edge, Firefox en versión reciente).
- El volumen de ventas diarias no supera las 500 transacciones (suficiente para el plan gratuito de PostgreSQL en Render).

**Dependencias externas:**
- **Render.com**: disponibilidad del servicio web y la base de datos PostgreSQL.
- **Netlify**: disponibilidad del CDN y servidor de la SPA.
- **npm registry**: acceso para instalar dependencias durante el desarrollo y despliegue.

---

## 3. Requisitos Específicos

### 3.1 Requisitos Funcionales

---

#### RF01: Gestión de Inventario

**RF01.1 — Crear producto**
- El sistema debe permitir registrar un nuevo producto con los campos: nombre (obligatorio), categoría (opcional), precio de costo (obligatorio), precio de venta (obligatorio), stock inicial (obligatorio), stock mínimo, y código de barras (opcional).
- Si no se proporciona código de barras, el sistema puede generarlo automáticamente bajo demanda (ver RF01.5).

**RF01.2 — Editar producto**
- El sistema debe permitir modificar todos los campos de un producto existente.
- Los cambios deben reflejarse inmediatamente en el POS y el backoffice.

**RF01.3 — Desactivar producto (soft delete)**
- El sistema no debe eliminar físicamente productos; debe marcarlos como `active = false`.
- Los productos inactivos no aparecen en búsquedas del POS pero sus datos históricos se conservan en ventas y movimientos de inventario.

**RF01.4 — Consultar stock bajo**
- El sistema debe exponer un endpoint y una vista en el backoffice que listen todos los productos donde `stock < minStock`.
- La alerta debe ser visible al ingresar al backoffice.

**RF01.5 — Generar código de barras automático**
- El sistema debe generar un código EAN-13 único para productos que no tienen uno, a través del endpoint `POST /api/products/:id/generate-barcode`.

**RF01.6 — Buscar producto**
- El sistema debe permitir buscar productos por nombre, categoría o código de barras.
- La búsqueda por código de barras debe devolver resultado en menos de 200 ms para soportar el flujo de escaneo en caja.

**RF01.7 — Ajuste manual de stock**
- El sistema debe permitir ajustar el stock de un producto indicando cantidad (positiva o negativa), tipo de movimiento (recepción, ajuste, devolución) y notas opcionales.
- Cada ajuste debe quedar registrado en `inventory_movements`.

---

#### RF02: Punto de Venta (Escaneo + Servicios Rápidos)

**RF02.1 — Agregar ítem por código de barras**
- Al recibir un evento de tipo `barcode` del scanner (vía SSE), el sistema debe buscar automáticamente el producto correspondiente y agregarlo al carrito activo en el POS.

**RF02.2 — Agregar ítem por búsqueda manual**
- El cajero debe poder buscar un producto por nombre o código y agregarlo al carrito sin usar el escáner físico.

**RF02.3 — Modificar cantidad en carrito**
- El cajero debe poder modificar la cantidad de cada ítem del carrito antes de cobrar.

**RF02.4 — Aplicar descuento**
- El sistema debe permitir aplicar un descuento en pesos colombianos (COP) o en porcentaje al total de la venta.

**RF02.5 — Registrar venta**
- Al confirmar el cobro, el sistema debe:
  1. Crear un registro en la tabla `sales` con todos los ítems (snapshot del precio al momento de la venta), subtotal, descuento, total y método de pago.
  2. Reducir el `stock` de cada producto involucrado.
  3. Registrar un movimiento de tipo `sale` en `inventory_movements` por cada producto.
  4. Generar un número de transacción único (`TXN-YYYYMMDD-NNNNN`).

**RF02.6 — Seleccionar método de pago**
- El sistema debe soportar los métodos: efectivo, tarjeta, transferencia bancaria y Nequi.

**RF02.7 — Registrar servicio rápido**
- El cajero debe poder agregar servicios sin producto físico (impresión, fotocopia, escáner, transcripción, trámites digitales) directamente desde botones en el POS.
- Estos ítems se almacenan en el JSONB `items` de `sales` con `productId: null`.

---

#### RF03: Integración Hardware (Arduino + Bridge)

**RF03.1 — Enviar evento de barcode**
- El firmware Arduino debe serializar cada lectura del lector MH-ET V3.0 como un objeto JSON `{"type":"barcode","data":"<codigo>","ts":<unix_ms>}` y enviarlo por Serial a 9600 bps.

**RF03.2 — Enviar evento de temperatura**
- El firmware debe leer el sensor de temperatura interno del ATmega328P cada 30 segundos y serializar el resultado como `{"type":"temp","value":<celsius>,"unit":"C","ts":<unix_ms>}`.

**RF03.3 — Enviar evento de boot**
- Al encender o reiniciar, el Arduino debe enviar `{"type":"boot","ts":<unix_ms>}`.

**RF03.4 — Bridge: reenvío de eventos**
- El bridge-local debe leer cada línea JSON del puerto COM, parsearla y hacer `POST /api/scanner/event` al backend con el header `x-api-key`.

**RF03.5 — Bridge: cola de reintentos**
- Si el backend no está disponible, el bridge debe encolar los eventos en memoria (FIFO, máximo 1000 eventos) y reenviarlos cuando la conexión se restablezca.

**RF03.6 — Bridge: reconexión automática**
- Si el puerto COM se cierra (Arduino desconectado), el bridge debe intentar reconectar cada 5 segundos sin necesidad de reinicio manual.

**RF03.7 — Bridge: autenticación**
- Toda petición del bridge al backend debe incluir el header `x-api-key: <API_KEY>`. El backend debe rechazar con 401 las peticiones sin clave válida.

---

#### RF04: Monitor en Tiempo Real

**RF04.1 — Stream SSE**
- El backend debe exponer `GET /api/scanner/stream` como un endpoint Server-Sent Events que emita cada nuevo evento del scanner en tiempo real a los clientes conectados.

**RF04.2 — Vista de monitor**
- El frontend debe mostrar una vista de monitoreo que se suscriba al SSE y muestre en tiempo real: tipo de evento, datos (código/temperatura), identificador del bridge y timestamp formateado.

**RF04.3 — Historial de eventos**
- El frontend debe permitir consultar los últimos N eventos del scanner desde `GET /api/scanner/events`.

**RF04.4 — Historial de temperaturas**
- El frontend debe mostrar un historial de lecturas de temperatura desde `GET /api/scanner/temperatures`, con visualización de la tendencia (tabla o gráfico simple).

---

#### RF05: Reportes de Ventas

**RF05.1 — Resumen diario**
- El endpoint `GET /api/sales/daily-summary` debe devolver: total de ventas del día, número de transacciones, total por método de pago, y producto más vendido.

**RF05.2 — Historial de ventas**
- El sistema debe listar ventas con paginación, con filtros opcionales por fecha y método de pago.

**RF05.3 — Detalle de venta**
- Al consultar una venta específica, el sistema debe mostrar el snapshot completo de ítems (nombre, precio unitario, cantidad, subtotal) tal como fue registrado en el momento de la transacción.

---

#### RF06: Servicios sin Código de Barras

**RF06.1 — Catálogo de servicios rápidos**
- El POS debe mostrar botones de acceso rápido para: Impresión, Fotocopia, Escáner, Transcripción y Trámites Digitales.
- Cada servicio tiene un precio por defecto configurable.

**RF06.2 — Personalización de precio por transacción**
- El cajero debe poder modificar el precio de un servicio rápido antes de agregarlo al carrito (por ejemplo, cobrar según el número de páginas).

---

### 3.2 Requisitos No Funcionales

---

#### RNF01: Rendimiento

| Métrica | Requisito |
|---|---|
| Latencia búsqueda por código de barras | < 200 ms (p95) en condiciones normales de red |
| Latencia registro de venta | < 500 ms (p95) |
| Latencia evento SSE (Arduino → navegador) | < 1 000 ms end-to-end en condiciones normales |
| Tiempo de carga inicial del frontend | < 3 s en conexión de 10 Mbps |
| Capacidad concurrente | Mínimo 5 usuarios simultáneos sin degradación notable |

---

#### RNF02: Disponibilidad

| Contexto | Requisito |
|---|---|
| Disponibilidad del frontend (Netlify CDN) | 99.9% (garantizado por Netlify) |
| Disponibilidad del backend (Render) | 99.5% en horario comercial (7 a.m.–9 p.m.) |
| Tolerancia a desconexión del backend | El bridge encola hasta 1 000 eventos; la reconexión es automática |
| Tiempo de recuperación de cold start | < 60 s en plan gratuito de Render |

---

#### RNF03: Seguridad

| Control | Descripción |
|---|---|
| Autenticación del bridge | Header `x-api-key` obligatorio en `POST /api/scanner/event`. El backend devuelve 401 si la clave es incorrecta o está ausente. |
| HTTPS en producción | Toda comunicación en producción usa HTTPS. Render y Netlify proveen certificados TLS automáticos. |
| CORS restrictivo | El backend solo acepta peticiones desde los orígenes configurados en `CORS_ORIGINS`. |
| Variables de entorno | Credenciales (API_KEY, DATABASE_URL) nunca se incluyen en el repositorio; se gestionan como variables de entorno. |
| Headers de seguridad HTTP | El frontend configura `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options` y `Referrer-Policy` vía `netlify.toml`. |
| Sin autenticación de usuarios v1.0 | En la versión actual el POS no requiere login. Se asume que el acceso físico al dispositivo es el control de acceso. Esta limitación debe resolverse en v2.0. |

---

#### RNF04: Escalabilidad

- La arquitectura debe permitir escalar horizontalmente el backend sin cambios de código (uso de variables de entorno, sin estado en memoria compartido entre instancias).
- El esquema de BD debe soportar agregar nuevas categorías de productos, métodos de pago y tipos de movimiento de inventario mediante migraciones sin pérdida de datos.
- El bridge puede ser extendido para soportar múltiples Arduinos cambiando `BRIDGE_ID`.

---

#### RNF05: Usabilidad

- El POS debe ser operable con teclado, mouse y/o pantalla táctil.
- Las operaciones más frecuentes (escanear, cobrar, seleccionar método de pago) deben realizarse en máximo 3 clics o pulsaciones de tecla.
- Los mensajes de error deben ser en español y descriptivos (no mostrar stack traces al usuario final).
- La interfaz debe ser responsive: funcionar correctamente en pantallas de 1024 × 768 px o superior.
- El tiempo de entrenamiento de un nuevo cajero no debe superar 30 minutos.

---

### 3.3 Interfaces del Sistema

#### 3.3.1 Interfaces de Hardware

| Interfaz | Descripción |
|---|---|
| **USB Serial (Arduino ↔ PC)** | Protocolo UART encapsulado en USB. Velocidad: 9600 bps. Cada evento se envía como una línea de texto JSON terminada en `\n`. |
| **SoftwareSerial (Arduino ↔ MH-ET V3.0)** | Comunicación UART TTL entre el pin 2 (RX) y pin 3 (TX) del Arduino y el lector de barras. Velocidad: 9600 bps. |
| **ADC Canal 8 (Arduino)** | Lectura analógica del sensor de temperatura interno del ATmega328P. El firmware convierte el valor crudo ADC a grados Celsius con la fórmula del datasheet. |

#### 3.3.2 Interfaces de Software

| Interfaz | Descripción |
|---|---|
| **API REST (NestJS)** | HTTP/1.1. Formato de datos: JSON. Base URL: `/api`. Documentación auto-generada: `/api/docs` (Swagger UI). |
| **SSE Stream** | `GET /api/scanner/stream`. Content-Type: `text/event-stream`. Cada evento se emite como `data: <JSON>\n\n`. |
| **TypeORM ↔ PostgreSQL** | ORM en Node.js que gestiona el esquema, migraciones y consultas. Parámetros de conexión vía `DATABASE_URL`. |
| **Angular HttpClient ↔ API** | El frontend consume la API usando el módulo `HttpClient` de Angular. La URL base se configura como variable de entorno en el build. |

#### 3.3.3 Interfaces de Comunicación

| Canal | Protocolo | Seguridad |
|---|---|---|
| Arduino → PC (bridge) | UART/USB (local) | Sin cifrado (conexión física local) |
| Bridge → Backend | HTTPS POST | TLS 1.3 + API Key en header |
| Frontend → Backend | HTTPS REST + SSE | TLS 1.3 + CORS |
| Backend → PostgreSQL | PostgreSQL wire protocol (TCP) | TLS (gestionado por Render en la red interna del servicio) |
| Usuario → Frontend | HTTPS | TLS 1.3 (Netlify CDN) |
