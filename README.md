# gun

Процедурные 3D-вьюверы стрелкового оружия на three.js. Каждый файл в `weapons/`
самодостаточен: геометрия, материалы, система кастомизации `__ATTACH` и звук
собраны внутрь одного HTML. Внешняя зависимость только одна — three.js 0.166
через `importmap` с unpkg, поэтому для запуска нужна сеть.

## Модели

| Файл | Оружие |
| --- | --- |
| `weapons/ak74_modular.html` | АК-74 |
| `weapons/akm.html` | АКМ |
| `weapons/m416.html` | M416 |
| `weapons/scar-h.html` | FN SCAR-H Mk 17 |

## Локальный запуск

Открывать файлы через `file://` нельзя — ES-модули и importmap требуют
http-происхождения. Поднимите статический сервер из корня репозитория:

```sh
python3 -m http.server 8080
```

Затем откройте `http://localhost:8080/weapons/akm.html`.

## Запуск в headless-браузере

Сцены используют WebGL, которого в headless-Chrome по умолчанию нет. Нужен
программный рендер через SwiftShader:

```sh
chrome --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
```

Без этих флагов страница показывает «Не удалось собрать модель: Error creating
WebGL context.» — это ограничение окружения, а не ошибка модели.
