/*==============================================================================
 * (C) Copyright 2015,2020 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version
 * 2016-05-19 JJK   Modified to get the country web site URL's from config
 * 2016-06-05 JJK   Split Edit modal into 1 and 2Col versions
 * 2016-06-09 JJK	Added duesStatementNotes to the individual dues
 * 					statement and adjusted the format
 * 2016-06-24 JJK	Working on adminExecute (for yearly dues statement)
 * 2016-07-01 JJK	Got progress bar for adminExecute working by moving loop
 * 					processing into an asynchronous recursive function.
 * 2016-07-13 JJK   Finished intial version of yearly dues statements
 * 2016-07-14 JJK   Added Paid Dues Counts report
 * 2016-07-28 JJK	Corrected compound interest problem with a bad start date
 * 					Added print of LienComment after Total Due on Dues Statement
 * 2016-07-30 JJK   Changed the Yearly Dues Statues to just display prior
 * 					years due messages instead of amounts.
 * 					Added yearlyDuesStatementNotice for 2nd notice message.
 * 					Added DateDue to CSV for reports
 * 2016-08-19 JJK	Added UseMail to properties and EmailAddr to owners
 * 2016-08-20 JJK	Implemented email validation check
 * 2016-08-26 JJK   Went live, and Paypal payments working in Prod!!!
 * 2017-08-13 JJK	Added a dues email test function, and use of payment
 * 					email for dues statements
 * 2017-08-18 JJK   Added an unsubscribe message to the dues email
 * 2017-08-19 JJK   Added yearly dues statement notice and notes different
 * 					for 1st and Additional notices
 * 2017-08-20 JJK   Added Mark notice mailed function and finished up
 *                  Email logic.
 * 					Added logic to set NoticeDate
 * 2018-01-21 JJK	Corrected set of default firstNotice to false (so 2nd
 * 					notices would correctly use the alternate notes)
 * 2018-10-14 JJK   Re-factored for modules
 * 2018-11-03 JJK   Got update Properties working again with JSON POST
 * 2018-11-04 JJK   (Jackson's 16th birthday)
 * 2018-11-17 JJK   To solve the async loop issue I modified AdminRequest to
 *                  do all data queries in the PHP module and pass back a
 *                  large array of data to process in a sync loop
 * 2018-11-25 JJK   Renamed to pdfModule and implemented configuration object
 *                  rather than global variables (to solve email issue)
 * 2018-11-26 JJK   Implemented error handling and logging for failed
 *                  email sends
 * 2019-09-14 JJK   Added a FirstNoticeCheckbox for explicit designation
 *                  of 1st or Additional notices.  Pass along and use in
 *                  the functions instead of comparing array count with
 *                  total number of properties
 * 2019-09-22 JJK   Checked logic for dues emails and communications
 * 2020-02-15 JJK   For the dues emails, adding display list of records
 *                  (for both test and real) to confirm logic
 *                  Fixed the bug that was getting string 'false' value
 *                  instead of boolean false
 *
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-08-10 JJK   Added some validation checks (Dad's 80th birthday)
 * 2020-08-29 JJK   Modified the dues email send to be individual request
 * 2020-09-25 JJK   Added Payment Reconciliation function
 * 2020-09-30 JJK   Added logic to save, update, and re-display paymentList
 * 2020-10-01 JJK   Added SalesUpload, and made upload file generic
 * 2020-10-28 JJK   Re-did Dues Email logic using Communication records
 * 2020-12-24 JJK   Added SalesDownload to get file from County site
 * 2021-04-24 JJK   Modified sales file upload from ajax to fetch
 * 2025-08-23 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 * 2025-08-06 JJK   Working on Dues Emails
*============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
var AdminListDisplayTbody
var AdminResults
var AdminRecCnt
var DuesNoticeEmailButtons
var messageDisplay

//=================================================================================================================
// Bind events

document.addEventListener('DOMContentLoaded', () => {
	AdminListDisplayTbody = document.getElementById("AdminListDisplayTbody")
	AdminResults = document.getElementById("AdminResults")
	AdminRecCnt = document.getElementById("AdminRecCnt")
	DuesNoticeEmailButtons = document.getElementById("DuesNoticeEmailButtons")
	messageDisplay = document.getElementById("AdminMessageDisplay")

	document.getElementById("DuesEmailsButton").addEventListener("click", function (event) {
		getDuesNotesEmails()
	})

	// Dynamically populate FiscalYear select with current year and next 4 years
	const fiscalYearSelect = document.getElementById('FiscalYear');
	if (fiscalYearSelect) {
		const currentYear = new Date().getFullYear();
		fiscalYearSelect.innerHTML = '';
		for (let i = 1; i < 3; i++) {
			const year = currentYear + i;
			const option = document.createElement('option');
			option.value = year;
			option.textContent = year;
			fiscalYearSelect.appendChild(option);
		}
	}

	// AddAssessmentsButton handler
	const addBtn = document.getElementById('AddAssessmentsButton');
	if (addBtn) {
		addBtn.addEventListener('click', function() {
			const duesAmt = document.getElementById('DuesAmt').value;
			const fiscalYear = document.getElementById('FiscalYear').value;
			document.getElementById('ConfirmDuesAmt').textContent = duesAmt;
			document.getElementById('ConfirmFiscalYear').textContent = fiscalYear;
			document.getElementById('AddAssessmentsError').textContent = '';
			const modal = new bootstrap.Modal(document.getElementById('AddAssessmentsConfirmModal'));
			modal.show();
		});
	}

	// ConfirmAddAssessmentsBtn handler
	const confirmBtn = document.getElementById('ConfirmAddAssessmentsBtn');
	if (confirmBtn) {
		confirmBtn.addEventListener('click', async function() {
			const duesAmt = document.getElementById('DuesAmt').value;
			const fiscalYear = document.getElementById('FiscalYear').value;
			const errorDiv = document.getElementById('AddAssessmentsError');
			errorDiv.textContent = '';
			if (!duesAmt || !fiscalYear) {
				errorDiv.textContent = 'Both Dues Amount and Fiscal Year are required.';
				return;
			}
			confirmBtn.disabled = true;
			showLoadingSpinner(errorDiv);
			try {
				const response = await fetch('/api/AddAssessments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ DuesAmt: duesAmt, FiscalYear: fiscalYear })
				})
				await checkFetchResponse(response);
				errorDiv.textContent = ''
				const adminResultMessage = await response.text();
				// Hide modal and show result
				bootstrap.Modal.getInstance(document.getElementById('AddAssessmentsConfirmModal')).hide()
				messageDisplay.textContent = adminResultMessage
			} catch (err) {
				errorDiv.textContent = 'Error adding Assessments: ' + err.message;
			} finally {
				confirmBtn.disabled = false;
			}
		});
	}
})

document.body.addEventListener("click", async function (event) {
	if (event.target.classList.contains("CreateDuesNoticeEmails")) {
		event.preventDefault()
		createDuesNotesEmails()
	} else if (event.target.classList.contains("CheckDuesNoticeEmails")) {
		event.preventDefault()
		//createDuesNotesEmails()
	} else if (event.target.classList.contains("SendDuesNoticeEmails")) {
		event.preventDefault()
		//createDuesNotesEmails()
	}

})

async function createDuesNotesEmails() {
	//AdminResults.textContent = "Dues Notice Emails"
	showLoadingSpinner(messageDisplay)

	let paramData = {
		parcelId: "DuesNoticeEmails"
	}

	try {
		const response = await fetch("/api/CreateDuesNoticeEmails", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(paramData)
		})
		await checkFetchResponse(response)
		// Success
		let returnMessage = await response.text();
		//messageDisplay.textContent = returnMessage
		AdminRecCnt.textContent = returnMessage
		getDuesNotesEmails()
	} catch (err) {
		console.error(err)
		messageDisplay.textContent = `Error in Fetch: ${err.message}`
	}
}

async function getDuesNotesEmails() {
	AdminResults.textContent = "Dues Notice Emails"

	AdminRecCnt.textContent = ""
	empty(DuesNoticeEmailButtons)
	let tbody = AdminListDisplayTbody
	empty(tbody)

	showLoadingSpinner(messageDisplay)

	let paramData = {
		parcelId: "DuesNoticeEmails"
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
		formatCommunicationsResults(communicationsList);
		messageDisplay.textContent = ""
	} catch (err) {
		console.error(err)
		messageDisplay.textContent = `Error in Fetch: ${err.message}`
	}
}

function formatCommunicationsResults(communicationsList) {
	// Example assumes communicationsRec is an array of communication objects
	// and there is a table with id "CommunicationsTable" in the modal

	AdminRecCnt.textContent = ""
	empty(DuesNoticeEmailButtons)
	let tbody = AdminListDisplayTbody
	empty(tbody)
	let tr = document.createElement("tr");
	let td = document.createElement("td");
	let th = document.createElement("th");
	let button = document.createElement("button")
	
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
	th = document.createElement("th"); th.textContent = "id"; tr.appendChild(th)        
	th = document.createElement("th"); th.textContent = "Parcel ID"; tr.appendChild(th)        
	th = document.createElement("th"); th.textContent = "Datetime"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Email Address"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Sent"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Mailing Name"; tr.appendChild(th)
	th = document.createElement("th"); th.textContent = "Description"; tr.appendChild(th)
	tbody.appendChild(tr)

	// Append a row for every record in list
	let sentCnt = 0
	let unsentCnt = 0
	for (let index in communicationsList) {
		let commRec = communicationsList[index]

		tr = document.createElement('tr')
		tr.classList.add('small')

		td = document.createElement("td"); td.textContent = commRec.id; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.parcel_ID; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = standardizeDate(commRec.createTs); tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.emailAddr; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.sentStatus; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.mailing_Name; tr.appendChild(td)
		td = document.createElement("td"); td.textContent = commRec.commDesc.substring(0,30); tr.appendChild(td)

		tbody.appendChild(tr)

		if (commRec.sentStatus == 'Y') {
			sentCnt++
		} else {
			unsentCnt++
		}
	}

	//AdminRecCnt.textContent = `Emails sent = ${sentCnt}, Emails waiting to Send = ${unsentCnt}`
	AdminRecCnt.textContent = `Emails waiting to Send = ${unsentCnt}`

	button = document.createElement("button")
	button.setAttribute('type',"button")
	button.setAttribute('role',"button")
	button.classList.add('btn','btn-primary','btn-sm','mb-1','me-1','shadow-none','CreateDuesNoticeEmails')
	button.innerHTML = '<i class="fa fa-envelope me-1"></i> Create NEW List'
	DuesNoticeEmailButtons.appendChild(button);

	button = document.createElement("button")
	button.setAttribute('type',"button")
	button.setAttribute('role',"button")
	button.classList.add('btn','btn-success','btn-sm','mb-1','me-1','shadow-none','CheckDuesNoticeEmails')
	button.innerHTML = '<i class="fa fa-envelope me-1"></i> Check List'
	DuesNoticeEmailButtons.appendChild(button);

	button = document.createElement("button")
	button.setAttribute('type',"button")
	button.setAttribute('role',"button")
	button.classList.add('btn','btn-warning','btn-sm','mb-1','me-1','shadow-none','SendDuesNoticeEmails')
	button.innerHTML = '<i class="fa fa-envelope me-1"></i> Send Emails'
	DuesNoticeEmailButtons.appendChild(button);

}