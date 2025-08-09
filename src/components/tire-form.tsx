
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { addTireRecord, TireRecordPayload } from "@/services/tire";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

const tireFormSchema = z.object({
  carId: z.string().min(1, "Nº do carro é obrigatório."),
  date: z.string().min(1, "Data é obrigatória."),
  tirePressure: z.coerce.number().min(0, "Calibragem inválida."),
  tireNumber: z.string().min(1, "Numeração do pneu é obrigatória."),
  treadDepth: z.coerce.number().min(0, "Sulco inválido."),
  rotationPerformed: z.boolean().default(false),
  isRetreaded: z.boolean().default(false),
  tirePosition: z.string().min(1, "Posição é obrigatória."),
  observations: z.string().optional(),
});

type TireFormValues = z.infer<typeof tireFormSchema>;

const initialValues: TireFormValues = {
  carId: "",
  date: new Date().toISOString().split('T')[0],
  tirePressure: 0,
  tireNumber: "",
  treadDepth: 0,
  rotationPerformed: false,
  isRetreaded: false,
  tirePosition: "",
  observations: "",
};

const tirePositions = [
    "Dianteiro Esquerdo", "Dianteiro Direito",
    "Traseiro Interno Esquerdo", "Traseiro Externo Esquerdo",
    "Traseiro Interno Direito", "Traseiro Externo Direito",
    "Estepe"
];

export function TireForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TireFormValues>({
    resolver: zodResolver(tireFormSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(data: TireFormValues) {
    setIsSubmitting(true);
    try {
        const payload: TireRecordPayload = {
            ...data,
            date: new Date(data.date).toISOString(),
        };
        await addTireRecord(payload);
        toast({
          title: "Registro de pneu salvo!",
          description: "Os dados foram salvos com sucesso.",
        });
        form.reset(initialValues);
    } catch(e) {
        console.error("Failed to save tire record", e);
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
    <Card>
        <CardHeader>
            <CardTitle>Formulário de Aferição</CardTitle>
            <CardDescription>
                Preencha todos os campos para registrar a avaliação de um pneu.
            </CardDescription>
        </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="carId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nº do Carro</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: 21184" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Data da Aferição</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="tirePosition"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Posição do Pneu</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a posição no veículo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {tirePositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="tireNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Numeração</FormLabel>
                        <FormControl>
                            <Input placeholder="Nº de fogo" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="tirePressure"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Calibragem (PSI)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Ex: 120" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="treadDepth"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sulco (mm)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.1" placeholder="Ex: 8.5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                 <FormField
                    control={form.control}
                    name="rotationPerformed"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-input">
                            <div className="space-y-0.5">
                                <FormLabel>Houve rodízio?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="isRetreaded"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-input">
                            <div className="space-y-0.5">
                                <FormLabel>É recapado?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

             <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Descreva qualquer dano, avaria ou intercorrência observada..."
                        className="resize-none"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Registrando..." : "Registrar Aferição do Pneu"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
