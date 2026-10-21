# Web Hub

Личный self-hosted хаб для тебя и друзей: облачко с временными ссылками, ИИ-чат, который генерирует документы и презентации, защищённое хранилище для паролей и заметки.

## Установка одной командой

```sh
curl -fsSL https://raw.githubusercontent.com/Xhiveee/web-hub/main/install.sh | sudo sh
```

Скрипт спросит домен (пусто = работать по `http://IP-адресу`) и API-ключ ИИ, сам поставит в `/opt/hub/` и запустит всё в Docker.

## Стек

![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009485?style=flat&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-4479A1?style=flat&logo=sqlite&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Caddy](https://img.shields.io/badge/Caddy-0EA08A?style=flat&logo=caddy&logoColor=white)

## Что внутри

- **Облако** — свои файлы, загрузка drag&drop, временные ссылки со сроком жизни и лимитом скачиваний
- **ИИ-чат** — любой OpenAI-совместимый провайдер (OpenRouter и т.д.), генерация `.docx`/`.pptx` питон-скриптами
- **Хранилище** — пароли, ссылки и текст с шифрованием на сервере
- **Заметки, сниппеты** — с поиском по хабу
- **Читалка** — вытащить текст из статьи по URL
- **Галерея и аудио** — просмотр картинок и плеер для mp3 прямо из облака
- **Telegram** — оповещения о новых share-ссылках (optional)
- **Бэкап** — `sh backup.sh` складывает всё в один tar.gz

## Как этим пользоваться

1. Зайди на свой домен/IP
2. Зарегистрируйся по инвайт-коду (он выведется после установки, хранится в `/opt/hub/.env`)
3. Друзья регистрируются тоже по инвайт-коду

## Файловая структура

```
backend/   FastAPI + SQLite     frontend/  React + Vite
install.sh авто-установка        backup.sh  бэкап всего
```

## Лицензия

MIT
