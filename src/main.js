import { db, collection, addDoc, serverTimestamp } from './firebase.js';
import './style.css'
// 1. Формуємо базу даних об'єктів (20 десертів) [cite: 4, 63]
const desserts = [
  "Тирамісу", "Чизкейк", "Медовик", "Наполеон", "Шоколадний фондан",
  "Макарон", "Еклер з заварним кремом", "Пахлава", "Брауні", "Морозиво пломбір",
  "Празький торт", "Панна котта", "Крем-брюле", "Яблучний штрудель", "Круасан з шоколадом",
  "Вафельний торт зі згущенкою", "Сирники зі сметаною", "Торт «Павлова»", "Червоний оксамит", "Пончики"
];

let selected = []; // Масив для зберігання вибору експерта (макс 3) [cite: 5, 20]

const appDiv = document.querySelector('#app');
const submitBtn = document.querySelector('#submit-btn');

// 2. Функція для створення інтерфейсу голосування [cite: 65]
function render() {
  appDiv.innerHTML = '';
  desserts.forEach(name => {
    const isSelected = selected.indexOf(name);
    const btn = document.createElement('button');
    btn.className = `dessert-card ${isSelected !== -1 ? 'active' : ''}`;
    
    // Показуємо порядковий номер (1, 2, 3) для строгого ранжування [cite: 5, 26]
    btn.innerHTML = `
  ${name} 
  ${isSelected !== -1 ? `<div class="badge">${isSelected + 1}</div>` : ''}
`;

    btn.onclick = () => handleSelect(name);
    appDiv.appendChild(btn);
  });

  // Кнопка активна тільки якщо вибрано рівно 3 об'єкти [cite: 5, 20]
  submitBtn.disabled = selected.length !== 3;
}

// 3. Логіка вибору з обмеженням (число Міллера 7±2, у нас v=3) [cite: 21, 22]
function handleSelect(name) {
  const index = selected.indexOf(name);
  if (index !== -1) {
    selected.splice(index, 1); // Видалити, якщо клікнули повторно
  } else if (selected.length < 3) {
    selected.push(name); // Додати, якщо ще немає 3-х обраних
  }
  render();
}

// 4. Відправка даних у Firebase (забезпечення конфіденційності та збереження) [cite: 7, 10, 51, 69]
submitBtn.onclick = async () => {
  try {
    submitBtn.disabled = true;
    submitBtn.innerText = "Відправка...";

    await addDoc(collection(db, "votes"), {
      ranking: selected, // Масив у порядку пріоритету [cite: 26, 33]
      timestamp: serverTimestamp() // Час для протоколу [cite: 68]
    });

    alert("Дякуємо! Ваш вибір збережено анонімно.");
    selected = [];
    render();
  } catch (e) {
    console.error("Помилка при збереженні: ", e);
    alert("Сталася помилка. Спробуйте ще раз.");
    submitBtn.disabled = false;
  }
};

render();
