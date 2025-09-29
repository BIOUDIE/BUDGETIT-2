// =========================================================================
// 0. GLOBAL VARIABLES & INITIAL SETUP
// =========================================================================

// Global variables (assumed from index.html)
// const auth = firebase.auth();
// const db = firebase.firestore();
// const ORGANIZATION_ID = "main_budget_org_1";

let userRole = 'member';
let currentActiveView = 'dashboard-view';
let userAccountType = 'personal'; 

// =========================================================================
// 1. DOM ELEMENTS & CONSTANTS
// =========================================================================

// Screens
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');

// Auth elements
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

// App elements
const navItems = document.querySelectorAll('.nav-item');
const logoutBtn = document.getElementById('logout-btn');
const adminLinks = document.getElementById('admin-links');
const requestCountBadge = document.getElementById('request-count');
const spendingNavItem = document.getElementById('spending-nav-item');

// Dashboard
const dashTotalBudget = document.getElementById('dash-total-budget');
const dashTotalSpent = document.getElementById('dash-total-spent');
const dashTotalRemaining = document.getElementById('dash-total-remaining');
const accountCardsContainer = document.getElementById('account-cards-container');

// Accounts View
const openNewBudgetModalBtn = document.getElementById('open-new-budget-modal');
const savedBudgetsList = document.getElementById('saved-budgets-list');
const archivedBudgetsList = document.getElementById('archived-budgets-list');
const archiveBudgetBtn = document.getElementById('archive-budget-btn');

// Spending View
const spendDate = document.getElementById('spend-date'); // NEW ELEMENT
const spendAmount = document.getElementById('spend-amount');
const spendTargetAccount = document.getElementById('spend-target-account');
const spendDescription = document.getElementById('spend-description');
const submitRequestBtn = document.getElementById('submit-request-btn');
const spendingViewTitle = document.getElementById('spending-view-title');

// Budget Modal
const budgetModal = document.getElementById('budget-modal');
const modalBudgetTitle = document.getElementById('modal-budget-title');
const modalTotalAmount = document.getElementById('modal-total-amount');
const modalOtherDetails = document.getElementById('modal-other-details');
const allocationTable = document.getElementById('allocation-table');
const addAllocationBtn = document.getElementById('add-allocation-btn');
const allocatedSumSpan = document.getElementById('allocated-sum');
const allocationRemainingSpan = document.getElementById('allocation-remaining');
const finalizeBudgetBtn = document.getElementById('finalize-budget-btn');

// History Modal
const historyModal = document.getElementById('history-modal');
const historyList = document.getElementById('history-list');
const historyModalTitle = document.getElementById('history-modal-title');


// =========================================================================
// 2. AUTHENTICATION & INITIAL LOAD (FIXES 1.1 & 2.0)
// =========================================================================

loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(authEmail.value, authPassword.value)
        .catch(error => {
            alert("Login Error: " + error.message);
        });
});

signupBtn.addEventListener('click', signupUser); 

async function signupUser() {
    const email = authEmail.value;
    const password = authPassword.value;
    const accountType = document.querySelector('input[name="account-type"]:checked').value; 
    // IMPORTANT: Corporate/Joint accounts should default to admin for the first user, or be manually assigned. 
    // For this corporate/joint account fix, we'll assign the first user as admin if they choose joint.
    const role = (accountType === 'joint') ? 'admin' : 'member'; 

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.collection('users').doc(user.uid).set({
            email: user.email,
            role: role, // Default role based on selection
            accountType: accountType, 
            organizationId: ORGANIZATION_ID
        });

        alert("Sign up successful! Welcome.");
    } catch (error) {
        alert("Sign Up Error: " + error.message);
    }
}

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userRole = userData.role;
                userAccountType = userData.accountType || 'personal'; 
                
                // FIX 1.1: Restoring Admin Links for Corporate Accounts
                if (userRole === 'admin') {
                    adminLinks.classList.remove('hidden');
                    // listenForPendingRequests(); // Re-enable listener if you have it
                } else {
                    adminLinks.classList.add('hidden');
                }

                authScreen.classList.remove('active');
                authScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');

                updateSpendingWorkflow(userAccountType);

                // Initial data load
                renderDashboard();
                renderAccountsView();
            } else {
                auth.signOut();
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            auth.signOut();
        }
    } else {
        authScreen.classList.add('active');
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// =========================================================================
// 3. NAVIGATION & UI MANAGEMENT
// =========================================================================

function handleNavigation(hash) {
    const targetView = document.getElementById(hash.substring(1) + '-view');
    const allViews = document.querySelectorAll('.content-view');

    allViews.forEach(view => view.classList.add('hidden'));

    if (targetView) {
        targetView.classList.remove('hidden');
        currentActiveView = hash.substring(1) + '-view';
    }

    navItems.forEach(item => item.classList.remove('active'));
    const activeNavItem = document.querySelector(`.nav-item[href="${hash}"]`);
    if (activeNavItem) activeNavItem.classList.add('active');
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
    }

    if (hash === '#dashboard') {
        renderDashboard();
    } else if (hash === '#accounts') {
        renderAccountsView();
    } else if (hash === '#requests' && userRole === 'admin') {
        // renderRequestsView(); // Re-enable if requests view is fully implemented
    }
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        handleNavigation(item.getAttribute('href'));
    });
});

window.onload = () => {
    handleNavigation('#dashboard');
    // Set default date for spending view
    spendDate.valueAsDate = new Date();
};

document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
});


function updateSpendingWorkflow(type) {
    const spendingTitle = document.getElementById('spending-view-title');
    const submitBtn = document.getElementById('submit-request-btn');
    
    spendingNavItem.innerHTML = spendingNavItem.innerHTML.replace(/Log Spending|Submit Spending/, type === 'personal' ? 'Log Spending' : 'Submit Spending');

    if (type === 'personal') {
        spendingTitle.textContent = "Log New Personal Spending";
        submitBtn.textContent = "Log Spending";
        spendingNavItem.querySelector('i').className = 'fas fa-plus-circle';
        
    } else {
        spendingTitle.textContent = "Submit New Spending Request";
        submitBtn.textContent = "Submit for Approval";
        spendingNavItem.querySelector('i').className = 'fas fa-receipt';
    }
    submitBtn.onclick = (type === 'personal') ? logPersonalSpending : submitSpendingRequest;
}


// =========================================================================
// 4. DATA RENDERING (DASHBOARD & ACCOUNTS) (FIX 2.0 - Data Isolation)
// =========================================================================

async function renderDashboard() {
    try {
        // FIX 2.0: Ensure all queries use ORGANIZATION_ID to isolate data per account type
        // Corporate: ORGANIZATION_ID is 'main_budget_org_1'
        // Personal: ORGANIZATION_ID is typically the user's UID to ensure isolation
        const orgIdentifier = (userAccountType === 'personal') ? auth.currentUser.uid : ORGANIZATION_ID;

        const budgetsSnapshot = await db.collection('budgets')
            .where('organizationId', '==', orgIdentifier)
            .where('status', '==', 'active')
            .get();

        // ... (rest of dashboard logic remains the same, using budgetsSnapshot) ...
        
        if (budgetsSnapshot.empty) {
            dashTotalBudget.textContent = '₦0.00';
            dashTotalSpent.textContent = '₦0.00';
            dashTotalRemaining.textContent = '₦0.00';
            accountCardsContainer.innerHTML = '<p>No active budgets found. Go to Accounts to create one.</p>';
            return;
        }

        let totalBudget = 0;
        let totalSpent = 0;
        let allAccounts = [];

        budgetsSnapshot.forEach(doc => {
            const budget = doc.data();
            totalBudget += budget.totalAmount;
            
            if (budget.accounts) {
                Object.keys(budget.accounts).forEach(accountId => {
                    const account = budget.accounts[accountId];
                    allAccounts.push({
                        id: accountId,
                        name: account.name,
                        budgetId: doc.id, // Store budget ID for balance update
                        budgeted: account.budgeted,
                        spent: account.spent || 0
                    });
                    totalSpent += account.spent || 0;
                });
            }
        });

        const totalRemaining = totalBudget - totalSpent;

        dashTotalBudget.textContent = `₦${totalBudget.toLocaleString()}`;
        dashTotalSpent.textContent = `₦${totalSpent.toLocaleString()}`;
        dashTotalRemaining.textContent = `₦${totalRemaining.toLocaleString()}`;

        renderAccountCards(allAccounts);

    } catch (error) {
        console.error("Error rendering dashboard:", error);
    }
}

function renderAccountCards(accounts) {
    // ... (rest of renderAccountCards logic remains the same) ...
    accountCardsContainer.innerHTML = '';

    accounts.forEach(account => {
        const remaining = account.budgeted - account.spent;
        const card = document.createElement('div');
        card.className = 'stat-card account-card';
        card.innerHTML = `
            <h4>${account.name}</h4>
            <p style="font-size: 1.2em;">Budget: ₦${account.budgeted.toLocaleString()}</p>
            <p style="color: ${remaining >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}; font-size: 1.5em;">Remaining: ₦${remaining.toLocaleString()}</p>
        `;

        const historyBtn = document.createElement('button');
        historyBtn.className = 'view-history-btn';
        historyBtn.dataset.accountId = account.id;
        historyBtn.dataset.accountName = account.name;
        historyBtn.innerHTML = `<i class="fas fa-history"></i> View History`;
        
        historyBtn.addEventListener('click', () => {
            openHistoryModal(account.id, account.name);
        });

        card.appendChild(historyBtn);
        accountCardsContainer.appendChild(card);
    });
}

async function renderAccountsView() {
    try {
        const orgIdentifier = (userAccountType === 'personal') ? auth.currentUser.uid : ORGANIZATION_ID;
        
        const budgetsSnapshot = await db.collection('budgets')
            .where('organizationId', '==', orgIdentifier)
            .get();
        
        const budgets = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderSavedBudgets(budgets); 
        renderSpendingAccounts(budgets);

    } catch (error) {
        console.error("Error rendering accounts view:", error);
    }
}

function renderSpendingAccounts(budgets) {
    // Clear previous options
    spendTargetAccount.innerHTML = '<option value="">Select Account (e.g. GTB - House)</option>';

    budgets.forEach(budget => {
        if (budget.status === 'active' && budget.accounts) { 
            Object.keys(budget.accounts).forEach(accountId => {
                const account = budget.accounts[accountId];
                const option = document.createElement('option');
                option.value = `${budget.id}|${accountId}`; // Store both IDs
                option.textContent = `${budget.title} - ${account.name}`;
                spendTargetAccount.appendChild(option);
            });
        }
    });
}

// =========================================================================
// 5. SPENDING & REQUEST LOGIC (FIX 3.1 & 3.2)
// =========================================================================

// Original Joint/Corporate logic
async function submitSpendingRequest() {
    const amount = parseFloat(spendAmount.value);
    const [budgetId, accountId] = spendTargetAccount.value.split('|');
    const description = spendDescription.value;

    if (!amount || !budgetId || !accountId || !description) {
        alert("Please fill in all spending fields.");
        return;
    }

    try {
        await db.collection('requests').add({
            amount: amount,
            accountId: accountId,
            budgetId: budgetId, // Added budgetId for approval process
            description: description,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.email,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            organizationId: ORGANIZATION_ID,
            type: 'request',
        });
        alert('Spending request submitted for approval.');
        
        spendAmount.value = '';
        spendTargetAccount.value = '';
        spendDescription.value = '';

    } catch (e) {
        console.error("Error submitting request: ", e);
        alert('Could not submit request.');
    }
}


// FIX 3.1: Direct Spending Log for Personal Accounts (Balance Update)
async function logPersonalSpending() {
    const amount = parseFloat(spendAmount.value);
    const dateValue = spendDate.value; // NEW: Get date value
    const [budgetId, accountId] = spendTargetAccount.value.split('|');
    const description = spendDescription.value;

    if (!amount || !budgetId || !accountId || !description || !dateValue) {
        alert("Please fill in all spending fields, including the date.");
        return;
    }
    
    // Parse date string into a Date object for Firestore
    const transactionDate = new Date(dateValue);

    try {
        // 1. Log transaction
        await db.collection('transactions').add({
            amount: amount,
            accountId: accountId,
            budgetId: budgetId,
            description: description,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.email,
            date: transactionDate, // Save custom date
            status: 'logged', 
            type: 'spending'
        });

        // 2. FIX 3.1: Update Account Balance
        const budgetDocRef = db.collection('budgets').doc(budgetId);
        await db.runTransaction(async (transaction) => {
            const budgetDoc = await transaction.get(budgetDocRef);
            if (!budgetDoc.exists) {
                throw "Budget document does not exist!";
            }

            const currentAccounts = budgetDoc.data().accounts;
            const currentSpent = currentAccounts[accountId].spent || 0;
            const newSpent = currentSpent + amount;
            
            // Construct the path for the specific account's spent field
            const updatePath = `accounts.${accountId}.spent`;

            transaction.update(budgetDocRef, {
                [updatePath]: newSpent
            });
        });

        alert('Spending successfully logged!');
        
        // Clear form
        spendDate.valueAsDate = new Date();
        spendAmount.value = '';
        spendTargetAccount.value = '';
        spendDescription.value = '';

        renderDashboard(); 
    } catch (e) {
        console.error("Error logging spending/updating balance: ", e);
        alert('Could not log spending. Check console for details.');
    }
}


// ... (renderRequestsView remains the same) ...


// =========================================================================
// 6. BUDGET CREATION & ARCHIVING
// =========================================================================

// ... (Modal logic remains the same) ...

finalizeBudgetBtn.addEventListener('click', async () => {
    const title = modalBudgetTitle.value.trim();
    const totalAmount = parseFloat(modalTotalAmount.value);
    const otherDetails = modalOtherDetails.value.trim(); 

    if (!title || !totalAmount || totalAmount <= 0) {
        alert("Please provide a valid budget title and total amount.");
        return;
    }

    const allocationRows = document.querySelectorAll('.allocation-row');
    const accounts = {};
    let allocatedSum = 0;

    allocationRows.forEach(row => {
        const nameInput = row.querySelector('.allocation-name');
        const amountInput = row.querySelector('.allocation-amount');
        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (name && amount > 0) {
            const accountId = name.toLowerCase().replace(/\s+/g, '_'); 
            accounts[accountId] = {
                name: name,
                budgeted: amount,
                spent: 0
            };
            allocatedSum += amount;
        }
    });

    if (allocatedSum !== totalAmount) {
        alert(`Allocation error: Total allocated (₦${allocatedSum.toLocaleString()}) must match Total Budget (₦${totalAmount.toLocaleString()}).`);
        return;
    }
    
    // FIX 2.0: Set Organization ID based on user type for isolation
    const orgIdentifier = (userAccountType === 'personal') ? auth.currentUser.uid : ORGANIZATION_ID;

    try {
        await db.collection('budgets').add({
            title: title,
            totalAmount: totalAmount,
            otherDetails: otherDetails,
            accounts: accounts,
            organizationId: orgIdentifier, // Use determined identifier
            creatorId: auth.currentUser.uid,
            createDate: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });

        alert("Budget finalized and saved!");
        budgetModal.classList.add('hidden');
        renderDashboard();
        renderAccountsView();

    } catch (e) {
        console.error("Error finalizing budget: ", e);
        alert("Failed to save budget.");
    }
});

// ... (Archive Logic remains the same) ...


// =========================================================================
// 7. HISTORY MODAL LOGIC (FIX 3.2 - Date Display)
// =========================================================================

async function openHistoryModal(accountId, accountName) {
    historyModalTitle.textContent = `Spending History: ${accountName}`;
    historyList.innerHTML = 'Loading history...';
    document.getElementById('history-empty-message').classList.add('hidden');
    historyModal.classList.remove('hidden');

    try {
        const snapshot = await db.collection('transactions')
            .where('accountId', '==', accountId)
            .orderBy('date', 'desc')
            .get();

        historyList.innerHTML = '';
        if (snapshot.empty) {
            document.getElementById('history-empty-message').classList.remove('hidden');
            return;
        }

        snapshot.forEach(doc => {
            const tx = doc.data();
            // FIX 3.2: Format date for display
            const date = tx.date ? tx.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <p style="font-weight: bold; margin-bottom: 0;">${date}</p>
                    <p class="amount" style="margin-bottom: 0;">- ₦${tx.amount.toLocaleString()}</p>
                </div>
                <p style="font-size: 0.9em; margin-top: 5px;">${tx.description}</p>
            `;
            historyList.appendChild(item);
        });

    } catch (e) {
        console.error("Error loading history:", e);
        historyList.innerHTML = '<p style="color: var(--color-danger);">Failed to load history.</p>';
    }
}


// Close History Modal
historyModal.querySelector('.close-btn').addEventListener('click', () => {
    historyModal.classList.add('hidden');
});

