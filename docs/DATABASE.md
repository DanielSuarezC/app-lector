# Script de Base de Datos
## Sistema IoT Colina Real — Impresiones Colina Real

**Versión**: 1.0
**Fecha**: 2026-05-28
**PostgreSQL requerido**: 15+

---

## Tabla de Contenidos

1. [Configuración de Conexión](#1-configuración-de-conexión)
2. [Script de Creación Completo](#2-script-de-creación-completo)
3. [Datos de Prueba (Seed)](#3-datos-de-prueba-seed)
4. [Script de Reinicio (Solo Desarrollo)](#4-script-de-reinicio-solo-desarrollo)
5. [Migraciones con TypeORM](#5-migraciones-con-typeorm)
6. [Backup y Restauración](#6-backup-y-restauración)

---

## 1. Configuración de Conexión

### Desarrollo local (Docker)

```env
DATABASE_URL=postgresql://colina_real_user:colina_real_dev_pass@localhost:5432/colina_real
```

El archivo `docker-compose.yml` en la raíz del monorepo levanta PostgreSQL 15 con estas credenciales automáticamente:

```bash
# Desde la raíz del proyecto:
docker-compose up -d db
```

### Producción (Render.com)

La `DATABASE_URL` en producción es generada automáticamente por Render al importar `backend/render.yaml`. Se inyecta como variable de entorno en el servicio web.

Formato típico:
```
postgresql://<user>:<password>@<host>.render.com:5432/colina_real
```

---

## 2. Script de Creación Completo

El siguiente script crea el esquema desde cero. Ejecutarlo en orden.

> **Nota**: El backend NestJS con TypeORM puede sincronizar el esquema automáticamente en desarrollo (`synchronize: true`). Este script es útil para inicialización manual, documentación y auditoría académica.

```sql
-- ============================================================
-- Sistema IoT Colina Real — Script de Base de Datos
-- PostgreSQL 15+
-- ============================================================

-- ============================================================
-- 1. CREAR BASE DE DATOS (ejecutar como superusuario)
-- ============================================================

CREATE DATABASE colina_real
    WITH
    OWNER = colina_real_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_CO.UTF-8'
    LC_CTYPE = 'es_CO.UTF-8'
    TEMPLATE = template0;

-- Conectar a la base de datos
\c colina_real;

-- ============================================================
-- 2. EXTENSIONES
-- ============================================================

-- Extensión para generación de UUIDs v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 3. TIPOS ENUM
-- ============================================================

-- Métodos de pago aceptados en el POS
CREATE TYPE payment_method AS ENUM (
    'cash',        -- Efectivo
    'card',        -- Tarjeta débito/crédito
    'transfer',    -- Transferencia bancaria
    'nequi'        -- Nequi (Bancolombia)
);

-- Tipos de evento del scanner Arduino
CREATE TYPE scanner_event_type AS ENUM (
    'barcode',     -- Lectura de código de barras
    'temp',        -- Lectura de temperatura
    'boot'         -- Arranque/reinicio del Arduino
);

-- Tipos de movimiento de inventario
CREATE TYPE movement_type AS ENUM (
    'sale',        -- Salida por venta
    'reception',   -- Entrada por recepción de mercancía
    'adjustment',  -- Ajuste manual de inventario
    'return'       -- Entrada por devolución de cliente
);

-- ============================================================
-- 4. TABLAS
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: products
-- Catálogo de productos con control de stock
-- ------------------------------------------------------------
CREATE TABLE products (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode     VARCHAR(64)     UNIQUE,                         -- Código EAN-8, EAN-13, QR, etc. Nullable
    name        VARCHAR(120)    NOT NULL,                       -- Nombre del producto
    category    VARCHAR(80),                                    -- Categoría opcional
    cost_price  NUMERIC(12, 2)  NOT NULL,                       -- Precio de costo en COP
    sale_price  NUMERIC(12, 2)  NOT NULL,                       -- Precio de venta en COP
    stock       INTEGER         NOT NULL DEFAULT 0,             -- Cantidad disponible
    min_stock   INTEGER         NOT NULL DEFAULT 5,             -- Stock mínimo para alerta
    active      BOOLEAN         NOT NULL DEFAULT TRUE,          -- FALSE = desactivado (soft delete)
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Catálogo de productos del inventario con control de stock.';
COMMENT ON COLUMN products.barcode IS 'Código de barras opcional. NULL si el producto no tiene código físico.';
COMMENT ON COLUMN products.active IS 'Soft delete: FALSE oculta el producto del POS pero preserva el historial.';
COMMENT ON COLUMN products.min_stock IS 'Si stock < min_stock se genera alerta de reabastecimiento.';

-- ------------------------------------------------------------
-- Tabla: sales
-- Registro de transacciones de venta con snapshot de ítems
-- ------------------------------------------------------------
CREATE TABLE sales (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number  VARCHAR(20)     NOT NULL UNIQUE,        -- TXN-YYYYMMDD-NNNNN
    items               JSONB           NOT NULL,               -- SaleItemSnapshot[]
    subtotal            NUMERIC(12, 2)  NOT NULL,               -- Suma antes de descuento
    discount            NUMERIC(12, 2)  NOT NULL DEFAULT 0,     -- Descuento en COP
    total               NUMERIC(12, 2)  NOT NULL,               -- Monto final cobrado
    payment_method      payment_method  NOT NULL,               -- Método de pago
    notes               TEXT,                                   -- Observaciones opcionales
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sales IS 'Registro de ventas. Los ítems son snapshots JSONB para preservar precios históricos.';
COMMENT ON COLUMN sales.items IS
    'Arreglo JSONB de SaleItemSnapshot. Estructura: '
    '[{"productId": "uuid|null", "type": "product|quick-service", '
    '"name": "str", "unitPrice": 0.00, "quantity": 0, "subtotal": 0.00, "barcode": "str|null"}]';
COMMENT ON COLUMN sales.transaction_number IS 'Número de referencia legible. Formato: TXN-YYYYMMDD-NNNNN';

-- ------------------------------------------------------------
-- Tabla: scanner_events
-- Log de todos los eventos enviados por el Arduino vía bridge
-- ------------------------------------------------------------
CREATE TABLE scanner_events (
    id          UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    type        scanner_event_type      NOT NULL,               -- barcode | temp | boot
    data        VARCHAR(64),                                    -- Código de barras (si type=barcode)
    value       NUMERIC(6, 2),                                  -- Temperatura °C (si type=temp)
    unit        VARCHAR(10),                                    -- Unidad del valor (ej: "C")
    ts          BIGINT,                                         -- Timestamp Arduino (millis())
    bridge_id   VARCHAR(60),                                    -- ID del bridge que envió el evento
    received_at TIMESTAMPTZ             NOT NULL DEFAULT NOW()  -- Timestamp del servidor
);

COMMENT ON TABLE scanner_events IS 'Log de eventos del Arduino. Fuente del monitor en tiempo real (SSE).';
COMMENT ON COLUMN scanner_events.ts IS 'Timestamp del Arduino en milisegundos (millis()). Puede ser NULL en eventos de boot.';
COMMENT ON COLUMN scanner_events.received_at IS 'Timestamp del servidor. Más confiable que ts del Arduino.';

-- ------------------------------------------------------------
-- Tabla: inventory_movements
-- Auditoría de todos los cambios de stock
-- ------------------------------------------------------------
CREATE TABLE inventory_movements (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID            NOT NULL
                                    REFERENCES products(id) ON DELETE CASCADE,
    type            movement_type   NOT NULL,                   -- sale | reception | adjustment | return
    quantity        INTEGER         NOT NULL,                   -- Positivo = entrada, Negativo = salida
    stock_before    INTEGER         NOT NULL,                   -- Stock antes del movimiento
    stock_after     INTEGER         NOT NULL,                   -- Stock después del movimiento
    source          VARCHAR(40)     NOT NULL,                   -- Origen (TXN, manual, etc.)
    notes           TEXT,                                       -- Notas opcionales
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory_movements IS 'Auditoría de cambios de stock. Permite reconstruir el historial de inventario.';
COMMENT ON COLUMN inventory_movements.quantity IS 'Cantidad del cambio. Positivo = entrada. Negativo = salida.';
COMMENT ON COLUMN inventory_movements.source IS 'Origen del movimiento. Ej: TXN-20260528-00001, manual-adjustment.';

-- ============================================================
-- 5. ÍNDICES
-- ============================================================

-- products: búsqueda rápida por código de barras (flujo POS crítico)
CREATE INDEX idx_products_barcode
    ON products(barcode)
    WHERE barcode IS NOT NULL;

-- products: filtrar activos eficientemente
CREATE INDEX idx_products_active
    ON products(active);

-- products: búsqueda por nombre (LIKE insensible a mayúsculas)
CREATE INDEX idx_products_name_lower
    ON products(lower(name));

-- sales: consultas por rango de fechas (reportes diarios)
CREATE INDEX idx_sales_created_at
    ON sales(created_at);

-- sales: acceso rápido por número de transacción
CREATE INDEX idx_sales_transaction_number
    ON sales(transaction_number);

-- scanner_events: filtrar por tipo de evento
CREATE INDEX idx_scanner_events_type
    ON scanner_events(type);

-- scanner_events: eventos recientes para el monitor
CREATE INDEX idx_scanner_events_received_at
    ON scanner_events(received_at DESC);

-- inventory_movements: historial de un producto
CREATE INDEX idx_inventory_movements_product_id
    ON inventory_movements(product_id);

-- inventory_movements: movimientos por fecha
CREATE INDEX idx_inventory_movements_created_at
    ON inventory_movements(created_at);

-- ============================================================
-- 6. FUNCIONES Y TRIGGERS
-- ============================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger en products: actualizar updated_at al modificar
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. RESTRICCIONES ADICIONALES
-- ============================================================

-- stock no puede ser negativo
ALTER TABLE products
    ADD CONSTRAINT chk_products_stock_non_negative
    CHECK (stock >= 0);

-- min_stock debe ser positivo
ALTER TABLE products
    ADD CONSTRAINT chk_products_min_stock_positive
    CHECK (min_stock >= 0);

-- cost_price y sale_price deben ser positivos
ALTER TABLE products
    ADD CONSTRAINT chk_products_cost_price_positive
    CHECK (cost_price >= 0);

ALTER TABLE products
    ADD CONSTRAINT chk_products_sale_price_positive
    CHECK (sale_price >= 0);

-- total debe ser igual a subtotal - discount
ALTER TABLE sales
    ADD CONSTRAINT chk_sales_total_consistency
    CHECK (total = subtotal - discount);

-- discount no puede ser negativo
ALTER TABLE sales
    ADD CONSTRAINT chk_sales_discount_non_negative
    CHECK (discount >= 0);

-- stock_after = stock_before + quantity
ALTER TABLE inventory_movements
    ADD CONSTRAINT chk_movements_stock_consistency
    CHECK (stock_after = stock_before + quantity);
```

---

## 3. Datos de Prueba (Seed)

Ejecutar este script para poblar la base de datos con datos de demostración:

```sql
-- ============================================================
-- SEED — Datos de prueba para Colina Real
-- ============================================================

-- ------------------------------------------------------------
-- Categorías de ejemplo (papelería)
-- ------------------------------------------------------------

INSERT INTO products (barcode, name, category, cost_price, sale_price, stock, min_stock) VALUES
-- Papelería básica
('7702001000001', 'Resma Papel Carta 75g',        'Papelería',    18000.00, 25000.00, 15, 3),
('7702001000002', 'Resma Papel Oficio 75g',        'Papelería',    20000.00, 27000.00, 10, 3),
('7702001000003', 'Esfero Azul Kilométrico',       'Papelería',      350.00,   700.00, 50, 10),
('7702001000004', 'Esfero Negro Kilométrico',      'Papelería',      350.00,   700.00, 50, 10),
('7702001000005', 'Lápiz HB Mongol',               'Papelería',      300.00,   600.00, 40, 10),
('7702001000006', 'Borrador Pelikan',               'Papelería',      200.00,   500.00, 30, 10),
('7702001000007', 'Regla 30cm Transparente',       'Papelería',      600.00,  1200.00, 20, 5),
('7702001000008', 'Tijeras Escolar 15cm',          'Papelería',     1500.00,  3000.00, 15, 5),

-- Tóner e insumos
('7702001000009', 'Tóner HP 85A Negro',            'Insumos',      38000.00, 55000.00,  5, 2),
('7702001000010', 'Tóner Samsung MLT-D101S',       'Insumos',      35000.00, 50000.00,  4, 2),

-- Encuadernación
('7702001000011', 'Argolla Plástica 1/2"  x 100',  'Encuadernación', 4500.00,  8000.00, 10, 3),
('7702001000012', 'Argolla Plástica 3/4"  x 100',  'Encuadernación', 5500.00,  9000.00,  8, 3),
('7702001000013', 'Acetato Transparente A4 x 50',  'Encuadernación', 8000.00, 14000.00,  6, 2),
('7702001000014', 'Tapa Negra para Argollado x 50','Encuadernación', 5000.00,  9000.00,  5, 2),

-- Producto con stock bajo (para probar alertas)
('7702001000015', 'Marcador Permanente Negro',     'Papelería',      800.00,  1500.00,  2, 5),

-- Producto sin código de barras
(NULL,             'Carpeta de Colgar',            'Papelería',     1200.00,  2500.00, 12, 3);

-- ------------------------------------------------------------
-- Movimientos de inventario iniciales (recepción de mercancía)
-- ------------------------------------------------------------

INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, source, notes)
SELECT
    id,
    'reception',
    stock,
    0,
    stock,
    'initial-stock',
    'Inventario inicial — carga de datos de prueba'
FROM products;

-- ------------------------------------------------------------
-- Ventas de ejemplo
-- ------------------------------------------------------------

INSERT INTO sales (transaction_number, items, subtotal, discount, total, payment_method, notes)
VALUES
(
    'TXN-20260528-00001',
    '[
        {
            "productId": null,
            "type": "quick-service",
            "name": "Impresión Blanco y Negro",
            "unitPrice": 200,
            "quantity": 10,
            "subtotal": 2000,
            "barcode": null
        },
        {
            "productId": null,
            "type": "quick-service",
            "name": "Fotocopia",
            "unitPrice": 200,
            "quantity": 5,
            "subtotal": 1000,
            "barcode": null
        }
    ]'::jsonb,
    3000.00,
    0.00,
    3000.00,
    'cash',
    'Cliente lleva fotocopias de cédula y recibos'
),
(
    'TXN-20260528-00002',
    '[
        {
            "productId": null,
            "type": "product",
            "name": "Resma Papel Carta 75g",
            "unitPrice": 25000,
            "quantity": 2,
            "subtotal": 50000,
            "barcode": "7702001000001"
        },
        {
            "productId": null,
            "type": "product",
            "name": "Esfero Azul Kilométrico",
            "unitPrice": 700,
            "quantity": 3,
            "subtotal": 2100,
            "barcode": "7702001000003"
        }
    ]'::jsonb,
    52100.00,
    0.00,
    52100.00,
    'transfer',
    NULL
),
(
    'TXN-20260528-00003',
    '[
        {
            "productId": null,
            "type": "quick-service",
            "name": "Trámites Digitales",
            "unitPrice": 5000,
            "quantity": 1,
            "subtotal": 5000,
            "barcode": null
        }
    ]'::jsonb,
    5000.00,
    500.00,
    4500.00,
    'nequi',
    'Descuento cliente frecuente'
);

-- ------------------------------------------------------------
-- Eventos del scanner de ejemplo
-- ------------------------------------------------------------

INSERT INTO scanner_events (type, data, value, unit, ts, bridge_id) VALUES
('boot',    NULL,               NULL,  NULL, 0,             'bridge-colina-real-01'),
('temp',    NULL,               27.50, 'C',  1748400000000, 'bridge-colina-real-01'),
('barcode', '7702001000001',    NULL,  NULL, 1748400010000, 'bridge-colina-real-01'),
('barcode', '7702001000003',    NULL,  NULL, 1748400020000, 'bridge-colina-real-01'),
('temp',    NULL,               28.10, 'C',  1748400030000, 'bridge-colina-real-01'),
('barcode', '7702001000009',    NULL,  NULL, 1748400040000, 'bridge-colina-real-01');
```

---

## 4. Script de Reinicio (Solo Desarrollo)

**ADVERTENCIA**: Este script elimina todos los datos. Usar solo en entornos de desarrollo.

```sql
-- ============================================================
-- RESET — Eliminar esquema completo (DEV ONLY)
-- ============================================================

-- Deshabilitar checks de FK temporalmente
SET session_replication_role = 'replica';

-- Eliminar tablas en orden correcto (dependencias primero)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS scanner_events CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Eliminar tipos enum
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS scanner_event_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;

-- Eliminar funciones y triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Rehabilitar checks de FK
SET session_replication_role = 'origin';

-- Verificar que no quedan tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Debe devolver 0 filas
```

Para reiniciar y recrear desde cero en desarrollo:

```bash
# Opción 1: Recrear el contenedor Docker completo
docker-compose down -v
docker-compose up -d db

# Opción 2: Conectarse y ejecutar el script
docker exec -it <nombre_contenedor_db> psql -U colina_real_user -d colina_real -f /reset.sql
```

---

## 5. Migraciones con TypeORM

El backend usa TypeORM con las siguientes configuraciones por entorno:

### Desarrollo (`NODE_ENV=development`)

TypeORM sincroniza el esquema automáticamente (`synchronize: true`). No es necesario correr migraciones manualmente. Los cambios en las entidades se aplican al reiniciar el servidor.

### Producción (`NODE_ENV=production`)

TypeORM tiene `synchronize: false`. Los cambios de esquema se aplican mediante migraciones.

**Generar una migración:**

```bash
cd backend
npm run migration:generate -- src/migrations/NombreDeLaMigracion
```

**Ejecutar migraciones pendientes:**

```bash
npm run migration:run
```

**Revertir la última migración:**

```bash
npm run migration:revert
```

Los archivos de migración se guardan en `backend/src/migrations/`.

---

## 6. Backup y Restauración

### Backup manual (local)

```bash
# Backup completo de la base de datos:
docker exec <nombre_contenedor_db> pg_dump -U colina_real_user colina_real > backup_$(date +%Y%m%d).sql

# Backup solo del esquema (sin datos):
docker exec <nombre_contenedor_db> pg_dump -U colina_real_user --schema-only colina_real > schema_$(date +%Y%m%d).sql

# Backup solo de datos:
docker exec <nombre_contenedor_db> pg_dump -U colina_real_user --data-only colina_real > data_$(date +%Y%m%d).sql
```

### Restaurar un backup

```bash
# Restaurar desde un archivo .sql:
docker exec -i <nombre_contenedor_db> psql -U colina_real_user -d colina_real < backup_20260528.sql
```

### Backup en Render.com

Render no provee backups automáticos en el plan gratuito. Para el plan gratuito:
1. Usar el dashboard de Render para descargar un backup manual desde la sección de la base de datos.
2. Opcionalmente, configurar un cron job externo que ejecute `pg_dump` periódicamente contra la URL de conexión de Render.

> **Importante**: En el plan gratuito de Render, la base de datos es eliminada si el servicio no tiene actividad durante 90 días. Haz backups periódicos.

---

## Referencia Rápida de Conexión

| Entorno | Host | Puerto | BD | Usuario | Contraseña |
|---|---|---|---|---|---|
| Docker local | `localhost` | `5432` | `colina_real` | `colina_real_user` | `colina_real_dev_pass` |
| Producción (Render) | `<host>.render.com` | `5432` | `colina_real` | Auto-generado | Auto-generado |

Verificar conexión desde la terminal:

```bash
# Local (Docker):
psql postgresql://colina_real_user:colina_real_dev_pass@localhost:5432/colina_real

# Producción:
psql <DATABASE_URL_DE_RENDER>
```

Verificar que las tablas existen:

```sql
\dt
-- Debe mostrar: products, sales, scanner_events, inventory_movements
```
