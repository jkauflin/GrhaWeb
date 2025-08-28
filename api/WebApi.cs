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
2025-08-03 JJK  Added GetSalesList and UpdateSales functions to get sales data
                and update the sales record WelcomeSent flag
2025-08-08 JJK  Added new owner update function
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
                if (jObject.TryGetValue("ownerId", out jToken))
                {
                    ownerId = jToken.ToString();
                }
                if (jObject.TryGetValue("fy", out jToken))
                {
                    fy = jToken.ToString();
                }
                if (jObject.TryGetValue("saleDate", out jToken))
                {
                    saleDate = jToken.ToString();
                }

                hoaRec = await hoaDbCommon.GetHoaRec(parcelId, ownerId, fy, saleDate);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaRec);
        }


        //==============================================================================================================
        // Function to return a list of full HoaRec objects with filtering options (for Reports and Mailing Lists)
        //==============================================================================================================
        [Function("GetHoaRecList")]
        public async Task<IActionResult> GetHoaRecList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<HoaRec> hoaRecList = new List<HoaRec>();
            bool duesOwed = false;
            bool skipEmail = false;
            //bool salesWelcome = false;
            bool currYearPaid = false;
            bool currYearUnpaid = false;
            bool testEmail = false;

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
                string reportName = "";
                //string mailingListName = "";
                //bool logDuesLetterSend = false;
                //bool logWelcomeLetters = false;

                JToken? jToken;
                if (jObject.TryGetValue("reportName", out jToken))
                {
                    reportName = jToken.ToString();
                    if (reportName.Equals(""))
                    {
                        return new BadRequestObjectResult("GetHoaRecList failed because reportName was blank");
                    }
                }
                else
                {
                    return new BadRequestObjectResult("GetHoaRecList failed because reportName was NOT FOUND");
                }

                /*
                if (jObject.TryGetValue("mailingListName", out jToken))
                {
                    mailingListName = jToken.ToString();
                }
                if (jObject.TryGetValue("logDuesLetterSend", out jToken))
                {
                    logDuesLetterSend = jToken.Type == JTokenType.Boolean ? jToken.Value<bool>() : false;
                }
                if (jObject.TryGetValue("logWelcomeLetters", out jToken))
                {
                    logWelcomeLetters = jToken.Type == JTokenType.Boolean ? jToken.Value<bool>() : false;
                }

                if (reportName.Equals("PaidDuesReport"))
                {
                    currYearPaid = true;
                }
                if (reportName.Equals("UnpaidDuesReport"))
                {
                    currYearUnpaid = true;
                }
                if (mailingListName.Equals("WelcomeLetters"))
                {
                    salesWelcome = true;
                }
                */
                if (reportName.StartsWith("Duesletter") || reportName.Equals("UnpaidDuesRankingReport"))
                {
                    duesOwed = true;
                }
                if (reportName.StartsWith("Duesletter1"))
                {
                    skipEmail = true;
                }

                hoaRecList = await hoaDbCommon.GetHoaRecListDB(duesOwed, skipEmail, currYearPaid, currYearUnpaid, testEmail);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaRecList);
        }


        [Function("GetSalesList")]
        public async Task<IActionResult> GetSalesList(
                [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<hoa_sales> hoaSalesList = new List<hoa_sales>();

            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation(">>> User is authorized ");

                // Get the content string from the HTTP request body
                /*
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);

                // Construct the query from the query parameters
                string reportName = "";

                JToken? jToken;
                if (jObject.TryGetValue("reportName", out jToken))
                {
                    reportName = jToken.ToString().Trim();
                    if (reportName.Equals(""))
                    {
                        return new BadRequestObjectResult("Query failed because reportName was blank");
                    }
                } else {
                    return new BadRequestObjectResult("Query failed because reportName was NOT FOUND");
                }
                */
                hoaSalesList = await hoaDbCommon.GetSalesListDb();
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaSalesList);
        }


        [Function("GetConfigList")]
        public async Task<IActionResult> GetConfigList(
                [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<hoa_config> hoaConfigList = new List<hoa_config>();

            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation(">>> User is authorized ");

                hoaConfigList = await hoaDbCommon.GetConfigListDB();
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaConfigList);
        }

        [Function("UpdateConfig")]
        public async Task<IActionResult> UpdateConfig(
                [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            hoa_config hoaConfig;

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
                string configName = "";
                string configDesc = "";
                string configValue = "";

                JToken? jToken;
                if (jObject.TryGetValue("configName", out jToken))
                {
                    configName = jToken.ToString().Trim();
                    if (configName.Equals(""))
                    {
                        return new BadRequestObjectResult("Query failed because configName was blank");
                    }
                }
                else
                {
                    return new BadRequestObjectResult("Query failed because configName was NOT FOUND");
                }

                if (jObject.TryGetValue("configDesc", out jToken))
                {
                    configDesc = jToken.ToString().Trim();
                    if (configDesc.Equals(""))
                    {
                        return new BadRequestObjectResult("Query failed because configDesc was blank");
                    }
                }
                else
                {
                    return new BadRequestObjectResult("Query failed because configDesc was NOT FOUND");
                }

                if (jObject.TryGetValue("configValue", out jToken))
                {
                    configValue = jToken.ToString().Trim();
                }

                hoaConfig = await hoaDbCommon.UpdateConfigDB(userName, configName, configDesc, configValue);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaConfig);
        }

        [Function("GetPaidDuesCountList")]
        public async Task<IActionResult> GetPaidDuesCountList(
                [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<PaidDuesCount> duesCountList = new List<PaidDuesCount>();

            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation(">>> User is authorized ");

                duesCountList = await hoaDbCommon.GetPaidDuesCountListDb();
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(duesCountList);
        }


        [Function("UpdateSales")]
        public async Task<IActionResult> UpdateSales(
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

                // Get the content string from the HTTP request body
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);

                // Construct the query from the query parameters
                string parid = "";
                string saledt = "";
                string processedFlag = "";
                string welcomeSent = "";

                JToken? jToken;
                if (jObject.TryGetValue("parid", out jToken))
                {
                    parid = jToken.ToString().Trim();
                    if (parid.Equals(""))
                    {
                        return new BadRequestObjectResult("Query failed because parid was blank");
                    }
                }
                else
                {
                    return new BadRequestObjectResult("Query failed because parid was NOT FOUND");
                }

                if (jObject.TryGetValue("saledt", out jToken))
                {
                    saledt = jToken.ToString().Trim();
                    if (saledt.Equals(""))
                    {
                        return new BadRequestObjectResult("Query failed because saledt was blank");
                    }
                }
                else
                {
                    return new BadRequestObjectResult("Query failed because saledt was NOT FOUND");
                }

                if (jObject.TryGetValue("processedFlag", out jToken))
                {
                    processedFlag = jToken.ToString().Trim();
                }

                if (jObject.TryGetValue("welcomeSent", out jToken))
                {
                    welcomeSent = jToken.ToString().Trim();
                }

                await hoaDbCommon.UpdateSalesDB(userName, parid, saledt, processedFlag, welcomeSent);
                returnMessage = "Sales record was updated";
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateSales, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Sales record - check log");
            }

            return new OkObjectResult(returnMessage);
        }


        [Function("GetCommunications")]
        public async Task<IActionResult> GetCommunications(
                [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<hoa_communications> hoaCommunicationsList = new List<hoa_communications>();

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

                hoaCommunicationsList = await hoaDbCommon.GetCommunicationsDB(parcelId);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaCommunicationsList);
        }

        [Function("CreateDuesNoticeEmails")]
        public async Task<IActionResult> CreateDuesNoticeEmails(
                [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            List<hoa_communications> hoaCommunicationsList = new List<hoa_communications>();
            string returnMessage = "";

            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                //log.LogInformation(">>> User is authorized ");

                // Get the content string from the HTTP request body
                /*
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);

                // Construct the query from the query parameters
                string parcelId = "";

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
                */

                hoaCommunicationsList = await hoaDbCommon.CreateDuesNoticeEmailsDB(userName);
                returnMessage = "Dues Notice Emails created successfully";
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(returnMessage);
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
                await hoaDbCommon.UpdatePropertyDB(userName, formFields);

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
            hoa_owners ownerRec = new hoa_owners();
            //string returnMessage = "";
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

                string ownerId = formFields["OwnerID"].Trim();
                if (ownerId.Equals("*** CREATE NEW OWNER (on Save) ***"))
                {
                    ownerRec = await hoaDbCommon.NewOwnerDB(userName, formFields);
                }
                else
                {
                    ownerRec = await hoaDbCommon.UpdateOwnerDB(userName, formFields);
                }
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateProperty, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Owner - check log");
            }

            return new OkObjectResult(ownerRec);
        }

        [Function("UpdateAssessment")]
        public async Task<IActionResult> UpdateAssessment(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            hoa_assessments assessmentRec = new hoa_assessments();
            //string returnMessage = "";
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

                assessmentRec = await hoaDbCommon.UpdateAssessmentDB(userName, formFields);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateProperty, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Property - check log");
            }

            return new OkObjectResult(assessmentRec);
        }


        // Bulk add assessments for all properties for a given FiscalYear and DuesAmt
        [Function("AddAssessments")]
        public async Task<IActionResult> AddAssessments(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string resultMessage = "";
            try
            {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
                {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }

                string content = await new StreamReader(req.Body).ReadToEndAsync();
                JObject jObject = JObject.Parse(content);

                string fiscalYear = "";
                string duesAmt = "";
                JToken? jToken;
                if (jObject.TryGetValue("FiscalYear", out jToken))
                {
                    fiscalYear = jToken.ToString().Trim();
                }
                if (jObject.TryGetValue("DuesAmt", out jToken))
                {
                    duesAmt = jToken.ToString().Trim();
                }
                if (string.IsNullOrEmpty(fiscalYear) || string.IsNullOrEmpty(duesAmt))
                {
                    return new BadRequestObjectResult("FiscalYear and DuesAmt are required");
                }

                int fy = int.Parse(fiscalYear);
                decimal amt = decimal.Parse(duesAmt);
                int count = await hoaDbCommon.AddAssessmentsBulk(userName, fy, amt);
                resultMessage = $"Added {count} assessments for Fiscal Year {fy} with DuesAmt {amt:C}";
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in AddAssessments, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Error in AddAssessments - {ex.Message}");
            }
            return new OkObjectResult(resultMessage);
        }


    } // public static class WebApi
}


