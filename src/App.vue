<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
    <div class="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">

      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-blue-700 tracking-tight mb-2">Conciliação Financeira v6.3</h1>
        <p class="text-slate-500">Correção de Leitura e Agrupamento por Nome Completo</p>
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
              class="w-full bg-slate-800 hover:bg-black text-white font-bold py-4 rounded-lg shadow-md transition-all"
              :disabled="isProcessing">
        {{ isProcessing ? 'CONFERINDO DADOS...' : 'INICIAR CONFERÊNCIA' }}
      </button>

      <div v-if="logs.length > 0"
           class="mt-8 bg-slate-900 text-blue-300 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto">
        <div v-for="(log, index) in logs" :key="index">> {{ log }}</div>
      </div>

      <div v-if="results" class="mt-10 space-y-10">
        <section>
          <h2 class="text-xl font-bold text-emerald-700 mb-4 flex items-center">
            <span class="bg-emerald-100 px-3 py-1 rounded-full mr-2">{{ results.entradasOk.length }}</span>
            Entradas OK
          </h2>
          <div class="grid grid-cols-1 gap-3">
            <div v-for="(item, i) in results.entradasOk" :key="i"
                 class="bg-white border-l-4 border-emerald-500 p-4 shadow-sm rounded-r-lg">
              <div class="flex justify-between font-bold text-slate-800">
                <span>{{ item.extratoRef }}</span>
                <span>Pasta: {{ item.pasta }}</span>
              </div>
              <div
                  class="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-line">
                {{ item.detalhes }}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-xl font-bold text-blue-700 mb-4 flex items-center">
            <span class="bg-blue-100 px-3 py-1 rounded-full mr-2">{{ results.reembolsos.length }}</span>
            Créditos Sem Correspondência
          </h2>
          <div class="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <div v-for="(item, i) in results.reembolsos" :key="i"
                 class="text-sm border-b py-2 flex justify-between gap-4">
              <span class="text-slate-600">{{ item.textoOriginal }}</span>
              <span class="font-bold text-blue-600 whitespace-nowrap">R$ {{ item.valorFormatado }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const files = ref({extrato: null, projuris: null, repasses: null});
const isProcessing = ref(false);
const logs = ref([]);
const results = ref(null);

const addLog = async (m) => {
  logs.value.push(m);
  await new Promise(r => setTimeout(r, 5));
};
const handleFile = (event, type) => {
  if (event.target.files[0]) files.value[type] = event.target.files[0];
};

const parseMoney = (s) => {
  if (!s) return 0;
  const clean = s.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Math.round(parseFloat(clean) * 100) / 100;
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
    await addLog("Lendo PDFs...");
    const [txtExt, txtPro, txtRep] = await Promise.all([
      readPDF(files.value.extrato),
      readPDF(files.value.projuris),
      files.value.repasses ? readPDF(files.value.repasses) : Promise.resolve("")
    ]);

    // 1. Extração Projuris por Pasta
    const projurisPorPasta = {};
    const proRegex = /(CABRERA|JOANA|NICOLAS|ASSOCIADOS|ESCRIT).*?(\d{3,4}).*?R\$\s*([\d.,]+)/gi;
    let m;
    while ((m = proRegex.exec(txtPro)) !== null) {
      const pasta = m[2];
      const valor = parseMoney(m[3]);
      if (!projurisPorPasta[pasta]) projurisPorPasta[pasta] = {total: 0, usado: false};
      projurisPorPasta[pasta].total += valor;
    }

    // 2. Extração Repasses
    const repasses = {};
    const repRegex = /(?:Repasse|Indica).*?(\d{3,4}).*?R\$\s*([\d.,]+)/gi;
    let r;
    while ((r = repRegex.exec(txtRep)) !== null) {
      const p = r[1];
      repasses[p] = (repasses[p] || 0) + parseMoney(r[2]);
    }

    // 3. Extração Extrato (Apenas Créditos)
    const extrato = [];
    // Quebra o extrato por datas para analisar linha a linha
    txtExt.split(/(?=\d{2}\/\d{2}\s)/g).forEach(linha => {
      // Regra de Ouro: Precisa ter R$, precisa ter 'C' (crédito) e NÃO pode ter 'D' (débito) no valor final
      if (linha.includes('R$') && linha.includes('C ') && !linha.match(/R\$\s*[\d.,]+D/)) {
        if (/SALDO|JUROS|TARIFA/i.test(linha)) return;

        const valor = parseMoney(linha.match(/R\$\s*([\d.,]+)C/i)?.[1]);
        const pagadorMatch = linha.match(/Recebimento Pix (.*?) \*\*\*/i);
        const pagador = pagadorMatch ? pagadorMatch[1].trim() : linha.substring(0, 50).trim();

        extrato.push({texto: linha.trim(), valor, pagador, usado: false});
      }
    });

    await addLog(`Processando ${extrato.length} créditos encontrados...`);

    const rel = {entradasOk: [], reembolsos: []};

    // PASSO 1: Cruzamento por Nome Completo (Somas)
    const nomesUnicos = [...new Set(extrato.map(e => e.pagador))];

    nomesUnicos.forEach(nome => {
      const itensDesteNome = extrato.filter(e => e.pagador === nome && !e.usado);
      if (itensDesteNome.length === 0) return;

      const somaExtrato = Math.round(itensDesteNome.reduce((acc, cur) => acc + cur.valor, 0) * 100) / 100;

      for (const [pasta, dados] of Object.entries(projurisPorPasta)) {
        if (dados.usado) continue;
        const totalPro = Math.round((dados.total + (repasses[pasta] || 0)) * 100) / 100;

        if (Math.abs(somaExtrato - totalPro) < 0.15) {
          itensDesteNome.forEach(i => i.usado = true);
          dados.usado = true;
          rel.entradasOk.push({
            extratoRef: nome,
            pasta: pasta,
            detalhes: `Soma Extrato (R$ ${formatMoney(somaExtrato)}) = Projuris (R$ ${formatMoney(dados.total)}) + Repasse (R$ ${formatMoney(repasses[pasta] || 0)})`
          });
          break;
        }
      }
    });

    // PASSO 2: Sobras
    rel.reembolsos = extrato.filter(e => !e.usado).map(e => ({
      textoOriginal: e.texto,
      valorFormatado: formatMoney(e.valor)
    }));

    results.value = rel;
    await addLog("Conferência Finalizada!");

  } catch (err) {
    await addLog("ERRO: " + err.message);
  } finally {
    isProcessing.value = false;
  }
};
</script>