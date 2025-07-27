#!/bin/bash

# Скрипт для настройки автоматической очистки временных пользователей
# Создает cron job, который будет запускаться каждый день в 2:00 утра

echo "Настройка автоматической очистки временных пользователей..."

# Проверяем, что скрипт запущен с правами администратора
if [ "$EUID" -ne 0 ]; then
  echo "Пожалуйста, запустите скрипт с правами администратора (sudo)"
  exit 1
fi

# URL вашего приложения (замените на актуальный)
APP_URL="http://localhost:3000"
API_TOKEN="your-secret-cleanup-token-here"  # Замените на ваш секретный токен

# Создаем cron job
CRON_JOB="0 2 * * * curl -X POST -H 'Authorization: Bearer $API_TOKEN' $APP_URL/api/cleanup/temp-users >> /var/log/voevoda-cleanup.log 2>&1"

# Добавляем cron job
echo "$CRON_JOB" | crontab -

echo "Cron job создан успешно!"
echo "Очистка будет выполняться каждый день в 2:00 утра"
echo "Логи сохраняются в /var/log/voevoda-cleanup.log"
echo ""
echo "ВАЖНО: Не забудьте заменить 'your-secret-cleanup-token-here' на ваш реальный API токен!"
echo "Установите переменную окружения CLEANUP_API_TOKEN в вашем приложении."
echo ""
echo "Для просмотра текущих cron jobs: crontab -l"
echo "Для удаления cron job: crontab -r"