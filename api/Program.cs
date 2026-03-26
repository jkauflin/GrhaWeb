using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PaypalServerSdk.Standard;
using PaypalServerSdk.Standard.Authentication;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureAppConfiguration((context, config) => {
        config.AddEnvironmentVariables();
    })
    /*
    .ConfigureFunctionsWorkerDefaults(worker => { 
        worker.UseMiddleware<AuthMiddleware>(); 
    })
    */
    .ConfigureServices(services =>
    {
        services.AddSingleton<PaypalServerSdkClient>(sp =>
        {
            var clientId = System.Environment.GetEnvironmentVariable("PAYPAL_CLIENT_ID");
            var clientSecret = System.Environment.GetEnvironmentVariable("PAYPAL_CLIENT_SECRET");
            var clientEnvironment = System.Environment.GetEnvironmentVariable("PAYPAL_ENVIRONMENT");
            
            if (clientEnvironment == null)
            {
                clientEnvironment = "Sandbox";
            }
            else
            {
                clientEnvironment = clientEnvironment.Trim();
            }

            var env = PaypalServerSdk.Standard.Environment.Sandbox;
            if (clientEnvironment.Equals("Production", StringComparison.OrdinalIgnoreCase))
            {
                env = PaypalServerSdk.Standard.Environment.Production;
            }
            
            return new PaypalServerSdkClient.Builder()
                .ClientCredentialsAuth(
                    new ClientCredentialsAuthModel.Builder(clientId, clientSecret).Build()
                )
                .Environment(env)
                .Build();
        });
    })
    .Build();

/* >>>>> ONLY if you want to write to App Insights directly, instead of going through host logging
    .ConfigureServices(services => {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
*/

host.Run();

