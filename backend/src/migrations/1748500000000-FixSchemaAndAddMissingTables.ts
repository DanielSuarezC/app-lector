import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSchemaAndAddMissingTables1748500000000 implements MigrationInterface {
  name = 'FixSchemaAndAddMissingTables1748500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── CREATE ENUMS ─────────────────────────────────────────────────────────

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."products_type_enum" AS ENUM ('product', 'service');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."products_sold_by_enum" AS ENUM ('unit', 'box');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // ── FIX products TABLE ────────────────────────────────────────────────────

    // Rename camelCase columns → snake_case (only if they exist from old migration)
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'products' AND column_name = 'costPrice') THEN
          ALTER TABLE "products" RENAME COLUMN "costPrice" TO cost_price;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'products' AND column_name = 'salePrice') THEN
          ALTER TABLE "products" RENAME COLUMN "salePrice" TO sale_price;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'products' AND column_name = 'minStock') THEN
          ALTER TABLE "products" RENAME COLUMN "minStock" TO min_stock;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'products' AND column_name = 'createdAt') THEN
          ALTER TABLE "products" RENAME COLUMN "createdAt" TO created_at;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'products' AND column_name = 'updatedAt') THEN
          ALTER TABLE "products" RENAME COLUMN "updatedAt" TO updated_at;
        END IF;
      END $$
    `);

    // Add new columns to products
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "system_code" character varying(20) UNIQUE`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "type" "public"."products_type_enum" NOT NULL DEFAULT 'product'`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "available_for_sale" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sold_by" "public"."products_sold_by_enum" NOT NULL DEFAULT 'unit'`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "track_inventory" boolean NOT NULL DEFAULT true`);

    // Ensure snake_case columns exist for fresh deployments
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cost_price" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sale_price" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "min_stock" integer NOT NULL DEFAULT 5`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);

    // ── FIX sales TABLE ───────────────────────────────────────────────────────

    // Drop old enum paymentMethod column (type changed to varchar in entity)
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales' AND column_name = 'paymentMethod') THEN
          ALTER TABLE "sales" DROP COLUMN "paymentMethod";
        END IF;
      END $$
    `);

    // Rename transactionNumber → transaction_number
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales' AND column_name = 'transactionNumber') THEN
          ALTER TABLE "sales" RENAME COLUMN "transactionNumber" TO transaction_number;
          ALTER TABLE "sales" ALTER COLUMN transaction_number DROP NOT NULL;
        END IF;
      END $$
    `);

    // Rename createdAt → created_at in sales
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales' AND column_name = 'createdAt') THEN
          ALTER TABLE "sales" RENAME COLUMN "createdAt" TO created_at;
        END IF;
      END $$
    `);

    // Ensure new columns exist in sales for fresh deployments
    await queryRunner.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "transaction_number" character varying(20) UNIQUE`);
    await queryRunner.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_method" character varying(60)`);
    await queryRunner.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "notes" character varying`);
    await queryRunner.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`);

    // ── CREATE payment_methods TABLE ─────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_methods" (
        "id"        uuid                  NOT NULL DEFAULT gen_random_uuid(),
        "name"      character varying(60) NOT NULL,
        "key"       character varying(30) NOT NULL,
        "active"    boolean               NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP             NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payment_methods_name" UNIQUE ("name"),
        CONSTRAINT "UQ_payment_methods_key"  UNIQUE ("key"),
        CONSTRAINT "PK_payment_methods" PRIMARY KEY ("id")
      )
    `);

    // ── CREATE categories TABLE ───────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id"          uuid                   NOT NULL DEFAULT gen_random_uuid(),
        "name"        character varying(80)  NOT NULL,
        "description" character varying(255),
        "active"      boolean                NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP              NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP              NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // ── CREATE product_variants TABLE ─────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variants" (
        "id"           uuid                   NOT NULL DEFAULT gen_random_uuid(),
        "product_id"   uuid                   NOT NULL,
        "system_code"  character varying(20)  UNIQUE,
        "option_name"  character varying(60)  NOT NULL,
        "option_value" character varying(120) NOT NULL,
        "cost_price"   numeric(12,2)          NOT NULL DEFAULT 0,
        "sale_price"   numeric(12,2)          NOT NULL DEFAULT 0,
        "barcode"      character varying(64),
        "stock"        integer                NOT NULL DEFAULT 0,
        "min_stock"    integer                NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMP              NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP              NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_variants_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_methods"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."products_sold_by_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."products_type_enum"`);
  }
}
