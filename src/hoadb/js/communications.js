/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2020 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:
 *----------------------------------------------------------------------------
 * Modification History
 * 2016-10-25 JJK   Added Communications table
 * 2016-11-04 JJK   (Jackson's 14th birthday)
 * 2016-11-05 JJK   Added Admin option to send dues emails
 * 2016-11-12 JJK	Added Dues Notice email function and inserts of
 * 					Dues Notice functions into Communications table
 * 2018-11-07 JJK   Re-factor for JSON based POST for updates
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-08-16 JJK   Modified to allow edit on issue
 * 2020-08-22 JJK   Increased CommDesc to 600 characters
 * 2020-12-22 JJK   Re-factored for Bootstrap 4
 * 2025-07-19 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
==============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox} from './util.js';

/*
var detailPageTab = bootstrap.Tab.getOrCreateInstance(document.querySelector(`.navbar-nav a[href="#DetailPage"]`))
var messageDisplay = document.getElementById("DetailMessageDisplay")
var isTouchDevice = 'ontouchstart' in document.documentElement

// Current hoaRec from last query and updates
var hoaRec

var DuesStatementButton = document.getElementById("DuesStatementButton")
var NewOwnerButton = document.getElementById("NewOwnerButton")
var CommunicationsButton = document.getElementById("CommunicationsButton")

var Parcel_ID = document.getElementById("Parcel_ID")
*/
