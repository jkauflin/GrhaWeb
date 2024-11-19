/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure API Functions for the Static Web App (SWA) - this should
              replace all of the old PHP code, and be the "backend" services
              for the web apps
--------------------------------------------------------------------------------
Modification History
2024-11-18 JJK  Initial version (moving GetPropertyList2 and GetHoaRec2 into
                this public api class to get data for the public facing
                website
================================================================================*/
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;     // for IActionResult
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json.Linq;

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class WebApiPublic
    {
        private readonly ILogger<WebApi> log;
        private readonly IConfiguration config;
        private readonly string? apiCosmosDbConnStr;
        private readonly CommonUtil util;

        public WebApiPublic(ILogger<WebApi> logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];
            util = new CommonUtil(log);
        }

        // Public access for website Dues page
        [Function("GetPropertyList2")]
        public async Task<IActionResult> GetPropertyList2(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
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
                //var mySetting = _configuration["MY_ENV_VARIABLE"];
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr); 
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                // Get the existing document from Cosmos DB
                string sql = $"";
                if (searchAddress.Equals("")) {
                    sql = $"SELECT * FROM c ORDER BY c.id";
                } else {
                    sql = $"SELECT * FROM c WHERE CONTAINS(UPPER(c.Parcel_Location),'{searchAddress.Trim().ToUpper()}') ORDER BY c.id";
                }

                var feed = container.GetItemQueryIterator<hoa_properties2>(sql);
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


        //==============================================================================================================
        // Main details lookup service to get data from all the containers for a specific property and populate
        // the HoaRec object.  It also calculates the total Dues due with interest, and gets emails and sales info
        //==============================================================================================================
        [Function("GetHoaRec2")]
        public async Task<IActionResult> GetHoaRec2(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            // Get the content string from the HTTP request body
            string parcelId = await new StreamReader(req.Body).ReadToEndAsync();

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";
            string sql = $"";
            
            HoaRec2 hoaRec2 = new HoaRec2();
            hoaRec2.totalDue = 0.00m;
            hoaRec2.paymentInstructions = "";
            hoaRec2.paymentFee = 0.00m;
	        //hoaRec2.duesEmailAddr = "";
	        //$CurrentOwnerID = 0;

            //hoaRec2.ownersList = new List<hoa_owners>();                 // Do we need this???????????????????????
            hoaRec2.assessmentsList = new List<hoa_assessments>();
            //hoaRec2.commList = new List<hoa_communications>();
            //hoaRec2.salesList = new List<hoa_sales>();                   // Why do we need this??????????????????????
            hoaRec2.totalDuesCalcList = new List<TotalDuesCalcRec>();
            //hoaRec2.emailAddrList = new List<string>();

            try {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr); 
                Database db = cosmosClient.GetDatabase(databaseId);
                Container configContainer = db.GetContainer("hoa_config");

                //----------------------------------- Property --------------------------------------------------------
                containerId = "hoa_properties";
                Container container = db.GetContainer(containerId);
                sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' ";
                var feed = container.GetItemQueryIterator<hoa_properties2>(sql);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        hoaRec2.property = item;
                    }
                }

                //----------------------------------- Assessments -----------------------------------------------------
                containerId = "hoa_assessments";
                Container assessmentsContainer = db.GetContainer(containerId);
                sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{parcelId}' ORDER BY c.FY DESC ";
                var assessmentsFeed = assessmentsContainer.GetItemQueryIterator<hoa_assessments>(sql);
                cnt = 0;
                //$fyPayment = ''; >>>>>>>>>>>>>>>>>>>>>>>> don't need this anymore
		        //$onlyCurrYearDue = false;
                bool onlyCurrYearDue = false;
                DateTime currDate = DateTime.Now;
                DateTime dateTime;
                DateTime dateDue;
				decimal duesAmt = 0.0m;
                decimal totalLateFees = 0.0m;
                int monthsApart;
                TotalDuesCalcRec totalDuesCalcRec;
                while (assessmentsFeed.HasMoreResults)
                {
                    var response = await assessmentsFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        if (item.DateDue is null) {
                            dateDue = DateTime.Parse((item.FY-1).ToString()+"-10-01");
                        } else {
                            dateDue = DateTime.Parse(item.DateDue);
                        }
                        item.DateDue = dateDue.ToString("yyyy-MM-dd");
                        // If you don't need the DateTime object, you can do it in 1 line
                        //item.DateDue = DateTime.Parse(item.DateDue).ToString("yyyy-MM-dd");

                        if (item.Paid == 1) {
                            if (string.IsNullOrWhiteSpace(item.DatePaid)) {
                                item.DatePaid = item.DateDue;
                            }
                            dateTime = DateTime.Parse(item.DatePaid);
                            item.DatePaid = dateTime.ToString("yyyy-MM-dd");
                        }

                        item.DuesDue = false;

                        if (item.Paid != 1 && item.NonCollectible != 1) {
                            if (cnt == 1) {
                                onlyCurrYearDue = true;
						        //$fyPayment = $hoaAssessmentRec->FY;
                            } else { 
                                onlyCurrYearDue = false;
                            }

                            // check dates (if NOT PAID)
                            if (currDate > dateDue) {
                                item.DuesDue = true;
                            } 

                            string duesAmtStr = item.DuesAmt ?? "";
                            duesAmt = util.stringToMoney(duesAmtStr);
                            
                            hoaRec2.totalDue += duesAmt;

                            totalDuesCalcRec = new TotalDuesCalcRec();
                            totalDuesCalcRec.calcDesc = "FY " + item.FY.ToString() + " Assessment (due " + item.DateDue + ")";
                            totalDuesCalcRec.calcValue = duesAmt.ToString();
                            hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);

                            //================================================================================================================================
                            // 2024-11-01 JJK - Updated Total Due logic according to changes specified by GRHA Board and new Treasurer
                            //      Remove the restriction of an Open Lien to adding the interest on the unpaid assessment - it will now start adding
                            //      interest when unpaid and past the DUE DATE.
                            //      In addition, a $10 a month late fee will be added to any unpaid assessments
                            //          *** Starting on 11/1/2024, Do it for every unpaid assessment (per year) for number of months from 11/1/FY-1
                            //          FY > 2024
                            //          if months > 10, use 10 ($100) - show a LATE FEE for every unpaid assessment
                            //================================================================================================================================
                            //if ($hoaAssessmentRec->Lien && $hoaAssessmentRec->Disposition == 'Open') {
                            if (item.DuesDue) {
                                onlyCurrYearDue = false;
                                // If still calculating interest dynamically calculate the compound interest
                                if (item.StopInterestCalc != 1) {
                                    item.AssessmentInterest = util.CalcCompoundInterest(duesAmt, dateDue);
                                }

                                hoaRec2.totalDue += item.AssessmentInterest;

                                totalDuesCalcRec = new TotalDuesCalcRec();
                                totalDuesCalcRec.calcDesc = "%6 Interest on FY " + item.FY.ToString() + " Assessment (since " + item.DateDue + ")";
                                totalDuesCalcRec.calcValue = item.AssessmentInterest.ToString();
                                hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);

                                // Calculate monthly late fees (starting in November 2024 for the FY 2025)
                                if (item.FY > 2024) {
                                    // number of months between the due date and current date
                                    monthsApart = ((currDate.Year - dateDue.Year) * 12) + currDate.Month - dateDue.Month;
                                    // Ensure the number of months is non-negative
                                    monthsApart = Math.Abs(monthsApart);
                                    if (monthsApart > 10) {
                                        monthsApart = 10;
                                    }

                                    totalLateFees = 10.00m * monthsApart;
                                    hoaRec2.totalDue += totalLateFees;

                                    int prevFY = item.FY-1;
                                    totalDuesCalcRec = new TotalDuesCalcRec();
                                    totalDuesCalcRec.calcDesc = "$10 a Month late fee on FY " + item.FY.ToString() + " Assessment (since " + prevFY.ToString() + "-10-31)";
                                    totalDuesCalcRec.calcValue = totalLateFees.ToString();
                                    hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);
                                }

                            } // if (item.DuesDue) {

                        } // if (item.Paid != 1 && item.NonCollectible != 1) {

                        // If the Assessment was Paid but the interest was not, then add the interest to the total
                        if (item.Paid == 1 && item.InterestNotPaid == 1) {
                            onlyCurrYearDue = false;

                            // If still calculating interest dynamically calculate the compound interest
                            if (item.StopInterestCalc != 1) {
                                item.AssessmentInterest = util.CalcCompoundInterest(duesAmt, dateDue);
                            }

                            hoaRec2.totalDue += item.AssessmentInterest;

                            totalDuesCalcRec = new TotalDuesCalcRec();
                            totalDuesCalcRec.calcDesc = "%6 Interest on FY " + item.FY.ToString() + " Assessment (since " + item.DateDue + ")";
                            totalDuesCalcRec.calcValue = item.AssessmentInterest.ToString();
                            hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);
                        } //  if (item.Paid == 1 && item.InterestNotPaid == 1) {

				        // If there is an Open Lien (not Paid, Released, or Closed)
                        string dispositionStr = item.Disposition ?? "";
                        if (item.Lien == 1 && dispositionStr.Equals("Open") && item.NonCollectible != 1) {
                            
					        // calc interest - start date   WHEN TO CALC INTEREST
					        // unpaid fee amount and interest since the Filing Date

					        // if there is a Filing Fee (on an Open Lien), then check to calc interest (or use stored value)
                            if (item.FilingFee > 0.0m) {
                                hoaRec2.totalDue += item.FilingFee;
                                totalDuesCalcRec = new TotalDuesCalcRec();
                                totalDuesCalcRec.calcDesc = "FY " + item.FY.ToString() + " Assessment Lien Filing Fee";
                                totalDuesCalcRec.calcValue = item.FilingFee.ToString();
                                hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);

                                // If still calculating interest dynamically calculate the compound interest
                                if (item.StopInterestCalc != 1) {
                                    item.FilingFeeInterest = util.CalcCompoundInterest(item.FilingFee, item.DateFiled);
                                }

                                hoaRec2.totalDue += item.FilingFeeInterest;
                                totalDuesCalcRec = new TotalDuesCalcRec();
                                totalDuesCalcRec.calcDesc = "%6 Interest on Filing Fees (since " + item.DateFiled.ToString("yyyy-MM-dd") + ")";
                                totalDuesCalcRec.calcValue = item.FilingFeeInterest.ToString();
                                hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);
                            }

                            if (item.ReleaseFee > 0.0m) {
                                hoaRec2.totalDue += item.ReleaseFee;
                                totalDuesCalcRec = new TotalDuesCalcRec();
                                totalDuesCalcRec.calcDesc = "FY " + item.FY.ToString() + " Assessment Lien Release Fee";
                                totalDuesCalcRec.calcValue = item.ReleaseFee.ToString();
                                hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);
                            }

                            if (item.BankFee > 0.0m) {
                                hoaRec2.totalDue += item.BankFee;
                                totalDuesCalcRec = new TotalDuesCalcRec();
                                totalDuesCalcRec.calcDesc = "FY " + item.FY.ToString() + " Assessment Bank Fee";
                                totalDuesCalcRec.calcValue = item.BankFee.ToString();
                                hoaRec2.totalDuesCalcList.Add(totalDuesCalcRec);
                            }
                        } // if (item.Lien == 1 && item.Disposition.Equals("Open") && item.NonCollectible != 1) {

                        hoaRec2.assessmentsList.Add(item);

                    } // Assessments loop
                }

                //---------------------------------------------------------------------------------------------------
                // Construct the online payment button and instructions according to what is owed
                //---------------------------------------------------------------------------------------------------
                // Only display payment button if something is owed
                // For now, only set payment button if just the current year dues are owed (no other years or open liens)
                if (hoaRec2.totalDue > 0.0m) {
                    hoaRec2.paymentInstructions = await util.getConfigVal(db, configContainer, "OfflinePaymentInstructions");
                    hoaRec2.paymentFee = decimal.Parse(await util.getConfigVal(db, configContainer, "paymentFee"));
                    if (onlyCurrYearDue) {
                        hoaRec2.paymentInstructions = await util.getConfigVal(db, configContainer, "OnlinePaymentInstructions");
                    }
                }

                //----------------------------------- Sales -----------------------------------------------------------
                /*
                containerId = "hoa_sales";
                Container salesContainer = db.GetContainer(containerId);
                if (saleDate.Equals("")) {
                    sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' ORDER BY c.CreateTimestamp DESC ";
                } else {
                    sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' AND c.SALEDT = {saleDate} ";
                }
                var salesFeed = salesContainer.GetItemQueryIterator<hoa_sales>(sql);
                cnt = 0;
                while (salesFeed.HasMoreResults)
                {
                    var response = await salesFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        hoaRec2.salesList.Add(item);
                    } // Sales loop
                }
                */

            }
            catch (Exception ex) {
                log.LogError($"Exception in DB query to {containerId}, message: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }
            
            return new OkObjectResult(hoaRec2);
        }


    } // public static class WebApi

    public class HoaProperty2 {
        public string? parcelId { get; set; }
        public int lotNo { get; set; }
        public int subDivParcel { get; set; }
        public string? parcelLocation { get; set; }
    }

}

