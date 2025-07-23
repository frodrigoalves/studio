
"use client";

import { useState, useTransition, useCallback } from "react";
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
import { prepopulateFields, type PrepopulateFieldsOutput } from "@/ai/flows/prepopulate-fields";

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const formSchema = z.object({
  chapa: z.string().min(1, "Chapa é obrigatória."),
  name: z.string().min(1, "Nome é obrigatório."),
  car: z.string().min(1, "Carro é obrigatório."),
  initialKm: z.coerce.number().min(1, "Km Inicial é obrigatório.").optional().nullable(),
  finalKm: z.coerce.number().min(1, "Km Final é obrigatório.").optional().nullable(),
  startOdometerPhoto: z.any().optional().nullable(),
  endOdometerPhoto: z.any().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const initialStartValues = { chapa: "", name: "", car: "", initialKm: null, startOdometerPhoto: null };
const initialEndValues = { chapa: "", name: "", car: "", finalKm: null, endOdometerPhoto: null };


export function DriverForm() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("start");
  const [isAiLoading, startAiTransition] = useTransition();

  const startForm = useForm<FormValues>({
    resolver: zodResolver(formSchema.pick({ chapa: true, name: true, car: true, initialKm: true, startOdometerPhoto: true }).refine(data => data.initialKm, {
        message: "Km Inicial é obrigatório.",
        path: ["initialKm"],
    }).refine(data => data.startOdometerPhoto, {
        message: "Foto é obrigatória.",
        path: ["startOdometerPhoto"],
    })),
    defaultValues: initialStartValues,
  });

  const endForm = useForm<FormValues>({
    resolver: zodResolver(formSchema.pick({ chapa: true, name:true, car:true, finalKm: true, endOdometerPhoto: true }).refine(data => data.finalKm, {
        message: "Km Final é obrigatório.",
        path: ["finalKm"],
    }).refine(data => data.endOdometerPhoto, {
        message: "Foto é obrigatória.",
        path: ["endOdometerPhoto"],
    })),
    defaultValues: initialEndValues,
  });
  
  const handleChapaChange = useCallback(async (chapa: string) => {
    if (chapa.length < 3) return;
    
    if (activeTab === 'end' && typeof window !== 'undefined') {
        const stored = localStorage.getItem('tripRecords') || '[]';
        const records = JSON.parse(stored);
        const existingRecord = records.find((rec: any) => rec.plate === chapa && rec.status === "Em Andamento");

        if (existingRecord) {
            endForm.setValue("name", existingRecord.driver);
            endForm.setValue("car", existingRecord.car);
            return;
        }
    }
    
    startAiTransition(async () => {
      try {
        const result: PrepopulateFieldsOutput = await prepopulateFields({ chapa });
        if (result.name && result.car) {
          if (activeTab === "start") {
            startForm.setValue("name", result.name);
            startForm.setValue("car", result.car);
          } else {
            endForm.setValue("name", result.name);
            endForm.setValue("car", result.car);
          }
        }
      } catch (error) {
        console.error("Failed to prepopulate fields:", error);
        toast({
            variant: "destructive",
            title: "Erro de IA",
            description: "Não foi possível preencher os campos automaticamente.",
        })
      }
    });
  }, [activeTab, startForm, endForm, toast]);

  const debouncedChapaChange = useCallback(debounce(handleChapaChange, 500), [handleChapaChange]);

  const updateLocalStorage = async (data: Partial<FormValues>) => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('tripRecords') || '[]';
      const records = JSON.parse(stored);
      
      const existingRecordIndex = records.findIndex((rec: any) => rec.plate === data.chapa && rec.status === "Em Andamento");

      if (activeTab === 'start') {
        if(existingRecordIndex > -1){
            toast({
                variant: "destructive",
                title: "Viagem já iniciada",
                description: "Já existe uma viagem em andamento para esta chapa.",
            });
            return;
        }

        const photoBase64 = data.startOdometerPhoto ? await fileToBase64(data.startOdometerPhoto) : null;

        const newRecord = {
          id: Date.now(),
          date: new Date().toISOString().split('T')[0],
          driver: data.name,
          car: data.car,
          plate: data.chapa,
          kmStart: data.initialKm,
          kmEnd: null,
          status: "Em Andamento",
          startOdometerPhoto: photoBase64,
          endOdometerPhoto: null,
        };
        records.push(newRecord);
        toast({
          title: "Viagem iniciada com sucesso!",
          description: "Seus dados foram salvos.",
          variant: "default",
          className: "bg-accent text-accent-foreground",
        });
        startForm.reset(initialStartValues);
      } else { // end trip
        if (existingRecordIndex === -1) {
            toast({
                variant: "destructive",
                title: "Nenhuma viagem em andamento",
                description: "Não foi encontrada uma viagem em andamento para esta chapa.",
            });
            return;
        }

        const photoBase64 = data.endOdometerPhoto ? await fileToBase64(data.endOdometerPhoto) : null;

        records[existingRecordIndex].kmEnd = data.finalKm;
        records[existingRecordIndex].status = "Finalizado";
        records[existingRecordIndex].endOdometerPhoto = photoBase64;
        toast({
          title: "Viagem finalizada com sucesso!",
          description: "Seus dados foram atualizados.",
        });
        endForm.reset(initialEndValues);
      }

      localStorage.setItem('tripRecords', JSON.stringify(records));
      window.dispatchEvent(new Event('storage'));
    } catch(e) {
        console.error("Failed to update local storage", e);
        toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "Não foi possível salvar os dados localmente.",
        })
    }
  }


  function onStartSubmit(data: FormValues) {
    updateLocalStorage(data);
  }

  function onEndSubmit(data: FormValues) {
     updateLocalStorage(data);
  }

  return (
    <Card className="shadow-2xl shadow-primary/10">
      <CardContent className="p-2 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start">Iniciar Viagem</TabsTrigger>
            <TabsTrigger value="end">Finalizar Viagem</TabsTrigger>
          </TabsList>
          <TabsContent value="start" className="pt-4">
            <Form {...startForm}>
              <form onSubmit={startForm.handleSubmit(onStartSubmit)} className="space-y-6 px-2">
                <FormField
                  control={startForm.control}
                  name="chapa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapa</FormLabel>
                      <FormControl>
                        <Input placeholder="Sua matrícula" {...field} onChange={(e) => {
                            field.onChange(e);
                            debouncedChapaChange(e.target.value);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={startForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Motorista</FormLabel>
                        <FormControl>
                           <div className="relative">
                            <Input placeholder="Seu nome" {...field} />
                            {isAiLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
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
                           <div className="relative">
                            <Input placeholder="Número do ônibus" {...field} />
                             {isAiLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={startForm.control}
                  name="initialKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Km Inicial</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="123456" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />
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
                            onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                          />
                          <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={startForm.formState.isSubmitting}>
                  {startForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Registrar Início
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="end" className="pt-4">
            <Form {...endForm}>
              <form onSubmit={endForm.handleSubmit(onEndSubmit)} className="space-y-6 px-2">
                <FormField
                  control={endForm.control}
                  name="chapa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapa</FormLabel>
                      <FormControl>
                        <Input placeholder="Sua matrícula" {...field} onChange={(e) => {
                            field.onChange(e);
                            debouncedChapaChange(e.target.value);
                        }}/>
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
                         <div className="relative">
                           <Input {...field} readOnly className="bg-muted border-dashed" placeholder="Preenchido automaticamente" />
                            {isAiLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />}
                         </div>
                      </FormControl>
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
                         <div className="relative">
                            <Input {...field} readOnly className="bg-muted border-dashed" placeholder="Preenchido automaticamente"/>
                            {isAiLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />}
                         </div>
                      </FormControl>
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
                        <Input type="number" placeholder="123567" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />
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
                           onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                          />
                          <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={endForm.formState.isSubmitting}>
                   {endForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Registrar Fim
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
