let budgets = JSON.parse(localStorage.getItem("budgets")) || [];
let currentBudget = null;

const budgetTitleInput = document.getElementById("budget-title");
const totalBudgetInput = document.getElementById("total-budget");
const startBudgetBtn = document.getElementById("start-budget");
const budgetInfo = document.getElementById("budget-info");
const currentBudgetTitle = document.getElementById("current-budget-title");
const budgetTotal = document.getElementById("budget-total");
const budgetRemaining = document.getElementById("budget-remaining");

const itemDate = document.getElementById("item-date");
const itemName = document.getElementById("item-name");
const itemPrice = document.getElementById("item-price");
const addItemBtn = document.getElementById("add-item");
const itemsSection = document.getElementById("items-section");
const itemsList = document.getElementById("items-list");

const budgetsList = document.getElementById("budgets-list");

function saveBudgets() {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

function renderBudgets() {
  budgetsList.innerHTML = "";
  budgets.forEach((b, i) => {
    const li = document.createElement("li");
    li.textContent = `${b.title} - Total: ₦${b.total}, Remaining: ₦${b.remaining}`;
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      if (confirm("Delete this budget?")) {
        budgets.splice(i, 1);
        saveBudgets();
        renderBudgets();
      }
    };
    li.appendChild(delBtn);
    budgetsList.appendChild(li);
  });
}

function renderItems() {
  itemsList.innerHTML = "";
  currentBudget.items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.date} | ${item.name} | ₦${item.price}`;
    itemsList.appendChild(li);
  });
}

startBudgetBtn.addEventListener("click", () => {
  const title = budgetTitleInput.value;
  const total = parseFloat(totalBudgetInput.value);

  if (!title || isNaN(total)) return alert("Enter title and total");

  currentBudget = {
    title,
    total,
    remaining: total,
    items: []
  };

  budgets.push(currentBudget);
  saveBudgets();
  renderBudgets();

  currentBudgetTitle.textContent = title;
  budgetTotal.textContent = total.toFixed(2);
  budgetRemaining.textContent = total.toFixed(2);

  budgetInfo.classList.remove("hidden");
  itemsSection.classList.remove("hidden");
});

addItemBtn.addEventListener("click", () => {
  if (!currentBudget) return;

  const date = itemDate.value;
  const name = itemName.value;
  const price = parseFloat(itemPrice.value);

  if (!date || !name || isNaN(price)) return alert("Fill all fields");

  currentBudget.items.push({ date, name, price });
  currentBudget.remaining -= price;

  budgetRemaining.textContent = currentBudget.remaining.toFixed(2);

  if (currentBudget.remaining <= 0) {
    budgetRemaining.className = "remaining-danger";
  } else if (currentBudget.remaining <= currentBudget.total * 0.1) {
    budgetRemaining.className = "remaining-warning";
  } else {
    budgetRemaining.className = "";
  }

  saveBudgets();
  renderItems();

  itemDate.value = "";
  itemName.value = "";
  itemPrice.value = "";
});

renderBudgets();
