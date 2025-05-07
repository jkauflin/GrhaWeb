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

using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

//using Azure.Storage.Blobs;


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

/*
public class UploadRequest
{
    public string Username { get; set; }
    public string Email { get; set; }
    public string FileName { get; set; }
    public string FileData { get; set; } // Base64-encoded data
}
*/
        [Function("UploadFile")]
        public async Task<IActionResult> UploadFile(
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

/*
							<select id="DocCategory" class="p-1">
								<option value="Quail Call newsletter">Quail Call newsletter</option>
								<option value="Annual Meeting">Annual Meeting</option>
								<option value="Governing Doc">Governing Doc</option>
								<option value="Historical Doc">Historical Doc</option>

							<input id="DocMonth" type="month" class="" required>

							<input  id="DocFile" class="form-control" type="file" name="FormFile1" accept="application/pdf" required/>
*/
                // Example usage
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


                /*
 // Get MIME type
                var contentType = MimeUtility.GetMimeMapping(file.FileName);

                // Configure storage connection and container
                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = "your-container-name";

                // Initialize Blob client
                var blobServiceClient = new BlobServiceClient(connectionString);
                var containerClient = blobServiceClient.GetBlobContainerClient(containerName);
                await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

                // Generate Blob name with folder structure
                var folderPath = $"uploads/{DateTime.UtcNow:yyyyMMdd}";
                var blobName = $"{folderPath}/{Path.GetFileNameWithoutExtension(file.FileName)}_{DateTime.UtcNow:HHmmss}{Path.GetExtension(file.FileName)}";
                var blobClient = containerClient.GetBlobClient(blobName);

                using var stream = file.OpenReadStream();
                await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });
                */


                //await hoaDbCommon.UpdTrustee(trustee);
            }
            catch (Exception ex) {
                log.LogError($"Exception in DB update to Board of Trustees, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Trustee data - check log");
            }
            
            return new OkObjectResult("Update was successful");
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

/*
								<select id="EventCategory" class="p-1">
									<option value="Christmas">Christmas</option>
									<option value="Halloween">Halloween</option>
									<option value="Easter">Easter</option>

									<input  id="PhotoTitle1" name="PhotoTitle1" type="text" class="form-control" maxlength="40" placeholder="Enter description"/>
									<input  id="PhotoFile1" name="PhotoFile1" class="form-control" type="file" accept="image/jpeg" />
									<input  id="PhotoTitle2" name="PhotoTitle2" type="text" class="form-control" maxlength="40" placeholder="Enter description" />
									<input  id="PhotoFile2" name="PhotoFile2" class="form-control" type="file" accept="image/jpeg" />
									<input  id="PhotoTitle3" name="PhotoTitle3" type="text" class="form-control" maxlength="40" placeholder="Enter description" />
									<input  id="PhotoFile3" name="PhotoFile3" class="form-control" type="file" accept="image/jpeg" />
*/
                // Example usage
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


                /*
 // Get MIME type
                var contentType = MimeUtility.GetMimeMapping(file.FileName);

                // Configure storage connection and container
                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = "your-container-name";

                // Initialize Blob client
                var blobServiceClient = new BlobServiceClient(connectionString);
                var containerClient = blobServiceClient.GetBlobContainerClient(containerName);
                await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

                // Generate Blob name with folder structure
                var folderPath = $"uploads/{DateTime.UtcNow:yyyyMMdd}";
                var blobName = $"{folderPath}/{Path.GetFileNameWithoutExtension(file.FileName)}_{DateTime.UtcNow:HHmmss}{Path.GetExtension(file.FileName)}";
                var blobClient = containerClient.GetBlobClient(blobName);

                using var stream = file.OpenReadStream();
                await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });
                */


                //await hoaDbCommon.UpdTrustee(trustee);
            }
            catch (Exception ex) {
                log.LogError($"Exception in DB update to Board of Trustees, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Trustee data - check log");
            }
            
            return new OkObjectResult("Update was successful");
        }


    } // public static class AdminApi

} // namespace GrhaWeb.Function
