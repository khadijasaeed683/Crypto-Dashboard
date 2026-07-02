import { Storage } from './storage.js';

export class AuthManager {
    constructor(onAuthSuccess) {
        this.onAuthSuccess = onAuthSuccess;
        // The list of CORRECT domains we want to compare against
        this.commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        this.bindEvents();
    }

    bindEvents() {
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const logoutBtn = document.getElementById('logout-btn');
        
        // Target the email inputs specifically for real-time validation
        const signupEmail = document.getElementById('signup-email');
        const loginEmail = document.getElementById('login-email');

        if (tabLogin && tabSignup) {
            tabLogin.addEventListener('click', () => this.switchAuthTab(true));
            tabSignup.addEventListener('click', () => this.switchAuthTab(false));
        }

        // Add blur listeners to check for typos right after the user finishes typing
        if (signupEmail) {
            signupEmail.addEventListener('blur', (e) => this.checkEmailTypo(e.target, 'signup-suggestion'));
        }
        if (loginEmail) {
            loginEmail.addEventListener('blur', (e) => this.checkEmailTypo(e.target, 'login-suggestion'));
        }

        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // --- Levenshtein Distance Algorithm ---
    // Calculates how many character edits are needed to turn string A into string B
    getDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return matrix[b.length][a.length];
    }

    checkEmailTypo(inputElement, suggestionDivId) {
        const emailParts = inputElement.value.split('@');
        
        // Ensure there is a domain to check
        if (emailParts.length !== 2) return; 
        
        const username = emailParts[0];
        const domain = emailParts[1].toLowerCase();
        
        // Find existing suggestion div or create one
        let suggestionDiv = document.getElementById(suggestionDivId);
        if (!suggestionDiv) {
            suggestionDiv = document.createElement('div');
            suggestionDiv.id = suggestionDivId;
            suggestionDiv.className = 'email-suggestion hidden';
            inputElement.parentNode.appendChild(suggestionDiv);
        }

        // If the domain exactly matches a known provider, clear any warnings
        if (this.commonDomains.includes(domain)) {
            suggestionDiv.classList.add('hidden');
            inputElement.setCustomValidity(''); 
            return;
        }

        // Check against known domains
        for (const validDomain of this.commonDomains) {
            const distance = this.getDistance(domain, validDomain);
            
            // If the typo is only 1 or 2 characters off from a major provider
            if (distance > 0 && distance <= 2) {
                const suggestedEmail = `${username}@${validDomain}`;
                suggestionDiv.innerHTML = `Did you mean <span class="suggestion-text">${suggestedEmail}</span>?`;
                suggestionDiv.classList.remove('hidden');
                
                // Clicking the suggestion auto-fills and fixes the input
                suggestionDiv.onclick = () => {
                    inputElement.value = suggestedEmail;
                    suggestionDiv.classList.add('hidden');
                    inputElement.setCustomValidity('');
                };

                // Optional: Force them to click the suggestion or fix it manually
                inputElement.setCustomValidity('Please check your email domain for a typo.');
                return;
            }
        }

        // If no typos detected, clear the UI
        suggestionDiv.classList.add('hidden');
        inputElement.setCustomValidity('');
    }

    switchAuthTab(showLogin) {
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (showLogin) {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            loginForm.classList.remove('hidden-form');
            loginForm.classList.add('active-form');
            signupForm.classList.remove('active-form');
            signupForm.classList.add('hidden-form');
        } else {
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            signupForm.classList.remove('hidden-form');
            signupForm.classList.add('active-form');
            loginForm.classList.remove('active-form');
            loginForm.classList.add('hidden-form');
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const username = email.split('@')[0]; 
        Storage.setAuth(username);
        this.checkAuthStatus();
    }

    handleSignup(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        Storage.setAuth(username);
        this.checkAuthStatus();
    }

    handleLogout() {
        Storage.clearAuth();
        // Since decoupling means auth doesn't know about the socket directly,
        // a hard reload perfectly cleans up network connections and UI state.
        window.location.reload(); 
    }

    /**
     * Checks storage for a token/user and toggles the main UI visibility.
     * Triggers the success callback if authenticated.
     */
    checkAuthStatus() {
        const user = Storage.getAuth();
        const overlay = document.getElementById('auth-overlay');
        const app = document.getElementById('app');

        if (user) {
            overlay.classList.add('hidden');
            app.classList.remove('hidden');
            
            // Notify the main application that it's safe to start services
            if (typeof this.onAuthSuccess === 'function') {
                this.onAuthSuccess(user);
            }
        } else {
            overlay.classList.remove('hidden');
            app.classList.add('hidden');
        }
    }
}