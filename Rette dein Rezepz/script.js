// ==========================================
// 1. IMPORTE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, orderBy, query, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 2. KONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAtV94i0tjlSLkwvl5_olM309h0RvBH0xI",
    authDomain: "rette-dein-rezept.firebaseapp.com",
    projectId: "rette-dein-rezept",
    storageBucket: "rette-dein-rezept.firebasestorage.app",
    messagingSenderId: "100953580692",
    appId: "1:100953580692:web:dc322698df671afb998081",
    measurementId: "G-X6954FKB66"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let idZumBearbeiten = null;

// NEU: Kategorie-Element
const kategorieFeld = document.getElementById('kategorie');

// ==========================================
// 3. HILFSFUNKTIONEN
// ==========================================

// Suchfunktion
window.rezepteFiltern = () => {
    const suchBegriff = document.getElementById('suche').value.toLowerCase();
    const alleKarten = document.querySelectorAll('.rezept-karte');

    alleKarten.forEach(karte => {
        // Filtere nach Titel ODER Kategorie
        const titel = karte.querySelector('h2').innerText.toLowerCase();
        const kategorie = karte.getAttribute('data-kategorie').toLowerCase(); 
        
        if (titel.includes(suchBegriff) || kategorie.includes(suchBegriff)) {
            karte.style.display = "block";
        } else {
            karte.style.display = "none";
        }
    });
};

// Löschen
window.rezeptLoeschen = async (id, event) => {
    event.stopPropagation(); 
    if(confirm("Willst du dieses Rezept wirklich löschen? 🗑️")) {
        try {
            await deleteDoc(doc(db, "rezepte", id));
        } catch (error) {
            console.error("Fehler:", error);
        }
    }
};

// Bearbeiten
window.rezeptBearbeiten = (id, titel, zutaten, anleitung, kategorie, event) => {
    event.stopPropagation(); 

    document.getElementById('titel').value = titel;
    document.getElementById('zutaten').value = zutaten;
    document.getElementById('anleitung').value = anleitung;
    document.getElementById('kategorie').value = kategorie; 

    idZumBearbeiten = id;

    const btn = document.getElementById('speichernButton');
    btn.innerText = "Änderung speichern 💾";
    btn.style.backgroundColor = "#FFD700"; 
    btn.style.color = "black";
    
    document.getElementById('neues-rezept-formular').scrollIntoView({behavior: "smooth"});
};

// Aufklappen
window.karteUmschalten = (element) => {
    element.classList.toggle("offen");
};

// ==========================================
// 4. SPEICHERN / UPDATE
// ==========================================
async function rezeptSpeichern() {
    const titelFeld = document.getElementById('titel');
    const zutatenFeld = document.getElementById('zutaten');
    const anleitungFeld = document.getElementById('anleitung');
    const kategorieFeld = document.getElementById('kategorie'); 
    
    const btn = document.getElementById('speichernButton');

    if (titelFeld.value.trim() === "" || anleitungFeld.value.trim() === "") {
        alert("Bitte Titel und Anleitung ausfüllen!");
        return;
    }

    try {
        const rezeptDaten = {
            titel: titelFeld.value,
            zutaten: zutatenFeld.value,
            anleitung: anleitungFeld.value,
            kategorie: kategorieFeld.value 
        };

        if (idZumBearbeiten) {
            // Update-Fall
            const rezeptRef = doc(db, "rezepte", idZumBearbeiten);
            await updateDoc(rezeptRef, rezeptDaten);
            
            idZumBearbeiten = null;
            btn.innerText = "Speichern";
            btn.style.backgroundColor = "#333";
            btn.style.color = "white";

        } else {
            // Neuer Eintrag-Fall
            await addDoc(collection(db, "rezepte"), {
                ...rezeptDaten,
                datum: new Date()
            });
        }

        // Felder leeren
        titelFeld.value = '';
        zutatenFeld.value = '';
        anleitungFeld.value = '';
        kategorieFeld.value = 'sonstiges'; 

    } catch (error) {
        console.error("Fehler:", error);
        alert("Fehler beim Speichern/Ändern.");
    }
}

// ==========================================
// 5. REZEPTE LADEN
// ==========================================
const q = query(collection(db, "rezepte"), orderBy("datum", "desc"));

onSnapshot(q, (snapshot) => {
    const rezeptContainer = document.getElementById('rezept-liste');
    rezeptContainer.innerHTML = "";

    snapshot.forEach((dokument) => {
        const rezept = dokument.data();
        const id = dokument.id;
        
        // HILFSFUNKTIONEN FÜR DATENSICHERHEIT BEIM BEARBEITEN
        const titelSafe = (rezept.titel || "").replace(/"/g, "&quot;");
        const anleitungSafe = (rezept.anleitung || "").replace(/"/g, "&quot;").replace(/\n/g, "\\n");
        const kategorieSafe = (rezept.kategorie || "sonstiges").replace(/"/g, "&quot;"); 

        let zutatenRaw = "";
        let zutatenListeHTML = "";
        
        if (rezept.zutaten) {
            zutatenRaw = rezept.zutaten.replace(/"/g, "&quot;");
            const zeilen = rezept.zutaten.split('\n');
            zutatenListeHTML = "<ul>"; 
            zeilen.forEach(zeile => {
                if(zeile.trim() !== "") {
                    zutatenListeHTML += `<li>${zeile}</li>`;
                }
            });
            zutatenListeHTML += "</ul>"; 
        }

        let datumText = "";
        if(rezept.datum) {
            datumText = rezept.datum.toDate().toLocaleDateString();
        }

        // Kategorie-Symbol/Text für die Karte
        const kategorieText = kategorieSafe.charAt(0).toUpperCase() + kategorieSafe.slice(1);
        let kategorieEmoji = "";
        if (kategorieSafe === 'fleisch') kategorieEmoji = '🥩';
        else if (kategorieSafe === 'vegetarisch') kategorieEmoji = '🥦';
        else if (kategorieSafe === 'dessert') kategorieEmoji = '🍰';
        else if (kategorieSafe === 'drinks') kategorieEmoji = '🍹';
        else kategorieEmoji = '📚';

        const htmlCode = `
            <section class="rezept-karte" onclick="karteUmschalten(this)" data-kategorie="${kategorieSafe}">
                <h2>${rezept.titel}</h2>
                <small>${kategorieEmoji} ${kategorieText} | Hinzugefügt am: ${datumText}</small>
                <div class="karten-buttons">
                    <button class="edit-btn" onclick="rezeptBearbeiten('${id}', '${titelSafe}', '${zutatenRaw}', '${anleitungSafe}', '${kategorieSafe}', event)">✏️</button>
                    <button class="loeschen-btn" onclick="rezeptLoeschen('${id}', event)">🗑️</button>
                </div>
                <div class="rezept-details">
                    <h3>Zutaten:</h3>
                    ${zutatenListeHTML}
                    <h3>Anleitung:</h3>
                    <p>${rezept.anleitung}</p>
                </div>
            </section>
        `;
        rezeptContainer.innerHTML += htmlCode; 
    });
    window.rezepteFiltern();
});

document.getElementById('speichernButton').addEventListener('click', rezeptSpeichern);

// ==========================================
// 6. KÜCHEN-TIMER LOGIK
// ==========================================
let timerInterval;
const alarmSound = document.getElementById('timer-sound'); // NEU: Sound-Element holen

window.startTimer = () => {
    clearInterval(timerInterval);
    let minInput = document.getElementById('minuten');
    let sekInput = document.getElementById('sekunden');
    let anzeige = document.getElementById('timer-anzeige');

    let minuten = parseInt(minInput.value) || 0;
    let sekunden = parseInt(sekInput.value) || 0;

    if (minuten === 0 && sekunden === 0) {
        alert("Bitte Zeit eingeben! ⏲️");
        return;
    }

    let totalSekunden = (minuten * 60) + sekunden;
    document.getElementById('start-btn').innerText = "Läuft...";
    document.getElementById('start-btn').style.backgroundColor = "#2E8B57";

    timerInterval = setInterval(() => {
        if (totalSekunden <= 0) {
            clearInterval(timerInterval);
            anzeige.innerText = "00:00";
            
            // NEU: Sound abspielen
            if (alarmSound) {
                // muss oft neu geladen werden, damit es bei wiederholtem Start funktioniert
                alarmSound.currentTime = 0; 
                alarmSound.play();
            }
            
            alert("🍽️ Essen ist fertig!");
            document.getElementById('start-btn').innerText = "Start";
            document.getElementById('start-btn').style.backgroundColor = "#333";
            return;
        }
        totalSekunden--;
        let m = Math.floor(totalSekunden / 60);
        let s = totalSekunden % 60;
        anzeige.innerText = `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
    }, 1000);
};

window.resetTimer = () => {
    clearInterval(timerInterval);
    document.getElementById('timer-anzeige').innerText = "00:00";
    document.getElementById('minuten').value = "";
    document.getElementById('sekunden').value = "";
    document.getElementById('start-btn').innerText = "Start";
    document.getElementById('start-btn').style.backgroundColor = "#333";
    
    // NEU: Sound stoppen (falls er noch läuft)
    if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
};