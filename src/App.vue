<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
    <div class="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">

      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-blue-700 tracking-tight mb-2">Conciliação Financeira v5.2 (Final)</h1>

        <div
            class="flex flex-wrap justify-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 max-w-2xl mx-auto mt-4">
          <div class="flex flex-col">
            <label class="text-xs font-bold text-slate-500 uppercase">Escritório (%)</label>
            <input type="number" v-model.number="config.pctEscritorio"
                   class="w-24 p-2 border rounded font-bold text-blue-700">
          </div>
          <div class="flex flex-col">
            <label class="text-xs font-bold text-slate-500 uppercase">Joana (%)</label>
            <input type="number" v-model.number="config.pctJoana"
                   class="w-24 p-2 border rounded font-bold text-emerald-700">
          </div>
          <div class="flex flex-col">
            <label class="text-xs font-bold text-slate-500 uppercase">Nicolas (%)</label>
            <input type="number" v-model.number="config.pctNicolas"
                   class="w-24 p-2 border rounded font-bold text-orange-700">
          </div>
          <div class="flex items-end pb-1">
            <span :class="totalPct === 100 ? 'text-green-600' : 'text-red-600'" class="text-sm font-bold">
              Total: {{ totalPct }}%
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.extrato ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-blue-700 mb-1">Extrato Bancário</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'extrato')" class="hidden"/>
          <span class="text-xs text-slate-500 text-center">{{
              files.extrato ? files.extrato.name : 'Selecionar Extrato'
            }}</span>
        </label>

        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.projuris ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-emerald-700 mb-1">Projuris (Venc. 05)</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'projuris')" class="hidden"/>
          <span class="text-xs text-slate-500 text-center">{{
              files.projuris ? files.projuris.name : 'Selecionar Projuris'
            }}</span>
        </label>

        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.repasses ? 'border-purple-500 bg-purple-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-purple-700 mb-1">Repasses/Indicações</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'repasses')" class="hidden"/>
          <span class="text-xs text-slate-500 text-center">{{
              files.repasses ? files.repasses.name : 'Selecionar Repasses'
            }}</span>
        </label>
      </div>

      <button @click="processAndReconcile"
              class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-lg disabled:opacity-50"
              :disabled="isProcessing || totalPct !== 100">
        {{ isProcessing ? 'Processando...' : 'Iniciar Conferência' }}
      </button>

      <div v-if="logs.length > 0"
           class="mt-8 bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto shadow-inner">
        <div v-for="(log, index) in logs" :key="index">> {{ log }}</div>
      </div>

      <div v-if="results" class="mt-10 space-y-8">
        <div class="border border-green-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-green-50 text-green-800 p-4 font-bold border-b border-green-200">1. Entradas OK
            ({{ results.entradasOk.length }})
          </div>
          <div class="p-4 bg-white space-y-3">
            <div v-for="(item, i) in results.entradasOk" :key="i"
                 class="p-3 bg-green-50/50 border border-green-100 rounded text-sm">
              <div class="flex justify-between font-bold text-green-900">
                <span>{{ item.extratoRef }}</span>
                <span>Pasta: {{ item.pasta }}</span>
              </div>
              <div class="text-slate-600 mt-2 p-2 bg-white rounded border border-green-50 whitespace-pre-line">
                {{ item.detalhes }}
              </div>
            </div>
          </div>
        </div>

        <div class="border border-blue-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-blue-50 text-blue-800 p-4 font-bold border-b border-blue-200">2. Créditos Sem Correspondência
            ({{ results.reembolsos.length }})
          </div>
          <div class="p-4 bg-white max-h-96 overflow-y-auto">
            <div v-for="(item, i) in results.reembolsos" :key="i"
                 class="text-sm border-b py-2 flex justify-between gap-4">
              <span class="truncate">{{ item.textoOriginal }}</span>
              <span class="font-bold whitespace-nowrap">R$ {{ item.valorFormatado }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const files = ref({extrato: null, projuris: null, repasses: null});
const config = ref({pctEscritorio: 20, pctJoana: 40, pctNicolas: 40});
const isProcessing = ref(false);
const logs = ref([]);
const results = ref(null);

const totalPct = computed(() => config.value.pctEscritorio + config.value.pctJoana + config.value.pctNicolas);

const addLog = async (m) => {
  logs.value.push(m);
  await new Promise(r => setTimeout(r, 5));
};
const handleFile = (event, type) => {
  if (event.target.files[0]) files.value[type] = event.target.files[0];
};

const parseMoney = (s) => {
  if (!s) return 0;
  return Math.round((parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0) * 100) / 100;
};

const formatMoney = (v) => v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

const readPDF = async (file) => {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async (e) => {
      const pdf = await pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + ' ';
      }
      resolve(text.replace(/\s+/g, ' '));
    };
    reader.readAsArrayBuffer(file);
  });
};

const processAndReconcile = async () => {
  if (!files.value.extrato || !files.value.projuris) return alert("Selecione os arquivos!");
  isProcessing.value = true;
  logs.value = [];
  results.value = null;

  try {
    await addLog("Lendo e normalizando dados...");
    const [txtExt, txtPro, txtRep] = await Promise.all([
      readPDF(files.value.extrato),
      readPDF(files.value.projuris),
      files.value.repasses ? readPDF(files.value.repasses) : Promise.resolve("")
    ]);

    // 1. Extração Extrato (Cada crédito é um item)
    const extrato = [];
    txtExt.split(/(?=\d{2}\/\d{2}\s)/g).forEach(bloco => {
      if (bloco.includes('R$') && bloco.includes('C ') && !/SALDO|JUROS|ESTORNO/i.test(bloco)) {
        const valor = parseMoney(bloco.match(/R\$\s*([\d.,]+)C/i)?.[1]);
        // Captura o nome do pagador para ajudar no log
        const pagador = bloco.match(/Recebimento Pix (.*?) \*\*\*/i)?.[1] || bloco.substring(0, 30);
        extrato.push({texto: bloco.trim(), valor, pagador, usado: false});
      }
    });

    // 2. Extração Projuris (Agrupamento por PASTA)
    // Regex ultra-flexível para ignorar quebras de linha e lixo entre os dados
    const projurisPorPasta = {};
    const proRegex = /(CABRERA|JOANA|NICOLAS|ALVES PINTO|ASSOCIADOS).*?(\d{3,4}).*?R\$\s*([\d.,]+)/gi;

    let m;
    while ((m = proRegex.exec(txtPro)) !== null) {
      const pasta = m[2];
      const valor = parseMoney(m[3]);
      if (!projurisPorPasta[pasta]) projurisPorPasta[pasta] = {total: 0, itens: []};
      projurisPorPasta[pasta].total += valor;
      projurisPorPasta[pasta].itens.push({adv: m[1], valor});
    }

    // 3. Extração Repasses (Agregado por Pasta)
    const repasses = {};
    const repRegex = /(?:Repasse|Indica).*?(\d{3,4}).*?R\$\s*([\d.,]+)/gi;
    let r;
    while ((r = repRegex.exec(txtRep)) !== null) {
      const p = r[1];
      repasses[p] = (repasses[p] || 0) + parseMoney(r[2]);
    }

    await addLog(`Processando ${extrato.length} créditos...`);

    const rel = {entradasOk: [], reembolsos: []};

    // 4. Cruzamento Lógico (Prioridade: Valores que batem com (Projuris + Repasse))
    // Tentamos encontrar qual pasta corresponde a qual valor do extrato
    extrato.forEach(credito => {
      for (const [pasta, dados] of Object.entries(projurisPorPasta)) {
        if (dados.usado) continue;

        const valorRepasse = repasses[pasta] || 0;
        const totalNecessario = Math.round((dados.total + valorRepasse) * 100) / 100;

        // Se o valor do extrato é igual à soma do Projuris + Repasse daquela pasta
        if (Math.abs(credito.valor - totalNecessario) < 0.10) {
          credito.usado = true;
          dados.usado = true;
          rel.entradasOk.push({
            extratoRef: `${credito.pagador} (R$ ${formatMoney(credito.valor)})`,
            pasta: pasta,
            detalhes: `Soma Projuris: R$ ${formatMoney(dados.total)}\nRepasses: R$ ${formatMoney(valorRepasse)}`
          });
          break;
        }
      }
    });

    // 5. Tratamento Especial: Somar Pix da mesma pessoa (Caso Silvana)
    const pagadores = [...new Set(extrato.filter(e => !e.usado).map(e => e.pagador))];
    pagadores.forEach(p => {
      const itensPessoa = extrato.filter(e => !e.usado && e.pagador === p);
      if (itensPessoa.length > 1) {
        const somaPessoa = itensPessoa.reduce((acc, cur) => acc + cur.valor, 0);
        for (const [pasta, dados] of Object.entries(projurisPorPasta)) {
          if (dados.usado) continue;
          if (Math.abs(somaPessoa - (dados.total + (repasses[pasta] || 0))) < 0.10) {
            itensPessoa.forEach(i => i.usado = true);
            dados.usado = true;
            rel.entradasOk.push({
              extratoRef: `SOMA PIX: ${p} (R$ ${formatMoney(somaPessoa)})`,
              pasta: pasta,
              detalhes: `Múltiplos créditos batem com a pasta ${pasta}.`
            });
            break;
          }
        }
      }
    });

    rel.reembolsos = extrato.filter(e => !e.usado).map(e => ({
      textoOriginal: e.texto,
      valorFormatado: formatMoney(e.valor)
    }));

    results.value = rel;
    await addLog("Conferência Finalizada.");

  } catch (err) {
    await addLog("ERRO CRÍTICO: " + err.message);
  } finally {
    isProcessing.value = false;
  }
};
</script>