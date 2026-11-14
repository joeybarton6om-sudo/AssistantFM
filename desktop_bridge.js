"use strict";

window.addEventListener("pywebviewready", async () => {
    const api = window.pywebview.api;
    const panel = document.getElementById("desktop-paths");
    const status = document.getElementById("desktop-paths-status");
    panel.querySelectorAll("[data-desktop-only]").forEach(element => { element.hidden = false; });
    document.getElementById("desktop-paths-browser-hint").hidden = true;
    document.getElementById("desktop-open-saves").hidden = false;
    try {
        const data = await api.charger_dossiers();
        for (const [key, value] of Object.entries(data)) document.getElementById(`desktop-${key}`).value = value;
    } catch (error) { status.textContent = `Lecture des dossiers impossible : ${error.message || error}`; }
    panel.querySelectorAll("[data-desktop-path]").forEach(button => button.addEventListener("click", async () => {
        const input = document.getElementById(`desktop-${button.dataset.desktopPath}`);
        try {
            const selection = await api.choisir_dossier(input.value);
            if (selection !== null) input.value = selection;
        } catch (error) { status.textContent = `Sélection impossible : ${error.message || error}`; }
    }));
    panel.querySelectorAll("[data-desktop-clear]").forEach(button => button.addEventListener("click", () => {
        document.getElementById(`desktop-${button.dataset.desktopClear}`).value = "";
    }));
    document.getElementById("desktop-save-paths").addEventListener("click", async () => {
        try {
            const data = Object.fromEntries(["logos", "visages", "sauvegardes", "tactiques"].map(key =>
                [key, document.getElementById(`desktop-${key}`).value]));
            status.textContent = await api.enregistrer_dossiers(data);
        } catch (error) { status.textContent = `Enregistrement impossible : ${error.message || error}`; }
    });
    document.getElementById("desktop-open-saves").addEventListener("click", async () => {
        try { await api.ouvrir_sauvegardes(); }
        catch (error) { status.textContent = `Ouverture impossible : ${error.message || error}`; panel.open = true; }
    });
});
