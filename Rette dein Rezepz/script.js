import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let firebaseConfig;

// PRÜFUNG: Wo läuft die App gerade?
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    // LOKAL: Versuche die config.js zu laden
    try {
        const module = await import('./config.js');
        firebaseConfig = module.firebaseConfig;
    } catch (e) {
        console.error("Lokal: config.js wurde nicht gefunden. Hast du sie erstellt?", e);
    }
} else {
    // ONLINE (Netlify): Nutze die fest hinterlegten Daten
    firebaseConfig = {
        apiKey: "AizaSvAtv94iOtjlSlkwvI5_o1M309h0RvBH0xI",
        authDomain: "rette-dein-rezept.firebaseapp.com",
        projectId: "rette-dein-rezept",
        storageBucket: "rette-dein-rezept.firebasestorage.app",
        messagingSenderId: "100953580692",
        appId: "1:100953580692:web:dc322698df671afb998081",
        measurementId: "G-X6954FKB66"
    };
}

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const recipesInDB = ref(database, "recipes");

const inputFieldEl = document.getElementById("input-field");
const addButtonEl = document.getElementById("add-button");
const recipeListEl = document.getElementById("recipe-list");
const pingSound = document.getElementById("ping-sound");

// Rezept hinzufügen
addButtonEl.addEventListener("click", function() {
    let inputValue = inputFieldEl.value;
    if (inputValue.trim() !== "") {
        push(recipesInDB, inputValue);
        clearInputFieldEl();
        playPingSound();
    }
});

// Daten aus DB lesen und anzeigen
onValue(recipesInDB, function(snapshot) {
    if (snapshot.exists()) {
        let itemsArray = Object.entries(snapshot.val());
        clearRecipeListEl();
        for (let i = 0; i < itemsArray.length; i++) {
            let currentItem = itemsArray[i];
            appendItemToRecipeListEl(currentItem);
        }
    } else {
        recipeListEl.innerHTML = "Keine Rezepte vorhanden...";
    }
});

function clearRecipeListEl() {
    recipeListEl.innerHTML = "";
}

function clearInputFieldEl() {
    inputFieldEl.value = "";
}

function playPingSound() {
    if (pingSound) {
        pingSound.play();
    }
}

function appendItemToRecipeListEl(item) {
    let itemID = item[0];
    let itemValue = item[1];
    let newEl = document.createElement("li");
    newEl.textContent = itemValue;

    // Löschen bei Klick
    newEl.addEventListener("click", function() {
        let exactLocationOfItemInDB = ref(database, `recipes/${itemID}`);
        remove(exactLocationOfItemInDB);
    });

    recipeListEl.append(newEl);
}