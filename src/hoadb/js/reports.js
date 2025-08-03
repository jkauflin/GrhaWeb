/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2025 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-09-08 JJK   Added GetSalesReport to show sales to HOA properties
 * 2016-04-14 JJK   Adding Dues Report (working on csv and pdf downloads)
 * 2016-04-20 JJK   Completed test Dues Statement PDF
 * 2016-04-22 JJK	Finishing up reports (added util.formatDate and util.csvFilter)
 * 2016-06-10 JJK   Corrected reports query to remove current owner condition
 * 2017-06-10 JJK   Added unpaid dues ranking
 * 2016-07-07 JJK   Increased database field lengths for text fields and
 * 					updated UI. Checked comments word wrap.
 * 					Corrected CSV output for reports to have one set of
 * 					MailingAddress fields set from parcel location or
 * 					Alt mailing address (if specified)
 * 2018-11-13 JJK   Re-factored for modules
 * 2019-01-19 JJK   Added Parcel Id to the unpaid dues ranking list
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-08-15 JJK   Added Issues Report
 * 2020-08-25 JJK   Added WelcomeSent flag set (from the Sales report)
 * 2020-10-02 JJK   Started Mailing List development
 * 2020-10-10 JJK   Added checkboxes to log mailed and moved the filter
 *                  logic to the PHP query
 * 2020-10-14 JJK   Modified to use common getHoaRecList function and
 *                  removed call to AdminExecute for dues rank list
 * 2020-12-22 JJK   Re-factored for Bootstrap 4
 * 2021-02-02 JJK   Added fields to the mailing list for dues letters
 * 2021-05-13 JJK   Updated the Issues Report format to include name
 * 2025-07-21 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 *                  and C# API's
 * 2025-08-02 JJK   Added SalesNewOwnerReport to show sales to new owners
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox,csvFilter} from './util.js';

var ReportListTbody = document.getElementById("ReportListTbody")
var ReportsMessageDisplay = document.getElementById("ReportsMessageDisplay")

document.getElementById("SalesReport").addEventListener("click", function (event) {
    salesReport(event)
})
document.getElementById("SalesNewOwnerReport").addEventListener("click", function (event) {
    salesReport(event)
})

document.getElementById("PaidDuesCountsReport").addEventListener("click", function (event) {
    _reportRequest(event)
})
document.getElementById("UnpaidDuesRankingReport").addEventListener("click", function (event) {
    _reportRequest(event)
})
document.getElementById("MailingListReport").addEventListener("click", function (event) {
    _reportRequest(event)
})


async function salesReport(event) {
	let reportName = event.target.getAttribute("id");
    let reportTitle = event.target.getAttribute("data-reportTitle");

	showLoadingSpinner(ReportsMessageDisplay)

	let paramData = {
		reportName: reportName
	}

	try {
		const response = await fetch("/api/GetSalesList", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(paramData)
		})
		await checkFetchResponse(response)
		// Success
		let salesList = await response.json();
		// TODO: Format and display communicationsRec in the modal
		// Example: formatCommunicationsResults(communicationsRec);
		// You need to implement formatCommunicationsResults to populate the modal
		formatSalesResults(salesList);
	} catch (err) {
		console.error(err)
		// Display error in modal or suitable area
		// Example: CommunicationsMessageDisplay.textContent = `Error in Fetch: ${err.message}`
	}
}

function formatSalesResults(salesList) {
	// Example assumes communicationsRec is an array of communication objects
	// and there is a table with id "CommunicationsTable" in the modal

	let tbody = ReportListTbody
	empty(tbody)
	let tr = document.createElement("tr");
	let td = document.createElement("td");
	let th = document.createElement("th");
	
	if (!salesList || salesList.length === 0) {
		td.colSpan = 4;
		td.textContent = "No sales found.";
		tr.appendChild(td);
		tbody.appendChild(tr);
		return;
	}

	tr = document.createElement('tr')
	tr.classList.add('small')
	// Append the header elements
	th = document.createElement("th"); th.textContent = "Row"; tr.appendChild(th)        
	th = document.createElement("th"); th.textContent = "Sale Date"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Welcome Sent"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Old Owner Name"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "New Owner Name"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Mailing Name"; tr.appendChild(th)
	tbody.appendChild(tr)

	/*
		for (let comm of communicationsRec) {
		let tr = document.createElement("tr");
		let tdDate = document.createElement("td");
		tdDate.textContent = comm.dateSent || "";
		tr.appendChild(tdDate);
	*/
	// Append a row for every record in list
	let index = 0;

	salesList.forEach(salesRec => {

		index++

		tr = document.createElement('tr')
		tr.classList.add('small')
/*
        public string? salesRec.id { get; set; }
        public string? salesRec.PARID { get; set; }           // Partition key:  /PARID
        public string? salesRec.CONVNUM { get; set; }
        public string? salesRec.SALEDT { get; set; }          // Id
        public string? salesRec.PRICE { get; set; }
        public string? salesRec.OLDOWN { get; set; }
        public string? salesRec.OWNERNAME1 { get; set; }
        public string? salesRec.PARCELLOCATION { get; set; }
        public string? salesRec.MAILINGNAME1 { get; set; }
        public string? salesRec.MAILINGNAME2 { get; set; }
        public string? salesRec.PADDR1 { get; set; }
        public string? salesRec.PADDR2 { get; set; }
        public string? salesRec.PADDR3 { get; set; }
        public string? salesRec.CreateTimestamp { get; set; }
        public string? salesRec.NotificationFlag { get; set; }
        public string? salesRec.ProcessedFlag { get; set; }
        public string? salesRec.LastChangedBy { get; set; }
        public DateTime salesRec.LastChangedTs { get; set; }
        public string? salesRec.WelcomeSent { get; set; }

	
salesRec.convnum
salesRec.createTimestamp
salesRec.id
salesRec.lastChangedBy
salesRec.lastChangedTs
salesRec.mailingnamE1
salesRec.mailingnamE2
salesRec.notificationFlag
salesRec.oldown
salesRec.ownernamE1
salesRec.paddR1
salesRec.paddR2
salesRec.paddR3
salesRec.parcellocation
salesRec.parid
salesRec.price
salesRec.processedFlag
salesRec.saledt
salesRec.welcomeSent

*/
		td = document.createElement("td"); td.textContent = index; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.saledt; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.welcomeSent; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.parcellocation; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.oldown; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.ownernamE1; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.mailingnamE1 + " " + salesRec.mailingnamE2; tr.appendChild(td)

		tbody.appendChild(tr)

	});

}

	/*
        $ReportHeader.html("Executing report query...");
        $ReportListDisplay.html("");
        $ReportRecCnt.html("");
        $ReportDownloadLinks.html("");

        // check user logged in
            var mailingListName = '';
            var logWelcomeLetters = '';
            var logDuesLetterSend = '';
            if (reportName == 'MailingListReport') {
                mailingListName = $('input:radio[name=MailingListName]:checked').val();
                logDuesLetterSend = $('#LogDuesLetterSend').is(":checked");
                logWelcomeLetters = $('#LogWelcomeLetters').is(":checked");
            } else {
                $ReportFilter.empty();
            }

            $.getJSON("getHoaReportData.php", "reportName=" + reportName + "&mailingListName="
                  + mailingListName + "&logDuesLetterSend=" + logDuesLetterSend+"&logWelcomeLetters="+logWelcomeLetters, function (result) {
                if (result.error) {
                    console.log("error = " + result.error);
                    $ajaxError.html("<b>" + result.error + "</b>");
                } else {
                    var reportList = result;
                    if (reportName == 'UnpaidDuesRankingReport') {
                        _duesRank(reportList, reportName);
                    } else {
                        _formatReportList(reportName, reportTitle, reportList, mailingListName);
                    }
                }
            });
	*/


