let budgets = JSON.parse(localStorage.getItem("budgets")) || [];
let currentBudgetIndex = -1; // track which budget is active
let currentBudget = { title: "New Budget", items: [] };

function startBudget() {
  const titleInput = document.getElementById("new-budget-title");
  const title = titleInput.value.trim();
  if (title) {
    currentBudget = { title: title, items: [] };
    currentBudgetIndex = budgets.length; // new index
    budgets.push(currentBudget);
    saveBudgets();
    renderBudget();
    loadHistory();
    titleInput.value = "";
  }
}

function addItem() {
  const date = document.getElementById("item-date").value;
  const name = document.getElementById("item-name").value.trim();
  const price = parseFloat(document.getElementById("item-price").value);

  if (date && name && !isNaN(price)) {
    const item = { date, name, price };
    currentBudget.items.push(item);
    saveBudgets();
    renderBudget();
    document.getElementById("item-date").value = "";
    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
  }
}

function renderBudget() {
  document.getElementById("budget-title").textContent = currentBudget.title;

  const list = document.getElementById("item-list");
  list.innerHTML = "";
  let total = 0;

  currentBudget.items.forEach((item) => {
    total += item.price;
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="item-date">${item.date}</span> |
      <span class="item-name">${item.name}</span> |
      <span class="item-price">₦${item.price.toFixed(2)}</span>
    `;
    list.appendChild(li);
  });

  document.getElementById("total").textContent = total.toFixed(2);
}

function saveBudgets() {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

function loadHistory() {
  const historyList = document.getElementById("budget-history");
  historyList.innerHTML = "";

  budgets.forEach((b, index) => {
    const total = b.items.reduce((sum, item) => sum + item.price, 0);
    const li = document.createElement("li");
    li.textContent = `${b.title} — ${b.items.length} items — ₦${total.toFixed(2)}`;
    li.style.cursor = "pointer";
    li.onclick = () => loadBudget(index);
    historyList.appendChild(li);
  });
}

function loadBudget(index) {
  currentBudgetIndex = index;
  currentBudget = budgets[index];
  renderBudget();
}

window.onload = () => {
  if (budgets.length > 0) {
    currentBudgetIndex = budgets.length - 1;
    currentBudget = budgets[currentBudgetIndex];
  }
  renderBudget();
  loadHistory();
};
