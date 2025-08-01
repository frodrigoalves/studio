
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { addChecklistRecord } from "@/services/checklist";
import { Textarea } from "./ui/textarea";

const checklistItems = [
  { id: "tires", label: "Pneus (calibragem e desgaste)" },
  { id: "brakes", label: "Freios (fluido e resposta)" },
  { id: "lights", label: "Faróis e Lanternas" },
  { id: "horn", label: "Buzina" },
  { id: "mirrors", label: "Retrovisores" },
  { id: "wipers", label: "Limpadores de para-brisa" },
  { id: "oilLevel", label: "Nível de Óleo" },
  { id: "waterLevel", label: "Nível de Água do Radiador" },
  { id: "documents", label: "Documentos do Veículo" },
  { id: "cleaning", label: "Limpeza interna e externa" },
] as const;

const checklistFormSchema = z.object({
  driverChapa: z.string().min(1, "Chapa é obrigatória."),
  driverName: z.string().min(1, "Nome é obrigatório."),
  carId: z.string().min(1, "Carro é obrigatório."),
  items: z.array(z.string()).refine((value) => value.length === checklistItems.length, {
    message: "Você deve marcar todos os itens para confirmar a vistoria.",
  }),
  observations: z.string().optional(),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

const initialValues: ChecklistFormValues = {
  driverChapa: "",
  driverName: "",
  carId: "",
  items: [],
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
      const a_items: Record<string, boolean> = {};
      checklistItems.forEach(item => {
        a_items[item.id] = data.items.includes(item.id);
      })
      await addChecklistRecord({
        driverChapa: data.driverChapa,
        driverName: data.driverName,
        carId: data.carId,
        items: a_items,
        observations: data.observations || null,
      });

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
        <CardTitle>Checklist de Pré-Viagem</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Itens de Vistoria</FormLabel>
                    <FormDescription>
                      Marque todos os itens para confirmar que foram verificados.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {checklistItems.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="items"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value) => value !== item.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item.label}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                   <FormDescription>
                      Se algum item não estiver conforme, descreva o problema aqui.
                    </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Pneu dianteiro direito visivelmente baixo..."
                      className="resize-none"
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
