import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Car, defaultCarSettings } from "@/types/car";
import { toast } from "sonner";

export function useCarsSupabase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch Cars
  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["cars", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform DB records to local Car type
      return data.map((record: any) => ({
        id: record.id,
        make: record.make,
        model: record.model,
        year: record.year,
        currentMileage: record.current_mileage,
        lastMileageUpdate: record.last_mileage_update,
        settings: record.settings || { ...defaultCarSettings },
        legalDocs: record.legal_docs || [],
        oilServices: record.oil_services || [],
        brakeTireServices: record.brake_tire_services || [],
        mileageHistory: record.mileage_history || [],
      })) as Car[];
    },
    enabled: !!user,
  });

  // 2. Add Car
  const addCarMutation = useMutation({
    mutationFn: async (car: Omit<Car, "id" | "legalDocs" | "oilServices" | "brakeTireServices" | "settings" | "lastMileageUpdate" | "mileageHistory">) => {
      if (!user) throw new Error("User not authenticated");
      
      const now = new Date().toISOString();
      const newCarData = {
        user_id: user.id,
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast.success("تمت إضافة السيارة بنجاح");
    },
    onError: (error: any) => {
      toast.error("خطأ في إضافة السيارة: " + error.message);
    },
  });

  // 3. Update Car
  const updateCarMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Car> }) => {
      // Transform local updates to DB fields
      const dbUpdates: any = {};
      if (updates.make) dbUpdates.make = updates.make;
      if (updates.model) dbUpdates.model = updates.model;
      if (updates.year) dbUpdates.year = updates.year;
      if (updates.currentMileage !== undefined) dbUpdates.current_mileage = updates.currentMileage;
      if (updates.lastMileageUpdate) dbUpdates.last_mileage_update = updates.lastMileageUpdate;
      if (updates.settings) dbUpdates.settings = updates.settings;
      if (updates.legalDocs) dbUpdates.legal_docs = updates.legalDocs;
      if (updates.oilServices) dbUpdates.oil_services = updates.oilServices;
      if (updates.brakeTireServices) dbUpdates.brake_tire_services = updates.brakeTireServices;
      if (updates.mileageHistory) dbUpdates.mileage_history = updates.mileageHistory;

      const { error } = await supabase
        .from("cars")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
  });

  // 4. Delete Car
  const deleteCarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cars")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast.success("تم حذف السيارة");
    },
  });

  // Helper Wrappers
  const addLegalDoc = (carId: string, doc: any) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    const filtered = car.legalDocs.filter(d => d.type !== doc.type);
    updateCarMutation.mutate({ 
      id: carId, 
      updates: { legalDocs: [...filtered, { ...doc, id: crypto.randomUUID() }] } 
    });
  };

  const addOilService = (carId: string, service: any) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    updateCarMutation.mutate({ 
      id: carId, 
      updates: { 
        oilServices: [...car.oilServices, { ...service, id: crypto.randomUUID() }],
        currentMileage: Math.max(car.currentMileage, service.mileageAtChange),
        lastMileageUpdate: new Date().toISOString(),
      } 
    });
  };

  const addBrakeTireService = (carId: string, service: any) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    const filtered = car.brakeTireServices.filter(s => s.type !== service.type);
    updateCarMutation.mutate({ 
      id: carId, 
      updates: { brakeTireServices: [...filtered, { ...service, id: crypto.randomUUID() }] } 
    });
  };

  const updateMileage = (carId: string, mileage: number) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    const now = new Date().toISOString();
    updateCarMutation.mutate({ 
      id: carId, 
      updates: { 
        currentMileage: mileage, 
        lastMileageUpdate: now,
        mileageHistory: [...(car.mileageHistory || []), { id: crypto.randomUUID(), mileage, date: now }] 
      } 
    });
  };

  const updateCarSettings = (carId: string, settings: any) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    updateCarMutation.mutate({ 
      id: carId, 
      updates: { settings: { ...car.settings, ...settings } } 
    });
  };

  return {
    cars,
    isLoading,
    isLoaded: !isLoading,
    addCar: addCarMutation.mutate,
    updateCar: updateCarMutation.mutate,
    deleteCar: deleteCarMutation.mutate,
    addLegalDoc,
    addOilService,
    addBrakeTireService,
    updateMileage,
    updateCarSettings,
  };
}
