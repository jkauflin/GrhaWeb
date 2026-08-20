(function () {
    const localApiBaseUrl = "http://localhost:7071/api/"
    //const productionApiBaseUrl = "/api/"
    const productionApiBaseUrl = "https://grhawebfunctions-c0ahh4a0fddqgra8.eastus2-01.azurewebsites.net/api/"

    function isLocalHost(hostname) {
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("0.0.0.0")
    }

    window.__APP_CONFIG__ = window.__APP_CONFIG__ || {}
    const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : ""
    const isLocal = isLocalHost(hostname)

    window.__APP_CONFIG__.isLocal = isLocal

    if (!window.__APP_CONFIG__.apiBaseUrl) {
        window.__APP_CONFIG__.apiBaseUrl = isLocal
            ? localApiBaseUrl
            : productionApiBaseUrl
    }
})()
