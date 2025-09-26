let currentBudget = null;
let items = [];

function startBudget() {
  const title = document.getElementById("budgetTitle").value;
  const date = document.getElementById("budgetDate").value;
  const total = parseFloat(document.getElementById("totalBudget").value);

  if (!title || !date || isNaN(total)) {
    alert("Please fill all fields");
    return;
  }

  currentBudget = { title, date, total, balance: total, items: [] };
  items = [];

  document.getElementById("activeTitle").textContent = title;
  document.getElementById("activeDate").textContent = date;
  document.getElementById("budgetAmount").textContent = total;
  document.getElementById("balance").textContent = total;

  document.getElementById("itemList").innerHTML = "";
  document.getElementById("activeBudget").classList.remove("hidden");
}

function addItem() {
  if (!currentBudget) return;

  const name = document.getElementById("itemName").value;
  const price = parseFloat(document.getElementById("itemPrice").value);
  const date = document.getElementById("itemDate").value;

  if (!name || isNaN(price) || !date) {
    alert("Enter item, price and date");
    return;
  }

  currentBudget.items.push({ name, price, date });
  currentBudget.balance -= price;

  const li = document.createElement("li");
  li.textContent = `${name} - ₦${price} (${date})`;
  document.getElementById("itemList").appendChild(li);

  document.getElementById("balance").textContent = currentBudget.balance;

  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemDate").value = "";
}

function saveBudget() {
  if (!currentBudget) return;

  let saved = JSON.parse(localStorage.getItem("budgets")) || [];
  saved.push(currentBudget);
  localStorage.setItem("budgets", JSON.stringify(saved));

  loadSavedBudgets();
  alert("Budget saved!");
  currentBudget = null;
  document.getElementById("activeBudget").classList.add("hidden");
}

function loadSavedBudgets() {
  const saved = JSON.parse(localStorage.getItem("budgets")) || [];
  const list = document.getElementById("savedList");
  list.innerHTML = "";

  saved.forEach((budget, index) => {
    const li = document.createElement("li");
    li.textContent = `${budget.title} (${budget.date}) - ₦${budget.total}`;
    li.onclick = () => viewBudget(index);
    list.appendChild(li);
  });
}

function viewBudget(index) {
  const saved = JSON.parse(localStorage.getItem("budgets")) || [];
  const budget = saved[index];

  let details = `Title: ${budget.title}\nDate: ${budget.date}\nTotal: ₦${budget.total}\nBalance: ₦${budget.balance}\n\nItems:\n`;
  budget.items.forEach(i => {
    details += `${i.name}: ₦${i.price} (${i.date})\n`;
  });

  alert(details);
}

loadSavedBudgets();
