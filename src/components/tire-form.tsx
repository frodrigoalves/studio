
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { addTireRecord, TireRecordPayload } from "@/services/tire";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";

const tireFormSchema = z.object({
  carId: z.string().min(1, "Nº do carro é obrigatório."),
  date: z.string().min(1, "Data é obrigatória."),
  tirePressure: z.coerce.number().min(0, "Calibragem inválida."),
  tireNumber: z.string().min(1, "Numeração do pneu é obrigatória."),
  treadDepth: z.coerce.number().min(0, "Sulco inválido."),
  rotationPerformed: z.boolean().default(false),
  isRetreaded: z.boolean().default(false),
  tirePosition: z.string().min(1, "Selecione um pneu no chassi."),
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
    { id: "dd", label: "Dianteiro Direito" },
    { id: "de", label: "Dianteiro Esquerdo" },
    { id: "tide", label: "Traseiro Interno Direito" },
    { id: "tede", label: "Traseiro Externo Direito" },
    { id: "tie", label: "Traseiro Interno Esquerdo" },
    { id: "tee", label: "Traseiro Externo Esquerdo" },
    { id: "estepe", label: "Estepe" },
];

const TireButton = ({ position, label, selected, onClick, className }: { position: string, label: string, selected: boolean, onClick: (pos: string) => void, className?: string }) => (
    <button
        type="button"
        onClick={() => onClick(position)}
        className={cn(
            "aspect-square w-12 h-16 rounded-lg bg-input border-2 border-border/50 flex items-center justify-center transition-all duration-200 hover:border-primary/80 hover:bg-accent",
            selected && "bg-primary border-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary-foreground",
            className
        )}
        aria-label={label}
        title={label}
    >
        <div className={cn("w-4/5 h-4/5 rounded-md border-2", selected ? 'border-primary-foreground/50' : 'border-border')}></div>
    </button>
);


export function TireForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TireFormValues>({
    resolver: zodResolver(tireFormSchema),
    defaultValues: initialValues,
  });

  const selectedTire = form.watch("tirePosition");

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
                Selecione um pneu no chassi e preencha os campos para registrar a avaliação.
            </CardDescription>
        </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
                control={form.control}
                name="tirePosition"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-lg font-semibold">Posição do Pneu</FormLabel>
                         <FormDescription>
                            Clique sobre o pneu no desenho do chassi abaixo para selecioná-lo.
                         </FormDescription>
                        <FormControl>
                            <div className="flex justify-center items-center p-4 bg-muted/30 rounded-lg border border-dashed">
                                <div className="space-y-4">
                                    {/* Axle Front */}
                                    <div className="flex justify-between items-center w-64 mx-auto relative">
                                        <div className="absolute h-1.5 w-full bg-border/50 rounded-full" />
                                        <TireButton position="de" label="Dianteiro Esquerdo" selected={field.value === 'de'} onClick={(pos) => field.onChange(pos)} />
                                        <TireButton position="dd" label="Dianteiro Direito" selected={field.value === 'dd'} onClick={(pos) => field.onChange(pos)} />
                                    </div>
                                     {/* Axle Rear */}
                                    <div className="flex justify-between items-center w-80 mx-auto relative">
                                        <div className="absolute h-1.5 w-full bg-border/50 rounded-full" />
                                        <div className="flex gap-1">
                                             <TireButton position="tee" label="Traseiro Externo Esquerdo" selected={field.value === 'tee'} onClick={(pos) => field.onChange(pos)} />
                                             <TireButton position="tie" label="Traseiro Interno Esquerdo" selected={field.value === 'tie'} onClick={(pos) => field.onChange(pos)} />
                                        </div>
                                        <div className="flex gap-1">
                                            <TireButton position="tide" label="Traseiro Interno Direito" selected={field.value === 'tide'} onClick={(pos) => field.onChange(pos)} />
                                            <TireButton position="tede" label="Traseiro Externo Direito" selected={field.value === 'tede'} onClick={(pos) => field.onChange(pos)} />
                                        </div>
                                    </div>
                                     {/* Spare */}
                                    <div className="flex justify-center pt-4">
                                        <TireButton position="estepe" label="Estepe" selected={field.value === 'estepe'} onClick={(pos) => field.onChange(pos)} />
                                    </div>
                                </div>
                            </div>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                )}
            />

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="tireNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Numeração (Nº de fogo)</FormLabel>
                        <FormControl>
                            <Input placeholder="Nº de fogo do pneu" {...field} />
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
