# 🎤 Диагностика: Почему голосовой помощник не слушает

## Быстрая диагностика

### 1️⃣ Проверьте что VoiceAssistant **появился на экране**

- Откройте https://localhost:5174
- Посмотрите внизу справа - должна быть фиолетовая кнопка с микрофоном 🎤
- Если не видите - проверьте браузер console (F12) на ошибки

### 2️⃣ Дайте браузеру доступ к микрофону

Когда кликните на микрофон:

- **Safari/Chrome/Edge**: При первом использовании появится запрос "Allow microphone access"
  - Нажмите ✅ **Allow** / **Разрешить**
- **Firefox**: Нужно добавить разрешение в about:config

### 3️⃣ Тестируйте команды по очереди

#### Шаг 1: Просто говорите

```
"align left"
```

Ожидайте:

- Микрофон светится красным/розовым
- Transcript появляется в компоненте
- История обновляется

#### Шаг 2: Убедитесь что shapes выбраны

```
Нужно сначала:
- Нарисовать 2+ фигуры на canvas
- Выбрать их
- Потом говорить "align left"
```

#### Шаг 3: Простые команды (не требуют selection)

```
"zoom fit"      ← Подогнать размер
"undo"          ← Отменить
"screenshot"    ← Скопировать screenshot
"overview"      ← Информация о canvas
```

## Частые проблемы

### ❌ Проблема: "Speech Recognition not supported"

**Решение**: Используйте современный браузер:

- ✅ Chrome / Edge (рекомендуется)
- ⚠️ Safari (работает, но может быть медленнее)
- ❌ Firefox (нужна конфигурация)

### ❌ Проблема: Микрофон не реагирует

**Решение**:

1. Проверьте разрешение в браузере
   - Chrome: Settings → Privacy → Microphone → Allow localhost:5174
   - Safari: System Settings → Privacy & Security → Microphone → Allow
2. Проверьте что микрофон рабочий (тестируйте в другом приложении)
3. Перезагрузите страницу (Cmd+R)

### ❌ Проблема: "Что-то говорю, но ничего не происходит"

**Решение**:

1. Проверьте что shapes выбраны (для команд типа "align")
2. Говорите медленнее и четче
3. Откройте DevTools (F12 → Console) и посмотрите логи

### ❌ Проблема: Компонент не отображается вообще

**Решение**:

1. Проверьте console на ошибки (F12)
2. Убедитесь что Editor.tsx был обновлен с VoiceAssistant
3. Очистите кеш браузера (Cmd+Shift+Delete)
4. Перезагрузите npm run dev

## 🔍 Отладка через console

Откройте DevTools (F12 → Console) и проверьте:

```javascript
// Проверьте Speech API доступна
console.log(window.SpeechRecognition || window.webkitSpeechRecognition);
// Должно вывести: ƒ SpeechRecognition() { [native code] }

// Проверьте microphone permissions
navigator.permissions
  .query({ name: "microphone" })
  .then((p) => console.log("Permission:", p.state));
// state должен быть: 'granted' или 'prompt'

// Проверьте mediaDevices
console.log(navigator.mediaDevices);
// Должно показать объект с методами
```

## 📱 Если используете мобильный телефон

❌ **Хорошая новость**: есть проблемы на мобильной

- **Safari iOS**: Speech API работает
- **Chrome Mobile**: Speech API работает
- Микрофон должен быть разрешен в приложении

## ✅ Полный чек-лист

- [ ] VoiceAssistant видна на экране (фиолетовая кнопка внизу справа)
- [ ] Браузер: Chrome/Edge/Safari последней версии
- [ ] Микрофон: разрешен в настройках браузера
- [ ] Микрофон: рабочий и подключен (проверьте в другом приложении)
- [ ] Создана хотя бы одна shape на canvas
- [ ] Выбраны 2+ shapes перед тем как говорить "align"
- [ ] F12 console не показывает ошибок
- [ ] Перезагружена страница (Cmd+R)

## 🚀 Если все работает

Поздравляем! 🎉

Вот что вы можете делать:

```
Выравнивание:
- "align left"
- "align right"
- "align center"
- "align top"
- "align bottom"

Распределение:
- "distribute horizontal"
- "distribute vertical"

Операции:
- "group"
- "ungroup"
- "delete"
- "undo"
- "redo"

Зум:
- "zoom in"
- "zoom out"
- "zoom fit"

Просмотр:
- "overview"
- "selection"
- "screenshot"
```

## 📞 Если ничего не помогает

1. Откройте F12 (DevTools)
2. копируйте все ошибки из Console
3. Проверьте что:
   - Editor.tsx содержит `<VoiceAssistant editor={editor} ... />`
   - Canvas.tsx имеет `onEditorReady={setEditor}`
   - Нет TypeScript ошибок при сборке

---

**Основная проблема обычно**: Браузер требует разрешения на использование микрофона!
