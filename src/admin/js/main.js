/*==============================================================================
 * (C) Copyright 2025 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:     Javascript code for GRHA web Admin functions
 *----------------------------------------------------------------------------
 * Modification History
 * 2025-01-09 JJK 	Initial version
 * 2025-04-12 JJK   Working on Board maintenance page
 * 2025-04-22 JJK   Implementing new html5/bootstrap input validation logic
 * 2025-05-07 JJK   Added File doc and Photos upload handling
 * 2025-10-04 JJK   Added WebsiteMessage
*============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse} from './util.js';

var TrusteeId
var Name
var Position
var PhoneNumber
var Description
var ImageUrl
var WebsiteMessage
var BoardMessageDisplay
var trustees
var photosUri = "https://grhawebstorage.blob.core.windows.net/photos/"
var retryCnt = 0
const retryMax = 3
let boardGql = `query {
    boards (
            orderBy: { TrusteeId: ASC }
    ) {
        items {
            id
            Name
            Position
            PhoneNumber
            Description
            ImageUrl
            WebsiteMessage
        }
    }
}`

const apiQuery = {
    query: boardGql,
    variables: {
    }
}

var DocMonth
var EventMonth
var FileUploadMessageDisplay
var uploadFileForm
var tempDate = new Date();
var tempMonth = tempDate.getMonth() + 1;
if (tempDate.getMonth() < 9) {
    tempMonth = '0' + (tempDate.getMonth() + 1);
}

document.addEventListener('DOMContentLoaded', () => {
    TrusteeId = document.getElementById("TrusteeId")
    Name = document.getElementById("Name")
    Position = document.getElementById("Position")
    PhoneNumber = document.getElementById("PhoneNumber")
    Description = document.getElementById("Description")
    ImageUrl = document.getElementById("ImageUrl")
    WebsiteMessage = document.getElementById("WebsiteMessage")
    BoardMessageDisplay = document.getElementById("BoardMessageDisplay")
    trustees = document.querySelectorAll('.Trustee')

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

    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('input', () => {
            if (input.checkValidity()) {
            input.classList.add('is-valid')
            input.classList.remove('is-invalid')
            } else {
            input.classList.add('is-invalid')
            input.classList.remove('is-valid')
            }
        })
    })

    // Handle file upload Form submit/validation
    DocMonth = document.getElementById("DocMonth")
    EventMonth = document.getElementById("EventMonth")
    DocMonth.value = tempDate.getFullYear() + '-' + tempMonth
    EventMonth.value = tempDate.getFullYear() + '-' + tempMonth

    FileUploadMessageDisplay = document.getElementById("FileUploadMessageDisplay")
    uploadFileForm = document.getElementById("UploadFileForm")
    uploadFileForm.addEventListener('submit', (event) => {
        let formValid = uploadFileForm.checkValidity()
        event.preventDefault()
        event.stopPropagation()

        FileUploadMessageDisplay.textContent = ""
    
        if (!formValid) {
            FileUploadMessageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            uploadFile()
            // Clear file inputs
        }

        uploadFileForm.classList.add('was-validated')
    })

    // Call the function to load Board of Trustees data every time the page is loaded
    queryBoardInfo()
})


document.querySelectorAll(".Trustee").forEach(el => el.addEventListener("click", function (event) {
    //console.log(".Trustee click, classList = "+event.target.classList)
    //if (event.target && event.target.classList.contains(MediaFilterRequestClass)) {
    //}
    const trusteeId = event.target.getAttribute('data-trustee-id')
    //console.log('Target:', event.target); // The element that was clicked
    getTrustee(trusteeId)
}))


// Handle the file upload backend server call
async function uploadFile() {
    FileUploadMessageDisplay.textContent = "Uploading file..."

    try {
        const response = await fetch("/api/UploadDoc", {
            method: "POST",
            body: new FormData(uploadFileForm)
        })
        await checkFetchResponse(response)
        // Success
        FileUploadMessageDisplay.textContent = await response.text();

    } catch (err) {
        console.error(err)
        FileUploadMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

// Handle Photos upload Form submit/validation
var PhotosUploadMessageDisplay = document.getElementById("PhotosUploadMessageDisplay")
var uploadPhotosForm = document.getElementById("UploadPhotosForm")
uploadPhotosForm.addEventListener('submit', (event) => {
    let formValid = uploadPhotosForm.checkValidity()
    event.preventDefault()
    event.stopPropagation()

    PhotosUploadMessageDisplay.textContent = ""
  
    if (!formValid) {
        PhotosUploadMessageDisplay.textContent = "Form inputs are NOT valid"
    } else {
        //let trusteeId = TrusteeId.value
        //updateTrustee(trusteeId)
        uploadPhotos()
        // clear out fields????????????
    }

    uploadPhotosForm.classList.add('was-validated')
})

// Handle the file upload backend server call
async function uploadPhotos() {
    PhotosUploadMessageDisplay.textContent = "Uploading photos..."

    try {
        const response = await fetch("/api/UploadPhotos", {
            method: "POST",
            body: new FormData(uploadPhotosForm)
        })
        await checkFetchResponse(response)
        // Success
        PhotosUploadMessageDisplay.textContent = await response.text();

    } catch (err) {
        console.error(err)
        PhotosUploadMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

var updTrusteeForm = document.getElementById("UpdateTrusteeForm")
updTrusteeForm.addEventListener('submit', (event) => {
    let formValid = updTrusteeForm.checkValidity()
    event.preventDefault()
    event.stopPropagation()

    BoardMessageDisplay.textContent = ""
  
    if (!formValid) {
        BoardMessageDisplay.textContent = "Form inputs are NOT valid"
    } else {
        let trusteeId = TrusteeId.value
        updateTrustee(trusteeId)
    }

    updTrusteeForm.classList.add('was-validated')
})

async function queryBoardInfo() {
    //console.log(">>> query boardGql = "+boardGql)
    try {
        const response = await fetch("/data-api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiQuery)
        })
        await checkFetchResponse(response)
        const result = await response.json()

        if (result.errors != null) {
            console.log("Error: "+result.errors[0].message)
            console.table(result.errors)
            BoardMessageDisplay.textContent = "Error fetching Board records - reload page, err = "+result.errors[0].message
            return
        }

        const maxTrustees = result.data.boards.items.length
        console.log("# of trustees = "+maxTrustees)
        if (maxTrustees < 1) {
            if (retryCnt < retryMax) {
                retryCnt++
                console.log(">>> retry "+retryCnt+", delay = "+retryCnt*1000)
                setTimeout(queryBoardInfo,retryCnt*1000)
            } else {
                // Max. reached
                BoardMessageDisplay.textContent = "Error fetching Board records...reload page"
            }
        }

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
                        trusteeImg.width = "64"
                        trusteeImg.src = result.data.boards.items[i].ImageUrl
                    }

                    // >>>>>>>>>>>>>>>>>>>> need to handle this click better - so it's only on the link
                    //                      and not just the .trustee on the card

                    let trusteeNamePosition = document.createElement('h6')
                    let trusteeNameLink = document.createElement('a')
                    //trusteeNameLink.textContent = result.data.boards.items[i].Name + " - " + result.data.boards.items[i].Position
                    trusteeNameLink.textContent = result.data.boards.items[i].Position + " - " + result.data.boards.items[i].Name
                    trusteeNameLink.setAttribute('data-trustee-id', result.data.boards.items[i].id)
                    trusteeNameLink.href = "#"  // # will do all the good link formatting, but will not try to open the link
                    trusteeNamePosition.appendChild(trusteeNameLink)

                    cardBody.appendChild(trusteeImg)
                    cardBody.appendChild(trusteeNamePosition)
                }
            })
        } // result.data.boards.items.length

    } catch (err) {
        console.error(err)
        BoardMessageDisplay.textContent = "Error fetching Board records, err = "+err
    }

} // async function queryBoardInfo()


// Get the specific Trustee information and display for update
async function getTrustee(trusteeId) {
    // >>>>> should I pass the display object as one of the parameters - would that have any benefit???
    BoardMessageDisplay.textContent = "Fetching Board information..."
    const endpoint = "/api/GetTrustee";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: trusteeId
    })
    BoardMessageDisplay.textContent = ""

    if (!response.ok) {
        //response.status: 400
        //response.statusText: "Bad Request"
        let errMessage = response.statusText
        try {
            errMessage = await response.text();
            // Check if there is a JSON structure in the response (which contains errors)
            const result = JSON.parse(errMessage);
            if (result.errors != null) {
                console.log("Error: "+result.errors[0].message);
                console.table(result.errors);
                errMessage = result.errors[0].message
            }
        } catch (err) {
            //console.log("JSON parse failed - text = "+errMessage)
        }
        BoardMessageDisplay.textContent = errMessage
    } else {
        let trustee = await response.json();
        TrusteeId.value = trustee.id
        Name.value = trustee.name
        // Set the Position dropdown to the trustee's current value
        const positionSelect = document.getElementById("Position");
        if (positionSelect) {
            positionSelect.value = trustee.position;
        }
        PhoneNumber.value = trustee.phoneNumber
        //EmailAddress.value = trustee.emailAddress
        //EmailAddressForward.value = trustee.emailAddressForward
        Description.value = trustee.description
        ImageUrl.value = trustee.imageUrl
        WebsiteMessage.value = trustee.websiteMessage
    }
}

// Get the specific Trustee information and display for update
async function updateTrustee(trusteeId) {
    BoardMessageDisplay.textContent = "Updating Board information..."

    let paramData = {
        id: trusteeId,
        TrusteeId: parseInt(trusteeId),
        Name: Name.value,
        Position: Position.value,
        PhoneNumber: PhoneNumber.value,
        Description: Description.value,
        ImageUrl: ImageUrl.value,
        WebsiteMessage: WebsiteMessage.value
    }

    const endpoint = "/api/UpdateTrustee";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paramData)
    })
    if (!response.ok) {
        //response.status: 400
        //response.statusText: "Bad Request"
        let errMessage = response.statusText
        try {
            errMessage = await response.text();
            // Check if there is a JSON structure in the response (which contains errors)
            const result = JSON.parse(errMessage);
            if (result.errors != null) {
                console.log("Error: "+result.errors[0].message);
                console.table(result.errors);
                errMessage = result.errors[0].message
            }
        } catch (err) {
            //console.log("JSON parse failed - text = "+errMessage)
        }
        BoardMessageDisplay.textContent = errMessage
    } else {
        BoardMessageDisplay.textContent = "Update successful"
        queryBoardInfo()
    }
}
