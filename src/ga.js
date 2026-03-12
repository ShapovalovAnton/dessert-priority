// ga.js - Реалізація Генетичного Алгоритму з відстеженням прогресу
export class GeneticRanking {
    constructor(objects, expertVotes) {
        this.objects = objects; // Твої 10 десертів-переможців [cite: 14]
        this.expertVotes = expertVotes; // Масиви голосів експертів [cite: 15]
        this.populationSize = 60;
        this.generations = 100; // Кількість ітерацій (поколінь)
        this.mutationRate = 0.15;
    }

    // Функція пристосованості (Fitness): чим ближче хромосома до думок експертів, тим вищий бал
    calculateFitness(individual) {
        let totalDistance = 0;
        this.expertVotes.forEach(vote => {
            // Метрика розбіжності: сумуємо різницю позицій об'єктів
            vote.forEach((item, index) => {
                const posInIndividual = individual.indexOf(item);
                if (posInIndividual !== -1) {
                    // Використовуємо квадрат відстані для більш жорсткої селекції лідерів
                    totalDistance += Math.pow(posInIndividual - index, 2);
                }
            });
        });
        // Fitness має зростати при зменшенні дистанції
        return 1000 / (totalDistance + 1);
    }

    // Створення початкової випадкової популяції
    generateInitialPopulation() {
        let population = [];
        for (let i = 0; i < this.populationSize; i++) {
            population.push([...this.objects].sort(() => Math.random() - 0.5));
        }
        return population;
    }

    // Схрещування (Ordered Crossover): поєднує порядок об'єктів від двох батьків
    crossover(parent1, parent2) {
        const start = Math.floor(Math.random() * parent1.length);
        const end = Math.floor(start + Math.random() * (parent1.length - start));
        const child = new Array(parent1.length).fill(null);
        
        for (let i = start; i <= end; i++) child[i] = parent1[i];
        
        let currentIdx = 0;
        parent2.forEach(item => {
            if (!child.includes(item)) {
                while (child[currentIdx] !== null) currentIdx++;
                child[currentIdx] = item;
            }
        });
        return child;
    }

    // Мутація: випадковий обмін місцями двох елементів (Swap Mutation)
    mutate(individual) {
        if (Math.random() < this.mutationRate) {
            const i = Math.floor(Math.random() * individual.length);
            const j = Math.floor(Math.random() * individual.length);
            [individual[i], individual[j]] = [individual[j], individual[i]];
        }
    }

    // Головний цикл еволюції з фіксацією історії
    findBestRanking() {
        let population = this.generateInitialPopulation();
        let fitnessHistory = []; // Для графіка прогресу

        for (let g = 0; g < this.generations; g++) {
            // Сортуємо за пристосованістю (елітизм)
            population.sort((a, b) => this.calculateFitness(b) - this.calculateFitness(a));
            
            // Зберігаємо найкращий показник поточного покоління
            const bestCurrentFitness = this.calculateFitness(population[0]);
            fitnessHistory.push(bestCurrentFitness.toFixed(2));

            // Формуємо нове покоління
            let nextGen = population.slice(0, 10); // Залишаємо 10 кращих без змін

            while (nextGen.length < this.populationSize) {
                const p1 = population[Math.floor(Math.random() * 20)];
                const p2 = population[Math.floor(Math.random() * 20)];
                const child = this.crossover(p1, p2);
                this.mutate(child);
                nextGen.push(child);
            }
            population = nextGen;
        }

        return {
            best: population[0], // Найкраще знайдене ранжування
            history: fitnessHistory // Дані для графіка збіжності [cite: 45]
        };
    }
}