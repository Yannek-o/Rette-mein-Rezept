// --- 0. ZUGANGSWEICHE (Lokal vs. Pipeline) ---
// Prüfe, ob secretConfig aus der config.js existiert. Wenn nicht, nutze Platzhalter für die Pipeline.
const FINAL_API_KEY = (typeof secretConfig !== 'undefined') ? secretConfig.apiKey : "SIGN_API_KEY_HERE";
const FINAL_ADMIN_PW = (typeof secretConfig !== 'undefined') ? secretConfig.adminPw : "SIGN_ADMIN_PW_HERE";

// --- 1. FIREBASE SETUP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: FINAL_API_KEY, // Nutzt den Key von oben
    authDomain: "rette-dein-rezept.firebaseapp.com",
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

// --- ZUGANGSKONTROLLE (Neu: Passwort-Schutz) ---
function verifyAccess() {
    // Prüfen, ob der Code in dieser Sitzung schon korrekt eingegeben wurde
    if (sessionStorage.getItem("access_granted") === "true") {
        return true;
    }

    const accessCode = prompt("Speicher-Check: Bitte gib den Code ein:");
    // Vergleicht die Eingabe mit dem Passwort aus der Weiche
    if (accessCode === FINAL_ADMIN_PW) {
        sessionStorage.setItem("access_granted", "true");
        return true;
    } else {
        alert("Falscher Code! Aktion abgebrochen.");
        return false;
    }
}

// --- 2. DISPLAY WAKE LOCK (Handy-Display anlassen) ---
let wakeLock = null;
const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};

// --- 3. REZEPT SPEICHERN ---
document.getElementById("add-button").onclick = () => {
    const nameInput = document.getElementById("input-field");
    const ingredientsInput = document.getElementById("ingredients-field");
    const instructionsInput = document.getElementById("instructions-field");
    const categoryInput = document.getElementById("category-select");

    if (nameInput.value.trim()) {
        // Erst Code abfragen, bevor gespeichert wird
        if (!verifyAccess()) return;

        push(recipesRef, {
            name: nameInput.value,
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

// --- 4. DATEN LADEN & ANZEIGEN ---
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
                    requestWakeLock();
                    document.getElementById("modal-title").textContent = data.name;
                    document.getElementById("modal-ingredients").textContent = data.ingredients || "Keine Zutaten.";
                    document.getElementById("modal-instructions").textContent = data.instructions || "Keine Anleitung.";
                    modal.style.display = "block";
                };

                li.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(`"${data.name}" wirklich löschen?`)) {
                        // Code abfragen vor dem Löschen
                        if (verifyAccess()) {
                            remove(ref(database, `recipes/${id}`));
                        }
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

// --- 5. MODAL LOGIK ---
document.querySelector(".close-button").onclick = () => {
    modal.style.display = "none";
    if (wakeLock !== null) wakeLock.release().then(() => wakeLock = null);
};

window.onclick = (e) => { 
    if (e.target == modal) {
        modal.style.display = "none";
        if (wakeLock !== null) wakeLock.release().then(() => wakeLock = null);
    }
};

// --- 6. FILTER-UPDATE ---
filterSelectEl.onchange = () => {
    onValue(recipesRef, (snapshot) => {
        updateRecipeList(snapshot);
    }, { onlyOnce: true });
};

// --- 7. KOCH-TIMER ---
let timer;
document.getElementById("start-timer").onclick = () => {
    const min = parseInt(document.getElementById("minutes").value) || 0;
    const sek = parseInt(document.getElementById("seconds").value) || 0;
    let totalSeconds = (min * 60) + sek;

    if (totalSeconds <= 0) return;

    requestWakeLock();
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
            alert("Zeit abgelaufen! 🍽️");
            if (wakeLock !== null) wakeLock.release().then(() => wakeLock = null);
        }
    }, 1000);
};

document.getElementById("reset-timer").onclick = () => {
    clearInterval(timer);
    document.getElementById("timer-display").textContent = "00:00";
    document.getElementById("minutes").value = "";
    document.getElementById("seconds").value = "";
    if (wakeLock !== null) wakeLock.release().then(() => wakeLock = null);
};