import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1748400000000 implements MigrationInterface {
  name = 'InitialSchema1748400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Enum: métodos de pago (tabla sales, columna paymentMethod)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."sales_paymentmethod_enum" AS ENUM ('cash', 'card', 'transfer', 'nequi');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // Enum: tipo de movimiento de inventario
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."inventory_movements_type_enum" AS ENUM ('sale', 'reception', 'adjustment', 'return');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // Enum: tipo de evento del scanner
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."scanner_events_type_enum" AS ENUM ('barcode', 'temp', 'boot');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // Tabla products
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id"        uuid                NOT NULL DEFAULT gen_random_uuid(),
        "barcode"   character varying(64),
        "name"      character varying(120) NOT NULL,
        "category"  character varying(80),
        "costPrice" numeric(12,2)       NOT NULL,
        "salePrice" numeric(12,2)       NOT NULL,
        "stock"     integer             NOT NULL DEFAULT 0,
        "minStock"  integer             NOT NULL DEFAULT 5,
        "active"    boolean             NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP           NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_barcode" UNIQUE ("barcode"),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    // Tabla sales
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales" (
        "id"                uuid                                  NOT NULL DEFAULT gen_random_uuid(),
        "transactionNumber" character varying(20)                 NOT NULL,
        "items"             jsonb                                 NOT NULL,
        "subtotal"          numeric(12,2)                         NOT NULL,
        "discount"          numeric(12,2)                         NOT NULL DEFAULT 0,
        "total"             numeric(12,2)                         NOT NULL,
        "paymentMethod"     "public"."sales_paymentmethod_enum"   NOT NULL,
        "notes"             character varying,
        "createdAt"         TIMESTAMP                             NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sales_transactionNumber" UNIQUE ("transactionNumber"),
        CONSTRAINT "PK_sales" PRIMARY KEY ("id")
      )
    `);

    // Tabla scanner_events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scanner_events" (
        "id"         uuid                                    NOT NULL DEFAULT gen_random_uuid(),
        "type"       "public"."scanner_events_type_enum"     NOT NULL,
        "data"       character varying(64),
        "value"      numeric(6,2),
        "unit"       character varying(10),
        "ts"         bigint,
        "bridgeId"   character varying(60),
        "receivedAt" TIMESTAMP                               NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scanner_events" PRIMARY KEY ("id")
      )
    `);

    // Tabla inventory_movements
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_movements" (
        "id"          uuid                                          NOT NULL DEFAULT gen_random_uuid(),
        "productId"   uuid                                          NOT NULL,
        "type"        "public"."inventory_movements_type_enum"      NOT NULL,
        "quantity"    integer                                       NOT NULL,
        "stockBefore" integer                                       NOT NULL,
        "stockAfter"  integer                                       NOT NULL,
        "source"      character varying(40),
        "notes"       character varying,
        "createdAt"   TIMESTAMP                                     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_movements_product"
          FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Índices para rendimiento
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_barcode"    ON "products"("barcode")   WHERE "barcode" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_active"     ON "products"("active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sales_createdAt"     ON "sales"("createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scanner_receivedAt"  ON "scanner_events"("receivedAt" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_movements_productId" ON "inventory_movements"("productId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_movements_createdAt" ON "inventory_movements"("createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scanner_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."scanner_events_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."inventory_movements_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."sales_paymentmethod_enum"`);
  }
}
