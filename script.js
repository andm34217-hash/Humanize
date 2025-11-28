document.getElementById("rewriteBtn").addEventListener("click", async () => {
  const text = document.getElementById("textInput").value.trim();

  if (!text) {
    alert("Introdu un text pentru rescriere.");
    return;
  }

  const responseBox = document.getElementById("response");
  responseBox.textContent = "Se procesează...";

  try {
    const response = await fetch("/api/groq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, mode: "rewrite" }),
    });

    const data = await response.json();
    responseBox.textContent = data.result || "Eroare la rescriere.";
  } catch (error) {
    console.error(error);
    responseBox.textContent = "A apărut o eroare la server.";
  }
});

document.getElementById("summaryBtn").addEventListener("click", async () => {
  const text = document.getElementById("textInput").value.trim();

  if (!text) {
    alert("Introdu un text pentru sumarizare.");
    return;
  }

  const responseBox = document.getElementById("response");
  responseBox.textContent = "Se procesează...";

  try {
    const response = await fetch("/api/groq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, mode: "summary" }),
    });

    const data = await response.json();
    responseBox.textContent = data.result || "Eroare la sumarizare.";
  } catch (error) {
    console.error(error);
    responseBox.textContent = "A apărut o eroare la server.";
  }
});
