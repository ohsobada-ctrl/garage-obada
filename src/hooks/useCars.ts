import { useState, useEffect, useCallback } from 'react';
import { Car, defaultCarSettings, Notification, LegalDocument, OilService, BrakeTireService, legalDocLabels } from '@/types/car';

const STORAGE_KEY = 'car-maintenance-app-data';
const LAST_MILEAGE_PROMPT_KEY = 'last-mileage-prompt';

export function useCars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCars(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored cars:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
    }
  }, [cars, isLoaded]);

  const addCar = useCallback((car: Omit<Car, 'id' | 'legalDocs' | 'oilServices' | 'brakeTireServices' | 'settings' | 'lastMileageUpdate' | 'mileageHistory'>) => {
    const now = new Date().toISOString();
    const newCar: Car = {
      ...car,
      id: crypto.randomUUID(),
      legalDocs: [],
      oilServices: [],
      brakeTireServices: [],
      mileageHistory: [{
        id: crypto.randomUUID(),
        mileage: car.currentMileage,
        date: now,
      }],
      settings: { ...defaultCarSettings },
      lastMileageUpdate: now,
    };
    setCars(prev => [...prev, newCar]);
    return newCar;
  }, []);

  const updateCar = useCallback((id: string, updates: Partial<Car>) => {
    setCars(prev => prev.map(car => 
      car.id === id ? { ...car, ...updates } : car
    ));
  }, []);

  const deleteCar = useCallback((id: string) => {
    setCars(prev => prev.filter(car => car.id !== id));
  }, []);

  const addLegalDoc = useCallback((carId: string, doc: Omit<LegalDocument, 'id'>) => {
    setCars(prev => prev.map(car => {
      if (car.id !== carId) return car;
      // Remove existing doc of same type
      const filtered = car.legalDocs.filter(d => d.type !== doc.type);
      return {
        ...car,
        legalDocs: [...filtered, { ...doc, id: crypto.randomUUID() }],
      };
    }));
  }, []);

  const addOilService = useCallback((carId: string, service: Omit<OilService, 'id'>) => {
    setCars(prev => prev.map(car => {
      if (car.id !== carId) return car;
      return {
        ...car,
        oilServices: [...car.oilServices, { ...service, id: crypto.randomUUID() }],
        currentMileage: Math.max(car.currentMileage, service.mileageAtChange),
        lastMileageUpdate: new Date().toISOString(),
      };
    }));
  }, []);

  const addBrakeTireService = useCallback((carId: string, service: Omit<BrakeTireService, 'id'>) => {
    setCars(prev => prev.map(car => {
      if (car.id !== carId) return car;
      // Remove existing service of same type
      const filtered = car.brakeTireServices.filter(s => s.type !== service.type);
      return {
        ...car,
        brakeTireServices: [...filtered, { ...service, id: crypto.randomUUID() }],
      };
    }));
  }, []);

  const updateMileage = useCallback((carId: string, mileage: number) => {
    const now = new Date().toISOString();
    setCars(prev => prev.map(car => {
      if (car.id !== carId) return car;
      const newRecord = {
        id: crypto.randomUUID(),
        mileage,
        date: now,
      };
      return {
        ...car,
        currentMileage: mileage,
        lastMileageUpdate: now,
        mileageHistory: [...(car.mileageHistory || []), newRecord],
      };
    }));
  }, []);

  const updateCarSettings = useCallback((carId: string, settings: Partial<Car['settings']>) => {
    setCars(prev => prev.map(car => 
      car.id === carId 
        ? { ...car, settings: { ...car.settings, ...settings } }
        : car
    ));
  }, []);

  return {
    cars,
    isLoaded,
    addCar,
    updateCar,
    deleteCar,
    addLegalDoc,
    addOilService,
    addBrakeTireService,
    updateMileage,
    updateCarSettings,
  };
}

export function useNotifications(cars: Car[]): Notification[] {
  const notifications: Notification[] = [];
  const today = new Date();

  cars.forEach(car => {
    const carName = `${car.make} ${car.model}`;

    // Legal document notifications
    car.legalDocs.forEach(doc => {
      const expiryDate = new Date(doc.expiryDate);
      const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const docLabel = legalDocLabels[doc.type];

      if (daysRemaining <= 0) {
        notifications.push({
          id: `${car.id}-${doc.id}-expired`,
          carId: car.id,
          carName,
          type: 'legal',
          message: `يا بطل! ${docLabel} منتهية الصلاحية من ${Math.abs(daysRemaining)} يوم! لازم تجدد حالاً!`,
          severity: 'danger',
          date: doc.expiryDate,
        });
      } else if (daysRemaining <= 7) {
        notifications.push({
          id: `${car.id}-${doc.id}-warning`,
          carId: car.id,
          carName,
          type: 'legal',
          message: `تنبيه! ${docLabel} باقي عليها ${daysRemaining} يوم بس! جهز ورقك يا صاحبي!`,
          severity: daysRemaining <= 3 ? 'danger' : 'warning',
          date: doc.expiryDate,
        });
      }
    });

    // Oil service notifications
    const latestOilService = car.oilServices[car.oilServices.length - 1];
    if (latestOilService) {
      const serviceDate = new Date(latestOilService.dateOfChange);
      const monthsSinceChange = (today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const kmSinceChange = car.currentMileage - latestOilService.mileageAtChange;
      
      const timeExpired = monthsSinceChange >= car.settings.oilExpiryMonths;
      const kmExpired = kmSinceChange >= car.settings.oilRangeKm;
      const timeWarning = monthsSinceChange >= car.settings.oilExpiryMonths - 1;
      const kmWarning = kmSinceChange >= car.settings.oilRangeKm - 500;

      if (timeExpired || kmExpired) {
        notifications.push({
          id: `${car.id}-oil-expired`,
          carId: car.id,
          carName,
          type: 'oil',
          message: `موعد الزيت قرب! رفيق دربك يستاهل الدلال! ${timeExpired ? `(${Math.floor(monthsSinceChange)} شهر)` : ''} ${kmExpired ? `(${kmSinceChange.toLocaleString()} كم)` : ''}`,
          severity: 'danger',
          date: today.toISOString(),
        });
      } else if (timeWarning || kmWarning) {
        notifications.push({
          id: `${car.id}-oil-warning`,
          carId: car.id,
          carName,
          type: 'oil',
          message: `الزيت قربان يخلص! باقي ${car.settings.oilRangeKm - kmSinceChange} كم`,
          severity: 'warning',
          date: today.toISOString(),
        });
      }

      // Filter warning
      if (!latestOilService.filterChanged) {
        notifications.push({
          id: `${car.id}-filter-warning`,
          carId: car.id,
          carName,
          type: 'filter',
          message: `⚠️ الفلتر ما تبدل آخر مرة! لا تنساه هالمرة يا بطل!`,
          severity: 'warning',
          date: today.toISOString(),
        });
      }
    }

    // Brakes and tires notifications
    car.brakeTireServices.forEach(service => {
      const lastChange = new Date(service.lastChangeDate);
      const reminderMonths = service.type === 'brakes' 
        ? car.settings.brakeReminderMonths 
        : car.settings.tireReminderMonths;
      const monthsSinceChange = (today.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsSinceChange >= reminderMonths) {
        const label = service.type === 'brakes' ? 'البريكات' : 'الكفرات';
        notifications.push({
          id: `${car.id}-${service.type}-check`,
          carId: car.id,
          carName,
          type: service.type,
          message: `مر ${Math.floor(monthsSinceChange)} شهر على ${label}! وقت الفحص يا صاحبي!`,
          severity: 'warning',
          date: today.toISOString(),
        });
      }
    });

    // Mileage update reminder
    const lastUpdate = new Date(car.lastMileageUpdate);
    const daysSinceUpdate = (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate >= 30) {
      notifications.push({
        id: `${car.id}-mileage-update`,
        carId: car.id,
        carName,
        type: 'mileage',
        message: `يا بطل، سيارتك تبي شوية دلال! العداد كم وصل توه؟`,
        severity: 'info',
        date: today.toISOString(),
      });
    }
  });

  return notifications.sort((a, b) => {
    const severityOrder = { danger: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function shouldShowMileagePrompt(): boolean {
  const lastPrompt = localStorage.getItem(LAST_MILEAGE_PROMPT_KEY);
  if (!lastPrompt) return true;
  
  const daysSincePrompt = (Date.now() - new Date(lastPrompt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSincePrompt >= 30;
}

export function markMileagePromptShown() {
  localStorage.setItem(LAST_MILEAGE_PROMPT_KEY, new Date().toISOString());
}
