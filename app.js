function saveBudget() {
  const title = document.getElementById("budgetTitle").value.trim();
  const amount = document.getElementById("totalBudget").value;
  const date = document.getElementById("budgetDate").value;

  if (!title || !amount) {
    alert("Enter a title and total budget");
    return;
  }

  let budgets = JSON.parse(localStorage.getItem("budgets")) || [];
  budgets.push({ title, amount, date, timestamp: Date.now() });
  localStorage.setItem("budgets", JSON.stringify(budgets));

  loadBudgets();
  document.getElementById("budgetTitle").value = "";
  document.getElementById("totalBudget").value = "";
  document.getElementById("budgetDate").value = "";
}

function loadBudgets() {
  const budgets = JSON.parse(localStorage.getItem("budgets")) || [];
  const list = document.getElementById("budgetsList");
  list.innerHTML = "";

  budgets.forEach((budget) => {
    const div = document.createElement("div");
    div.className = "budget-item";
    div.innerHTML = `
      <strong>${budget.title}</strong><br>
      Amount: ₦${budget.amount}<br>
      Date: ${budget.date || "Not set"}
    `;
    div.onclick = () =>
      alert(
        `Budget: ${budget.title}\nAmount: ₦${budget.amount}\nDate: ${budget.date || "Not set"}`
      );
    list.appendChild(div);
  });
}

window.onload = loadBudgets;