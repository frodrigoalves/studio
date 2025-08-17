import * as XLSX from "xlsx";
import CryptoJS from "crypto-js";
import { VehicleParamsSchema, VehicleParameters, ChassisType } from "./schemas";

// Normalizadores
const toNum = (x:any) => {
  if (x === null || x === undefined || x === "") return undefined;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
const norm = (s:any) => (s ?? "").toString().trim();

// Mapeia qualquer entrada para o enum oficial (com acento)
export function normalizeChassisType(input: any): typeof ChassisType._type {
  const raw = norm(input).toUpperCase();
  if (raw === "CONVENCIONAL") return "CONVENCIONAL";
  if (raw === "ARTICULADO")   return "ARTICULADO";
  // acolhe variações comuns
  if (raw === "PADRÃO" || raw === "PADRAO" || raw === "PADRON") return "PADRÃO";
  return "UNKNOWN";
}

// Resolve a aba: "BASE MEDIAS" se existir; caso contrário, primeira.
function pickSheet(workbook: XLSX.WorkBook, preferred = "BASE MEDIAS") {
  const wanted = workbook.SheetNames.find(n => n.toLowerCase().trim() === preferred.toLowerCase());
  return workbook.Sheets[wanted ?? workbook.SheetNames[0]];
}

// Colunas canônicas (case-insensitive)
const COLUMNS = {
  veiculo: "VEICULO",
  tipoChassi: "TIPO CHASSI",
  tipoVeiculo: "TIPO DE VEICULO",
  modelo: "MODELO/TIPO",
  tanque: "CAPACIDADE TANQUE",
  thAmarela: ["AMARELA","TH_YELLOW"],
  thVerde:   ["VERDE","TH_GREEN"],
  thDourada: ["DOURADA","TH_GOLD"],
};

function findField(row: any, keys: string | string[]) {
  const map: Record<string, any> = {};
  Object.keys(row).forEach(k => map[k.toLowerCase().trim()] = row[k]);
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    const val = map[k.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

/**
 * Lê um Buffer XLSX e retorna catálogo normalizado por carId.
 */
export function parseVehiclesFromXlsx(buf: Buffer, sheetName?: string) {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = sheetName ? wb.Sheets[sheetName] : pickSheet(wb);
  if (!ws) throw new Error("Planilha sem aba válida.");

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const out: Record<string, VehicleParameters> = {};

  for (const r of rows) {
    const carId = norm(findField(r, COLUMNS.veiculo));
    if (!carId) continue;

    const raw = {
      carId,
      status: "active" as const,
      chassisType: normalizeChassisType(findField(r, COLUMNS.tipoChassi)),
      thresholds: {
        yellow: toNum(findField(r, COLUMNS.thAmarela)) ?? 0,
        green:  toNum(findField(r, COLUMNS.thVerde))   ?? 0,
        gold:   toNum(findField(r, COLUMNS.thDourada)) ?? 0,
      },
      tankCapacity: toNum(findField(r, COLUMNS.tanque)),
      // os campos abaixo não vêm da planilha
      updatedAt: undefined,
      _hash: undefined,
    };

    const parsed = VehicleParamsSchema.parse(raw);
    const hash = CryptoJS.MD5(JSON.stringify({
      carId: parsed.carId,
      chassisType: parsed.chassisType,
      thresholds: parsed.thresholds,
      tankCapacity: parsed.tankCapacity ?? null,
      status: parsed.status
    })).toString().slice(0,12);

    out[parsed.carId] = { ...parsed, _hash: hash };
  }

  if (!Object.keys(out).length) throw new Error("Nenhum veículo válido encontrado.");
  return out;
}

/**
 * Compara dois catálogos e retorna diffs.
 */
export function diffCatalog(
  current: Record<string, VehicleParameters>,
  next: Record<string, VehicleParameters>
) {
  const added: VehicleParameters[] = [];
  const removed: VehicleParameters[] = [];
  const changed: Array<{ id:string; before:VehicleParameters; after:VehicleParameters }> = [];

  const curKeys = new Set(Object.keys(current));
  const nextKeys = new Set(Object.keys(next));

  for (const id of nextKeys) {
    if (!curKeys.has(id)) { added.push(next[id]); continue; }
    if ((current[id]._hash ?? "") !== (next[id]._hash ?? "")) {
      changed.push({ id, before: current[id], after: next[id] });
    }
  }
  for (const id of curKeys) {
    if (!nextKeys.has(id)) removed.push(current[id]);
  }

  return {
    added, removed, changed,
    totals: { cur: curKeys.size, next: nextKeys.size }
  };
}
