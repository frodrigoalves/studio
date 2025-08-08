
"use client";

import { useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Loader2, Send, Camera } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { addChecklistRecord, type ChecklistRecordPayload, type ChecklistItemStatus } from "@/services/checklist";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./ui/signature-pad";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

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

const checklistFormSchema = z.object({
  driverChapa: z.string().min(1, "Chapa é obrigatória."),
  driverName: z.string().min(1, "Nome é obrigatório."),
  carId: z.string().min(1, "Carro é obrigatório."),
  items: z.object(itemsShape),
  observations: z.string().optional(),
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


type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

const initialValues: ChecklistFormValues = {
  driverChapa: "",
  driverName: "",
  carId: "",
  items: allChecklistItems.reduce((acc, item) => ({...acc, [item]: "ok" }), {} as Record<ItemId, ChecklistItemStatus>),
  observations: "",
  signature: "",
};

export function ChecklistForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frontDiagonalPhotoFile, setFrontDiagonalPhotoFile] = useState<File | null>(null);
  const [rearDiagonalPhotoFile, setRearDiagonalPhotoFile] = useState<File | null>(null);
  const [leftSidePhotoFile, setLeftSidePhotoFile] = useState<File | null>(null);
  const [rightSidePhotoFile, setRightSidePhotoFile] = useState<File | null>(null);

  const frontDiagonalPhotoRef = useRef<HTMLInputElement>(null);
  const rearDiagonalPhotoRef = useRef<HTMLInputElement>(null);
  const leftSidePhotoRef = useRef<HTMLInputElement>(null);
  const rightSidePhotoRef = useRef<HTMLInputElement>(null);

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: initialValues,
  });

  const watchItems = form.watch('items');

  async function onSubmit(data: ChecklistFormValues) {
    setIsSubmitting(true);
    try {
      const hasAvaria = Object.values(data.items).some(status => status === 'avaria');

      const [
        frontDiagonalPhotoB64, rearDiagonalPhotoB64, 
        leftSidePhotoB64, rightSidePhotoB64
      ] = await Promise.all([
        fileToBase64(frontDiagonalPhotoFile),
        fileToBase64(rearDiagonalPhotoFile),
        fileToBase64(leftSidePhotoFile),
        fileToBase64(rightSidePhotoFile),
      ]);

      const payload: ChecklistRecordPayload = {
        driverChapa: data.driverChapa,
        driverName: data.driverName,
        carId: data.carId,
        items: data.items,
        observations: data.observations || null,
        hasIssue: hasAvaria,
        signature: data.signature,
        frontDiagonalPhoto: frontDiagonalPhotoB64,
        rearDiagonalPhoto: rearDiagonalPhotoB64,
        leftSidePhoto: leftSidePhotoB64,
        rightSidePhoto: rightSidePhotoB64,
      };
      
      await addChecklistRecord(payload);

      toast({
        title: "Vistoria registrada!",
        description: "Checklist enviado com sucesso.",
      });
      form.reset(initialValues);
      
      setFrontDiagonalPhotoFile(null);
      setRearDiagonalPhotoFile(null);
      setLeftSidePhotoFile(null);
      setRightSidePhotoFile(null);

      if (frontDiagonalPhotoRef.current) frontDiagonalPhotoRef.current.value = "";
      if (rearDiagonalPhotoRef.current) rearDiagonalPhotoRef.current.value = "";
      if (leftSidePhotoRef.current) leftSidePhotoRef.current.value = "";
      if (rightSidePhotoRef.current) rightSidePhotoRef.current.value = "";

    } catch (e) {
      console.error("Failed to save checklist record", e);
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: "Não foi possível salvar os dados. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="shadow-2xl shadow-primary/10 border-2 border-primary/50">
      <CardHeader>
        <CardTitle>Checklist de Vistoria</CardTitle>
        <CardDescription>
          Realize a vistoria do veículo no início do turno de trabalho. Os itens já vêm marcados como "OK", altere apenas o que for necessário.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
                <CardTitle className="text-lg">Identificação</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="driverChapa"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Chapa do Motorista</FormLabel>
                        <FormControl>
                            <Input placeholder="Sua matrícula" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="driverName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Motorista</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                control={form.control}
                name="carId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Carro</FormLabel>
                    <FormControl>
                        <Input placeholder="Número do veículo" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
             <div className="space-y-6">
                <CardTitle className="text-lg">Fotos Externas (Obrigatório)</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormItem><FormLabel>Diagonal Frontal</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={frontDiagonalPhotoRef} onChange={(e) => setFrontDiagonalPhotoFile(e.target.files?.[0] || null)} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                    <FormItem><FormLabel>Diagonal Traseira</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={rearDiagonalPhotoRef} onChange={(e) => setRearDiagonalPhotoFile(e.target.files?.[0] || null)} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                    <FormItem><FormLabel>Lateral Esquerda</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={leftSidePhotoRef} onChange={(e) => setLeftSidePhotoFile(e.target.files?.[0] || null)} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                    <FormItem><FormLabel>Lateral Direita</FormLabel><FormControl><div className="relative"><Input type="file" accept="image/*" capture="camera" className="pr-12" ref={rightSidePhotoRef} onChange={(e) => setRightSidePhotoFile(e.target.files?.[0] || null)} /><Camera className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" /></div></FormControl></FormItem>
                </div>
             </div>

             <div className="space-y-2">
                <CardTitle className="text-lg">Itens de Vistoria</CardTitle>
                <Accordion type="single" collapsible className="w-full">
                {Object.entries(checklistSections).map(([sectionTitle, items]) => (
                    <AccordionItem value={sectionTitle} key={sectionTitle}>
                        <AccordionTrigger>{sectionTitle}</AccordionTrigger>
                        <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {items.map((item) => (
                            <FormField
                                key={item}
                                control={form.control}
                                name={`items.${item as ItemId}`}
                                render={({ field }) => (
                                <FormItem className={cn(
                                        "space-y-2 p-3 rounded-lg border transition-all",
                                        watchItems[item as ItemId] === 'avaria' ? 'border-destructive bg-destructive/10' : 'bg-muted/30'
                                    )}>
                                    <FormLabel className="text-sm font-semibold flex items-center justify-between w-full">
                                        <span>{item}</span>
                                        {watchItems[item as ItemId] === 'avaria' && <span className="text-xs font-bold text-destructive">AVARIA</span>}
                                        {watchItems[item as ItemId] === 'ok' && <span className="text-xs font-bold text-green-600">OK</span>}
                                        {watchItems[item as ItemId] === 'na' && <span className="text-xs font-medium text-muted-foreground">N/A</span>}
                                    </FormLabel>
                                    <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center space-x-2 pt-1"
                                    >
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <RadioGroupItem value="ok" className="sr-only" />
                                            </FormControl>
                                            <FormLabel className={cn(
                                                "block w-full p-2 text-center rounded-md cursor-pointer border text-xs h-9 flex items-center justify-center",
                                                field.value === 'ok' ? 'bg-green-600 text-white border-green-700 font-bold' : 'bg-background'
                                            )}>OK</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <RadioGroupItem value="avaria" className="sr-only" />
                                            </FormControl>
                                            <FormLabel className={cn(
                                                "block w-full p-2 text-center rounded-md cursor-pointer border text-xs h-9 flex items-center justify-center",
                                                field.value === 'avaria' ? 'bg-destructive text-destructive-foreground border-destructive/80 font-bold' : 'bg-background'
                                            )}>Avaria</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <RadioGroupItem value="na" className="sr-only" />
                                            </FormControl>
                                            <FormLabel className={cn(
                                                "block w-full p-2 text-center rounded-md cursor-pointer border text-xs h-9 flex items-center justify-center",
                                                field.value === 'na' ? 'bg-muted-foreground text-background border-muted-foreground/80' : 'bg-background'
                                            )}>N/A</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            ))}
                        </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
            </div>
            
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Observações Gerais</FormLabel>
                   <FormDescription>
                      Se algum item estiver com avaria, é obrigatório descrever o problema aqui.
                    </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Pneu dianteiro direito visivelmente baixo, trinca no para-brisa, etc."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="signature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Assinatura do Motorista</FormLabel>
                  <FormDescription>
                    Assine no campo abaixo para confirmar a veracidade das informações.
                  </FormDescription>
                  <FormControl>
                    <SignaturePad
                        onSignatureEnd={(signature) => field.onChange(signature ?? "")}
                        className="w-full h-48 border rounded-lg bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Enviando..." : "Enviar Vistoria"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
