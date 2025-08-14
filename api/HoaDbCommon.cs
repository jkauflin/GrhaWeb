/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Common functions to handle getting data from the data sources.
              Centralize all data source libraries and configuration to this
              utility class.
--------------------------------------------------------------------------------
Modification History
2024-11-19 JJK  Initial versions
2025-04-12 JJK  Added functions to read and update BoardOfTrustee data source
2025-04-13 JJK  *** NEW philosophy - put the error handling (try/catch) in the
                main/calling function, and leave it out of the DB Common - DB
                Common will throw any error, and the caller can log and handle
2025-05-08 JJK  Added function to convert images and upload to 
2025-05-14 JJK  Added calc of DuesDue in the assessments record
2025-05=16 JJK  Working on DuesStatement (and PDF)
2025-05-31 JJK  Added AddPatchField and functions to update hoadb property
2025-06-27 JJK  Added Assessment update
2025-08-03 JJK  Added GetSalesList and UpdateSales functions to get sales data
                and update the sales record WelcomeSent flag
2025-08-08 JJK  Added new owner update function
================================================================================*/
using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

using GrhaWeb.Function.Model;
using Microsoft.Extensions.WebEncoders.Testing;

namespace GrhaWeb.Function
{
    public class HoaDbCommon
    {
        private readonly ILogger log;
        private readonly IConfiguration config;
        private readonly string? apiCosmosDbConnStr;
        private readonly string? apiStorageConnStr;
        private readonly string databaseId;
        private readonly CommonUtil util;

        public HoaDbCommon(ILogger logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];
            apiStorageConnStr = config["API_STORAGE_CONN_STR"];
            databaseId = "hoadb";
            util = new CommonUtil(log);
        }

        // Common internal function to lookup configuration values
        private async Task<string> getConfigVal(Container container, string configName)
        {
            string configVal = "";
            string sql = $"SELECT * FROM c WHERE c.ConfigName = '{configName}' ";
            var feed = container.GetItemQueryIterator<hoa_config>(sql);
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    configVal = item.ConfigValue ?? "";
                }
            }
            return configVal;
        }

        public async Task<List<HoaProperty>> GetPropertyList(string searchStr)
        {
            // Construct the query from the parameters
            searchStr = searchStr.Trim().ToUpper();
            string sql = $"SELECT * FROM c WHERE "
                        + $"CONTAINS(UPPER(c.Parcel_ID),'{searchStr}') "
                        + $"OR CONTAINS(UPPER(c.LotNo),'{searchStr}') "
                        + $"OR CONTAINS(UPPER(c.Parcel_Location),'{searchStr}') "
                        + $"OR CONTAINS(UPPER(CONCAT(c.Owner_Name1,' ',c.Owner_Name2,' ',c.Mailing_Name)),'{searchStr}') "
                        + $"ORDER BY c.id";

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_properties";
            List<HoaProperty> hoaPropertyList = new List<HoaProperty>();
            HoaProperty hoaProperty = new HoaProperty();

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
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
                    hoaProperty = new HoaProperty();
                    hoaProperty.parcelId = item.Parcel_ID;
                    hoaProperty.lotNo = item.LotNo;
                    hoaProperty.subDivParcel = item.SubDivParcel;
                    hoaProperty.parcelLocation = item.Parcel_Location;
                    hoaProperty.ownerName = item.Owner_Name1 + " " + item.Owner_Name2;
                    hoaProperty.ownerPhone = item.Owner_Phone;
                    hoaPropertyList.Add(hoaProperty);
                }
            }

            return hoaPropertyList;
        }

        public async Task<List<HoaProperty2>> GetPropertyList2(string searchAddress)
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";

            List<HoaProperty2> hoaProperty2List = new List<HoaProperty2>();

            HoaProperty2 hoaProperty2 = new HoaProperty2();

            //var mySetting = _configuration["MY_ENV_VARIABLE"];
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            // Get the existing document from Cosmos DB
            string sql = $"";
            if (searchAddress.Equals(""))
            {
                sql = $"SELECT * FROM c ORDER BY c.id";
            }
            else
            {
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
                    hoaProperty2 = new HoaProperty2();
                    hoaProperty2.parcelId = item.Parcel_ID;
                    hoaProperty2.lotNo = item.LotNo;
                    hoaProperty2.subDivParcel = item.SubDivParcel;
                    hoaProperty2.parcelLocation = item.Parcel_Location;
                    hoaProperty2List.Add(hoaProperty2);
                }
            }

            return hoaProperty2List;
        }

        //==============================================================================================================
        // Main details lookup service to get data from all the containers for a specific property and populate
        // the HoaRec object.  It also calculates the total Dues due with interest, and gets emails and sales info
        //==============================================================================================================
        public async Task<HoaRec> GetHoaRec(string parcelId, string ownerId = "", string fy = "", string saleDate = "")
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_properties";
            string sql = $"";

            HoaRec hoaRec = new HoaRec();
            hoaRec.totalDue = 0.00m;
            hoaRec.paymentInstructions = "";
            hoaRec.paymentFee = 0.00m;
            hoaRec.duesEmailAddr = "";

            hoaRec.ownersList = new List<hoa_owners>();
            hoaRec.assessmentsList = new List<hoa_assessments>();
            hoaRec.commList = new List<hoa_communications>();
            hoaRec.salesList = new List<hoa_sales>();
            hoaRec.totalDuesCalcList = new List<TotalDuesCalcRec>();
            hoaRec.emailAddrList = new List<string>();

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container configContainer = db.GetContainer("hoa_config");

            //----------------------------------- Property --------------------------------------------------------
            containerId = "hoa_properties";
            Container container = db.GetContainer(containerId);
            //sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' ";
            var queryDefinition = new QueryDefinition(
                "SELECT * FROM c WHERE c.id = @parcelId ")
                    .WithParameter("@parcelId", parcelId);
            var feed = container.GetItemQueryIterator<hoa_properties>(queryDefinition);
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

            if (!ownerId.Equals(""))
            {
                queryDefinition = new QueryDefinition(
                    "SELECT * FROM c WHERE c.id = @ownerId AND c.Parcel_ID = @parcelId ")
                    .WithParameter("@ownerId", ownerId)
                    .WithParameter("@parcelId", parcelId);
            }
            else
            {
                queryDefinition = new QueryDefinition(
                    "SELECT * FROM c WHERE c.Parcel_ID = @parcelId ORDER BY c.OwnerID DESC ")
                    .WithParameter("@parcelId", parcelId);
            }
            var ownersFeed = ownersContainer.GetItemQueryIterator<hoa_owners>(queryDefinition);
            cnt = 0;
            while (ownersFeed.HasMoreResults)
            {
                var response = await ownersFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    hoaRec.ownersList.Add(item);

                    if (item.CurrentOwner == 1)
                    {
                        // Current Owner fields are already part of the properties record (including property.OwnerID)

                        hoaRec.duesEmailAddr = item.EmailAddr;
                        if (!string.IsNullOrWhiteSpace(item.EmailAddr))
                        {
                            hoaRec.emailAddrList.Add(item.EmailAddr);
                        }
                        if (!string.IsNullOrWhiteSpace(item.EmailAddr2))
                        {
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
            sql = $"SELECT * FROM c WHERE c.OwnerID = {hoaRec.property!.OwnerID} AND c.Parcel_ID = '{parcelId}' AND c.payment_date > DateTimeAdd('yy', -1, GetCurrentDateTime()) ";
            var paymentsFeed = paymentsContainer.GetItemQueryIterator<hoa_payments>(sql);
            cnt = 0;
            while (paymentsFeed.HasMoreResults)
            {
                var response = await paymentsFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    if (!string.IsNullOrWhiteSpace(item.payer_email))
                    {
                        // If there is an email from the last electronic payment, for the current Owner,
                        // add it to the email list (if not already in the array)
                        string compareStr = item.payer_email.ToLower();
                        if (Array.IndexOf(hoaRec.emailAddrList.ToArray(), compareStr) < 0)
                        {
                            hoaRec.emailAddrList.Add(compareStr);
                        }
                    }
                }
            }

            //----------------------------------- Assessments -----------------------------------------------------
            containerId = "hoa_assessments";
            Container assessmentsContainer = db.GetContainer(containerId);
            if (fy.Equals("") || fy.Equals("LATEST"))
            {
                sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{parcelId}' ORDER BY c.FY DESC ";
            }
            else
            {
                sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{parcelId}' AND c.FY = {fy} ORDER BY c.FY DESC ";
            }
            var assessmentsFeed = assessmentsContainer.GetItemQueryIterator<hoa_assessments>(sql);
            cnt = 0;
            DateTime currDate = DateTime.Now;
            DateTime dateTime;
            DateTime dateDue;
            while (assessmentsFeed.HasMoreResults)
            {
                var response = await assessmentsFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    if (fy.Equals("LATEST") && cnt > 1)
                    {
                        continue;
                    }
                    /*
                    if (item.DateDue is null)
                    {
                        dateDue = DateTime.Parse((item.FY - 1).ToString() + "-10-01");
                    }
                    else
                    {
                        dateDue = DateTime.Parse(item.DateDue);
                    }
                    */
                    dateDue = DateTime.Parse((item.FY - 1).ToString() + "-10-01");
                    item.DateDue = dateDue.ToString("yyyy-MM-dd");
                    // If you don't need the DateTime object, you can do it in 1 line
                    //item.DateDue = DateTime.Parse(item.DateDue).ToString("yyyy-MM-dd");

                    if (item.Paid == 1)
                    {
                        if (string.IsNullOrWhiteSpace(item.DatePaid))
                        {
                            item.DatePaid = item.DateDue;
                        }
                        dateTime = DateTime.Parse(item.DatePaid);
                        item.DatePaid = dateTime.ToString("yyyy-MM-dd");
                    }

                    item.DuesDue = false;
                    if (item.Paid != 1 && item.NonCollectible != 1)
                    {
                        // check dates (if NOT PAID)
                        if (currDate > dateDue)
                        {
                            item.DuesDue = true;
                        }
                    }

                    hoaRec.assessmentsList.Add(item);

                } // Assessments loop
            }

            // Pass the assessments to the common function to calculate Total Dues
            bool onlyCurrYearDue;
            decimal totalDueOut;
            hoaRec.totalDuesCalcList = util.CalcTotalDues(hoaRec.assessmentsList, out onlyCurrYearDue, out totalDueOut);
            hoaRec.totalDue = totalDueOut;

            //---------------------------------------------------------------------------------------------------
            // Construct the online payment button and instructions according to what is owed
            //---------------------------------------------------------------------------------------------------
            // Only display payment button if something is owed
            // For now, only set payment button if just the current year dues are owed (no other years or open liens)
            if (hoaRec.totalDue > 0.0m)
            {
                hoaRec.paymentInstructions = await getConfigVal(configContainer, "OfflinePaymentInstructions");
                hoaRec.paymentFee = decimal.Parse(await getConfigVal(configContainer, "paymentFee"));
                if (onlyCurrYearDue)
                {
                    hoaRec.paymentInstructions = await getConfigVal(configContainer, "OnlinePaymentInstructions");
                }
            }

            //----------------------------------- Sales -----------------------------------------------------------
            containerId = "hoa_sales";
            Container salesContainer = db.GetContainer(containerId);
            if (saleDate.Equals(""))
            {
                sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' ORDER BY c.CreateTimestamp DESC ";
            }
            else
            {
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
                    hoaRec.salesList.Add(item);
                } // Sales loop
            }


            // Get fields needed for Dues Statement PDF
            hoaRec.duesStatementNotes = await getConfigVal(configContainer, "duesStatementNotes");
            hoaRec.hoaNameShort = await getConfigVal(configContainer, "hoaNameShort");

            return hoaRec;
        }


        public async Task<HoaRec2> GetHoaRec2(string parcelId)
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            HoaRec2 hoaRec2 = new HoaRec2();
            hoaRec2.totalDue = 0.00m;
            hoaRec2.paymentInstructions = "";
            hoaRec2.paymentFee = 0.00m;
            hoaRec2.assessmentsList = new List<hoa_assessments>();
            hoaRec2.totalDuesCalcList = new List<TotalDuesCalcRec>();
            string databaseId = "hoadb";
            string containerId = "hoa_properties";
            string sql;

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container configContainer = db.GetContainer("hoa_config");

            //----------------------------------- Property --------------------------------------------------------
            containerId = "hoa_properties";
            Container container = db.GetContainer(containerId);
            //sql = $"SELECT * FROM c WHERE c.id = '{parcelId}' ";

            var queryDefinition = new QueryDefinition(
                "SELECT * FROM c WHERE c.id = @parcelId ")
                    .WithParameter("@parcelId", parcelId);

            var feed = container.GetItemQueryIterator<hoa_properties2>(queryDefinition);
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
            DateTime dateTime;
            DateTime dateDue;
            while (assessmentsFeed.HasMoreResults)
            {
                var response = await assessmentsFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    /*
                    if (item.DateDue is null)
                    {
                        dateDue = DateTime.Parse((item.FY - 1).ToString() + "-10-01");
                    }
                    else
                    {
                        dateDue = DateTime.Parse(item.DateDue);
                    }
                    */
                    dateDue = DateTime.Parse((item.FY - 1).ToString() + "-10-01");
                    item.DateDue = dateDue.ToString("yyyy-MM-dd");
                    // If you don't need the DateTime object, you can do it in 1 line
                    //item.DateDue = DateTime.Parse(item.DateDue).ToString("yyyy-MM-dd");

                    if (item.Paid == 1)
                    {
                        if (string.IsNullOrWhiteSpace(item.DatePaid))
                        {
                            item.DatePaid = item.DateDue;
                        }
                        dateTime = DateTime.Parse(item.DatePaid);
                        item.DatePaid = dateTime.ToString("yyyy-MM-dd");
                    }

                    hoaRec2.assessmentsList.Add(item);

                } // Assessments loop
            }

            // Pass the assessments to the common function to calculate Total Dues
            bool onlyCurrYearDue;
            decimal totalDueOut;
            hoaRec2.totalDuesCalcList = util.CalcTotalDues(hoaRec2.assessmentsList, out onlyCurrYearDue, out totalDueOut);
            hoaRec2.totalDue = totalDueOut;

            //---------------------------------------------------------------------------------------------------
            // Construct the online payment button and instructions according to what is owed
            //---------------------------------------------------------------------------------------------------
            // Only display payment button if something is owed
            // For now, only set payment button if just the current year dues are owed (no other years or open liens)
            if (hoaRec2.totalDue > 0.0m)
            {
                hoaRec2.paymentInstructions = await getConfigVal(configContainer, "OfflinePaymentInstructions");
                hoaRec2.paymentFee = decimal.Parse(await getConfigVal(configContainer, "paymentFee"));
                if (onlyCurrYearDue)
                {
                    hoaRec2.paymentInstructions = await getConfigVal(configContainer, "OnlinePaymentInstructions");
                }
            }

            return hoaRec2;
        }


        //==============================================================================================================
        //  Function to return an array of full hoaRec objects (with a couple of parameters to filter list)
        //==============================================================================================================
        public async Task<List<HoaRec>> GetHoaRecListDB(
            bool duesOwed = false,
            bool skipEmail = false,
            bool salesWelcome = false,
            bool currYearPaid = false,
            bool currYearUnpaid = false,
            bool testEmail = false)
        {
            List<HoaRec> outputList = new List<HoaRec>();
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container propertiesContainer = db.GetContainer("hoa_properties");
            Container ownersContainer = db.GetContainer("hoa_owners");
            Container assessmentsContainer = db.GetContainer("hoa_assessments");
            //Container salesContainer = db.GetContainer("hoa_sales");
            Container configContainer = db.GetContainer("hoa_config");

            string sql = "";
            string? testEmailParcel = null;
            int fy = 0;

            if (testEmail)
            {
                // Get the test parcel from config
                testEmailParcel = await getConfigVal(configContainer, "duesEmailTestParcel");
                //sql = $"SELECT * FROM c WHERE c.Parcel_ID = '{testEmailParcel}' ORDER BY c.Parcel_ID";
            }

            // Get max FY if needed
            if (currYearPaid || currYearUnpaid)
            {
                var maxFyQuery = new QueryDefinition("SELECT VALUE MAX(c.FY) FROM c");
                var maxFyFeed = assessmentsContainer.GetItemQueryIterator<int>(maxFyQuery);
                while (fy == 0 && maxFyFeed.HasMoreResults)
                {
                    var response = await maxFyFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        fy = item;
                    }
                }
            }

            // Get all properties
            // get all current owners
            // get all NON-PAID assessments
            // *** re-do the GetHoaRec function to take advantage of the fact that you already have the full list of properties

            // Get all properties
            List<hoa_properties> propList = new List<hoa_properties>();
            var allPropQuery = new QueryDefinition("SELECT * FROM c ORDER BY c.Parcel_ID");
            var allPropFeed = propertiesContainer.GetItemQueryIterator<hoa_properties>(allPropQuery);
            while (allPropFeed.HasMoreResults)
            {
                var response = await allPropFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    propList.Add(item);
                }
            }

            // Get all current owners
            List<hoa_owners> ownerList = new List<hoa_owners>();
            var allOwnerQuery = new QueryDefinition("SELECT * FROM c WHERE c.CurrentOwner = 1");
            var allOwnerFeed = ownersContainer.GetItemQueryIterator<hoa_owners>(allOwnerQuery);
            while (allOwnerFeed.HasMoreResults)
            {
                var response = await allOwnerFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    ownerList.Add(item);
                }
            }

            // Get all non-paid, collectible assessments
            List<hoa_assessments> assessmentList = new List<hoa_assessments>();
            var allAssessmentQuery = new QueryDefinition("SELECT * FROM c WHERE c.Paid = 0 AND (IS_NULL(c.NonCollectible) OR c.NonCollectible != 1)");
            var allAssessmentFeed = assessmentsContainer.GetItemQueryIterator<hoa_assessments>(allAssessmentQuery);
            while (allAssessmentFeed.HasMoreResults)
            {
                var response = await allAssessmentFeed.ReadNextAsync();
                foreach (var item in response)
                {
                    assessmentList.Add(item);
                }
            }

            // Example: Build HoaRec for each property using the in-memory lists
            foreach (var prop in propList)
            {
                var hoaRec = BuildHoaRecFromLists(prop, ownerList, assessmentList);
                outputList.Add(hoaRec);
            }

            return outputList;
        }

        // Build an HoaRec using in-memory lists of owners and assessments
        public HoaRec BuildHoaRecFromLists(
            hoa_properties property,
            List<hoa_owners> ownerList,
            List<hoa_assessments> assessmentList)
        {
            HoaRec hoaRec = new HoaRec();
            hoaRec.property = property;
            hoaRec.ownersList = ownerList.Where(o => o.Parcel_ID == property.Parcel_ID).ToList();
            hoaRec.assessmentsList = assessmentList.Where(a => a.Parcel_ID == property.Parcel_ID).ToList();
            hoaRec.totalDuesCalcList = util.CalcTotalDues(hoaRec.assessmentsList, out bool onlyCurrYearDue, out decimal totalDueOut);
            hoaRec.totalDue = totalDueOut;
            // Add any other calculations or fields as needed
            return hoaRec;
        }

        /*
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

        public async Task<List<hoa_communications>> GetCommunications(string parcelId)
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_communications";
            //string sql = $"";

            List<hoa_communications> hoaCommunicationsList = new List<hoa_communications>();

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            //Container configContainer = db.GetContainer("hoa_config");

            Container container = db.GetContainer(containerId);
            var queryDefinition = new QueryDefinition(
                "SELECT * FROM c WHERE c.Parcel_ID = @parcelId ORDER BY c.CommID DESC ")
                    .WithParameter("@parcelId", parcelId);
            var feed = container.GetItemQueryIterator<hoa_communications>(queryDefinition);
            int cnt = 0;
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    hoaCommunicationsList.Add(item);
                }
            }

            return hoaCommunicationsList;
        }

        public async Task<List<hoa_sales>> GetSalesListDb()
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_sales";

            List<hoa_sales> hoaSalesList = new List<hoa_sales>();

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            //Container configContainer = db.GetContainer("hoa_config");
            Container container = db.GetContainer(containerId);
            var queryDefinition = new QueryDefinition("SELECT * FROM c ORDER BY c.CreateTimestamp DESC OFFSET 0 LIMIT 200 ");
            var feed = container.GetItemQueryIterator<hoa_sales>(queryDefinition);
            int cnt = 0;
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    hoaSalesList.Add(item);
                }
            }

            return hoaSalesList;
        }

        public async Task<List<PaidDuesCount>> GetPaidDuesCountListDb()
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_assessments";

            List<PaidDuesCount> duesCountList = new List<PaidDuesCount>();

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);
            //$sql = "SELECT * FROM hoa_assessments WHERE FY > 2006 ORDER BY FY,Parcel_ID,OwnerID DESC; ";
            string sql = "SELECT * FROM c WHERE c.FY > 2006 ORDER BY c.FY, c.Parcel_ID, c.OwnerID DESC";
            var feed = container.GetItemQueryIterator<hoa_assessments>(sql);

            int paidCnt = 0;
            int unPaidCnt = 0;
            int nonCollCnt = 0;
            decimal totalDue = 0.0m;
            decimal nonCollDue = 0.0m;
            int cnt = 0;
            int prevFY = 0;
            bool first = true;

            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    int fy = item.FY;
                    decimal duesAmt = 0.0m;
                    decimal.TryParse(item.DuesAmt?.ToString() ?? "0", out duesAmt);
                    int paid = item.Paid;
                    int nonCollectible = item.NonCollectible;

                    if (first)
                    {
                        prevFY = fy;
                        first = false;
                    }

                    if (fy != prevFY)
                    {
                        // Add previous FY bucket
                        PaidDuesCount rec = new PaidDuesCount
                        {
                            fy = prevFY,
                            paidCnt = paidCnt,
                            unpaidCnt = unPaidCnt,
                            nonCollCnt = nonCollCnt,
                            totalDue = totalDue,
                            nonCollDue = nonCollDue
                        };
                        duesCountList.Add(rec);

                        // Reset counters
                        paidCnt = 0;
                        unPaidCnt = 0;
                        nonCollCnt = 0;
                        totalDue = 0.0m;
                        nonCollDue = 0.0m;
                        prevFY = fy;
                    }

                    if (paid == 1)
                    {
                        paidCnt++;
                    }
                    else
                    {
                        if (nonCollectible == 1)
                        {
                            nonCollCnt++;
                            nonCollDue += duesAmt;
                        }
                        else
                        {
                            unPaidCnt++;
                            totalDue += duesAmt;
                        }
                    }
                }
            }

            // Add last bucket
            if (!first)
            {
                PaidDuesCount rec = new PaidDuesCount
                {
                    fy = prevFY,
                    paidCnt = paidCnt,
                    unpaidCnt = unPaidCnt,
                    nonCollCnt = nonCollCnt,
                    totalDue = totalDue,
                    nonCollDue = nonCollDue
                };
                duesCountList.Add(rec);
            }

            return duesCountList;
        }

        public async Task UpdateSalesDB(string userName, string parid, string saledt, string processedFlag, string welcomeSent)
        {
            DateTime currDateTime = DateTime.Now;
            string LastChangedTs = currDateTime.ToString("o");

            string databaseId = "hoadb";
            string containerId = "hoa_sales";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            // Patch operations for sales record
            List<PatchOperation> patchOperations = new List<PatchOperation>
            {
                PatchOperation.Replace("/LastChangedBy", userName),
                PatchOperation.Replace("/LastChangedTs", LastChangedTs)
            };

            if (!string.IsNullOrWhiteSpace(processedFlag))
            {
                // If processedFlag is not empty, add it to the patch operations
                patchOperations.Add(PatchOperation.Replace("/ProcessedFlag", processedFlag));
            }

            if (!string.IsNullOrWhiteSpace(welcomeSent))
            {
                // If processedFlag is not empty, add it to the patch operations
                patchOperations.Add(PatchOperation.Replace("/WelcomeSent", welcomeSent));
            }

            PatchOperation[] patchArray = patchOperations.ToArray();

            // Compose id for sales record: usually composite key, but here use saledt as id
            string itemId = parid; 
            PartitionKey pk = new PartitionKey(saledt);

            ItemResponse<dynamic> response = await container.PatchItemAsync<dynamic>(
                itemId,
                pk,
                patchArray
            );
        }


        public async Task<Trustee> GetTrusteeById(string trusteeId)
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "BoardOfTrustees";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            // Get the existing document from Cosmos DB
            int partitionKey = int.Parse(trusteeId); // Partition key of the item
            var trustee = await container.ReadItemAsync<Trustee>(trusteeId, new PartitionKey(partitionKey));

            return trustee;
        } // public async Task<Trustee> GetTrusteeById(string trusteeId)

        public async Task UpdTrustee(Trustee trustee)
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "BoardOfTrustees";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            await container.ReplaceItemAsync(trustee, trustee.id, new PartitionKey(trustee.TrusteeId));

        } // public async Task UpdTrustee(Trustee trustee)


        private async Task UploadFileToStorageAsync(string containerName, string fileName, byte[] fileData, bool storageOverwrite = true, bool fileIsImage = false, int desiredImgSize = 0)
        {
            var blobContainerClient = new BlobContainerClient(apiStorageConnStr, containerName);
            // Create a client with the URI and the name
            var blobClient = blobContainerClient.GetBlobClient(fileName);
            // Makes a call to Azure to see if this URI+name exists
            if (blobClient.Exists() && !storageOverwrite)
            {
                return;
            }

            // Set a default type
            string contentType = "application/pdf";
            MemoryStream memoryStream = new MemoryStream();

            if (fileIsImage)
            {
                // Create an image from the file data
                using var image = SixLabors.ImageSharp.Image.Load<Rgba32>(fileData);
                if (image is null)
                {
                    throw new Exception("Image is NULL");
                }
                contentType = "image/jpeg";
                /*
                string ext = fi.Extension.ToLower();
                if (ext.Equals(".png"))
                {
                    blobHttpHeaders.ContentType = "image/png";
                }
                else if (ext.Equals(".gif"))
                {
                    blobHttpHeaders.ContentType = "image/gif";
                }
                */

                // If you pass 0 as any of the values for width and height dimensions then ImageSharp will
                // automatically determine the correct opposite dimensions size to preserve the original aspect ratio.
                //thumbnails just make img.height = 110   (used to use 130)
                int newImgSize = desiredImgSize;
                if (newImgSize > Math.Max(image.Width, image.Height))
                {
                    newImgSize = Math.Max(image.Width, image.Height);
                }

                int width = image.Width;
                int height = image.Height;

                if (desiredImgSize < 200)
                {
                    width = 0;
                    height = newImgSize;
                }
                else
                {
                    if (width > height)
                    {
                        width = newImgSize;
                        height = 0;
                    }
                    else
                    {
                        width = 0;
                        height = newImgSize;
                    }
                }

                image.Mutate(x => x.Resize(width, height));
                image.Save(memoryStream, image.Metadata.DecodedImageFormat);

            }
            else
            {
                memoryStream = new MemoryStream(fileData);
            }

            memoryStream.Position = 0;
            var blobHttpHeaders = new BlobHttpHeaders
            {
                ContentType = contentType
            };

            blobClient.Upload(memoryStream, storageOverwrite);
            await blobClient.SetHttpHeadersAsync(blobHttpHeaders);

            return;
        } // private async Task UploadFileToStorageAsync


        public async Task UploadFileToDatabase(int mediaTypeId, string fileName, DateTime mediaDateTime, byte[] fileData, string category = "", string title = "", string description = "")
        {
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "MediaInfoDoc";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            if (mediaTypeId == 1)
            {
                await UploadFileToStorageAsync("photos", fileName, fileData, true, true, 2000);
                await UploadFileToStorageAsync("thumbs", fileName, fileData, true, true, 110);
            }
            else if (mediaTypeId == 4)
            {
                await UploadFileToStorageAsync("docs", fileName, fileData, true);
            }

            // Create a metadata object from the media file information
            MediaInfo mediaInfo = new MediaInfo
            {
                id = Guid.NewGuid().ToString(),
                MediaTypeId = mediaTypeId,
                Name = fileName,
                MediaDateTime = mediaDateTime,
                MediaDateTimeVal = int.Parse(mediaDateTime.ToString("yyyyMMddHH")),
                CategoryTags = category,
                MenuTags = "",
                AlbumTags = "",
                Title = title,
                Description = description,
                People = "",
                ToBeProcessed = false,
                SearchStr = fileName.ToLower()
            };

            // Check if there is an existing doc entry in Cosmos DB (by media type and Name)
            var queryDefinition = new QueryDefinition(
                "SELECT * FROM c WHERE c.MediaTypeId = @mediaTypeId AND c.Name = @fileName")
                .WithParameter("@mediaTypeId", mediaTypeId)
                .WithParameter("@fileName", fileName);
            var feed = container.GetItemQueryIterator<MediaInfo>(queryDefinition);
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    // If you find an existing doc with the same type and name, just get the "id" for the Upsert (so it updates the existing doc)
                    mediaInfo.id = item.id;
                }
            }

            // Insert a new doc, or update an existing one
            await container.UpsertItemAsync(mediaInfo, new PartitionKey(mediaInfo.MediaTypeId));

        } // UploadFileToDatabase

        public void AddPatchField(List<PatchOperation> patchOperations, Dictionary<string, string> formFields, string fieldName, string fieldType = "Text", string operationType = "Replace")
        {
            if (patchOperations == null || formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return; // Prevent potential null reference errors

            if (operationType.Equals("Replace", StringComparison.OrdinalIgnoreCase))
            {
                if (fieldType.Equals("Text"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Replace("/" + fieldName, value));
                    }
                }
                else if (fieldType.Equals("Int"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Replace("/" + fieldName, int.Parse(value)));
                    }
                }
                else if (fieldType.Equals("Money"))
                {
                    string value = formFields[fieldName]?.Trim() ?? string.Empty;
                    //string input = "$1,234.56";
                    if (decimal.TryParse(value, NumberStyles.Currency, CultureInfo.GetCultureInfo("en-US"), out decimal moneyVal))
                    {
                        Console.WriteLine($"Parsed currency: {moneyVal}");
                        patchOperations.Add(PatchOperation.Replace("/" + fieldName, moneyVal));
                    }
                }
                else if (fieldType.Equals("Bool"))
                {
                    int value = 0;
                    if (formFields.ContainsKey(fieldName))
                    {
                        string checkedValue = formFields[fieldName]?.Trim() ?? string.Empty;
                        if (checkedValue.Equals("on"))
                        {
                            value = 1;
                        }
                    }
                    patchOperations.Add(PatchOperation.Replace("/" + fieldName, value));
                }
            }
            else if (operationType.Equals("Add", StringComparison.OrdinalIgnoreCase))
            {
                //string value = formFields[fieldName]?.Trim() ?? string.Empty;
                //patchOperations.Add(PatchOperation.Add("/" + fieldName, value));

                if (fieldType.Equals("Text"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Add("/" + fieldName, value));
                    }
                }
                else if (fieldType.Equals("Int"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Add("/" + fieldName, int.Parse(value)));
                    }
                }
                else if (fieldType.Equals("Bool"))
                {
                    int value = 0;
                    if (formFields.ContainsKey(fieldName))
                    {
                        string checkedValue = formFields[fieldName]?.Trim() ?? string.Empty;
                        if (checkedValue.Equals("on"))
                        {
                            value = 1;
                        }
                    }
                    patchOperations.Add(PatchOperation.Add("/" + fieldName, value));
                }
            }
            else if (operationType.Equals("Remove", StringComparison.OrdinalIgnoreCase))
            {
                patchOperations.Add(PatchOperation.Remove("/" + fieldName));
            }
        }


        public T GetFieldValue<T>(Dictionary<string, string> formFields, string fieldName, T defaultValue = default)
        {
            if (formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return defaultValue;

            if (formFields.TryGetValue(fieldName, out string rawValue))
            {
                try
                {
                    if (typeof(T) == typeof(bool))
                    {
                        object boolValue = rawValue.Trim().Equals("on", StringComparison.OrdinalIgnoreCase);
                        return (T)boolValue;
                    }
                    else
                    {
                        return (T)Convert.ChangeType(rawValue.Trim(), typeof(T));
                    }
                }
                catch
                {
                    // Optionally log the error here
                    return defaultValue;
                }
            }

            return defaultValue;
        }

        public int GetFieldValueBool(Dictionary<string, string> formFields, string fieldName)
        {
            int value = 0;
            if (formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return value; // Prevent potential null reference errors

            if (formFields.ContainsKey(fieldName))
            {
                string checkedValue = formFields[fieldName]?.Trim() ?? string.Empty;
                if (checkedValue.Equals("on"))
                {
                    value = 1;
                }
            }
            return value;
        }
        public decimal GetFieldValueMoney(Dictionary<string, string> formFields, string fieldName)
        {
            decimal value = 0.00m;
            if (formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return value; // Prevent potential null reference errors

            if (formFields.ContainsKey(fieldName))
            {
                string rawValue = formFields[fieldName]?.Trim() ?? string.Empty;
                //string input = "$1,234.56";
                if (decimal.TryParse(rawValue, NumberStyles.Currency, CultureInfo.GetCultureInfo("en-US"), out decimal moneyVal))
                {
                    //Console.WriteLine($"Parsed currency: {moneyVal}");
                }
                value = moneyVal;
            }
            return value;
        }


        public async Task UpdatePropertyDB(string userName, Dictionary<string, string> formFields)
        {
            DateTime currDateTime = DateTime.Now;
            string LastChangedTs = currDateTime.ToString("o");

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_properties";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            //foreach (var field in formFields)
            //{
            //    log.LogWarning($">>> in DB, Field {field.Key}: {field.Value}");
            //}
            string parcelId = formFields["Parcel_ID"].Trim();

            // Initialize a list of PatchOperation (and default to setting the mandatory LastChanged fields)
            List<PatchOperation> patchOperations = new List<PatchOperation>
            {
                PatchOperation.Replace("/LastChangedBy", userName),
                PatchOperation.Replace("/LastChangedTs", LastChangedTs)
            };

            AddPatchField(patchOperations, formFields, "UseEmail", "Bool");
            AddPatchField(patchOperations, formFields, "Comments");

            // Convert the list to an array
            PatchOperation[] patchArray = patchOperations.ToArray();

            ItemResponse<dynamic> response = await container.PatchItemAsync<dynamic>(
                parcelId,
                new PartitionKey(parcelId),
                patchArray
            );
        }


        public async Task<hoa_owners> UpdateOwnerDB(string userName, Dictionary<string, string> formFields)
        {
            DateTime currDateTime = DateTime.Now;
            string LastChangedTs = currDateTime.ToString("o");
            hoa_owners ownerRec = null;

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_owners";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            string parcelId = formFields["Parcel_ID"].Trim();
            string ownerId = formFields["OwnerID"].Trim();

            // Initialize a list of PatchOperation
            List<PatchOperation> patchOperations = new List<PatchOperation>
            {
                PatchOperation.Replace("/LastChangedBy", userName),
                PatchOperation.Replace("/LastChangedTs", LastChangedTs)
            };

            //AddPatchField(patchOperations, formFields, "CurrentOwner", "Bool");
            AddPatchField(patchOperations, formFields, "Owner_Name1");
            AddPatchField(patchOperations, formFields, "Owner_Name2");
            AddPatchField(patchOperations, formFields, "DatePurchased");
            AddPatchField(patchOperations, formFields, "Mailing_Name");
            AddPatchField(patchOperations, formFields, "Owner_Phone");
            AddPatchField(patchOperations, formFields, "EmailAddr");
            AddPatchField(patchOperations, formFields, "EmailAddr2");
            AddPatchField(patchOperations, formFields, "Comments");

            // Convert the list to an array
            PatchOperation[] patchArray = patchOperations.ToArray();

            ItemResponse<dynamic> response = await container.PatchItemAsync<dynamic>(
                ownerId,
                new PartitionKey(parcelId),
                patchArray
            );

            //-----------------------------------------------------------------------------------            
            // 2nd set of updates
            patchOperations = new List<PatchOperation>
            {
                PatchOperation.Replace("/LastChangedBy", userName),
                PatchOperation.Replace("/LastChangedTs", LastChangedTs)
            };

            AddPatchField(patchOperations, formFields, "AlternateMailing", "Bool");
            AddPatchField(patchOperations, formFields, "Alt_Address_Line1");
            AddPatchField(patchOperations, formFields, "Alt_Address_Line2");
            AddPatchField(patchOperations, formFields, "Alt_City");
            AddPatchField(patchOperations, formFields, "Alt_State");
            AddPatchField(patchOperations, formFields, "Alt_Zip");

            patchArray = patchOperations.ToArray();

            response = await container.PatchItemAsync<dynamic>(
                ownerId,
                new PartitionKey(parcelId),
                patchArray
            );

            // Get the updated owner record for the return value (for display in UI)
            containerId = "hoa_owners";
            Container ownersContainer = db.GetContainer(containerId);
            var queryDefinition = new QueryDefinition(
                "SELECT * FROM c WHERE c.id = @ownerId AND c.Parcel_ID = @parcelId ")
                .WithParameter("@ownerId", ownerId)
                .WithParameter("@parcelId", parcelId);
            var ownersFeed = ownersContainer.GetItemQueryIterator<hoa_owners>(queryDefinition);
            while (ownersFeed.HasMoreResults)
            {
                var ownersResponse = await ownersFeed.ReadNextAsync();
                foreach (var item in ownersResponse)
                {
                    ownerRec = item;
                }
            }

            // if current owner, update the OWNER fields in the hoa_properties record
            if (ownerRec.CurrentOwner == 1)
            {
                containerId = "hoa_properties";
                container = db.GetContainer(containerId);

                // Initialize a list of PatchOperation (and default to setting the mandatory LastChanged fields)
                patchOperations = new List<PatchOperation>
                {
                };

                AddPatchField(patchOperations, formFields, "Owner_Name1");
                AddPatchField(patchOperations, formFields, "Owner_Name2");
                AddPatchField(patchOperations, formFields, "Mailing_Name");
                AddPatchField(patchOperations, formFields, "Owner_Phone");
                AddPatchField(patchOperations, formFields, "Alt_Address_Line1");

                // Convert the list to an array
                patchArray = patchOperations.ToArray();

                response = await container.PatchItemAsync<dynamic>(
                    parcelId,
                    new PartitionKey(parcelId),
                    patchArray
                );
            }

            return ownerRec;
        }

        public async Task<hoa_owners> NewOwnerDB(string userName, Dictionary<string, string> formFields)
        {
            DateTime currDateTime = DateTime.Now;
            string LastChangedTs = currDateTime.ToString("o");
            hoa_owners ownerRec = null;

            string parcelId = formFields["Parcel_ID"].Trim();
            //string ownerId = formFields["OwnerID"].Trim();

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_owners";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);
            // Get the current owner record for this parcel
            var queryDefinition = new QueryDefinition(
                "SELECT * FROM c WHERE c.Parcel_ID = @parcelId AND c.CurrentOwner = 1 ")
                .WithParameter("@parcelId", parcelId);
            var ownersFeed = container.GetItemQueryIterator<hoa_owners>(queryDefinition);
            while (ownersFeed.HasMoreResults)
            {
                var ownersResponse = await ownersFeed.ReadNextAsync();
                foreach (var item in ownersResponse)
                {
                    ownerRec = item;
                }
            }
            if (ownerRec == null)
            {
                throw new Exception("Current owner not found for parcel: " + parcelId);
            }

            int maxOwnerID = 0;
            queryDefinition = new QueryDefinition("SELECT * FROM c ORDER BY c.OwnerID DESC OFFSET 0 LIMIT 1 ");
            var feed = container.GetItemQueryIterator<hoa_owners>(queryDefinition);
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    maxOwnerID = item.OwnerID;
                }
            }

            // Set the current owner "off" on the previous owner record
            // Initialize a list of PatchOperation
            List<PatchOperation> patchOperations = new List<PatchOperation>
            {
                PatchOperation.Replace("/CurrentOwner", 0)
            };
            // Convert the list to an array
            PatchOperation[] patchArray = patchOperations.ToArray();
            ItemResponse<dynamic> response2 = await container.PatchItemAsync<dynamic>(
                ownerRec.OwnerID.ToString(),
                new PartitionKey(parcelId),
                patchArray
            );

            // Overwrite values from the current owner record with values from the form
            ownerRec.OwnerID = maxOwnerID + 1; // Increment to get a new id
            ownerRec.id = ownerRec.OwnerID.ToString(); // Set the id to the new OwnerID
            ownerRec.CurrentOwner = 1;  // Make new owner the current owner
            ownerRec.Owner_Name1 = GetFieldValue<string>(formFields, "Owner_Name1", "");
            ownerRec.Owner_Name2 = GetFieldValue<string>(formFields, "Owner_Name2", "");
            ownerRec.DatePurchased = GetFieldValue<string>(formFields, "DatePurchased", "");
            ownerRec.Mailing_Name = GetFieldValue<string>(formFields, "Mailing_Name", "");
            ownerRec.Owner_Phone = GetFieldValue<string>(formFields, "Owner_Phone", "");
            ownerRec.EmailAddr = GetFieldValue<string>(formFields, "EmailAddr", "");
            ownerRec.EmailAddr2 = GetFieldValue<string>(formFields, "EmailAddr2", "");
            ownerRec.Comments = GetFieldValue<string>(formFields, "Comments", "");
            ownerRec.AlternateMailing = GetFieldValueBool(formFields, "AlternateMailing");
            ownerRec.Alt_Address_Line1 = GetFieldValue<string>(formFields, "Alt_Address_Line1", "");
            ownerRec.Alt_Address_Line2 = GetFieldValue<string>(formFields, "Alt_Address_Line2", "");
            ownerRec.Alt_City = GetFieldValue<string>(formFields, "Alt_City", "");
            ownerRec.Alt_State = GetFieldValue<string>(formFields, "Alt_State", "");
            ownerRec.Alt_Zip = GetFieldValue<string>(formFields, "Alt_Zip", "");
            ownerRec.LastChangedBy = userName;
            ownerRec.LastChangedTs = currDateTime;
            await container.CreateItemAsync(ownerRec, new PartitionKey(parcelId));


            // if current owner, update the OWNER fields in the hoa_properties record
            containerId = "hoa_properties";
            container = db.GetContainer(containerId);
            // Initialize a list of PatchOperation (and default to setting the mandatory LastChanged fields)
            List<PatchOperation> patchOperations3 = new List<PatchOperation>
            {
                PatchOperation.Replace("/OwnerID", ownerRec.OwnerID)
            };
            AddPatchField(patchOperations3, formFields, "Owner_Name1");
            AddPatchField(patchOperations3, formFields, "Owner_Name2");
            AddPatchField(patchOperations3, formFields, "Mailing_Name");
            AddPatchField(patchOperations3, formFields, "Owner_Phone");
            AddPatchField(patchOperations3, formFields, "Alt_Address_Line1");
            // Convert the list to an array
            PatchOperation[] patchArray3 = patchOperations3.ToArray();
            ItemResponse<dynamic> response3 = await container.PatchItemAsync<dynamic>(
                parcelId,
                new PartitionKey(parcelId),
                patchArray3
            );


            // Update any ProcessedFlag not set to "Y" in the sales records for this parcel (assuming a new owner means the sales record is now processed)
            containerId = "hoa_sales";
            container = db.GetContainer(containerId);
            var queryDefinition4 = new QueryDefinition(
                "SELECT * FROM c WHERE c.PARID = @parcelId AND c.ProcessedFlag != @processedFlag ")
                .WithParameter("@parcelId", parcelId)
                .WithParameter("@processedFlag", "Y");
            var salesFeed = container.GetItemQueryIterator<hoa_sales>(queryDefinition4);
            while (salesFeed.HasMoreResults)
            {
                var salesResponse = await salesFeed.ReadNextAsync();
                foreach (var item in salesResponse)
                {
                    item.ProcessedFlag = "Y";
                    await container.ReplaceItemAsync(item, item.id, new PartitionKey(item.SALEDT));
                }
            }

            return ownerRec;
        }

        public async Task<hoa_assessments> UpdateAssessmentDB(string userName, Dictionary<string, string> formFields)
        {
            DateTime currDateTime = DateTime.Now;
            string LastChangedTs = currDateTime.ToString("o");
            hoa_assessments assessmentRec = new hoa_assessments();

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "hoadb";
            string containerId = "hoa_assessments";
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            string parcelId = formFields["Parcel_ID"].Trim();
            string assessmentId = formFields["AssessmentId"].Trim();

            assessmentRec = await container.ReadItemAsync<hoa_assessments>(assessmentId, new PartitionKey(parcelId));

            assessmentRec.DuesAmt = GetFieldValueMoney(formFields, "DuesAmt").ToString("");
            //assessmentRec.DateDue = GetFieldValue<string>(formFields, "DateDue");  // Can't change this in update
            assessmentRec.Paid = GetFieldValueBool(formFields, "Paid");
            assessmentRec.NonCollectible = GetFieldValueBool(formFields, "NonCollectible");
            assessmentRec.DatePaid = GetFieldValue<string>(formFields, "DatePaid");
            assessmentRec.PaymentMethod = GetFieldValue<string>(formFields, "PaymentMethod");
            assessmentRec.Lien = GetFieldValueBool(formFields, "Lien");
            assessmentRec.LienRefNo = GetFieldValue<string>(formFields, "LienRefNo");
            assessmentRec.DateFiled = GetFieldValue<DateTime>(formFields, "DateFiled");
            assessmentRec.Disposition = GetFieldValue<string>(formFields, "Disposition");
            assessmentRec.FilingFee = GetFieldValueMoney(formFields, "FilingFee");
            assessmentRec.ReleaseFee = GetFieldValueMoney(formFields, "ReleaseFee");
            assessmentRec.DateReleased = GetFieldValue<DateTime>(formFields, "DateReleased");
            assessmentRec.LienDatePaid = GetFieldValue<DateTime>(formFields, "LienDatePaid");
            assessmentRec.AmountPaid = GetFieldValueMoney(formFields, "AmountPaid");
            assessmentRec.StopInterestCalc = GetFieldValueBool(formFields, "StopInterestCalc");
            assessmentRec.FilingFeeInterest = GetFieldValueMoney(formFields, "FilingFeeInterest");
            assessmentRec.AssessmentInterest = GetFieldValueMoney(formFields, "AssessmentInterest");
            assessmentRec.InterestNotPaid = GetFieldValueBool(formFields, "InterestNotPaid");
            assessmentRec.BankFee = GetFieldValueMoney(formFields, "BankFee");
            assessmentRec.LienComment = GetFieldValue<string>(formFields, "LienComment");
            assessmentRec.Comments = GetFieldValue<string>(formFields, "Comments");
            assessmentRec.LastChangedBy = userName;
            assessmentRec.LastChangedTs = currDateTime;

            await container.ReplaceItemAsync(assessmentRec, assessmentRec.id, new PartitionKey(assessmentRec.Parcel_ID));

            return assessmentRec;
        }


    } // public class HoaDbCommon
} // namespace GrhaWeb.Function
