// =========================================================================
// 1. GLOBAL STATE & UI ELEMENT REFERENCES
// =========================================================================

// State objects: Data is now fetched dynamically from Firestore
let currentUser = null; // Stores the logged-in Firebase User object
let currentRole = null; // 'super_admin' or 'subordinate' (Stored in Firestore)

// Budget Data Structure (These will hold data fetched from Firestore)
let globalAccounts = []; 
let pendingRequests = []; 

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
    const activeNav = document.querySelector(`.nav-item[href="#${hash}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Run specific rendering functions after navigation
    if (hash === 'dashboard') renderDashboard();
    if (hash === 'accounts') renderAccountManagement();
    if (hash === 'requests') renderPendingRequests();
    if (hash === 'spending') populateAccountSelect();
}

/** Updates the UI visibility based on the current user's role. */
function updateUIVisibility() {
    // 1. Sidebar Links
    if (currentRole === 'super_admin') {
        adminLinks.classList.remove('hidden');
    } else {
        adminLinks.classList.add('hidden');
    }
    // 2. Badge for pending requests
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
// 3. FIREBASE AUTHENTICATION
// =========================================================================

/** Helper to fetch the custom role (stored in a 'users' collection) */
async function fetchUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            currentRole = userDoc.data().role; // e.g., 'super_admin' or 'subordinate'
        } else {
            // Default role if not found (e.g., if a user signs up for the first time)
            currentRole = 'subordinate'; 
        }
    } catch (error) {
        console.error("Error fetching user role:", error);
        currentRole = 'subordinate'; // Safety fallback
    }
}

/** Handles user login using Firebase Email/Password. */
function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Success: onAuthStateChanged handles UI update
        })
        .catch((error) => {
            alert(`Login Failed: ${error.message}`);
        });
}

/** Handles user sign up using Firebase Email/Password. */
function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // 1. Create a record in the 'users' collection with a default role
            return db.collection('users').doc(user.uid).set({
                email: user.email,
                role: 'subordinate', // Default role for new signups
                organizationId: ORGANIZATION_ID,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("Account created successfully! You are now logged in.");
            // Success: onAuthStateChanged handles UI update
        })
        .catch((error) => {
            alert(`Sign Up Failed: ${error.message}`);
        });
}

/** Handles user logout. */
function handleLogout() {
    auth.signOut(); // onAuthStateChanged handles UI update
}


// =========================================================================
// 4. FIREBASE DATA MANAGEMENT (Initialization & Fetching)
// =========================================================================

/** Loads data (Accounts and Requests) from Firestore after login. */
async function initializeAppData() {
    try {
        // 1. Fetch Accounts/Splits relevant to the organization
        const accountsSnapshot = await db.collection('accounts')
                                          .where('organizationId', '==', ORGANIZATION_ID) 
                                          .get();
        globalAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch Pending Requests
        const requestsSnapshot = await db.collection('pending_requests')
                                         .where('organizationId', '==', ORGANIZATION_ID) 
                                         .get();
        pendingRequests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Initial UI updates after data is loaded
        updateUIVisibility();
        renderDashboard();
    } catch (error) {
        console.error("Error loading initial data from Firestore:", error);
        alert("Error loading application data. Check console for details.");
    }
}

// =========================================================================
// 5. BUDGET SPLITTING & ACCOUNT MANAGEMENT LOGIC (Firestore Write)
// =========================================================================

/** Renders the current allocation rows inside the modal. */
function renderAllocationRows() {
    allocationTable.innerHTML = '';
    addAllocationRow(); // Start with one initial row
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
    
    // Event listeners
    row.querySelector('.remove-account-btn').addEventListener('click', (e) => {
        row.remove();
        updateAllocationSummary();
    });
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
    const displayElement = allocationRemainingDisplay;
    if (remainingToAllocate < 0) {
        displayElement.style.color = 'red';
    } else if (remainingToAllocate > 0) {
        displayElement.style.color = 'darkorange';
    } else {
        displayElement.style.color = 'green';
    }
}

/** Finalizes the new budget and saves the splits to Firestore. */
async function handleFinalizeBudget() {
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
                name: name,
                allocated: amount,
                spent: 0,
                budgetTitle: budgetTitle,
                organizationId: ORGANIZATION_ID,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            allocatedSum += amount;
        }
    });
    
    if (allocatedSum !== totalBudget) {
        if (!confirm(`Warning: Your allocated sum (₦${allocatedSum.toFixed(2)}) does not match the total budget (₦${totalBudget.toFixed(2)}). Do you want to save the ${accountsToAdd.length} accounts anyway?`)) {
            return;
        }
    }
    
    try {
        // Use a Firestore Batch write for efficiency
        const batch = db.batch();
        accountsToAdd.forEach(account => {
            const newAccountRef = db.collection('accounts').doc();
            batch.set(newAccountRef, account);
        });

        await batch.commit();
        alert(`Budget "${budgetTitle}" created with ${accountsToAdd.length} accounts and saved to Firestore.`);
        
        // Re-initialize data and close modal
        await initializeAppData(); 
        budgetModal.classList.add('hidden');
    } catch (error) {
        console.error("Error finalizing budget and writing to Firestore:", error);
        alert("Failed to save budget. See console.");
    }
}

// =========================================================================
// 6. DASHBOARD & DISPLAY FUNCTIONS
// =========================================================================

/** Renders the main dashboard view. */
function renderDashboard() {
    let totalBudget = 0;
    let totalSpent = 0;
    
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
    const list = document.getElementById('saved-budgets-list');
    list.innerHTML = '';
    
    globalAccounts.forEach(account => {
        const remaining = account.allocated - account.spent;
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${account.name}</strong> (${account.budgetTitle || 'Unfiled'})</span>
            <span>Budget: ₦${account.allocated.toFixed(2)} | Remaining: ₦${remaining.toFixed(2)}</span>
        `;
        list.appendChild(li);
    });
}

// =========================================================================
// 7. SPENDING REQUEST & APPROVAL LOGIC (Firestore Read/Write)
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

/** Handles a subordinate submitting a spending request to Firestore. */
async function handleSubmitRequest() {
    const amount = parseFloat(document.getElementById('spend-amount').value);
    const accountId = spendTargetAccountSelect.value;
    const description = document.getElementById('spend-description').value.trim();

    if (!amount || amount <= 0 || !accountId || !description || !currentUser) {
        alert("Please fill out all fields with valid data and ensure you are logged in.");
        return;
    }
    
    const targetAccount = globalAccounts.find(a => a.id === accountId);
    if (!targetAccount) return alert("Target account not found.");

    const newRequest = {
        accountId: accountId,
        accountName: targetAccount.name,
        amount: amount,
        description: description,
        submittedBy: currentUser.email,
        submittedById: currentUser.uid,
        organizationId: ORGANIZATION_ID,
        date: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('pending_requests').add(newRequest);
        alert("Spending request submitted for approval!");
        
        // Clear form
        document.getElementById('spend-amount').value = '';
        document.getElementById('spend-description').value = '';
        spendTargetAccountSelect.value = '';
        
        // Re-fetch requests (to update badge for admin if they're logged in)
        await initializeAppData();
    } catch (error) {
        console.error("Error submitting request:", error);
        alert("Failed to submit request.");
    }
}

/** Renders the list of pending requests for the Super Admin. */
function renderPendingRequests() {
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
                <button class="approve-btn primary-btn" data-id="${request.id}"><i class="fas fa-check"></i> Approve</button>
                <button class="reject-btn secondary-btn" data-id="${request.id}"><i class="fas fa-times"></i> Reject</button>
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

/** Handles the Super Admin approving or rejecting a request using a Firestore Transaction. */
async function handleApproval(requestId, isApproved) {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;
    
    const accountRef = db.collection('accounts').doc(request.accountId);
    const requestRef = db.collection('pending_requests').doc(requestId);
    
    // Use a transaction for atomic update (crucial for financial data)
    try {
        await db.runTransaction(async (transaction) => {
            if (isApproved) {
                // 1. Get the current account data within the transaction
                const accountDoc = await transaction.get(accountRef);
                if (!accountDoc.exists) {
                    throw "Account not found!";
                }
                
                // 2. Update the spent total
                const newSpent = accountDoc.data().spent + request.amount;
                transaction.update(accountRef, { spent: newSpent });
                
                // 3. Delete the request
                transaction.delete(requestRef);
                alert(`Approved! ₦${request.amount.toFixed(2)} added to ${request.accountName}.`);
            } else {
                // Only delete the request if rejected
                transaction.delete(requestRef);
                alert(`Rejected! Request ₦${request.amount.toFixed(2)} from ${request.submittedBy} denied.`);
            }
        });

        // Update UI after successful transaction
        await initializeAppData();
        renderPendingRequests(); 
        renderDashboard(); 

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(`Approval failed! Check your budget limits or network. ${error}`);
    }
}


// =========================================================================
// 8. INITIALIZATION & EVENT LISTENERS
// =========================================================================

// --- Firebase Auth State Listener ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await fetchUserRole(user.uid);
        await initializeAppData(); 
        
        updateUIVisibility();
        toggleAppView(true);
    } else {
        currentUser = null;
        currentRole = null;
        toggleAppView(false); 
    }
});

// --- Authentication Listeners ---
loginBtn.addEventListener('click', handleLogin);
signupBtn.addEventListener('click', handleSignUp);
logoutBtn.addEventListener('click', handleLogout);

// --- Navigation Listeners ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = e.currentTarget.getAttribute('href').substring(1); 
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
