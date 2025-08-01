
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Camera, Loader2, Send, ArrowLeft, ArrowRight, User, Phone, ClipboardCheck, Signature, Car as CarIcon, GaugeCircle, Fuel, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { addRecord, getRecordByPlateAndStatus, updateRecord, RecordUpdatePayload, Record, RecordAddPayload } from "@/services/records";
import { addChecklistRecord, ChecklistRecordPayload, ChecklistItemStatus } from "@/services/checklist";
import { extractOdometerFromImage, OcrInput } from "@/ai/flows/ocr-flow";
import { cn } from "@/lib/utils";
import { Progress } from "./ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { SignaturePad } from "./ui/signature-pad";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";


const fileToBase64 = (file: File | null): Promise<string | null> => {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const checklistSections = {
  "Estrutura Externa e Segurança": ["Adesivos", "Carroceria", "Janelas", "Placas", "Pneus", "Molas", "Suspensão a Ar", "Vazamento de ar"],
  "Cabine e Componentes Internos": ["Bancos", "Cinto de Segurança", "Direção", "Extintor", "Limpador Pára-Brisa", "Portas", "Painel"],
  "Sistemas Eletrônicos e Operacionais": ["Ar Condicionado", "Freios", "Parte Elétrica", "Letreiro", "Tacógrafo"],
  "Acessibilidade e Passageiros": ["Documentos", "Elevador", "Gaveta Cobrador", "Selo de Roleta", "Validador"],
};
const allChecklistItems = Object.values(checklistSections).flat();
type ItemId = typeof allChecklistItems[number];
const itemSchema = z.enum(["ok", "avaria", "na"]);
const itemsShape = allChecklistItems.reduce((acc, item) => {
  acc[item] = itemSchema;
  return acc;
}, {} as Record<ItemId, typeof itemSchema>);


// --- Schemas ---

const startTripSchema = z.object({
    // Step 1
    plate: z.string().min(1, "Chapa é obrigatória."),
    driver: z.string().min(1, "Nome é obrigatório."),
    car: z.string().min(1, "Carro é obrigatório."),
    line: z.string().min(1, "Linha é obrigatória."),
    
    // Step 2
    kmStart: z.coerce.number({ required_error: "Km Inicial é obrigatório."}).min(1, "Km Inicial é obrigatório."),
    fuelLevel: z.string({ required_error: "Nível de combustível é obrigatório." }).min(1, "É obrigatório confirmar o nível de combustível."),

    // Step 3
    items: z.object(itemsShape),
    observations: z.string().optional(),

    // Step 4
    signature: z.string().refine(sig => sig && sig.length > 0, { message: "A assinatura é obrigatória." }),
}).refine(data => {
    const hasAvaria = Object.values(data.items).some(status => status === 'avaria');
    if (hasAvaria) {
        return data.observations && data.observations.trim().length > 0;
    }
    return true;
}, {
    message: "É obrigatório descrever a avaria no campo de observações.",
    path: ["observations"],
});


type StartTripFormValues = z.infer<typeof startTripSchema>;

const endFormSchema = z.object({
  plate: z.string().min(1, "Chapa é obrigatória."),
  driver: z.string().min(1, "Nome é obrigatório."),
  car: z.string().min(1, "Carro é obrigatório."),
  line: z.string().min(1, "Linha é obrigatória."),
  kmEnd: z.coerce.number({ required_error: "Km Final é obrigatório."}).min(1, "Km Final é obrigatório."),
});
type EndFormValues = z.infer<typeof endFormSchema>;

const stepFields: (keyof StartTripFormValues)[][] = [
    ['plate', 'driver', 'car', 'line'],
    ['kmStart', 'fuelLevel'],
    ['items', 'observations'],
    ['signature']
];


const initialStartValues: StartTripFormValues = {
    plate: "",
    driver: "",
    car: "",
    line: "",
    kmStart: 0,
    fuelLevel: '',
    items: allChecklistItems.reduce((acc, item) => ({...acc, [item]: "ok" }), {} as Record<ItemId, ChecklistItemStatus>),
    observations: "",
    signature: ""
};

const initialEndValues: EndFormValues = { 
    plate: "", 
    driver: "", 
    car: "", 
    line: "", 
    kmEnd: 0, 
};

const fuelOptions = [
    { value: "vazio", label: "Vazio" },
    { value: "1/4", label: "1/4" },
    { value: "1/2", label: "1/2" },
    { value: "3/4", label: "3/4" },
    { value: "cheio", label: "Cheio" },
];


export function DriverForm() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("start");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [recordToEnd, setRecordToEnd] = useState<Record | null>(null);
  const [startTripStep, setStartTripStep] = useState(0);

  const odometerPhotoRef = useRef<HTMLInputElement>(null);
  const frontDiagonalPhotoRef = useRef<HTMLInputElement>(null);
  const rearDiagonalPhotoRef = useRef<HTMLInputElement>(null);
  const leftSidePhotoRef = useRef<HTMLInputElement>(null);
  const rightSidePhotoRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  
  const startForm = useForm<StartTripFormValues>({
    resolver: zodResolver(startTripSchema),
    defaultValues: initialStartValues,
    mode: "onChange",
  });
  
  const endForm = useForm<EndFormValues>({
    resolver: zodResolver(endFormSchema),
    defaultValues: initialEndValues,
  });
  
  const watchItems = startForm.watch('items');

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
  
  const handleOcr = async () => {
    const odometerFile = odometerPhotoRef.current?.files?.[0];

    if (!odometerFile) {
        toast({
            variant: 'destructive',
            title: 'Foto Obrigatória',
            description: 'É necessário enviar a foto do hodômetro.',
        });
        return;
    }
    setIsOcrLoading(true);

    try {
        const odomB64 = await fileToBase64(odometerFile);
        
      if (!odomB64) throw new Error("Could not convert file to data URI");
      
      const ocrInput: OcrInput = {
          odometerPhotoDataUri: odomB64,
      };

      const result = await extractOdometerFromImage(ocrInput);

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

  async function onStartSubmit(data: StartTripFormValues) {
    setIsSubmitting(true);
    try {
        const odometerPhoto = odometerPhotoRef.current?.files?.[0] ?? null;
        
        if (!odometerPhoto) {
            toast({ variant: 'destructive', title: 'Foto Obrigatória', description: 'É necessário enviar a foto do hodômetro.'});
            setIsSubmitting(false);
            return;
        }

      const existingRecord = await getRecordByPlateAndStatus(data.plate, "Em Andamento");
      if (existingRecord) {
        toast({
          variant: "destructive",
          title: "Viagem já iniciada",
          description: "Já existe uma viagem em andamento para esta chapa.",
        });
        setIsSubmitting(false);
        return;
      }
  
      const [
        odometerPhotoB64,
        frontDiagonalPhotoB64, rearDiagonalPhotoB64, 
        leftSidePhotoB64, rightSidePhotoB64
      ] = await Promise.all([
        fileToBase64(odometerPhoto),
        fileToBase64(frontDiagonalPhotoRef.current?.files?.[0] ?? null),
        fileToBase64(rearDiagonalPhotoRef.current?.files?.[0] ?? null),
        fileToBase64(leftSidePhotoRef.current?.files?.[0] ?? null),
        fileToBase64(rightSidePhotoRef.current?.files?.[0] ?? null),
      ]);
  
      const hasAvaria = Object.values(data.items).some(status => status === 'avaria');
      const checklistPayload: ChecklistRecordPayload = {
        driverChapa: data.plate,
        driverName: data.driver,
        carId: data.car,
        items: data.items,
        observations: data.observations || null,
        hasIssue: hasAvaria,
        signature: data.signature,
        odometerPhoto: odometerPhotoB64,
        fuelGaugePhoto: null, // Campo removido
        frontDiagonalPhoto: frontDiagonalPhotoB64,
        rearDiagonalPhoto: rearDiagonalPhotoB64,
        leftSidePhoto: leftSidePhotoB64,
        rightSidePhoto: rightSidePhotoB64,
      };
      await addChecklistRecord(checklistPayload);
  
      const recordPayload: RecordAddPayload = {
        date: new Date().toISOString().split('T')[0],
        driver: data.driver,
        car: data.car,
        plate: data.plate,
        line: data.line,
        kmStart: data.kmStart,
        kmEnd: null,
        status: "Em Andamento",
        startOdometerPhoto: odometerPhotoB64,
        endOdometerPhoto: null,
      };
      await addRecord(recordPayload);
  
      toast({
        title: "Jornada iniciada com sucesso!",
        description: "Todos os dados foram salvos. Boa viagem!",
      });
      startForm.reset(initialStartValues);
      
      if (odometerPhotoRef.current) odometerPhotoRef.current.value = "";
      if (frontDiagonalPhotoRef.current) frontDiagonalPhotoRef.current.value = "";
      if (rearDiagonalPhotoRef.current) rearDiagonalPhotoRef.current.value = "";
      if (leftSidePhotoRef.current) leftSidePhotoRef.current.value = "";
      if (rightSidePhotoRef.current) rightSidePhotoRef.current.value = "";

      setStartTripStep(0);
  
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
        const endOdometerPhoto = endFileInputRef.current?.files?.[0];
        if (!endOdometerPhoto) {
             toast({ variant: "destructive", title: "Foto Obrigatória", description: "Por favor, envie a foto do odômetro final." });
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

        const photoBase64 = await fileToBase64(endOdometerPhoto);
        
        const dataToUpdate: RecordUpdatePayload = {
          status: "Finalizado",
          kmEnd: data.kmEnd,
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
    } else {
        setStartTripStep(0);
        startForm.reset(initialStartValues);
    }
  }, [activeTab, endForm, startForm]);
  
  const nextStep = async () => {
    const fields = stepFields[startTripStep];
    const isValid = await startForm.trigger(fields as any, { shouldFocus: true });
    if (isValid) {
      setStartTripStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setStartTripStep((prev) => prev - 1);
  const progress = useMemo(() => ((startTripStep + 1) / (stepFields.length + 1)) * 100, [startTripStep]);


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
            <TabsTrigger value="start">Iniciar Viagem (com Vistoria)</TabsTrigger>
            <TabsTrigger value="end">Finalizar Viagem</TabsTrigger>
          </TabsList>
          
          <TabsContent value="start" className="pt-4">
            <Form {...startForm}>
              <form onSubmit={startForm.handleSubmit(onStartSubmit)} className="space-y-6 px-2">
                
                <div className="flex items-center gap-4">
                    <Progress value={progress} className="h-2 flex-grow" />
                    <div className="text-sm text-muted-foreground font-medium">
                        Passo {startTripStep + 1} de {stepFields.length}
                    </div>
                </div>
                
                {startTripStep === 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5 text-primary"/> Identificação</h3>
                        <FormField control={startForm.control} name="plate" render={({ field }) => (<FormItem><FormLabel>Chapa do Motorista</FormLabel><FormControl><Input placeholder="Sua matrícula" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={startForm.control} name="driver" render={({ field }) => (<FormItem><FormLabel>Nome do Motorista</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={startForm.control} name="car" render={({ field }) => (<FormItem><FormLabel>Carro</FormLabel><FormControl><Input placeholder="Número do veículo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={startForm.control} name="line" render={({ field }) => (<FormItem><FormLabel>Linha</FormLabel><FormControl><Input placeholder="Número da linha" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                )}
                
                {startTripStep === 1 && (
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><GaugeCircle className="w-5 h-5 text-primary"/> Painel do Veículo</h3>
                        <FormItem>
                            <FormLabel>1. Foto do Hodômetro</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="camera" 
                                        className="pr-12" 
                                        ref={odometerPhotoRef}
                                        onChange={handleOcr}
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
                                <FormLabel>2. Confirmar KM Inicial</FormLabel>
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
                       <FormField
                          control={startForm.control}
                          name="fuelLevel"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel>3. Confirmar Nível de Combustível</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="grid grid-cols-5 gap-2 pt-2"
                                    >
                                        {fuelOptions.map((opt, index) => {
                                            const colorClass = 
                                                index === 0 ? "bg-red-200 border-red-400 text-red-800" :
                                                index === 1 ? "bg-yellow-200 border-yellow-400 text-yellow-800" :
                                                index === 2 ? "bg-blue-200 border-blue-400 text-blue-800" :
                                                index === 3 ? "bg-green-200 border-green-400 text-green-800" :
                                                "bg-emerald-300 border-emerald-500 text-emerald-900";

                                            return (
                                                <FormItem key={opt.value}>
                                                    <FormControl>
                                                         <RadioGroupItem value={opt.value} className="sr-only" />
                                                    </FormControl>
                                                    <FormLabel className={cn(
                                                        "flex flex-col items-center justify-center rounded-md border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                                                        field.value === opt.value && `${colorClass} font-bold shadow-md scale-105`
                                                    )}>
                                                        <Fuel className="mb-2 h-6 w-6" />
                                                        <span className="text-xs">{opt.label}</span>
                                                    </FormLabel>
                                                </FormItem>
                                            )
                                        })}
                                    </RadioGroup>
                                </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                )}

                {startTripStep === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary"/> Checklist de Vistoria</h3>
                        <Alert variant="default" className="bg-blue-50 border-blue-200">
                            <Phone className="h-4 w-4 !text-blue-700" />
                            <AlertTitle className="text-blue-800 font-semibold">ATENÇÃO OPERADORES!</AlertTitle>
                            <AlertDescription className="text-blue-700">
                               <p>Manutenção: <strong>(31) 99959-3176</strong> (WhatsApp)</p>
                               <p>Tráfego: <strong>(31) 99959-3089</strong> / Fixo: <strong>3673-7000</strong></p>
                            </AlertDescription>
                        </Alert>
                        <Accordion type="single" collapsible defaultValue="item-1">
                            {Object.entries(checklistSections).map(([sectionTitle, items], index) => (
                                <AccordionItem value={`item-${index+1}`} key={sectionTitle}>
                                    <AccordionTrigger>{sectionTitle}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            {items.map((item) => (
                                                <FormField key={item} control={startForm.control} name={`items.${item as ItemId}`}
                                                    render={({ field }) => (
                                                    <FormItem className={cn("space-y-2 p-3 rounded-lg border transition-all", watchItems[item as ItemId] === 'avaria' ? 'border-destructive bg-destructive/10' : 'bg-muted/30')}>
                                                        <FormLabel className="text-sm font-semibold flex items-center justify-between w-full"><span>{item}</span>{watchItems[item as ItemId] === 'avaria' && <span className="text-xs font-bold text-destructive">AVARIA</span>}{watchItems[item as ItemId] === 'ok' && <span className="text-xs font-bold text-green-600">OK</span>}{watchItems[item as ItemId] === 'na' && <span className="text-xs font-medium text-muted-foreground">N/A</span>}</FormLabel>
                                                        <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-2 pt-1"><FormItem className="flex-1"><FormControl><RadioGroupItem value="ok" className="sr-only" /></FormControl><FormLabel className={cn("block w-full p-2 text-center rounded-md cursor-pointer border text-xs h-9 flex items-center justify-center", field.value === 'ok' ? 'bg-green-600 text-white border-green-700 font-bold' : 'bg-background')}>OK</FormLabel></FormItem><FormItem className="flex-1"><FormControl><RadioGroupItem value="avaria" className="sr-only" /></FormControl><FormLabel className={cn("block w-full p-2 text-center rounded-md cursor-pointer border text-xs h-9 flex items-center justify-center", field.value === 'avaria' ? 'bg-destructive text-destructive-foreground border-destructive/80 font-bold' : 'bg-background')}>Avaria</FormLabel></FormItem><FormItem className="flex-1"><FormControl><RadioGroupItem value="na" className="sr-only" /></FormControl><FormLabel className={cn("block w-full p-2 text-center rounded-md cursor-pointer border text-xs h-9 flex items-center justify-center", field.value === 'na' ? 'bg-muted-foreground text-background border-muted-foreground/80' : 'bg-background')}>N/A</FormLabel></FormItem></RadioGroup></FormControl>
                                                    </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                         <FormField control={startForm.control} name="observations" render={({ field }) => ( <FormItem><FormLabel className="text-base font-semibold">Observações Gerais</FormLabel><FormDescription>Se algum item estiver com avaria, é obrigatório descrever o problema aqui.</FormDescription><FormControl><Textarea placeholder="Ex: Pneu dianteiro direito visivelmente baixo, trinca no para-brisa, etc." className="resize-none" rows={4} {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                )}
                
                {startTripStep === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Signature className="w-5 h-5 text-primary"/> Confirmação e Assinatura</h3>
                        <div className="space-y-6">
                            <p className="text-sm text-muted-foreground">Tire fotos externas opcionais e assine para confirmar a veracidade de todas as informações fornecidas na vistoria e no registro de KM.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormItem><FormLabel>Diagonal Frontal (Opcional)</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={frontDiagonalPhotoRef} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                                <FormItem><FormLabel>Diagonal Traseira (Opcional)</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={rearDiagonalPhotoRef} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                                <FormItem><FormLabel>Lateral Esquerda (Opcional)</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={leftSidePhotoRef} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                                <FormItem><FormLabel>Lateral Direita (Opcional)</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={rightSidePhotoRef} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                            </div>
                            <FormField control={startForm.control} name="signature" render={({ field }) => ( <FormItem><FormLabel className="text-lg font-semibold">Assinatura do Motorista</FormLabel><FormControl><SignaturePad onSignatureEnd={(signature) => field.onChange(signature ?? "")} className="w-full h-48 border rounded-lg bg-background" /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </div>
                )}

                <div className="flex justify-between pt-4">
                  {startTripStep > 0 ? (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                  ) : <div></div>}

                  {startTripStep < stepFields.length - 1 ? (
                    <Button type="button" onClick={nextStep}>
                      Avançar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {isSubmitting ? "Enviando..." : "Concluir e Iniciar Jornada"}
                    </Button>
                  )}
                </div>
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
                      <Input type="file" accept="image/*" capture="camera" className="pr-12" ref={endFileInputRef} />
                      <Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
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
