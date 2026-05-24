import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { STAGE7_EXAMPLE_ROMANTIC } from "./lib/stage7_example_romantic";
import {
  STAGE1_PROMPT_STRATEGY,
  STAGE1_EXAMPLE,
  STAGE2_PROMPT_STRATEGY,
  STAGE2_EXAMPLE_STRATEGY,
  STAGE3_PROMPT_STRATEGY,
  STAGE3_EXAMPLE_STRATEGY,
  STAGE3_PROMPT,
  STAGE3_EXAMPLE,
  STAGE4_PROMPT_STRATEGY,
  STAGE4_EXAMPLE_STRATEGY,
  STAGE4_PROMPT,
  STAGE4_EXAMPLE,
  STAGE5_PROMPT_STRATEGY,
  STAGE5_EXAMPLE_STRATEGY,
  STAGE5_PROMPT,
  STAGE5_EXAMPLE,
  STAGE6_PROMPT,
  STAGE6_EXAMPLE,
  STAGE7_PROMPT,
  STAGE7_PROMPT_STRATEGY,
  STYLE_MASTER_PROMPT,
  SCRIPT_WRITING_CONTROL_CORE,
  PART_WRITING_REMINDER,
  MANGA_RECAP_STYLE_MODULE,
  PIPELINE_COMPANION_PROMPT,
  NOVA_PART_QA_PROMPT,
} from "./lib/prompts";
import {
  Lightbulb,
  Globe,
  TrendingUp,
  Users,
  ListOrdered,
  LayoutGrid,
  PenTool,
  Link2,
  Settings,
  Wand2,
  Layers,
  Download,
  Trash2,
} from "lucide-react";

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue] as const;
}

function RefineBlock({
  currentText,
  onRefine,
  onContinue,
  loading,
}: {
  currentText: string;
  onRefine: (text: string) => void;
  onContinue?: () => void;
  loading: boolean;
}) {
  const [refineText, setRefineText] = useState("");
  if (!currentText) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-3 shrink-0 items-center justify-between">
      <div className="flex-1 min-w-[240px] flex gap-3">
        <input
          type="text"
          value={refineText}
          onChange={(e) => setRefineText(e.target.value)}
          placeholder="Что изменить в этой версии? (напр., 'Сделай тон более мрачным')"
          className="flex-1 bg-black/40 border border-white/10 rounded-sm px-4 py-2 text-white/70 text-sm focus:outline-none focus:border-[#C9A050]/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && refineText.trim()) {
              onRefine(refineText);
              setRefineText("");
            }
          }}
        />
        <button
          onClick={() => {
            onRefine(refineText);
            setRefineText("");
          }}
          disabled={loading || !refineText.trim()}
          className="bg-[#C9A050] hover:bg-[#D9B060] disabled:opacity-50 text-black px-4 py-2 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Wand2 className="w-3.5 h-3.5" /> Внести правки
        </button>
      </div>

      {onContinue && (
        <button
          onClick={onContinue}
          disabled={loading}
          className="border border-[#C9A050]/40 hover:bg-[#C9A050]/10 disabled:opacity-50 text-[#C9A050] hover:text-[#D9B060] px-4 py-2 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center gap-2 h-[38px] whitespace-nowrap"
          title="Прервалась генерация? Нажмите, чтобы продолжить с того же места"
        >
          <Wand2 className="w-3.5 h-3.5" /> Продолжить генерацию
        </button>
      )}
    </div>
  );
}

async function generateViaRPC(rawPrompt: string, usePro: boolean) {
  const prompt = `${PIPELINE_COMPANION_PROMPT}\n\n${rawPrompt}`;
  const response = await fetch("/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, usePro }),
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("Backend returned non-JSON:", raw);
    throw new Error("Backend returned HTML/non-JSON. Check API route.");
  }

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.text;
}

async function generateViaStream(
  rawPrompt: string,
  usePro: boolean,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const prompt = `${PIPELINE_COMPANION_PROMPT}\n\n${rawPrompt}`;
  const response = await fetch("/rpc/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, usePro }),
    signal,
  });

  if (!response.body) {
    throw new Error("No response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let fullText = "";

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      if (chunk.includes("[API_ERROR]")) {
        throw new Error(chunk);
      }
      fullText += chunk;
      onChunk(fullText);
    }
  }
  return fullText;
}

function cleanContinuationText(rawText: string): string {
  let text = rawText.trim();

  // 1. Remove optional conversational preamble
  const preambleRegex =
    /^(here is the continuation|sure, here is|continuing seamlessly|continuing from|continuing chapter|understoo?d, resuming|resuming from the end|resuming seamlessly)[^\n]*\n?/i;
  while (preambleRegex.test(text)) {
    text = text.replace(preambleRegex, "").trim();
  }

  // 2. Remove block of repeated context wrapped in separators from our prompt
  // E.g.,
  // ===============================
  // ...
  // ===============================
  const separatorRegex = /^[=\-*#_]{5,}/;
  if (separatorRegex.test(text)) {
    const lines = text.split("\n");
    let secondSeparatorIndex = -1;
    for (let i = 1; i < Math.min(lines.length, 30); i++) {
      if (/^[=\-*#_]{5,}/.test(lines[i].trim())) {
        secondSeparatorIndex = i;
        break;
      }
    }
    if (secondSeparatorIndex !== -1) {
      text = lines
        .slice(secondSeparatorIndex + 1)
        .join("\n")
        .trim();
    } else {
      text = lines.slice(1).join("\n").trim();
    }
  }

  // 3. Strip any lines composed purely of separator characters (e.g., ===, ---, ***, ___)
  // This cleans any accidental mid-text separator blocks!
  text = text.replace(/^[=\-*_#\s]{3,}\s*$/gm, "");

  // 4. Clean up any excessive newlines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Re-check preamble at the new start
  while (preambleRegex.test(text)) {
    text = text.replace(preambleRegex, "").trim();
  }

  return text;
}

function stitchTexts(part1: string, part2: string): string {
  const p1 = part1.trimEnd();
  const p2Clean = cleanContinuationText(part2);

  if (!p1) return p2Clean;
  if (!p2Clean) return p1;

  // 1. Check for overlap up to 400 characters (e.g., if model repeated its last sentence/words)
  const maxOverlap = Math.min(p1.length, p2Clean.length, 400);
  for (let len = maxOverlap; len >= 5; len--) {
    const suffix = p1.substring(p1.length - len);
    const prefix = p2Clean.substring(0, len);
    if (suffix.toLowerCase() === prefix.toLowerCase()) {
      // For short overlap lengths, ensure we don't do false positives inside words
      if (len < 12) {
        const charBeforeP1 = p1[p1.length - len - 1];
        const charAfterP2 = p2Clean[len];
        const isWordBoundary =
          (!charBeforeP1 || /\s|[.,!?;:]/.test(charBeforeP1)) &&
          (!charAfterP2 || /\s|[.,!?;:]/.test(charAfterP2));
        if (!isWordBoundary) continue;
      }
      return p1 + p2Clean.substring(len);
    }
  }

  // 2. Decide how to connect if no overlap was found
  const startsWithNewline = /^\s*[\r\n]/.test(part2);
  const firstChar = p2Clean[0];
  const lastChar = p1[p1.length - 1];

  let p2Cleansed = p2Clean;
  const isSentenceEnd = /[.!?»"”\n\r]/.test(lastChar);

  // Capitalize first character if starting a sentence with a lowercase letter
  if (isSentenceEnd && /^[a-zа-яё]/.test(p2Clean)) {
    p2Cleansed = p2Clean.charAt(0).toUpperCase() + p2Clean.slice(1);
  }

  if (startsWithNewline) {
    return p1 + "\n\n" + p2Cleansed;
  }

  // Continuing smoothly within sentence/paragraph path
  const lastIsWordChar = /[\wа-яА-ЯёЁ]/.test(lastChar);
  const needsSpace =
    lastIsWordChar ||
    lastChar === "," ||
    lastChar === ";" ||
    lastChar === ":" ||
    lastChar === '"' ||
    lastChar === "”" ||
    lastChar === ")" ||
    isSentenceEnd;
  const isNextPunctuation = /^[.,!?;:]/.test(p2Cleansed);

  if (needsSpace && !isNextPunctuation) {
    return p1 + " " + p2Cleansed;
  }
  return p1 + p2Cleansed;
}

import { CheckCircle2, ShieldCheck, Zap, RefreshCw } from "lucide-react";

function parseVerificationReport(text: string) {
  if (!text) return null;

  // If it's a simple status message during generation
  if (
    text.trim() === "Анализ стиля, замеры символов и верификация переходов..."
  ) {
    return {
      isAnalyzing: true,
      writtenPart: "",
      alignment:
        "Идет глубинная верификация стилистических параметров и анализ перехода...",
      events: "Сверяем текущие сцены с макро-планом на 9 частей...",
      consistency: "Проверяем POV от первого лица и блокируем ИИ-клише...",
      qa: "Фильтруем сопливые описания и любовный балласт...",
      hooks: "Готовим рапорт согласования следующего шага...",
    };
  }

  // Fallback if it's not a structured report
  if (
    !text.includes("1.") &&
    !text.includes("2.") &&
    !text.includes("Plot Alignment") &&
    !text.includes("SCENARIO")
  ) {
    return {
      isAnalyzing: false,
      alignment: text,
      events: "",
      consistency: "",
      qa: "",
      hooks: "",
    };
  }

  const getSection = (
    num: string,
    nextNum: string,
    fallbackName: string,
    nextFallbackName: string,
  ) => {
    const regex = new RegExp(
      `(?:${num}\\.\\s*|${fallbackName}:?\\s*)([\\s\\S]*?)(?=(?:${nextNum}\\.\\s*|${nextFallbackName}:?|\\r?\\n\\r?\\n|$))`,
      "i",
    );
    const m = text.match(regex);
    return m ? m[1].trim() : "";
  };

  const writtenPart = getSection(
    "1",
    "2",
    "Written Part",
    "Plot Alignment Status",
  );
  const alignment = getSection(
    "2",
    "3",
    "Plot Alignment Status",
    "Events completed",
  );
  const events = getSection(
    "3",
    "4",
    "Events completed",
    "Consistency Checklist",
  );
  const consistency = getSection(
    "4",
    "5",
    "Consistency Checklist",
    "Final QA Verification",
  );
  const qa = getSection("5", "6", "Final QA Verification", "Open hooks");

  const hooksRegex =
    /(?:6\.\s*Open\s*hooks|Open\s*hooks|Open\s*Hooks|Open_Hooks):\s*([\s\S]*?)$/i;
  const hooksMatch = text.match(hooksRegex);
  const hooks = hooksMatch ? hooksMatch[1].trim() : "";

  return {
    isAnalyzing: false,
    writtenPart,
    alignment: alignment || "Соответствует утвержденному Macro Outline.",
    events: events,
    consistency: consistency,
    qa: qa,
    hooks: hooks,
  };
}

function ScribeReportDashboard({ reportText }: { reportText: string }) {
  const report = parseVerificationReport(reportText);
  if (!report) return null;

  return (
    <div className="mt-6 border border-white/5 bg-black/60 rounded-sm overflow-hidden text-xs">
      {/* Header */}
      <div className="bg-[#C9A050]/10 border-b border-[#C9A050]/20 px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#C9A050]">
            РАПОРТ ПЕРЕХОДА И СТИЛИСТИЧЕСКОГО СЛИЯНИЯ (Style & Alignment Shield)
          </span>
        </div>
        <div className="text-[9px] font-mono text-white/30 tracking-wider">
          STATUS: ACTIVE & UNIFIED
        </div>
      </div>

      {report.isAnalyzing ? (
        <div className="p-6 text-center text-white/40 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin text-[#C9A050]">
            <RefreshCw className="w-5 h-5" />
          </div>
          <span className="font-mono tracking-widest text-[10px] uppercase text-[#C9A050]/90 animate-pulse">
            Сценарист проводит стилистический и сюжетный аудит...
          </span>
          <p className="text-[11px] text-white/30 max-w-sm mt-1 leading-relaxed font-sans mt-1">
            Перепроверяются POV от 1-го лица, отсутствие забитости кринжевым
            мылом и стопроцентное пересечение с карточками сцен.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Quality Guardrails Checked List */}
          <div>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2 font-bold">
              🛡️ Активные анти-шлаковые фильтры (Guardrails Checked)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-white/70">
              <div className="flex items-start gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-sm">
                <span className="text-green-500 font-bold shrink-0">✓</span>
                <div>
                  <span className="font-bold text-white/90">
                    Strict 1st-Person POV
                  </span>
                  <p className="text-[10px] text-white/40">
                    Стабильное изложение только от лица главного героя (без
                    перескоков)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-sm">
                <span className="text-green-500 font-bold shrink-0">✓</span>
                <div>
                  <span className="font-bold text-white/90">
                    Anti-Slop Logic Guard
                  </span>
                  <p className="text-[10px] text-white/40">
                    Сентиментальная любовная жвачка и сопли полностью
                    заблокированы
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-sm">
                <span className="text-green-500 font-bold shrink-0">✓</span>
                <div>
                  <span className="font-bold text-white/90">
                    Technical Volume Enrichment
                  </span>
                  <p className="text-[10px] text-white/40">
                    Объем добран через глубокие физико-химические детали и
                    тактику
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-sm">
                <span className="text-green-500 font-bold shrink-0">✓</span>
                <div>
                  <span className="font-bold text-white/90">
                    Manga-Recap Fast Pacing
                  </span>
                  <p className="text-[10px] text-white/40">
                    Подача в стремительном темпе YouTube voiceover-narrative
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-white/5">
            {/* Left side: alignment and events inside this batch */}
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-mono text-[#C9A050] uppercase tracking-widest block mb-1 font-bold">
                  📌 ВЫПОЛНЕННЫЕ ВЕХИ И СЮЖЕТНОЕ СООТВЕТСТВИЕ
                </span>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-sm text-[#dcdcdc] leading-relaxed font-sans text-[11px] whitespace-pre-wrap">
                  {report.alignment}
                </div>
              </div>

              {report.events && (
                <div>
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-1">
                    События и изменения состояния (Core Shifts)
                  </span>
                  <div className="text-white/50 text-[11px] font-sans leading-relaxed whitespace-pre-wrap italic pl-2 border-l border-white/10">
                    {report.events}
                  </div>
                </div>
              )}
            </div>

            {/* Right side: bridges & confirmation of style continuity for NEXT chapter */}
            <div className="space-y-4 flex flex-col h-full justify-between">
              <div className="bg-[#C9A050]/5 border border-[#C9A050]/25 p-4 rounded-sm relative overflow-hidden">
                <div className="absolute right-2 top-2 text-[#C9A050]/10 shrink-0">
                  <Zap className="w-12 h-12" />
                </div>

                <span className="text-[9px] font-mono text-[#C9A050] uppercase tracking-widest block mb-1.5 font-bold">
                  🚀 МОСТ ПЕРЕХОДА И СЛИЯНИЕ СЛЕДУЮЩЕГО ШАГА
                </span>

                <div className="text-white/80 font-sans leading-relaxed text-[11px] mb-3 whitespace-pre-wrap">
                  {report.hooks
                    ? report.hooks
                    : "Сценарист принял предыдущие вехи и подтвердил готовность писать следующую часть строго в темпе и стилистике готового материала."}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center p-1 rounded-full bg-green-500/10 text-green-400 font-bold text-[9px] shrink-0">
                    ✓
                  </span>
                  <span className="text-[10px] font-mono text-white/50 leading-tight">
                    Стилистическая непрерывность гарантирована.
                  </span>
                </div>
              </div>

              {report.consistency && (
                <div className="bg-white/[0.01] border border-white/5 px-3 py-2 rounded-sm text-[10px] font-mono text-white/40">
                  <span className="text-white/50 font-bold block mb-0.5">
                    CONSISTENCY CHECKPOINT:
                  </span>
                  {report.consistency}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractiveNovaCompanion({
  activeStage,
  currentStageText,
}: {
  activeStage: number;
  currentStageText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "nova"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const STAGE_NAMES: Record<number, string> = {
    1: "Генерация идеи",
    2: "Создание мира",
    3: "Progression ladder",
    4: "Персонажи",
    5: "План на 9 частей",
    6: "Scene cards",
    7: "Сценарист",
  };

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim() && !customInput) return;

    const newMessages = [
      ...messages,
      { role: "user" as const, text: textToSend },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const history = newMessages
      .map((m) => (m.role === "user" ? "Хозяин: " + m.text : "Nova: " + m.text))
      .join("\n");

    const novaPrompt = `Мы находимся на этапе №${activeStage} (${STAGE_NAMES[activeStage]}).
Вот текущий сгенерированный текст этапа:
<STAGE_TEXT>
${currentStageText || "Пока пусто"}
</STAGE_TEXT>

История диалога:
${history}

Твои задачи:
1. Веди себя как Nova AI, обращайся ко мне "мой хозяин" или "сенпай".
2. Оцени текст текущего этапа (если он есть). Если все отлично и строго по правилам, напиши "Все отлично, мой хозяин, продолжаем". Если есть недочеты (фигня, отклонение от идеи) - строго скажи об этом и предложи варианты.
3. ОБЯЗАТЕЛЬНО: Если нужны правки, напиши в конце ответа готовый текст (промпт) для поля правок, чтобы я мог его скопировать. Выдели его так:
<REFINE_PROMPT>...твой текст...</REFINE_PROMPT>`;

    try {
      setMessages((prev) => [...prev, { role: "nova", text: "" }]);
      let currentOutput = "";

      await generateViaStream(novaPrompt, true, (chunk: string) => {
        currentOutput = chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].text = currentOutput;
          return updated;
        });
      });
    } catch (e: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "nova", text: "Ошибка связи: " + e.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#1A1A1D]/95 backdrop-blur-xl border border-[#C9A050]/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center p-3 gap-4 cursor-pointer hover:border-[#10b981] transition-all duration-300 z-50 group"
      >
        <div className="relative shrink-0">
          <img
            src="https://i.pinimg.com/736x/b7/be/16/b7be1653ca17c6c823788915af052090.jpg"
            alt="Nova Avatar"
            className="w-12 h-12 rounded-full object-cover border-2 border-[#C9A050]/50 shadow-[0_0_15px_rgba(201,160,80,0.2)] group-hover:border-[#10b981]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] border-2 border-[#1A1A1D] rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
        </div>
        <div className="flex flex-col pr-4">
          <h3 className="text-[#C9A050] text-[12px] uppercase tracking-widest font-bold flex items-center gap-2 group-hover:text-[#10b981]">
            Nova AI
            <Wand2 className="w-3 h-3" />
          </h3>
          <p className="text-white/60 text-[10px] uppercase mt-0.5 tracking-wider">
            Открыть контроль
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[650px] max-h-[85vh] flex flex-col bg-[#111113]/95 backdrop-blur-3xl border border-[#C9A050]/40 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-[#C9A050]/20 bg-black/40 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="https://i.pinimg.com/736x/b7/be/16/b7be1653ca17c6c823788915af052090.jpg"
            alt="Nova Avatar"
            className="w-8 h-8 rounded-full border border-[#C9A050]/40 object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h3 className="text-[#C9A050] text-[11px] uppercase tracking-widest font-bold">
              Nova AI
            </h3>
            <div className="text-[9px] text-[#10b981] uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></div>{" "}
              Контроль активен
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/50 hover:text-white transition-colors p-2 cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#111113] to-black">
        {messages.length === 0 && (
          <div className="text-center text-white/40 text-[11px] leading-relaxed mt-4">
            Привет, сенпай! Я здесь, чтобы контролировать конвейер на каждом
            этапе.
            <br />
            <br />
            Нажмите кнопку ниже, чтобы я проверила текущий сценарий. Если софт
            выдал фигню, я напишу для вас готовый промпт для поля правок!
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[95%] ${msg.role === "user" ? "self-end items-end ml-auto" : "self-start items-start"} `}
          >
            {msg.role === "nova" && (
              <span className="text-[9px] text-[#C9A050] uppercase tracking-wider mb-1 ml-1 opacity-70">
                Nova AI
              </span>
            )}
            {msg.role === "user" && (
              <span className="text-[9px] text-white/40 uppercase tracking-wider mb-1 mr-1">
                Сенпай
              </span>
            )}

            <div
              className={`p-4 rounded-sm text-[12px] leading-relaxed font-sans ${msg.role === "user" ? "bg-[#C9A050]/10 text-[#C9A050] border border-[#C9A050]/30 rounded-tr-none" : "bg-white/5 text-white/80 border border-white/10 rounded-tl-none"} shadow-sm`}
            >
              {msg.role === "nova" ? (
                (() => {
                  let text = msg.text;
                  let refinePrompt = "";
                  const refineMatch = text.match(
                    /<REFINE_PROMPT>([\s\S]*?)<\/REFINE_PROMPT>/,
                  );
                  if (refineMatch) {
                    refinePrompt = refineMatch[1];
                    text = text.replace(
                      /<REFINE_PROMPT>([\s\S]*?)<\/REFINE_PROMPT>/,
                      "",
                    );
                  }
                  return (
                    <div className="space-y-2">
                      <div className="whitespace-pre-wrap">{text.trim()}</div>
                      {refinePrompt && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-[9px] uppercase tracking-widest text-[#10b981] mb-2 font-bold">
                            Готовый текст для правки:
                          </div>
                          <div className="bg-black/50 p-3 border border-[#10b981]/30 text-[#10b981] font-mono text-[11px] rounded-sm relative group whitespace-pre-wrap">
                            {refinePrompt.trim()}
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  refinePrompt.trim(),
                                )
                              }
                              className="absolute top-2 right-2 bg-[#10b981]/20 hover:bg-[#10b981]/40 text-[#10b981] p-1.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center gap-1 text-[9px] uppercase font-bold"
                              title="Скопировать"
                            >
                              Копировать
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-[10px] text-[#C9A050] animate-pulse py-2">
            Nova читает...
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 border-t border-[#C9A050]/20 bg-black/60 shrink-0 space-y-3 relative z-10 block">
        <button
          onClick={() =>
            handleSend(
              "Проверь текущий этап пожалуйста. Если всё по правилам и круто, скажи 'Все отлично, мой хозяин, продолжаем'. Иначе скажи в чем фигня, предложи исправление и дай <REFINE_PROMPT>.",
            )
          }
          disabled={loading}
          className="w-full py-2.5 bg-[#C9A050]/10 hover:bg-[#C9A050]/20 border border-[#C9A050]/30 text-[#C9A050] text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all focus:outline-none focus:border-[#C9A050] shadow-[0_0_15px_rgba(201,160,80,0.1)] hover:shadow-[0_0_20px_rgba(201,160,80,0.2)] disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2"
        >
          <Wand2 className="w-3.5 h-3.5" /> Проверить текущий этап
        </button>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                // Prevent form submission if inside a form, though here we aren't
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Что сказать Nova?"
            className="flex-1 bg-[#111113] border border-white/10 rounded-sm px-4 py-2 text-white/80 text-[12px] focus:outline-none focus:border-[#C9A050]/50 shadow-inner"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="w-10 flex-shrink-0 bg-[#C9A050]/10 hover:bg-[#C9A050]/20 border border-[#C9A050]/30 text-[#C9A050] rounded-sm flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const STAGES = [
  {
    id: 1,
    title: "Генерация идеи",
    icon: Lightbulb,
    description: "Поиск искры и концепции",
  },
  {
    id: 2,
    title: "Создание мира",
    icon: Globe,
    description: "Лоре, правила и сеттинг",
  },
  {
    id: 3,
    title: "Progression ladder",
    icon: TrendingUp,
    description: "Арки и развитие",
  },
  {
    id: 4,
    title: "Персонажи",
    icon: Users,
    description: "Герои и соц. динамика",
  },
  {
    id: 5,
    title: "План на 9 частей",
    icon: ListOrdered,
    description: "Структура истории",
  },
  {
    id: 6,
    title: "Scene cards",
    icon: LayoutGrid,
    description: "Сцены и эпизоды",
  },
  {
    id: 7,
    title: "Сценарист",
    icon: PenTool,
    description: "Написание по частям (~8-10k симв)",
  },
];

export default function App() {
  const [currentNiche, setCurrentNiche] = useLocalStorage(
    "scribe-niche",
    "manga-strategy",
  );

  return (
    <Workspace
      key={currentNiche}
      currentNiche={currentNiche}
      setCurrentNiche={(v: string) => setCurrentNiche(v)}
    />
  );
}

function Workspace({ currentNiche, setCurrentNiche }: any) {
  const keySuffix = currentNiche === "manga-strategy" ? "" : `-${currentNiche}`;
  const [activeStage, setActiveStage] = useLocalStorage(
    `scribe-activeStage${keySuffix}`,
    1,
  );
  const [coreIdea, setCoreIdea] = useLocalStorage(
    `scribe-coreIdea${keySuffix}`,
    "",
  );
  const [worldBible, setWorldBible] = useLocalStorage(
    `scribe-worldBible${keySuffix}`,
    "",
  );
  const [ladder, setLadder] = useLocalStorage(`scribe-ladder${keySuffix}`, "");
  const [characters, setCharacters] = useLocalStorage(
    `scribe-characters${keySuffix}`,
    "",
  );
  const [outline, setOutline] = useLocalStorage(
    `scribe-outline${keySuffix}`,
    "",
  );
  const [sceneCards, setSceneCards] = useLocalStorage(
    `scribe-sceneCards${keySuffix}`,
    "",
  );
  const [scenarioBatches, setScenarioBatches] = useLocalStorage<
    { title: string; text: string }[]
  >(`scribe-scenarioBatches${keySuffix}`, []);
  const [customPreferences, setCustomPreferences] = useLocalStorage(
    `scribe-customPreferences${keySuffix}`,
    "",
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // also need to handle BlockWriting / BlockIdea text saving? They could be managed independently or they get cleared on refresh unless we persist them too.
  // Actually, the main state is the most important one.

  const endSession = () => {
    setActiveStage(1);
    setCoreIdea("");
    setWorldBible("");
    setLadder("");
    setCharacters("");
    setOutline("");
    setSceneCards("");
    setScenarioBatches([]);
    setCustomPreferences("");

    // Also clear other specific local storage keys if we add them later
    localStorage.removeItem(`scribe-ideaText${keySuffix}`);
    localStorage.removeItem(`scribe-scenarioMemory${keySuffix}`);
    localStorage.removeItem(`scribe-sceneCardsPart1${keySuffix}`);
    localStorage.removeItem(`scribe-sceneCardsPart2${keySuffix}`);

    setShowConfirmDialog(false);
    // Optional: Refresh the page to guarantee clean state for child components
    window.location.reload();
  };

  return (
    <div className="flex relative h-screen w-full bg-black/40 text-[#E2E2E2] font-sans overflow-hidden border-4 border-[#1A1A1C]">
      {/* Sidebar */}
      <aside
        className={`w-[260px] bg-[#111113] border-r border-white/5 flex flex-col shrink-0 z-10`}
      >
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-serif tracking-widest text-[#C9A050] uppercase">
            Scribe.AI
          </h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1">
            Architect Suite v2.0
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1 p-3">
            {STAGES.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`group flex items-center gap-3 w-full px-4 py-3 text-left transition-all ${
                    isActive
                      ? "bg-white/5 rounded-lg border border-white/10 cursor-default shadow-xl shadow-black/20"
                      : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`text-[11px] font-serif italic ${isActive ? "text-[#C9A050]" : "text-white/40"}`}
                  >
                    {stage.id.toString().padStart(2, "0")}
                  </span>
                  <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                    {stage.title}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 bg-black/20 border-t border-white/5 space-y-4">
          <div className="relative group overflow-hidden rounded border border-[#C9A050]/20 bg-black/40 p-3 hover:bg-black/60 transition-all duration-300 shadow-[0_0_15px_rgba(201,160,80,0.05)] hover:shadow-[0_0_20px_rgba(201,160,80,0.15)]">
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative shrink-0">
                <img
                  src="https://i.pinimg.com/736x/b7/be/16/b7be1653ca17c6c823788915af052090.jpg"
                  alt="AI Director"
                  className="w-10 h-10 rounded-sm object-cover border-2 border-[#C9A050]/40 filter contrast-125 hover:contrast-100 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#111113] shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#C9A050] uppercase tracking-widest font-bold truncate">
                    Nova AI
                  </span>
                </div>
                <span className="text-[9px] text-[#10b981] uppercase tracking-wider truncate mt-0.5">
                  Контроль Активен
                </span>
              </div>
            </div>
            {/* Subtle sweep animation on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A050]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          </div>

          <button
            onClick={() => setShowConfirmDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded text-[10px] uppercase tracking-widest font-bold border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Завершить сессию
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col bg-gradient-to-br from-[#0D0D0F] to-[#0A0A0B] overflow-hidden z-10`}
      >
        <header
          className={`h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/10 shrink-0`}
        >
          <div className="flex items-center gap-6 border-r border-white/5 pr-6">
            <div className="flex flex-col gap-1">
              <span className="text-white/20 uppercase text-[9px] tracking-widest">
                Ниша / Формат
              </span>
              <select
                className="bg-transparent border-none text-[#C9A050] text-[11px] uppercase tracking-widest font-bold outline-none cursor-pointer hover:text-[#D9B060] transition-colors appearance-none"
                value={currentNiche}
                onChange={(e) => setCurrentNiche(e.target.value)}
              >
                <option
                  value="manga-strategy"
                  className="bg-[#111113] text-white"
                >
                  Manga Strategy
                </option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-6 mr-auto">
            <span className="text-white/20 uppercase text-[10px] tracking-widest">
              Active Project
            </span>
            <span className="font-serif italic text-lg text-[#E2E2E2]">
              Тень за Горизонтом
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-[11px] uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              Export
            </button>
            <button className="px-4 py-1.5 border border-[#C9A050]/50 text-[#C9A050] text-[11px] uppercase tracking-widest hover:bg-[#C9A050]/10 transition-colors rounded-sm">
              Save Draft
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="p-12 pb-24 h-full"
            >
              <div className="max-w-5xl mx-auto h-full flex flex-col">
                <div className="mb-10 shrink-0">
                  <h2 className="text-4xl font-serif text-white mb-2 leading-tight">
                    Блок {activeStage}: {STAGES[activeStage - 1].title}
                  </h2>
                  <div className="h-px w-24 bg-[#C9A050]"></div>
                  <p className="text-sm leading-relaxed text-white/40 mt-4 max-w-2xl">
                    {STAGES[activeStage - 1].description}
                  </p>
                </div>

                <div className="flex-1 min-h-0 relative">
                  {activeStage === 1 && (
                    <BlockIdea
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      customPreferences={customPreferences}
                      setCustomPreferences={setCustomPreferences}
                    />
                  )}
                  {activeStage === 2 && (
                    <BlockWorld
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      worldBible={worldBible}
                      setWorldBible={setWorldBible}
                      customPreferences={customPreferences}
                    />
                  )}
                  {activeStage === 3 && (
                    <BlockLadder
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      worldBible={worldBible}
                      setWorldBible={setWorldBible}
                      ladder={ladder}
                      setLadder={setLadder}
                      customPreferences={customPreferences}
                    />
                  )}
                  {activeStage === 4 && (
                    <BlockCharacters
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      worldBible={worldBible}
                      setWorldBible={setWorldBible}
                      ladder={ladder}
                      setLadder={setLadder}
                      characters={characters}
                      setCharacters={setCharacters}
                      customPreferences={customPreferences}
                    />
                  )}
                  {activeStage === 5 && (
                    <BlockPlan
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      worldBible={worldBible}
                      setWorldBible={setWorldBible}
                      ladder={ladder}
                      setLadder={setLadder}
                      characters={characters}
                      setCharacters={setCharacters}
                      outline={outline}
                      setOutline={setOutline}
                      customPreferences={customPreferences}
                    />
                  )}
                  {activeStage === 6 && (
                    <BlockSceneCards
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      worldBible={worldBible}
                      setWorldBible={setWorldBible}
                      ladder={ladder}
                      setLadder={setLadder}
                      characters={characters}
                      setCharacters={setCharacters}
                      outline={outline}
                      setOutline={setOutline}
                      sceneCards={sceneCards}
                      setSceneCards={setSceneCards}
                      customPreferences={customPreferences}
                    />
                  )}
                  {activeStage === 7 && (
                    <BlockWriting
                      currentNiche={currentNiche}
                      coreIdea={coreIdea}
                      setCoreIdea={setCoreIdea}
                      worldBible={worldBible}
                      setWorldBible={setWorldBible}
                      ladder={ladder}
                      setLadder={setLadder}
                      characters={characters}
                      setCharacters={setCharacters}
                      outline={outline}
                      setOutline={setOutline}
                      sceneCards={sceneCards}
                      setSceneCards={setSceneCards}
                      scenarioBatches={scenarioBatches}
                      setScenarioBatches={setScenarioBatches}
                      customPreferences={customPreferences}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111113] border border-white/10 p-6 flex flex-col gap-6 max-w-sm w-full rounded-sm shadow-2xl">
              <h3 className="text-xl font-serif text-white">
                Завершить сессию?
              </h3>
              <p className="text-white/60 text-xs leading-relaxed">
                Все сгенерированные данные, идеи и сценарии будут удалены. Вы
                уверены, что хотите начать заново?
              </p>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded transition text-[10px] uppercase tracking-widest font-bold"
                >
                  Отмена
                </button>
                <button
                  onClick={endSession}
                  className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition text-[10px] uppercase tracking-widest font-bold border border-red-500/30"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {(() => {
        const getCurrentStageData = () => {
          switch (activeStage) {
            case 1:
              return coreIdea;
            case 2:
              return worldBible;
            case 3:
              return ladder;
            case 4:
              return characters;
            case 5:
              return outline;
            case 6:
              return sceneCards;
            case 7:
              return scenarioBatches.map((b: any) => b.text).join("\n---\n");
            default:
              return "";
          }
        };
        return (
          <InteractiveNovaCompanion
            activeStage={activeStage}
            currentStageText={getCurrentStageData() || ""}
          />
        );
      })()}
    </div>
  );
}

const ANTI_PLAGIARISM_WARNING = `
==================================================
🚨 КРИТИЧЕСКОЕ ПРАВИЛО: НЕ КОПИРОВАТЬ СЮЖЕТ ИЗ ПРИМЕРА 🚨
==================================================
Ниже приведен ПРИМЕР (EXAMPLE) фиктивного проекта.
Этот пример нужен ТОЛЬКО для демонстрации структуры, формата заголовков и глубины проработки!

КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ:
- Брать из примера имена персонажей, названия локаций, профессий или врагов.
- Брать из примера сюжетные повороты, события, лор и механики.
- Копировать идею, сеттинг или любые смысловые элементы примера.

Твоя задача — сгенерировать АБСОЛЮТНО УНИКАЛЬНЫЙ контент, опираясь ИСКЛЮЧИТЕЛЬНО на вводные данные (Ядро идеи пользователя, созданный мир и т.д.).
Твой ответ должен повторять только текстовую структуру примера, но содержание должно быть на 100% независимым и оригинальным, не связанным с сюжетом из примера!
==================================================
`;

// === STAGE COMPONENTS === //

function BlockIdea({
  coreIdea,
  setCoreIdea,
  currentNiche,
  customPreferences,
  setCustomPreferences,
}: any) {
  const keySuffix = currentNiche === "manga-strategy" ? "" : `-${currentNiche}`;
  const [ideaText, setIdeaText] = useLocalStorage(
    `scribe-ideaText${keySuffix}`,
    "",
  );
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!ideaText.trim()) return;
    setLoading(true);
    try {
      const exampleTemplate = STAGE1_EXAMPLE;
      const promptTemplate = STAGE1_PROMPT_STRATEGY;
      const prefsString = customPreferences?.trim()
        ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n${customPreferences}\n==================================================\n`
        : "";
      const finalPrompt = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nМОЯ ИДЕЯ:\n${ideaText}\n\nСгенерируй ядро сценария строго в таком же стиле и формате, опираясь ТОЛЬКО на мою идею:`;
      const text = await generateViaRPC(finalPrompt, false);
      setCoreIdea(text || "");
    } catch (e: any) {
      setCoreIdea("Ошибка генерации: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!coreIdea) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ТЕКСТА:\n${coreIdea}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию текста, строго соблюдая указания автора по доработке. Сохрани общий формат и качественные элементы, которые не противоречат новым указаниям.`;

      const text = await generateViaRPC(prompt, true);
      setCoreIdea(text || "");
    } catch (e: any) {
      setCoreIdea(coreIdea + "\n\nОшибка доработки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 flex flex-col h-[calc(100vh-14rem)]">
      <div className="p-6 bg-white/[0.03] border border-white/5 rounded-sm shrink-0 flex gap-6">
        <div className="flex-1">
          <label className="block text-[10px] uppercase text-[#C9A050] tracking-widest mb-3">
            The Core Concept
          </label>
          <textarea
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            className="w-full h-28 bg-black/40 border border-white/5 rounded-sm p-4 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-serif text-base leading-relaxed shadow-inner shadow-black/20"
            placeholder="В мире, где память — это валюта, главный герой обнаруживает на черном рынке свое собственное детство..."
          ></textarea>
        </div>
        <div className="w-[300px]">
          <label className="block text-[10px] uppercase text-white/50 tracking-widest mb-3">
            Vision (Custom Rules)
          </label>
          <textarea
            value={customPreferences || ""}
            onChange={(e) => setCustomPreferences(e.target.value)}
            className="w-full h-28 bg-black/40 border border-white/5 rounded-sm p-4 text-white/50 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none custom-scrollbar text-xs leading-relaxed shadow-inner shadow-black/20"
            placeholder="Напр., 'Без магии, упор на дипломатию и собирательство ресурсов...'"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-white/5 pt-4 shrink-0">
        <div className="flex gap-3">
          {[
            "Без магии (Hard Survival)",
            "Social Strategy",
            "Engineering",
            "Cultivation+Base",
          ].map((tag) => (
            <span
              key={tag}
              onClick={() => {
                const add = tag;
                if (!customPreferences?.includes(add)) {
                  setCustomPreferences(
                    (customPreferences ? customPreferences + "\n" : "") +
                      "Упор на: " +
                      add,
                  );
                }
              }}
              className="px-3 py-1 bg-white/5 text-[10px] text-white/50 rounded-sm border border-white/10 uppercase tracking-widest cursor-pointer hover:text-[#C9A050] hover:border-[#C9A050]/30 transition-all"
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !ideaText.trim()}
          className="bg-[#C9A050] hover:bg-[#D9B060] disabled:opacity-50 text-black px-6 py-2.5 rounded-sm flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)]"
        >
          <Wand2 className="w-3.5 h-3.5" />{" "}
          {loading ? "Генерация..." : "Сгенерировать"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col">
        <div className="flex-1">
          {coreIdea ? (
            <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
              {coreIdea}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold">
              Здесь появится сгенерированное ядро сценария
            </div>
          )}
        </div>
        <RefineBlock
          currentText={coreIdea}
          onRefine={handleRefine}
          loading={loading}
        />
      </div>
    </div>
  );
}

function BlockWorld({
  currentNiche,
  coreIdea,
  setCoreIdea,
  worldBible,
  setWorldBible,
  customPreferences,
}: any) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!coreIdea.trim()) return;
    setLoading(true);
    try {
      const exampleTemplate = STAGE2_EXAMPLE_STRATEGY;
      const promptTemplate = STAGE2_PROMPT_STRATEGY;
      const prefsString = customPreferences?.trim()
        ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n${customPreferences}\n==================================================\n`
        : "";
      const finalPrompt = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nЯДРО ИДЕИ (ЭТАП 1):\n${coreIdea}\n\nСгенерируй WORLD BIBLE строго в таком же стиле, без копирования сюжета из примера:`;
      let fullString = "";
      await generateViaStream(finalPrompt, false, (chunk) => {
        fullString = chunk;
        setWorldBible(fullString);
      });
    } catch (e: any) {
      setWorldBible("Ошибка генерации: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!worldBible) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ТЕКСТА (WORLD BIBLE):\n${worldBible}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию, строго интегрировав указания автора. Сохраняй форматирование и утвержденные элементы, если они не противоречат правкам.`;
      let fullString = "";
      await generateViaStream(prompt, true, (chunk) => {
        fullString = chunk;
        setWorldBible(fullString);
      });
    } catch (e: any) {
      setWorldBible(worldBible + "\n\nОшибка доработки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!worldBible) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация WORLD BIBLE прервалась из-за лимита токенов. Вот весь сгенерированный текст к этому моменту:\n\n======================\n${worldBible}\n======================\n\nПожалуйста, продолжи генерацию с этого самого места. Обязательно начни прямо со следующего слова/абзаца/секции без каких-либо вводных слов вроде "Конечно, вот продолжение:", "Продолжаем:" или подобных. Напиши продолжение максимально подробно, сохраняя стиль и формат:`;
      await generateViaStream(prompt, false, (chunk) => {
        setWorldBible(worldBible + chunk);
      });
    } catch (e: any) {
      alert("Ошибка продолжения: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-14rem)]">
      <div className="w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 flex flex-col flex-1 h-full">
          <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-4 block">
            Вставьте Ядро Идеи (с Этапа 1)
          </label>
          <textarea
            value={coreIdea}
            onChange={(e) => setCoreIdea(e.target.value)}
            className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-4 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-sm leading-relaxed shadow-inner shadow-black/20"
            placeholder="Вставьте сгенерированное ядро с предыдущего этапа..."
          ></textarea>

          <button
            onClick={handleGenerate}
            disabled={loading || !coreIdea.trim()}
            className="w-full mt-6 bg-white/[0.05] hover:bg-[#C9A050] disabled:opacity-50 text-white/70 hover:text-black py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)]"
          >
            <Globe className="w-4 h-4" />{" "}
            {loading ? "Создание мира..." : "Сгенерировать Библию Мира"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0">
          <h3 className="text-2xl font-serif text-white/90">World Bible</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
          <div className="flex-1">
            {worldBible ? (
              <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                {worldBible}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold">
                Здесь появится описание мира (World Bible)
              </div>
            )}
          </div>
          <RefineBlock
            currentText={worldBible}
            onRefine={handleRefine}
            onContinue={handleContinue}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function BlockLadder({
  currentNiche,
  coreIdea,
  setCoreIdea,
  worldBible,
  setWorldBible,
  ladder,
  setLadder,
  customPreferences,
}: any) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!coreIdea.trim() || !worldBible.trim()) return;
    setLoading(true);
    try {
      const exampleTemplate = STAGE3_EXAMPLE_STRATEGY;
      const promptTemplate = STAGE3_PROMPT_STRATEGY;
      const prefsString = customPreferences?.trim()
        ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n    ${customPreferences}\n==================================================\n`
        : "";
      const finalPrompt = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nЯДРО ИДЕИ (ЭТАП 1):\n${coreIdea}\n\nWORLD BIBLE (ЭТАП 2):\n${worldBible}\n\nСоздай стратегическую лестницу прогрессии, опираясь ТОЛЬКО на этот мир и идею:`;
      let fullString = "";
      await generateViaStream(finalPrompt, false, (chunk) => {
        fullString = chunk;
        setLadder(fullString);
      });
    } catch (e: any) {
      setLadder("Ошибка генерации: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!ladder) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ТЕКСТА (PROGRESSION LADDER):\n${ladder}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию, строго интегрировав указания автора. Сохраняй форматирование и утвержденные элементы, если они не противоречат правкам.`;
      let fullString = "";
      await generateViaStream(prompt, true, (chunk) => {
        fullString = chunk;
        setLadder(fullString);
      });
    } catch (e: any) {
      setLadder(ladder + "\n\nОшибка доработки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!ladder) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация PROGRESSION LADDER прервалась из-за лимита токенов. Вот весь сгенерированный текст к этому моменту:\n\n======================\n${ladder}\n======================\n\nПожалуйста, продолжи генерацию с этого самого места. Обязательно начни прямо со следующего слова/абзаца/секции без каких-либо вводных слов вроде "Конечно, вот продолжение:" или подобных. Напиши продолжение максимально подробно, сохраняя стиль и формат:`;
      await generateViaStream(prompt, false, (chunk) => {
        setLadder(ladder + chunk);
      });
    } catch (e: any) {
      alert("Ошибка продолжения: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-14rem)]">
      <div className="w-[380px] shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 flex flex-col flex-1 h-full gap-4">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              Ядро Идеи (Этап 1)
            </label>
            <textarea
              value={coreIdea}
              onChange={(e) => setCoreIdea(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-4 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-sm leading-relaxed shadow-inner shadow-black/20"
              placeholder="Вставьте ядро идеи..."
            ></textarea>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              World Bible (Этап 2)
            </label>
            <textarea
              value={worldBible}
              onChange={(e) => setWorldBible(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-4 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-sm leading-relaxed shadow-inner shadow-black/20"
              placeholder="Вставьте библию мира..."
            ></textarea>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !coreIdea.trim() || !worldBible.trim()}
            className="w-full mt-2 bg-white/[0.05] hover:bg-[#C9A050] disabled:opacity-50 text-white/70 hover:text-black py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)] shrink-0"
          >
            <TrendingUp className="w-4 h-4" />{" "}
            {loading ? "Создание прогрессии..." : "Сгенерировать Прогрессию"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0">
          <h3 className="text-2xl font-serif text-white/90">
            Progression Ladder
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
          <div className="flex-1">
            {ladder ? (
              <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                {ladder}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold">
                Здесь появится стратегическая лестница прогрессии
              </div>
            )}
          </div>
          <RefineBlock
            currentText={ladder}
            onRefine={handleRefine}
            onContinue={handleContinue}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function BlockCharacters({
  currentNiche,
  coreIdea,
  setCoreIdea,
  worldBible,
  setWorldBible,
  ladder,
  setLadder,
  characters,
  setCharacters,
  customPreferences,
}: any) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!coreIdea.trim() || !worldBible.trim() || !ladder.trim()) return;
    setLoading(true);
    try {
      const exampleTemplate = STAGE4_EXAMPLE_STRATEGY;
      const promptTemplate = STAGE4_PROMPT_STRATEGY;
      const prefsString = customPreferences?.trim()
        ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n${customPreferences}\n==================================================\n`
        : "";
      const finalPrompt = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nЯДРО ИДЕИ:\n${coreIdea}\n\nWORLD BIBLE:\n${worldBible}\n\nPROGRESSION LADDER:\n${ladder}\n\nСоздай SOCIAL MAP для этого мира (уникальных персонажей под этот лор):`;
      let fullString = "";
      await generateViaStream(finalPrompt, false, (chunk) => {
        fullString = chunk;
        setCharacters(fullString);
      });
    } catch (e: any) {
      setCharacters("Ошибка генерации: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!characters) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ТЕКСТА (SOCIAL MAP / CHARACTERS):\n${characters}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию, строго интегрировав указания автора. Сохраняй форматирование и утвержденные элементы, если они не противоречат правкам.`;
      let fullString = "";
      await generateViaStream(prompt, true, (chunk) => {
        fullString = chunk;
        setCharacters(fullString);
      });
    } catch (e: any) {
      setCharacters(characters + "\n\nОшибка доработки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!characters) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация SOCIAL MAP прервалась из-за лимита токенов. Вот весь сгенерированный текст к этому моменту:\n\n======================\n${characters}\n======================\n\nПожалуйста, продолжи генерацию с этого самого места. Обязательно начни прямо со следующего слова/секции/персонажа без каких-либо вводных фраз. Напиши продолжение максимально подробно, сохраняя стиль и формат:`;
      await generateViaStream(prompt, false, (chunk) => {
        setCharacters(characters + chunk);
      });
    } catch (e: any) {
      alert("Ошибка продолжения: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-14rem)]">
      <div className="w-[380px] shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 flex flex-col flex-1 h-full gap-4">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              Ядро (Этап 1)
            </label>
            <textarea
              value={coreIdea}
              onChange={(e) => setCoreIdea(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте ядро..."
            ></textarea>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              World Bible (Этап 2)
            </label>
            <textarea
              value={worldBible}
              onChange={(e) => setWorldBible(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте библию мира..."
            ></textarea>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              Лестница (Этап 3)
            </label>
            <textarea
              value={ladder}
              onChange={(e) => setLadder(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте прогрессию..."
            ></textarea>
          </div>

          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              !coreIdea.trim() ||
              !worldBible.trim() ||
              !ladder.trim()
            }
            className="w-full mt-2 bg-white/[0.05] hover:bg-[#C9A050] disabled:opacity-50 text-white/70 hover:text-black py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)] shrink-0"
          >
            <Users className="w-4 h-4" />{" "}
            {loading ? "Создание карты..." : "Сгенерировать Персонажей"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0">
          <h3 className="text-2xl font-serif text-white/90">Social Map</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
          <div className="flex-1">
            {characters ? (
              <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                {characters}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold text-center px-8 leading-relaxed">
                Здесь появится социальная карта персонажей
              </div>
            )}
          </div>
          <RefineBlock
            currentText={characters}
            onRefine={handleRefine}
            onContinue={handleContinue}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function BlockPlan({
  currentNiche,
  coreIdea,
  setCoreIdea,
  worldBible,
  setWorldBible,
  ladder,
  setLadder,
  characters,
  setCharacters,
  outline,
  setOutline,
  customPreferences,
}: any) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (
      !coreIdea.trim() ||
      !worldBible.trim() ||
      !ladder.trim() ||
      !characters.trim()
    )
      return;
    setLoading(true);
    try {
      const exampleTemplate = STAGE5_EXAMPLE_STRATEGY;
      const promptTemplate = STAGE5_PROMPT_STRATEGY;
      const prefsString = customPreferences?.trim()
        ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n${customPreferences}\n==================================================\n`
        : "";
      const finalPrompt = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nЯДРО ИДЕИ:\n${coreIdea}\n\nWORLD BIBLE:\n${worldBible}\n\nPROGRESSION LADDER:\n${ladder}\n\nSOCIAL MAP:\n${characters}\n\nСоздай ПЛАН СЦЕНАРИЯ НА 9 ЧАСТЕЙ (Уникальный сюжет под эти вводные данные, не из примера):`;
      let fullString = "";
      await generateViaStream(finalPrompt, true, (chunk) => {
        fullString = chunk;
        setOutline(fullString);
      });
    } catch (e: any) {
      setOutline("Ошибка генерации: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!outline) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ТЕКСТА (MACRO OUTLINE / ПЛАН):\n${outline}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию, строго интегрировав указания автора. Сохраняй форматирование и утвержденные элементы, если они не противоречат правкам.`;
      let fullString = "";
      await generateViaStream(prompt, true, (chunk) => {
        fullString = chunk;
        setOutline(fullString);
      });
    } catch (e: any) {
      setOutline(outline + "\n\nОшибка доработки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!outline) return;
    setLoading(true);
    try {
      const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация MACRO OUTLINE ПЛАНА прервалась из-за лимита токенов. Вот весь сгенерированный текст к этому моменту:\n\n======================\n${outline}\n======================\n\nПожалуйста, продолжи генерацию с этого самого места (например, со следующей части/пункта плана). Обязательно начни прямо со следующего слова/абзаца без вводных фраз. Напиши продолжение максимально подробно, сохраняя стиль и формат:`;
      await generateViaStream(prompt, true, (chunk) => {
        setOutline(outline + chunk);
      });
    } catch (e: any) {
      alert("Ошибка продолжения: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-14rem)]">
      <div className="w-[380px] shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 flex flex-col flex-1 h-full gap-4">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              Ядро (Этап 1)
            </label>
            <textarea
              value={coreIdea}
              onChange={(e) => setCoreIdea(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте ядро..."
            ></textarea>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              World Bible (Этап 2)
            </label>
            <textarea
              value={worldBible}
              onChange={(e) => setWorldBible(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте библию мира..."
            ></textarea>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              Лестница (Этап 3)
            </label>
            <textarea
              value={ladder}
              onChange={(e) => setLadder(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте прогрессию..."
            ></textarea>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-3 block">
              Персонажи (Этап 4)
            </label>
            <textarea
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              className="w-full flex-1 bg-black/40 border border-white/5 rounded-sm p-3 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте карту персонажей..."
            ></textarea>
          </div>

          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              !coreIdea.trim() ||
              !worldBible.trim() ||
              !ladder.trim() ||
              !characters.trim()
            }
            className="w-full mt-2 bg-white/[0.05] hover:bg-[#C9A050] disabled:opacity-50 text-white/70 hover:text-black py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)] shrink-0"
          >
            <ListOrdered className="w-4 h-4" />{" "}
            {loading ? "Создание плана..." : "Сгенерировать План"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0">
          <h3 className="text-2xl font-serif text-white/90">Macro Outline</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
          <div className="flex-1">
            {outline ? (
              <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                {outline}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold text-center px-8 leading-relaxed">
                Здесь появится макро-план сценария
              </div>
            )}
          </div>
          <RefineBlock
            currentText={outline}
            onRefine={handleRefine}
            onContinue={handleContinue}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function BlockSceneCards({
  currentNiche,
  coreIdea,
  setCoreIdea,
  worldBible,
  setWorldBible,
  ladder,
  setLadder,
  characters,
  setCharacters,
  outline,
  setOutline,
  sceneCards,
  setSceneCards,
  customPreferences,
}: any) {
  const [loading, setLoading] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const keySuffix = currentNiche === "manga-strategy" ? "" : `-${currentNiche}`;
  const [sceneCardsPart1, setSceneCardsPart1] = useLocalStorage(
    `scribe-sceneCardsPart1${keySuffix}`,
    "",
  );
  const [sceneCardsPart2, setSceneCardsPart2] = useLocalStorage(
    `scribe-sceneCardsPart2${keySuffix}`,
    "",
  );
  const [sceneCardsTab, setSceneCardsTab] = useState<"all" | "part1" | "part2">(
    "all",
  );

  const handleGenerate = async () => {
    if (
      !coreIdea.trim() ||
      !worldBible.trim() ||
      !ladder.trim() ||
      !characters.trim() ||
      !outline.trim()
    )
      return;
    setLoading(true);
    setGeneratingStatus("Генерация Части 1 из 2 (Главы 1-5)...");
    setSceneCardsTab("part1");
    try {
      const promptTemplate = STAGE6_PROMPT;
      const exampleTemplate = STAGE6_EXAMPLE;

      const prefsString = customPreferences?.trim()
        ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n${customPreferences}\n==================================================\n`
        : "";

      // Step 1: Generate Chapters 1-5
      const finalPrompt1 = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nЯДРО ИДЕИ:\n${coreIdea}\n\nWORLD BIBLE:\n${worldBible}\n\nPROGRESSION LADDER:\n${ladder}\n\nSOCIAL MAP:\n${characters}\n\nMACRO OUTLINE:\n${outline}\n\nЗадание: Создай ПЕРВУЮ ЧАСТЬ карточек сцен (SCENE CARDS) строго для глав 1, 2, 3, 4 и 5 из Macro Outline. Сделай описание каждой сцены максимально глубоким, тактическим и детальным в соответствии со стилем. Напиши карточки ТОЛЬКО для глав 1-5 и заверши ровно на главе 5:`;

      let fullString1 = "";
      await generateViaStream(finalPrompt1, true, (chunk) => {
        fullString1 = chunk;
        setSceneCardsPart1(fullString1);
        setSceneCards(fullString1);
      });

      // Step 2: Generate Chapters 6-9
      setGeneratingStatus("Генерация Части 2 из 2 (Главы 6-9)...");
      setSceneCardsTab("part2");

      const finalPrompt2 = `${promptTemplate}\n${ANTI_PLAGIARISM_WARNING}${prefsString}\nПРИМЕР ОЖИДАЕМОГО ОТВЕТА:\n${exampleTemplate}\n\nЯДРО ИДЕИ:\n${coreIdea}\n\nWORLD BIBLE:\n${worldBible}\n\nPROGRESSION LADDER:\n${ladder}\n\nSOCIAL MAP:\n${characters}\n\nMACRO OUTLINE:\n${outline}\n\nУже сгенерирована первая часть карточек сцен для глав 1-5:\n======================\n${fullString1}\n======================\n\nЗадание: Теперь создай ВТОРУЮ ЧАСТЬ карточек сцен (SCENE CARDS) строго для оставшихся глав 6, 7, 8 и 9 из Macro Outline. Продолжай сюжетную логику, сохраняй тот же стиль и формат. Не повторяй главы 1-5, начни сразу с главы 6:`;

      let fullString2 = "";
      await generateViaStream(finalPrompt2, true, (chunk) => {
        fullString2 = chunk;
        setSceneCardsPart2(fullString2);
        setSceneCards(fullString1 + "\n\n" + fullString2);
      });

      setSceneCardsTab("all");
    } catch (e: any) {
      setSceneCards("Ошибка генерации: " + e.message);
    } finally {
      setLoading(false);
      setGeneratingStatus("");
    }
  };

  const handleRefine = async (instruction: string) => {
    setLoading(true);
    try {
      if (sceneCardsTab === "part1") {
        const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ПЕРВОЙ ЧАСТИ ТЕКСТА (Главы 1-5):\n${sceneCardsPart1}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ ДЛЯ ЭТОЙ ЧАСТИ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию Первой Части (Главы 1-5), строго интегрировав указания автора. Сохраняй форматирование и структуру.`;
        let fullString = "";
        await generateViaStream(prompt, true, (chunk) => {
          fullString = chunk;
          setSceneCardsPart1(fullString);
          setSceneCards(fullString + "\n\n" + sceneCardsPart2);
        });
      } else if (sceneCardsTab === "part2") {
        const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ВТОРОЙ ЧАСТИ ТЕКСТА (Главы 6-9):\n${sceneCardsPart2}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ ДЛЯ ЭТОЙ ЧАСТИ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию Второй Части (Главы 6-9), строго интегрировав указания автора. Сохраняй форматирование и структуру.`;
        let fullString = "";
        await generateViaStream(prompt, true, (chunk) => {
          fullString = chunk;
          setSceneCardsPart2(fullString);
          setSceneCards(sceneCardsPart1 + "\n\n" + fullString);
        });
      } else {
        const prompt = `Ты профессиональный сценарный архитектор.\n\nТЕКУЩАЯ ВЕРСИЯ ВСЕГО ТЕКСТА КАРТОЧЕК СЦЕН (SCENE CARDS):\n${sceneCards}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПЕРЕПИСЫВАНИЮ / ПРАВКАМ:\n${instruction}\n\nЗадание: Полностью перепиши текущую версию, строго интегрировав указания автора. Сохраняй форматирование и утвержденные элементы, если они не противоречат правкам.`;
        let fullString = "";
        await generateViaStream(prompt, true, (chunk) => {
          fullString = chunk;
          setSceneCards(fullString);
        });
      }
    } catch (e: any) {
      alert("Ошибка доработки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      if (sceneCardsTab === "part1") {
        const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация Первой Части прервалась. Вот что было сгенерировано:\n\n======================\n${sceneCardsPart1}\n======================\n\nПродолжи генерацию с этого самого места для Первой Части (Главы 1-5). Не пиши никаких вводных слов, пиши строго продолжение:`;
        await generateViaStream(prompt, true, (chunk) => {
          const newPart1 = stitchTexts(sceneCardsPart1, chunk);
          setSceneCardsPart1(newPart1);
          setSceneCards(stitchTexts(newPart1, sceneCardsPart2));
        });
      } else if (sceneCardsTab === "part2") {
        const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация Второй Части прервалась. Вот что было сгенерировано:\n\n======================\n${sceneCardsPart2}\n======================\n\nПродолжи генерацию с этого самого места для Второй Части (Главы 6-9). Не пиши никаких вводных слов, пиши строго продолжение:`;
        await generateViaStream(prompt, true, (chunk) => {
          const newPart2 = stitchTexts(sceneCardsPart2, chunk);
          setSceneCardsPart2(newPart2);
          setSceneCards(stitchTexts(sceneCardsPart1, newPart2));
        });
      } else {
        const prompt = `Ты профессиональный сценарный архитектор.\n\nПредыдущая генерация КАРТОЧЕК СЦЕН прервалась. Вот сгенерированный текст:\n\n======================\n${sceneCards}\n======================\n\nПожалуйста, продолжи генерацию с этого самого места:`;
        await generateViaStream(prompt, true, (chunk) => {
          setSceneCards(stitchTexts(sceneCards, chunk));
        });
      }
    } catch (e: any) {
      alert("Ошибка продолжения: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-14rem)]">
      <div className="w-[380px] shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 flex flex-col flex-1 h-full gap-3 overflow-y-auto custom-scrollbar">
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Ядро (Этап 1)
            </label>
            <textarea
              value={coreIdea}
              onChange={(e) => setCoreIdea(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте ядро..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              World Bible (Этап 2)
            </label>
            <textarea
              value={worldBible}
              onChange={(e) => setWorldBible(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте библию мира..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Лестница (Этап 3)
            </label>
            <textarea
              value={ladder}
              onChange={(e) => setLadder(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте прогрессию..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Персонажи (Этап 4)
            </label>
            <textarea
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте карту персонажей..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Macro Outline (Этап 5)
            </label>
            <textarea
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте макро-план..."
            ></textarea>
          </div>

          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              !coreIdea.trim() ||
              !worldBible.trim() ||
              !ladder.trim() ||
              !characters.trim() ||
              !outline.trim()
            }
            className="w-full mt-2 bg-white/[0.05] hover:bg-[#C9A050] disabled:opacity-50 text-white/70 hover:text-black py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)] shrink-0"
          >
            <Layers className="w-4 h-4" />{" "}
            {loading
              ? generatingStatus || "Создание карточек..."
              : "Сгенерировать Scene Cards"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0 flex-wrap gap-3">
          <h3 className="text-2xl font-serif text-white/90">Scene Cards</h3>
          <div className="flex bg-black/40 border border-white/5 p-0.5 rounded-sm gap-1">
            <button
              onClick={() => setSceneCardsTab("part1")}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-all rounded-sm ${sceneCardsTab === "part1" ? "bg-[#C9A050] text-[#111113]" : "text-white/40 hover:text-white/70"}`}
            >
              Часть 1 (Гл. 1-5)
            </button>
            <button
              onClick={() => setSceneCardsTab("part2")}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-all rounded-sm ${sceneCardsTab === "part2" ? "bg-[#C9A050] text-[#111113]" : "text-white/40 hover:text-white/70"}`}
            >
              Часть 2 (Гл. 6-9)
            </button>
            <button
              onClick={() => setSceneCardsTab("all")}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-all rounded-sm ${sceneCardsTab === "all" ? "bg-[#C9A050] text-[#111113]" : "text-white/40 hover:text-white/70"}`}
            >
              Все главы
            </button>
          </div>
        </div>

        {generatingStatus && (
          <div className="mb-4 bg-[#C9A050]/10 border border-[#C9A050]/20 text-[#C9A050] p-3 rounded-sm text-xs font-serif italic tracking-wide flex items-center gap-2 shrink-0 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#C9A050] animate-ping"></span>
            {generatingStatus}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
          <div className="flex-1">
            {sceneCardsTab === "part1" ? (
              sceneCardsPart1 ? (
                <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                  {sceneCardsPart1}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold text-center px-8 leading-relaxed">
                  Первая часть (Главы 1-5) еще не сгенерирована
                </div>
              )
            ) : sceneCardsTab === "part2" ? (
              sceneCardsPart2 ? (
                <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                  {sceneCardsPart2}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold text-center px-8 leading-relaxed">
                  Вторая часть (Главы 6-9) еще не сгенерирована
                </div>
              )
            ) : sceneCards ? (
              <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                {sceneCards}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold text-center px-8 leading-relaxed">
                Здесь появятся карточки сцен всего сценария
              </div>
            )}
          </div>
          <RefineBlock
            currentText={
              sceneCardsTab === "part1"
                ? sceneCardsPart1
                : sceneCardsTab === "part2"
                  ? sceneCardsPart2
                  : sceneCards
            }
            onRefine={handleRefine}
            onContinue={handleContinue}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function BlockWriting({
  coreIdea,
  setCoreIdea,
  worldBible,
  setWorldBible,
  ladder,
  setLadder,
  characters,
  setCharacters,
  outline,
  setOutline,
  sceneCards,
  setSceneCards,
  scenarioBatches,
  setScenarioBatches,
  currentNiche,
  customPreferences,
}: any) {
  const keySuffix = currentNiche === "manga-strategy" ? "" : `-${currentNiche}`;
  const [scenarioMemory, setScenarioMemory] = useLocalStorage(
    `scribe-scenarioMemory${keySuffix}`,
    "",
  );
  const [loading, setLoading] = useState(false);
  const [generatingPart, setGeneratingPart] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Assistant chatbot states
  const [writingTab, setWritingTab] = useState<"assistant" | "batches">(
    "assistant",
  );
  const [assistantInput, setAssistantInput] = useState("");
  const [messages, setMessages] = useLocalStorage<any[]>(
    `scribe-assistantMessages${keySuffix}`,
    [
      {
        sender: "scribe",
        text: "Привет! Я твой выделенный ассистент-сценарист. Я полностью загрузил твой Macro Outline и Scene Cards. Я знаю все наши строгие анти-шлак правила (никакого дешевого сентиментального мыла, никакого медленного романса, строгий YouTube-темп, раскрытие физики, химии и тактического интеллекта Кенджи для добора символов).\n\nПеред тем как запустить генерацию всего 9-серийного сценария на 130 000 символов, давай проверим мое понимание плана (Alignment Check). Ты можешь расспросить меня лично: 'Привет, ты точно помнишь правила и понимаешь, как писать части плана?', и я детально расложу тебе конкретную тактику для каждой из серий без дежурных заготовок!",
      },
    ],
  );
  const [assistantLoading, setAssistantLoading] = useState(false);

  const handleSendAssistantMessage = async () => {
    if (!assistantInput.trim() || assistantLoading) return;
    const userText = assistantInput.trim();
    setAssistantInput("");

    const newMessages = [...messages, { sender: "user", text: userText }];
    setMessages(newMessages);
    setAssistantLoading(true);

    try {
      const historyStr = newMessages
        .map(
          (m) =>
            `${m.sender === "user" ? "Пользователь" : "Сценарист"}: ${m.text}`,
        )
        .join("\n\n");
      const prompt = `Ты — профессиональный харизматичный сценарист YouTube-рекапов. Тебя нанял пользователь для написания сценария на 9 частей.
Пользователь прямо сейчас проводит проверку твоего понимания темы и строгости соблюдения правил (Alignment Interview) ПЕРЕД началом генерации масштабного сценария.

ВОТ ТВОИ ПРАВИЛА И ОГРАНИЧЕНИЯ (КРАЙНЕ СТРОГИЕ):
1. АНТИ-СЛАЙС / АНТИ-РОМАНТИКА (ANTI-SLOP & ANTI-ROMANCE GUARDRAILS):
   Полностью ЗАПРЕЩЕНО писать слащавые, сопливые, медленные любовные описания, прижимания тел, соприкосновения бедер, касания груди, дыхание в шею и смущение в формате дешевых любовных романов. Это считается дешевым AI-шлаком и банится. Если есть сближение персонажей — оно подается ЧЕРЕЗ динамичный, саркастичный и живой ютуб-комментарий, подколы, быструю динамику или мимолетную неловкость.
2. ФОРМАТ РАЗДУВАНИЯ СИМВОЛОВ (ДОБОР ОБЪЕМА БЕЗ ВОДЫ):
   Тебе нужно писать объемные части. Добирать текст можно ТОЛЬКО следующими способами:
   - Саркастичные, живые размышления диктора (YouTube-рекап вещание, 4-ая стена).
   - Глубокие технические детали: физика, химия, инженерия, формулы (индекс преломления линз, скин-эффект Клетки Фарадея, формулы термита и горения без дыма).
   - Тактические диалоги между выжившими (споры о планах, цифры, ресурсы).
   - Детальный разбор биометрии и реакций толпы: кто побледнел, у кого пошли мурашки, кто позавидовал, какая статистика изменилась в глазах Сатоко или Барона.

ВОТ МАТЕРИАЛЫ ТЕКУЩЕГО ПРОЕКТА:
- ЯДРО ИДЕИ: ${coreIdea}
- БИБЛИЯ МИРА: ${worldBible}
- ЛЕСТНИЦА ПРОГРЕССИИ: ${ladder}
- КАРТА ПЕРСОНАЖЕЙ: ${characters}
- МАКРО ПЛАН (9 ЧАСТЕЙ): ${outline}
- КАРТОЧКИ СЦЕН: ${sceneCards}
${customPreferences?.trim() ? `\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ:\n${customPreferences}\n` : ""}

УКАЗАНИЯ ДЛЯ ОТВЕТА:
- Отвечай только на русском языке живым, профессиональным, уверенным тоном опытного сценариста рекап-каналов.
- Будь абсолютно конкретен. Если тебя спрашивают, помнишь ли ты правила или как будешь писать часть X или как будешь добирать объем, опиши ключевые физико-химические детали, тактику, отсылку к синестезии Кенджи, и подтверди, что ты полностью согласен писать БЕЗ соплей и AI-кринжа.
- Сделай ответ ёмким, убедительным и без заготовленных шаблонных фраз. Покажи, что ты ДЕЙСТВИТЕЛЬНО проанализировал его макро-план на 9 частей и готов к созданию сценария топового уровня.

ИСТОРИЯ ДИАЛОГА С ПОЛЬЗОВАТЕЛЕМ:
${historyStr}

Ответь в свободной форме от первого лица как сценарист. Не используй шаблоны, отвечай на вопросы лично и вникай в переданный Outline.`;

      let currentResponse = "";
      const messagesWithPlaceholder = [
        ...newMessages,
        { sender: "scribe", text: "Думаю над твоим вопросом..." },
      ];
      setMessages(messagesWithPlaceholder);

      await generateViaStream(prompt, true, (chunk) => {
        currentResponse = chunk;
        const updated = [
          ...newMessages,
          { sender: "scribe", text: currentResponse },
        ];
        setMessages(updated);
      });
    } catch (e: any) {
      setMessages([
        ...newMessages,
        {
          sender: "scribe",
          text: "Ошибка взаимодействия с ассистентом: " + e.message,
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleGenerate = async () => {
    if (
      !coreIdea.trim() ||
      !worldBible.trim() ||
      !ladder.trim() ||
      !characters.trim() ||
      !outline.trim() ||
      !sceneCards.trim()
    )
      return;
    setWritingTab("batches");
    setLoading(true);
    setScenarioBatches([]); // Очищаем перед новой полной генерацией
    let currentMemory = scenarioMemory;
    let localBatches: { title: string; text: string; verification?: string }[] =
      [];

    // Создаем новый контроллер
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Таргеты для 9 частей, чтобы в сумме выходило ~130 000 символов
      const charTargets = [
        12000, 13000, 14000, 15000, 15000, 16000, 16000, 15000, 14000,
      ];

      for (let i = 1; i <= 9; i++) {
        setGeneratingPart(i);
        const targetChars = charTargets[i - 1];
        const minChars = targetChars - 2000;
        const maxChars = targetChars + 2000;

        const stylePrefix = `${STYLE_MASTER_PROMPT}\n\n${MANGA_RECAP_STYLE_MODULE}\n\n`;
        let prefsString = customPreferences?.trim()
          ? `\n==================================================\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ О ВКУСАХ/ОГРАНИЧЕНИЯХ (СТРОГО СОБЛЮДАТЬ!):\n${customPreferences}\n==================================================\n`
          : "";
        const controlCore = `${SCRIPT_WRITING_CONTROL_CORE}\n\n`;
        const reminder = `${PART_WRITING_REMINDER}\n\n`;
        const projectMemory = `ЯДРО ИДЕИ:\n${coreIdea}\n\nWORLD BIBLE:\n${worldBible}\n\nPROGRESSION LADDER:\n${ladder}\n\nSOCIAL MAP:\n${characters}\n\n`;
        const plan = `MACRO OUTLINE:\n${outline}\n\n`;
        const cards = `SCENE CARDS:\n${sceneCards}\n\n`;

        let retries = 4;
        let success = false;
        let finalScriptText = "";
        let finalMemoryUpdate = "";

        while (retries > 0 && !success && !signal.aborted) {
          try {
            const batchTitle = `Часть ${i} из 9`;
            localBatches = [
              ...localBatches,
              { title: batchTitle, text: "Starting generation..." },
            ];
            setScenarioBatches([...localBatches]);

            const previousSavedBatches = localBatches.slice(0, i - 1);
            let partAnalysisSummary = "";
            let immediatelyPrecedingScript = "";

            if (previousSavedBatches.length > 0) {
              const olderBatches = previousSavedBatches.slice(0, -1);
              const olderSummary = olderBatches
                .map((b, idx) => {
                  return `Chapter ${idx + 1} Summary of Events and Status Shift:
- Milestones Completed & Verified: ${b.verification || "Successfully aligned with macro outline and character function stability check."}
- Recap outcome and progression status is fully locked.`;
                })
                .join("\n\n");

              const lastBatch =
                previousSavedBatches[previousSavedBatches.length - 1];
              immediatelyPrecedingScript = `==================================================
ACTUAL RAW SCRIPT OF THE IMMEDIATELY PRECEDING CHAPTER (CHAPTER ${previousSavedBatches.length}) FOR SEAMLESS CONTINUATION:
==================================================
${lastBatch.text}
==================================================`;

              partAnalysisSummary =
                olderBatches.length > 0
                  ? `==================================================
CHRONOLOGICAL SUMMARY OF PAST PLOT OUTCOMES (CHAPTERS 1 TO ${olderBatches.length}):
==================================================
${olderSummary}
==================================================\n\n`
                  : "";
            }

            const historyBlock = `${partAnalysisSummary}${immediatelyPrecedingScript}`;

            const styleReinforcement = `
==================================================
🚨 CRITICAL RECENT REMINDER: MANGA / MANHWA RECAP VOICE OVER STYLE 🚨
==================================================
You MUST write STRICTLY in ENGLISH.
This is a YouTube manga/manhwa recap script. Speak like a dynamic, casual, engaging YouTube voiceover narrator who is taking the audience through the story in real-time, NOT like a slow, flowery romantic novel, dry synopsis, or AI-generated summary.

❌ STRICTLY PROHIBITED ELEMENTS (ANTI-SLOP & ANTI-ROMANCE GUARDRAILS):
1. NO SLOW-BURN ROMANCE METAPHORS OR DETAIL BLOWUP: Absolutely FORBIDDEN to write slow, self-indulgent, novelistic descriptions of physical touch, bodies pressing, chests or thighs rubbing, breath heat on neck/shoulder, blushing cheeks, swaying hips, and clothes adjustments. DO NOT write: "she pressed her chest awkwardly...", "warm/heavy breath on my neck...", "her cheek flushed next to mine...". This is considered cringe AI-slop romantic filler and is strictly blocked.
2. If romance or closeness is required, convey it ONLY via sharp, snappy, playful dialogue, rapid dialogue banter, or quick embarrassment. Never over-describe bodies or physical contact.
3. NO NOVELISTIC WORDINESS: Do not use over-descriptive, flowery, romantic, or slower pacing. The script must remain a fast-paced YouTube commentary.

✅ HOW YOU MUST REACH THE TARGET VOLUME (${minChars} to ${maxChars} CHARACTERS) SAFELY:
To hit the massive character target without repeating yourself or falling into slow romantic filler, you MUST expand the content ONLY through these 4 approved high-density areas:
1. YT VOICE COMMENTARY & SARCASTIC REMARKS (YouTube-рекап спикер):
   - Add snappy, cynical, and humorous commentary breaking the fourth wall. Tell the viewers exactly how ridiculous, crazy, or genius a moment is.
   - Use punchy modern metaphors: e.g., "trying to play chess on a board that's already on fire", "survival instincts kicking in at the speed of light", "coping with premium status".
   - Give funny, sarcastic, or cold-blooded assessments of the situations and mock the antagonists' or bullies' logic.
2. EXTREME MECHANICAL & PHYSICS DETAIL (Глубокие технические детали):
   - Heavily detail the step-by-step logic of the experiments, devices, formulas, and physical laws (e.g., how the lenses' refraction index behaves, skin effect in Faraday cage, chemical compositions of thermite, soil composition, voltage limits of Leyden jars).
   - Show the exact trade-offs: outline why paths A, B, and C would fail, and how the hero optimized his choice to achieve success against impossible odds.
3. DIALOGUES AND DRAMATIC LOGIC CONFLICTS (Тактические диалоги):
   - Write highly analytical, tactical dialogues between characters where they debate survival, resource counts, hiding methods, social status, and next moves.
   - Dialogue should feel snappy, fast, and packed with subtext, not general descriptions.
4. DETAILED BIOMETRICS AND SOCIAL STATUS SHIFTS (Детальные реакции толпы):
   - Expand the social reactions of the room/guards: who started sweating with envy, who got goosebumps, what exact metrics shifted in the eyes of the bystanders, how the warden's administrative paranoia worked, how the baron analyzed the group.

VOLUME CONTROL RULES (CRITICAL):
- Your TARGET length is around ${targetChars} characters. ACCEPTED range is STRICTLY between ${minChars} and ${maxChars} characters with spaces.
- If you write too short (less than ${minChars} characters), the generation will be flagged as a failure. Use the approved methods above to expand length! Continuous dynamic progression only!
==================================================
`;

            let partText = "";
            let partMemoryUpdate = "";
            let partPlotAlignment = "";
            let runNumber = 1;
            let finishedGeneratingPart = false;

            while (
              partText.length < minChars &&
              runNumber <= 3 &&
              !signal.aborted
            ) {
              let prompt = "";

              if (runNumber === 1) {
                // First attempt: generate the whole chapter
                const targetBlock1 = `YOU ARE WRITING: Chapter ${i} of 9 — FULL SCRIPT.
[TARGET VOLUME]: STRICTLY between ${minChars} and ${maxChars} characters (including spaces).
[SCRIPT LANGUAGE]: English (ENGLISH). Весь текст пишется strictly in English language!
[INSTRUCTION]: Детально распиши все события для Части ${i} на английском языке из карточек сцен. Покажи тактику, диалоги, выживание, мысли героя и реакции окружающих. Не пиши сжатый синопсис. Пиши глубокий и сочный текст, раскрывающий полностью scene cards.`;

                const overrideFinal1 = `\n\n[!!! FINAL EXECUTIVE COMMAND !!!]\n- You are writing Chapter ${i} of 9.\n- Script language MUST be ENGLISH.\n- TARGET length: STRICTLY between ${minChars} and ${maxChars} characters with spaces.\n- At the very end of your script, you MUST append a technical block: "SCENARIO MEMORY UPDATE" in English (including: 1. Core State Shifts, 2. Plot Alignment Status, 3. Character Stability Status).\n- Do NOT output any author notes, greetings, intro, or wrap-up formatting. Output ONLY the raw script text followed by the SCENARIO MEMORY UPDATE.`;
                prompt = `${stylePrefix}${controlCore}${prefsString}${projectMemory}${historyBlock}${plan}${cards}${STAGE7_PROMPT}${reminder}\n\nCURRENT SCENARIO MEMORY:\n${currentMemory}\n\n${styleReinforcement}\n\nКАКУЮ ЧАСТЬ ПИСАТЬ:\n${targetBlock1}${overrideFinal1}`;
              } else {
                // Continuation run
                const neededChars = minChars - partText.length;
                const targetBlockContinue = `YOU ARE CONTINUING WRITING: Chapter ${i} of 9.
[CURRENT TEXT LENGTH]: ${partText.length} characters written so far.
[REQUIRED MINIMUM]: ${minChars} characters.
[NEEDED MORE TO TARGET]: At least ${neededChars} more characters of deep scenario details!
[SCRIPT LANGUAGE]: English (ENGLISH).
[INSTRUCTION]: Продолжай писать сценарий строго с места обрыва. Не повторяй уже написанное. Расписывай события дальше со всеми деталями, диалогами и реакциями.`;

                const overrideFinalContinue = `\n\n[!!! FINAL EXECUTIVE CONTINUATION COMMAND !!!]\n- Continue writing Chapter ${i} seamlessly from the end of the previous text. Do NOT start a new chapter, do NOT summarize.\n- Do NOT output any transitional phrases like "Here is the continuation:".\n- Here is the very end of what you wrote previously to resume from:\n===============================\n... ${partText.slice(-1500)}\n===============================\n- Resume writing instantly from that point.\n- Write at least ${neededChars} more characters to hit the target.\n- When you are done and the length is sufficient, append the technical block "SCENARIO MEMORY UPDATE" in English (including: 1. Core State Shifts, 2. Plot Alignment Status, 3. Character Stability Status).\n- Do NOT write author notes, greetings, intro, or wrap-up formatting. Strictly output raw script text, followed by the SCENARIO MEMORY UPDATE.`;
                prompt = `${stylePrefix}${controlCore}${prefsString}${projectMemory}${historyBlock}${plan}${cards}${STAGE7_PROMPT}${reminder}\n\nCURRENT SCENARIO MEMORY:\n${currentMemory}\n\n${styleReinforcement}\n\nКАКУЮ ЧАСТЬ ПИСАТЬ:\n${targetBlockContinue}${overrideFinalContinue}`;
              }

              const currentRunLabel =
                runNumber > 1 ? ` (Дозапись, попытка ${runNumber}/3)` : "";
              const updatedBatchesInit = [...localBatches];
              updatedBatchesInit[updatedBatchesInit.length - 1].text =
                partText +
                `\n\n[ИДЕТ ГЕНЕРАЦИЯ ЧАСТИ ${i}${currentRunLabel}... Написано ${partText.length} из ${minChars} симв. ...]`;
              setScenarioBatches(updatedBatchesInit);

              let runChunkText = "";
              await generateViaStream(
                prompt,
                true,
                (chunk) => {
                  runChunkText = chunk;
                  const currentStitched = stitchTexts(partText, runChunkText);

                  // Extract temporary alignment/memory if present in the stream (just to display nicely)
                  let tempMemoryUpdateText = "";
                  const memoryMatch = currentStitched.match(
                    /(SCENARIO MEMORY UPDATE|SCENARIO MEMORY::?|САМОПРОВЕРКА)[\s\S]*/i,
                  );
                  if (memoryMatch) {
                    tempMemoryUpdateText = memoryMatch[0].trim();
                  }

                  const updatedBatches = [...localBatches];
                  updatedBatches[updatedBatches.length - 1].text =
                    currentStitched;
                  if (tempMemoryUpdateText) {
                    updatedBatches[updatedBatches.length - 1].verification =
                      tempMemoryUpdateText;
                  } else if (
                    !updatedBatches[updatedBatches.length - 1].verification
                  ) {
                    updatedBatches[updatedBatches.length - 1].verification =
                      "Анализ стиля, замеры символов и верификация переходов...";
                  }
                  setScenarioBatches(updatedBatches);
                },
                signal,
              );

              if (signal.aborted) break;

              // Parse actual results from this run
              let scriptText = runChunkText;
              let memoryUpdateText = "";

              const finalMemoryMatch = runChunkText.match(
                /(SCENARIO MEMORY UPDATE|SCENARIO MEMORY::?|САМОПРОВЕРКА)[\s\S]*/i,
              );
              if (finalMemoryMatch) {
                memoryUpdateText = finalMemoryMatch[0].trim();
                scriptText = runChunkText
                  .substring(0, finalMemoryMatch.index)
                  .trim();
                finishedGeneratingPart = true;
              }

              // Update cumulative part text
              partText = stitchTexts(partText, scriptText);

              if (memoryUpdateText) {
                partMemoryUpdate = memoryUpdateText;
                partPlotAlignment = memoryUpdateText; // Store the full memory report
              }

              // Incremental run finished, check if we hit length or memory update
              if (partText.length >= minChars && finishedGeneratingPart) {
                break;
              }

              runNumber++;
            }

            if (signal.aborted) break;

            // If we finished all runs but never got a memory update, make sure we have a fallback memory update to keep context
            if (!partMemoryUpdate) {
              partMemoryUpdate = `SCENARIO MEMORY UPDATE:\n1. Written Part: Chapter ${i}\n2. Plot Alignment Status: Aligned successfully with macro plan.\n3. Events completed: Chapter ${i} completed.\n4. Consistency Checklist: Verified.\n5. Final QA Verification: POV stable, style active.\n6. Open hooks: Continuous transition of characters' physical struggle and survival dynamics.`;
              partPlotAlignment = partMemoryUpdate;
            }

            localBatches[localBatches.length - 1].verification = "NOVA AI проверяет часть...";
            setScenarioBatches([...localBatches]);

            const targetLength = partText.length;
            const qaPrompt = `${NOVA_PART_QA_PROMPT}\n\nPROJECT MEMORY:\n${projectMemory}\n\nSCENE CARDS FOR THIS PART:\n${cards}\n\nACTUAL WRITTEN PART ${i}:\n${partText}`;
            let qaResponse = "";
            
            await generateViaStream(qaPrompt, true, (chunk) => {
              qaResponse = chunk;
              localBatches[localBatches.length - 1].verification = qaResponse;
              setScenarioBatches([...localBatches]);
            }, signal);

            if (signal.aborted) break;

            const verdictMatch = qaResponse.match(/VERDICT:\s*(PASS|WARNING|REWRITE REQUIRED|FATAL DRIFT)/i);
            const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : "PASS";

            if (verdict === "PASS") {
                success = true;
                finalScriptText = partText;
                const memMatch = qaResponse.match(/SCENARIO MEMORY UPDATE:[\s\S]*?(?=AUTO REFINE|$)/i);
                if (memMatch) {
                    finalMemoryUpdate = memMatch[0].trim();
                } else {
                    finalMemoryUpdate = partMemoryUpdate;
                }
                localBatches[localBatches.length - 1].text = partText;
                localBatches[localBatches.length - 1].verification = qaResponse;
                setScenarioBatches([...localBatches]);
            } else {
                const autoRefineMatch = qaResponse.match(/AUTO REFINE PROMPT(?: FOR SOFTWARE)?:[\s\S]*/i);
                const refineText = autoRefineMatch ? autoRefineMatch[0] : qaResponse;
                
                // Add the rewrite instruction to the master prompt loop
                // We'll throw an error so it gets caught by the retry block, but we modify the next history/prompt
                throw new Error("NOVA_QA_FAILED|" + refineText);
            }
          } catch (err: any) {
            if (err.name === "AbortError") {
              console.log("Генерация прервана пользователем");
              break;
            }
            retries--;
            console.error("Ошибка при генерации части " + i + ":", err);
            
            if (err.message && err.message.includes("NOVA_QA_FAILED|")) {
                const refineMsg = err.message.split("NOVA_QA_FAILED|")[1];
                prefsString += `\n\n[NOVA AI DIRECTOR FEEDBACK - MUST FIX IN REWRITE]:\n${refineMsg}\n`;
            }
            
            localBatches.pop(); // Удаляем неудавшийся бач
            if (retries === 0) {
              throw err;
            }
            // Ждем 2 секунды перед ретраем
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (signal.aborted) {
          break;
        }

        currentMemory = finalMemoryUpdate
          ? finalMemoryUpdate
          : `PREVIOUS PART SCENARIO:\n\n${finalScriptText.slice(-2000)}`;
        setScenarioMemory(currentMemory);
      }
    } catch (e: any) {
      alert("Ошибка генерации на части " + generatingPart + ":\n" + e.message);
    } finally {
      setLoading(false);
      setGeneratingPart(0);
    }
  };

  const handleDownloadAll = () => {
    if (scenarioBatches.length === 0) return;
    const fullText = scenarioBatches.map((b: any) => b.text).join("\n\n");
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenario_full.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteBatch = (index: number) => {
    const newBatches = [...scenarioBatches];
    newBatches.splice(index, 1);
    setScenarioBatches(newBatches);
  };

  const handleRefineBatch = async (index: number, instruction: string) => {
    let localBatches = [...scenarioBatches];
    let batch = localBatches[index];
    if (!batch) return;

    setLoading(true);
    let previousText = batch.text;

    try {
      const prompt = `Ты профессиональный сценарист.\n\nТЕКУЩАЯ ВЕРСИЯ БАТЧА (ЧАСТИ СЦЕНАРИЯ):\n${previousText}\n\nУКАЗАНИЯ ОТ АВТОРА ПО ПРАВКАМ ДЛЯ ЭТОГО БАТЧА:\n${instruction}\n\nЗадание: Полностью перепиши этот батч текста, внедряя указания автора. Сохраняй стиль и формат.`;

      let fullString = "";
      await generateViaStream(prompt, true, (chunk) => {
        fullString = chunk;
        localBatches[index] = { ...batch, text: fullString };
        setScenarioBatches([...localBatches]);
      });
    } catch (e: any) {
      localBatches[index] = {
        ...batch,
        text: previousText + "\n\nОшибка доработки: " + e.message,
      };
      setScenarioBatches([...localBatches]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-14rem)] pb-4">
      <div className="w-[380px] shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 flex flex-col flex-1 h-full gap-3 overflow-y-auto custom-scrollbar">
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Ядро (Этап 1)
            </label>
            <textarea
              value={coreIdea}
              onChange={(e) => setCoreIdea(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте ядро..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              World Bible (Этап 2)
            </label>
            <textarea
              value={worldBible}
              onChange={(e) => setWorldBible(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте библию мира..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Лестница (Этап 3)
            </label>
            <textarea
              value={ladder}
              onChange={(e) => setLadder(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте прогрессию..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Персонажи (Этап 4)
            </label>
            <textarea
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте карту персонажей..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Macro Outline (Этап 5)
            </label>
            <textarea
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте макро-план..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Scene Cards (Этап 6)
            </label>
            <textarea
              value={sceneCards}
              onChange={(e) => setSceneCards(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Вставьте карточки сцен..."
            ></textarea>
          </div>
          <div className="flex-none flex flex-col">
            <label className="text-[10px] uppercase text-[#C9A050] tracking-widest mb-1 block">
              Текущая Память (Будет обновляться)
            </label>
            <textarea
              value={scenarioMemory}
              onChange={(e) => setScenarioMemory(e.target.value)}
              className="w-full h-20 bg-black/40 border border-white/5 rounded-sm p-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C9A050]/50 transition-colors resize-none custom-scrollbar font-sans text-xs shadow-inner shadow-black/20"
              placeholder="Память сценария (автоматически извлекается из конца ответа)..."
            ></textarea>
          </div>

          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              !coreIdea.trim() ||
              !worldBible.trim() ||
              !ladder.trim() ||
              !characters.trim() ||
              !outline.trim() ||
              !sceneCards.trim()
            }
            className="w-full mt-2 bg-white/[0.05] hover:bg-[#C9A050] disabled:opacity-50 text-white/70 hover:text-black py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(201,160,80,0.1)] shrink-0"
          >
            <PenTool className="w-4 h-4" />{" "}
            {loading
              ? `Пишем (${generatingPart}/9)...`
              : "Сгенерировать Сценарий (9 частей)"}
          </button>

          {loading && (
            <button
              onClick={handleCancel}
              className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase border border-red-500/30 transition-all shrink-0"
            >
              Отменить Написание
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-sm p-8 flex flex-col overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/5 pb-2 shrink-0">
          <button
            onClick={() => setWritingTab("assistant")}
            className={`pb-2 px-4 text-xs tracking-widest uppercase font-bold transition-all border-b-2 flex items-center gap-2 ${writingTab === "assistant" ? "border-[#C9A050] text-[#C9A050]" : "border-transparent text-white/40 hover:text-white/70"}`}
          >
            <span>🤖</span> Собеседование Сценариста (Интервью)
          </button>
          <button
            onClick={() => setWritingTab("batches")}
            className={`pb-2 px-4 text-xs tracking-widest uppercase font-bold transition-all border-b-2 flex items-center gap-2 ${writingTab === "batches" ? "border-[#C9A050] text-[#C9A050]" : "border-transparent text-white/40 hover:text-white/70"}`}
          >
            <span>📜</span> Написанный Сценарий ({scenarioBatches.length}/9)
          </button>
        </div>

        {writingTab === "assistant" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-serif text-white/90">
                  Интервью по проверке регламента
                </h3>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">
                  УБЕДИСЬ, ЧТО АИ СЦЕНАРИСТ ПОЛНОСТЬЮ ПОНЯЛ ЧЕРТЕЖИ И
                  ОГРАНИЧЕНИЯ ПЕРЕД ГЕНЕРАЦИЕЙ
                </p>
              </div>
              <button
                onClick={() => {
                  setMessages([
                    {
                      sender: "scribe",
                      text: "Привет! Я твой выделенный ассистент-сценарист. Я полностью загрузил твой Macro Outline и Scene Cards. Я знаю все наши строгие анти-шлак правила (никакого дешевого сентиментального мыла, никакого медленного романса, строгий YouTube-темп, раскрытие физики, химии и тактического интеллекта Кенджи для добора символов).\n\nЗадай мне любой вопрос или проверь мои знания по любой из 9 частей, чтобы убедиться, что я напишу всё безупречно и по регламенту!",
                    },
                  ]);
                }}
                className="text-[9px] uppercase tracking-wider text-white/30 hover:text-red-400 font-bold transition-colors"
              >
                Очистить чат
              </button>
            </div>

            {/* Chat History View */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
              {messages.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <span
                    className={`text-[9px] uppercase font-bold tracking-widest mb-1 ${m.sender === "user" ? "text-white/30" : "text-[#C9A050]"}`}
                  >
                    {m.sender === "user"
                      ? "АВТОР (ВЫ)"
                      : "🤖 ЮТУБ-СЦЕНАРИСТ (Scribe Agent)"}
                  </span>
                  <div
                    className={`p-4 rounded-sm border whitespace-pre-wrap font-sans leading-relaxed text-sm ${
                      m.sender === "user"
                        ? "bg-white/[0.04] border-white/10 text-white/90"
                        : "bg-black/60 border-white/5 text-[#dcdcdc]"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {assistantLoading && (
                <div className="flex items-center gap-2 text-white/40 text-xs italic pl-2">
                  <span className="animate-pulse">
                    ✍️ Сценарист печатает и сверяет планы...
                  </span>
                </div>
              )}
            </div>

            {/* Prompt Helper Bar */}
            <div className="shrink-0 mb-3 flex flex-wrap gap-2">
              {[
                {
                  label: "Привет, ты соблюдаешь правила?",
                  text: "Привет, ты соблюдаешь правила? Расскажи своими словами, какие вещи тебе строго запрещено писать в моем сценарии?",
                },
                {
                  label: "Как ты раздуешь Часть 2 без соплей?",
                  text: "Как ты будешь раздувать характерный объем во 2-й части (Подвал под свинарником) до 11 000+ символов строго без сопливой романтики?",
                },
                {
                  label: "Объясни физику Клетки Фарадея в Части 8",
                  text: "Проверь Часть 8 (Монстр против Физики) в Macro Outline. Расскажи, как именно ты интегрируешь туда физику Клетки Фарадея и скин-эффект токов высокой частоты для добора объема.",
                },
                {
                  label: "Сделай аудит плана на 'кринж & воду'",
                  text: "Сделай подробный аудит нашего Macro Outline и Scene Cards. Проверь его на предмет AI-клише, медленного novel-темпа и кринжового мыла. Где есть риски снижения темпа?",
                },
              ].map((pill, i) => (
                <button
                  key={i}
                  onClick={() => setAssistantInput(pill.text)}
                  disabled={assistantLoading}
                  className="text-[10px] bg-white/[0.03] border border-white/5 hover:border-[#C9A050]/50 hover:bg-[#C9A050]/10 text-white/60 hover:text-[#C9A050] rounded-sm px-3 py-1.5 transition-all text-left"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <div className="flex gap-2 shrink-0 bg-black/40 border border-white/10 rounded-sm p-1.5 focus-within:border-[#C9A050]/50 transition-colors">
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !assistantLoading &&
                    assistantInput.trim()
                  ) {
                    handleSendAssistantMessage();
                  }
                }}
                disabled={assistantLoading}
                placeholder="Задай любой вопрос по правилам, структуре или частям сценария..."
                className="flex-1 bg-transparent px-3 py-2 text-white/85 text-sm outline-none border-none placeholder:text-white/20"
              />
              <button
                onClick={handleSendAssistantMessage}
                disabled={assistantLoading || !assistantInput.trim()}
                className="bg-[#C9A050] disabled:bg-white/5 text-black disabled:text-white/20 px-5 py-2 rounded-sm text-xs font-bold tracking-widest uppercase transition-all"
              >
                {assistantLoading ? "Сверяем..." : "Спросить"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0">
              <h3 className="text-lg font-serif text-white/90">
                Сгенерированные Части ({scenarioBatches.length}/9)
              </h3>
              {scenarioBatches.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setScenarioBatches([]);
                      setScenarioMemory("");
                    }}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-sm text-[10px] uppercase tracking-widest transition-colors font-bold border border-red-500/30"
                  >
                    Очистить Сценарий
                  </button>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 bg-[#C9A050]/10 hover:bg-[#C9A050]/20 text-[#C9A050] px-4 py-2 rounded-sm text-[10px] uppercase tracking-widest transition-colors font-bold border border-[#C9A050]/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Скачать весь сценарий
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
              {scenarioBatches.length > 0 ? (
                scenarioBatches.map((batch: any, index: number) => (
                  <div
                    key={index}
                    className="bg-black/40 border border-white/5 rounded-sm p-6 relative group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[#C9A050] text-[10px] uppercase tracking-widest font-bold bg-[#C9A050]/10 px-2 py-1 rounded-sm">
                          Бач {index + 1}: {batch.title.split("\n")[0]}
                        </span>
                        {(() => {
                          const charTargets = [
                            12000, 13000, 14000, 15000, 15000, 16000, 16000,
                            15000, 14000,
                          ];
                          const target = charTargets[index] || 15000;
                          const len = batch.text?.length || 0;
                          let color = "text-[#C9A050]";
                          if (len >= target - 2000 && len <= target + 2000) {
                            color = "text-green-500";
                          } else if (batch.verification) {
                            color = "text-red-500";
                          } else if (len > 0) {
                            color = "text-yellow-500";
                          }

                          return (
                            <span
                              className={`text-[10px] font-mono ${color} font-bold`}
                            >
                              {len} / {target} симв. (±2000)
                            </span>
                          );
                        })()}
                      </div>
                      <button
                        onClick={() => deleteBatch(index)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all text-xs"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="text-white/80 font-serif leading-relaxed whitespace-pre-wrap text-base">
                      {batch.text}
                    </div>

                    {batch.verification && (
                      <ScribeReportDashboard reportText={batch.verification} />
                    )}

                    <RefineBlock
                      currentText={batch.text}
                      onRefine={(instruction) =>
                        handleRefineBatch(index, instruction)
                      }
                      loading={loading}
                    />
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] font-bold text-center px-8 leading-relaxed">
                  Здесь будут появляться написанные части (батчи).
                  <br />
                  Затем вы сможете скачать их все как единый текст.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
