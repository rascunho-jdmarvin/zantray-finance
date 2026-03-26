/**
 * Edge Function: importar-extrato
 * Analisa extratos bancários (PDF, CSV, TXT) com IA e extrai transações.
 *
 * Variáveis de ambiente necessárias (configure em Supabase → Settings → Edge Functions):
 *   AI_PROVIDER     → "openai" | "anthropic" | "gemini"  (opcional, auto-detecta pela chave disponível)
 *   OPENAI_API_KEY  → chave da OpenAI
 *   ANTHROPIC_API_KEY → chave da Anthropic (Claude)
 *   GEMINI_API_KEY  → chave do Google Gemini
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Prompt do sistema ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um especialista em análise de extratos bancários brasileiros.
Analise o documento e extraia TODAS as transações financeiras encontradas.

Para cada transação retorne um objeto JSON com EXATAMENTE estes campos:
- data: string "YYYY-MM-DD"
- descricao: string limpa e legível (remova códigos internos do banco)
- valor: number sempre positivo (débito ou crédito, sempre positivo)
- tipo: "fixa" para contas recorrentes (aluguel, streaming, planos), "variavel" para demais
- categoria: APENAS um destes valores exatos: "moradia" | "alimentacao" | "transporte" | "saude" | "educacao" | "lazer" | "vestuario" | "servicos" | "investimento" | "outros"
- metodoPagamento: APENAS um destes: "pix" | "debito" | "credito" | "boleto" | "dinheiro" | "outros"
- confiancaCategoria: number 0-1 (quão confiante você está na categoria)

REGRAS:
- Ignore transações de estorno que já têm um lançamento correspondente
- Para transferências entre contas do mesmo banco, use categoria "outros"
- Retorne APENAS o array JSON, sem texto adicional, sem markdown, sem explicações`;

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TransacaoParseada {
  data: string;
  descricao: string;
  valor: number;
  tipo: "fixa" | "variavel";
  categoria: string;
  metodoPagamento: string;
  confiancaCategoria: number;
  possivelDuplicata: boolean;
  duplicataDeId?: string;
}

interface ContaExistente {
  id: string;
  descricao: string;
  valor: number;
  mes: number;
  ano: number;
  dia_vencimento: number;
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Inicializa cliente Supabase com service role (acesso total para registrar importação)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Autentica o usuário via JWT do header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem autorização");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) throw new Error("Token inválido ou expirado");

    const { fileContent, fileName, mimeType } = await req.json() as {
      fileContent: string; // base64 sem prefixo data:...
      fileName: string;
      mimeType: string;
    };

    if (!fileContent || !fileName) throw new Error("Arquivo inválido");

    // ── 1. Cria registro de importação ──────────────────────────────────────
    const { data: importacao, error: importError } = await supabase
      .from("importacoes")
      .insert({
        user_id: user.id,
        nome_arquivo: fileName,
        status: "processando",
      })
      .select()
      .single();

    if (importError) throw new Error(`Erro ao criar importação: ${importError.message}`);

    // ── 2. Parseia com IA ────────────────────────────────────────────────────
    let transacoes: TransacaoParseada[];
    try {
      transacoes = await parseWithBestAvailableAI(fileContent, fileName, mimeType);
    } catch (aiError) {
      // Marca como erro se a IA falhar
      await supabase
        .from("importacoes")
        .update({ status: "erro" })
        .eq("id", importacao.id);
      throw aiError;
    }

    // ── 3. Detecta possíveis duplicatas ──────────────────────────────────────
    const { data: existentes } = await supabase
      .from("contas")
      .select("id, descricao, valor, mes, ano, dia_vencimento")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000) as { data: ContaExistente[] | null };

    const transacoesFinais = transacoes.map((t) => {
      const dataT = new Date(t.data + "T00:00:00");
      const mesT = dataT.getMonth() + 1;
      const anoT = dataT.getFullYear();
      const diaT = dataT.getDate();

      const duplicata = (existentes || []).find((e) =>
        Math.abs(e.valor - t.valor) < 0.01 &&
        e.mes === mesT &&
        e.ano === anoT &&
        Math.abs(e.dia_vencimento - diaT) <= 3 &&
        levenshtein(
          e.descricao.toLowerCase().trim(),
          t.descricao.toLowerCase().trim(),
        ) <= 6
      );

      return {
        ...t,
        possivelDuplicata: !!duplicata,
        duplicataDeId: duplicata?.id,
      };
    });

    const totalDuplicatas = transacoesFinais.filter((t) => t.possivelDuplicata).length;

    // ── 4. Atualiza importação com totais ────────────────────────────────────
    await supabase
      .from("importacoes")
      .update({
        status: "revisao_pendente",
        total_transacoes: transacoesFinais.length,
        total_duplicatas: totalDuplicatas,
      })
      .eq("id", importacao.id);

    return new Response(
      JSON.stringify({ importacaoId: importacao.id, transacoes: transacoesFinais }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[importar-extrato] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno no servidor" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});

// ─── Seleção automática de provedor de IA ────────────────────────────────────
async function parseWithBestAvailableAI(
  fileContent: string,
  fileName: string,
  mimeType: string,
): Promise<TransacaoParseada[]> {
  const provider = Deno.env.get("AI_PROVIDER")?.toLowerCase();
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  // Prioridade: variável AI_PROVIDER → senão, primeira chave disponível
  if (provider === "anthropic" || (!provider && anthropicKey)) {
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    console.log("[IA] Usando Anthropic Claude");
    return parseWithAnthropic(fileContent, fileName, mimeType, anthropicKey);
  }

  if (provider === "gemini" || (!provider && !anthropicKey && geminiKey)) {
    if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada");
    console.log("[IA] Usando Google Gemini");
    return parseWithGemini(fileContent, fileName, mimeType, geminiKey);
  }

  if (provider === "openai" || (!provider && openaiKey)) {
    if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");
    console.log("[IA] Usando OpenAI GPT-4o");
    return parseWithOpenAI(fileContent, fileName, mimeType, openaiKey);
  }

  throw new Error(
    "Nenhuma chave de IA configurada. Defina OPENAI_API_KEY, ANTHROPIC_API_KEY ou GEMINI_API_KEY " +
      "nas variáveis de ambiente da Edge Function no painel Supabase.",
  );
}

// ─── Anthropic Claude ─────────────────────────────────────────────────────────
// Suporte nativo a PDF como documento — melhor opção para extratos
async function parseWithAnthropic(
  fileContent: string,
  fileName: string,
  mimeType: string,
  apiKey: string,
): Promise<TransacaoParseada[]> {
  const isPDF = mimeType === "application/pdf";

  const userContent = isPDF
    ? [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: fileContent,
          },
        },
        { type: "text", text: "Extraia todas as transações financeiras deste extrato bancário." },
      ]
    : [
        {
          type: "text",
          text: `Arquivo: ${fileName}\n\n${safeDecodeBase64(fileContent)}`,
        },
      ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Anthropic: ${data.error?.message ?? res.statusText}`);
  }

  return parseJSONFromText(data.content?.[0]?.text ?? "");
}

// ─── OpenAI GPT-4o ───────────────────────────────────────────────────────────
// PDF: usa Responses API (suporte nativo a arquivos)
// CSV/TXT: usa Chat Completions com texto decodificado
async function parseWithOpenAI(
  fileContent: string,
  fileName: string,
  mimeType: string,
  apiKey: string,
): Promise<TransacaoParseada[]> {
  const isPDF = mimeType === "application/pdf";

  if (isPDF) {
    // OpenAI Responses API — suporte nativo a PDF (disponível desde 2025)
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: fileName,
                file_data: `data:application/pdf;base64,${fileContent}`,
              },
              {
                type: "input_text",
                text: "Extraia todas as transações financeiras deste extrato bancário.",
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`OpenAI: ${data.error?.message ?? res.statusText}`);

    const text = data.output?.find((o: { type: string }) => o.type === "message")
      ?.content?.find((c: { type: string }) => c.type === "output_text")
      ?.text ?? "";

    return parseJSONFromText(text);
  }

  // CSV / TXT — Chat Completions com texto
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Arquivo: ${fileName}\n\n${safeDecodeBase64(fileContent)}`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${data.error?.message ?? res.statusText}`);

  return parseJSONFromText(data.choices?.[0]?.message?.content ?? "");
}

// ─── Google Gemini ────────────────────────────────────────────────────────────
// Suporte nativo a PDF via inline_data
async function parseWithGemini(
  fileContent: string,
  fileName: string,
  mimeType: string,
  apiKey: string,
): Promise<TransacaoParseada[]> {
  const effectiveMime = mimeType === "application/pdf" ? "application/pdf"
    : mimeType === "text/csv" ? "text/plain"
    : "text/plain";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: effectiveMime,
                  data: fileContent,
                },
              },
              { text: "Extraia todas as transações financeiras deste extrato bancário." },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini: ${data.error?.message ?? res.statusText}`);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseJSONFromText(text);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORIAS_VALIDAS = new Set([
  "moradia", "alimentacao", "transporte", "saude",
  "educacao", "lazer", "vestuario", "servicos", "investimento", "outros",
]);

const METODOS_VALIDOS = new Set([
  "pix", "debito", "credito", "boleto", "dinheiro", "outros",
]);

function parseJSONFromText(text: string): TransacaoParseada[] {
  if (!text) throw new Error("IA retornou resposta vazia");

  // Remove markdown code blocks se presentes
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Extrai o array JSON da resposta
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error("[parseJSON] Texto recebido:", text.slice(0, 500));
    throw new Error("IA não retornou um array JSON válido. Verifique o extrato enviado.");
  }

  let parsed: unknown[];
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("Resposta da IA contém JSON malformado");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Nenhuma transação encontrada no extrato");
  }

  return parsed.map((t: Record<string, unknown>, i: number) => {
    const data = String(t.data ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new Error(`Transação ${i + 1}: data inválida "${data}"`);
    }

    return {
      data,
      descricao: String(t.descricao ?? "Sem descrição").slice(0, 200),
      valor: Math.abs(Number(t.valor) || 0),
      tipo: t.tipo === "fixa" ? "fixa" : "variavel",
      categoria: CATEGORIAS_VALIDAS.has(String(t.categoria))
        ? String(t.categoria)
        : "outros",
      metodoPagamento: METODOS_VALIDOS.has(String(t.metodoPagamento))
        ? String(t.metodoPagamento)
        : "outros",
      confiancaCategoria: Math.min(1, Math.max(0, Number(t.confiancaCategoria) ?? 0.7)),
      possivelDuplicata: false,
    } as TransacaoParseada;
  });
}

// Distância de Levenshtein para detecção de duplicatas por descrição similar
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Decodifica base64 para texto (CSV/TXT)
function safeDecodeBase64(b64: string): string {
  try {
    return atob(b64);
  } catch {
    // Se não for base64 válido, assume que já é texto
    return b64;
  }
}
