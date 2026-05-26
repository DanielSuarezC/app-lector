# Firmware — Arduino Uno R3

## Descripción

Sketch Arduino que implementa los dos sensores del sistema:

1. **MH-ET V3.0** (barcode scanner): lee por SoftwareSerial (D2=RX, D3=TX) y envía el código leído por Serial USB.
2. **ATmega328P internal temp**: accede al canal ADC8 interno con referencia 1.1V y envía la temperatura cada 10 segundos.

## Conexión de hardware

```
Arduino D2 (RX SoftSerial) ◄── TX  del MH-ET V3.0
Arduino D3 (TX SoftSerial) ──► RX  del MH-ET V3.0
Arduino 5V                 ──► VCC del MH-ET V3.0
Arduino GND                ──► GND del MH-ET V3.0
Arduino USB-B              ──► PC (bridge-local)
```

## Cargar el firmware

1. Instalar [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. Abrir `firmware/src/main.ino`
3. Seleccionar **Board:** `Arduino Uno` y el **Port:** correspondiente (ej. `COM3`)
4. Hacer clic en **Upload** (→)

## Protocolo de salida (Serial 9600 bps)

Cada mensaje es una línea JSON terminada en `\n`:

| Tipo | Ejemplo |
|---|---|
| Boot | `{"type":"boot","firmware":"1.0.0","ts":0}` |
| Barcode | `{"type":"barcode","data":"7700999012345","ts":1234}` |
| Temperatura | `{"type":"temp","value":29.5,"unit":"C","ts":10}` |

El campo `ts` es `millis()/1000` (segundos desde el arranque). El bridge-local reemplaza este campo con el timestamp UTC real del servidor.

## Configurar baudrate del scanner MH-ET V3.0

El scanner sale de fábrica a 9600 bps. Si tu unidad está en un baudrate diferente, puedes reconfigurarlo escaneando los códigos de setup incluidos en el manual del MH-ET V3.0, sección "Baud Rate Setup".
