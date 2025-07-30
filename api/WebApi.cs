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
/*
// Define a super global constant for the log file (this will be in scope for all functions)
define("LOG_FILE", "./php.log");
require_once 'vendor/autoload.php';

// Figure out how many levels up to get to the "public_html" root folder
$webRootDirOffset = substr_count(strstr(dirname(__FILE__),"public_html"),DIRECTORY_SEPARATOR) + 1;
// Get settings and credentials from a file in a directory outside of public_html
// (assume a settings file in the "external_includes" folder one level up from "public_html")
$extIncludePath = dirname(__FILE__, $webRootDirOffset+1).DIRECTORY_SEPARATOR.'external_includes'.DIRECTORY_SEPARATOR;
require_once $extIncludePath.'hoadbSecrets.php';
require_once $extIncludePath.'jjkloginSettings.php';
// Common functions
require_once 'php_secure/commonUtil.php';
// Common database functions and table record classes
require_once 'php_secure/hoaDbCommon.php';

use \jkauflin\jjklogin\LoginAuth;

try {
    $loginAuth = new LoginAuth($hostJJKLogin, $dbadminJJKLogin, $passwordJJKLogin, $dbnameJJKLogin);
    $userRec = $loginAuth->getUserRec();
    if ($userRec->userName == null || $userRec->userName == '') {
        throw new Exception('User is NOT logged in', 500);
    }
    if ($userRec->userLevel < 1) {
        throw new Exception('User is NOT authorized (contact Administrator)', 500);
    }

    $username = $userRec->userName;
    $reportName = getParamVal("reportName");
    $mailingListName = getParamVal("mailingListName");
    $logDuesLetterSend = paramBoolVal("logDuesLetterSend");
    $logWelcomeLetters = paramBoolVal("logWelcomeLetters");

    $outputArray = array();
    $conn = getConn($host, $dbadmin, $password, $dbname);

    if ($reportName == "SalesReport" || $reportName == "SalesNewOwnerReport") {
        $sql = "";
    	if ($reportName == "SalesNewOwnerReport") {
    		$sql = "SELECT * FROM hoa_sales WHERE ProcessedFlag != 'Y' ORDER BY CreateTimestamp DESC; ";
    	} else {
    		$sql = "SELECT * FROM hoa_sales ORDER BY CreateTimestamp DESC; ";
    	}
		$stmt = $conn->prepare($sql);
    	$stmt->execute();
    	$result = $stmt->get_result();
    	$stmt->close();

    	if ($result->num_rows > 0) {
    		while($row = $result->fetch_assoc()) {
    			$hoaSalesRec = new HoaSalesRec();
    			$hoaSalesRec->PARID = $row["PARID"];
    			$hoaSalesRec->CONVNUM = $row["CONVNUM"];
    			$hoaSalesRec->SALEDT = $row["SALEDT"];
    			$hoaSalesRec->PRICE = $row["PRICE"];
    			$hoaSalesRec->OLDOWN = $row["OLDOWN"];
    			$hoaSalesRec->OWNERNAME1 = $row["OWNERNAME1"];
    			$hoaSalesRec->PARCELLOCATION = $row["PARCELLOCATION"];
    			$hoaSalesRec->MAILINGNAME1 = $row["MAILINGNAME1"];
    			$hoaSalesRec->MAILINGNAME2 = $row["MAILINGNAME2"];
    			$hoaSalesRec->PADDR1 = $row["PADDR1"];
    			$hoaSalesRec->PADDR2 = $row["PADDR2"];
    			$hoaSalesRec->PADDR3 = $row["PADDR3"];
    			$hoaSalesRec->CreateTimestamp = $row["CreateTimestamp"];
    			$hoaSalesRec->NotificationFlag = $row["NotificationFlag"];
    			$hoaSalesRec->ProcessedFlag = $row["ProcessedFlag"];
    			$hoaSalesRec->LastChangedBy = $row["LastChangedBy"];
    			$hoaSalesRec->LastChangedTs = $row["LastChangedTs"];
    			$hoaSalesRec->WelcomeSent = $row["WelcomeSent"];

    			$hoaSalesRec->adminLevel = $userRec->userLevel;

                array_push($outputArray,$hoaSalesRec);
    		}
    		$result->close();
    	}
    	// End of if ($reportName == "SalesReport" || $reportName == "SalesNewOwnerReport") {

    } else if ($reportName == "IssuesReport") {
		$sql = "SELECT * FROM hoa_communications WHERE CommType='Issue' ORDER BY LastChangedTs DESC ";
		$stmt = $conn->prepare($sql);
    	$stmt->execute();
    	$result = $stmt->get_result();
    	$stmt->close();
    	$cnt = 0;

        if ($result->num_rows > 0) {
    		// Loop through all the member properties
    		while($row = $result->fetch_assoc()) {
                $cnt = $cnt + 1;

                $hoaCommRec = new HoaCommRec();
                $hoaCommRec->Parcel_ID = $row["Parcel_ID"];
                $hoaCommRec->CommID = $row["CommID"];
                $hoaCommRec->CreateTs = $row["CreateTs"];
                $hoaCommRec->OwnerID = $row["OwnerID"];
                $hoaCommRec->CommType = $row["CommType"];
                $hoaCommRec->CommDesc = $row["CommDesc"];

    			$hoaRec = getHoaRec($conn,$hoaCommRec->Parcel_ID,$hoaCommRec->OwnerID);
                $hoaRec->commList = array();
				array_push($hoaRec->commList,$hoaCommRec);
    			array_push($outputArray,$hoaRec);
    		}
        }

    } else if ($reportName == "PaidDuesCountsReport") {

    	// get the data for the counts summary by FY
    	$parcelId = "";
    	$ownerId = "";
    	$fy = 0;
    	$duesAmt = "";
    	$paid = FALSE;
    	$nonCollectible = FALSE;

    	//$sql = "SELECT * FROM hoa_assessments WHERE FY > 2006 ORDER BY FY DESC; ";
    	$sql = "SELECT * FROM hoa_assessments WHERE FY > 2006 ORDER BY FY,Parcel_ID,OwnerID DESC; ";

    //  a.FY
    //	a.Paid

    	$stmt = $conn->prepare($sql);
    	$stmt->execute();
    	$result = $stmt->get_result();
    	$stmt->close();

    	$paidCnt = 0;
    	$unPaidCnt = 0;
    	$nonCollCnt = 0;
    	$totalDue = 0.0;
    	$nonCollDue = 0.0;
    	$cnt = 0;
    	$prevFY = "";
    	$prevParcelId = "";
    	$prevOwnerId = "";
    	if ($result->num_rows > 0) {
    		// Loop through all the member properties
    		while($row = $result->fetch_assoc()) {
    			$cnt = $cnt + 1;

    			//$parcelId = $row["Parcel_ID"];
    			//$ownerId = $row["OwnerID"];

    			$fy = $row["FY"];
    			$duesAmt = $row["DuesAmt"];
    			$paid = $row["Paid"];
    			$nonCollectible = $row["NonCollectible"];

    			if ($cnt == 1) {
    				$prevFY = $fy;
    			}


    			if ($fy != $prevFY) {
    				$paidDuesCountsRec = new PaidDuesCountsRec();
    				$paidDuesCountsRec->fy = $prevFY;
    				$paidDuesCountsRec->paidCnt = $paidCnt;
    				$paidDuesCountsRec->unpaidCnt = $unPaidCnt;
    				$paidDuesCountsRec->nonCollCnt = $nonCollCnt;
    				$paidDuesCountsRec->totalDue = $totalDue;
    				$paidDuesCountsRec->nonCollDue = $nonCollDue;
    				array_push($outputArray,$paidDuesCountsRec);

    				// reset counts
    				$paidCnt = 0;
    				$unPaidCnt = 0;
    				$nonCollCnt = 0;
    				$totalDue = 0.0;
    				$nonCollDue = 0.0;
    				$prevFY = $fy;
    				$prevParcelId = $parcelId;
    				$prevOwnerId = $ownerId;
    			}

    			// Find duplicate assessments for the same parcel

    			if ($paid) {
    				$paidCnt++;
    			} else {
    				if ($nonCollectible) {
    					$nonCollCnt++;
    					$nonCollDue += stringToMoney($duesAmt);
    				} else {
    					$unPaidCnt++;
    					$totalDue += stringToMoney($duesAmt);
    				}
    			}

    		}

    		// Get the last bucket
    		$paidDuesCountsRec = new PaidDuesCountsRec();
    		$paidDuesCountsRec->fy = $prevFY;
    		$paidDuesCountsRec->paidCnt = $paidCnt;
    		$paidDuesCountsRec->unpaidCnt = $unPaidCnt;
    		$paidDuesCountsRec->nonCollCnt = $nonCollCnt;
    		$paidDuesCountsRec->totalDue = $totalDue;
    		$paidDuesCountsRec->nonCollDue = $nonCollDue;
    		array_push($outputArray,$paidDuesCountsRec);

    	}

    } else {
        // The general Reports query - creating a list of HoaRec records (with all data for the Property)
        // This PHP service is about getting the list of HOA records, then the javascript will display the
        // records and provide downloads for each particular report
    	//$parcelId = "";
    	$ownerId = "";
    	$fy = 0;

        $duesOwed = false;
        $skipEmail = false;
        $salesWelcome = false;
        $currYearPaid = false;
        $currYearUnpaid = false;

        if ($reportName == "PaidDuesReport") {
            $currYearPaid = true;
        }
        if ($reportName == "UnpaidDuesReport") {
            $currYearUnpaid = true;
        }

        if ($mailingListName == 'WelcomeLetters') {
            $salesWelcome = true;
        }

        // If creating Dues Letters, skip properties that don't owe anything
        if (substr($mailingListName,0,10) == 'Duesletter') {
            $duesOwed = true;
        }
        // Skip postal mail for 1st Notices if Member has asked to use Email
        if ($mailingListName == 'Duesletter1') {
            $skipEmail = true;
        }

        $outputArray = getHoaRecList($conn,$duesOwed,$skipEmail,$salesWelcome,$currYearPaid,$currYearUnpaid);

        if ($userRec->userLevel > 1) {
            foreach ($outputArray as $hoaRec)  {

                // If flag is set, mark the Welcome Letters as MAILED
                if ($logWelcomeLetters) {
                    $stmt = $conn->prepare("UPDATE hoa_sales SET WelcomeSent='Y',LastChangedBy=?,LastChangedTs=CURRENT_TIMESTAMP WHERE PARID = ? AND WelcomeSent = 'S' ; ");
	                $stmt->bind_param("ss",$userRec->userName,$hoaRec->Parcel_ID);
	                $stmt->execute();
	                $stmt->close();
                }

                if ($logDuesLetterSend) {
                    $commType = 'Dues Notice';
                    $commDesc = "Postal mail notice sent";
                    $Email = false;
                    $SentStatus = 'Y';

                    if ($hoaRec->ownersList[0]->AlternateMailing) {
                        $Addr = $hoaRec->ownersList[0]->Alt_Address_Line1;
                    } else {
                        $Addr = $hoaRec->Parcel_Location;
                    }

                    insertCommRec($conn,$hoaRec->Parcel_ID,$hoaRec->ownersList[0]->OwnerID,$commType,$commDesc,
                        $hoaRec->ownersList[0]->Mailing_Name,$Email,
                        $Addr,$SentStatus,$userRec->userName);

                } // if ($logDuesLetterSend) {

            } // Loop through hoa recs
        } // If admin

    } // End of } else if ($reportName == "DuesReport") {

    // Close db connection
    $conn->close();

    echo json_encode($outputArray);

} catch(Exception $e) {
    error_log(date('[Y-m-d H:i] '). "in " . basename(__FILE__,".php") . ", Exception = " . $e->getMessage() . PHP_EOL, 3, LOG_FILE);
    echo json_encode(
        array(
            'error' => $e->getMessage(),
            'error_code' => $e->getCode()
        )
    );
}

function getHoaRecList($conn,$duesOwed=false,$skipEmail=false,$salesWelcome=false,
    $currYearPaid=false,$currYearUnpaid=false,$testEmail=false) {


//----------------------------------------------------------------------------------------------------------------
//  Function to return an array of full hoaRec objects (with a couple of parameters to filter list)
//----------------------------------------------------------------------------------------------------------------
function getHoaRecList($conn,$duesOwed=false,$skipEmail=false,$salesWelcome=false,
    $currYearPaid=false,$currYearUnpaid=false,$testEmail=false) {

    $outputArray = array();

    if ($testEmail) {
        $testEmailParcel = getConfigValDB($conn,'duesEmailTestParcel');
        $sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = '$testEmailParcel' AND p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 ";
    } else {
        $fy = 0;
        if ($currYearPaid || $currYearUnpaid) {
            // *** just use the highest FY - the first assessment record ***
            $result = $conn->query("SELECT MAX(FY) AS maxFY FROM hoa_assessments; ");
            if ($result->num_rows > 0) {
                while($row = $result->fetch_assoc()) {
                    $fy = $row["maxFY"];
                }
                $result->close();
            }
        }

        // try to get the parameters into the initial select query to limit the records it then tries to get from the getHoaRec
        if ($salesWelcome) {
            $sql = "SELECT p.Parcel_ID,o.OwnerID FROM hoa_properties p, hoa_owners o, hoa_sales s" .
                            " WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 AND p.Parcel_ID = s.PARID" .
                            " AND s.WelcomeSent = 'S' ORDER BY s.CreateTimestamp DESC; ";
        } else if ($currYearUnpaid) {
            $sql = "SELECT p.Parcel_ID,o.OwnerID FROM hoa_properties p, hoa_owners o, hoa_assessments a " .
                        "WHERE p.Parcel_ID = o.Parcel_ID AND a.OwnerID = o.OwnerID AND p.Parcel_ID = a.Parcel_ID " .
                        "AND a.FY = " . $fy . " AND a.Paid = 0 ORDER BY p.Parcel_ID; ";
                        // current owner?
        } else if ($currYearPaid) {
            $sql = "SELECT p.Parcel_ID,o.OwnerID FROM hoa_properties p, hoa_owners o, hoa_assessments a " .
                        "WHERE p.Parcel_ID = o.Parcel_ID AND a.OwnerID = o.OwnerID AND p.Parcel_ID = a.Parcel_ID " .
                        "AND a.FY = " . $fy . " AND a.Paid = 1 ORDER BY p.Parcel_ID; ";
                        // current owner?
        } else {
            // All properties and current owner
            $sql = "SELECT * FROM hoa_properties p, hoa_owners o WHERE p.Parcel_ID = o.Parcel_ID AND o.CurrentOwner = 1 ".
                            "ORDER BY p.Parcel_ID; ";
        }
    }

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();

    $cnt = 0;
    if ($result->num_rows > 0) {
    	// Loop through all the member properties
    	while($row = $result->fetch_assoc()) {
    		$cnt = $cnt + 1;

    		$parcelId = $row["Parcel_ID"];
    		$ownerId = $row["OwnerID"];

            // Don't include FY because you want all assessments to calculate Total Due
    		//$hoaRec = getHoaRec($conn,$parcelId,$ownerId,$fy);
    		$hoaRec = getHoaRec($conn,$parcelId,$ownerId);

            // If creating Dues Letters, skip properties that don't owe anything
            if ($duesOwed && $hoaRec->TotalDue < 0.01) {
                continue;
            }
            // Skip postal mail for 1st Notices if Member has asked to use Email
            if ($skipEmail && $hoaRec->UseEmail) {
                continue;
            }

    	    array_push($outputArray,$hoaRec);
    	}
    }

    return $outputArray;
}

*/
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
                } else {
                    return new BadRequestObjectResult("GetHoaRec failed because parcelId was NOT FOUND");
                }

                hoaCommunicationsList = await hoaDbCommon.GetCommunications(parcelId);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }

            return new OkObjectResult(hoaCommunicationsList);
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

                ownerRec = await hoaDbCommon.UpdateOwnerDB(userName, formFields);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateProperty, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Property - check log");
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

                assessmentRec = await hoaDbCommon.UpdateAssessmentDB(userName,formFields);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in UpdateProperty, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult("Error in update of Property - check log");
            }
            
            return new OkObjectResult(assessmentRec);
        }


    } // public static class WebApi
}

