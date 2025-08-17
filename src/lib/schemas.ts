import { z } from "zod";

// Enum oficial com acento
export const ChassisType = z.enum(["CONVENCIONAL","ARTICULADO","PADRÃO","UNKNOWN"]);

export const VehicleThresholds = z.object({
  yellow: z.number().min(0),
  green:  z.number().min(0),
  gold:   z.number().min(0),
});

export const VehicleParamsSchema = z.object({
  carId: z.string().min(1).transform(s => s.replace(/\D/g,"")),
  status: z.enum(["active","inactive"]).default("active"),
  chassisType: ChassisType.default("UNKNOWN"),
  thresholds: VehicleThresholds,
  tankCapacity: z.number().min(0).optional(),
  // campos de sistema
  updatedAt: z.any().optional(),   // Firestore Timestamp ou ISO
  _hash: z.string().optional(),    // md5 parcial para diffs
});

export type VehicleParameters = z.infer<typeof VehicleParamsSchema>;
