// Утилита для генерации коротких ID (8 символов)

/**
 * Генерирует короткий ID из 8 символов (буквы и цифры)
 */
export function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Генерирует уникальный короткий ID для указанной таблицы
 * @param supabase - клиент Supabase
 * @param tableName - название таблицы для проверки уникальности
 * @param maxAttempts - максимальное количество попыток (по умолчанию 10)
 */
export async function generateUniqueShortId(
  supabase: any,
  tableName: string,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateShortId();
    
    // Проверяем уникальность ID в указанной таблице
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', id)
      .single();
    
    // Если запрос вернул ошибку "PGRST116" (не найдено), то ID уникален
    if (error && error.code === 'PGRST116') {
      return id;
    }
    
    // Если данных нет, ID тоже уникален
    if (!data) {
      return id;
    }
  }
  
  throw new Error(`Не удалось сгенерировать уникальный ID для таблицы ${tableName} за ${maxAttempts} попыток`);
}