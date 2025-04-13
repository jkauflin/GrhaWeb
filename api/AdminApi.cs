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
using Newtonsoft.Json.Linq;

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
        private readonly HoaDbCommon hoaDbCommon;

        public AdminApi(ILogger<AdminApi> logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            authCheck = new AuthorizationCheck(log);
            userAdminRole = "grhaadmin";   // add to config ???
            util = new CommonUtil(log);
            hoaDbCommon = new HoaDbCommon(log,config);
        }

        [Function("GetTrustee")]
        public async Task<IActionResult> GetTrustee(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            var trustee = new Trustee{
                id = "01"
            };
            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get the content string from the HTTP request body
                string trusteeId = await new StreamReader(req.Body).ReadToEndAsync();

                trustee = await hoaDbCommon.GetTrusteeById(trusteeId);
                //log.LogWarning($"trustee.Name: {trustee.Name}");
            }
            catch (Exception ex) {
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }
            
            //return new OkObjectResult(hoaPropertyList);
            return new OkObjectResult(trustee);
        }

        [Function("UpdateTrustee")]
        public async Task<IActionResult> UpdateTrustee(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            var trustee = new Trustee{
                id = "01"
            };
            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get the content string from the HTTP request body
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);
                //JObject jObject = JObject.Parse("{\"Name\":\"John\",\"Age\":30}");
                trustee = jObject.ToObject<Trustee>();


                // Get the content string from the HTTP request body
                //string trusteeId = await new StreamReader(req.Body).ReadToEndAsync();

                //trustee = await hoaDbCommon.GetTrusteeById(trusteeId);
                //log.LogWarning($"trustee.Name: {trustee.Name}");
                
                //hoaPropertyList = await hoaDbCommon.GetPropertyList(searchStr);

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
            return new OkObjectResult(trustee);
        }

    } // public static class AdminApi

}

