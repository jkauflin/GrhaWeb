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

