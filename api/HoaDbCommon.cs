/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Common functions to handle getting data from the data sources

--------------------------------------------------------------------------------
Modification History
2024-11-19 JJK  Initial versions
2025-04-12 JJK  Added functions to read and update BoardOfTrustee data source
2025-04-13 JJK  *** NEW philosophy - put the error handling (try/catch) in the
                main/calling function, and leave it out of the DB Common - DB
                Common will throw any error, and the caller can log and handle
================================================================================*/
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class HoaDbCommon
    {
        private readonly ILogger log;
        private readonly IConfiguration config;
        private readonly string? apiCosmosDbConnStr;
        private readonly string databaseId;
        private readonly CommonUtil util;

        public HoaDbCommon(ILogger logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];
            databaseId = "hoadb";
            util = new CommonUtil(log);
        }

        // Common internal function to lookup configuration values
        private async Task<string> getConfigVal(Database db, Container container, string configName) {
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
                        +$"CONTAINS(UPPER(c.Parcel_ID),'{searchStr}') "
                        +$"OR CONTAINS(UPPER(c.LotNo),'{searchStr}') "
                        +$"OR CONTAINS(UPPER(c.Parcel_Location),'{searchStr}') "
                        +$"OR CONTAINS(UPPER(CONCAT(c.Owner_Name1,' ',c.Owner_Name2,' ',c.Mailing_Name)),'{searchStr}') "
                        +$"ORDER BY c.id";
    
            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_properties";
            List<HoaProperty> hoaPropertyList = new List<HoaProperty>();
            HoaProperty hoaProperty = new HoaProperty();

            try {
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
            }
            catch (Exception ex) {
                log.LogError($"Exception in DB query to {containerId}, message: {ex.Message} {ex.StackTrace}");
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
                log.LogError($"Exception in DB query to {containerId}, message: {ex.Message} {ex.StackTrace}");
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

            try {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr); 
                Database db = cosmosClient.GetDatabase(databaseId);
                Container configContainer = db.GetContainer("hoa_config");

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
                            if (!string.IsNullOrWhiteSpace(item.EmailAddr)) {
                                hoaRec.emailAddrList.Add(item.EmailAddr);
                            }
                            if (!string.IsNullOrWhiteSpace(item.EmailAddr2)) {
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
                        if (!string.IsNullOrWhiteSpace(item.payer_email)) {
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
                DateTime currDate = DateTime.Now;
                DateTime dateTime;
                DateTime dateDue;
                while (assessmentsFeed.HasMoreResults)
                {
                    var response = await assessmentsFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        if (fy.Equals("LATEST") && cnt > 1) {
                            continue;
                        }

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
                if (hoaRec.totalDue > 0.0m) {
                    hoaRec.paymentInstructions = await getConfigVal(db, configContainer, "OfflinePaymentInstructions");
                    hoaRec.paymentFee = decimal.Parse(await getConfigVal(db, configContainer, "paymentFee"));
                    if (onlyCurrYearDue) {
                        hoaRec.paymentInstructions = await getConfigVal(db, configContainer, "OnlinePaymentInstructions");
                    }
                }

                //----------------------------------- Sales -----------------------------------------------------------
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
                        hoaRec.salesList.Add(item);
                    } // Sales loop
                }

            }
            catch (Exception ex) {
                log.LogError($"Exception in DB query to {containerId}, message: {ex.Message} {ex.StackTrace}");
                //return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }
            
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
                DateTime dateTime;
                DateTime dateDue;
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
                if (hoaRec2.totalDue > 0.0m) {
                    hoaRec2.paymentInstructions = await getConfigVal(db, configContainer, "OfflinePaymentInstructions");
                    hoaRec2.paymentFee = decimal.Parse(await getConfigVal(db, configContainer, "paymentFee"));
                    if (onlyCurrYearDue) {
                        hoaRec2.paymentInstructions = await getConfigVal(db, configContainer, "OnlinePaymentInstructions");
                    }
                }
            }
            catch (Exception ex) {
                log.LogError($"Exception in DB query to {containerId}, message: {ex.Message} {ex.StackTrace}");
            }

            return hoaRec2;
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

            await container.ReplaceItemAsync(trustee,trustee.id,new PartitionKey(trustee.TrusteeId));

        } // public async Task UpdTrustee(Trustee trustee)

    } // public class HoaDbCommon

} // namespace GrhaWeb.Function
