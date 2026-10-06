import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Car, CarSettings, LegalDocument, OilService, BrakeTireService, defaultCarSettings } from "@/types/car";
import { toast } from "sonner";
import { shouldRetryBackend } from '@/lib/backendError';
import { carFromRow, updateOwnedCar } from '@/lib/carData';

export function useCarsSupabase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch Cars
  const { data: cars = [], isLoading, error: loadError, refetch, isFetching } = useQuery({
    queryKey: ["cars", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform DB records to local Car type
      return data.map(carFromRow);
    },
    enabled: !!user,
    retry: shouldRetryBackend,
  });

  // 2. Add Car
  const addCarMutation = useMutation({
    mutationFn: async (car: Omit<Car, "id" | "legalDocs" | "oilServices" | "brakeTireServices" | "settings" | "lastMileageUpdate" | "mileageHistory">) => {
      if (!user) throw new Error('سجّل الدخول لحفظ سيارتك.');
      if (!car.make.trim() || !car.model.trim() || !Number.isInteger(car.year) || car.year < 1886 || car.year > new Date().getFullYear() + 1 || !Number.isSafeInteger(car.currentMileage) || car.currentMileage < 0) {
        throw new Error('راجع اسم السيارة وسنة الصنع والعداد.');
      }
      
      const now = new Date().toISOString();
      const newCarData = {
        user_id: user.uid,
        make: car.make,
        model: car.model,
        year: car.year,
        current_mileage: car.currentMileage,
        last_mileage_update: now,
        mileage_history: [{ id: crypto.randomUUID(), mileage: car.currentMileage, date: now }],
        settings: { ...defaultCarSettings },
        legal_docs: [],
        oil_services: [],
        brake_tire_services: [],
      };

      const { data, error } = await supabase
        .from("cars")
        .insert(newCarData)
        .select()
        .single();

      if (error) throw error;
      return carFromRow(data);
    },
    onSuccess: async (car) => {
      queryClient.setQueryData<Car[]>(['cars', user?.uid], old => [car, ...(old || []).filter(item => item.id !== car.id)]);
      await queryClient.invalidateQueries({ queryKey: ["cars", user?.uid] });
      toast.success("تمت إضافة السيارة بنجاح");
    },
  });

  // 3. Update Car
  const updateCarMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Car> | ((car: Car) => Partial<Car>) }) => {
      if (!user) throw new Error('سجّل الدخول لحفظ التعديل.');
      return updateOwnedCar(supabase, user.uid, id, updates);
    },
    onSuccess: async (car) => {
      queryClient.setQueryData<Car[]>(['cars', user?.uid], old => old?.map(item => item.id === car.id ? car : item));
      await queryClient.invalidateQueries({ queryKey: ["cars", user?.uid] });
    },
  });

  // 4. Delete Car
  const deleteCarMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('سجّل الدخول لحذف السيارة.');
      const { data, error } = await supabase
        .from("cars")
        .delete()
        .eq("id", id)
        .eq('user_id', user.uid)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('لم يتم حذف السيارة. حدّث القائمة وتأكد من الحساب المستخدم.');
      return id;
    },
    onSuccess: async (id) => {
      queryClient.setQueryData<Car[]>(['cars', user?.uid], old => old?.filter(item => item.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["cars", user?.uid] });
      toast.success("تم حذف السيارة");
    },
  });

  // Helper Wrappers
  const addLegalDoc = (carId: string, doc: Omit<LegalDocument, 'id'>) => {
    const id = crypto.randomUUID();
    return updateCarMutation.mutateAsync({
      id: carId, 
      updates: car => ({ legalDocs: [...car.legalDocs.filter(d => d.type !== doc.type), { ...doc, id }] }),
    });
  };

  const addOilService = (carId: string, service: Omit<OilService, 'id'>) => {
    const id = crypto.randomUUID();
    return updateCarMutation.mutateAsync({
      id: carId, 
      updates: car => {
        if (!Number.isSafeInteger(service.mileageAtChange) || service.mileageAtChange < 0) throw new Error('أدخل قراءة عداد صحيحة.');
        const now = new Date().toISOString();
        return {
          oilServices: [...car.oilServices, { ...service, id }].sort((a, b) => a.dateOfChange.localeCompare(b.dateOfChange)),
          ...(service.mileageAtChange > car.currentMileage ? {
            currentMileage: service.mileageAtChange,
            lastMileageUpdate: now,
            mileageHistory: [...car.mileageHistory, { id, mileage: service.mileageAtChange, date: now }],
          } : {}),
        };
      },
    });
  };

  const addBrakeTireService = (carId: string, service: Omit<BrakeTireService, 'id'>) => {
    const id = crypto.randomUUID();
    return updateCarMutation.mutateAsync({
      id: carId, 
      updates: car => ({ brakeTireServices: [...car.brakeTireServices.filter(s => s.type !== service.type), { ...service, id }] }),
    });
  };

  const updateMileage = (carId: string, mileage: number) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    return updateCarMutation.mutateAsync({
      id: carId, 
      updates: car => {
        if (!Number.isSafeInteger(mileage) || mileage < 0) throw new Error('أدخل قراءة عداد صحيحة.');
        return {
        currentMileage: mileage, 
        lastMileageUpdate: now,
        mileageHistory: [...car.mileageHistory, { id, mileage, date: now }],
        };
      },
    });
  };

  const updateCarSettings = (carId: string, settings: Partial<CarSettings>) => {
    return updateCarMutation.mutateAsync({
      id: carId, 
      updates: car => {
        if (Object.values(settings).some(value => !Number.isSafeInteger(value) || value <= 0)) throw new Error('أدخل فترة ومسافة تذكير صحيحتين.');
        return { settings: { ...car.settings, ...settings } };
      },
    });
  };

  return {
    cars,
    isLoading,
    isLoaded: !isLoading,
    loadError,
    refetch,
    isFetching,
    addCar: addCarMutation.mutateAsync,
    updateCar: updateCarMutation.mutateAsync,
    deleteCar: deleteCarMutation.mutateAsync,
    addLegalDoc,
    addOilService,
    addBrakeTireService,
    updateMileage,
    updateCarSettings,
  };
}
