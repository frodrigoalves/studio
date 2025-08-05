
"use client";

import { useState, useCallback } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addFuelingRecord } from "@/services/fueling";

const fuelingFormSchema = z.object({
    attendantChapa: z.string().min(1, "Chapa é obrigatória."),
    attendantName: z.string().min(1, "Nome é obrigatório."),
    carId: z.string().min(1, "Carro é obrigatório."),
    odometer: z.coerce.number({ required_error: "Hodômetro é obrigatório."}).min(1, "Hodômetro é obrigatório."),
    pump: z.coerce.number().min(1, "Bomba é obrigatória."),
    liters: z.coerce.number({ required_error: "Litros é obrigatório."}).min(1, "Litros é obrigatório."),
});

type FuelingFormValues = z.infer<typeof fuelingFormSchema>;

const initialValues: Omit<FuelingFormValues, 'odometer' | 'liters' | 'pump'> & { odometer: string | number, liters: string | number, pump: string | number } = {
    attendantChapa: "",
    attendantName: "",
    carId: "",
    odometer: "",
    pump: "",
    liters: "",
};


export function FuelingForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FuelingFormValues>({
    resolver: zodResolver(fuelingFormSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  async function onSubmit(data: FuelingFormValues) {
    setIsSubmitting(true);
    try {
        await addFuelingRecord(data);
        toast({
          title: "Abastecimento registrado!",
          description: "Os dados foram salvos com sucesso.",
        });
        form.reset(initialValues);
    } catch(e) {
        console.error("Failed to save fueling record", e);
        toast({
            variant: "destructive",
            title: "Erro ao registrar",
            description: "Não foi possível salvar os dados. Tente novamente.",
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="shadow-2xl shadow-primary/10 border-2 border-primary/50">
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="attendantChapa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapa do Abastecedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Sua matrícula" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attendantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Abastecedor</FormLabel>
                  <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="odometer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hodômetro</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Digite o KM do veículo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pump"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bomba</FormLabel>
                       <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? "")}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1,2,3,4,5,6].map(pumpNum => (
                            <SelectItem key={pumpNum} value={String(pumpNum)}>{`Bomba ${pumpNum}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="liters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Litros Abastecidos</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 50.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Registrando..." : "Registrar Abastecimento"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
