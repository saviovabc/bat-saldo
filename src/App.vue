<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
    <div class="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">

      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-blue-700 tracking-tight mb-2">Conciliação Financeira v7.7</h1>
        <p class="text-slate-500">Agrupamento de Múltiplos Lançamentos + Margem de R$ 0,10</p>
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
        {{ isProcessing ? 'REPROCESSANDO AGRUPAMENTOS...' : 'INICIAR CONFERÊNCIA' }}
      </button>

      <div v-if="logs.length > 0"
           class="mt-8 bg-slate-900 text-blue-300 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto">
        <div v-for="(log, index) in logs" :key="index">> {{ log }}</div>
      </div>

      <div v-if="results" class="mt-10 space-y-10">
        <section v-if="results.entradasOk.length">
          <h2 class="text-xl font-bold text-emerald-700 mb-4 flex items-center">
            <span class="bg-emerald-100 px-3 py-1 rounded-full mr-2">{{ results.entradasOk.length }}</span> Entradas OK
          </h2>
          <div class="grid grid-cols-1 gap-3">
            <div v-for="(item, i) in results.entradasOk" :key="i"
                 class="bg-white border-l-4 border-emerald-500 p-4 shadow-sm rounded-r-lg">
              <div class="flex justify-between font-bold text-slate-800">
                <span>{{ item.cliente }}</span>
                <span>Pasta: {{ item.pasta }}</span>
              </div>
              <p class="mt-1 text-sm text-blue-600 font-semibold">{{ item.resumoValores }}</p>
              <p class="mt-2 text-xs text-slate-500 whitespace-pre-line">{{ item.detalhes }}</p>
            </div>
          </div>
        </section>

        <section v-if="results.reembolsos.length">
          <h2 class="text-xl font-bold text-blue-700 mb-4 flex items-center">
            <span class="bg-blue-100 px-3 py-1 rounded-full mr-2">{{ results.reembolsos.length }}</span> Sem
            Correspondência no Projuris
          </h2>
          <div class="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <div v-for="(item, i) in results.reembolsos" :key="i"
                 class="text-sm border-b py-2 flex justify-between gap-4">
              <span class="text-slate-600">{{ item.nome }}</span>
              <span class="font-bold text-blue-600">R$ {{ item.valorFormatado }}</span>
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
const handleFile = (e, t) => {
  if (e.target.files[0]) files.value[t] = e.target.files[0];
};

const parseMoney = (s) => {
  if (!s) return 0;
  let clean = s.replace(/R\$/g, '').replace(/[^\d,.-]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/\./g, '').replace(',', '.');
  else clean = clean.replace(',', '.');
  return Math.round(parseFloat(clean) * 100) / 100;
};

const formatMoney = (v) => v.toLocaleString('pt-BR', {minimumFractionDigits: 2});

const readPDF = async (file) => {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async (e) => {
      const pdf = await pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + ' \n ';
      }
      resolve(text.toUpperCase());
    };
    reader.readAsArrayBuffer(file);
  });
};

const processAndReconcile = async () => {
  if (!files.value.extrato || !files.value.projuris) return alert("Arquivos necessários!");
  isProcessing.value = true;
  logs.value = [];
  results.value = null;

  try {
    const [txtExt, txtPro] = await Promise.all([readPDF(files.value.extrato), readPDF(files.value.projuris)]);

    await addLog("Extraindo e Agrupando Projuris por Pasta...");
    const projurisPorPasta = {};
    const proRegex = /(CABRERA|JOANA|NICOLAS|ASSOCIADOS|ESCRIT).*?(\d{3,5}).*?R\$\s*([\d., ]+)/gi;
    let m;
    while ((m = proRegex.exec(txtPro)) !== null) {
      const pasta = m[2];
      const valor = parseMoney(m[3]);
      const origem = m[1].trim();

      if (!projurisPorPasta[pasta]) {
        projurisPorPasta[pasta] = {total: 0, itens: [], contexto: ""};
        projurisPorPasta[pasta].contexto = txtPro.substring(Math.max(0, m.index - 400), Math.min(txtPro.length, m.index + 400));
      }
      projurisPorPasta[pasta].total += valor;
      projurisPorPasta[pasta].itens.push({origem, valor});
    }

    await addLog("Extraindo e Agrupando Extrato por Cliente...");
    const extratoAgrupado = {};

    // PIX
    const pixRegex = /RECEBIMENTO PIX (.*?) (?:[\*|\d]|$).*?R\$\s*([\d., ]+?)C/gi;
    let ex;
    while ((ex = pixRegex.exec(txtExt)) !== null) {
      const nomeFull = ex[1].split(/[0-9\*]/)[0].trim();
      const valor = parseMoney(ex[2]);
      if (!extratoAgrupado[nomeFull]) extratoAgrupado[nomeFull] = {total: 0, linhas: 0};
      extratoAgrupado[nomeFull].total += valor;
      extratoAgrupado[nomeFull].linhas += 1;
    }

    // TED/OUTROS
    const tedRegex = /(CRÉD\.TED|LIQUIDAÇÃO|COBRANÇA).*?R\$\s*([\d., ]+?)C/gi;
    while ((ex = tedRegex.exec(txtExt)) !== null) {
      const nome = ex[1].trim();
      const valor = parseMoney(ex[2]);
      if (!extratoAgrupado[nome]) extratoAgrupado[nome] = {total: 0, linhas: 0};
      extratoAgrupado[nome].total += valor;
      extratoAgrupado[nome].linhas += 1;
    }

    await addLog("Cruzando dados (Margem de R$ 0,10)...");
    const rel = {entradasOk: [], reembolsos: []};
    const pastasUsadas = new Set();

    for (const [nomeCliente, dadosBanco] of Object.entries(extratoAgrupado)) {
      let match = false;
      const valorBanco = Math.round(dadosBanco.total * 100) / 100;
      const primeiroNome = nomeCliente.split(' ')[0].toUpperCase();

      for (const [numPasta, dadosPasta] of Object.entries(projurisPorPasta)) {
        if (pastasUsadas.has(numPasta)) continue;

        const valorProjuris = Math.round(dadosPasta.total * 100) / 100;
        const diff = Math.abs(valorProjuris - valorBanco);

        // REGRA DE OURO: Valor bate (margem 0.10) E o nome aparece no contexto da pasta
        if (diff <= 0.10 && (dadosPasta.contexto.includes(primeiroNome) || nomeCliente.length < 5)) {
          rel.entradasOk.push({
            cliente: nomeCliente,
            pasta: numPasta,
            resumoValores: `Banco: R$ ${formatMoney(valorBanco)} | Projuris: R$ ${formatMoney(valorProjuris)}`,
            detalhes: `Lançamentos Projuris:\n` + dadosPasta.itens.map(i => `- ${i.origem}: R$ ${formatMoney(i.valor)}`).join('\n') +
                (dadosBanco.linhas > 1 ? `\n(Agrupado de ${dadosBanco.linhas} créditos no extrato)` : '')
          });
          pastasUsadas.add(numPasta);
          match = true;
          break;
        }
      }

      if (!match) {
        rel.reembolsos.push({nome: nomeCliente, valorFormatado: formatMoney(valorBanco)});
      }
    }

    results.value = rel;
    await addLog("Conferência Finalizada!");

  } catch (e) {
    await addLog("Erro Crítico: " + e.message);
    console.error(e);
  } finally {
    isProcessing.value = false;
  }
};
</script>