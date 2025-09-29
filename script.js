// =========================================================================
// 1. GLOBAL STATE & UI ELEMENT REFERENCES
// =========================================================================

// Mock User & Role State (This would normally come from an Authentication service)
let currentUser = null; // Stores the logged-in user object
let currentRole = null; // 'super_admin' or 'subordinate'

// Budget Data Structure (Will be stored in the backend)
let globalAccounts = []; // Stores all named accounts/splits (e.g., GTB-House, UBA-Oblee)
let pendingRequests = []; // Stores spending requests needing admin approval

// UI Elements (Main Layout)
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const adminLinks = document.getElementById('admin-links');
const requestCountBadge = document.getElementById('request-count');

// UI Elements (Navigation)
const navItems = document.querySelectorAll('.nav-item');
const contentViews = document.querySelectorAll('.content-view');

// UI Elements (Auth)
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

// UI Elements (Budget Modal)
const budgetModal = document.getElementById('budget-modal');
const openBudgetModalBtn = document.getElementById('open-new-budget-modal');
const closeModalBtn = budgetModal.querySelector('.close-btn');
const allocationTable = document.getElementById('allocation-table');
const addAllocationBtn = document.getElementById('add-allocation-btn');
const finalizeBudgetBtn = document.getElementById('finalize-budget-btn');
const modalTotalAmountInput = document.getElementById('modal-total-amount');
const allocatedSumDisplay = document.getElementById('allocated-sum');
const allocationRemainingDisplay = document.getElementById('allocation-remaining');

// UI Elements (Spending Request)
const submitRequestBtn = document.getElementById('submit-request-btn');
const spendTargetAccountSelect = document.getElementById('spend-target-account');
const pendingRequestsList = document.getElementById('pending-requests-list');

// =========================================================================
// 2. CORE UTILITY FUNCTIONS
// =========================================================================

/** Renders the active content view based on navigation. */
function navigateTo(hash) {
    contentViews.forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(`${hash}-view`);
    if (targetView) {
        targetView.classList.add('active');
        targetView.classList.remove('hidden');
    }

    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[href="#${hash}"]`).classList.add('active');

    // Run specific rendering functions after navigation
    if (hash === 'dashboard') renderDashboard();
    if (hash === 'accounts') renderAccountManagement();
    if (hash === 'requests') renderPendingRequests();
    if (hash === 'spending') populateAccountSelect();
}

/** Updates the UI visibility based on the current user's role. */
function updateUIVisibility() {
    if (currentRole === 'super_admin') {
        adminLinks.classList.remove('hidden');
    } else {
        adminLinks.classList.add('hidden');
    }
    // Update badge for pending requests
    requestCountBadge.textContent = pendingRequests.length.toString();
}

/** Toggles between the Auth screen and the main App container. */
function toggleAppView(isLoggedIn) {
    if (isLoggedIn) {
        authScreen.classList.remove('active');
        authScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        navigateTo('dashboard'); // Always start at the dashboard
    } else {
        authScreen.classList.add('active');
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
        currentRole = null;
        currentUser = null;
    }
}

// =========================================================================
// 3. MOCK AUTHENTICATION (Replace with real backend calls)
// =========================================================================

function handleLogin() {
    // In a real app: Call Firebase/Supabase login function
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (email === 'admin@budgetit.com' && password === '123456') {
        currentUser = { id: 'u1', email: email, name: 'Super Admin' };
        currentRole = 'super_admin';
        initializeAppData(); // Load data after login
        updateUIVisibility();
        toggleAppView(true);
    } else if (email === 'user@budgetit.com' && password === '123456') {
        currentUser = { id: 'u2', email: email, name: 'Regular User' };
        currentRole = 'subordinate';
        initializeAppData(); // Load data after login
        updateUIVisibility();
        toggleAppView(true);
    } else {
        alert("Login failed. Use admin@budgetit.com or user@budgetit.com (password: 123456)");
    }
}

function handleLogout() {
    // In a real app: Call Firebase/Supabase logout function
    toggleAppView(false);
}


// =========================================================================
// 4. DATA MANAGEMENT & INITIALIZATION (Mock Backend)
// =========================================================================

/** Loads mock data after successful login. */
function initializeAppData() {
    // Mock Data for Accounts/Splits
    globalAccounts = JSON.parse(localStorage.getItem('globalAccounts')) || [
        { id: 'a1', name: 'GTB (House)', allocated: 150000, spent: 25000, creatorId: 'u1' },
        { id: 'a2', name: 'UBA (Oblee)', allocated: 50000, spent: 10000, creatorId: 'u1' },
        { id: 'a3', name: 'Providus (Subscriptions)', allocated: 15000, spent: 5000, creatorId: 'u1' }
    ];

    // Mock Data for Pending Requests
    pendingRequests = JSON.parse(localStorage.getItem('pendingRequests')) || [
        { id: 'r1', accountId: 'a1', accountName: 'GTB (House)', amount: 1500, description: 'New light bulb', submittedBy: 'Regular User', date: new Date().toISOString().split('T')[0] }
    ];
}

/** Saves data back to local storage (for persistent mock data). */
function saveMockData() {
    localStorage.setItem('globalAccounts', JSON.stringify(globalAccounts));
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
    updateUIVisibility();
}


// =========================================================================
// 5. BUDGET SPLITTING & ACCOUNT MANAGEMENT LOGIC
// =========================================================================

/** Renders the current allocation rows inside the modal. */
function renderAllocationRows() {
    // Clear the table before rendering
    allocationTable.innerHTML = '';
    
    // Add one initial row for the user to start
    addAllocationRow();
    
    // Ensure calculation is run immediately
    updateAllocationSummary();
}

/** Adds a new input row for account name and amount. */
function addAllocationRow(name = '', amount = '') {
    const row = document.createElement('div');
    row.className = 'allocation-row';
    row.innerHTML = `
        <input type="text" class="account-name" placeholder="Account Name (e.g. GTB - House)" value="${name}">
        <input type="number" class="account-amount" placeholder="Amount (₦)" value="${amount}">
        <button class="remove-account-btn"><i class="fas fa-times-circle"></i></button>
    `;
    
    // Event listener for removing the row
    row.querySelector('.remove-account-btn').addEventListener('click', (e) => {
        row.remove();
        updateAllocationSummary(); // Recalculate after removal
    });

    // Event listener for changes to update summary dynamically
    row.querySelector('.account-amount').addEventListener('input', updateAllocationSummary);
    
    allocationTable.appendChild(row);
}

/** Calculates and displays the allocated sum and remaining funds to allocate. */
function updateAllocationSummary() {
    const totalBudget = parseFloat(modalTotalAmountInput.value) || 0;
    let allocatedSum = 0;
    
    document.querySelectorAll('.allocation-row .account-amount').forEach(input => {
        allocatedSum += parseFloat(input.value) || 0;
    });

    const remainingToAllocate = totalBudget - allocatedSum;

    allocatedSumDisplay.textContent = allocatedSum.toFixed(2);
    allocationRemainingDisplay.textContent = remainingToAllocate.toFixed(2);
    
    // Simple UI feedback for over/under-allocation
    if (remainingToAllocate < 0) {
        allocationRemainingDisplay.style.color = 'red';
    } else if (remainingToAllocate > 0) {
        allocationRemainingDisplay.style.color = 'darkorange';
    } else {
        allocationRemainingDisplay.style.color = 'green';
    }
}

/** Finalizes the new budget and saves the splits to globalAccounts. */
function handleFinalizeBudget() {
    const totalBudget = parseFloat(modalTotalAmountInput.value) || 0;
    const budgetTitle = document.getElementById('modal-budget-title').value.trim();
    
    if (!budgetTitle || totalBudget <= 0) {
        alert("Please enter a valid title and total budget.");
        return;
    }

    let accountsToAdd = [];
    let allocatedSum = 0;

    document.querySelectorAll('.allocation-row').forEach(row => {
        const name = row.querySelector('.account-name').value.trim();
        const amount = parseFloat(row.querySelector('.account-amount').value);
        
        if (name && amount > 0) {
            accountsToAdd.push({
                id: `a${Date.now() + Math.random().toFixed(0)}`, // Unique ID
                name: name,
                allocated: amount,
                spent: 0, // Start with zero spent
                creatorId: currentUser.id
            });
            allocatedSum += amount;
        }
    });
    
    if (allocatedSum !== totalBudget) {
        if (!confirm(`Warning: Your allocated sum (₦${allocatedSum.toFixed(2)}) does not match the total budget (₦${totalBudget.toFixed(2)}). Do you want to save anyway?`)) {
            return;
        }
    }

    // Add new accounts to the global list
    globalAccounts.push(...accountsToAdd);
    saveMockData();
    alert(`Budget "${budgetTitle}" created with ${accountsToAdd.length} accounts.`);
    
    budgetModal.classList.add('hidden');
    renderAccountManagement(); // Update the accounts list view
}

// =========================================================================
// 6. DASHBOARD & DISPLAY FUNCTIONS
// =========================================================================

/** Renders the main dashboard view. */
function renderDashboard() {
    let totalBudget = 0;
    let totalSpent = 0;
    
    // Calculate totals across all accounts
    globalAccounts.forEach(account => {
        totalBudget += account.allocated;
        totalSpent += account.spent;
    });

    const totalRemaining = totalBudget - totalSpent;
    
    // Update Stat Cards
    document.getElementById('dash-total-budget').textContent = `₦${totalBudget.toFixed(2)}`;
    document.getElementById('dash-total-spent').textContent = `₦${totalSpent.toFixed(2)}`;
    document.getElementById('dash-total-remaining').textContent = `₦${totalRemaining.toFixed(2)}`;
    
    // Render Account Cards
    const container = document.getElementById('account-cards-container');
    container.innerHTML = '';

    globalAccounts.forEach(account => {
        const remaining = account.allocated - account.spent;
        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
            <h4>${account.name}</h4>
            <p>Allocated: ₦${account.allocated.toFixed(2)}</p>
            <p>Spent: ₦${account.spent.toFixed(2)}</p>
            <p style="color: ${remaining < 0 ? 'red' : 'green'}; font-weight: bold;">Remaining: ₦${remaining.toFixed(2)}</p>
        `;
        container.appendChild(card);
    });
}

/** Renders the list of all saved budgets/accounts for the Admin view. */
function renderAccountManagement() {
    // This view displays the list of all accounts defined
    const list = document.getElementById('saved-budgets-list');
    list.innerHTML = '';
    
    globalAccounts.forEach(account => {
        const remaining = account.allocated - account.spent;
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${account.name} (ID: ${account.id})</span>
            <span>Budget: ₦${account.allocated.toFixed(2)} | Remaining: ₦${remaining.toFixed(2)}</span>
        `;
        list.appendChild(li);
    });
}

// =========================================================================
// 7. SPENDING REQUEST & APPROVAL LOGIC
// =========================================================================

/** Populates the dropdown menu for spending requests. */
function populateAccountSelect() {
    spendTargetAccountSelect.innerHTML = '<option value="">Select Account</option>';
    globalAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        spendTargetAccountSelect.appendChild(option);
    });
}

/** Handles a subordinate submitting a spending request. */
function handleSubmitRequest() {
    const amount = parseFloat(document.getElementById('spend-amount').value);
    const accountId = spendTargetAccountSelect.value;
    const description = document.getElementById('spend-description').value.trim();

    if (!amount || amount <= 0 || !accountId || !description) {
        alert("Please fill out all fields with valid data.");
        return;
    }
    
    const targetAccount = globalAccounts.find(a => a.id === accountId);

    const newRequest = {
        id: `r${Date.now()}`,
        accountId: accountId,
        accountName: targetAccount ? targetAccount.name : 'Unknown',
        amount: amount,
        description: description,
        submittedBy: currentUser.name,
        date: new Date().toISOString().split('T')[0]
    };

    pendingRequests.push(newRequest);
    saveMockData();
    alert("Spending request submitted for approval!");
    
    // Clear form
    document.getElementById('spend-amount').value = '';
    document.getElementById('spend-description').value = '';
    spendTargetAccountSelect.value = '';
}

/** Renders the list of pending requests for the Super Admin. */
function renderPendingRequests() {
    // Only proceed if admin
    if (currentRole !== 'super_admin') return;

    pendingRequestsList.innerHTML = '';

    if (pendingRequests.length === 0) {
        pendingRequestsList.innerHTML = '<p>No pending requests.</p>';
        return;
    }

    pendingRequests.forEach(request => {
        const item = document.createElement('li');
        item.innerHTML = `
            <div>
                <strong>${request.accountName}</strong> | ₦${request.amount.toFixed(2)}
                <p style="font-size:0.9em; margin: 5px 0 0;">${request.description} - By: ${request.submittedBy}</p>
            </div>
            <div>
                <button class="approve-btn" data-id="${request.id}"><i class="fas fa-check"></i> Approve</button>
                <button class="reject-btn" data-id="${request.id}"><i class="fas fa-times"></i> Reject</button>
            </div>
        `;
        pendingRequestsList.appendChild(item);
    });
    
    // Add event listeners for approval/rejection buttons
    pendingRequestsList.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => handleApproval(btn.dataset.id, true));
    });
    
    pendingRequestsList.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => handleApproval(btn.dataset.id, false));
    });
}

/** Handles the Super Admin approving or rejecting a request. */
function handleApproval(requestId, isApproved) {
    const index = pendingRequests.findIndex(r => r.id === requestId);
    if (index === -1) return;
    
    const request = pendingRequests[index];
    
    if (isApproved) {
        // 1. Find the target account and update its spent total
        const targetAccount = globalAccounts.find(a => a.id === request.accountId);
        if (targetAccount) {
            targetAccount.spent += request.amount;
            alert(`Approved! ₦${request.amount.toFixed(2)} added to ${targetAccount.name}'s spent total.`);
        }
    } else {
        alert(`Rejected! Request ₦${request.amount.toFixed(2)} from ${request.submittedBy} denied.`);
    }

    // 2. Remove the request from the pending list
    pendingRequests.splice(index, 1);
    
    // 3. Save data and re-render the view
    saveMockData();
    renderPendingRequests();
    renderDashboard(); // Update dashboard totals
}


// =========================================================================
// 8. INITIALIZATION & EVENT LISTENERS
// =========================================================================

// Initial check (starts on the login screen)
window.onload = () => {
    toggleAppView(false); 
};

// --- Authentication Listeners ---
loginBtn.addEventListener('click', handleLogin);
signupBtn.addEventListener('click', () => alert("Sign up functionality not implemented yet. Please log in as admin or user."));
logoutBtn.addEventListener('click', handleLogout);

// --- Navigation Listeners ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = e.currentTarget.getAttribute('href').substring(1); // Removes the '#'
        navigateTo(hash);
    });
});

// --- Modal Listeners ---
openBudgetModalBtn.addEventListener('click', () => {
    budgetModal.classList.remove('hidden');
    renderAllocationRows();
});
closeModalBtn.addEventListener('click', () => {
    budgetModal.classList.add('hidden');
});
modalTotalAmountInput.addEventListener('input', updateAllocationSummary);
addAllocationBtn.addEventListener('click', () => {
    addAllocationRow();
    updateAllocationSummary();
});
finalizeBudgetBtn.addEventListener('click', handleFinalizeBudget);

// --- Spending Request Listener ---
submitRequestBtn.addEventListener('click', handleSubmitRequest);
