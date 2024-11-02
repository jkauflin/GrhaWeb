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

================================================================================*/
using System;
using System.IO;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public static class WebApi
    {
        [FunctionName("GetPropertyList")]
        public static async Task<IActionResult> GetPropertyList(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            [CosmosDB(Connection = "API_COSMOS_DB_CONN_STR")] CosmosClient cosmosClient,
            ILogger log,
            ClaimsPrincipal claimsPrincipal)
        {
            bool userAuthorized = false;
            if (req.Host.ToString().Equals("localhost:4280")) {
                // If local DEV look for Admin
                foreach (Claim claim in claimsPrincipal.Claims)
                {
                    //log.LogInformation("CLAIM TYPE: " + claim.Type + "; CLAIM VALUE: " + claim.Value + "</br>");
                    if (claim.Value.Equals("Admin")) {
                        userAuthorized = true;
                    }
                }
            } else {
                // In PROD, make sure user is in correct role to make updates
                userAuthorized = claimsPrincipal.IsInRole("hoadbadmin");
            }

            if (!userAuthorized) {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation(">>> User is authorized ");

            // Construct the query from the query parameters
            string sql = $"";

            // Get the content string from the HTTP request body
            string content = await new StreamReader(req.Body).ReadToEndAsync();
            // Deserialize the JSON string into a generic JSON object
            JObject jObject = JObject.Parse(content);

            if (jObject.TryGetValue("searchStr", out JToken jToken)) {
                string searchStr = (string)jToken;
                searchStr = searchStr.Trim().ToUpper();
                
                sql = $"SELECT * FROM c WHERE "
                        +$"CONTAINS(UPPER(c.Parcel_ID),'{searchStr}') "
                        +$"OR CONTAINS(UPPER(c.LotNo),'{searchStr}') "
                        +$"OR CONTAINS(UPPER(c.Parcel_Location),'{searchStr}') "
                        +$"OR CONTAINS(UPPER(CONCAT(c.Owner_Name1,' ',c.Owner_Name2,' ',c.Mailing_Name)),'{searchStr}') "
                        +$"ORDER BY c.id";
            }
            else {
                /*
                >>>>> get search by these specific values working (IF NEEDED)

                parcelId: parcelId.value,
                lotNo: lotNo.value,
                address: address.value,
                ownerName: ownerName.value,
                phoneNo: phoneNo.value,
                altAddress: altAddress.value


		// Default SQL
		$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 AND UPPER(p.Parcel_ID) ";
		$paramStr = " ";

		if (!empty($parcelId)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 AND UPPER(p.Parcel_ID) ";
			$paramStr = wildCardStrFromTokens($parcelId);
		} elseif (!empty($lotNo)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 AND p.LotNo ";
			$paramStr = wildCardStrFromTokens($lotNo);
		} elseif (!empty($address)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 AND UPPER(p.Parcel_Location) ";
			$paramStr = wildCardStrFromTokens($address);
		} elseif (!empty($ownerName)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND UPPER(CONCAT(o.Owner_Name1,' ',o.Owner_Name2,' ',o.Mailing_Name)) ";
			// Check if a tokenized string was entered, break it into token and put wildcards between each token?
			// search need to be bullitproof if you are using it for members
			$paramStr = wildCardStrFromTokens($ownerName);
		} elseif (!empty($phoneNo)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND UPPER(o.Owner_Phone) ";
			$paramStr = wildCardStrFromTokens($phoneNo);
		} elseif (!empty($altAddress)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND UPPER(o.Alt_Address_Line1) ";
			$paramStr = wildCardStrFromTokens($altAddress);
		} elseif (!empty($checkNo)) {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o, hoa_assessments a WHERE p.Parcel_ID = o.Parcel_ID AND p.Parcel_ID = a.Parcel_ID AND o.CurrentOwner = 1 AND UPPER(a.Comments) ";
			$paramStr = wildCardStrFromTokens($checkNo);
		} else {
			$sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 AND UPPER(p.Parcel_ID) ";
			// Hardcode the default to find all parcels
			$paramStr = '%r%';
		}

		$sql = $sql . "LIKE UPPER(?) ORDER BY p.Parcel_ID; ";

                */

            }
    
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";
            List<HoaProperty> hoaPropertyList = new List<HoaProperty>();
            HoaProperty hoaProperty = new HoaProperty();
            try {
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                var feed = container.GetItemQueryIterator<hoa_properties>(sql);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        hoaProperty= new HoaProperty();
                        hoaProperty.parcelId = item.Parcel_ID;
                        hoaProperty.lotNo = item.LotNo;
                        hoaProperty.subDivParcel = item.SubDivParcel;
                        hoaProperty.parcelLocation = item.Parcel_Location;
                        hoaProperty.ownerName = item.Owner_Name1 + " " + item.Owner_Name2;
                        hoaProperty.ownerPhone = item.Owner_Phone;
                        hoaPropertyList.Add(hoaProperty);
                    }
                }
            }
            catch (Exception ex) {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }
            
            return new OkObjectResult(hoaPropertyList);
        }

        //==============================================================================================================
        // Main details lookup service to get data from all the containers for a specific property and populate
        // the HoaRec object.  It also calculates the total Dues due with interest, and gets emails and sales info
        //==============================================================================================================
        [FunctionName("GetHoaRec")]
        public static async Task<IActionResult> GetHoaRec(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            [CosmosDB(Connection = "API_COSMOS_DB_CONN_STR")] CosmosClient cosmosClient,
            ILogger log,
            ClaimsPrincipal claimsPrincipal)
        {
            bool userAuthorized = false;
            if (req.Host.ToString().Equals("localhost:4280")) {
                // If local DEV look for Admin
                foreach (Claim claim in claimsPrincipal.Claims)
                {
                    //log.LogInformation("CLAIM TYPE: " + claim.Type + "; CLAIM VALUE: " + claim.Value + "</br>");
                    if (claim.Value.Equals("Admin")) {
                        userAuthorized = true;
                    }
                }
            } else {
                // In PROD, make sure user is in correct role to make updates
                userAuthorized = claimsPrincipal.IsInRole("hoadbadmin");
            }

            if (!userAuthorized) {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation(">>> User is authorized ");

            // >>>>>>>>>>>> where does the logging show up in Azure ????????????    App Insights??? <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

            // Get the content string from the HTTP request body
            string content = await new StreamReader(req.Body).ReadToEndAsync();
            // Deserialize the JSON string into a generic JSON object
            JObject jObject = JObject.Parse(content);
    
            // Construct the query from the query parameters
            string parcelId = "";
            string ownerId = "";
            string fy = "";
            string saleDate = "";

            JToken jToken;
            if (jObject.TryGetValue("parcelId", out jToken)) {
                parcelId = (string)jToken;
            }
            if (jObject.TryGetValue("ownerId", out jToken)) {
                ownerId = (string)jToken;
            }
            if (jObject.TryGetValue("fy", out jToken)) {
                fy = (string)jToken;
            }
            if (jObject.TryGetValue("saleDate", out jToken)) {
                saleDate = (string)jToken;
            }

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";
            string sql = $"";
            
            HoaRec hoaRec = new HoaRec();
            hoaRec.totalDue = 0.00m;
            hoaRec.paymentInstructions = "";
            hoaRec.paymentFee = 0.00m;
	        hoaRec.duesEmailAddr = "";
	        //$CurrentOwnerID = 0;

            hoaRec.ownersList = new List<hoa_owners>();
            hoaRec.assessmentsList = new List<hoa_assessments>();
            hoaRec.commList = new List<hoa_communications>();
            hoaRec.salesList = new List<hoa_sales>();
            hoaRec.totalDuesCalcList = new List<TotalDuesCalcRec>();
            hoaRec.emailAddrList = new List<string>();

            try {
                Database db = cosmosClient.GetDatabase(databaseId);

                //----------------------------------- Property --------------------------------------------------------
                containerId = "hoa_properties";
                Container container = db.GetContainer(containerId);
                sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' ";
                var feed = container.GetItemQueryIterator<hoa_properties>(sql);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        hoaRec.property = item;
                    }
                }

                //----------------------------------- Owners ----------------------------------------------------------
                containerId = "hoa_owners";
                Container ownersContainer = db.GetContainer(containerId);
                if (!ownerId.Equals("")) {
                    sql = $"SELECT * FROM c WHERE c.id = '{ownerId}' AND c.Parcel_ID = '{parcelId}' ";
                } else {
                    sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{parcelId}' ORDER BY c.OwnerID DESC ";
                }
                var ownersFeed = ownersContainer.GetItemQueryIterator<hoa_owners>(sql);
                cnt = 0;
                while (ownersFeed.HasMoreResults)
                {
                    var response = await ownersFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        hoaRec.ownersList.Add(item);

                        if (item.CurrentOwner == 1) {
                            // Current Owner fields are already part of the properties record (including property.OwnerID)
                            hoaRec.duesEmailAddr = item.EmailAddr;
                            if (!item.EmailAddr.Equals("")) {
                                hoaRec.emailAddrList.Add(item.EmailAddr);
                            }
                            if (!item.EmailAddr2.Equals("")) {
                                hoaRec.emailAddrList.Add(item.EmailAddr2);
                            }
                        }
                    }
                }

                //----------------------------------- Emails ----------------------------------------------------------
                containerId = "hoa_payments";
                Container paymentsContainer = db.GetContainer(containerId);
                //--------------------------------------------------------------------------------------------------
                // Override email address to use if we get the last email used to make an electronic payment
                // 10/15/2022 JJK Modified to only look for payments within the last year (because of renter issue)
                //--------------------------------------------------------------------------------------------------
                sql = $"SELECT * FROM c WHERE c.OwnerID = {hoaRec.property.OwnerID} AND c.Parcel_ID = '{parcelId}' AND c.payment_date > DateTimeAdd('yy', -1, GetCurrentDateTime()) ";
                var paymentsFeed = paymentsContainer.GetItemQueryIterator<hoa_payments>(sql);
                cnt = 0;
                while (paymentsFeed.HasMoreResults)
                {
                    var response = await paymentsFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        if (!item.payer_email.Equals("")) {
                            // If there is an email from the last electronic payment, for the current Owner,
				            // add it to the email list (if not already in the array)
                            string compareStr = item.payer_email.ToLower();
                            if (Array.IndexOf(hoaRec.emailAddrList.ToArray(), compareStr) < 0) {
                                hoaRec.emailAddrList.Add(compareStr);
                            }
                        }
                    }
                }


                //----------------------------------- Assessments -----------------------------------------------------
                containerId = "hoa_assessments";
                Container assessmentsContainer = db.GetContainer(containerId);
                if (fy.Equals("") || fy.Equals("LATEST")) {
                    sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{parcelId}' ORDER BY c.FY DESC ";
                } else {
                    sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{parcelId}' AND c.FY = {fy} ORDER BY c.FY DESC ";
                }
                var assessmentsFeed = assessmentsContainer.GetItemQueryIterator<hoa_assessments>(sql);
                cnt = 0;
                //$fyPayment = ''; >>>>>>>>>>>>>>>>>>>>>>>> don't need this anymore
		        //$onlyCurrYearDue = false;
                while (assessmentsFeed.HasMoreResults)
                {
                    var response = await assessmentsFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        if (fy.Equals("LATEST") && cnt > 1) {
                            continue;
                        }
                        hoaRec.assessmentsList.Add(item);

                        // $hoaAssessmentRec->DuesDue = 1; <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< search use of DuesDue
                
                        // If NOT PAID and past the due date, add a Create Lien button to go to edit
                        //if (!rec.Paid && rec.DuesDue && !rec.NonCollectible) {
                        /*
                        $hoaAssessmentRec->DuesDue = 0;
                        if (!$hoaAssessmentRec->Paid && !$hoaAssessmentRec->NonCollectible) {
                            if ($cnt == 1) {
                                $onlyCurrYearDue = true;
                                $fyPayment = $hoaAssessmentRec->FY;
                            } else {
                                $onlyCurrYearDue = false;
                            }

                            // check dates???

                            if ($dateDue=date_create($hoaAssessmentRec->DateDue)) {
                                // Current System datetime
                                $currSysDate=date_create();
                                if ($currSysDate > $dateDue) {
                                    $hoaAssessmentRec->DuesDue = 1;
                                }
                            }
                        }
                        */




                    } // Assessments loop
                }


                //----------------------------------- Dues Calc  ------------------------------------------------------
                //----------------------------------- Sales -----------------------------------------------------------


            }
            catch (Exception ex) {
                log.LogError($"Exception in DB query to {containerId}, message = {ex.Message}");
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }
            
            return new OkObjectResult(hoaRec);
        }



        // Public access for website Dues page
        [FunctionName("GetPropertyList2")]
        public static async Task<IActionResult> GetPropertyList2(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            [CosmosDB(Connection = "API_COSMOS_DB_CONN_STR")] CosmosClient cosmosClient,
            ILogger log,
            ClaimsPrincipal claimsPrincipal)
        {
            // Get the content string from the HTTP request body
            string searchAddress = await new StreamReader(req.Body).ReadToEndAsync();

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";

            List<HoaProperty2> hoaProperty2List = new List<HoaProperty2>();

            HoaProperty2 hoaProperty2 = new HoaProperty2();

            try {
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                // Get the existing document from Cosmos DB
                string sql = $"";
                if (searchAddress.Equals("")) {
                    sql = $"SELECT * FROM c ORDER BY c.id";
                } else {
                    sql = $"SELECT * FROM c WHERE CONTAINS(UPPER(c.Parcel_Location),'{searchAddress.Trim().ToUpper()}') ORDER BY c.id";
                }

                var feed = container.GetItemQueryIterator<hoa_properties>(sql);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        //log.LogInformation($"{cnt}  Name: {mediaPeople.PeopleName}");
                        hoaProperty2= new HoaProperty2();
                        hoaProperty2.parcelId = item.Parcel_ID;
                        hoaProperty2.lotNo = item.LotNo;
                        hoaProperty2.subDivParcel = item.SubDivParcel;
                        hoaProperty2.parcelLocation = item.Parcel_Location;
                        hoaProperty2List.Add(hoaProperty2);
                    }
                }
            }
            catch (Exception ex) {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(hoaProperty2List);
        }

        // Public access for website Dues page
        [FunctionName("GetHoaRec2")]
        public static async Task<IActionResult> GetHoaRec2(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            [CosmosDB(Connection = "API_COSMOS_DB_CONN_STR")] CosmosClient cosmosClient,
            ILogger log,
            ClaimsPrincipal claimsPrincipal)
        {
            // Get the content string from the HTTP request body
            string searchAddress = await new StreamReader(req.Body).ReadToEndAsync();

	        //$parcelId = getParamVal("parcelId");

    /*
	$conn = getConn($host, $dbadmin, $password, $dbname);
	$hoaRec = getHoaRec2($conn,$parcelId);
	
	$conn->close();
	
	echo json_encode($hoaRec);
    */

            CommonUtil util = new CommonUtil();
            //util.CalcCompoundInterest(principal, startdate);


            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";

            List<HoaProperty2> hoaProperty2List = new List<HoaProperty2>();

            HoaProperty2 hoaProperty2 = new HoaProperty2();

            try {
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                // Get the existing document from Cosmos DB
                string sql = $"";
                if (searchAddress.Equals("")) {
                    sql = $"SELECT * FROM c ORDER BY c.id";
                } else {
                    sql = $"SELECT * FROM c WHERE CONTAINS(c.Parcel_Location,'{searchAddress.Trim()}') ORDER BY c.id";
                }

                var feed = container.GetItemQueryIterator<hoa_properties>(sql);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        //log.LogInformation($"{cnt}  Name: {mediaPeople.PeopleName}");
                        hoaProperty2= new HoaProperty2();
                        hoaProperty2.parcelId = item.Parcel_ID;
                        hoaProperty2.lotNo = item.LotNo;
                        hoaProperty2.subDivParcel = item.SubDivParcel;
                        hoaProperty2.parcelLocation = item.Parcel_Location;
                        hoaProperty2List.Add(hoaProperty2);
                    }
                }
            }
            catch (Exception ex) {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(hoaProperty2List);

        } // public static async Task<IActionResult> GetHoaRec2(


    } // public static class WebApi

    public class HoaProperty {
        public string parcelId { get; set; }
        public int lotNo { get; set; }
        public int subDivParcel { get; set; }
        public string parcelLocation { get; set; }
	    public string ownerName { get; set; }
	    public string ownerPhone { get; set; }
    }

    public class HoaProperty2 {
        public string parcelId { get; set; }
        public int lotNo { get; set; }
        public int subDivParcel { get; set; }
        public string parcelLocation { get; set; }
    }

}

