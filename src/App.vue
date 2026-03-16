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
  await new Promise(r => setTimeout(r, 10));
};

const handleFile = (event, type) => {
  if (event.target.files[0]) files.value[type] = event.target.files[0];
};

const parseMoney = (s) => {
  if (!s) return 0;
  // Remove R$, espaços e garante formato decimal (ponto para milhar, vírgula para decimal ou vice-versa)
  let clean = s.replace(/R\$/g, '').replace(/\s/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    clean = clean.replace(',', '.');
  }
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
        // Unir itens mantendo espaços apenas onde necessário
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      // Limpeza de caracteres especiais de quebra de página
      resolve(text.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' '));
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
    await addLog("Lendo arquivos e higienizando dados...");
    const [txtExt, txtPro, txtRep] = await Promise.all([
      readPDF(files.value.extrato),
      readPDF(files.value.projuris),
      files.value.repasses ? readPDF(files.value.repasses) : Promise.resolve("")
    ]);

    // 1. Extração Projuris (Higienizada)
    const projurisItens = [];
    const proRegex = /(CABRERA|JOANA|NICOLAS|ASSOCIADOS|ESCRIT).*?(\d{3,5}).*?R\$\s*([\d., ]+)/gi;
    let m;
    while ((m = proRegex.exec(txtPro)) !== null) {
      projurisItens.push({
        origem: m[1].toUpperCase(),
        pasta: m[2],
        valor: parseMoney(m[3]),
        usado: false
      });
    }

    // 2. Extração Extrato (SOMENTE CRÉDITOS E COM SOMA POR NOME)
    const extratoMap = {};
    // Captura: Nome do pagador e Valor que termina em C (Crédito), garantindo que não tenha D (Débito)
    const extratoRegex = /Recebimento Pix (.*?) \*\*\*.*?R\$\s*([\d., ]+)C/gi;
    let ex;
    while ((ex = extratoRegex.exec(txtExt)) !== null) {
      const nome = ex[1].trim().toUpperCase();
      const valor = parseMoney(ex[2]);

      if (!extratoMap[nome]) {
        extratoMap[nome] = {nome, valor: 0, itens: []};
      }
      extratoMap[nome].valor += valor;
      extratoMap[nome].itens.push(valor);
    }

    // Captura também créditos que não são PIX (TED/DOC), desde que sejam Créditos (C)
    const tedRegex = /(CRÉD\.TED|LIQUIDAÇÃO|ESTORNO).*?R\$\s*([\d., ]+)C/gi;
    while ((ex = tedRegex.exec(txtExt)) !== null) {
      const ident = ex[1].trim().toUpperCase();
      const valor = parseMoney(ex[2]);
      extratoMap[ident] = {nome: ident, valor: valor, itens: [valor]};
    }

    await addLog("Cruzando dados por valor total e pasta...");
    const rel = {entradasOk: [], reembolsos: [], semCorrespondencia: []};

    // ETAPA 1: Cruzamento por Valor Total (Agrupado) vs Projuris
    for (const pagador in extratoMap) {
      const credito = extratoMap[pagador];
      const valorTotalPix = Math.round(credito.valor * 100) / 100;

      // Busca por 20% do total ou valor integral na pasta
      const valor20Alvo = Math.round(valorTotalPix * 0.20 * 100) / 100;

      const lancamentoBase = projurisItens.find(p =>
          !p.usado &&
          (p.origem.includes("ESCRIT") || p.origem.includes("CABRERA")) &&
          (Math.abs(p.valor - valor20Alvo) <= 0.15 || Math.abs(p.valor - valorTotalPix) <= 0.15)
      );

      if (lancamentoBase) {
        const pasta = lancamentoBase.pasta;
        const itensDaPasta = projurisItens.filter(p => !p.usado && p.pasta === pasta);
        const somaProjuris = Math.round(itensDaPasta.reduce((acc, cur) => acc + cur.valor, 0) * 100) / 100;

        if (Math.abs(somaProjuris - valorTotalPix) <= 0.20) {
          itensDaPasta.forEach(p => p.usado = true);
          rel.entradasOk.push({
            extratoRef: pagador,
            pasta: pasta,
            detalhes: `Soma de ${credito.itens.length} lançamento(s): R$ ${formatMoney(valorTotalPix)} | Distribuição: ` +
                itensDaPasta.map(p => `${p.origem} (R$ ${formatMoney(p.valor)})`).join(" | ")
          });
          delete extratoMap[pagador];
        }
      }
    }

    // ETAPA 2: O que sobrou no extrato vai para Reembolsos/Sem Correspondência
    for (const pagador in extratoMap) {
      rel.reembolsos.push({
        textoOriginal: pagador,
        valorFormatado: formatMoney(extratoMap[pagador].valor)
      });
    }

    rel.semCorrespondencia = projurisItens.filter(p => !p.usado);

    results.value = rel;
    await addLog("Conferência Finalizada com Sucesso!");

  } catch (err) {
    await addLog("ERRO: " + err.message);
  } finally {
    isProcessing.value = false;
  }
};
</script>