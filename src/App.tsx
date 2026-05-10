import { useState, useEffect } from "react"
import { Plus, Car as CarIcon, Gauge, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCarStore } from "@/hooks/useCarStore"
import { NotificationService } from "@/services/notificationService"

function App() {
  const { cars, addCar } = useCarStore()
  const [view, setView] = useState<'list' | 'add'>('list')
  
  // Form State
  const [manufacturer, setManufacturer] = useState("")
  const [model, setModel] = useState("")
  const [year, setYear] = useState("")
  const [mileage, setMileage] = useState("")

  useEffect(() => {
    // Initialize channel for Android
    NotificationService.createChannel();
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manufacturer || !model || !year || !mileage) return

    // Request permissions before scheduling - better to do it on user gesture
    await NotificationService.requestPermissions();

    addCar({
      manufacturer,
      model,
      year: parseInt(year),
      mileage: parseInt(mileage),
    })

    await NotificationService.scheduleMaintenanceAlerts(`${manufacturer} ${model}`)
    
    // Reset
    setManufacturer("")
    setModel("")
    setYear("")
    setMileage("")
    setView('list')
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-foreground p-4 pb-20 font-tajawal" dir="rtl">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-3xl font-bold text-primary">Garage Obada</h1>
           <p className="text-zinc-400 text-sm">نظام إدارة صيانة السيارات</p>
        </div>
        {view === 'list' && (
            <Button onClick={() => setView('add')} className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90 text-black">
                <Plus className="w-6 h-6" />
            </Button>
        )}
        {view === 'add' && (
             <Button onClick={() => setView('list')} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                إلغاء
             </Button>
        )}
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto">
        {view === 'add' && (
            <Card className="bg-zinc-950 border-zinc-800 animate-in fade-in slide-in-from-bottom-4">
                <CardHeader>
                    <CardTitle className="text-primary">إضافة سيارة جديدة</CardTitle>
                    <CardDescription>أدخل بيانات السيارة لبدء تتبع الصيانة</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="manufacturer">الشركة المصنعة</Label>
                            <Input 
                                id="manufacturer" 
                                placeholder="مثال: Toyota" 
                                className="bg-zinc-900 border-zinc-800 focus:border-primary text-right"
                                value={manufacturer}
                                onChange={(e) => setManufacturer(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">الموديل</Label>
                            <Input 
                                id="model" 
                                placeholder="مثال: Camry" 
                                className="bg-zinc-900 border-zinc-800 focus:border-primary text-right"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="year">سنة الصنع</Label>
                                <Input 
                                    id="year" 
                                    type="number" 
                                    placeholder="2025" 
                                    className="bg-zinc-900 border-zinc-800 focus:border-primary text-center"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mileage">العداد (كم)</Label>
                                <Input 
                                    id="mileage" 
                                    type="number" 
                                    placeholder="0" 
                                    className="bg-zinc-900 border-zinc-800 focus:border-primary text-center"
                                    value={mileage}
                                    onChange={(e) => setMileage(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full bg-primary text-black font-bold hover:bg-primary/90">
                            حفظ السيارة
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        )}

        {view === 'list' && (
            <div className="space-y-4">
                {cars.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500">
                        <CarIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>لا توجد سيارات مضافة بعد</p>
                        <Button variant="link" onClick={() => setView('add')} className="text-primary">
                            أضف سيارتك الأولى
                        </Button>
                    </div>
                ) : (
                    cars.map(car => (
                        <Card key={car.id} className="bg-zinc-950 border-zinc-800 overflow-hidden relative">
                             <div className="absolute top-0 right-0 p-4">
                                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">نشط</span>
                             </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <CarIcon className="w-5 h-5 text-primary" />
                                    {car.manufacturer} {car.model}
                                </CardTitle>
                                <CardDescription>{car.year}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="bg-zinc-900/50 p-3 rounded-lg flex flex-col items-center">
                                        <Gauge className="w-5 h-5 text-zinc-400 mb-1" />
                                        <span className="text-lg font-mono font-bold text-white">{car.mileage.toLocaleString()}</span>
                                        <span className="text-xs text-zinc-500">كم</span>
                                    </div>
                                    <div className="bg-zinc-900/50 p-3 rounded-lg flex flex-col items-center">
                                        <Wrench className="w-5 h-5 text-primary mb-1" />
                                        <span className="text-sm font-bold text-white mt-1">ممتازة</span>
                                        <span className="text-xs text-zinc-500">الحالة</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        )}
      </main>
    </div>
  )
}

export default App
