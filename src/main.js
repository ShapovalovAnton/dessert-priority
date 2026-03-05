import { db, collection, addDoc, serverTimestamp } from './firebase.js';
import { getDocs, query, orderBy } from "firebase/firestore";
import './style.css'

const desserts = [
  "Тирамісу", "Чизкейк", "Медовик", "Наполеон", "Шоколадний фондан",
  "Макарон", "Еклер з заварним кремом", "Пахлава", "Брауні", "Морозиво пломбір",
  "Празький торт", "Панна котта", "Крем-брюле", "Яблучний штрудель", "Круасан з шоколадом",
  "Вафельний торт зі згущенкою", "Сирники зі сметаною", "Торт «Павлова»", "Червоний оксамит", "Пончики"
];

let selected = [];
let chartInstance = null; // Для скидання графіка при оновленні

const voteView = document.getElementById('vote-view');
const adminView = document.getElementById('admin-view');
const appDiv = document.querySelector('#app');
const submitBtn = document.querySelector('#submit-btn');

document.getElementById('show-vote-btn').onclick = () => {
    adminView.style.display = 'none';
    voteView.style.display = 'block';
};

document.getElementById('show-admin-btn').onclick = async () => {
    const password = prompt("Введіть пароль адміністратора:");
    if (password === 'admin') {
        voteView.style.display = 'none';
        adminView.style.display = 'block';
        await fetchVotes();
    } else {
        alert("Доступ заборонено!");
    }
};

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
  submitBtn.disabled = selected.length !== 3;
}

function handleSelect(name) {
  const index = selected.indexOf(name);
  if (index !== -1) {
    selected.splice(index, 1);
  } else if (selected.length < 3) {
    selected.push(name);
  }
  render();
}

submitBtn.onclick = async () => {
  try {
    submitBtn.disabled = true;
    await addDoc(collection(db, "votes"), {
      ranking: selected,
      timestamp: serverTimestamp()
    });
    alert("Ваш голос враховано анонімно!");
    selected = [];
    render();
  } catch (e) {
    console.error(e);
    submitBtn.disabled = false;
  }
};

// --- ЛОГІКА АДМІНІСТРАТОРА З ГІСТОГРАМОЮ ---
// --- ЛОГІКА АДМІНІСТРАТОРА З ГІСТОГРАМОЮ ---
async function fetchVotes() {
    const container = document.getElementById('results-container');
    container.innerHTML = '<p>Завантаження протоколу...</p>';
    
    try {
        const q = query(collection(db, "votes"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        // 1. Обрахунок суми голосів (Зважена оцінка: 1 місце = 3 бали, 2 = 2, 3 = 1) [cite: 33]
        const stats = {};
        desserts.forEach(d => stats[d] = 0); // Ініціалізуємо всі 20 об'єктів [cite: 4, 63]

        const votesData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            votesData.push(data);
            data.ranking.forEach((name, index) => {
                if (stats[name] !== undefined) {
                    stats[name] += (3 - index); // Пріоритетне порівняння [cite: 5, 26]
                }
            });
        });

        // 2. Створюємо Canvas з фіксованою висотою для надійності
        container.innerHTML = `
            <div style="position: relative; height:400px; width:100%; margin-bottom: 50px;">
                <canvas id="resultsChart"></canvas>
            </div>
            <div id="table-holder"></div>
        `;
        
        // 3. Побудова гістограми (даємо браузеру мить на рендер canvas)
        setTimeout(() => {
            const canvas = document.getElementById('resultsChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            if (chartInstance) chartInstance.destroy();
            
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(stats),
                    datasets: [{
                        label: 'Загальна сума балів (зважений рейтинг)',
                        data: Object.values(stats),
                        backgroundColor: 'rgba(108, 92, 231, 0.7)',
                        borderColor: '#6c5ce7',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Важливо для стабільного відображення
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: { display: true, text: 'Бали' }
                        },
                        x: {
                            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
                        }
                    }
                }
            });

            // 4. Додавання таблиці протоколу [cite: 68]
            const tableHolder = document.getElementById('table-holder');
            let tableHtml = `<table class="results-table">
                <thead><tr><th>Час</th><th>1 місце</th><th>2 місце</th><th>3 місце</th></tr></thead>
                <tbody>`;
            votesData.forEach((data) => {
                const date = data.timestamp?.toDate().toLocaleString() || "Невідомо";
                tableHtml += `<tr><td>${date}</td><td><b>${data.ranking[0]}</b></td><td>${data.ranking[1]}</td><td>${data.ranking[2]}</td></tr>`;
            });
            tableHtml += `</tbody></table>`;
            tableHolder.innerHTML = tableHtml;
        }, 50); // Затримка 50мс зазвичай вистачає

    } catch (e) {
        container.innerHTML = `<p style="color:red;">Помилка: ${e.message}</p>`;
    }
}

render();
