import { db, collection, addDoc, serverTimestamp } from './firebase.js';
import { getDocs, query, orderBy } from "firebase/firestore";
import { GeneticRanking } from './ga.js';
import './style.css';

// 1. Об'єкти та евристики
const desserts = ["Тирамісу", "Чизкейк", "Медовик", "Наполеон", "Шоколадний фондан", "Макарон", "Еклер з заварним кремом", "Пахлава", "Брауні", "Морозиво пломбір", "Празький торт", "Панна котта", "Крем-брюле", "Яблучний штрудель", "Круасан з шоколадом", "Вафельний торт зі згущенкою", "Сирники зі сметаною", "Торт «Павлова»", "Червоний оксамит", "Пончики"];

const heuristics = [
    { id: 'E1', text: 'Об\'єкт був на 3 місці хоча б раз' },
    { id: 'E2', text: 'Об\'єкт був на 2 місці хоча б раз' },
    { id: 'E3', text: 'Об\'єкт був на 1 місці хоча б раз' },
    { id: 'E4', text: 'Об\'єкт був двічі на 3 місці' },
    { id: 'E5', text: 'Об\'єкт був на 3 місці та на 2 місці' },
    { id: 'E6', text: 'Об\'єкт має < 3 голосів сумарно (Власна)' },
    { id: 'E7', text: 'Об\'єкт жодного разу не був на 1 місці (Власна)' }
];

let expertName = ""; 
let selectedDesserts = [];
let selectedHeuristics = [];

const views = { 
    lab1: document.getElementById('lab1-view'), 
    lab2: document.getElementById('lab2-view'), 
    admin: document.getElementById('admin-view') 
};

// --- ІДЕНТИФІКАЦІЯ ЕКСПЕРТА ---
function askName() {
    const name = prompt("Вітаємо! Введіть ваше Прізвище та Ім'я для формування протоколу:");
    if (!name || name.trim() === "") {
        alert("Це відкрите опитування, ім'я обов'язкове!");
        askName();
    } else {
        expertName = name.trim();
        renderDesserts();
        renderHeuristics();
    }
}

// --- НАВІГАЦІЯ ---
document.getElementById('btn-lab1').onclick = () => switchView('lab1');
document.getElementById('btn-lab2').onclick = () => switchView('lab2');
document.getElementById('btn-admin').onclick = () => {
    if (prompt("Пароль адміністратора:") === 'admin') switchView('admin', fetchAllData);
};

function switchView(key, callback) {
    Object.keys(views).forEach(v => { if(views[v]) views[v].style.display = 'none'; });
    if (views[key]) views[key].style.display = 'block';
    if (callback) callback();
}

// --- ЛОГІКА ЛАБ 1 ---
function renderDesserts() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    desserts.forEach(d => {
        const idx = selectedDesserts.indexOf(d);
        const btn = document.createElement('button');
        btn.className = `dessert-card ${idx !== -1 ? 'active' : ''}`;
        btn.innerHTML = `${d} ${idx !== -1 ? `<div class="badge">${idx + 1}</div>` : ''}`;
        btn.onclick = () => {
            if (idx !== -1) selectedDesserts.splice(idx, 1);
            else if (selectedDesserts.length < 3) selectedDesserts.push(d);
            renderDesserts();
        };
        app.appendChild(btn);
    });
    const sBtn = document.getElementById('submit-btn');
    if (sBtn) sBtn.disabled = selectedDesserts.length !== 3 || !expertName;
}

document.getElementById('submit-btn').onclick = async () => {
    try {
        await addDoc(collection(db, "votes_lab1"), {
            expert: expertName,
            ranking: selectedDesserts,
            timestamp: serverTimestamp()
        });
        alert("Дякуємо! Ваш вибір для Лаб 1 збережено.");
        selectedDesserts = [];
        renderDesserts();
    } catch (e) { console.error(e); }
};

// --- ЛОГІКА ЛАБ 2 ---
function renderHeuristics() {
    const list = document.getElementById('heuristics-list');
    if (!list) return;
    list.innerHTML = '';
    heuristics.forEach(h => {
        const isSel = selectedHeuristics.includes(h.id);
        const btn = document.createElement('button');
        btn.className = `heuristic-card ${isSel ? 'active' : ''}`;
        btn.innerText = `${h.id}: ${h.text}`;
        btn.onclick = () => {
            if (isSel) selectedHeuristics = selectedHeuristics.filter(id => id !== h.id);
            else if (selectedHeuristics.length < 3) selectedHeuristics.push(h.id);
            renderHeuristics();
        };
        list.appendChild(btn);
    });
    const sL2Btn = document.getElementById('submit-h-btn');
    if (sL2Btn) sL2Btn.disabled = selectedHeuristics.length < 2 || !expertName;
}

document.getElementById('submit-h-btn').onclick = async () => {
    try {
        await addDoc(collection(db, "votes_lab2"), {
            expert: expertName,
            chosenHeuristics: selectedHeuristics,
            timestamp: serverTimestamp()
        });
        alert("Дякуємо! Ваш вибір евристик для Лаб 2 збережено.");
        selectedHeuristics = [];
        renderHeuristics();
    } catch (e) { console.error(e); }
};

// --- АДМІНКА: РОЗШИРЕНІ ТАБЛИЦІ ---
// --- АДМІНКА: ПОВНИЙ АНАЛІТИЧНИЙ ЗВІТ ---
async function fetchAllData() {
    const container = document.getElementById('results-container');
    if (!container) return;
    container.innerHTML = '<p>Обробка даних експертів та формування протоколів...</p>';
    
    try {
        // Завантаження даних з Firebase
        const snap1 = await getDocs(query(collection(db, "votes_lab1"), orderBy("timestamp", "desc")));
        const snap2 = await getDocs(query(collection(db, "votes_lab2"), orderBy("timestamp", "desc")));

        // 1. Попередня обробка [cite: 4, 6]
        const scores = {};
        const dessertStats = {};
        desserts.forEach(d => {
            scores[d] = 0;
            dessertStats[d] = { pos1: 0, pos2: 0, pos3: 0 };
        });

        const hCounts = {};
        heuristics.forEach(h => hCounts[h.id] = 0);

        // --- ТАБЛИЦЯ 1: ПРОТОКОЛ ОПИТУВАННЯ (ЛАБ 1) ---
        let lab1Html = '<h3>1. Протокол опитування (Лабораторна №1)</h3><table class="results-table"><thead><tr><th>Дата</th><th>Експерт</th><th>1 місце (3б)</th><th>2 місце (2б)</th><th>3 місце (1б)</th></tr></thead><tbody>';
        snap1.forEach(doc => {
            const d = doc.data();
            const date = d.timestamp ? d.timestamp.toDate().toLocaleString() : "---";
            lab1Html += `<tr><td>${date}</td><td>${d.expert}</td><td>${d.ranking[0]}</td><td>${d.ranking[1]}</td><td>${d.ranking[2]}</td></tr>`;
            
            if (d.ranking) {
                scores[d.ranking[0]] += 3; dessertStats[d.ranking[0]].pos1++;
                scores[d.ranking[1]] += 2; dessertStats[d.ranking[1]].pos2++;
                scores[d.ranking[2]] += 1; dessertStats[d.ranking[2]].pos3++;
            }
        });
        lab1Html += '</tbody></table>';

        // --- ТАБЛИЦЯ 2: ЗВАЖЕНЕ РАНЖУВАННЯ (20 ОБ\'ЄКТІВ) ---
        let ratingHtml = '<h3>2. Зважене ранжування (Всі 20 десертів)</h3><table class="results-table"><thead><tr><th>Місце</th><th>Об\'єкт (Десерт)</th><th>Сумарний бал</th></tr></thead><tbody>';
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        sortedScores.forEach(([name, score], index) => {
            ratingHtml += `<tr><td>${index + 1}</td><td>${name}</td><td>${score}</td></tr>`;
        });
        ratingHtml += '</tbody></table>';

        // --- ТАБЛИЦЯ 3: ПРОТОКОЛ ГОЛОСУВАННЯ ЗА ЕВРИСТИКИ (ЛАБ 2) ---
        let lab2Html = '<h3>3. Протокол вибору евристик (Лабораторна №2)</h3><table class="results-table"><thead><tr><th>Експерт</th><th>Обрані евристики</th></tr></thead><tbody>';
        snap2.forEach(doc => {
            const d = doc.data();
            lab2Html += `<tr><td>${d.expert}</td><td>${d.chosenHeuristics.join(', ')}</td></tr>`;
            d.chosenHeuristics.forEach(id => { if(hCounts[id] !== undefined) hCounts[id]++; });
        });
        lab2Html += '</tbody></table>';

        // --- ТАБЛИЦЯ 4: РЕЙТИНГ ЕВРИСТИК (ПОПУЛЯРНІСТЬ) [cite: 37] ---
        let heuristicsPopHtml = '<h3>4. Рейтинг евристик за популярністю</h3><table class="results-table"><thead><tr><th>ID</th><th>Зміст евристики</th><th>Голоси</th></tr></thead><tbody>';
        const sortedHeuristics = heuristics.map(h => ({...h, count: hCounts[h.id]}))
                                           .sort((a,b) => b.count - a.count);
        sortedHeuristics.forEach(h => {
            heuristicsPopHtml += `<tr><td><b>${h.id}</b></td><td>${h.text}</td><td>${h.count}</td></tr>`;
        });
        heuristicsPopHtml += '</tbody></table>';

        // --- ТАБЛИЦЯ 5: ПЕРЕМОЖЦІ (ТОП-10) [cite: 14, 44] ---
        const top3H = sortedHeuristics.slice(0, 3).map(h => h.id);
        const filteredResults = desserts.map(name => {
            let penalty = 0;
            top3H.forEach(hID => {
                if (hID === 'E1' && dessertStats[name].pos3 > 0) penalty++;
                if (hID === 'E4' && dessertStats[name].pos3 >= 2) penalty += 2;
                if (hID === 'E6' && scores[name] < 3) penalty += 5;
                if (hID === 'E7' && dessertStats[name].pos1 === 0) penalty += 3;
            });
            return { name, score: scores[name], penalty };
        });

        const winners = filteredResults.sort((a,b) => a.penalty - b.penalty || b.score - a.score).slice(0, 10);
        let winnersHtml = '<h3>5. Підмножина переможців (ТОП-10 об\'єктів)</h3><p>Сформовано на основі ТОП-3 евристик: ' + top3H.join(', ') + '</p><table class="results-table"><thead><tr><th>№</th><th>Десерт</th><th>Бал</th></tr></thead><tbody>';
        winners.forEach((w, i) => {
            winnersHtml += `<tr><td>${i+1}</td><td><b>${w.name}</b></td><td>${w.score}</td></tr>`;
        });
        winnersHtml += '</tbody></table>';

        // --- 6. ГЕНЕТИЧНИЙ АЛГОРИТМ [cite: 46] ---
        const winnersList = winners.map(w => w.name); 
        const expertVotes = [];
        snap1.forEach(doc => { if (doc.data().ranking) expertVotes.push(doc.data().ranking); });

        const ga = new GeneticRanking(winnersList, expertVotes);
        const { best, history } = ga.findBestRanking(); // Отримуємо результат та історію

        let gaHtml = `<h3>6. Фінальний консенсус-рейтинг (Генетичний алгоритм)</h3>
        <table class="results-table"><thead><tr><th>Місце</th><th>Об'єкт (Десерт)</th></tr></thead><tbody>`;
        best.forEach((name, i) => {
            gaHtml += `<tr><td><b>#${i + 1}</b></td><td>${name}</td></tr>`;
        });
        gaHtml += '</tbody></table>';

        // --- 7. ГРАФІК ПРОГРЕСУ ---
        let progressHtml = `<h3>7. Графік збіжності генетичного алгоритму</h3>
        <div style="height:300px; width:100%; margin-bottom: 50px;">
            <canvas id="gaProgressChart"></canvas>
        </div>`;

        // Вивід усього в контейнер
        container.innerHTML = lab1Html + ratingHtml + lab2Html + heuristicsPopHtml + winnersHtml + gaHtml + progressHtml;

        // Рендер графіка
        setTimeout(() => {
            const ctx = document.getElementById('gaProgressChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: history.map((_, i) => i + 1),
                    datasets: [{
                        label: 'Fitness Score (Пристосованість)',
                        data: history,
                        borderColor: '#00b894',
                        backgroundColor: 'rgba(0, 184, 148, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { title: { display: true, text: 'Значення Fitness' } },
                        x: { title: { display: true, text: 'Покоління' } }
                    }
                }
            });
        }, 100);

    } catch (e) { 
        container.innerHTML = `<p style="color:red">Помилка аналізу: ${e.message}</p>`; 
    }
}

// ЗАПУСК
askName();
renderDesserts();
renderHeuristics();
