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
*============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox} from './util.js';

//=================================================================================================================
// Variables cached from the DOM

//=================================================================================================================
// Bind events

document.addEventListener('DOMContentLoaded', () => {
	// Dynamically populate FiscalYear select with current year and next 4 years
	const fiscalYearSelect = document.getElementById('FiscalYear');
	if (fiscalYearSelect) {
		const currentYear = new Date().getFullYear();
		fiscalYearSelect.innerHTML = '';
		for (let i = 1; i < 5; i++) {
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
			try {
				const resp = await fetch('/api/AddAssessments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ DuesAmt: duesAmt, FiscalYear: fiscalYear })
				});
				const data = await resp.json();
				if (!resp.ok) {
					errorDiv.textContent = data || 'Error adding assessments.';
				} else {
					// Hide modal and show result
					bootstrap.Modal.getInstance(document.getElementById('AddAssessmentsConfirmModal')).hide();
					document.getElementById('ResultMessage').textContent = data;
				}
			} catch (err) {
				errorDiv.textContent = 'Network or server error.';
			} finally {
				confirmBtn.disabled = false;
			}
		});
	}
})

document.body.addEventListener("click", async function (event) {
	if (event.target.classList.contains("x")) {
		event.preventDefault()
		//const configName = event.target.dataset.configname
		//formatUpdateConfig(configName)
	}
})

