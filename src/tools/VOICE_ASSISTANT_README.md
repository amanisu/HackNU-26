# 🎤 Voice Canvas Assistant

Голосовой помощник для управления canvas через естественное языковое взаимодействие и голосовые команды.

## 📋 Структура

### Core Modules

1. **`voice-command-parser.ts`** — Парсер голосовых команд
   - Преобразует текст в действия на canvas
   - Поддерживает предустановленные шаблоны команд
   - Быстрое выполнение без AI

2. **`canvas-ai-commander.ts`** — AI командир
   - Использует Gemini API для понимания сложных команд
   - Анализирует контекст canvas
   - Выбирает подходящие tools автоматически

3. **`use-voice-canvas.tsx`** — React Hook
   - Интеграция с Web Speech API
   - Управление состоянием голосового ввода
   - История команд

4. **`VoiceAssistant.tsx`** — UI компонент
   - Визуальный интерфейс
   - Отображение статуса микрофона
   - История команд и справочник

## 🚀 Быстрый старт

### 1. Базовое использование

```tsx
import { VoiceAssistant } from "@/tools/VoiceAssistant";
import type { Editor } from "tldraw";

export function MyCanvas({ editor }: { editor: Editor }) {
  return (
    <div>
      <canvas />
      <VoiceAssistant
        editor={editor}
        useAI={true} // Use Gemini API for complex commands
      />
    </div>
  );
}
```

### 2. Использование React Hook напрямую

```tsx
import { useVoiceCanvas } from "@/tools/use-voice-canvas";

export function MyComponent() {
  const {
    isListening,
    transcript,
    lastCommand,
    toggleListening,
    commandHistory,
  } = useVoiceCanvas({
    editor,
    useAI: true,
  });

  return (
    <div>
      <button onClick={toggleListening}>
        {isListening ? "Stop" : "Start"}
      </button>
      <p>Transcript: {transcript}</p>
      <p>Last Command: {lastCommand?.parsedCommand?.toolName}</p>
    </div>
  );
}
```

### 3. Программное выполнение команд

```tsx
import { executeVoiceCommand } from "@/tools/voice-command-parser";
import { ToolRegistry } from "@/tools/registry";
import type { Editor } from "tldraw";

const registry = new ToolRegistry();
registry.setEditor(editor);

const result = await executeVoiceCommand({ editor, registry }, "align left");

console.log(result.success); // true/false
```

## 🎯 Примеры команд

### Выравнивание

```
"align left"          → Выровнять по левому краю
"align right"         → Выровнять по правому краю
"align top"           → Выровнять по верхнему краю
"align bottom"        → Выровнять по нижнему краю
"align center"        → Выровнять центрально (горизонтально)
```

### Распределение

```
"distribute horizontal"  → Равномерно распределить горизонтально
"distribute vertical"    → Равномерно распределить вертикально
```

### Группировка

```
"group"      → Сгруппировать выбранные фигуры
"ungroup"    → Разгруппировать
```

### Операции

```
"delete"     → Удалить выбранные
"undo"       → Отменить
"redo"       → Повторить
```

### Масштабирование

```
"zoom in"    → Приблизить
"zoom out"   → Отдалить
"zoom fit"   → Подогнать к контенту
```

### Просмотр

```
"overview"   → Получить информацию о canvas
"selection"  → Показать информацию о выборе
"screenshot" → Сделать скриншот
```

### AI Команды (если включен useAI)

```
"Make these shapes evenly spaced vertically"
"Align all selected items to the center"
"Group the red shapes together"
"Delete everything except the selected items"
```

## ⚙️ Конфигурация

### VoiceAssistant Props

```tsx
interface VoiceAssistantProps {
  editor?: Editor; // tldraw editor
  useAI?: boolean; // Enable AI commands (default: true)
  onCommand?: (cmd: any) => void; // Callback on command execution
}
```

### useVoiceCanvas Options

```tsx
interface UseVoiceCanvasOptions {
  editor?: Editor; // tldraw editor
  useAI?: boolean; // Enable AI (default: true)
}
```

## 🔐 Требования к Setup

### 1. Gemini API (для AI режима)

Убедитесь, что в вашем PrefsProvider есть API ключ:

```tsx
// В PrefsProvider
const geminiApiKey = prefs.geminiApiKey;

// Используется в useVoiceCanvas:
const ai = useGeminiApi();
```

### 2. Speech Recognition API

Поддерживается в стандартных браузерах:

- Chrome, Edge (полная поддержка)
- Safari 14.1+ (с префиксом webkit)
- Firefox (experimental)

## 🏗️ Архитектура команд

### Процесс выполнения команды

```
Голос → Speech API → Текст
   ↓
Выбор режима (быстрый или AI)
   ↓
БЫСТРЫЙ РЕЖИМ:
- Regex матчинг
- Быстрое выполнение
- Нет задержки

ИЛИ

AI РЕЖИМ:
- Отправка в Gemini API
- Анализ контекста canvas
- JSON парсинг
- Выполнение инструкции API
   ↓
Tool Registry.executeTool()
   ↓
Результат

```

### Поток данных

```
VoiceAssistant.tsx (UI)
        ↓
useVoiceCanvas.tsx (Hook logic)
        ↓
voice-command-parser.ts (Quick commands)
        ↓ (or)
canvas-ai-commander.ts (AI processing)
        ↓
registry.executeTool()
        ↓
Specific tool execution
        ↓
tldraw Editor → Canvas Update
```

## 🛠️ Как добавить новую команду

### Быстрая команда (без AI)

В `voice-command-parser.ts`, добавьте паттерн:

```tsx
{
  regex: /(?:your|command|pattern)/i,
  build: (match, context) => ({
    toolName: 'your_tool_name',
    params: {
      // параметры для инструмента
    },
    confidence: 0.9,
    explanation: 'Ваше описание'
  })
}
```

### AI команда

Просто скажите естественным языком, система автоматически:

1. Отправит команду в Gemini
2. Получит JSON с tool_name и params
3. Выполнит инструмент

## 📊 Типы данных

### VoiceCommandResult

```tsx
interface VoiceCommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  commandText: string; // Original voice input
  parsedCommand?: ParsedCommand; // Parsed command
}
```

### ParsedCommand

```tsx
interface ParsedCommand {
  toolName: string; // Tool to execute
  params: Record<string, unknown>; // Tool parameters
  confidence: number; // Confidence score 0-1
  explanation: string; // Human-readable explanation
}
```

### VoiceState

```tsx
interface VoiceState {
  isListening: boolean; // Microphone active?
  isProcessing: boolean; // Processing command?
  transcript: string; // Current speech-to-text
  lastCommand?: VoiceCommandResult; // Last executed command
  error?: string; // Last error
  commandHistory: VoiceCommandResult[]; // History of 20 last commands
}
```

## 🐛 Отладка

### Проверка Speech API

```tsx
const recognition = new (
  window.SpeechRecognition || window.webkitSpeechRecognition
)();
console.log(recognition ? "Speech API available" : "Not supported");
```

### Логирование команд

```tsx
const { lastCommand } = useVoiceCanvas({ editor });

useEffect(() => {
  if (lastCommand) {
    console.log("Command executed:", {
      text: lastCommand.commandText,
      tool: lastCommand.parsedCommand?.toolName,
      success: lastCommand.success,
      error: lastCommand.error,
    });
  }
}, [lastCommand]);
```

### AI Debug

В `canvas-ai-commander.ts` есть логирование:

- Canvas overview
- Selection info
- AI response parsing

## 🚫 Ограничения

1. **Speech API** — не поддерживается в приватных вкладках на некоторых браузерах
2. **AI режим** — требует интернета и валидный Gemini API ключ
3. **Точность** — зависит от качества микрофона и произношения
4. **Языки** — по умолчанию en-US, можно изменить в hook

## 🔄 Интеграция с существующим кодом

Если у вас уже есть Editor:

```tsx
// В вашем Canvas компоненте
import { Canvas } from "tldraw";
import { VoiceAssistant } from "@/tools/VoiceAssistant";

export function MyApp() {
  const [editor, setEditor] = useState<Editor>();

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      <Canvas onMount={setEditor} />
      {editor && <VoiceAssistant editor={editor} useAI={true} />}
    </div>
  );
}
```

## 📝 TODO для расширений

- [ ] Поддержка других языков (русский, французский и т.д.)
- [ ] Custom command patterns через конфигурацию
- [ ] Voice feedback (озвучивание результатов)
- [ ] Командные макросы (запись последовательности команд)
- [ ] Интеграция с колаборативными функциями
- [ ] Улучшенная обработка ошибок и подсказки
