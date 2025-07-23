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


const startTripSchema = z.object({
  licensePlate: z.string().min(1, "Matrícula é obrigatória."),
  name: z.string().min(1, "Nome é obrigatório."),
  car: z.string().min(1, "Carro é obrigatório."),
  initialKm: z.coerce.number().min(1, "KM Inicial é obrigatório."),
  odometerPhoto: z.any().refine((file) => file, "Foto é obrigatória."),
});

const endTripSchema = z.object({
  licensePlate: z.string().min(1, "Matrícula é obrigatória."),
  name: z.string(),
  car: z.string(),
  finalKm: z.coerce.number().min(1, "KM Final é obrigatório."),
  odometerPhoto: z.any().refine((file) => file, "Foto é obrigatória."),
});

type StartTripFormValues = z.infer<typeof startTripSchema>;
type EndTripFormValues = z.infer<typeof endTripSchema>;

export function DriverForm() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("start");
  const [isAiLoading, startAiTransition] = useTransition();

  const startForm = useForm<StartTripFormValues>({
    resolver: zodResolver(startTripSchema),
    defaultValues: { licensePlate: "", name: "", car: "", initialKm: undefined, odometerPhoto: null },
  });

  const endForm = useForm<EndTripFormValues>({
    resolver: zodResolver(endTripSchema),
    defaultValues: { licensePlate: "", name: "Preenchido automaticamente", car: "Preenchido automaticamente", finalKm: undefined, odometerPhoto: null },
  });

  const handleLicensePlateChange = useCallback(async (licensePlate: string) => {
    if (licensePlate.length < 3) return;
    startAiTransition(async () => {
      try {
        const result: PrepopulateFieldsOutput = await prepopulateFields({ licensePlate });
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

  const debouncedLicensePlateChange = useCallback(debounce(handleLicensePlateChange, 500), [handleLicensePlateChange]);

  async function onStartSubmit(data: StartTripFormValues) {
    console.log("Starting trip with data:", data);
    toast({
      title: "Viagem iniciada com sucesso!",
      description: "Seus dados foram salvos.",
      variant: "default",
      className: "bg-accent text-accent-foreground",
    });
    startForm.reset({ licensePlate: "", name: "", car: "", initialKm: undefined, odometerPhoto: null });
  }

  async function onEndSubmit(data: EndTripFormValues) {
    console.log("Ending trip with data:", data);
    toast({
      title: "Viagem finalizada com sucesso!",
      description: "Seus dados foram atualizados.",
    });
    endForm.reset({ licensePlate: "", name: "Preenchido automaticamente", car: "Preenchido automaticamente", finalKm: undefined, odometerPhoto: null });
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
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC-1234" {...field} onChange={(e) => {
                            field.onChange(e);
                            debouncedLicensePlateChange(e.target.value);
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
                            <Input placeholder="Modelo do carro" {...field} />
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
                      <FormLabel>KM Inicial</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={startForm.control}
                  name="odometerPhoto"
                  render={({ field: { onChange, value, ...rest }}) => (
                    <FormItem>
                      <FormLabel>Foto do Odômetro (Início)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="file" accept="image/*" capture="camera" className="pr-12"
                            onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                            {...rest}
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
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC-1234" {...field} onChange={(e) => {
                            field.onChange(e);
                            debouncedLicensePlateChange(e.target.value);
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
                           <Input {...field} readOnly className="bg-muted" />
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
                            <Input {...field} readOnly className="bg-muted" />
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
                        <Input type="number" placeholder="123567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={endForm.control}
                  name="odometerPhoto"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Foto do Odômetro (Fim)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="file" accept="image/*" capture="camera" className="pr-12" 
                           onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                           {...rest}
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
