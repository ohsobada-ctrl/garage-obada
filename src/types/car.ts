export interface LegalDocument {
  id: string;
  type: 'insurance' | 'roadTax' | 'technicalInspection';
  expiryDate: string;
  notes?: string;
}

export interface OilService {
  id: string;
  stationName: string;
  oilBrand: string;
  dateOfChange: string;
  mileageAtChange: number;
  filterChanged: boolean;
}

export interface BrakeTireService {
  id: string;
  type: 'brakes' | 'tires';
  lastChangeDate: string;
  notes?: string;
}

export interface MileageRecord {
  id: string;
  mileage: number;
  date: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number;
  lastMileageUpdate: string;
  mileageHistory: MileageRecord[];
  legalDocs: LegalDocument[];
  oilServices: OilService[];
  brakeTireServices: BrakeTireService[];
  settings: CarSettings;
}

export interface CarSettings {
  oilExpiryMonths: number;
  oilRangeKm: number;
  brakeReminderMonths: number;
  tireReminderMonths: number;
}

export interface Notification {
  id: string;
  carId: string;
  carName: string;
  type: 'legal' | 'oil' | 'filter' | 'brakes' | 'tires' | 'mileage';
  message: string;
  severity: 'info' | 'warning' | 'danger';
  date: string;
}

export const defaultCarSettings: CarSettings = {
  oilExpiryMonths: 6,
  oilRangeKm: 5000,
  brakeReminderMonths: 6,
  tireReminderMonths: 6,
};

export const legalDocLabels: Record<LegalDocument['type'], string> = {
  insurance: 'التأمين',
  roadTax: 'البل',
  technicalInspection: 'الفحص الفني',
};
