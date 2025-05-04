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

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;
using System.Collections.Generic;

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
        [Function("UploadFiles")]
        public async Task<IActionResult> UploadFiles(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequest req)
        {
            try {
                string userName = "";
                if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                    return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
                }
                //log.LogInformation($">>> User is authorized - userName: {userName}");

                // Get the content from the HTTP request body
                var boundary = HeaderUtilities.RemoveQuotes(MediaTypeHeaderValue.Parse(req.ContentType).Boundary).Value;
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
                foreach (var field in formFields)
                {
                    log.LogWarning($"Field {field.Key}: {field.Value}");
                }

                foreach (var file in files)
                {
                    log.LogWarning($"File {file.fileName} from field {file.fieldName}, Size: {file.content.Length} bytes");
                    
                    //byte[] fileBytes = ...; // Your byte array
                    string filePath = "/Projects/"+file.fileName; // Specify the file path
                    File.WriteAllBytes(filePath, file.content);

                    /*
                    using (FileStream fs = new FileStream("output.bin", FileMode.Create, FileAccess.Write))
                    {
                        fs.Write(fileBytes, 0, fileBytes.Length);
                    }
                    */
                }

/*
[2025-05-04T14:49:02.901Z] >>> in UploadFiles
[2025-05-04T14:49:02.904Z] Field TestName: Jimmy Page
[2025-05-04T14:49:02.905Z] File (1998) Hero Pup (cd insert front).jpg from field FormFile1, Size: 363844 bytes
*/



                /*
------WebKitFormBoundaryZmAf0g67pRbaZNKj
Content-Disposition: form-data; name="TestName"

jjk
------WebKitFormBoundaryZmAf0g67pRbaZNKj--

------WebKitFormBoundary6NdPJ7AGweIoAGKD
Content-Disposition: form-data; name="file"; filename="(1987) Freedomrock (cover).jpg"
Content-Type: image/jpeg

                var formdata = await req.ReadFormAsync();
                var formCollection = await req.ReadFormAsync();
                var content = await new StreamReader(req.ReadAsStringAsync()).ReadToEndAsync(); 
                */

        // Read and deserialize JSON
        /*
        string requestBody = new StreamReader(req.Body).ReadToEnd();
        var data = JsonConvert.DeserializeObject<UploadRequest>(requestBody);

        if (data?.FileData == null)
        {
            return new BadRequestObjectResult("Invalid request payload.");
        }

        // Decode Base64 file data and save it
        var fileData = Convert.FromBase64String(data.FileData);
        var path = Path.Combine(Path.GetTempPath(), data.FileName);
        File.WriteAllBytes(path, fileData);
        */

                /*
                var formdata = await req.ReadFormAsync();
                var file = req.Form.Files["file"];
                return new OkObjectResult(file.FileName + " - " + file.Length.ToString());


                var form = await req.ReadFormAsync();
                var file = form.Files["file"];
                if (file == null || file.Length == 0)
                {
                    return new BadRequestObjectResult("No file uploaded or file is empty.");
                }

                // File size limit (100 MB)
                const long maxFileSize = 100 * 1024 * 1024;
                if (file.Length > maxFileSize)
                {
                    return new BadRequestObjectResult($"File size exceeds the limit of {maxFileSize / (1024 * 1024)}MB.");
                }

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

/*
var content = await new StreamReader(req.ReadAsStringAsync()).ReadToEndAsync(); 

                if (!req.HasFormContentType)
                {
                    return new BadRequestObjectResult("Please send a multipart/form-data request.");
                }

                var formCollection = await req.ReadFormAsync();
                var files = formCollection.Files;

                if (files.Count == 0)
                {
                    return new BadRequestObjectResult("No files uploaded.");
                }

                foreach (var file in files)
                {
                    var fileName = file.FileName;
                    log.LogInformation($"Processing file: {fileName}");

                    using (var stream = file.OpenReadStream())
                    {
                        // Here you can process the file stream, e.g., upload to Azure Blob Storage
                        var content = await new StreamReader(stream).ReadToEndAsync();
                        log.LogInformation($"File {fileName} content length: {content.Length}");
                    }
                }
*/

/*

            <form enctype="multipart/form-data" action="http://localhost:7071/api/FileUpload" method="post">
                <input name="file" type="file" /> <br>
                <input type="submit">
            </form>


            function fileUploaded(event){
  //Get the upload input element.
  const fileInput = event.target;
  //Get the first file.
  const fileData = fileInput.files[0];
  //Create a form data object.
  let formData = new FormData();
  //Add file.
  formData.append("file", fileData);
  //Set reqeust properties.
  const requestProperties = {
    method: "POST",
    body: formData //Add form data to request.
  };
  //Url of the backend where you want to upload the file to.
  const fileUploadURL = "http://localhost:7071/api/FileUpload";
  //Make the request.
  makeRequest(fileUploadURL, requestProperties);
}
async function makeRequest(url, requestProperties){
  let response = await fetch(url, requestProperties);
  console.log(response.status);
}

               var formData = await req.ReadFormAsync();
                //Get file.
                var file = formData.Files["file"];
                //For this demo I will save the file localy to the desktop. 
                //In a real scenario you could process the file and return some sort of result or save it to a DB/Cloud storage.
                using(Stream outStream = File.OpenWrite(@"C:\Users\DTPC\Desktop\" + file.FileName))
                    file.CopyTo(outStream);
                //Return seccessful response.
                return new OkObjectResult("File was uploaded.");
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
