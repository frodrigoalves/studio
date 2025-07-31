
"use client";

import { useState, useTransition, useCallback, useRef, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Camera, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { addRecord, getRecordByPlateAndStatus, updateRecord, RecordUpdatePayload, Record } from "@/services/records";
import { getActiveVehicles, type VehicleParameters } from "@/services/vehicles";
import { cn } from "@/lib/utils";

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const createStartFormSchema = (activeVehicles: VehicleParameters[]) => {
    const activeVehicleIds = activeVehicles.map(v => v.carId);
    
    let carSchema = z.string().min(1, "Carro é obrigatório.");

    // Only add the refinement if there are active vehicles to validate against
    if (activeVehicleIds.length > 0) {
        carSchema = carSchema.refine(
            (carId) => activeVehicleIds.includes(carId),
            { message: "Veículo não encontrado ou inativo. Verifique o número digitado." }
        );
    }
    
    return z.object({
        chapa: z.string().min(1, "Chapa é obrigatória."),
        name: z.string().min(1, "Nome é obrigatório."),
        car: carSchema,
        line: z.string().min(1, "Linha é obrigatória."),
        initialKm: z.coerce.number({ required_error: "Km Inicial é obrigatório."}).min(1, "Km Inicial é obrigatório."),
        startOdometerPhoto: z.any().refine(file => file, "Foto é obrigatória."),
    });
}

const endFormSchema = z.object({
  chapa: z.string().min(1, "Chapa é obrigatória."),
  name: z.string().min(1, "Nome é obrigatório."),
  car: z.string().min(1, "Carro é obrigatório."),
  line: z.string().min(1, "Linha é obrigatória."),
  finalKm: z.coerce.number({ required_error: "Km Final é obrigatório."}).min(1, "Km Final é obrigatório."),
  endOdometerPhoto: z.any().refine(file => file, "Foto é obrigatória."),
});


type EndFormValues = z.infer<typeof endFormSchema>;
type StartFormValues = z.infer<ReturnType<typeof createStartFormSchema>>;


const initialStartValues: Omit<StartFormValues, 'initialKm' | 'startOdometerPhoto'> & { initialKm: string | number, startOdometerPhoto: null } = { chapa: "", name: "", car: "", line: "", initialKm: '', startOdometerPhoto: null };
const initialEndValues: Omit<EndFormValues, 'finalKm' | 'name' | 'car' | 'line'> & { finalKm: string | number, name: string, car: string, line: string } = { chapa: "", name: "", car: "", line: "", finalKm: '', endOdometerPhoto: null };


export function DriverForm() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("start");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recordToEnd, setRecordToEnd] = useState<Record | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<VehicleParameters[]>([]);
  const [isSchemaReady, setIsSchemaReady] = useState(false);
  
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  
  const startFormSchema = useMemo(() => {
    return createStartFormSchema(activeVehicles);
  }, [activeVehicles]);
  
  const startForm = useForm<StartFormValues>({
    resolver: zodResolver(startFormSchema),
    defaultValues: initialStartValues,
    mode: "onBlur",
  });
  
  const endForm = useForm<EndFormValues>({
    resolver: zodResolver(endFormSchema),
    defaultValues: initialEndValues,
  });

  useEffect(() => {
    async function fetchActiveVehicles() {
        try {
            const vehicles = await getActiveVehicles();
            setActiveVehicles(vehicles);
        } catch (error) {
            console.error("Failed to fetch active vehicles", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar veículos",
                description: "Não foi possível buscar a lista de veículos ativos. Tente recarregar a página."
            });
        } finally {
            setIsSchemaReady(true);
        }
    }
    fetchActiveVehicles();
  }, [toast]);
  
  // Re-initializes the resolver when the schema changes.
  useEffect(() => {
      startForm.reset(undefined, {
          keepValues: true,
      });
  }, [startFormSchema, startForm]);


  const handleChapaBlur = useCallback(async (chapa: string) => {
    if(!chapa || activeTab !== 'end') return;

    setIsSearching(true);
    try {
        const record = await getRecordByPlateAndStatus(chapa, 'Em Andamento');
        if(record) {
            setRecordToEnd(record);
            endForm.setValue('name', record.driver);
            endForm.setValue('car', record.car);
            endForm.setValue('line', record.line);
        } else {
            setRecordToEnd(null);
            endForm.reset({ ...initialEndValues, chapa });
             toast({
                variant: "destructive",
                title: "Nenhuma viagem em andamento",
                description: "Não foi encontrada uma viagem em andamento para esta chapa.",
            });
        }
    } catch (e) {
        console.error("Failed to fetch record by plate", e);
        toast({
            variant: "destructive",
            title: "Erro ao buscar viagem",
            description: "Não foi possível verificar a chapa. Tente novamente.",
        });
    } finally {
        setIsSearching(false);
    }
  }, [activeTab, endForm, toast]);

  async function onStartSubmit(data: StartFormValues) {
    setIsSubmitting(true);
    try {
        const existingRecord = await getRecordByPlateAndStatus(data.chapa, "Em Andamento");
        if (existingRecord) {
            toast({
                variant: "destructive",
                title: "Viagem já iniciada",
                description: "Já existe uma viagem em andamento para esta chapa.",
            });
            setIsSubmitting(false);
            return;
        }

        const photoBase64 = data.startOdometerPhoto ? await fileToBase64(data.startOdometerPhoto) : null;

        await addRecord({
          date: new Date().toISOString().split('T')[0],
          driver: data.name,
          car: data.car,
          plate: data.chapa,
          line: data.line,
          kmStart: data.initialKm,
          kmEnd: null,
          status: "Em Andamento",
          startOdometerPhoto: photoBase64,
          endOdometerPhoto: null,
        });

        toast({
          title: "Viagem iniciada com sucesso!",
          description: "Seus dados foram salvos.",
        });
        startForm.reset(initialStartValues);
        if (startFileInputRef.current) {
            startFileInputRef.current.value = "";
        }
    } catch(e) {
        console.error("Failed to start trip", e);
        toast({
            variant: "destructive",
            title: "Erro ao iniciar viagem",
            description: "Não foi possível salvar os dados. Tente novamente.",
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onEndSubmit(data: EndFormValues) {
     setIsSubmitting(true);
     try {
        if (!recordToEnd) {
            toast({
                variant: "destructive",
                title: "Nenhuma viagem em andamento",
                description: "Por favor, insira uma chapa válida para encontrar a viagem a ser finalizada.",
            });
            setIsSubmitting(false);
            return;
        }

        if (data.finalKm <= (recordToEnd.kmStart ?? 0)) {
            toast({
                variant: "destructive",
                title: "KM Final inválido",
                description: "O KM final deve ser maior que o KM inicial.",
            });
            setIsSubmitting(false);
            return;
        }

        const photoBase64 = data.endOdometerPhoto ? await fileToBase64(data.endOdometerPhoto) : null;
        
        const dataToUpdate: RecordUpdatePayload = {
          status: "Finalizado",
          kmEnd: data.finalKm,
          endOdometerPhoto: photoBase64,
        };

        await updateRecord(recordToEnd.id, dataToUpdate);
        
        toast({
          title: "Viagem finalizada com sucesso!",
          description: "Seus dados foram atualizados.",
        });
        endForm.reset(initialEndValues);
        setRecordToEnd(null);
         if (endFileInputRef.current) {
            endFileInputRef.current.value = "";
        }
     } catch (e) {
        console.error("Failed to end trip", e);
        toast({
            variant: "destructive",
            title: "Erro ao finalizar viagem",
            description: "Não foi possível salvar os dados. Tente novamente.",
        })
     } finally {
        setIsSubmitting(false);
     }
  }
  
  useEffect(() => {
    if (activeTab === 'start') {
        setRecordToEnd(null);
        endForm.reset(initialEndValues);
    }
  }, [activeTab, endForm]);

  return (
    <Card className={cn(
        "shadow-2xl shadow-primary/10 transition-all duration-300 border-2",
        activeTab === 'start' 
            ? "border-green-500/80 shadow-green-500/20" 
            : "border-destructive/80 shadow-destructive/20"
    )}>
      <CardContent className="p-2 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start">Iniciar Viagem</TabsTrigger>
            <TabsTrigger value="end">Finalizar Viagem</TabsTrigger>
          </TabsList>
          <TabsContent value="start" className="pt-4">
             {!isSchemaReady ? (
                <div className="flex flex-col items-center justify-center space-y-4 p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Carregando lista de veículos...</p>
                </div>
             ) : (
                <Form {...startForm}>
                  <form onSubmit={startForm.handleSubmit(onStartSubmit)} className="space-y-4 px-2">
                    <FormField
                      control={startForm.control}
                      name="chapa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chapa</FormLabel>
                          <FormControl>
                            <Input placeholder="Sua matrícula" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Motorista</FormLabel>
                          <FormControl>
                              <Input placeholder="Seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="car"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carro</FormLabel>
                           <FormControl>
                              <Input placeholder="Digite o número do veículo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="line"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Linha</FormLabel>
                          <FormControl>
                            <Input placeholder="Número da linha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="initialKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Km Inicial</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="123456" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={startForm.control}
                      name="startOdometerPhoto"
                      render={({ field: { onChange, value, ...rest }}) => (
                        <FormItem>
                          <FormLabel>Foto do Odômetro (Início)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="file" accept="image/*" capture="camera" className="pr-12"
                                {...rest}
                                ref={startFileInputRef}
                                onChange={(e) => {
                                  const file = e.target.files ? e.target.files[0] : null;
                                  onChange(file);
                                }}
                              />
                              <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {isSubmitting ? "Registrando..." : "Registrar Início"}
                    </Button>
                  </form>
                </Form>
            )}
          </TabsContent>
          <TabsContent value="end" className="pt-4">
            <Form {...endForm}>
              <form onSubmit={endForm.handleSubmit(onEndSubmit)} className="space-y-4 px-2">
                 <FormField
                  control={endForm.control}
                  name="chapa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapa</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Input placeholder="Confirme sua matrícula" {...field} onBlur={(e) => handleChapaBlur(e.target.value)} />
                             {isSearching && <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={endForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Motorista</FormLabel>
                        <FormControl>
                           <Input placeholder="Preenchido automaticamente" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={endForm.control}
                    name="car"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carro</FormLabel>
                        <FormControl>
                           <Input placeholder="Preenchido automaticamente" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 <FormField
                    control={endForm.control}
                    name="line"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linha</FormLabel>
                        <FormControl>
                           <Input placeholder="Preenchido automaticamente" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={endForm.control}
                  name="finalKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM Final</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="123567" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={endForm.control}
                  name="endOdometerPhoto"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Foto do Odômetro (Fim)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="file" accept="image/*" capture="camera" className="pr-12"
                           {...rest}
                           ref={endFileInputRef}
                           onChange={(e) => {
                             const file = e.target.files ? e.target.files[0] : null;
                             onChange(file);
                           }}
                          />
                          <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="destructive" className="w-full" disabled={isSubmitting}>
                   {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Finalizando..." : "Registrar Fim"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

    