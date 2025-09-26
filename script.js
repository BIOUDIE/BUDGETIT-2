let currentBudget = {
  title: "",
  total: 0,
  remaining: 0,
  items: []
};

const totalBudgetInput = document.getElementById("total-budget");
const budgetTitleInput = document.getElementById("budget-title");
const totalDisplay = document.getElementById("total");
const remainingDisplay = document.getElementById("remaining");
const itemDateInput = document.getElementById("item-date");
const itemNameInput = document.getElementById("item-name");
const itemPriceInput = document.getElementById("item-price");
const itemList = document.getElementById("item-list");
const savedBudgetsList = document.getElementById("saved-budgets");

document.getElementById("start-budget").addEventListener("click", () => {
  currentBudget.title = budgetTitleInput.value.trim();
  currentBudget.total = parseFloat(totalBudgetInput.value) || 0;
  currentBudget.remaining = currentBudget.total;
  currentBudget.items = [];
  updateList();
  updateRemaining();
});

document.getElementById("add-item").addEventListener("click", () => {
  const name = itemNameInput.value.trim();
  const price = parseFloat(itemPriceInput.value);
  const date = itemDateInput.value;

  if (!name || isNaN(price) || !date) return;

  currentBudget.items.push({ date, name, price });
  currentBudget.remaining -= price;

  itemNameInput.value = "";
  itemPriceInput.value = "";
  itemDateInput.value = "";

  updateList();
  updateRemaining();
});

document.getElementById("save-budget").addEventListener("click", () => {
  if (!currentBudget.title) {
    alert("Enter a budget title before saving.");
    return;
  }
  const budgets = JSON.parse(localStorage.getItem("budgets")) || [];
  budgets.push(currentBudget);
  localStorage.setItem("budgets", JSON.stringify(budgets));
  loadSavedBudgets();
  alert("Budget saved!");
});

function updateList() {
  itemList.innerHTML = "";
  let total = 0;
  currentBudget.items.forEach((item) => {
    total += item.price;
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="item-date">${item.date}</span> |
      <span class="item-name">${item.name}</span> |
      <span class="item-price">₦${item.price.toFixed(2)}</span>
    `;
    itemList.appendChild(li);
  });
  totalDisplay.textContent = total.toFixed(2);
}

function updateRemaining() {
  remainingDisplay.textContent = `₦${currentBudget.remaining.toFixed(2)}`;
  const percent = (currentBudget.remaining / currentBudget.total) * 100;

  remainingDisplay.style.color = "green";

  if (percent <= 10 && percent >= 0) {
    remainingDisplay.style.color = "darkorange"; // amber
  } else if (percent < 0) {
    remainingDisplay.style.color = "red";
  }
}

function loadSavedBudgets() {
  savedBudgetsList.innerHTML = "";
  const budgets = JSON.parse(localStorage.getItem("budgets")) || [];
  budgets.forEach((b) => {
    const li = document.createElement("li");
    li.textContent = `${b.title} - ₦${b.total.toFixed(2)}`;
    savedBudgetsList.appendChild(li);
  });
}

window.onload = loadSavedBudgets;
