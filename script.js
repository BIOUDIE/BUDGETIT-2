let budgets = JSON.parse(localStorage.getItem("budgets")) || [];
let currentBudget = { title: "New Budget", items: [] };

function startBudget() {
  const titleInput = document.getElementById("new-budget-title");
  const title = titleInput.value.trim();
  if (title) {
    currentBudget = { title: title, items: [] };
    document.getElementById("budget-title").textContent = title;
    document.getElementById("item-list").innerHTML = "";
    document.getElementById("total").textContent = "0";
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
    updateList();
    document.getElementById("item-date").value = "";
    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
  }
}

function updateList() {
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

window.addEventListener("beforeunload", () => {
  if (currentBudget.items.length > 0) {
    budgets.push(currentBudget);
    localStorage.setItem("budgets", JSON.stringify(budgets));
  }
});

function loadHistory() {
  const historyList = document.getElementById("budget-history");
  historyList.innerHTML = "";
  budgets.forEach((b) => {
    const li = document.createElement("li");
    li.textContent = `${b.title} - ${b.items.length} items`;
    historyList.appendChild(li);
  });
}

window.onload = loadHistory;
