import { asyncOperationDemo } from './main.js';

// main.js уже запускает демо один раз при импорте (см. вывод выше).
// Здесь вызываем функцию ещё раз со своим callback и получаем порядок выполнения.
console.log('--- Повторный вызов со своим callback ---');
const order = await asyncOperationDemo((operation) => {
  console.log(`callback получил: ${operation}`);
});
console.log('Порядок выполнения:', order.join(' -> '));
