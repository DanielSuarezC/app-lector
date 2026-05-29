/*
 * IoT Inventario & POS — Impresiones Colina Real
 * Firmware Arduino Uno R3
 *
 * Sensores:
 *   1. MH-ET V3.0 barcode scanner — SoftwareSerial RX=D2, TX=D3 a 9600 bps
 *   2. ATmega328P internal temperature sensor — ADC channel 8, Vref interna 1.1V
 *
 * Salida: JSON delimitado por '\n' por Serial USB a 9600 bps
 *   Barcode: {"type":"barcode","data":"XXXX","ts":NNNN}
 *   Temp:    {"type":"temp","value":XX.X,"unit":"C","ts":NNNN}
 */

#include <SoftwareSerial.h>

// Scanner conectado a pines D2 (RX) y D3 (TX)
SoftwareSerial scannerSerial(2, 3);

static const unsigned long BAUD_SERIAL   = 115200UL;
static const unsigned long BAUD_SCANNER  = 9600UL;
static const unsigned long TEMP_INTERVAL = 100000UL; // ms entre lecturas de temperatura - 1m 4 segundos

// Offset de calibración del sensor interno del ATmega328P.
// El valor 324 del datasheet varía por chip. Para calibrar:
//   1. Mide la temperatura real del chip con un termómetro de contacto.
//   2. Observa el campo "raw" en el JSON de telemetría.
//   3. Calcula: TEMP_ADC_OFFSET = raw_observado - (temp_real_C × 1.22)
static const int TEMP_ADC_OFFSET = 278;

static unsigned long lastTempMs = 0;
static int           lastRawAdc  = 0;  // guardado para incluirlo en telemetría

// ---------------------------------------------------------------------------
// Lectura de temperatura interna del ATmega328P
// Accede al canal ADC8 (no expuesto en pines) con referencia interna 1.1V
// Precisión: ±10°C — uso cualitativo para telemetría del nodo
// ---------------------------------------------------------------------------
float readInternalTempC() {
  // Guardar estado previo del ADC
  uint8_t admuxPrev = ADMUX;
  uint8_t adcsraPrev = ADCSRA;

  // Seleccionar: REFS1=1, REFS0=1 → referencia interna 1.1V; MUX=0b1000 → canal 8 (temp)
  ADMUX = (_BV(REFS1) | _BV(REFS0) | 0x08);
  // Habilitar ADC, prescaler /128 (62.5 kHz a 16 MHz)
  ADCSRA = _BV(ADEN) | _BV(ADPS2) | _BV(ADPS1) | _BV(ADPS0);
  delay(20); // Estabilizar referencia interna

  // Conversión de descarte (primera lectura puede ser imprecisa)
  ADCSRA |= _BV(ADSC);
  while (ADCSRA & _BV(ADSC));

  // Conversión real
  ADCSRA |= _BV(ADSC);
  while (ADCSRA & _BV(ADSC));
  int raw = ADC;

  // Restaurar ADC al estado previo
  ADMUX = admuxPrev;
  ADCSRA = adcsraPrev;

  lastRawAdc = raw;  // exponer para telemetría / recalibración

  // Ecuación de calibración (ATmega328P datasheet, sección 24.8)
  // T(°C) = (ADC - offset) / 1.22
  // offset=324 es el valor típico del datasheet; varía por chip.
  // Ajustar TEMP_ADC_OFFSET midiendo la temperatura real del chip con
  // un termómetro y aplicando: offset = raw_leído - (temp_real × 1.22)
  return (float)(raw - TEMP_ADC_OFFSET) / 1.22f;
}

// ---------------------------------------------------------------------------
// Serializa y envía un evento de código de barras por Serial USB
// ---------------------------------------------------------------------------
void sendBarcodeEvent(const String& barcode) {
  unsigned long ts = millis() / 1000UL;
  Serial.print(F("{\"type\":\"barcode\",\"data\":\""));
  Serial.print(barcode);
  Serial.print(F("\",\"ts\":"));
  Serial.print(ts);
  Serial.println(F("}"));
}

// ---------------------------------------------------------------------------
// Serializa y envía un evento de temperatura por Serial USB
// ---------------------------------------------------------------------------
void sendTempEvent(float tempC) {
  unsigned long ts = millis() / 1000UL;
  // Formatear con 1 decimal sin sprintf para evitar overhead de memoria
  int whole = (int)tempC; 
  int frac  = abs((int)((tempC - (float)whole) * 10.0f));
  Serial.print(F("{\"type\":\"temp\",\"value\":"));
  Serial.print(whole);
  Serial.print('.');
  Serial.print(frac);
  Serial.print(F(",\"unit\":\"C\",\"raw\":"));
  Serial.print(lastRawAdc);
  Serial.print(F(",\"ts\":"));
  Serial.print(ts);
  Serial.println(F("}"));
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(BAUD_SERIAL);
  scannerSerial.begin(BAUD_SCANNER);

  // Señal de inicio: permite al bridge-local detectar que el Arduino está listo
  Serial.println(F("{\"type\":\"boot\",\"firmware\":\"1.0.0\",\"ts\":0}"));
}

// ---------------------------------------------------------------------------
// loop principal
// ---------------------------------------------------------------------------
void loop() {
  // --- Leer scanner: acumula caracteres hasta '\n' o '\r' ---
  static String scannerBuf = "";
  static bool   reading    = false;

  while (scannerSerial.available()) {
    char c = (char)scannerSerial.read();
    if (c == '\r' || c == '\n') {
      if (scannerBuf.length() > 0) {
        scannerBuf.trim();
        sendBarcodeEvent(scannerBuf);
        scannerBuf = "";
      }
      reading = false;
    } else if (c >= 0x20 && c <= 0x7E) {
      // Solo aceptar caracteres ASCII imprimibles
      scannerBuf += c;
      reading = true;
      // Protección contra buffer overflow
      if (scannerBuf.length() > 64) {
        scannerBuf = "";
        reading = false;
      }
    }
  }

  // --- Leer temperatura periódicamente ---
  unsigned long now = millis();
  if (now - lastTempMs >= TEMP_INTERVAL) {
    lastTempMs = now;
    float tempC = readInternalTempC();
    sendTempEvent(tempC);
  }
}
