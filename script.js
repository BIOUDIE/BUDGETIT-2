// =========================================================================
// 0. GLOBAL VARIABLES & INITIAL SETUP
// =========================================================================

// Initialize Firebase variables (assumed from index.html)
// const app = firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// const db = firebase.firestore();
// const ORGANIZATION_ID = "main_budget_org_1";

let userRole = 'member';
let currentActiveView = 'dashboard-view';
let userAccountType = 'personal'; // Global variable to store the user's account type (set during login/signup)

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
const spendingNavItem = document.getElementById('spending-nav-item'); // NEW

// Dashboard
const dashTotalBudget = document.getElementById('dash-total-budget');
const dashTotalSpent = document.getElementById('dash-total-spent');
const dashTotalRemaining = document.getElementById('dash-total-remaining');
const accountCardsContainer = document.getElementById('account-cards-container');

// Accounts View
const openNewBudgetModalBtn = document.getElementById('open-new-budget-modal');
const savedBudgetsList = document.getElementById('saved-budgets-list');
const archivedBudgetsList = document.getElementById('archived-budgets-list'); // NEW
const archiveBudgetBtn = document.getElementById('archive-budget-btn'); // NEW

// Spending View
const spendAmount = document.getElementById('spend-amount');
const spendTargetAccount = document.getElementById('spend-target-account');
const spendDescription = document.getElementById('spend-description');
const submitRequestBtn = document.getElementById('submit-request-btn');
const spendingViewTitle = document.getElementById('spending-view-title'); // NEW

// Budget Modal
const budgetModal = document.getElementById('budget-modal');
const modalBudgetTitle = document.getElementById('modal-budget-title');
const modalTotalAmount = document.getElementById('modal-total-amount');
const modalOtherDetails = document.getElementById('modal-other-details'); // NEW
const allocationTable = document.getElementById('allocation-table');
const addAllocationBtn = document.getElementById('add-allocation-btn');
const allocatedSumSpan = document.getElementById('allocated-sum');
const allocationRemainingSpan = document.getElementById('allocation-remaining');
const finalizeBudgetBtn = document.getElementById('finalize-budget-btn');

// History Modal (NEW)
const historyModal = document.getElementById('history-modal');
const historyList = document.getElementById('history-list');
const historyModalTitle = document.getElementById('history-modal-title');


// =========================================================================
// 2. AUTHENTICATION & INITIAL LOAD
// =========================================================================

loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(authEmail.value, authPassword.value)
        .catch(error => {
            alert("Login Error: " + error.message);
        });
});

signupBtn.addEventListener('click', signupUser); // Use the new signup function

async function signupUser() {
    const email = authEmail.value;
    const password = authPassword.value;
    // NEW: Get account type
    const accountType = document.querySelector('input[name="account-type"]:checked').value; 

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user profile with account type
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            role: 'member',
            accountType: accountType, // SAVE TYPE
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
                userAccountType = userData.accountType || 'personal'; // LOAD TYPE
                
                // Show admin links if user is admin
                if (userRole === 'admin') {
                    adminLinks.classList.remove('hidden');
                    listenForPendingRequests();
                } else {
                    adminLinks.classList.add('hidden');
                }

                authScreen.classList.remove('active');
                authScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');

                // NEW: Update spending nav text and workflow based on account type
                updateSpendingWorkflow(userAccountType);

                // Initial data load
                renderDashboard();
                renderAccountsView();
            } else {
                // User document not found (shouldn't happen if signup was successful)
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

    // Hide all views
    allViews.forEach(view => view.classList.add('hidden'));

    // Show target view
    if (targetView) {
        targetView.classList.remove('hidden');
        currentActiveView = hash.substring(1) + '-view';
    }

    // Update active nav item
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[href="${hash}"]`).classList.add('active');
    
    // Close mobile menu on click (NEW mobile fix)
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
    }

    // Refresh data on specific views
    if (hash === '#dashboard') {
        renderDashboard();
    } else if (hash === '#accounts') {
        renderAccountsView();
    } else if (hash === '#requests' && userRole === 'admin') {
        renderRequestsView();
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
};

// NEW MOBILE FIX: Menu Toggle
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
});


// NEW FUNCTION: Update Spending Workflow (Personal vs. Joint/Corporate)
function updateSpendingWorkflow(type) {
    const spendingTitle = document.getElementById('spending-view-title');
    const submitBtn = document.getElementById('submit-request-btn');
    
    // Reset nav item text first
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
    // Update the button event listener to call the correct function
    submitBtn.onclick = (type === 'personal') ? logPersonalSpending : submitSpendingRequest;
}


// =========================================================================
// 4. DATA RENDERING (DASHBOARD & ACCOUNTS)
// =========================================================================

async function renderDashboard() {
    try {
        const budgetsSnapshot = await db.collection('budgets')
            .where('organizationId', '==', ORGANIZATION_ID)
            .where('status', '==', 'active') // Only count active budgets
            .get();

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
            
            // Collect all accounts from all active budgets
            if (budget.accounts) {
                Object.keys(budget.accounts).forEach(accountId => {
                    const account = budget.accounts[accountId];
                    allAccounts.push({
                        id: accountId,
                        name: account.name,
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

// Modified to include history button
function renderAccountCards(accounts) {
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

        // NEW: History Button
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
        const budgetsSnapshot = await db.collection('budgets')
            .where('organizationId', '==', ORGANIZATION_ID)
            .get();
        
        const budgets = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Pass all budgets to the rendering function, which will split them by status
        renderSavedBudgets(budgets); 
        renderSpendingAccounts(budgets);

    } catch (error) {
        console.error("Error rendering accounts view:", error);
    }
}

// Modified to handle status (active/archived)
function renderSavedBudgets(budgets) {
    savedBudgetsList.innerHTML = '';
    archivedBudgetsList.innerHTML = '';
    
    // NEW: Hide archive button by default
    archiveBudgetBtn.classList.add('hidden');

    budgets.forEach(budget => {
        const item = document.createElement('li');
        // NEW: Use the title which might be the joint/corp name
        item.textContent = `${budget.title || 'Untitled Budget'} (₦${budget.totalAmount.toLocaleString()})`; 
        
        // Attach budget ID for selection
        item.dataset.budgetId = budget.id;
        item.addEventListener('click', () => {
            // Placeholder: Logic to select and view/edit budget details
            document.querySelectorAll('#saved-budgets-list li').forEach(li => li.style.backgroundColor = 'white');
            item.style.backgroundColor = '#f0f0f0';
            
            // NEW: Show archive button if budget is active
            if (budget.status === 'active') {
                archiveBudgetBtn.classList.remove('hidden');
                archiveBudgetBtn.dataset.budgetId = budget.id;
            } else {
                archiveBudgetBtn.classList.add('hidden');
            }
        });
        
        if (budget.status === 'archived') {
            archivedBudgetsList.appendChild(item);
            item.style.opacity = '0.6';
        } else {
            savedBudgetsList.appendChild(item);
        }
    });
}

function renderSpendingAccounts(budgets) {
    // Clear previous options
    spendTargetAccount.innerHTML = '<option value="">Select Account (e.g. GTB - House)</option>';

    budgets.forEach(budget => {
        // Only allow spending against active budgets
        if (budget.status === 'active' && budget.accounts) { 
            Object.keys(budget.accounts).forEach(accountId => {
                const account = budget.accounts[accountId];
                const option = document.createElement('option');
                option.value = accountId;
                option.textContent = `${budget.title} - ${account.name}`;
                spendTargetAccount.appendChild(option);
            });
        }
    });
}

// =========================================================================
// 5. SPENDING & REQUEST LOGIC
// =========================================================================

// Original Joint/Corporate logic (Modified for type field)
async function submitSpendingRequest() {
    const amount = parseFloat(spendAmount.value);
    const accountId = spendTargetAccount.value;
    const description = spendDescription.value;

    if (!amount || !accountId || !description) {
        alert("Please fill in all spending fields.");
        return;
    }

    try {
        await db.collection('requests').add({
            amount: amount,
            accountId: accountId,
            description: description,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.email,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            organizationId: ORGANIZATION_ID,
            type: 'request', // NEW: Add type field
        });
        alert('Spending request submitted for approval.');
        
        // Clear form
        spendAmount.value = '';
        spendTargetAccount.value = '';
        spendDescription.value = '';

    } catch (e) {
        console.error("Error submitting request: ", e);
        alert('Could not submit request.');
    }
}

// NEW FUNCTION: Direct Spending Log for Personal Accounts
async function logPersonalSpending() {
    const amount = parseFloat(spendAmount.value);
    const accountId = spendTargetAccount.value;
    const description = spendDescription.value;

    if (!amount || !accountId || !description) {
        alert("Please fill in all spending fields.");
        return;
    }
    
    try {
        // 1. Log transaction
        await db.collection('transactions').add({
            amount: amount,
            accountId: accountId,
            description: description,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.email,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'logged', // No approval needed
            type: 'spending'
        });

        // 2. Update Account Balance (Simplified Update)
        // Note: Full implementation requires looking up the associated budget
        // and updating the 'spent' field for the specific accountId within that budget document.
        // For now, this is conceptual but required for the dashboard to update correctly.
        
        // Example Conceptual Balance Update (requires finding the parent budget):
        // const budgetDoc = await db.collection('budgets').where(`accounts.${accountId}`, '!=', null).limit(1).get();
        // if (!budgetDoc.empty) {
        //     const budgetId = budgetDoc.docs[0].id;
        //     const currentSpent = budgetDoc.docs[0].data().accounts[accountId].spent || 0;
        //     const updatePath = `accounts.${accountId}.spent`;
        //     await db.collection('budgets').doc(budgetId).update({
        //         [updatePath]: currentSpent + amount
        //     });
        // }
        
        alert('Spending successfully logged!');
        
        // Clear form
        spendAmount.value = '';
        spendTargetAccount.value = '';
        spendDescription.value = '';

        // Refresh views
        renderDashboard(); 
    } catch (e) {
        console.error("Error logging spending: ", e);
        alert('Could not log spending.');
    }
}


// Placeholder for Admin Request View (needs full implementation if requested)
async function renderRequestsView() {
    const list = document.getElementById('pending-requests-list');
    list.innerHTML = '<p>Loading pending requests...</p>';
    
    try {
        const snapshot = await db.collection('requests')
            .where('organizationId', '==', ORGANIZATION_ID)
            .where('status', '==', 'pending')
            .get();

        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p>No pending requests.</p>';
            return;
        }

        snapshot.forEach(doc => {
            // ... (Request rendering logic here) ...
            const item = document.createElement('div');
            item.className = 'card';
            item.textContent = `Amount: ₦${doc.data().amount.toLocaleString()} - ${doc.data().description}`;
            list.appendChild(item);
        });
    } catch (e) {
        console.error("Error loading requests:", e);
    }
}

// =========================================================================
// 6. BUDGET CREATION & ARCHIVING
// =========================================================================

openNewBudgetModalBtn.addEventListener('click', () => {
    budgetModal.classList.remove('hidden');
    // Clear form and set initial allocation row
    modalBudgetTitle.value = '';
    modalTotalAmount.value = '';
    modalOtherDetails.value = ''; // NEW
    allocationTable.innerHTML = '';
    addAllocationBtn.click(); // Add first row
    updateAllocationSummary();
});

document.querySelectorAll('.modal .close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.add('hidden');
    });
});

addAllocationBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'allocation-row';
    row.innerHTML = `
        <input type="text" placeholder="Account Name (e.g., Rent)" class="allocation-name">
        <input type="number" placeholder="Amount (₦)" class="allocation-amount">
        <button class="remove-account-btn secondary-btn" type="button"><i class="fas fa-trash"></i></button>
    `;
    row.querySelector('.remove-account-btn').addEventListener('click', () => {
        row.remove();
        updateAllocationSummary();
    });
    
    // Add listeners to update summary immediately
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateAllocationSummary);
    });

    allocationTable.appendChild(row);
});

modalTotalAmount.addEventListener('input', updateAllocationSummary);

function updateAllocationSummary() {
    const total = parseFloat(modalTotalAmount.value) || 0;
    let allocatedSum = 0;

    document.querySelectorAll('.allocation-amount').forEach(input => {
        allocatedSum += parseFloat(input.value) || 0;
    });

    const remaining = total - allocatedSum;

    allocatedSumSpan.textContent = allocatedSum.toLocaleString();
    allocationRemainingSpan.textContent = remaining.toLocaleString();

    // Visual cue for validation
    if (remaining < 0) {
        allocationRemainingSpan.style.color = 'var(--color-danger)';
    } else if (remaining > 0) {
        allocationRemainingSpan.style.color = 'var(--color-primary)';
    } else {
        allocationRemainingSpan.style.color = 'var(--color-success)';
    }
}

finalizeBudgetBtn.addEventListener('click', async () => {
    const title = modalBudgetTitle.value.trim();
    const totalAmount = parseFloat(modalTotalAmount.value);
    const otherDetails = modalOtherDetails.value.trim(); // NEW

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
            // Use a simple sanitized name as a unique ID key for simplicity
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

    try {
        await db.collection('budgets').add({
            title: title,
            totalAmount: totalAmount,
            otherDetails: otherDetails, // NEW
            accounts: accounts,
            organizationId: ORGANIZATION_ID,
            creatorId: auth.currentUser.uid,
            createDate: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active' // NEW: Default status
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

// NEW FUNCTION: Archive Logic
archiveBudgetBtn.addEventListener('click', async () => {
    const budgetId = archiveBudgetBtn.dataset.budgetId;
    if (!budgetId || !confirm("Are you sure you want to finalize and archive this budget? This cannot be undone.")) return;

    try {
        await db.collection('budgets').doc(budgetId).update({
            status: 'archived',
            archiveDate: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Budget archived successfully!");
        renderAccountsView(); // Refresh view
    } catch (e) {
        console.error("Error archiving budget:", e);
        alert("Failed to archive budget.");
    }
});

// =========================================================================
// 7. HISTORY MODAL LOGIC (NEW SECTION)
// =========================================================================

// NEW FUNCTION: Open History Modal and Load Data
async function openHistoryModal(accountId, accountName) {
    historyModalTitle.textContent = `Spending History: ${accountName}`;
    historyList.innerHTML = 'Loading history...';
    document.getElementById('history-empty-message').classList.add('hidden');
    historyModal.classList.remove('hidden');

    try {
        // Query transactions associated with the specific account ID
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
            // Convert Firebase Timestamp to readable date
            const date = tx.date ? tx.date.toDate().toLocaleDateString() : 'N/A';
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>User:</strong> ${tx.userName.split('@')[0]}</p>
                <p><strong>Description:</strong> ${tx.description}</p>
                <p class="amount"><strong>Amount:</strong> ₦${tx.amount.toLocaleString()}</p>
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
