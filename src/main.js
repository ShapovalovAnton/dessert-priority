import { db, collection, addDoc, serverTimestamp } from './firebase.js';
import { getDocs, query, orderBy } from "firebase/firestore"; // Додаємо функції для читання
import './style.css'

// 1. База даних об'єктів (20 десертів) [cite: 4, 63]
const desserts = [
  "Тирамісу", "Чизкейк", "Медовик", "Наполеон", "Шоколадний фондан",
  "Макарон", "Еклер з заварним кремом", "Пахлава", "Брауні", "Морозиво пломбір",
  "Празький торт", "Панна котта", "Крем-брюле", "Яблучний штрудель", "Круасан з шоколадом",
  "Вафельний торт зі згущенкою", "Сирники зі сметаною", "Торт «Павлова»", "Червоний оксамит", "Пончики"
];

let selected = []; // Вибір експерта (v=3) [cite: 5, 20]

const voteView = document.getElementById('vote-view');
const adminView = document.getElementById('admin-view');
const appDiv = document.querySelector('#app');
const submitBtn = document.querySelector('#submit-btn');

// --- НАВІГАЦІЯ ТА ПАРОЛЬ ---
document.getElementById('show-vote-btn').onclick = () => {
    adminView.style.display = 'none';
    voteView.style.display = 'block';
};

document.getElementById('show-admin-btn').onclick = async () => {
    const password = prompt("Введіть пароль адміністратора:");
    if (password === 'admin') {
        voteView.style.display = 'none';
        adminView.style.display = 'block';
        await fetchVotes(); // Завантажуємо записи
    } else {
        alert("Доступ заборонено!");
    }
};

// --- ЛОГІКА ГОЛОСУВАННЯ ---
function render() {
  appDiv.innerHTML = '';
  desserts.forEach(name => {
    const isSelected = selected.indexOf(name);
    const btn = document.createElement('button');
    btn.className = `dessert-card ${isSelected !== -1 ? 'active' : ''}`;
    btn.innerHTML = `${name} ${isSelected !== -1 ? `<div class="badge">${isSelected + 1}</div>` : ''}`;
    btn.onclick = () => handleSelect(name);
    appDiv.appendChild(btn);
  });
  submitBtn.disabled = selected.length !== 3; // Рівно 3 об'єкти [cite: 5, 21]
}

function handleSelect(name) {
  const index = selected.indexOf(name);
  if (index !== -1) {
    selected.splice(index, 1);
  } else if (selected.length < 3) {
    selected.push(name); // Пріоритетне порівняння [cite: 5, 26]
  }
  render();
}

submitBtn.onclick = async () => {
  try {
    submitBtn.disabled = true;
    await addDoc(collection(db, "votes"), {
      ranking: selected, // Збереження наданої інформації [cite: 10, 33]
      timestamp: serverTimestamp()
    });
    alert("Ваш голос враховано анонімно!"); // Анонімність [cite: 7, 51]
    selected = [];
    render();
  } catch (e) {
    console.error(e);
    submitBtn.disabled = false;
  }
};

// --- ЛОГІКА АДМІНІСТРАТОРА (ВИВІД ЗАПИСІВ) ---
async function fetchVotes() {
    const container = document.getElementById('results-container');
    container.innerHTML = '<p>Завантаження протоколу...</p>';
    
    try {
        const q = query(collection(db, "votes"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p>Голосів ще немає.</p>';
            return;
        }

        let tableHtml = `
            <table border="1" style="width:100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f2f2f2;">
                        <th>Час голосування</th>
                        <th>1 місце (Пріоритет 1)</th>
                        <th>2 місце (Пріоритет 2)</th>
                        <th>3 місце (Пріоритет 3)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp?.toDate().toLocaleString() || "Невідомо";
            tableHtml += `
                <tr>
                    <td>${date}</td>
                    <td><b>${data.ranking[0]}</b></td>
                    <td>${data.ranking[1]}</td>
                    <td>${data.ranking[2]}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;
    } catch (e) {
        container.innerHTML = `<p style="color:red;">Помилка доступу до даних: ${e.message}</p>`;
    }
}

render();
