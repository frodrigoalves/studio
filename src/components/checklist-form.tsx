
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
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

const checklistItems = [
  "Adesivos", "Ar Condicionado", "Bancos", "Carroceria", "Cinto de Segurança", "Direção", 
  "Documentos", "Elevador", "Extintor", "Freios", "Gaveta Cobrador", "Janelas", 
  "Letreiro", "Limpador Pára-Brisa", "Molas", "Parte Elétrica", "Placas", "Pneus", 
  "Portas", "Selo de Roleta", "Suspensão a Ar", "Tacógrafo", "Validador", "Vazamento de ar"
] as const;

type ItemId = typeof checklistItems[number];

const itemSchema = z.enum(["ok", "avaria", "na"]);

// Cria um objeto Zod dinamicamente com todos os itens do checklist
const itemsShape = checklistItems.reduce((acc, item) => {
  acc[item] = itemSchema;
  return acc;
}, {} as Record<ItemId, typeof itemSchema>);

const checklistFormSchema = z.object({
  driverChapa: z.string().min(1, "Chapa é obrigatória."),
  driverName: z.string().min(1, "Nome é obrigatório."),
  carId: z.string().min(1, "Carro é obrigatório."),
  items: z.object(itemsShape).refine(obj => {
    return Object.keys(obj).length === checklistItems.length;
  }, { message: "Todos os itens devem ser verificados." }),
  observations: z.string().optional(),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

const initialValues: ChecklistFormValues = {
  driverChapa: "",
  driverName: "",
  carId: "",
  items: checklistItems.reduce((acc, item) => ({...acc, [item]: "ok" }), {} as Record<ItemId, ChecklistItemStatus>),
  observations: "",
};

export function ChecklistForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(data: ChecklistFormValues) {
    setIsSubmitting(true);
    try {
      const hasAvaria = Object.values(data.items).some(status => status === 'avaria');

      const payload: ChecklistRecordPayload = {
        driverChapa: data.driverChapa,
        driverName: data.driverName,
        carId: data.carId,
        items: data.items,
        // Se houver avaria, as observações se tornam obrigatórias
        observations: data.observations || (hasAvaria ? 'Avaria apontada sem descrição.' : null),
        hasIssue: hasAvaria
      };
      
      if (hasAvaria && !data.observations) {
         toast({
            variant: "destructive",
            title: "Observação necessária",
            description: "Por favor, descreva a avaria encontrada no campo de observações.",
         });
         setIsSubmitting(false);
         return;
      }

      await addChecklistRecord(payload);

      toast({
        title: "Vistoria registrada!",
        description: "Checklist enviado com sucesso.",
      });
      form.reset(initialValues);
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
          Realize a vistoria do veículo no início da jornada de trabalho.
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
            
            <div className="space-y-4">
                <CardTitle className="text-lg">Itens de Vistoria</CardTitle>
                <FormDescription>
                    Marque a condição de cada item abaixo.
                </FormDescription>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {checklistItems.map((item) => (
                     <FormField
                        key={item}
                        control={form.control}
                        name={`items.${item}`}
                        render={({ field }) => (
                          <FormItem className="space-y-2 p-3 rounded-md border bg-muted/20">
                            <FormLabel className="text-base font-semibold">{item}</FormLabel>
                            <FormControl>
                               <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex items-center space-x-4 pt-1"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="ok" />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">OK</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="avaria" />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">Avaria</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="na" />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">N/A</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                  ))}
                  </div>
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
