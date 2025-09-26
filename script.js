const startBtn = document.getElementById("startBudgetBtn");
const budgetAmount = document.getElementById("budgetAmount");
const budgetTitle = document.getElementById("budgetTitle");
const totalBudget = document.getElementById("totalBudget");
const remainingBudget = document.getElementById("remainingBudget");
const budgetDetails = document.getElementById("budgetDetails");
const itemName = document.getElementById("itemName");
const itemPrice = document.getElementById("itemPrice");
const itemDate = document.getElementById("itemDate");
const addItemBtn = document.getElementById("addItemBtn");
const itemList = document.getElementById("itemList");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const savedBudgetsList = document.getElementById("savedBudgetsList");

// Modal
const budgetModal = document.getElementById("budgetModal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalTotal = document.getElementById("modalTotal");
const modalRemaining = document.getElementById("modalRemaining");
const modalItems = document.getElementById("modalItems");

let budget = {
  title: "",
  total: 0,
  remaining: 0,
  items: []
};

startBtn.addEventListener("click", () => {
  const title = budgetTitle.value.trim();
  const amount = parseFloat(budgetAmount.value);

  if (title && amount > 0) {
    budget = { title, total: amount, remaining: amount, items: [] };
    totalBudget.textContent = amount.toFixed(2);
    updateRemaining();
    budgetDetails.classList.remove("hidden");
  }
});

addItemBtn.addEventListener("click", () => {
  const name = itemName.value.trim();
  const price = parseFloat(itemPrice.value);
  const date = itemDate.value;

  if (name && price > 0 && date) {
    budget.items.push({ date, name, price });
    budget.remaining -= price;

    renderItems();
    updateRemaining();

    itemName.value = "";
    itemPrice.value = "";
    itemDate.value = "";
  }
});

function renderItems() {
  itemList.innerHTML = "";
  budget.items.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.date} | ${i.name} | ₦${i.price.toFixed(2)}`;
    itemList.appendChild(li);
  });
}

function updateRemaining() {
  remainingBudget.textContent = budget.remaining.toFixed(2);

  remainingBudget.classList.remove("remaining-normal", "remaining-warning", "remaining-danger");

  if (budget.remaining <= 0) {
    remainingBudget.classList.add("remaining-danger");
  } else if (budget.remaining <= budget.total * 0.1) {
    remainingBudget.classList.add("remaining-warning");
  } else {
    remainingBudget.classList.add("remaining-normal");
  }
}

saveBudgetBtn.addEventListener("click", () => {
  const budgets = JSON.parse(localStorage.getItem("budgets")) || [];
  budgets.push(budget);
  localStorage.setItem("budgets", JSON.stringify(budgets));
  loadSavedBudgets();
  alert("Budget saved!");
});

function loadSavedBudgets() {
  savedBudgetsList.innerHTML = "";
  const budgets = JSON.parse(localStorage.getItem("budgets")) || [];

  budgets.forEach((b, index) => {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.textContent = `${b.title} - ₦${b.total.toFixed(2)}`;

    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View";
    viewBtn.style.background = "teal";
    viewBtn.addEventListener("click", () => {
      openModal(b);
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      if (confirm(`Delete budget "${b.title}"?`)) {
        budgets.splice(index, 1);
        localStorage.setItem("budgets", JSON.stringify(budgets));
        loadSavedBudgets();
      }
    });

    li.appendChild(text);
    li.appendChild(viewBtn);
    li.appendChild(delBtn);
    savedBudgetsList.appendChild(li);
  });
}

function openModal(b) {
  modalTitle.textContent = b.title;
  modalTotal.textContent = b.total.toFixed(2);
  modalRemaining.textContent = b.remaining.toFixed(2);
  modalItems.innerHTML = "";
  b.items.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.date} | ${i.name} | ₦${i.price.toFixed(2)}`;
    modalItems.appendChild(li);
  });
  budgetModal.classList.remove("hidden");
}

closeModal.addEventListener("click", () => {
  budgetModal.classList.add("hidden");
});

// Load saved budgets on startup
loadSavedBudgets();
