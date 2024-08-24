using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace GrhaWeb.Function
{
    public class WebApi
    {
        private readonly ILogger<WebApi> _logger;

        public WebApi(ILogger<WebApi> logger)
        {
            _logger = logger;
        }

        [Function("WebApi")]
        public IActionResult Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequest req)
        {
            _logger.LogInformation("C# HTTP trigger function processed a request.");
            return new OkObjectResult("Welcome to Azure Functions!");
        }
    }
}
