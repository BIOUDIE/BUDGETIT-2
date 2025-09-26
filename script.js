document.addEventListener("DOMContentLoaded", () => {
  const startBudgetBtn = document.getElementById("start-budget");
  const budgetTitleInput = document.getElementById("budget-title");
  const budgetTotalInput = document.getElementById("budget-total");
  const budgetDetails = document.getElementById("budget-details");
  const displayTitle = document.getElementById("display-title");
  const setTotal = document.getElementById("set-total");
  const remainingAmount = document.getElementById("remaining-amount");
  const itemNameInput = document.getElementById("item-name");
  const itemAmountInput = document.getElementById("item-amount");
  const itemDateInput = document.getElementById("item-date");
  const addItemBtn = document.getElementById("add-item");
  const itemsList = document.getElementById("items-list");
  const totalAmount = document.getElementById("total-amount");
  const budgetList = document.getElementById("budget-list");

  let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
  let currentBudget = null;

  function updateRemainingStatus(total, spent) {
    const remaining = total - spent;
    remainingAmount.textContent = remaining;

    remainingAmount.className = "";

    if (remaining < 0) {
      remainingAmount.classList.add("status-danger");
    } else if (remaining <= total * 0.1) {
      remainingAmount.classList.add("status-warning");
    } else {
      remainingAmount.classList.add("status-normal");
    }
  }

  function renderSavedBudgets() {
    budgetList.innerHTML = "";
    Object.keys(budgets).forEach(title => {
      const li = document.createElement("li");
      li.textContent = title;
      li.addEventListener("click", () => loadBudget(title));
      budgetList.appendChild(li);
    });
  }

  function loadBudget(title) {
    currentBudget = title;
    displayTitle.textContent = title;
    budgetDetails.classList.remove("hidden");

    const budget = budgets[title];
    setTotal.textContent = budget.total || 0;

    itemsList.innerHTML = "";
    let spent = 0;
    budget.items.forEach(item => {
      spent += item.amount;
      addItemToDOM(item);
    });

    totalAmount.textContent = spent;
    updateRemainingStatus(budget.total || 0, spent);
  }

  function addItemToDOM(item) {
    const li = document.createElement("li");

    const dateSpan = document.createElement("span");
    dateSpan.className = "date";
    dateSpan.textContent = item.date;

    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = item.name;

    const amountSpan = document.createElement("span");
    amountSpan.className = "amount";
    amountSpan.textContent = `₦${item.amount}`;

    li.appendChild(dateSpan);
    li.appendChild(nameSpan);
    li.appendChild(amountSpan);

    itemsList.appendChild(li);
  }

  startBudgetBtn.addEventListener("click", () => {
    const title = budgetTitleInput.value.trim();
    const total = parseFloat(budgetTotalInput.value);

    if (title && !isNaN(total)) {
      if (!budgets[title]) {
        budgets[title] = { total, items: [] };
      } else {
        budgets[title].total = total;
      }
      localStorage.setItem("budgets", JSON.stringify(budgets));
      loadBudget(title);
    }
  });

  addItemBtn.addEventListener("click", () => {
    const name = itemNameInput.value.trim();
    const amount = parseFloat(itemAmountInput.value);
    const date = itemDateInput.value;

    if (name && !isNaN(amount) && date && currentBudget) {
      const item = { name, amount, date };
      budgets[currentBudget].items.push(item);
      localStorage.setItem("budgets", JSON.stringify(budgets));

      addItemToDOM(item);

      const spent = budgets[currentBudget].items.reduce((sum, i) => sum + i.amount, 0);
      totalAmount.textContent = spent;
      updateRemainingStatus(budgets[currentBudget].total, spent);

      itemNameInput.value = "";
      itemAmountInput.value = "";
      itemDateInput.value = "";
    }
  });

  renderSavedBudgets();
});
