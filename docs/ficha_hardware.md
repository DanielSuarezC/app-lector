# Ficha de Hardware — Sistema IoT Impresiones Colina Real

| **Nombre del Proyecto:** | | **Plataforma:** |
|---|---|---|
| Sistema IoT de Inventario y Punto de Venta — Impresiones Colina Real | | Arduino Uno R3 |

| **Funcionalidad** | **Descripción** | **Dispositivo / Sensor** |
|---|---|---|
| Lectura óptica de productos | El dispositivo lee el código de barras (EAN-13, Code128, QR) impreso en cada producto de la papelería. El escáner MH-ET V3.0 decodifica el símbolo y transmite el string alfanumérico por su línea UART-TX (TTL 3.3 V / 5 V tolerante) conectada al pin **D2** del Arduino (SoftwareSerial RX). El Arduino retransmite el código recibido al PC vía USB-Serial a 9600 bps encapsulado en JSON: `{"type":"barcode","data":"7700999000123","ts":1234567890}`. | **Sensor 1:** Lector de código de barras MH-ET V3.0 (UART TTL) |
| Monitoreo de temperatura del sistema | El Arduino lee el sensor de temperatura **interno** del microcontrolador ATmega328P (canal ADC8, referencia interna de 1.1 V). Cada 10 segundos envía por Serial la lectura: `{"type":"temp","value":28.5,"unit":"C","ts":1234567890}`. Permite detectar sobrecalentamiento del nodo embebido en condiciones de operación continua. | **Sensor 2:** Sensor de temperatura interno del chip ATmega328P |
| Conectividad con el PC anfitrión | El Arduino Uno R3 se conecta al PC a través de su **puerto USB** (USB-B a USB-A). El chip CH340/ATmega16U2 expone un puerto COM virtual. El script `bridge-local` (Node.js) escucha ese puerto y retransmite los mensajes JSON al backend en la nube vía HTTP POST. | Cable USB-B / Puerto COM Virtual |

## Diagrama de conexión de hardware

```
  PC (bridge-local)
       │ USB-B
       ▼
 ┌─────────────────────────────────┐
 │        Arduino Uno R3           │
 │                                 │
 │  D2 (RX SoftSerial) ◄──────────┤◄── TX  ┌─────────────────┐
 │  D3 (TX SoftSerial) ────────────┤──► RX  │  MH-ET V3.0     │
 │                                 │        │  (Barcode)      │
 │  5V ───────────────────────────►│──► VCC └─────────────────┘
 │  GND ──────────────────────────►│──► GND
 │                                 │
 │  ADC8 (interno ATmega328P)      │  ← Temperatura interna
 └─────────────────────────────────┘
```

## Especificaciones técnicas

| Componente | Especificación |
|---|---|
| Microcontrolador | ATmega328P @ 16 MHz, 5 V |
| Flash / SRAM | 32 KB / 2 KB |
| Comunicación PC | USB-Serial (CH340/ATmega16U2), 9600 bps |
| Scanner baudrate | 9600 bps (configurable por escaneo de código de setup) |
| Rango lectura scanner | 3 – 30 cm (óptimo 10 cm), ángulo ±60° |
| Códigos soportados | EAN-8, EAN-13, Code128, Code39, QR, DataMatrix |
| Alimentación | 5 V USB (500 mA máximo) |
| Precisión temperatura interna | ± 10 °C (referencia, uso cualitativo) |
