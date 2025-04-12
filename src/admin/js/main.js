/*==============================================================================
 * (C) Copyright 2025 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:     Javascript code for hoadb web
 *----------------------------------------------------------------------------
 * Modification History
 * 2025-01-09 JJK 	Initial version
 * 2025-04-12 JJK   Working on Board maint page
*============================================================================*/

import {empty,showLoadingSpinner} from './util.js';

// Keep track of the state of the navbar collapse (shown or hidden)
var navbarCollapseShown = false;
var collapsibleNavbar = document.getElementsByClassName("navbar-collapse")[0];
collapsibleNavbar.addEventListener('hidden.bs.collapse', function () {
    navbarCollapseShown = false;
})
collapsibleNavbar.addEventListener('shown.bs.collapse', function () {
    navbarCollapseShown = true;
})
     
// Listen for nav-link clicks
document.querySelectorAll("a.nav-link").forEach(el => el.addEventListener("click", function (event) {
    // Automatically hide the navbar collapse when an item link is clicked (and the collapse is currently shown)
    if (navbarCollapseShown) {
        new bootstrap.Collapse(document.getElementsByClassName("navbar-collapse")[0]).hide()
    }
}))


var photosUri = "https://grhawebstorage.blob.core.windows.net/photos/"
const trustees = document.querySelectorAll('.Trustee')

// Call the function to load Board of Trustees data every time the page is loaded
queryBoardInfo()
async function queryBoardInfo() {
    let boardGql = `query {
            boards (
                orderBy: { TrusteeId: ASC }
            ) {
                items {
                    Name
                    Position
                    PhoneNumber
                    EmailAddress
                    EmailAddressForward
                    Description
                    ImageUrl
                }
            }
        }`

    //console.log(">>> query boardGql = "+boardGql)

    const apiQuery = {
        query: boardGql,
        variables: {
        }
    }

    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery)
    });
    const result = await response.json();
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        console.log("result.data = "+result.data)

        const maxTrustees = result.data.boards.items.length
        if (maxTrustees > 0) {
            let i = -1
            trustees.forEach((cardBody) => {
                i++
                empty(cardBody)
                if (i < maxTrustees) {
                    // Set the information in the Trustee cards
                    let trusteeImg = ""
                    if (result.data.boards.items[i].ImageUrl == "") {
                        trusteeImg = document.createElement('i')
                        trusteeImg.classList.add('fa','fa-user','fa-4x','float-start','me-3')
                    } else {
                        trusteeImg = document.createElement('img')
                        trusteeImg.classList.add('float-start','rounded','me-3')
                        trusteeImg.width = "100"
                        trusteeImg.src = result.data.boards.items[i].ImageUrl
                    }

                    let trusteeNamePosition = document.createElement('h5')
                    let trusteeNameLink = document.createElement('a')
                    trusteeNameLink.classList.add('get-board-to-update')
                    trusteeNameLink.textContent = result.data.boards.items[i].Name + " - " + result.data.boards.items[i].Position
                    trusteeNameLink.setAttribute('data-trustee-id', result.data.boards.items[i].id)
                    //trusteeNameLink.href = "api/update"
                    trusteeNameLink.href = ""
                    trusteeNamePosition.appendChild(trusteeNameLink)

                    let trusteePhone = document.createElement('b')
                    trusteePhone.textContent = result.data.boards.items[i].PhoneNumber 
                    let trusteeEmail = document.createElement('h6')
                    trusteeEmail.textContent = "Email: "+result.data.boards.items[i].EmailAddress
                    let trusteeEmail2 = document.createElement('h6')
                    trusteeEmail2.textContent = "Private Email: "+result.data.boards.items[i].EmailAddressForward

                    let trusteeDesc = document.createElement('span')
                    trusteeDesc.textContent = result.data.boards.items[i].Description 

                    cardBody.appendChild(trusteeImg)
                    cardBody.appendChild(trusteeNamePosition)
                    cardBody.appendChild(trusteePhone)
                    cardBody.appendChild(trusteeEmail)
                    cardBody.appendChild(trusteeEmail2)
                    cardBody.appendChild(trusteeDesc)
                }
            })
        } // result.data.boards.items.length
    }
} // async function queryBoardInfo()


