
import * as XLSX from 'xlsx';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// =================================================================================================
// INSTRUÇÕES DE USO
// =================================================================================================
// 1. GERAR CHAVE DE SERVIÇO:
//    - Vá para o Console do Firebase: https://console.firebase.google.com/
//    - Selecione seu projeto.
//    - Clique na engrenagem (Configurações do Projeto) > Contas de serviço.
//    - Clique em "Gerar nova chave privada" e salve o arquivo JSON nesta pasta `scripts/`.
//    - **IMPORTANTE:** Renomeie o arquivo para `service-account-key.json`.
//
// 2. VERIFICAR ARQUIVO XLSX:
//    - Confirme que seu arquivo `mediaporcarro.xlsx` está dentro desta pasta `scripts/`.
//
// 3. EXECUTAR O SCRIPT:
//    - Abra um terminal na raiz do seu projeto e execute o seguinte comando:
//      npx tsx scripts/import-vehicles.ts
//
// 4. VERIFICAR:
//    - Após a execução, verifique a coleção "vehicles" no seu Firestore.
// =================================================================================================

try {
  const serviceAccount = require('./service-account-key.json');
  
  initializeApp({
    credential: cert(serviceAccount)
  });

} catch (error: any) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Arquivo de chave de serviço não encontrado.');
    console.error('Por favor, siga as instruções no topo do script para gerar e salvar o arquivo `service-account-key.json`.');
  } else {
    console.error('Erro ao inicializar o Firebase Admin:', error);
  }
  process.exit(1);
}


const db = getFirestore();
// O nome do arquivo tem espaços, então usamos o nome exato.
const vehiclesFilePath = path.resolve(__dirname, './media por carro.xlsx');

async function importVehicles() {
  try {
    console.log(`Lendo arquivo de: ${vehiclesFilePath}`);
    const workbook = XLSX.readFile(vehiclesFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const vehiclesJSON: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (vehiclesJSON.length === 0) {
        console.log('Nenhum veículo encontrado na planilha. Verifique o arquivo.');
        return;
    }

    const batch = db.batch();
    const collectionRef = db.collection('vehicles');

    console.log(`Importando ${vehiclesJSON.length} veículos para o Firestore...`);

    vehiclesJSON.forEach((vehicle: any) => {
      // Validar se as colunas essenciais existem para pular linhas vazias
      if (!vehicle['VEICULO'] || !vehicle['AMARELA'] || !vehicle['VERDE'] || !vehicle['DOURADA'] || !vehicle['CAPACIDADE TANQUE']) {
        console.warn(`\x1b[33m[AVISO]\x1b[0m Linha ignorada por falta de dados essenciais: ${JSON.stringify(vehicle)}`);
        return; // Pula esta linha
      }
      
      const carId = String(vehicle['VEICULO']);
      
      const vehicleData = {
        carId: carId,
        thresholds: {
          yellow: parseFloat(String(vehicle['AMARELA']).replace(',', '.')) || 0,
          green: parseFloat(String(vehicle['VERDE']).replace(',', '.')) || 0,
          gold: parseFloat(String(vehicle['DOURADA']).replace(',', '.')) || 0,
        },
        tankCapacity: Number(vehicle['CAPACIDADE TANQUE']) || 0,
        status: 'active' 
      };

      const docRef = collectionRef.doc(carId);
      batch.set(docRef, vehicleData, { merge: true });
    });

    await batch.commit();
    console.log('\x1b[32m%s\x1b[0m', `\nImportação concluída! ${vehiclesJSON.length} veículos foram processados e salvos/atualizados no Firestore.`);

  } catch (error: any) {
    if (error.code === 'ENOENT') {
        console.error('\x1b[31m%s\x1b[0m', 'ERRO: Arquivo `media por carro.xlsx` não encontrado na pasta `scripts/`.');
        console.error('Por favor, confirme se o arquivo está no local correto e se o nome corresponde exatamente.');
    } else {
        console.error('Erro durante a importação:', error);
    }
  }
}

importVehicles();
