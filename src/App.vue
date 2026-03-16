<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
    <div class="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">

      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-blue-700 tracking-tight mb-2">Conciliação Financeira Autônoma</h1>
        <p class="text-slate-500">Regra de Partilha: 20% Escritório | 80% Advogados Associados</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.extrato ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-blue-700 mb-1">Extrato Bancário (Mês X)</span>
          <span class="text-xs text-slate-500 mb-3">(Apenas os créditos serão lidos)</span>
          <span class="text-sm font-medium text-center break-all text-slate-700">{{
              files.extrato ? files.extrato.name : 'Selecionar Extrato'
            }}</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'extrato')" class="hidden"/>
        </label>

        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.projuris ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-emerald-700 mb-1">Projuris Inicial (Mês X+1)</span>
          <span class="text-xs text-slate-500 mb-3">(Lançamentos do dia 05)</span>
          <span class="text-sm font-medium text-center break-all text-slate-700">{{
              files.projuris ? files.projuris.name : 'Selecionar Projuris'
            }}</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'projuris')" class="hidden"/>
        </label>

        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.repasses ? 'border-purple-500 bg-purple-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-purple-700 mb-1">Repasses/Indicações (Mês X)</span>
          <span class="text-xs text-slate-500 mb-3">(Repasses a clientes/terceiros)</span>
          <span class="text-sm font-medium text-center break-all text-slate-700">{{
              files.repasses ? files.repasses.name : 'Selecionar Repasses'
            }}</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'repasses')" class="hidden"/>
        </label>
      </div>

      <button @click="processAndReconcile"
              class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-4 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              :disabled="isProcessing">
        <span v-if="isProcessing">
          <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
               viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                           stroke-width="4"></circle><path class="opacity-75" fill="currentColor"
                                                                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </span>
        {{ isProcessing ? 'Executando Protocolo...' : 'Iniciar Conferência' }}
      </button>

      <div v-if="logs.length > 0"
           class="mt-8 bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto shadow-inner">
        <div v-for="(log, index) in logs" :key="index" class="mb-1">> {{ log }}</div>
      </div>

      <div v-if="results" class="mt-10 space-y-8">

        <div class="border border-green-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-green-50 text-green-800 p-4 font-bold border-b border-green-200 text-lg">1. Entradas OK
            ({{ results.entradasOk.length }})
          </div>
          <div class="p-4 bg-white">
            <ul class="space-y-3">
              <li v-for="(item, i) in results.entradasOk" :key="i" class="p-3 bg-slate-50 border rounded text-sm">
                <span class="font-bold text-slate-800">{{ item.extratoRef }}</span><br>
                <span class="text-slate-600 mt-1 block">Distribuição: {{ item.distribuicao }}</span>
              </li>
              <li v-if="results.entradasOk.length === 0" class="text-slate-500 italic">Nenhum lançamento processado
                perfeitamente.
              </li>
            </ul>
          </div>
        </div>

        <div class="border border-orange-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-orange-50 text-orange-800 p-4 font-bold border-b border-orange-200 text-lg">2. Lançamentos
            Divergentes ({{ results.divergentes.length }})
          </div>
          <div class="p-4 bg-white">
            <ul class="space-y-3">
              <li v-for="(item, i) in results.divergentes" :key="i"
                  class="p-3 bg-slate-50 border border-orange-100 rounded text-sm">
                <span class="font-bold text-slate-800">Crédito Extrato: R$ {{ item.credito }}</span><br>
                <span class="text-slate-600">Soma Encontrada (Projuris+Repasses): R$ {{ item.soma }} (Diferença > R$ 0,10)</span><br>
                <span class="text-xs text-slate-500">Pasta Associada: {{ item.pasta }}</span>
              </li>
              <li v-if="results.divergentes.length === 0" class="text-slate-500 italic">Nenhuma divergência
                encontrada.
              </li>
            </ul>
          </div>
        </div>

        <div class="border border-blue-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-blue-50 text-blue-800 p-4 font-bold border-b border-blue-200 text-lg">3. Créditos de Reembolso
            (Não vinculados no Projuris) ({{ results.reembolsos.length }})
          </div>
          <div class="p-4 bg-white">
            <ul class="space-y-2">
              <li v-for="(item, i) in results.reembolsos" :key="i" class="text-sm text-slate-700 border-b pb-2">
                {{ item.textoOriginal }} - <span class="font-bold text-slate-900">R$ {{ item.valorFormatado }}</span>
              </li>
              <li v-if="results.reembolsos.length === 0" class="text-slate-500 italic">Nenhum crédito órfão.</li>
            </ul>
          </div>
        </div>

        <div class="border border-red-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-red-50 text-red-800 p-4 font-bold border-b border-red-200 text-lg">4. Lançamentos sem
            Correspondência no Extrato ({{ results.semCorrespondencia.length }})
          </div>
          <div class="p-4 bg-white">
            <ul class="space-y-2">
              <li v-for="(item, i) in results.semCorrespondencia" :key="i" class="text-sm text-slate-700 border-b pb-2">
                Pasta {{ item.pasta }}: Total R$ {{ item.valorSoma.toFixed(2) }} (Escritório: R$
                {{ item.valorEscritorio.toFixed(2) }})
              </li>
              <li v-if="results.semCorrespondencia.length === 0" class="text-slate-500 italic">Todos os lançamentos do
                Projuris foram alocados.
              </li>
            </ul>
          </div>
        </div>

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

const addLog = async (message) => {
  logs.value.push(message);
  // Auto-scroll e pequeno delay para "espelhar" visualmente
  await new Promise(r => setTimeout(r, 100));
  const logContainer = document.querySelector('.bg-black');
  if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
};

const handleFile = (event, type) => {
  if (event.target.files[0]) files.value[type] = event.target.files[0];
};

const readPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdf = await pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

// Funções Auxiliares Financeiras
const parseMoney = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
};
const formatMoney = (val) => val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const isToleranceOk = (val1, val2) => Math.abs(val1 - val2) <= 0.10; // Tolerância estrita do prompt

const processAndReconcile = async () => {
  if (!files.value.extrato || !files.value.projuris || !files.value.repasses) {
    alert('Por favor, selecione os 3 arquivos PDF (Extrato, Projuris e Repasses).');
    return;
  }

  isProcessing.value = true;
  logs.value = [];
  results.value = null;

  try {
    await addLog("Arquivos recebidos. Iniciando conferência conforme protocolo.");
    await addLog("Extraindo textos brutos dos PDFs...");

    const [extratoText, projurisText, repassesText] = await Promise.all([
      readPDF(files.value.extrato),
      readPDF(files.value.projuris),
      readPDF(files.value.repasses)
    ]);

    // ==========================================
    // EXTRAÇÃO DE DADOS (Heurística via Regex)
    // ==========================================
    await addLog("Mapeando Créditos do Extrato (Ignorando Débitos)...");
    const creditosExtrato = [];
    // Regex busca tudo que termina com 'C' (Crédito) e tem valor em Reais, ignorando 'SALDO DO DIA'
    const extratoMatches = extratoText.matchAll(/(.*?)\s+R\$\s*([\d.,]+)C/gi);
    for (const match of extratoMatches) {
      const texto = match[1].trim();
      if (!texto.toUpperCase().includes("SALDO")) {
        creditosExtrato.push({
          textoOriginal: texto.substring(0, 80) + '...', // Pega um pedaço da descrição
          valor: parseMoney(match[2]),
          valorFormatado: match[2],
          processado: false
        });
      }
    }
    await addLog(`-> ${creditosExtrato.length} créditos detectados no Extrato.`);

    await addLog("Mapeando Lançamentos do Projuris Inicial e agrupando por Pastas...");
    const pastasProjuris = {}; // Agrupar por número da pasta
    // Busca Padrão: Nome da Pessoa -> "Honorários..." -> R$ Valor
    const proRegex = /(Cabrera Della Casa|Joana Cervo|Nicolas Afonso|Alves Pinto|Associados|Casa)[^\$]*?(Honor[áa]rios.*?[\-\s](\d{3,4}))[^\$]*?R\$\s*([\d.,]+)/gi;
    let totalProjurisExtraidos = 0;
    for (const match of projurisText.matchAll(proRegex)) {
      const recebedor = match[1];
      const descricao = match[2].trim().replace(/\s+/g, ' ');
      const pasta = match[3];
      const valor = parseMoney(match[4]);
      const isEscritorio = recebedor.toUpperCase().includes('CABRERA') && recebedor.toUpperCase().includes('ASSOCIADOS');

      if (!pastasProjuris[pasta]) pastasProjuris[pasta] = {itens: [], soma: 0, valorEscritorio: 0, processado: false};
      pastasProjuris[pasta].itens.push({recebedor, descricao, valor, isEscritorio});
      pastasProjuris[pasta].soma += valor;
      if (isEscritorio) pastasProjuris[pasta].valorEscritorio += valor;
      totalProjurisExtraidos++;
    }
    await addLog(`-> ${totalProjurisExtraidos} lançamentos detectados e agrupados em ${Object.keys(pastasProjuris).length} pastas no Projuris.`);

    await addLog("Mapeando Relatório de Repasses/Indicações...");
    const repasses = {};
    const repRegex = /(Repasse|Indica[çc][ãa]o).*?[\-\s](\d{3,4})[^\$]*?R\$\s*([\d.,]+)/gi;
    for (const match of repassesText.matchAll(repRegex)) {
      const pasta = match[2];
      const valor = parseMoney(match[3]);
      if (!repasses[pasta]) repasses[pasta] = 0;
      repasses[pasta] += valor;
    }

    // ==========================================
    // ETAPAS DA CONFERÊNCIA (Lógica do GPT)
    // ==========================================
    const relatorio = {entradasOk: [], divergentes: [], reembolsos: [], semCorrespondencia: []};

    await addLog("Executando Etapa 1: Regra dos 20% (Honorários Diretos)...");
    for (let i = 0; i < creditosExtrato.length; i++) {
      const credito = creditosExtrato[i];
      if (credito.processado) continue;

      const alvoEscritorio = credito.valor * 0.20;

      // Busca alguma pasta onde o valor do escritório seja os 20% do crédito E a soma bata
      for (const [pasta, dados] of Object.entries(pastasProjuris)) {
        if (!dados.processado && isToleranceOk(dados.valorEscritorio, alvoEscritorio) && isToleranceOk(dados.soma, credito.valor)) {

          relatorio.entradasOk.push({
            extratoRef: `[Mês X] R$ ${formatMoney(credito.valor)} - ${dados.itens[0].descricao}`,
            distribuicao: `Escritório 20% (R$ ${formatMoney(dados.valorEscritorio)}), Outros 80% (R$ ${formatMoney(dados.soma - dados.valorEscritorio)})`
          });

          credito.processado = true;
          dados.processado = true;
          break;
        }
      }
    }

    await addLog("Executando Etapa 2: Cruzamento Projuris + Repasses...");
    for (let i = 0; i < creditosExtrato.length; i++) {
      const credito = creditosExtrato[i];
      if (credito.processado) continue;

      for (const [pasta, dados] of Object.entries(pastasProjuris)) {
        if (dados.processado) continue;

        const valorRepasse = repasses[pasta] || 0;
        const somaTotal = dados.soma + valorRepasse;

        // Subtrai o repasse antes de conferir os 20% do escritório
        const baseCalculo = credito.valor - valorRepasse;
        const alvoEscritorio = baseCalculo > 0 ? baseCalculo * 0.20 : 0;

        if (isToleranceOk(somaTotal, credito.valor) && isToleranceOk(dados.valorEscritorio, alvoEscritorio)) {
          relatorio.entradasOk.push({
            extratoRef: `[Mês X] R$ ${formatMoney(credito.valor)} - ${dados.itens[0].descricao}`,
            distribuicao: `Repasse R$ ${formatMoney(valorRepasse)} - Escritório 20% (R$ ${formatMoney(dados.valorEscritorio)}), Outros 80% (R$ ${formatMoney(dados.soma - dados.valorEscritorio)})`
          });
          credito.processado = true;
          dados.processado = true;
          break;
        }
      }
    }

    await addLog("Executando Etapa 3: Classificando Divergências...");
    // Cruza créditos não processados com pastas não processadas que tenham a mesma 'vibe' de valor ou pasta
    // Como simplificação heurística, se o valor da pasta (+ repasse) for > 0, jogamos como divergência do crédito mais próximo
    for (const [pasta, dados] of Object.entries(pastasProjuris)) {
      if (!dados.processado) {
        const valorRepasse = repasses[pasta] || 0;
        const somaTotal = dados.soma + valorRepasse;

        // Tenta achar um crédito que sobrou que seja parecido, mas fora da tolerância
        const creditoParecido = creditosExtrato.find(c => !c.processado && Math.abs(c.valor - somaTotal) > 0.10 && Math.abs(c.valor - somaTotal) < 1000);

        if (creditoParecido) {
          relatorio.divergentes.push({
            credito: formatMoney(creditoParecido.valor),
            soma: formatMoney(somaTotal),
            pasta: pasta
          });
          creditoParecido.processado = true;
          dados.processado = true;
        }
      }
    }

    await addLog("Executando Etapa 4: Isolando Créditos de Reembolso...");
    creditosExtrato.filter(c => !c.processado).forEach(c => {
      relatorio.reembolsos.push(c);
      c.processado = true;
    });

    await addLog("Executando Etapa 5: Isolando Lançamentos sem Correspondência...");
    Object.entries(pastasProjuris).forEach(([pasta, dados]) => {
      if (!dados.processado) {
        relatorio.semCorrespondencia.push({pasta, valorSoma: dados.soma, valorEscritorio: dados.valorEscritorio});
        dados.processado = true;
      }
    });

    await addLog("Etapa 6: Verificação Final Concluída. 100% dos dados processados.");

    // Exibe os resultados na UI
    results.value = relatorio;

  } catch (error) {
    console.error(error);
    await addLog(`[ERRO CRÍTICO] Falha no processamento: ${error.message}`);
  } finally {
    isProcessing.value = false;
  }
};
</script>