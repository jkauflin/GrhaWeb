/*==============================================================================
(C) Copyright 2025 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure API Functions for the Static Web App (SWA) - to support
                the Admin operations
--------------------------------------------------------------------------------
Modification History
2025-04-12 JJK  Initial version
================================================================================*/
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;     // for IActionResult

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class AdminApi
    {
        private readonly ILogger<AdminApi> log;
        private readonly IConfiguration config;

        private readonly AuthorizationCheck authCheck;
        private readonly string userAdminRole;
        private readonly CommonUtil util;

        public AdminApi(ILogger<AdminApi> logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            authCheck = new AuthorizationCheck(log);
            userAdminRole = "grhaadmin";   // add to config ???
            util = new CommonUtil(log);
        }

        [Function("GetTrustee")]
        public async Task<IActionResult> GetTrustee(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {

            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get the content string from the HTTP request body
                string searchStr = await new StreamReader(req.Body).ReadToEndAsync();

                /*
                // Get the content string from the HTTP request body
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);
                JToken? jToken;

                string searchStr = "";
                if (jObject.TryGetValue("searchStr", out jToken)) {
                    searchStr = jToken.ToString();
                }
                */

                /*   >>>>>> think about searches on these specific params in the future (if needed)
    let paramData = {
        searchStr: searchStr.value,
        parcelId: parcelId.value,
        lotNo: lotNo.value,
        address: address.value,
        ownerName: ownerName.value,
        phoneNo: phoneNo.value,
        altAddress: altAddress.value
                */
                //hoaPropertyList = await hoaDbCommon.GetPropertyList(searchStr);
            }
            catch (Exception ex) {
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }
            
            //return new OkObjectResult(hoaPropertyList);
            return new OkObjectResult("success");
        }




    } // public static class AdminApi

}

