document.addEventListener("DOMContentLoaded", () => {
  const startBudgetBtn = document.getElementById("startBudgetBtn");
  const addItemBtn = document.getElementById("addItemBtn");
  const saveBudgetBtn = document.getElementById("saveBudgetBtn");

  const budgetTitleInput = document.getElementById("budgetTitle");
  const budgetAmountInput = document.getElementById("budgetAmount");

  const budgetDetails = document.getElementById("budgetDetails");
  const totalBudgetEl = document.getElementById("totalBudget");
  const remainingBudgetEl = document.getElementById("remainingBudget");
  const itemDateInput = document.getElementById("itemDate");
  const itemNameInput = document.getElementById("itemName");
  const itemPriceInput = document.getElementById("itemPrice");
  const itemList = document.getElementById("itemList");

  const savedBudgetsList = document.getElementById("savedBudgetsList");

  const modal = document.getElementById("budgetModal");
  const closeModal = document.getElementById("closeModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalTotal = document.getElementById("modalTotal");
  const modalRemaining = document.getElementById("modalRemaining");
  const modalItems = document.getElementById("modalItems");

  let currentBudget = null;
  let budgets = JSON.parse(localStorage.getItem("budgets")) || [];

  // --- Start Budget ---
  startBudgetBtn.addEventListener("click", () => {
    const title = budgetTitleInput.value.trim();
    const totalAmount = parseFloat(budgetAmountInput.value);

    if (!title || isNaN(totalAmount) || totalAmount <= 0) {
      alert("Enter a valid title and amount");
      return;
    }

    currentBudget = {
      title,
      total: totalAmount,
      remaining: totalAmount,
      items: []
    };

    budgetDetails.classList.remove("hidden");
    updateBudgetDisplay();
  });

  // --- Add Item ---
  addItemBtn.addEventListener("click", () => {
    if (!currentBudget) return;

    const date = itemDateInput.value;
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);

    if (!date || !name || isNaN(price) || price <= 0) {
      alert("Fill all fields correctly");
      return;
    }

    currentBudget.items.push({ date, name, price });
    currentBudget.remaining -= price;

    updateBudgetDisplay();

    // Reset inputs
    itemDateInput.value = "";
    itemNameInput.value = "";
    itemPriceInput.value = "";
  });

  // --- Save Budget ---
  saveBudgetBtn.addEventListener("click", () => {
    if (!currentBudget) return;

    budgets.push(currentBudget);
    localStorage.setItem("budgets", JSON.stringify(budgets));

    renderSavedBudgets();
    budgetDetails.classList.add("hidden");
    budgetTitleInput.value = "";
    budgetAmountInput.value = "";
    currentBudget = null;
    itemList.innerHTML = "";
    alert("Budget saved!");
  });

  // --- Update Display ---
  function updateBudgetDisplay() {
    if (!currentBudget) return;

    totalBudgetEl.textContent = currentBudget.total.toFixed(2);
    remainingBudgetEl.textContent = currentBudget.remaining.toFixed(2);

    // Color logic
    const percentageRemaining = (currentBudget.remaining / currentBudget.total) * 100;
    remainingBudgetEl.classList.remove("remaining-normal", "remaining-warning", "remaining-danger");

    if (currentBudget.remaining < 0) {
      remainingBudgetEl.classList.add("remaining-danger");
    } else if (percentageRemaining <= 10) {
      remainingBudgetEl.classList.add("remaining-warning");
    } else {
      remainingBudgetEl.classList.add("remaining-normal");
    }

    // Item list
    itemList.innerHTML = "";
    currentBudget.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.date} - ${item.name}: ₦${item.price.toFixed(2)}`;
      itemList.appendChild(li);
    });
  }

  // --- Render Saved Budgets ---
  function renderSavedBudgets() {
    savedBudgetsList.innerHTML = "";

    budgets.forEach((budget, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${budget.title} - ₦${budget.total.toFixed(2)}</span>
        <div>
          <button class="viewBtn">View</button>
          <button class="deleteBtn">Delete</button>
        </div>
      `;

      // View button
      li.querySelector(".viewBtn").addEventListener("click", () => {
        openBudgetModal(budget);
      });

      // Delete button
      li.querySelector(".deleteBtn").addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this budget?")) {
          budgets.splice(index, 1);
          localStorage.setItem("budgets", JSON.stringify(budgets));
          renderSavedBudgets();
        }
      });

      savedBudgetsList.appendChild(li);
    });
  }

  // --- Open Modal ---
  function openBudgetModal(budget) {
    modalTitle.textContent = budget.title;
    modalTotal.textContent = budget.total.toFixed(2);
    modalRemaining.textContent = budget.remaining.toFixed(2);

    modalItems.innerHTML = "";
    budget.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.date} - ${item.name}: ₦${item.price.toFixed(2)}`;
      modalItems.appendChild(li);
    });

    modal.classList.remove("hidden");
  }

  // --- Close Modal ---
  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Initialize
  renderSavedBudgets();
});
