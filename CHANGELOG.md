# Changelog — Hush Browser

Все изменения и этапы разработки антидетект-браузера Hush Browser (MultiZen).

---

## [0.4.3] — 2026-11-01 (Headless Daemon & SwiftShader Fix)

### Архитектурные исправления (Решение проблемы 100% CPU):
- **Устранение фонового жора CPU (SwiftShader / Xvfb loop):**
  - **Причина:** Ранее служба `hush-browser.service` запускалась через виртуальный X-сервер `Xvfb :99`. Chromium не имея доступа к аппаратному GPU Radeon переключался на софтверный эмулятор SwiftShader (`--use-angle=swiftshader-webgl`). Из-за отсутствия VSync в Xvfb графический движок крутил цикл отрисовки React-интерфейса на максимальной частоте ядер CPU, потребляя 100% одного ядра.
  - **Решение:** В `apps/desktop/src/main/index.ts` добавлен флаг запуска `--daemon` (`--headless`).
  - При наличии флага Electron:
    - Вызывает `app.disableHardwareAcceleration()`.
    - Добавляет флаги Chromium `--disable-gpu`, `--disable-software-rasterizer`, `--disable-dev-shm-usage`.
    - Пропускает вызов `createWindow()` (графическое окно и React-рендер не создаются).
    - Запускает исключительно легковесный HTTP/SSE MCP-сервер на порту `7777`.
  - Из юнита `hush-browser.service` полностью удален `xvfb-run`. Приложение стартует как прямой демон `hush-browser --no-sandbox --daemon`.
  - Добавлены переменные `DISPLAY=:0` и `XAUTHORITY=/root/.Xauthority` в юнит systemd: при запуске профилей через MCP браузер CloakBrowser/Chromium выводится на реальный физический экран с аппаратным ускорением Radeon HD 6850M.
  - **Результат:** Нагрузка на ЦП в фоновом режиме упала со 100% до **0.0%**. Температура ноутбука стабилизирована на ~50°C.

---

## [0.4.2] — 2026-10-31 (Stealth Dashboard, Extensions Runtime & 24 Profiles)

### Профили и спуфинг:
- **Расширение каталога устройств до 24 пресетов:**
  - Добавлены флагманские пресеты Apple Silicon: `macbook-pro-14-m4` (M4 10-core GPU, Sonoma/Sequoia 15.0), `mac-studio-m2-ultra` (M2 Ultra 76-core GPU).
  - Добавлены современные конфигурации Windows: `windows-laptop-nvidia-4070`, `windows-laptop-snapdragon-x` (Qualcomm Snapdragon X Elite / Adreno X1-85), `windows-desktop-nvidia-4090` (RTX 4090 24GB).
  - Расширены допустимые пулы памяти RAM (до 128 ГБ) и ядер процессора (до 32 потоков).
  - Добавлен пресет локали `uk-UA` (Украина) с часовыми поясами Europe/Kyiv.

### Расширения (Extensions Runtime):
- Реализован менеджер расширений Chrome WebStore с распаковкой `.crx` в изолированное хранилище `extension-store`.
- Реализована инжекция фиксированных публичных ключей RSA-2048 в `manifest.json` для сохранения стабильного WebStore ID расширений при смене профилей.
- Добавлен UI-компонент `ExtensionsSection` с каталогом проверенных расширений (uBlock Origin, Canvas Defender, WebRTC Control, ClearURLs, Cookie-Editor, User-Agent Switcher).

### MCP & Безопасность:
- HTTP/SSE транспорт переведен на `0.0.0.0:7777` для доступности внутри WireGuard-сети (10.7.0.0/24).
- Авторизация MCP защищена Bearer-токеном с проверкой `timingSafeEqual`.
- Добавлена автоматическая передача `--no-sandbox` в `ChromiumBrowserDriver.ts` при запуске от имени `root` в Arch Linux.
- Интегрирована стартовая страница Stealth Control Plane (`185.235.219.144:8095/start`) для аудита IP, DNS, WebRTC в 1 клик.

---

## [0.4.0] — 2026-10-30 (Ребрендинг Hush Browser)

- Полный ребрендинг с MultiZen на **Hush Browser**.
- Обновлены монограммы, иконки, метаданные окон, логотипы и заголовки UI.
- Интеграция 22 MCP-инструментов в Hermes Agent.
