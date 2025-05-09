/*==============================================================================
(C) Copyright 2025 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure API Functions for the Static Web App (SWA) - to support
                the Admin operations
--------------------------------------------------------------------------------
Modification History
2025-04-12 JJK  Initial version
2025-04-13 JJK  Completed the Board of Trustees maintenance functions
2025-04-22 JJK  Re-thinking error handling for api calls from javascript fetch
2025-05-07 JJK  Adding function for handling file uploads
================================================================================*/
using System.IO;
//using System.Text;
using System.Threading.Tasks;

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
            var trustee = new Trustee{id = "01"};
            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                    //log.LogWarning($">>> User is NOT authorized - userName: {userName}");
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }
                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get the content string from the HTTP request body
                string trusteeId = await new StreamReader(req.Body).ReadToEndAsync();

                trustee = await hoaDbCommon.GetTrusteeById(trusteeId);
                //log.LogWarning($"trustee.Name: {trustee.Name}");
            }
            catch (Exception ex) {
                log.LogError($"Exception in DB get of Board of Trustees, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in get of Trustee data - check log");
            }
            
            return new OkObjectResult(trustee);
        }

        [Function("UpdateTrustee")]
        public async Task<IActionResult> UpdateTrustee(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            //var trustee = new Trustee{id = "01"};
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
                var trustee = jObject.ToObject<Trustee>();
                if (trustee == null) {
                    return new BadRequestObjectResult("Update failed - object was NULL");
                } 
                await hoaDbCommon.UpdTrustee(trustee);
            }
            catch (Exception ex) {
                log.LogError($"Exception in DB update to Board of Trustees, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Trustee data - check log");
            }
            
            return new OkObjectResult("Update was successful");
        }


        [Function("UploadDoc")]
        public async Task<IActionResult> UploadDoc(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
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

                // Example usage
                /*
                foreach (var field in formFields)
                {
                    log.LogInformation($"Field {field.Key}: {field.Value}");
                }

                foreach (var file in files)
                {
                    log.LogInformation($"File {file.fileName} from field {file.fieldName}, Size: {file.content.Length} bytes");

                    //byte[] fileBytes = ...; // Your byte array
                    //string filePath = "/Projects/"+file.fileName; // Specify the file path
                    //File.WriteAllBytes(filePath, file.content);
                }
                */

                int mediaTypeId = 4;
                string docCategory = formFields["DocCategory"];
                string docMonth = formFields["DocMonth"];
                string dateString = docMonth+"-01";
                DateTime mediaDateTime = DateTime.Parse(dateString);
                string docName;
                string docTitle;
                if (files[0].fieldName.Equals("DocFile")) {
                    docName = files[0].fileName;
                    docTitle = files[0].fileName;
                    if (docCategory.Equals("Quail Call newsletters")) {
                        docName = docMonth+"-GRHA-QuailCall.pdf";
                        docTitle = docMonth+"-GRHA-QuailCall";
                    }

                    await hoaDbCommon.UploadFileToDatabase(mediaTypeId, docName, mediaDateTime, files[0].content, docCategory, docTitle);
                } 
            }
            catch (Exception ex) {
                log.LogError($"Exception in Doc File upload, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error Doc File upload - check log");
            }
            
            return new OkObjectResult("Upload was successful");
        }


        [Function("UploadPhotos")]
        public async Task<IActionResult> UploadPhotos(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
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

                int mediaTypeId = 1;
                string eventCategory = formFields["EventCategory"];
                string eventMonth = formFields["EventMonth"];
                string dateString = eventMonth+"-01";
                DateTime mediaDateTime = DateTime.Parse(dateString);
                string newFileName;
                string title = "";
                int cnt = 0;
                foreach (var file in files)
                {
                    cnt++;
                    //log.LogWarning($"File {file.fileName} from field {file.fieldName}, Size: {file.content.Length} bytes");
                    newFileName = mediaDateTime.ToString("yyyy-MM ") + file.fileName;

                    // Maybe I could get the title by position, but I want to make sure it matches the file
                    //var entry = myDictionary.ElementAt(1);
                    //Console.WriteLine($"Key: {entry.Key}, Value: {entry.Value}");
                    if (cnt == 1) {
                        title = formFields["PhotoTitle1"].Trim();
                    } else if (cnt == 2) {
                        title = formFields["PhotoTitle2"].Trim();
                    } else if (cnt == 3) {
                        title = formFields["PhotoTitle3"].Trim();
                    }

                    await hoaDbCommon.UploadFileToDatabase(mediaTypeId, newFileName, mediaDateTime, files[cnt-1].content, eventCategory, title);
                }
            }
            catch (Exception ex) {
                log.LogError($"Exception in Photos upload, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in upload of Photos - check log");
            }
            
            return new OkObjectResult("Upload was successful");
        }


    } // public static class AdminApi

} // namespace GrhaWeb.Function
