let budgets = JSON.parse(localStorage.getItem("budgets")) || [];
let currentBudget = null;

function startNewBudget() {
  const title = document.getElementById("budgetTitle").value;
  const amount = parseFloat(document.getElementById("budgetAmount").value);
  const date = document.getElementById("budgetDate").value;

  if (!title || isNaN(amount) || !date) return;

  currentBudget = { title, amount, date, items: [] };
  budgets.push(currentBudget);
  saveBudgets();
  updateBudgetUI();
  loadSavedBudgets();

  document.getElementById("budgetTitle").value = "";
  document.getElementById("budgetAmount").value = "";
  document.getElementById("budgetDate").value = "";
}

function addItem() {
  const name = document.getElementById("itemName").value;
  const price = parseFloat(document.getElementById("itemPrice").value);
  const date = document.getElementById("itemDate").value;

  if (!name || isNaN(price) || !date) return;

  const item = { name, price, date };
  currentBudget.items.push(item);

  saveBudgets();
  updateBudgetUI();

  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemDate").value = "";
}

function updateBudgetUI() {
  if (!currentBudget) return;

  document.getElementById("currentBudgetTitle").textContent =
    `${currentBudget.title} (${currentBudget.date})`;

  document.getElementById("totalBudget").textContent =
    currentBudget.amount.toLocaleString();

  const spent = currentBudget.items.reduce((sum, item) => sum + item.price, 0);
  document.getElementById("spentAmount").textContent = spent.toLocaleString();

  const balance = currentBudget.amount - spent;
  document.getElementById("balanceAmount").textContent = balance.toLocaleString();

  const itemList = document.getElementById("itemList");
  itemList.innerHTML = "";
  currentBudget.items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="date">${item.date}</span> | ${item.name} | ₦${item.price.toLocaleString()}`;
    itemList.appendChild(li);
  });
}

function loadSavedBudgets() {
  const savedBudgets = document.getElementById("savedBudgets");
  savedBudgets.innerHTML = "";
  budgets.forEach((b, index) => {
    const li = document.createElement("li");
    li.textContent = `${b.title} (${b.date}) - ₦${b.amount.toLocaleString()}`;
    li.style.cursor = "pointer";
    li.onclick = () => {
      currentBudget = b;
      updateBudgetUI();
    };
    savedBudgets.appendChild(li);
  });
}

function saveBudgets() {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

window.onload = () => {
  loadSavedBudgets();
  if (budgets.length > 0) {
    currentBudget = budgets[budgets.length - 1];
    updateBudgetUI();
  }
};
