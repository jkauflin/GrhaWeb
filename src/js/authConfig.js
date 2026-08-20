/*==============================================================================
(C) Copyright 2026 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Configuration for authentication and API calls using MSAL.js 
              and Azure AD.  This will work for both local development and 
              production deployment.  It uses the msal-browser library to 
              handle authentication and token acquisition (which is 
              included in the fetchApi function in util.js)
              
--------------------------------------------------------------------------------
Modification History
2026-08-04 JJK  Initial version - added for new auth and Function API calls
2026-08-17 JJK  Updated values for GRHA Web
================================================================================*/

const spaWebClientId = "b203ccb3-4553-4de1-8b28-3a50918f4a8a"
const apiFunctionId = "b203ccb3-4553-4de1-8b28-3a50918f4a8a"
const tenantId = "69b45237-b1d8-4ef3-b620-ddb23592e2f3"

const msalConfig = {
    auth: {
        clientId: spaWebClientId,
        authority: "https://login.microsoftonline.com/" + tenantId,
        redirectUri: window.__APP_CONFIG__.isLocal
            ? "http://localhost:4280"
            : "https://grha-dayton.org"
    },
    cache: {
        cacheLocation: "sessionStorage" // or localStorage if you want persistence across tabs
    }
};

// user_impersonation scope for the Azure Function API.  This is the default scope name for Azure Functions, but it can be changed in the Function App settings if desired.
const apiScopes = ["api://"+apiFunctionId+"/access_as_user"];

const msalInstance = new msal.PublicClientApplication(msalConfig);
let initPromise = msalInstance.initialize();
let tokenPromise = null;

async function acquireToken() {
    await initPromise;
    const accounts = msalInstance.getAllAccounts();
    const request = { scopes: apiScopes };

    if (accounts.length > 0) {
        request.account = accounts[0];
        try {
            const result = await msalInstance.acquireTokenSilent(request);
            return result.accessToken;
        } catch (err) {
            if (!(err instanceof msal.InteractionRequiredAuthError)) throw err;
            console.warn("MSAL acquireTokenSilent failed and requires interaction:", err.errorCode || err.name, err.errorMessage || err.message);
        }
    }

    // No cached account, or silent failed — go interactive
    console.debug("Falling back to acquireTokenPopup for interactive auth");
    const result = await msalInstance.acquireTokenPopup(request);
    // or acquireTokenRedirect(request) if you'd rather avoid popups
    return result.accessToken;
}

export async function getToken() {
    if (!tokenPromise) {
        tokenPromise = acquireToken().finally(() => {
            tokenPromise = null;
        });
    }
    return tokenPromise;
}
