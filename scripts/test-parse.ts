// Executa um parse local do XLSX e imprime resumo/diff consigo mesmo.
import * as fs from "node:fs";
import * as path from "node:path";
import { parseVehiclesFromXlsx, diffCatalog } from "../src/lib/catalog";

async function main() {
  const file = path.join(process.cwd(), "scripts", "media por carro.xlsx");
  if (!fs.existsSync(file)) {
    console.error("Arquivo não encontrado:", file);
    console.error("Por favor, adicione o arquivo 'media por carro.xlsx' na pasta 'scripts' para executar o teste.")
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  const cat = parseVehiclesFromXlsx(buf, "BASE MEDIAS");
  const keys = Object.keys(cat);
  console.log("Veículos carregados:", keys.length);
  console.log("Amostra:", keys.slice(0,5).map(k => cat[k]));

  // diff com ele mesmo (deve dar zero)
  const d = diffCatalog(cat, cat);
  console.log("Diff (self):", { added: d.added.length, changed: d.changed.length, removed: d.removed.length });
}

main().catch(e => { console.error(e); process.exit(1); });
