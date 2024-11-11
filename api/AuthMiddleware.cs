using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

public class AuthMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger _logger;

    public AuthMiddleware(ILoggerFactory loggerFactory)
    {
        _logger = loggerFactory.CreateLogger<AuthMiddleware>();
    }

/*
    public async Task Invoke(
        FunctionContext context, FunctionExecutionDelegate next)
    {
        DoStuffBeforeFunction();

        await next(context);

        DoStuffAfterFunction();
    }

    public async Task Invoke(
        FunctionContext context,
        FunctionExecutionDelegate next)
    {
        var principalFeature = context.Features.Get<JwtPrincipalFeature>();
        if (!AuthorizePrincipal(context, principalFeature.Principal))
        {
            context.SetHttpResponseStatusCode(HttpStatusCode.Forbidden);
            return;
        }

        await next(context);
    }    
*/
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        /*
        var userRoles = context.GetUserRoles();
        if (userRoles.Contains("admin"))
        {
            _logger.LogInformation("User is authorized as admin.");
            await next(context);
        }
        else
        {
            _logger.LogInformation("User is not authorized.");
            var httpRequest = await context.GetHttpRequestDataAsync();
            var response = httpRequest.CreateResponse(System.Net.HttpStatusCode.Forbidden);
            context.GetInvocationResult().Value = response;
        }

         // Unable to get token from headers
        context.SetHttpResponseStatusCode(HttpStatusCode.Unauthorized);

        */
    }
}
