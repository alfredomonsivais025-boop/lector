/*
# Parker Hannifin - Scanner App Tables

## Summary
Creates two tables for the barcode scanner application used on Zebra TC22R devices.

## New Tables

### employees
Stores employee credential data for identification scanning.
- id: UUID primary key
- employee_code: unique barcode string scanned from employee badge
- name: employee display name
- created_at: record creation timestamp

### scan_records
Stores each validated product scan with employee, product code, date and time.
- id: UUID primary key
- employee_code: barcode scanned from employee badge
- employee_name: name of the employee who scanned
- product_code: validated product barcode (confirmed by 2 matching scans)
- scanned_at: UTC timestamp of the scan event
- week_number: ISO week number for grouping/reset logic
- year_number: year for grouping

## Security
- RLS enabled on both tables
- anon + authenticated can perform full CRUD (single-tenant, no login)
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS scan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL,
  employee_name text NOT NULL,
  product_code text NOT NULL,
  scanned_at timestamptz DEFAULT now(),
  week_number int NOT NULL,
  year_number int NOT NULL
);

ALTER TABLE scan_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_records" ON scan_records;
CREATE POLICY "anon_select_scan_records" ON scan_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scan_records" ON scan_records;
CREATE POLICY "anon_insert_scan_records" ON scan_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scan_records" ON scan_records;
CREATE POLICY "anon_update_scan_records" ON scan_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scan_records" ON scan_records;
CREATE POLICY "anon_delete_scan_records" ON scan_records FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_scan_records_week ON scan_records (year_number, week_number);
CREATE INDEX IF NOT EXISTS idx_scan_records_employee ON scan_records (employee_code);
CREATE INDEX IF NOT EXISTS idx_scan_records_scanned_at ON scan_records (scanned_at DESC);
