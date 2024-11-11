using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

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
    .Build();

/* >>>>> ONLY if you want to write to App Insights directly, instead of going through host logging
    .ConfigureServices(services => {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
*/

host.Run();
