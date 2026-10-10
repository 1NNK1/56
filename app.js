const $ = (id) => document.getElementById(id);

function fillList(el, items) {
  el.innerHTML = '';
  for (const text of items) {
    const li = document.createElement('li');
    li.textContent = text;
    el.appendChild(li);
  }
}

async function loadInfo() {
  const info = await (await fetch('/api/info')).json();
  document.title = 'ДЗ ' + info.number + ' — ' + info.title;
  $('tag').textContent = 'ДЗ ' + info.number;
  $('title').textContent = info.title;
  $('description').textContent = info.description;
  fillList($('shows'), info.shows);
  fillList($('how'), info.how);
  $('demo-name').textContent = info.demo;
  $('source').textContent = info.demoSource;
  $('tree').textContent = info.tree;
}

async function runDemo() {
  const button = $('run');
  button.disabled = true;
  $('status').textContent = 'Выполняется...';
  try {
    const result = await (await fetch('/api/run', { method: 'POST' })).json();
    $('stdout').textContent = result.stdout.trim() || '(вывод пуст)';
    $('stderr').hidden = !result.stderr.trim();
    $('stderr').textContent = result.stderr.trim();
    $('status').textContent = 'Код завершения: ' + result.code;
    $('created').hidden = !(result.created && result.created.length);
    $('created').textContent = 'Созданные файлы (удалены после запуска): ' + (result.created || []).join(', ');
  } catch (error) {
    $('status').textContent = 'Ошибка запроса: ' + error.message;
  } finally {
    button.disabled = false;
  }
}

$('run').addEventListener('click', runDemo);
loadInfo().catch((error) => {
  $('status').textContent = 'Не удалось загрузить данные: ' + error.message;
});
