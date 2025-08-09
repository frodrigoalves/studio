
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { addRecord, getRecordByPlateAndStatus, updateRecord, Record, RecordAddPayload, RecordUpdatePayload } from "@/services/records";
import { extractOdometerFromImage } from "@/ai/flows/ocr-flow";
import { extractFuelLevelFromImage } from "@/ai/flows/fuel-level-flow";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { FuelGauge } from "./ui/fuel-gauge";

const fileToBase64 = (file: File | null): Promise<string | null> => {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const startTripSchema = z.object({
    plate: z.string().min(1, "Chapa é obrigatória."),
    driver: z.string().min(1, "Nome é obrigatório."),
    car: z.string().min(1, "Carro é obrigatório."),
    line: z.string().min(1, "Linha é obrigatória."),
    kmStart: z.coerce.number({ required_error: "Km Inicial é obrigatório."}).min(1, "Km Inicial é obrigatório."),
    startFuelLevel: z.number().min(0).max(100),
});

const endFormSchema = z.object({
  plate: z.string().min(1, "Chapa é obrigatória."),
  driver: z.string().min(1, "Nome é obrigatório.").optional(),
  car: z.string().min(1, "Carro é obrigatório.").optional(),
  line: z.string().min(1, "Linha é obrigatória.").optional(),
  kmEnd: z.coerce.number({ required_error: "Km Final é obrigatório."}).min(1, "Km Final é obrigatório."),
  endFuelLevel: z.number().min(0).max(100),
});

type StartTripFormValues = z.infer<typeof startTripSchema>;
type EndFormValues = z.infer<typeof endFormSchema>;

const initialStartValues: StartTripFormValues = {
    plate: "",
    driver: "",
    car: "",
    line: "",
    kmStart: 0,
    startFuelLevel: 50,
};

const initialEndValues: EndFormValues = { 
    plate: "", 
    driver: "", 
    car: "", 
    line: "", 
    kmEnd: 0, 
    endFuelLevel: 50,
};

export function DriverForm() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("start");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isFuelLevelLoading, setIsFuelLevelLoading] = useState<"start" | "end" | null>(null);
  const [recordToEnd, setRecordToEnd] = useState<Record | null>(null);

  const [startOdometerPhotoFile, setStartOdometerPhotoFile] = useState<File | null>(null);
  const [endOdometerPhotoFile, setEndOdometerPhotoFile] = useState<File | null>(null);
  const [startFuelPhotoFile, setStartFuelPhotoFile] = useState<File | null>(null);
  const [endFuelPhotoFile, setEndFuelPhotoFile] = useState<File | null>(null);

  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  const startFuelPhotoInputRef = useRef<HTMLInputElement>(null);
  const endFuelPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const startForm = useForm<StartTripFormValues>({
    resolver: zodResolver(startTripSchema),
    defaultValues: initialStartValues,
  });
  
  const endForm = useForm<EndFormValues>({
    resolver: zodResolver(endFormSchema),
    defaultValues: initialEndValues,
  });
  
  const handleChapaBlur = useCallback(async (plate: string) => {
    if(!plate || activeTab !== 'end') return;

    setIsSearching(true);
    try {
        const record = await getRecordByPlateAndStatus(plate, 'Em Andamento');
        if(record) {
            setRecordToEnd(record);
            endForm.setValue('driver', record.driver);
            endForm.setValue('car', record.car);
            endForm.setValue('line', record.line);
        } else {
            setRecordToEnd(null);
            endForm.reset({ ...initialEndValues, plate });
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
  
  const handleOdometerOcr = async (file: File | null) => {
    if (!file) return;

    setIsOcrLoading(true);
    try {
        const odomB64 = await fileToBase64(file);
      if (!odomB64) throw new Error("Could not convert file to data URI");
      
      const result = await extractOdometerFromImage({ odometerPhotoDataUri: odomB64 });

      if (result.odometer) {
        startForm.setValue('kmStart', result.odometer, { shouldValidate: true });
        toast({
          title: "KM Extraído!",
          description: `Valor preenchido: ${result.odometer}. Por favor, confirme se está correto.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: "Leitura do Hodômetro Falhou",
          description: "Não foi possível extrair o KM da imagem. Por favor, insira o valor manualmente.",
        });
      }
    } catch (error) {
      console.error("OCR failed", error);
      toast({
        variant: 'destructive',
        title: "Erro na Leitura da Imagem",
        description: "Ocorreu um problema ao processar a foto. Tente novamente ou insira o valor manualmente.",
      });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleFuelLevelOcr = async (file: File | null, formType: "start" | "end") => {
    if (!file) return;
    
    setIsFuelLevelLoading(formType);
    try {
        const fuelB64 = await fileToBase64(file);
        if (!fuelB64) throw new Error("Could not convert file to data URI");
        
        const result = await extractFuelLevelFromImage({ fuelGaugePhotoDataUri: fuelB64 });

        if (result.fuelLevel !== null) {
            const roundedLevel = Math.round(result.fuelLevel);
            if (formType === 'start') {
                startForm.setValue('startFuelLevel', roundedLevel, { shouldValidate: true });
            } else {
                endForm.setValue('endFuelLevel', roundedLevel, { shouldValidate: true });
            }
            toast({
                title: "Nível de Combustível Detectado!",
                description: `Nível preenchido: ${roundedLevel}%. Por favor, confirme ou ajuste o valor.`,
            });
        } else {
             toast({
                variant: 'destructive',
                title: "Leitura do Combustível Falhou",
                description: "Não foi possível detectar o nível da imagem. Por favor, marque o valor manualmente.",
            });
        }
    } catch (error) {
        console.error("Fuel level OCR failed", error);
        toast({
            variant: 'destructive',
            title: "Erro na Leitura da Imagem",
            description: "Ocorreu um problema ao processar a foto. Tente novamente ou marque o valor manualmente.",
        });
    } finally {
        setIsFuelLevelLoading(null);
    }
  };

  async function onStartSubmit(data: StartTripFormValues) {
    setIsSubmitting(true);
    
    try {
      if (!startOdometerPhotoFile || !startFuelPhotoFile) {
        toast({ variant: 'destructive', title: 'Fotos Obrigatórias', description: 'É necessário enviar a foto do hodômetro e do medidor de combustível.'});
        setIsSubmitting(false);
        return;
      }
  
      const [startOdometerPhotoB64, startFuelPhotoB64] = await Promise.all([
          fileToBase64(startOdometerPhotoFile),
          fileToBase64(startFuelPhotoFile),
      ]);
  
      const recordPayload: RecordAddPayload = {
        date: new Date().toISOString(),
        driver: data.driver,
        car: data.car,
        plate: data.plate,
        line: data.line,
        kmStart: data.kmStart,
        kmEnd: null,
        status: "Em Andamento",
        startOdometerPhoto: startOdometerPhotoB64,
        endOdometerPhoto: null,
        startFuelLevel: data.startFuelLevel,
        startFuelPhoto: startFuelPhotoB64,
      };
      await addRecord(recordPayload);
  
      toast({
        title: "Início de viagem registrado com sucesso!",
        description: "Seus dados foram salvos. Boa viagem!",
      });
      startForm.reset(initialStartValues);
      setStartOdometerPhotoFile(null);
      setStartFuelPhotoFile(null);
      if (startFileInputRef.current) startFileInputRef.current.value = "";
      if (startFuelPhotoInputRef.current) startFuelPhotoInputRef.current.value = "";
  
    } catch (e) {
      console.error("Failed to start trip", e);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar viagem",
        description: "Não foi possível salvar os dados. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEndSubmit(data: EndFormValues) {
     setIsSubmitting(true);
     try {
        if (!endOdometerPhotoFile || !endFuelPhotoFile) {
             toast({ variant: "destructive", title: "Fotos Obrigatórias", description: "Por favor, envie as fotos do odômetro e do medidor de combustível." });
             setIsSubmitting(false);
             return;
        }

        if (!recordToEnd) {
            toast({
                variant: "destructive",
                title: "Nenhuma viagem em andamento",
                description: "Por favor, insira uma chapa válida para encontrar a viagem a ser finalizada.",
            });
            setIsSubmitting(false);
            return;
        }

        if (data.kmEnd <= (recordToEnd.kmStart ?? 0)) {
            toast({
                variant: "destructive",
                title: "KM Final inválido",
                description: "O KM final deve ser maior que o KM inicial.",
            });
            setIsSubmitting(false);
            return;
        }

        const [endOdometerPhotoB64, endFuelPhotoB64] = await Promise.all([
            fileToBase64(endOdometerPhotoFile),
            fileToBase64(endFuelPhotoFile),
        ]);
        
        const dataToUpdate: Partial<Record> = {
          status: "Finalizado",
          kmEnd: data.kmEnd,
          endOdometerPhoto: endOdometerPhotoB64,
          endFuelLevel: data.endFuelLevel,
          endFuelPhoto: endFuelPhotoB64,
        };

        await updateRecord(recordToEnd.id, dataToUpdate);
        
        toast({
          title: "Viagem finalizada com sucesso!",
          description: "Seus dados foram atualizados.",
        });
        endForm.reset(initialEndValues);
        setRecordToEnd(null);
        setEndOdometerPhotoFile(null);
        setEndFuelPhotoFile(null);
        if (endFileInputRef.current) endFileInputRef.current.value = "";
        if (endFuelPhotoInputRef.current) endFuelPhotoInputRef.current.value = "";

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
    } else {
        startForm.reset(initialStartValues);
    }
  }, [activeTab, endForm, startForm]);

  const FuelSection = ({ formType }: { formType: "start" | "end" }) => {
    const form = formType === 'start' ? startForm : endForm;
    const levelFieldName = formType === 'start' ? 'startFuelLevel' : 'endFuelLevel';
    const photoFile = formType === 'start' ? startFuelPhotoFile : endFuelPhotoFile;
    const setPhotoFile = formType === 'start' ? setStartFuelPhotoFile : setEndFuelPhotoFile;
    const photoInputRef = formType === 'start' ? startFuelPhotoInputRef : endFuelPhotoInputRef;
    const isLoading = isFuelLevelLoading === formType;

    return (
        <div className="space-y-4 pt-4">
            <Separator />
             <p className="text-xs text-center text-muted-foreground px-4">Tire uma foto do medidor. Confirme ou ajuste usando os botões ou arraste o dedo sobre o medidor.</p>
            <FormItem className="w-full">
                <FormLabel
                    htmlFor={`${formType}-fuel-photo-upload`}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors",
                        photoFile ? "border-primary/50 text-primary" : "border-border text-muted-foreground",
                        isLoading && "animate-pulse"
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Camera className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">
                        {isLoading
                            ? "Analisando..."
                            : photoFile
                            ? "Foto Carregada"
                            : "Foto do Combustível"}
                    </span>
                </FormLabel>
                <FormControl>
                    <Input
                        id={`${formType}-fuel-photo-upload`}
                        type="file"
                        accept="image/*"
                        capture="camera"
                        className="sr-only"
                        ref={photoInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setPhotoFile(file);
                            handleFuelLevelOcr(file, formType);
                        }}
                    />
                </FormControl>
            </FormItem>
            <Controller
                control={form.control as any}
                name={levelFieldName}
                render={({ field }) => (
                <FuelGauge 
                    value={field.value} 
                    onValueChange={field.onChange} 
                />
                )}
            />
        </div>
    );
  };


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
            <TabsTrigger value="start">Registrar Início</TabsTrigger>
            <TabsTrigger value="end">Finalizar Viagem</TabsTrigger>
          </TabsList>
          
          <TabsContent value="start" className="pt-4">
            <Form {...startForm}>
              <form onSubmit={startForm.handleSubmit(onStartSubmit)} className="space-y-4 px-2">
                <FormField control={startForm.control} name="plate" render={({ field }) => (<FormItem><FormLabel>Chapa do Motorista</FormLabel><FormControl><Input placeholder="Sua matrícula" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={startForm.control} name="driver" render={({ field }) => (<FormItem><FormLabel>Nome do Motorista</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={startForm.control} name="car" render={({ field }) => (<FormItem><FormLabel>Carro</FormLabel><FormControl><Input placeholder="Número do veículo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={startForm.control} name="line" render={({ field }) => (<FormItem><FormLabel>Linha</FormLabel><FormControl><Input placeholder="Número da linha" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                
                <Separator />
                
                <FormItem>
                    <FormLabel>Foto do Hodômetro (Início)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input 
                                type="file" 
                                accept="image/*" 
                                capture="camera" 
                                className="pr-12" 
                                ref={startFileInputRef}
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setStartOdometerPhotoFile(file);
                                    handleOdometerOcr(file);
                                }}
                            />
                            <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        </div>
                    </FormControl>
                </FormItem>
                <FormField 
                    control={startForm.control} 
                    name="kmStart" 
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Confirmar KM Inicial</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    placeholder="Aguardando foto..." 
                                    {...field}
                                />
                                {isOcrLoading && <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin" />}
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <FuelSection formType="start" />


                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Enviando..." : "Salvar Início"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="end" className="pt-4">
            <Form {...endForm}>
              <form onSubmit={endForm.handleSubmit(onEndSubmit)} className="space-y-4 px-2">
                 <FormField
                  control={endForm.control}
                  name="plate"
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
                    name="driver"
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
                <Separator />
                <FormField
                  control={endForm.control}
                  name="kmEnd"
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
                <FormItem>
                  <FormLabel>Foto do Odômetro (Fim)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="file" accept="image/*" capture="camera" className="pr-12" ref={endFileInputRef} onChange={(e) => setEndOdometerPhotoFile(e.target.files?.[0] || null)} />
                      <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                
                <FuelSection formType="end" />

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
