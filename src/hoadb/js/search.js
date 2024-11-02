/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION:  JS code to support the web app Property Search functions
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version 
 * 2015-08-03 JJK	Modified to put the data parameters on the "a" element
 * 					and only response to clicks to the anchor
 * 2015-09-30 JJK	Added Search button
 * 2016-02-09 JJK	Switching from JQuery Mobile to Twitter Bootstrap
 * 2016-04-03 JJK	Working on input fields
 * 2018-10-27 JJK   Added SearchInput for non-touch devices
 * 2020-07-29 JJK   Modified for version 2.0 changes
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-12-22 JJK   Re-factored for Bootstrap 4
 * 2024-09-10 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 *============================================================================*/

import {empty} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
var searchStr = document.getElementById("searchStr")
var parcelId = document.getElementById("parcelId")
var lotNo = document.getElementById("lotNo")
var address = document.getElementById("address")
var ownerName = document.getElementById("ownerName")
var phoneNo = document.getElementById("phoneNo")
var altAddress = document.getElementById("altAddress")
var searchButton = document.getElementById("SearchButton")
var propertyListDisplayTbody = document.getElementById("PropertyListDisplayTbody")
var messageDisplay = document.getElementById("MessageDisplay")
var isTouchDevice = 'ontouchstart' in document.documentElement;

//=================================================================================================================
// Bind events

searchButton.addEventListener("click", function () {
    getHoaPropertiesList()
})

if (!isTouchDevice) {
    searchStr.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
          // Cancel the default action, if needed
          event.preventDefault();
          getHoaPropertiesList()
        }
    })
}

async function getHoaPropertiesList() {
    // Create a parameters object to send via JSON in the POST request
    let paramData = {
        searchStr: searchStr.value,
        parcelId: parcelId.value,
        lotNo: lotNo.value,
        address: address.value,
        ownerName: ownerName.value,
        phoneNo: phoneNo.value,
        altAddress: altAddress.value
    }

    const endpoint = "/api/GetPropertyList";
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const hoaPropertyRecList = await response.json();
        displayPropertyList(hoaPropertyRecList)
    } catch (err) {
        console.error(`Error in Fetch to ${endpoint}, ${err}`)
        messageDisplay.textContent = "Fetch data FAILED - check log"
    }
}

function displayPropertyList(hoaPropertyRecList) {
    //let propertyListDisplay = document.getElementById("PropertyListDisplay")
    //let tbody = propertyListDisplay.getElementsByTagName("tbody")[0]
    let tbody = propertyListDisplayTbody
    empty(tbody)

    if (hoaPropertyRecList == null || hoaPropertyRecList.length == 0) {
        let tr = document.createElement('tr')
        tr.textContent = "No records found - try different search parameters"
        tbody.appendChild(tr)
    } else {
        let tr = document.createElement('tr')
        tr.classList.add('small')
        // Append the header elements
        let th = document.createElement("th"); th.textContent = "Row"; tr.appendChild(th)
        th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
        th = document.createElement("th"); th.classList.add('d-none','d-sm-table-cell'); th.textContent = "Parcel Id"; tr.appendChild(th)
        th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Owner Name"; tr.appendChild(th)
        th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Owner Phone"; tr.appendChild(th)
        tbody.appendChild(tr)

        // Append a row for every record in list
        for (let index in hoaPropertyRecList) {
            let hoaPropertyRec = hoaPropertyRecList[index]
            tr = document.createElement('tr')
            tr.classList.add('small')
            let td = document.createElement("td"); td.textContent = Number(index) + 1; tr.appendChild(td)
            let a = document.createElement("a")
            a.classList.add('class', "DetailDisplay")
            a.setAttribute('data-parcelId', hoaPropertyRec.parcelId);
            a.textContent = hoaPropertyRec.parcelLocation
            td = document.createElement("td"); 
            td.appendChild(a);
            tr.appendChild(td)
            td = document.createElement("td"); td.classList.add('d-none','d-sm-table-cell'); td.textContent = hoaPropertyRec.parcelId; tr.appendChild(td)
            td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.ownerName; tr.appendChild(td)
            td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.ownerPhone; tr.appendChild(td)
            tbody.appendChild(tr)
        }
    }
}
