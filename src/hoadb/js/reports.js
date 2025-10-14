/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2025 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-09-08 JJK   Added GetSalesReport to show sales to HOA properties
 * 2016-04-14 JJK   Adding Dues Report (working on csv and pdf downloads)
 * 2016-04-20 JJK   Completed test Dues Statement PDF
 * 2016-04-22 JJK	Finishing up reports (added util.formatDate and csvFilter)
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
 * 2025-08-05 JJK   Added SalesFlagUpdate to handle Send/Ignore buttons
 * 2025-08-08 JJK   Added logic to call new owner function in detail.js
 * 					(which looks up sales record values and puts them
 * 					into the Owner Update modal)
 * 2025-08-16 JJK   Working on Reports for Sales, Dues Counts, and Dues letters
 * 2025-10-14 JJK   Changing to just 1 Dues Letter (combining 1st and 2nd)
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatDateMonth,formatMoney,setTD,setCheckbox,csvFilter,setBoolText} from './util.js';
import {formatUpdateOwnerSale} from './detail.js';

// Global variable to hold CSV content for downloading
var csvContent;

var ReportListTbody
var ReportsMessageDisplay
var ReportHeader
var ReportRecCnt
var ReportDownloadLinks
//var LogDuesLetterSend
//var LogWelcomeLetters

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements after DOM is ready
	ReportListTbody = document.getElementById("ReportListTbody")
	ReportsMessageDisplay = document.getElementById("ReportsMessageDisplay")
	ReportHeader = document.getElementById("ReportHeader")
	ReportRecCnt = document.getElementById("ReportRecCnt")
	ReportDownloadLinks = document.getElementById("ReportDownloadLinks")
	//LogDuesLetterSend = document.getElementById("LogDuesLetterSend")
	//LogWelcomeLetters = document.getElementById("LogWelcomeLetters")

	document.getElementById("SalesReport").addEventListener("click", function (event) {
		let reportTitle = event.target.getAttribute("data-reportTitle");
		salesReport(reportTitle)
	})
	document.getElementById("PaidDuesCountsReport").addEventListener("click", function (event) {
		paidDuesCountReport("Paid Dues Count Report")
	})
	document.getElementById("UnpaidDuesRankingReport").addEventListener("click", function (event) {
		_reportRequest(event)
	})
	document.getElementById("DuesletterReport").addEventListener("click", function (event) {
		_reportRequest(event)
	})
})

document.body.addEventListener("click", async function (event) {
	if (event.target.classList.contains("SalesNewOwnerProcess")) {
		event.preventDefault()
		const parcelId = event.target.dataset.parcelId
		const saleDate = event.target.dataset.saleDate
		formatUpdateOwnerSale(parcelId,saleDate)
	} else if (event.target.classList.contains("SalesFlagUpdate")) {
		event.preventDefault();
		await handleSalesFlagUpdate(event.target);
	} else if (event.target.classList.contains("DownloadReportCSV")) {
		event.preventDefault();
		_downloadReportCSV(event);
	}
})

// Handle clicks to SalesFlagUpdate buttons (Send/Ignore)
// Handles the Send/Ignore button click for sales records
async function handleSalesFlagUpdate(button) {
	showLoadingSpinner(ReportsMessageDisplay);
	const parcelId = button.dataset.parcelId;
	const saleDate = button.dataset.saleDate;
	const action = button.dataset.action;
	let welcomeSent = ""
	if (action == "WelcomeSend") {
		welcomeSent = "Y"
	}
	if (action == "WelcomeIgnore") {
		welcomeSent = "N"
	}

	// Compose request body
	let paramData = {
		parid: parcelId,
		saledt: saleDate,
		processedFlag: (action === "NewOwnerIgnore") ? "Y" : "",
		welcomeSent: welcomeSent
	};

	try {
		const response = await fetch("/api/UpdateSales", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(paramData)
		});
		await checkFetchResponse(response);
		ReportsMessageDisplay.textContent = "Sales flag updated.";
		// Refresh the report
		salesReport("County Reported Sales of HOA properties")
	} catch (err) {
		console.error(err);
		ReportsMessageDisplay.textContent = `Error updating sales flag: ${err.message}`;
	}
}

async function salesReport(reportTitle) {
	showLoadingSpinner(ReportsMessageDisplay)
	ReportHeader.textContent = reportTitle

	try {
		const response = await fetch("/api/GetSalesList", {
			method: "POST",
			headers: { "Content-Type": "application/json" }
		})
		await checkFetchResponse(response)
		ReportsMessageDisplay.textContent = ""
		// Success
		let salesList = await response.json();
		formatSalesResults(salesList);
	} catch (err) {
		console.error(err)
		ReportsMessageDisplay.textContent = `Error in Fetch: ${err.message}`
	}
}

function formatSalesResults(salesList) {
	let tbody = ReportListTbody
	empty(tbody)
	let tr = document.createElement("tr");
	let td = document.createElement("td");
	let th = document.createElement("th");
	let a = document.createElement("a")
	let button = document.createElement("button")

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
	th = document.createElement("th"); th.textContent = "Sales Dates"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "NEW"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Old Owner Name"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "New Owner Name"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Mailing Name"; tr.appendChild(th)
	tbody.appendChild(tr)

	// Append a row for every record in list
	let index = 0;
	salesList.forEach(salesRec => {
		index++
		tr = document.createElement('tr')
		tr.classList.add('small')
		td = document.createElement("td"); td.textContent = index; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.saledt; tr.appendChild(td)

		td = document.createElement("td");
		/*
		if (salesRec.welcomeSent == null || salesRec.welcomeSent == 'X' || salesRec.welcomeSent == ' ' || salesRec.welcomeSent == '') {
			// offer buttons for Send and Ignore
			button = document.createElement("button")
			button.setAttribute('type',"button")
			button.setAttribute('role',"button")
			button.dataset.parcelId = salesRec.parid
			button.dataset.saleDate = salesRec.saledt
			button.dataset.action = "WelcomeSend"
			button.classList.add('btn','btn-success','btn-sm','mb-1','me-1','shadow-none','SalesFlagUpdate')
			button.textContent = "Send"
			td.appendChild(button);

			button = document.createElement("button")
			button.setAttribute('type',"button")
			button.setAttribute('role',"button")
			button.dataset.parcelId = salesRec.parid
			button.dataset.saleDate = salesRec.saledt
			button.dataset.action = "WelcomeIgnore"
			button.classList.add('btn','btn-warning','btn-sm','mb-1','me-1','shadow-none','SalesFlagUpdate')
			button.textContent = "Ignore"
			td.appendChild(button);
		} else {
			td.textContent = salesRec.welcomeSent
		}
		*/
		if (salesRec.processedFlag != 'Y') {
			// offer buttons for New Owner and Ignore Owner
			button = document.createElement("button")
			button.setAttribute('type',"button")
			button.setAttribute('role',"button")
			button.dataset.parcelId = salesRec.parid
			button.dataset.saleDate = salesRec.saledt
			button.dataset.action = "Process"
			button.classList.add('btn','btn-primary','btn-sm','mb-1','mx-1','shadow-none','SalesNewOwnerProcess')
			button.textContent = "New Owner"
			td.appendChild(button);

			button = document.createElement("button")
			button.setAttribute('type',"button")
			button.setAttribute('role',"button")
			button.dataset.parcelId = salesRec.parid
			button.dataset.saleDate = salesRec.saledt
			button.dataset.action = "NewOwnerIgnore"
			button.classList.add('btn','btn-info','btn-sm','mb-1','me-1','shadow-none','SalesFlagUpdate')
			button.textContent = "Ignore Owner"
			td.appendChild(button);
		}		
		tr.appendChild(td)

		td = document.createElement("td"); td.textContent = salesRec.parcellocation; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.oldown; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.ownernamE1; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = salesRec.mailingnamE1 + " " + salesRec.mailingnamE2; tr.appendChild(td)

		tbody.appendChild(tr)
	});

}

async function paidDuesCountReport(reportTitle) {
	showLoadingSpinner(ReportsMessageDisplay)

	try {
		const response = await fetch("/api/GetPaidDuesCountList", {
			method: "POST",
			headers: { "Content-Type": "application/json" }
		})
		await checkFetchResponse(response)
		ReportsMessageDisplay.textContent = ""
		// Success
		let duesCountList = await response.json();
		formatDuesCountResults(duesCountList,reportTitle);
	} catch (err) {
		console.error(err)
		ReportsMessageDisplay.textContent = `Error in Fetch: ${err.message}`
	}
}

function formatDuesCountResults(duesCountList,reportTitle) {
	let reportName = "PaidDuesCountsReport"
	ReportHeader.textContent = reportTitle
	csvContent = ''
	let csvLine = ''
	let tbody = ReportListTbody;
	empty(tbody);
	empty(ReportDownloadLinks);
	let tr, td, th, button, i;

	if (!duesCountList || duesCountList.length === 0) {
		td = document.createElement("td");
		td.colSpan = 6;
		td.textContent = "No paid dues count records found.";
		tr = document.createElement("tr");
		tr.appendChild(td);
		tbody.appendChild(tr);
		return;
	}

	// Table header
	tr = document.createElement('tr');
	tr.classList.add('small');
	th = document.createElement("th"); th.textContent = "Fiscal Year"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Paid Count"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "UnPaid Count"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Non-collectible Count"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Total UnPaid Dues"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Total Non-collectible Dues"; tr.appendChild(th);
	tbody.appendChild(tr);

    csvLine = csvFilter("FiscalYear");
    csvLine += ',' + csvFilter("PaidCount");
    csvLine += ',' + csvFilter("UnPaidCount");
    csvLine += ',' + csvFilter("NonCollCount");
    csvLine += ',' + csvFilter("TotalUnPaidDues");
    csvLine += ',' + csvFilter("TotalNonCollDues");
    csvContent += csvLine + '\n';

	// Table rows
	duesCountList.forEach((cntsRec, index) => {
		tr = document.createElement('tr');
		tr.classList.add('small');
		td = document.createElement("td"); td.textContent = cntsRec.fy ?? cntsRec.FY; tr.appendChild(td);
		td = document.createElement("td"); td.textContent = cntsRec.paidCnt ?? cntsRec.PaidCnt; tr.appendChild(td);
		td = document.createElement("td"); td.textContent = cntsRec.unpaidCnt ?? cntsRec.UnpaidCnt; tr.appendChild(td);
		td = document.createElement("td"); td.textContent = cntsRec.nonCollCnt ?? cntsRec.NonCollCnt; tr.appendChild(td);
		td = document.createElement("td"); td.textContent = formatMoney(cntsRec.totalDue ?? cntsRec.TotalDue); tr.appendChild(td);
		td = document.createElement("td"); td.textContent = formatMoney(cntsRec.nonCollDue ?? cntsRec.NonCollDue); tr.appendChild(td);
		tbody.appendChild(tr);

        csvLine = csvFilter(cntsRec.fy);
        csvLine += ',' + csvFilter(cntsRec.paidCnt);
        csvLine += ',' + csvFilter(cntsRec.unpaidCnt);
        csvLine += ',' + csvFilter(cntsRec.nonCollCnt);
        csvLine += ',' + csvFilter(formatMoney(cntsRec.totalDue));
        csvLine += ',' + csvFilter(formatMoney(cntsRec.nonCollDue));
        csvContent += csvLine + '\n';
	})

	button = document.createElement("button")
	button.setAttribute('type',"button")
	button.setAttribute('role',"button")
	//button.dataset.reportName = formatDate() + '-' + reportName
	button.dataset.reportName = reportName
	button.classList.add('btn','btn-info','btn-sm','mb-1','me-1','shadow-none','DownloadReportCSV')
	i = document.createElement("i")
	i.classList.add('fa','fa-download','me-1')
	button.appendChild(i)
	button.innerHTML = '<i class="fa fa-download me-1"></i> Download CSV'
	ReportDownloadLinks.appendChild(button);
}

function _downloadReportCSV(event) {
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var pom = document.createElement('a');
    var url = URL.createObjectURL(blob);
    pom.href = url;
    pom.setAttribute('download', event.target.dataset.reportName  + ".csv");
    pom.click();
}

async function _reportRequest(event) {
	showLoadingSpinner(ReportsMessageDisplay)
	event.preventDefault();
	var reportName = event.target.id;
	var reportTitle = event.target.dataset.reporttitle
  	//const mailingListName = document.querySelector('input[name="MailingListName"]:checked');

	// Compose request body
	let paramData = {
		reportName: reportName
	}
		//mailingListName: mailingListName.value,	
		//logDuesLetterSend: LogDuesLetterSend.checked,
		//logWelcomeLetters: LogWelcomeLetters.checked

	try {
		const response = await fetch("/api/GetHoaRecList", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(paramData)
		});
		await checkFetchResponse(response);
		// Success
		let hoaRecList = await response.json();
		ReportsMessageDisplay.textContent = "Report created";
		if (reportName == 'UnpaidDuesRankingReport') {
			_duesRank(hoaRecList, reportName, reportTitle);
		} else {
			_formatReportList(hoaRecList, reportName, reportTitle);
		}
	} catch (err) {
		console.error(err);
		ReportsMessageDisplay.textContent = `Error getting report list: ${err.message}`;
	}
}

function _duesRank(hoaRecList, reportName, reportTitle) {
    var unpaidDuesCnt = 0;
    var csvLine = "";
    csvContent = "";

    // Sort the array by the TotalDue for the property
    hoaRecList.sort(function (a, b) {
        // Sort descending
        return b.totalDue - a.totalDue;
    })

	ReportHeader.textContent = reportTitle
	let tbody = ReportListTbody;
	empty(tbody);
	empty(ReportDownloadLinks);
	let tr, td, th, button, i;

	if (!hoaRecList || hoaRecList.length === 0) {
		td = document.createElement("td");
		td.colSpan = 6;
		td.textContent = "No records found.";
		tr = document.createElement("tr");
		tr.appendChild(td);
		tbody.appendChild(tr);
		return;
	}

	// Table header
	tr = document.createElement('tr');
	tr.classList.add('small');
	th = document.createElement("th"); th.textContent = "Rec"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Parcel"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Location"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Total Due"; tr.appendChild(th);
	tbody.appendChild(tr);

    // Create the CSV header/column name line
    csvLine = "ParcelId";
    csvLine += ',' + "ParcelLocation";
    csvLine += ',' + "TotalDue";
    csvContent += csvLine + '\n';

	// Table rows
	hoaRecList.forEach((hoaRec, index) => {
		if (hoaRec.totalDue > 0) {
            unpaidDuesCnt++;

			tr = document.createElement('tr');
			tr.classList.add('small');
			td = document.createElement("td"); td.textContent = unpaidDuesCnt; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.property.parcel_ID; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.property.parcel_Location; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = formatMoney(hoaRec.totalDue); tr.appendChild(td);
			tbody.appendChild(tr);

            csvLine = csvFilter(hoaRec.property.parcel_ID);
            csvLine += ',' + csvFilter(hoaRec.property.parcel_Location);
            csvLine += ',' + csvFilter(formatMoney(hoaRec.totalDue));
            csvContent += csvLine + '\n';
        }
	})

	button = document.createElement("button")
	button.setAttribute('type',"button")
	button.setAttribute('role',"button")
	//button.dataset.reportName = formatDate() + '-' + reportName
	button.dataset.reportName = reportName
	button.classList.add('btn','btn-info','btn-sm','mb-1','me-1','shadow-none','DownloadReportCSV')
	i = document.createElement("i")
	i.classList.add('fa','fa-download','me-1')
	button.appendChild(i)
	button.innerHTML = '<i class="fa fa-download me-1"></i> Download CSV'
	ReportDownloadLinks.appendChild(button);
	ReportRecCnt.textContent = "Unpaid Dues Ranking, total = " + unpaidDuesCnt
}

function _formatReportList(hoaRecList, reportName, reportTitle) {
    var csvLine = "";
    csvContent = "";
 
	ReportHeader.textContent = reportTitle
	let tbody = ReportListTbody;
	empty(tbody);
	empty(ReportDownloadLinks);
	let tr, td, th, button, i;

	if (!hoaRecList || hoaRecList.length === 0) {
		td = document.createElement("td");
		td.colSpan = 6;
		td.textContent = "No records found.";
		tr = document.createElement("tr");
		tr.appendChild(td);
		tbody.appendChild(tr);
		return;
	}

	// Table header
	tr = document.createElement('tr');
	tr.classList.add('small');
	th = document.createElement("th"); th.textContent = "Rec"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Parcel"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Name"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Address"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "City"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "State"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Zip"; tr.appendChild(th);
	th = document.createElement("th"); th.textContent = "Total Due"; tr.appendChild(th);
	tbody.appendChild(tr);

    // Create the CSV header/column name line
    csvLine = "RecId"
    csvLine += ',' + "ParcelID"
    csvLine += ',' + "ParcelLocation"
    csvLine += ',' + "MailingName"
    csvLine += ',' + "MailingAddressLine1"
    csvLine += ',' + "MailingAddressLine2"
    csvLine += ',' + "MailingCity"
    csvLine += ',' + "MailingState"
    csvLine += ',' + "MailingZip"
    csvLine += ',' + "OwnerPhone"
    csvLine += ',' + "FiscalYear"
    csvLine += ',' + "DuesAmt"
    csvLine += ',' + "TotalDue"
    csvLine += ',' + "Paid"
    csvLine += ',' + "NonCollectible"
    csvLine += ',' + "DateDue"
    csvLine += ',' + "UseEmail"
    csvLine += ',' + "FiscalYearPrev"
    csvLine += ',' + "DateDue2"
    csvLine += ',' + "NoticeDate"
    csvLine += ',' + "Email"
    csvLine += ',' + "Email2"
    csvContent += csvLine + '\n';

	let currSysDate = new Date();
    let reportYear = '' + currSysDate.getFullYear(); 
    //$ReportRecCnt.html("");
    let rowId = 0;
    let recCnt = 0;
	let DateDue2 = 'April 1' 	// Confirm if this will still be used in dues letter2 for 2nd Notice
    let noticeDate = formatDateMonth()

	hoaRecList.forEach((hoaRec, index) => {
    	recCnt = recCnt + 1;
        rowId = recCnt;

		// Set the report year based on the first assessment record
		if (recCnt == 1 && hoaRec.assessmentsList && hoaRec.assessmentsList.length > 0) {
			reportYear = hoaRec.assessmentsList[0].fy
		}

		tr = document.createElement('tr');
		tr.classList.add('small');
		td = document.createElement("td"); td.textContent = recCnt; tr.appendChild(td);
		td = document.createElement("td"); td.textContent = hoaRec.property.parcel_ID; tr.appendChild(td);
		td = document.createElement("td"); td.textContent = hoaRec.property.mailing_Name; tr.appendChild(td);

		if (hoaRec.ownersList[0].alternateMailing == 1) {
			td = document.createElement("td"); td.textContent = hoaRec.ownersList[0].alt_Address_Line1 + ' ' + hoaRec.ownersList[0].alt_Address_Line2; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.ownersList[0].alt_City; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.ownersList[0].alt_State; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.ownersList[0].alt_Zip; tr.appendChild(td);
		} else {
			td = document.createElement("td"); td.textContent = hoaRec.property.parcel_Location; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.property.property_City; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.property.property_State; tr.appendChild(td);
			td = document.createElement("td"); td.textContent = hoaRec.property.property_Zip; tr.appendChild(td);
		}

		td = document.createElement("td"); td.textContent = formatMoney(hoaRec.totalDue); tr.appendChild(td);
		tbody.appendChild(tr);

        csvLine = csvFilter(recCnt);
        csvLine += ',' + csvFilter(hoaRec.property.parcel_ID);
        csvLine += ',' + csvFilter(hoaRec.property.parcel_Location);
        csvLine += ',' + csvFilter(hoaRec.property.mailing_Name);
        if (hoaRec.ownersList[0].alternateMailing) {
            csvLine += ',' + csvFilter(hoaRec.ownersList[0].alt_Address_Line1);
            csvLine += ',' + csvFilter(hoaRec.ownersList[0].alt_Address_Line2);
            csvLine += ',' + csvFilter(hoaRec.ownersList[0].alt_City);
            csvLine += ',' + csvFilter(hoaRec.ownersList[0].alt_State);
            csvLine += ',' + csvFilter(hoaRec.ownersList[0].alt_Zip);
        } else {
            csvLine += ',' + csvFilter(hoaRec.property.parcel_Location);
            csvLine += ',' + csvFilter("");
            csvLine += ',' + csvFilter(hoaRec.property.property_City);
            csvLine += ',' + csvFilter(hoaRec.property.property_State);
            csvLine += ',' + csvFilter(hoaRec.property.property_Zip);
        }

        csvLine += ',' + csvFilter(hoaRec.ownersList[0].owner_Phone);
        csvLine += ',' + csvFilter(reportYear);
        if (hoaRec.assessmentsList[0].paid) {
            csvLine += ',$0';
        } else {
            csvLine += ',' + csvFilter(hoaRec.assessmentsList[0].duesAmt);
        }
        csvLine += ',' + csvFilter(formatMoney(hoaRec.totalDue));
        csvLine += ',' + csvFilter(setBoolText(hoaRec.assessmentsList[0].Paid));
        csvLine += ',' + csvFilter(setBoolText(hoaRec.assessmentsList[0].NonCollectible));
        csvLine += ',' + csvFilter(hoaRec.assessmentsList[0].dateDue);
        csvLine += ',' + csvFilter(hoaRec.property.useEmail);
        csvLine += ',' + csvFilter(reportYear-1);
        csvLine += ',' + csvFilter(DateDue2);
        csvLine += ',' + csvFilter(noticeDate);
    	csvLine += ',' + csvFilter(hoaRec.ownersList[0].emailAddr);
        csvLine += ',' + csvFilter(hoaRec.ownersList[0].emailAddr2);
        csvContent += csvLine + '\n';
	})

	button = document.createElement("button")
	button.setAttribute('type',"button")
	button.setAttribute('role',"button")
	//button.dataset.reportName = formatDate() + '-' + reportName
	button.dataset.reportName = reportName
	button.classList.add('btn','btn-info','btn-sm','mb-1','me-1','shadow-none','DownloadReportCSV')
	i = document.createElement("i")
	i.classList.add('fa','fa-download','me-1')
	button.appendChild(i)
	button.innerHTML = '<i class="fa fa-download me-1"></i> Download CSV'
	ReportDownloadLinks.appendChild(button);

	ReportRecCnt.textContent = "Unpaid Dues mailing list, total = "+recCnt


} // function formatReportList(reportName,reportList){
