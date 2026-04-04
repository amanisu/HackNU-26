# 🚀 Быстрый старт: Voice Assistant для Canvas

## Что было создано?

Полная система голосового управления canvas с 7 модулями:

```
📁 src/tools/
├── voice-command-parser.ts       📝 Парсер голосовых команд (быстрые команды)
├── canvas-ai-commander.ts        🤖 AI интеграция (сложные команды через Gemini)
├── use-voice-canvas.tsx          🪝 React hook для управления состоянием
├── VoiceAssistant.tsx            🎨 UI компонент
├── VoiceAssistant.module.scss    🎨 Стили компонента
├── VoiceCanvasExample.tsx        📚 5 примеров интеграции
├── VoiceCanvasExample.module.scss 🎨 Стили примеров
├── VOICE_ASSISTANT_README.md     📖 Полная документация
├── index.ts                      📤 Export всех публичных API
└── ... (остальные инструменты)
```

## Самый быстрый способ: 30 секунд

### 1. Добавьте компонент в ваше приложение

```tsx
// Ваш главный компонент с canvas
import { VoiceAssistant } from "@/tools";
import type { Editor } from "tldraw";

export function App() {
  const [editor, setEditor] = useState<Editor>();

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Ваш canvas */}
      <Canvas onMount={setEditor} style={{ flex: 1 }} />

      {/* Voice Assistant - готов к использованию! */}
      {editor && <VoiceAssistant editor={editor} useAI={true} />}
    </div>
  );
}
```

### 2. Готово! 🎉

Кликните на микрофон и скажите команду:

- "align left" - выровнять влево
- "group" - сгруппировать выбранное
- "delete" - удалить
- "zoom fit" - подогнать к размеру

## Разные варианты использования

### Вариант A: Просто UI компонент (самый простой)

```tsx
import { VoiceAssistant } from "@/tools";

<VoiceAssistant editor={editor} useAI={true} />;
```

### Вариант B: Hook + собственный UI

```tsx
import { useVoiceCanvas } from "@/tools";

function MyCustomUI() {
  const { isListening, toggleListening, lastCommand } = useVoiceCanvas({
    editor,
    useAI: true,
  });

  return (
    <button onClick={toggleListening}>
      {isListening ? "🎤 Listening" : "🎤 Click to speak"}
    </button>
  );
}
```

### Вариант C: Программное выполнение команд

```tsx
import { executeVoiceCommand } from "@/tools";
import { ToolRegistry } from "@/tools";

const registry = new ToolRegistry();
registry.setEditor(editor);

const result = await executeVoiceCommand({ editor, registry }, "align left");
console.log(result.success);
```

### Вариант D: AI команды (сложные)

```tsx
import { executeAICommand } from "@/tools";

const result = await executeAICommand(
  {
    editor,
    registry,
    ai: geminiApi,
  },
  "Make these shapes evenly spaced vertically",
);
```

## Доступные команды

| Команда                 | Результат                  |
| ----------------------- | -------------------------- |
| "align left"            | Выровнять по левому краю   |
| "align right"           | Выровнять по правому краю  |
| "align top"             | Выровнять по верхнему краю |
| "align bottom"          | Выровнять по нижнему краю  |
| "align center"          | Выровнять по центру        |
| "distribute horizontal" | Распределить горизонтально |
| "distribute vertical"   | Распределить вертикально   |
| "group"                 | Сгруппировать              |
| "ungroup"               | Разгруппировать            |
| "delete"                | Удалить                    |
| "undo"                  | Отменить                   |
| "redo"                  | Повторить                  |
| "zoom in"               | Приблизить                 |
| "zoom out"              | Отдалить                   |
| "zoom fit"              | Подогнать                  |
| "overview"              | Информация о canvas        |
| "selection"             | Информация о выборе        |
| "screenshot"            | Снимок экрана              |

## Требования

### 1. Browser Speech API (встроена в браузер)

- Chrome/Edge: ✅ Работает
- Safari 14.1+: ✅ Работает
- Firefox: ✅ Experimental

### 2. Gemini API (если useAI={true})

```tsx
// Должно быть в вашем PrefsProvider
const geminiApiKey = prefs.geminiApiKey;
```

Если нет, используйте только быстрые команды:

```tsx
<VoiceAssistant editor={editor} useAI={false} />
```

## Интеграция в существующий код

### Если у вас уже есть Editor

```tsx
// Импортируйте
import { VoiceAssistant } from "@/tools";

// Добавьте в ваш компонент
export function YourCanvas() {
  const [editor, setEditor] = useState<Editor>();

  return (
    <>
      <Canvas onMount={setEditor} />
      {editor && <VoiceAssistant editor={editor} useAI={true} />}
    </>
  );
}
```

### Callback на выполнение команды

```tsx
<VoiceAssistant
  editor={editor}
  useAI={true}
  onCommand={(cmd) => {
    console.log(`Выполнена команда: ${cmd.commandText}`);
    if (cmd.success) {
      showNotification("✓ Успешно!");
    } else {
      showNotification(`✗ Ошибка: ${cmd.error}`);
    }
  }}
/>
```

## Типы данных (TypeScript)

```tsx
// Результат выполнения команды
interface VoiceCommandResult {
  success: boolean;
  error?: string;
  commandText: string;
  parsedCommand?: ParsedCommand;
}

// Распарсенная команда
interface ParsedCommand {
  toolName: string; // Имя инструмента
  params: Record<string, unknown>; // Параметры
  confidence: number; // Точность (0-1)
  explanation: string; // Описание
}

// Состояние голосового ввода
interface VoiceState {
  isListening: boolean; // Микрофон включен?
  isProcessing: boolean; // Обработка команды?
  transcript: string; // Текущая речь
  lastCommand?: VoiceCommandResult;
  error?: string;
  commandHistory: VoiceCommandResult[]; // История (20 последних)
}
```

## Что дальше?

### Давайте включим его полностью!

```tsx
import React, { useState } from "react";
import type { Editor } from "tldraw";
import { Canvas } from "tldraw";
import { VoiceAssistant } from "@/tools";

export function MyCanvasApp() {
  const [editor, setEditor] = useState<Editor>();

  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        padding: "1rem",
        height: "100vh",
      }}
    >
      {/* Canvas слева */}
      <div style={{ flex: 1, borderRadius: "8px", overflow: "hidden" }}>
        <Canvas style={{ width: "100%", height: "100%" }} onMount={setEditor} />
      </div>

      {/* Voice Assistant справа */}
      {editor && (
        <div>
          <VoiceAssistant
            editor={editor}
            useAI={true}
            onCommand={(cmd) => {
              if (cmd.success) {
                console.log(`✓ ${cmd.commandText}`);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
```

## 🐛 Если что-то не работает

### Speech API недоступна

Проверьте браузер (не все поддерживают)

```tsx
<VoiceAssistant editor={editor} useAI={false} /> // Используйте только быстрые команды
```

### AI команды не работают

Проверьте Gemini API ключ:

```tsx
const { prefs } = usePrefsContext();
console.log(prefs.geminiApiKey); // Должен быть заполнен
```

### Команды не распознаются

1. Говорите четче 🎤
2. Проверьте язык (по умолчанию en-US)
3. Убедитесь, что фигуры выбраны (для команд типа "align")

## 📚 Больше примеров

В `VoiceCanvasExample.tsx` 5 готовых примеров:

1. SimpleVoiceCanvasExample — базовое использование
2. AdvancedVoiceCanvasExample — с логированием
3. ProgrammaticVoiceCanvasExample — без UI компонента
4. MiniVoiceWidget — FAB кнопка (как в мобильных приложениях)
5. KeyboardAwareVoiceCanvas — с горячими клавишами

## 🎯 Рекомендуемая архитектура

```
App.tsx
├── Canvas (tldraw)
└── VoiceAssistant
     ├── useVoiceCanvas (hook)
     │   ├── Speech API
     │   ├── voice-command-parser (быстрые команды)
     │   └── canvas-ai-commander (AI если нужно)
     └── ToolRegistry
          └── Конкретные инструменты (align, delete и т.д.)
```

---

**Готово к использованию! 🎉**

Просто импортируйте `VoiceAssistant` и добавьте к вашему canvas.

Остальное произойдет автоматически.
