import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Car {
    id: string
    manufacturer: string
    model: string
    year: number
    mileage: number
    createdAt: number
}

interface CarState {
    cars: Car[]
    addCar: (car: Omit<Car, 'id' | 'createdAt'>) => void
    removeCar: (id: string) => void
    updateMileage: (id: string, mileage: number) => void
}

export const useCarStore = create<CarState>()(
    persist(
        (set) => ({
            cars: [],
            addCar: (car) =>
                set((state) => ({
                    cars: [
                        ...state.cars,
                        {
                            ...car,
                            id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                            createdAt: Date.now(),
                        },
                    ],
                })),
            removeCar: (id) =>
                set((state) => ({
                    cars: state.cars.filter((c) => c.id !== id),
                })),
            updateMileage: (id, mileage) =>
                set((state) => ({
                    cars: state.cars.map((c) =>
                        c.id === id ? { ...c, mileage } : c
                    ),
                })),
        }),
        {
            name: 'garage-car-storage',
        }
    )
)
