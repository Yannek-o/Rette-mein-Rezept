// --- 1. FIREBASE SETUP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AizaSvAtv94iOtjlSlkwvI5_o1M309h0RvBH0xI",
    authDomain: "rette-dein-rezept.firebaseapp.com",
    // KORREKTUR: Die URL für die Region Belgien/Europa
    databaseURL: "https://rette-dein-rezept-default-rtdb.europe-west1.firebasedatabase.app/", 
    projectId: "rette-dein-rezept",
    storageBucket: "rette-dein-rezept.firebasestorage.app",
    messagingSenderId: "100953580692",
    appId: "1:100953580692:web:dc322698df671afb998081"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const recipesRef = ref(database, "recipes");

const modal = document.getElementById("recipe-modal");
const listEl = document.getElementById("recipe-list");
const filterSelectEl = document.getElementById("filter-select");

// --- 2. REZEPT SPEICHERN ---
document.getElementById("add-button").onclick = () => {
    const nameInput = document.getElementById("input-field");
    const ingredientsInput = document.getElementById("ingredients-field");
    const instructionsInput = document.getElementById("instructions-field");
    const categoryInput = document.getElementById("category-select");

    if (nameInput.value.trim()) {
        push(recipesRef, {
            name: nameInput.value,
            // Wir speichern die Kategorie einheitlich, um Filterfehler zu vermeiden
            category: categoryInput.value.trim(), 
            ingredients: ingredientsInput.value,
            instructions: instructionsInput.value,
            timestamp: Date.now()
        });

        [nameInput, ingredientsInput, instructionsInput].forEach(el => el.value = "");
        alert("Rezept wurde erfolgreich gespeichert!");
    } else {
        alert("Bitte gib zumindest einen Namen für das Rezept ein!");
    }
};

// --- 3. DATEN LADEN & ANZEIGEN ---
function updateRecipeList(snapshot) {
    listEl.innerHTML = ""; 
    
    if (snapshot.exists()) {
        const filterValue = filterSelectEl.value.toLowerCase().trim();
        let recipesArray = Object.entries(snapshot.val());
        recipesArray.sort((a, b) => a[1].name.localeCompare(b[1].name));

        let hasResults = false;
        recipesArray.forEach(([id, data]) => {
            const recipeCategory = (data.category || "").toLowerCase().trim();

            if (recipeCategory === filterValue) {
                hasResults = true;
                const li = document.createElement("li");
                li.innerHTML = `<span>${data.name}</span> <small>➔</small>`;
                
                li.onclick = () => {
                    const title = document.getElementById("modal-title");
                    const ingr = document.getElementById("modal-ingredients");
                    const inst = document.getElementById("modal-instructions");

                    if(title) title.textContent = data.name;
                    if(ingr) ingr.textContent = data.ingredients || "Keine Zutaten.";
                    if(inst) inst.textContent = data.instructions || "Keine Anleitung.";
                    
                    modal.style.display = "block";
                };

                li.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(`Möchtest du "${data.name}" wirklich löschen?`)) {
                        remove(ref(database, `recipes/${id}`));
                    }
                };
                listEl.append(li);
            }
        });

        if (!hasResults) {
            listEl.innerHTML = `<li>Keine Rezepte in "${filterSelectEl.value}" gefunden.</li>`;
        }
    } else {
        listEl.innerHTML = "<li>Noch keine Rezepte in der Datenbank.</li>";
    }
}

onValue(recipesRef, (snapshot) => {
    updateRecipeList(snapshot);
});

// --- 4. MODAL LOGIK ---
document.querySelector(".close-button").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

// --- 5. FILTER-UPDATE ---
filterSelectEl.onchange = () => {
    onValue(recipesRef, (snapshot) => {
        updateRecipeList(snapshot);
    }, { onlyOnce: true });
};

// --- 6. KOCH-TIMER ---
let timer;
document.getElementById("start-timer").onclick = () => {
    const min = parseInt(document.getElementById("minutes").value) || 0;
    const sek = parseInt(document.getElementById("seconds").value) || 0;
    let totalSeconds = (min * 60) + sek;

    if (totalSeconds <= 0) return;

    clearInterval(timer);
    timer = setInterval(() => {
        totalSeconds--;
        
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        document.getElementById("timer-display").textContent = 
            `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        if (totalSeconds <= 0) {
            clearInterval(timer);
            document.getElementById("ping-sound").play();
            alert("Zeit abgelaufen! Dein Essen ist fertig. 🍽️");
        }
    }, 1000);
};

document.getElementById("reset-timer").onclick = () => {
    clearInterval(timer);
    document.getElementById("timer-display").textContent = "00:00";
};