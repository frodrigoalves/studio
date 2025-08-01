
"use client";

import { useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Send, ArrowLeft, ArrowRight, Camera, Car, ClipboardCheck, Signature, User, Milestone, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { addChecklistRecord, type ChecklistRecordPayload, type ChecklistItemStatus } from "@/services/checklist";
import { addRecord, getRecordByPlateAndStatus, type RecordAddPayload } from "@/services/records";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./ui/signature-pad";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

// Schemas for each step
const step1Schema = z.object({
  driverChapa: z.string().min(1, "Chapa é obrigatória."),
  driverName: z.string().min(1, "Nome é obrigatório."),
  carId: z.string().min(1, "Carro é obrigatório."),
  line: z.string().min(1, "Linha é obrigatória."),
});

const step2Schema = z.object({
  initialKm: z.coerce.number({ required_error: "Km Inicial é obrigatório." }).min(1, "Km Inicial é obrigatório."),
  odometerPhoto: z.any().refine(file => file, "Foto do odômetro é obrigatória."),
  fuelGaugePhoto: z.any().refine(file => file, "Foto do marcador de combustível é obrigatória."),
  frontDiagonalPhoto: z.any().refine(file => file, "Foto da diagonal frontal é obrigatória."),
  rearDiagonalPhoto: z.any().refine(file => file, "Foto da diagonal traseira é obrigatória."),
  leftSidePhoto: z.any().refine(file => file, "Foto da lateral esquerda é obrigatória."),
  rightSidePhoto: z.any().refine(file => file, "Foto da lateral direita é obrigatória."),
});


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

const step3Schema = z.object({
  items: z.object(itemsShape),
  observations: z.string().optional(),
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

const step4Schema = z.object({
  signature: z.string().refine(sig => sig && sig.length > 0, { message: "A assinatura é obrigatória." }),
});

const journeyFormSchema = z.object({
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
  ...step4Schema.shape,
});

type JourneyFormValues = z.infer<typeof journeyFormSchema>;

const initialValues: JourneyFormValues = {
  driverChapa: "",
  driverName: "",
  carId: "",
  line: "",
  initialKm: '' as unknown as number,
  odometerPhoto: null,
  fuelGaugePhoto: null,
  frontDiagonalPhoto: null,
  rearDiagonalPhoto: null,
  leftSidePhoto: null,
  rightSidePhoto: null,
  items: allChecklistItems.reduce((acc, item) => ({...acc, [item]: "ok" }), {} as Record<ItemId, ChecklistItemStatus>),
  observations: "",
  signature: "",
};


const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema];

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const photoExamples = [
    { title: 'Hodômetro', description: 'Foto nítida do KM inicial no painel.', hint: 'bus dashboard odometer' },
    { title: 'Marcador de Combustível', description: 'Mostre claramente o nível de combustível.', hint: 'bus fuel gauge' },
    { title: 'Diagonal Frontal', description: 'Pegue a frente e a lateral do veículo em uma só foto.', hint: 'bus front corner' },
    { title: 'Diagonal Traseira', description: 'Pegue a traseira e a outra lateral do veículo.', hint: 'bus rear corner' },
    { title: 'Lateral Esquerda', description: 'Foto completa da lateral esquerda do ônibus.', hint: 'bus side view' },
    { title: 'Lateral Direita', description: 'Foto completa da lateral direita do ônibus.', hint: 'bus side view' },
]


export function JourneyStartForm() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JourneyFormValues>({
    resolver: zodResolver(journeyFormSchema),
    defaultValues: initialValues,
  });
  
  const watchItems = form.watch('items');

  const nextStep = async () => {
    const currentSchema = stepSchemas[currentStep];
    const fieldsToValidate = Object.keys(currentSchema.shape) as (keyof JourneyFormValues)[];
    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);
  
  async function onSubmit(data: JourneyFormValues) {
    setIsSubmitting(true);
    try {
        const existingRecord = await getRecordByPlateAndStatus(data.driverChapa, "Em Andamento");
        if (existingRecord) {
            toast({
                variant: "destructive",
                title: "Viagem já iniciada",
                description: "Já existe uma viagem em andamento para esta chapa.",
            });
            setIsSubmitting(false);
            return;
        }

      // 1. Salvar checklist
      const hasAvaria = Object.values(data.items).some(status => status === 'avaria');
      const checklistPayload: ChecklistRecordPayload = {
        driverChapa: data.driverChapa,
        driverName: data.driverName,
        carId: data.carId,
        items: data.items,
        observations: data.observations || null,
        hasIssue: hasAvaria,
        signature: data.signature,
      };
      await addChecklistRecord(checklistPayload);

      // 2. Upload de todas as fotos em paralelo
      const [
          odometerPhotoUrl, fuelGaugePhotoUrl, frontDiagonalPhotoUrl,
          rearDiagonalPhotoUrl, leftSidePhotoUrl, rightSidePhotoUrl
      ] = await Promise.all([
          fileToBase64(data.odometerPhoto),
          fileToBase64(data.fuelGaugePhoto),
          fileToBase64(data.frontDiagonalPhoto),
          fileToBase64(data.rearDiagonalPhoto),
          fileToBase64(data.leftSidePhoto),
          fileToBase64(data.rightSidePhoto),
      ]);

      // 3. Salvar registro de KM com as fotos
      const recordPayload: RecordAddPayload = {
        date: new Date().toISOString().split('T')[0],
        driver: data.driverName,
        car: data.carId,
        plate: data.driverChapa,
        line: data.line,
        kmStart: data.initialKm,
        kmEnd: null,
        status: "Em Andamento",
        startOdometerPhoto: odometerPhotoUrl,
        endOdometerPhoto: null,
        fuelGaugePhoto: fuelGaugePhotoUrl,
        frontDiagonalPhoto: frontDiagonalPhotoUrl,
        rearDiagonalPhoto: rearDiagonalPhotoUrl,
        leftSidePhoto: leftSidePhotoUrl,
        rightSidePhoto: rightSidePhotoUrl,
      };
      await addRecord(recordPayload);

      toast({
        title: "Jornada iniciada com sucesso!",
        description: "Todos os dados foram salvos. Boa viagem!",
      });
      form.reset(initialValues);
      setCurrentStep(0);
    } catch (e) {
      console.error("Falha ao iniciar jornada", e);
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: "Não foi possível salvar os dados. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const progress = useMemo(() => ((currentStep + 1) / (stepSchemas.length + 1)) * 100, [currentStep]);

  return (
    <Card className="shadow-2xl shadow-primary/10 border-2 border-primary/50">
        <CardHeader>
            <Progress value={progress} className="w-full h-2 mb-4" />
            <div className="flex justify-between items-center">
                 <div>
                    <CardTitle>Formulário de Início de Jornada</CardTitle>
                    <CardDescription>Siga os passos para registrar o início do seu turno.</CardDescription>
                </div>
                 <div className="text-sm text-muted-foreground font-medium">
                    Passo {currentStep + 1} de {stepSchemas.length}
                </div>
            </div>
        </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {currentStep === 0 && (
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5 text-primary"/> Identificação</h3>
                    <FormField control={form.control} name="driverChapa" render={({ field }) => (<FormItem><FormLabel>Chapa do Motorista</FormLabel><FormControl><Input placeholder="Sua matrícula" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="driverName" render={({ field }) => (<FormItem><FormLabel>Nome do Motorista</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="carId" render={({ field }) => (<FormItem><FormLabel>Carro</FormLabel><FormControl><Input placeholder="Número do veículo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="line" render={({ field }) => (<FormItem><FormLabel>Linha</FormLabel><FormControl><Input placeholder="Número da linha" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
            )}

            {currentStep === 1 && (
                <div className="space-y-6">
                     <h3 className="text-lg font-semibold flex items-center gap-2"><Milestone className="w-5 h-5 text-primary"/> Leituras e Fotos</h3>
                    
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-base">Guia Visual de Fotos</CardTitle> 
                           <CardDescription className="text-xs">Passe as imagens para ver exemplos de cada foto necessária.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Carousel className="w-full max-w-xs mx-auto">
                                <CarouselContent>
                                    {photoExamples.map((photo, index) => (
                                    <CarouselItem key={index}>
                                        <div className="p-1">
                                        <Card>
                                            <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                                                 <Image 
                                                    src={`https://placehold.co/300x200.png?text=${photo.title.replace(' ', '+')}`} 
                                                    alt={photo.title} 
                                                    width={300} 
                                                    height={200} 
                                                    className="rounded-md"
                                                    data-ai-hint={photo.hint}
                                                />
                                                <h4 className="font-semibold mt-2">{photo.title}</h4>
                                                <p className="text-xs text-muted-foreground text-center">{photo.description}</p>
                                            </CardContent>
                                        </Card>
                                        </div>
                                    </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="-left-8" />
                                <CarouselNext className="-right-8" />
                                </Carousel>
                        </CardContent>
                    </Card>


                    <FormField control={form.control} name="initialKm" render={({ field }) => (<FormItem><FormLabel>KM Inicial do Veículo</FormLabel><FormControl><Input type="number" placeholder="123456" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="odometerPhoto" render={({ field: { onChange, ...rest }}) => (<FormItem><FormLabel>1. Foto do Hodômetro</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="fuelGaugePhoto" render={({ field: { onChange, ...rest }}) => (<FormItem><FormLabel>2. Foto do Combustível</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="frontDiagonalPhoto" render={({ field: { onChange, ...rest }}) => (<FormItem><FormLabel>3. Diagonal Frontal</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="rearDiagonalPhoto" render={({ field: { onChange, ...rest }}) => (<FormItem><FormLabel>4. Diagonal Traseira</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="leftSidePhoto" render={({ field: { onChange, ...rest }}) => (<FormItem><FormLabel>5. Lateral Esquerda</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="rightSidePhoto" render={({ field: { onChange, ...rest }}) => (<FormItem><FormLabel>6. Lateral Direita</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                </div>
            )}
            
            {currentStep === 2 && (
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                        {items.map((item) => (
                                            <FormField key={item} control={form.control} name={`items.${item as ItemId}`}
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
                     <FormField control={form.control} name="observations" render={({ field }) => ( <FormItem><FormLabel className="text-base font-semibold">Observações Gerais</FormLabel><FormDescription>Se algum item estiver com avaria, é obrigatório descrever o problema aqui.</FormDescription><FormControl><Textarea placeholder="Ex: Pneu dianteiro direito visivelmente baixo, trinca no para-brisa, etc." className="resize-none" rows={4} {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
            )}
            
            {currentStep === 3 && (
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center gap-2"><Signature className="w-5 h-5 text-primary"/> Confirmação e Assinatura</h3>
                    <p className="text-sm text-muted-foreground">Revise os dados antes de assinar. Sua assinatura confirma a veracidade de todas as informações fornecidas.</p>
                     <FormField control={form.control} name="signature" render={({ field }) => ( <FormItem><FormLabel className="text-lg font-semibold">Assinatura do Motorista</FormLabel><FormControl><SignaturePad onSignatureEnd={(signature) => field.onChange(signature)} className="w-full h-48 border rounded-lg bg-background" /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
            )}

            <div className="flex justify-between pt-4">
              {currentStep > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
              ) : <div></div>}

              {currentStep < stepSchemas.length - 1 ? (
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
      </CardContent>
    </Card>
  );
}

    