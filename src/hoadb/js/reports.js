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
 * 
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox,csvFilter} from './util.js';


document.getElementById("SalesReport").addEventListener("click", function (event) {
    _reportRequest(event)
})
document.getElementById("SalesNewOwnerReport").addEventListener("click", function (event) {
    _reportRequest(event)
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

/*
							<div class="form-check">
								<input class="form-check-input shadow-none" type="radio" name="MailingListName" id="MailingListWelcomeLetters" value="WelcomeLetters" checked>
								<label class="form-check-label ms-2" for="MailingListWelcomeLetters">
									Welcome Letters
								</label>
							</div>
							<div class="form-check form-check-inline ms-4">
								<input class="form-check-input shadow-none" type="checkbox" id="LogWelcomeLetters" name="LogWelcomeLetters">
								<label class="form-check-label" for="LogWelcomeLetters">
									Mark as MAILED
								</label>
							</div>
							<div class="form-check">
								<input class="form-check-input shadow-none" type="radio" name="MailingListName" id="MailingListNewsletter" value="Newsletter">
								<label class="form-check-label ms-2" for="MailingListNewsletter">
									Newsletter (ALL property addresses)
								</label>
							</div>
							<div class="form-check">
								<input class="form-check-input shadow-none" type="radio" name="MailingListName" id="MailingListDuesletter1" value="Duesletter1">
								<label class="form-check-label ms-2" for="MailingListDuesletter1">
									Dues Letter 1st Notice
								</label>
							</div>
							<div class="form-check">
								<input class="form-check-input shadow-none" type="radio" name="MailingListName" id="MailingListDuesletter2" value="Duesletter2">
								<label class="form-check-label ms-2" for="MailingListDuesletter2">
									Dues Letter 2nd Notice
								</label>
							</div>
							<div class="form-check form-check-inline ms-4">
								<input class="form-check-input shadow-none" type="checkbox" id="LogDuesLetterSend" name="LogDuesLetterSend">
								<label class="form-check-label ms-2" for="LogDuesLetterSend">
									Mark Dues Letters as MAILED
								</label>
							</div>
*/


async function getCommunications(parcelId) {
	//console.log("getCommunications called with parcelId = "+parcelId)
	commParcel_ID.value = parcelId

	// Show loading spinner in the modal or a suitable area
	//showLoadingSpinner(CommunicationsModal)

	let paramData = {
		parcelId: parcelId
	}

	try {
		const response = await fetch("/api/GetCommunications", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(paramData)
		})
		await checkFetchResponse(response)
		// Success
		let communicationsList = await response.json();
		// TODO: Format and display communicationsRec in the modal
		// Example: formatCommunicationsResults(communicationsRec);
		// You need to implement formatCommunicationsResults to populate the modal
		formatCommunicationsResults(communicationsList);

		new bootstrap.Modal(CommunicationsModal).show();
	} catch (err) {
		console.error(err)
		// Display error in modal or suitable area
		// Example: CommunicationsMessageDisplay.textContent = `Error in Fetch: ${err.message}`
	}
}

function _reportRequest(event) {
    let reportName = event.target.getAttribute("id");
    let reportTitle = event.target.getAttribute("data-reportTitle");
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
}


function formatCommunicationsResults(communicationsList) {
	// Example assumes communicationsRec is an array of communication objects
	// and there is a table with id "CommunicationsTable" in the modal

	let tbody = CommunicationsTbody
	empty(tbody)
	let tr = document.createElement("tr");
	let td = document.createElement("td");
	let th = document.createElement("th");
	
	if (!communicationsList || communicationsList.length === 0) {
		td.colSpan = 4;
		td.textContent = "No communications found.";
		tr.appendChild(td);
		tbody.appendChild(tr);
		return;
	}

	tr = document.createElement('tr')
	tr.classList.add('small')
	// Append the header elements
	th = document.createElement("th"); th.textContent = "CommID"; tr.appendChild(th)        
	th = document.createElement("th"); th.textContent = "Datetime"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Type"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Email"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Sent"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Address"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Name"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Description"; tr.appendChild(th)
	//th = document.createElement("th"); th.textContent = "Last Changed"; tr.appendChild(th)

	//th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Comments"; tr.appendChild(th)
	tbody.appendChild(tr)

	/*
		for (let comm of communicationsRec) {
		let tr = document.createElement("tr");
		let tdDate = document.createElement("td");
		tdDate.textContent = comm.dateSent || "";
		tr.appendChild(tdDate);
	*/
	// Append a row for every record in list
	for (let index in communicationsList) {
		let commRec = communicationsList[index]

		tr = document.createElement('tr')
		tr.classList.add('small')

		td = document.createElement("td"); td.textContent = commRec.commID; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = standardizeDate(commRec.createTs); tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.commType; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.emailAddr; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.sentStatus; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = "test address"; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.mailing_Name; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.commDesc; tr.appendChild(td)
		//td = document.createElement("td"); td.textContent = standardizeDate(commRec.createTs); tr.appendChild(td)

		tbody.appendChild(tr)
	}

}
