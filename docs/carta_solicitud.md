# Carta de Solicitud de Implementación del Sistema IoT
## Impresiones Colina Real — Proyecto de Aula Semestral

---

**Ciudad y fecha:** _______________, _____ de __________ de 2026

**Señores:**
Dirección Académica
Programa de Ingeniería de Sistemas / Arquitectura y Sistemas Operativos
Universidad ___________________________

**Asunto:** Solicitud de aprobación para implementación del Sistema IoT de Inventario y Punto de Venta en la papelería Impresiones Colina Real.

---

Estimados docentes y directivos,

Por medio de la presente, el equipo de estudiantes que suscribe solicita respetuosamente la aprobación para desarrollar e implementar el **Sistema IoT de Inventario y Punto de Venta** como Proyecto de Aula Semestral (PAS) de la asignatura de Arquitectura y Sistemas Operativos.

### 1. Descripción del proyecto

La papelería **Impresiones Colina Real** opera actualmente sin un sistema automatizado de control de inventario ni de registro de ventas. El proceso manual genera errores de conteo, pérdidas por desabastecimiento y dificultades para identificar los productos de mayor rotación.

El sistema propuesto conecta hardware embebido con software en la nube para automatizar el registro de entradas y salidas de mercancía mediante lectura óptica de códigos de barras:

- **Nodo embebido:** Arduino Uno R3 conectado al PC de la tienda vía USB. Lee códigos de barras a través del escáner MH-ET V3.0 en modo UART y monitorea la temperatura interna del chip ATmega328P para supervisión del hardware.
- **Software de puente (bridge-local):** Script Node.js que corre en el mismo PC, escucha el puerto COM virtual del Arduino y retransmite cada lectura al backend en la nube mediante HTTP POST.
- **Backend en la nube:** API REST construida con NestJS alojada en Render.com, con base de datos PostgreSQL. Gestiona el catálogo de productos, el inventario y el registro de ventas.
- **Frontend web:** Aplicación Angular alojada en Netlify, con dos módulos principales: (1) **POS** (punto de venta para el cajero) y (2) **Backoffice** (gestión de inventario para el administrador).

### 2. Justificación tecnológica de los sensores

El proyecto cumple con el requisito mínimo de **dos sensores de recolección de datos**:

| # | Sensor | Justificación |
|---|---|---|
| 1 | **Lector MH-ET V3.0** | Sensor óptico-electrónico que decodifica patrones de luz reflejada en códigos de barras. Cada lectura exitosa genera un dato estructurado (código EAN/Code128) que entra al sistema de inventario. |
| 2 | **Termómetro interno ATmega328P** | Canal ADC8 del microcontrolador. Sensor de temperatura integrado en silicio, accesible por registros de hardware. Provee telemetría del nodo embebido sin requerir componentes adicionales. |

### 3. Componentes excluidos

A diferencia de otras configuraciones de Arduino, este proyecto **no utiliza**:
- Módulo Bluetooth HC-06 (la conectividad se realiza por USB-Serial y HTTP sobre la red existente de la tienda).
- Sensor PIR (la detección de presencia no es relevante para el flujo de inventario y ventas).
- Pantalla OLED ni pantalla LCD (la interfaz de usuario es la aplicación web Angular).
- Módulo ESP32 (el Arduino Uno R3 es suficiente para el rol de nodo lector, y la conectividad a Internet se delega al PC anfitrión vía bridge-local).

### 4. Beneficios esperados

1. Reducción del tiempo de registro de productos de ~3 minutos/ítem a < 2 segundos.
2. Eliminación de errores de conteo por transcripción manual.
3. Alertas automáticas de stock bajo para 100% de los SKUs registrados.
4. Generación de reportes de ventas diarios en formato digital (CSV / PDF).
5. Acceso remoto al inventario desde cualquier dispositivo con navegador web.

### 5. Compromiso del equipo

El equipo se compromete a entregar el sistema funcional, con documentación técnica y académica completa (fichas de hardware y software, documento PAS, código fuente en GitHub), en el plazo establecido por la asignatura.

Agradecemos la atención prestada a la presente solicitud y quedamos atentos a cualquier observación.

Atentamente,

| Integrante | Código | Firma |
|---|---|---|
| ___________________________ | __________ | __________ |
| ___________________________ | __________ | __________ |
| ___________________________ | __________ | __________ |

---
*Documento generado como parte del Proyecto de Aula Semestral — Arquitectura y Sistemas Operativos, 2026.*
