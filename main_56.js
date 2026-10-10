console.log('#55. JavaScript homework example file');

/*
 *
 * #1
 *
 * Технічне завдання для розробки функції "asyncOperationDemo"
 *
 * Задача:
 * Розробити функцію, яка ілюструє використання асинхронних API Node.js: process.nextTick, setImmediate, і setTimeout.
 * Функція має демонструвати порядок виконання асинхронних операцій в контексті циклу подій Node.js та забезпечувати документацію процесу через систематичне логування.
 *
 * Функціональні вимоги:
 * 1. Вхідні параметри:
 *  - `callback`: Функція зворотнього виклику, яка буде викликана після кожного асинхронного виклику з відповідним ідентифікатором операції.
 *
 * 2. Операції з асинхронним кодом:
 *  - Використання `process.nextTick` для демонстрації миттєвого асинхронного виконання коду після поточних операцій.
 *  - Використання `setImmediate` для демонстрації планування виконання коду на наступний цикл подій.
 *  - Використання `setTimeout` з затримкою `0` для демонстрації виконання коду після всіх запланованих `immediate` і перед наступними ітераціями циклу подій.
 *
 * 3. Логування:
 *  - Логування "Перший виклик" на початку виконання функції.
 *  - Логування "Виконано nextTick", "Виконано setImmediate", і "Виконано setTimeout" під час виконання відповідних асинхронних операцій.
 *  - Логування "Останній виклик" після ініціації всіх асинхронних операцій, але до їх завершення.
 *  - Використання зворотнього виклику для передачі результату кожної асинхронної операції.
 *  - Логування "Завершено виконання: [operation]" після кожної асинхронної дії.
 *
 * Технічні вимоги:
 * - Використання сучасних можливостей JavaScript (ES6+), зокрема асинхронних функцій (async/await) за необхідності.
 * - Належне управління асинхронними процесами та виключеннями для забезпечення коректного виконання функціоналу.
 * - Код має бути чистим, добре структурованим, з логічною структурою та зрозумілими назвами змінних та функцій.
 * - Підготовка функції для легкої інтеграції у тести, використовуючи JEST для мокування залежностей і перевірки поведінки функції.
 *
 */

/**
 * Залежності за замовчуванням. Для тестів (Jest) їх можна підмінити
 * через другий необов'язковий параметр функції asyncOperationDemo.
 */
const defaultDeps = {
  nextTick: (fn) => process.nextTick(fn),
  setImmediate: (fn) => setImmediate(fn),
  setTimeout: (fn, delay) => setTimeout(fn, delay),
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};

/**
 * Демонструє порядок виконання process.nextTick, setImmediate та setTimeout(0).
 *
 * Порядок логів:
 *  1. "Перший виклик" (синхронно, на початку);
 *  2. "Останній виклик" (синхронно, після планування всіх операцій);
 *  3. process.nextTick: виконується одразу після завершення поточної синхронної
 *     операції, до переходу до наступної фази циклу подій;
 *  4. setTimeout(0) та setImmediate: виконуються у різних фазах циклу подій
 *     (timers та check). Порядок між ними при запуску з основного модуля
 *     не гарантований і залежить від швидкодії процесу. Усередині I/O-колбеку
 *     setImmediate завжди виконується першим.
 *
 * Після кожної операції логується "Виконано <операція>" і викликається callback
 * з назвою операції. Якщо callback викидає виняток, помилка логується,
 * а решта операцій продовжує виконуватись.
 *
 * @param {(operation: string) => void} callback Функція, яка викликається після
 *   кожної асинхронної операції з її назвою: 'nextTick', 'setImmediate' або 'setTimeout'.
 * @param {typeof defaultDeps} [deps] Залежності (для мокування в тестах).
 * @returns {Promise<string[]>} Проміс, який виконується після завершення всіх
 *   операцій і містить назви операцій у порядку фактичного виконання.
 * @throws {TypeError} Якщо callback не є функцією.
 *
 * @example
 * const order = await asyncOperationDemo((operation) => {
 *   console.log(`Завершено виконання: ${operation}`);
 * });
 */
function asyncOperationDemo(callback, deps = defaultDeps) {
  if (typeof callback !== 'function') {
    throw new TypeError('callback має бути функцією');
  }

  const completed = [];

  const schedule = (operation, scheduler) =>
    new Promise((resolve) => {
      scheduler(() => {
        deps.log(`Виконано ${operation}`);
        try {
          callback(operation);
        } catch (error) {
          deps.error(`Помилка в callback (${operation}):`, error);
        }
        completed.push(operation);
        resolve();
      });
    });

  deps.log('Перший виклик');

  const pending = [
    schedule('nextTick', (fn) => deps.nextTick(fn)),
    schedule('setImmediate', (fn) => deps.setImmediate(fn)),
    schedule('setTimeout', (fn) => deps.setTimeout(fn, 0)),
  ];

  deps.log('Останній виклик');

  return Promise.all(pending).then(() => completed);
}

asyncOperationDemo(operation => {
  console.log(`Завершено виконання: ${operation}`);
});

export { asyncOperationDemo };
