export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  created_at: string;
}

export interface ScanRecord {
  id: string;
  employee_code: string;
  employee_name: string;
  product_code: string;
  scanned_at: string;
  week_number: number;
  year_number: number;
}

export type ScanPhase = 'employee' | 'reference' | 'verify' | 'confirm';
