# Компонент: Кастомный Чекбокс (Custom Checkbox)

## Описание

Красивый переиспользуемый компонент чекбокса в стиле glassmorphism для проекта BarGen.

## Особенности

- ✅ Кастомный дизайн с анимированной галочкой
- ✅ Эффект glassmorphism
- ✅ Плавные анимации и переходы
- ✅ Hover эффекты
- ✅ Active state с подсветкой
- ✅ Анимация пульсации при выборе
- ✅ Полностью доступный (accessibility-friendly)

## Структура HTML

```html
<label class="custom-checkbox-label">
    <input type="checkbox" id="uniqueId">
    <span class="custom-checkbox-checkmark"></span>
    <span class="custom-checkbox-text">Текст чекбокса</span>
</label>
```

## Примеры использования

### Пример 1: Одиночный чекбокс

```html
<label class="custom-checkbox-label">
    <input type="checkbox" id="myCheckbox">
    <span class="custom-checkbox-checkmark"></span>
    <span class="custom-checkbox-text">Включить опцию</span>
</label>
```

### Пример 2: Группа чекбоксов

```html
<div class="double-scan-settings">
    <label style="font-weight:700;margin-bottom:10px;display:block">Заголовок группы:</label>
    <div class="double-scan-options">
        <label class="custom-checkbox-label">
            <input type="checkbox" id="option1">
            <span class="custom-checkbox-checkmark"></span>
            <span class="custom-checkbox-text">Опция 1</span>
        </label>
        <label class="custom-checkbox-label">
            <input type="checkbox" id="option2">
            <span class="custom-checkbox-checkmark"></span>
            <span class="custom-checkbox-text">Опция 2</span>
        </label>
        <label class="custom-checkbox-label">
            <input type="checkbox" id="option3">
            <span class="custom-checkbox-checkmark"></span>
            <span class="custom-checkbox-text">Опция 3</span>
        </label>
    </div>
</div>
```

### Пример 3: С обработчиком JavaScript

```html
<label class="custom-checkbox-label">
    <input type="checkbox" id="toggleFeature">
    <span class="custom-checkbox-checkmark"></span>
    <span class="custom-checkbox-text">Включить функцию</span>
</label>

<script>
document.getElementById('toggleFeature').onchange = function() {
    if (this.checked) {
        console.log('Чекбокс выбран');
    } else {
        console.log('Чекбокс снят');
    }
};
</script>
```

## CSS Классы

### `.custom-checkbox-label`
Основной контейнер чекбокса. Содержит стили для:
- Glassmorphism фона
- Padding и spacing
- Hover эффекты
- Active state (когда чекбокс выбран)

### `.custom-checkbox-checkmark`
Визуальный элемент чекбокса (квадрат с галочкой). Стили:
- Размер 24x24px
- Скругленные углы
- Анимация галочки
- Цветовые переходы

### `.custom-checkbox-text`
Текст рядом с чекбоксом. Стили:
- Цвет и размер шрифта
- Переход цвета при активации

## Контейнеры для группировки

### `.double-scan-settings`
Обертка для группы чекбоксов с фоном и границей.

### `.double-scan-options`
Flex-контейнер для вертикального размещения чекбоксов с отступами.

## Кастомизация

### Изменение цвета

Чекбокс использует CSS переменные из проекта:
```css
--primary: #10b981;  /* Основной цвет (зеленый) */
--glass-border: rgba(255, 255, 255, 0.15);  /* Цвет границы */
--text-muted: rgba(255, 255, 255, 0.85);  /* Цвет текста */
--text-light: #fff;  /* Цвет текста при активации */
```

### Изменение размера

Для изменения размера отредактируйте:
```css
.custom-checkbox-checkmark {
    height: 28px;  /* Увеличить размер */
    width: 28px;
}
```

### Изменение анимации

Скорость анимации контролируется через:
```css
.custom-checkbox-label {
    transition: all 0.3s ease;  /* Изменить на 0.5s для медленной анимации */
}
```

## Совместимость

- ✅ Все современные браузеры
- ✅ Safari (desktop & mobile)
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Поддержка touch устройств

## Доступность (Accessibility)

Компонент полностью доступен:
- ✅ Нативный `input[type="checkbox"]` для screen readers
- ✅ Правильная семантика с `<label>`
- ✅ Keyboard navigation (Tab, Space)
- ✅ ARIA-совместимость

## Файлы

- **CSS**: `/css/main.css` (строки 488-607)
- **HTML пример**: `/index.html` (строки 31-52)

## Версия

Компонент добавлен в версии проекта 2.5.0

---

**Автор**: BarGen Project  
**Дата**: 2026-01-21
