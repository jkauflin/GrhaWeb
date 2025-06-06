/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure API Functions for the Static Web App (SWA) - this should
              replace all of the old PHP code, and be the "backend" services
              for the web apps
--------------------------------------------------------------------------------
Modification History
2024-06-30 JJK  Initial version (moving logic from PHP to here to update data
                in MediaInfo entities in Cosmos DB NoSQL
2024-07-28 JJK  Resolved JSON parse and DEBUG issues and got the update working
2024-08-27 JJK  Added GetPropertyList2 function for getting property list for
                public web page dues lookup
2024-08-28 JJK  Added GetHoaRec2 function for getting data for dues statement
2024-11-09 JJK  Converted functions to run as dotnet-isolated in .net8.0, 
                logger (connected to App Insights), and added configuration 
                to get environment variables for the Cosmos DB connection str
2024-11-11 JJK  Modified to check user role from function context for auth
2024-11-19 JJK  Moved DB functions into a common DB class (just like the old web)
================================================================================*/
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;     // for IActionResult
using Newtonsoft.Json.Linq;

using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class WebApi
    {
        private readonly ILogger<WebApi> log;
        private readonly IConfiguration config;

        private readonly AuthorizationCheck authCheck;
        private readonly string userAdminRole;
        private readonly CommonUtil util;
        private readonly HoaDbCommon hoaDbCommon;

        public WebApi(ILogger<WebApi> logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            authCheck = new AuthorizationCheck(log);
            userAdminRole = "hoadbadmin";   // add to config ???
            util = new CommonUtil(log);
            hoaDbCommon = new HoaDbCommon(log, config);
        }

        [Function("GetPropertyList")]
        public async Task<IActionResult> GetPropertyList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<HoaProperty> hoaPropertyList = new List<HoaProperty>();

            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
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
                hoaPropertyList = await hoaDbCommon.GetPropertyList(searchStr);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaPropertyList);
        }


        //==============================================================================================================
        // Main details lookup service to get data from all the containers for a specific property and populate
        // the HoaRec object.  It also calculates the total Dues due with interest, and gets emails and sales info
        //==============================================================================================================
        [Function("GetHoaRec")]
        public async Task<IActionResult> GetHoaRec(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            HoaRec hoaRec = new HoaRec();

            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation(">>> User is authorized ");

                // Get the content string from the HTTP request body
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);
        
                // Construct the query from the query parameters
                string parcelId = "";
                string ownerId = "";
                string fy = "";
                string saleDate = "";

                JToken? jToken;
                if (jObject.TryGetValue("parcelId", out jToken))
                {
                    parcelId = jToken.ToString();
                    if (parcelId.Equals(""))
                    {
                        return new BadRequestObjectResult("GetHoaRec failed because parcelId was blank");
                    }
                }
                else
                {
                    return new BadRequestObjectResult("GetHoaRec failed because parcelId was NOT FOUND");
                }
                if (jObject.TryGetValue("ownerId", out jToken)) {
                    ownerId = jToken.ToString();
                }
                if (jObject.TryGetValue("fy", out jToken)) {
                    fy = jToken.ToString();
                }
                if (jObject.TryGetValue("saleDate", out jToken)) {
                    saleDate = jToken.ToString();
                }

                hoaRec = await hoaDbCommon.GetHoaRec(parcelId,ownerId,fy,saleDate);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaRec);
        }

        /*
        using Newtonsoft.Json.Linq;

        string json = "{\"Name\":\"John\",\"Age\":30}";

        JObject obj = JObject.Parse(json);

        Console.WriteLine($"Name: {obj["Name"]}, Age: {obj["Age"]}"); // Use index-based access
        */

        [Function("UpdateProperty")]
        public async Task<IActionResult> UpdateProperty(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string returnMessage = "";
            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }
                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get content from the Request BODY
                var boundary = HeaderUtilities.RemoveQuotes(MediaTypeHeaderValue.Parse(req.Headers.GetValues("Content-Type").FirstOrDefault()).Boundary).Value;
                var reader = new MultipartReader(boundary, req.Body);
                var section = await reader.ReadNextSectionAsync();

                var formFields = new Dictionary<string, string>();
                var files = new List<(string fieldName, string fileName, byte[] content)>();

                while (section != null)
                {
                    var contentDisposition = section.GetContentDispositionHeader();
                    if (contentDisposition != null)
                    {
                        if (contentDisposition.IsFileDisposition())
                        {
                            using var memoryStream = new MemoryStream();
                            await section.Body.CopyToAsync(memoryStream);
                            files.Add((contentDisposition.Name.Value, contentDisposition.FileName.Value, memoryStream.ToArray()));
                        }
                        else if (contentDisposition.IsFormDisposition())
                        {
                            using var streamReader = new StreamReader(section.Body);
                            formFields[contentDisposition.Name.Value] = await streamReader.ReadToEndAsync();
                        }
                    }

                    section = await reader.ReadNextSectionAsync();
                }

                /*
                foreach (var field in formFields)
                {
                    log.LogWarning($"Field {field.Key}: {field.Value}");
                }
                */
                await hoaDbCommon.UpdatePropertyDB(userName,formFields);

                returnMessage = "Property was updated";
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateProperty, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Property - check log");
            }
            
            return new OkObjectResult(returnMessage);
        }


        [Function("UpdateOwner")]
        public async Task<IActionResult> UpdateOwner(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string returnMessage = "";
            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }
                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get content from the Request BODY
                var boundary = HeaderUtilities.RemoveQuotes(MediaTypeHeaderValue.Parse(req.Headers.GetValues("Content-Type").FirstOrDefault()).Boundary).Value;
                var reader = new MultipartReader(boundary, req.Body);
                var section = await reader.ReadNextSectionAsync();

                var formFields = new Dictionary<string, string>();
                var files = new List<(string fieldName, string fileName, byte[] content)>();

                while (section != null)
                {
                    var contentDisposition = section.GetContentDispositionHeader();
                    if (contentDisposition != null)
                    {
                        if (contentDisposition.IsFileDisposition())
                        {
                            using var memoryStream = new MemoryStream();
                            await section.Body.CopyToAsync(memoryStream);
                            files.Add((contentDisposition.Name.Value, contentDisposition.FileName.Value, memoryStream.ToArray()));
                        }
                        else if (contentDisposition.IsFormDisposition())
                        {
                            using var streamReader = new StreamReader(section.Body);
                            formFields[contentDisposition.Name.Value] = await streamReader.ReadToEndAsync();
                        }
                    }

                    section = await reader.ReadNextSectionAsync();
                }

                await hoaDbCommon.UpdateOwnerDB(userName,formFields);

                returnMessage = "Property was updated";
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateProperty, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Property - check log");
            }
            
            return new OkObjectResult(returnMessage);
        }

    } // public static class WebApi
}

